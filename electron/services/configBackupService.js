import { app, dialog, BrowserWindow } from "electron";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import logger from "./logger.js";
import settingsService from "./settingsService.js";
import {
  getProjects,
  getCategories,
  replaceAllProjectsAndCategoriesFromBackup,
  getUserDataPath,
} from "./database.js";

const EXPORT_VERSION = 1;
const KDF_ALGO = "sha256";
const KDF_ITERATIONS = 310000;
const KEY_LEN = 32; // 256-bit
const CIPHER_ALGO = "aes-256-gcm";

const API_APP_NAME = "SelfHost Helper";

const deriveKey = (passphrase, salt, iterations = KDF_ITERATIONS) =>
  new Promise((resolve, reject) => {
    crypto.pbkdf2(
      Buffer.from(passphrase, "utf8"),
      salt,
      iterations,
      KEY_LEN,
      KDF_ALGO,
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(derivedKey);
      }
    );
  });

const buildEnvelope = async () => {
  const [projects, categories, settings, appVersion] = await Promise.all([
    getProjects(),
    getCategories(),
    settingsService.getAll(),
    app.getVersion?.() ?? Promise.resolve(null),
  ]);

  const sanitizedProjects = Array.isArray(projects)
    ? projects.map((p) => {
        // Strip any runtime-only fields that should not be persisted across machines
        // (status, startTime, transient stats, etc.)
        // Keep everything else, including tunnel configuration and env.
        const { status, startTime, ...rest } = p;
        return rest;
      })
    : [];

  const envelope = {
    version: EXPORT_VERSION,
    createdAt: new Date().toISOString(),
    app: {
      name: API_APP_NAME,
      version: appVersion || null,
    },
    payload: {
      projects: sanitizedProjects,
      categories: Array.isArray(categories) ? categories : [],
      settings: settings || {},
    },
  };

  return envelope;
};

const encryptEnvelope = async (envelope, passphrase) => {
  if (!passphrase || typeof passphrase !== "string" || !passphrase.trim()) {
    throw new Error("Passphrase is required for export");
  }

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12); // Recommended size for GCM
  const key = await deriveKey(passphrase, salt);

  const cipher = crypto.createCipheriv(CIPHER_ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(envelope), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const createdAt = envelope.createdAt || new Date().toISOString();

  return {
    version: EXPORT_VERSION,
    kdf: {
      algo: "pbkdf2",
      hash: KDF_ALGO,
      iterations: KDF_ITERATIONS,
      salt: salt.toString("base64"),
    },
    cipher: {
      algo: CIPHER_ALGO,
      iv: iv.toString("base64"),
    },
    tag: authTag.toString("base64"),
    data: encrypted.toString("base64"),
    meta: {
      createdAt,
      app: envelope.app || { name: API_APP_NAME, version: null },
    },
  };
};

const decryptExportObject = async (obj, passphrase) => {
  if (!obj || typeof obj !== "object") {
    throw new Error("Invalid backup file structure");
  }
  if (!passphrase || typeof passphrase !== "string" || !passphrase.trim()) {
    throw new Error("Passphrase is required for import");
  }

  const { kdf, cipher, data, tag, version } = obj;
  if (!kdf || !cipher || !data || !tag) {
    throw new Error("Backup file is missing required fields");
  }
  if (typeof version !== "number" || version < 1) {
    throw new Error("Unsupported backup version");
  }

  const salt = Buffer.from(kdf.salt, "base64");
  const iv = Buffer.from(cipher.iv, "base64");
  const authTag = Buffer.from(tag, "base64");
  const ciphertext = Buffer.from(data, "base64");

  const iterations = Number(kdf.iterations) || KDF_ITERATIONS;
  const key = await deriveKey(passphrase, salt, iterations);

  const decipher = crypto.createDecipheriv(CIPHER_ALGO, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const envelope = JSON.parse(decrypted.toString("utf8"));
    if (!envelope || typeof envelope !== "object") {
      throw new Error("Decrypted payload is invalid");
    }
    if (typeof envelope.version !== "number" || envelope.version < 1) {
      throw new Error("Unsupported envelope version");
    }
    if (!envelope.payload || typeof envelope.payload !== "object") {
      throw new Error("Backup payload is missing");
    }
    return envelope;
  } catch (err) {
    logger.warn("[ConfigBackup] Failed to decrypt or parse backup payload:", err);
    // Deliberately keep error generic to avoid leaking whether the passphrase was correct
    throw new Error("Failed to decrypt backup. Check your passphrase and try again.");
  }
};

export const exportConfigToFile = async (passphrase) => {
  const envelope = await buildEnvelope();
  const encrypted = await encryptEnvelope(envelope, passphrase);

  const userDataPath = getUserDataPath();
  const defaultDir = userDataPath || app.getPath("documents");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const defaultPath = path.join(defaultDir, `selfhost-backup-${timestamp}.selfhost.json`);

  const window = BrowserWindow.getFocusedWindow() || global.mainWindow || null;
  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    title: "Export configuration backup",
    defaultPath,
    filters: [
      { name: "SelfHost Backup", extensions: ["selfhost.json", "json"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  await fs.writeFile(filePath, JSON.stringify(encrypted, null, 2), "utf8");
  logger.info(`[ConfigBackup] Exported configuration to ${filePath}`);

  return {
    success: true,
    path: filePath,
    meta: encrypted.meta,
  };
};

export const importConfigFromFile = async (passphrase, { replaceExisting = true } = {}) => {
  const userDataPath = getUserDataPath();
  const window = BrowserWindow.getFocusedWindow() || global.mainWindow || null;

  const { canceled, filePaths } = await dialog.showOpenDialog(window, {
    title: "Import configuration backup",
    defaultPath: userDataPath,
    filters: [
      { name: "SelfHost Backup", extensions: ["selfhost.json", "json", "selfhost-backup"] },
      { name: "All Files", extensions: ["*"] },
    ],
    properties: ["openFile"],
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = filePaths[0];

  let parsed;
  try {
    const raw = await fs.readFile(filePath, "utf8");
    parsed = JSON.parse(raw);
  } catch (err) {
    logger.error("[ConfigBackup] Failed to read/parse backup file:", err);
    throw new Error("Failed to read backup file. Ensure it is a valid JSON backup.");
  }

  const envelope = await decryptExportObject(parsed, passphrase);
  const payload = envelope.payload || {};

  const projects = Array.isArray(payload.projects) ? payload.projects : [];
  const categories = Array.isArray(payload.categories) ? payload.categories : [];
  const settings = payload.settings && typeof payload.settings === "object" ? payload.settings : {};

  const counts = await replaceAllProjectsAndCategoriesFromBackup(projects, categories, {
    replaceExisting,
  });

  if (Object.keys(settings).length > 0) {
    await settingsService.update(settings);
  }

  logger.info(
    `[ConfigBackup] Imported backup from ${filePath} (${projects.length} projects, ${categories.length} categories)`
  );

  return {
    success: true,
    path: filePath,
    restored: counts?.restored || { projects: projects.length, categories: categories.length },
    settingsUpdated: Object.keys(settings).length,
    meta: {
      createdAt: envelope.createdAt || null,
      app: envelope.app || null,
    },
  };
};

