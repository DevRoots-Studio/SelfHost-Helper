import { Database, JSONDriver, Table } from "st.db";
import path from "path";
import { app } from "electron";
import crypto from "crypto";
import logger from "./logger.js";
import { encryptSecret, decryptSecret } from "./secretStore.js";
import fs from "fs";

let db = null;
let projectTable = null;
let categoryTable = null;

/**
 * Initialize st.db and migrate data from SQLite if necessary.
 * Public helpers below intentionally return safe defaults when tables are not ready.
 */
export const initializeDatabase = async () => {
  try {
    const userDataPath = app.getPath("userData");
    const dbFile = path.join(userDataPath, "data.json");

    logger.info(`[Database] Initializing st.db at: ${dbFile}`);

    // 1. Initialize main Database with JSON Driver
    db = new Database({
      driver: new JSONDriver(dbFile),
    });

    // 2. Initialize Tables
    projectTable = new Table("projects", db);
    categoryTable = new Table("categories", db);

    logger.info("[Database] st.db initialized and tables ready.");

    // 3. Migration logic (SQLite -> JSON)
    const sqlitePath =
      process.env.NODE_ENV === "development"
        ? path.join(userDataPath, "projects-dev.sqlite")
        : path.join(userDataPath, "projects.sqlite");

    if (fs.existsSync(sqlitePath)) {
      logger.info(
        `[Database] Found legacy SQLite database at ${sqlitePath}. Starting migration...`
      );
      await migrateFromSQLite(sqlitePath);
    } else {
      logger.debug("[Database] No legacy SQLite database found. Skipping migration.");
    }
  } catch (err) {
    logger.error("[Database] Failed to initialize st.db:", err.message || err);
    throw err; // Re-throw to prevent app from starting in broken state
  }
};

/**
 * Normalize a raw Project row from legacy SQLite (which may lack newer columns)
 * to the shape expected by the app. Preserves every character of original data:
 * - env: if valid JSON, parsed object; if invalid, raw string kept so nothing is lost.
 * - All other fields use row value when present, defaults only for missing.
 */
function normalizeProjectRow(row) {
  const parseJsonOrPreserveRaw = (val, fallback) => {
    if (val == null || val === "") return fallback;
    if (typeof val === "object") return val;
    try {
      return JSON.parse(val);
    } catch {
      // Preserve raw string so we don't lose a single character (legacy/corrupted env)
      return val;
    }
  };
  const parseJson = (val, fallback) => {
    if (val == null || val === "") return fallback;
    if (typeof val === "object") return val;
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  };
  return {
    id: row.id,
    name: row.name ?? "",
    path: row.path ?? "",
    script: row.script ?? "npm start",
    autoStart: Boolean(row.autoStart ?? false),
    env: parseJsonOrPreserveRaw(row.env, {}),
    pid: row.pid ?? null,
    type: row.type ?? "node",
    description: row.description ?? null,
    icon: row.icon ?? null,
    order: row.order ?? 0,
    uuid: row.uuid ?? null,
    categoryId: row.categoryId ?? null,
    tunnelMode: row.tunnelMode ?? "quick",
    tunnelPort: row.tunnelPort ?? 3000,
    encryptedTunnelToken: row.encryptedTunnelToken ?? "",
    tunnelConfig: parseJson(row.tunnelConfig, {}),
    autoStartTunnel: Boolean(row.autoStartTunnel ?? false),
    clearLogsBeforeStart: Boolean(row.clearLogsBeforeStart ?? false),
  };
}

/**
 * Normalize a raw Category row from legacy SQLite.
 */
function normalizeCategoryRow(row) {
  return {
    id: row.id,
    name: row.name ?? "",
    order: row.order ?? 0,
    uuid: row.uuid ?? null,
  };
}

const LEGACY_TABLE_NAMES = ["Categories", "Projects", "Project"];

/**
 * Try to read all rows from a SQLite table. Returns [] if the table does not exist
 * (e.g. legacy DB with only Projects, no Categories). Used so we never skip migration
 * when the old DB has only one table. Table name is whitelisted for safety.
 */
async function safeSelectAll(sequelize, tableName, QueryTypes) {
  if (!LEGACY_TABLE_NAMES.includes(tableName)) {
    return [];
  }
  try {
    const rows = await sequelize.query(`SELECT * FROM ${tableName}`, {
      type: QueryTypes.SELECT,
    });
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    const msg = err?.message ?? String(err);
    if (
      msg.includes("no such table") ||
      msg.includes("does not exist") ||
      msg.toLowerCase().includes("sqlite_error")
    ) {
      return [];
    }
    throw err;
  }
}

/**
 * Read legacy SQLite file and return normalized categories and projects.
 * Does not rename or modify the file. Used by both startup migration and restore.
 */
async function readLegacySQLite(sqlitePath) {
  const { Sequelize, QueryTypes } = await import("sequelize");
  const tempSequelize = new Sequelize({
    dialect: "sqlite",
    storage: sqlitePath,
    logging: false,
  });

  let categories = await safeSelectAll(tempSequelize, "Categories", QueryTypes);
  let projects = await safeSelectAll(tempSequelize, "Projects", QueryTypes);
  if (projects.length === 0) {
    projects = await safeSelectAll(tempSequelize, "Project", QueryTypes);
    if (projects.length > 0) {
      logger.info("[Migration] Read projects from legacy 'Project' table (singular).");
    }
  }

  await tempSequelize.close();
  return {
    categories: categories.map((row) => normalizeCategoryRow(row)),
    projects: projects.map((row) => normalizeProjectRow(row)),
  };
}

/**
 * Migration helper: read legacy SQLite with raw SQL (no model schema assumption).
 * Supports very old DBs that have only the Projects table (no Categories).
 * Tries "Projects" then "Project" for project table name. Preserves every character
 * of data; then writes normalized rows to st.db and backs up the SQLite file.
 */
async function migrateFromSQLite(sqlitePath) {
  try {
    let categories = [];
    let projects = [];

    try {
      const result = await readLegacySQLite(sqlitePath);
      categories = result.categories;
      projects = result.projects;
    } catch (queryErr) {
      logger.warn(
        "[Migration] Raw read failed. Skipping migration:",
        queryErr?.message ?? queryErr
      );
      const backupPath = sqlitePath + ".backup_skip_" + Date.now();
      await fs.promises.rename(sqlitePath, backupPath);
      return;
    }

    if (categories.length > 0 || projects.length > 0) {
      logger.info(
        `[Migration] Found ${categories.length} categories and ${projects.length} projects in SQLite. Migrating...`
      );

      for (const row of categories) {
        if (!(await categoryTable.has(row.id.toString()))) {
          await categoryTable.set(row.id.toString(), row);
        }
      }

      for (const row of projects) {
        if (!(await projectTable.has(row.id.toString()))) {
          await projectTable.set(row.id.toString(), row);
        }
      }

      logger.info("[Migration] Data migration to st.db complete.");
    }

    const backupPath =
      categories.length > 0 || projects.length > 0
        ? sqlitePath + ".backup_" + Date.now()
        : sqlitePath + ".backup_empty_" + Date.now();
    await fs.promises.rename(sqlitePath, backupPath);
    logger.info(`[Migration] SQLite file backed up to ${backupPath}`);
  } catch (err) {
    logger.error("[Migration] Error during migration:", err);
    throw err;
  }
}

// ---------------- Helper Methods ----------------
// Note: until initializeDatabase() completes, methods return []/null/false defaults.

/** Ensure env is always an object for the UI; preserve raw string as __raw so no data is lost. */
function normalizeEnvForOutput(env) {
  if (env == null) return {};
  if (typeof env === "object" && !Array.isArray(env)) return env;
  if (typeof env === "string") return { __raw: env };
  return {};
}

export const getProjects = async () => {
  if (!projectTable) return [];
  const entries = await projectTable.all();
  return entries
    .map((e) => {
      const data = { ...e.data };
      data.env = normalizeEnvForOutput(data.env);
      if (data.encryptedTunnelToken) {
        data.encryptedTunnelToken = decryptSecret(data.encryptedTunnelToken);
      }
      return data;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const getProjectById = async (id) => {
  if (!projectTable) return null;
  const storedData = await projectTable.get(id.toString());
  if (!storedData) return null;

  const data = { ...storedData };
  data.env = normalizeEnvForOutput(data.env);
  if (data && data.encryptedTunnelToken) {
    data.encryptedTunnelToken = decryptSecret(data.encryptedTunnelToken);
  }
  return data;
};

export const addProject = async (projectData) => {
  if (!projectTable) return null;
  const projects = await projectTable.all();
  const validProjectIds = projects
    .map((p) => Number(p?.data?.id))
    .filter((id) => Number.isInteger(id) && Number.isFinite(id));
  const nextId = validProjectIds.length > 0 ? Math.max(...validProjectIds) + 1 : 1;
  const id = nextId.toString();

  const data = {
    ...projectData,
    id: nextId, // Keep numeric id for UI compatibility
    uuid: crypto.randomUUID(),
    order: projectData.order || 0,
    encryptedTunnelToken: encryptSecret(projectData.encryptedTunnelToken || ""),
  };

  await projectTable.set(id, data);
  return { ...data, encryptedTunnelToken: projectData.encryptedTunnelToken };
};

export const updateProject = async (projectData) => {
  if (!projectTable) return null;
  const id = projectData.id.toString();
  const existing = await projectTable.get(id);
  if (!existing) return null;

  const updatedData = { ...existing, ...projectData };
  if (projectData.encryptedTunnelToken !== undefined) {
    updatedData.encryptedTunnelToken = encryptSecret(projectData.encryptedTunnelToken);
  }

  await projectTable.set(id, updatedData);
  return {
    ...updatedData,
    encryptedTunnelToken:
      projectData.encryptedTunnelToken || decryptSecret(updatedData.encryptedTunnelToken),
  };
};

export const deleteProject = async (id) => {
  if (!projectTable) return false;
  await projectTable.delete(id.toString());
  return true;
};

/** Clear pid on all projects (e.g. during app shutdown). Uses st.db, not Sequelize. */
export const clearAllProjectPids = async () => {
  if (!projectTable) return;
  const entries = await projectTable.all();
  for (const entry of entries) {
    if (entry?.data) {
      await projectTable.set(entry.ID, { ...entry.data, pid: null });
    }
  }
};

export const getCategories = async () => {
  if (!categoryTable) return [];
  const entries = await categoryTable.all();
  return entries.map((e) => e.data).sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const addCategory = async (categoryData) => {
  if (!categoryTable) return null;
  const categories = await categoryTable.all();
  const validCategoryIds = categories
    .map((c) => Number(c?.data?.id))
    .filter((id) => Number.isInteger(id) && Number.isFinite(id));
  const nextId = validCategoryIds.length > 0 ? Math.max(...validCategoryIds) + 1 : 1;
  const id = nextId.toString();

  const data = {
    ...categoryData,
    id: nextId,
    uuid: crypto.randomUUID(),
    order: categoryData.order || 0,
  };

  await categoryTable.set(id, data);
  return data;
};

export const deleteCategory = async (id) => {
  if (!categoryTable) return false;
  await categoryTable.delete(id.toString());
  return true;
};

export const updateCategory = async (categoryData) => {
  if (!categoryTable) return null;
  const id = categoryData.id.toString();
  const existing = await categoryTable.get(id);
  if (!existing) return null;

  const updatedData = { ...existing, ...categoryData };
  await categoryTable.set(id, updatedData);
  return updatedData;
};

export const reorderProjects = async (payload, categoryId = undefined) => {
  if (!projectTable) return false;

  for (const { id, order } of payload) {
    const idStr = id.toString();
    const existing = await projectTable.get(idStr);
    if (existing) {
      const updated = { ...existing, order };
      if (categoryId !== undefined) {
        updated.categoryId = categoryId;
      }
      await projectTable.set(idStr, updated);
    }
  }
  return true;
};

export const reorderProjectsBulk = async (updates) => {
  if (!projectTable) return false;
  if (!Array.isArray(updates)) {
    throw new Error("reorderProjectsBulk expects an updates array");
  }
  if (updates.length === 0) return true;

  const normalizedUpdates = updates.map((update, index) => {
    const id = Number(update?.id);
    const order = Number(update?.order);
    const rawCategoryId = update?.categoryId;
    const categoryId = rawCategoryId === null ? null : Number(rawCategoryId);

    if (!Number.isInteger(id)) {
      throw new Error(`Invalid project id at updates[${index}]`);
    }
    if (!Number.isInteger(order)) {
      throw new Error(`Invalid project order at updates[${index}]`);
    }
    if (!(rawCategoryId === null || Number.isInteger(categoryId))) {
      throw new Error(`Invalid project categoryId at updates[${index}]`);
    }

    return {
      id,
      idStr: id.toString(),
      order,
      categoryId,
    };
  });

  const seenIds = new Set();
  for (const update of normalizedUpdates) {
    if (seenIds.has(update.idStr)) {
      throw new Error(`Duplicate project id in bulk reorder payload: ${update.id}`);
    }
    seenIds.add(update.idStr);
  }

  const snapshot = new Map();
  for (const update of normalizedUpdates) {
    const existing = await projectTable.get(update.idStr);
    if (!existing) {
      throw new Error(`Project not found for bulk reorder: ${update.id}`);
    }
    snapshot.set(update.idStr, existing);
  }

  try {
    for (const update of normalizedUpdates) {
      const existing = snapshot.get(update.idStr);
      await projectTable.set(update.idStr, {
        ...existing,
        order: update.order,
        categoryId: update.categoryId,
      });
    }
    return true;
  } catch (error) {
    logger.error("[Database] reorderProjectsBulk failed. Rolling back touched records.", error);

    // Best-effort atomicity over JSON storage: restore pre-write snapshot.
    for (const [idStr, original] of snapshot.entries()) {
      try {
        await projectTable.set(idStr, original);
      } catch (rollbackError) {
        logger.error(
          `[Database] reorderProjectsBulk rollback failed for project ${idStr}:`,
          rollbackError
        );
      }
    }
    throw error;
  }
};

/**
 * Reorder categories by updating their order values.
 * @param {Object} orders - Object mapping category id to order value.
 * @returns {Promise<boolean>} true on success, false when DB is not initialized.
 */
export const reorderCategories = async (orders) => {
  if (!categoryTable) return false;

  // orders is expected to be an object: { id: order, ... }
  const entries = Object.entries(orders);
  for (const [id, order] of entries) {
    const existing = await categoryTable.get(id);
    if (existing) {
      const updated = { ...existing, order };
      await categoryTable.set(id, updated);
    }
  }
  return true;
};

// ---------------- Restore from backup (for users who lost data before migration) ----------------

/** Returns the app userData path where data.json and legacy backups live. */
export const getUserDataPath = () => {
  return app.getPath("userData");
};

/**
 * List files in userData that look like legacy SQLite DBs or backups,
 * so the user can pick one to restore. Includes projects.sqlite and projects.sqlite.backup_*
 */
export const listLegacyBackupCandidates = async () => {
  const userDataPath = getUserDataPath();
  try {
    const names = await fs.promises.readdir(userDataPath);
    const candidates = names.filter(
      (n) =>
        n === "projects.sqlite" ||
        n === "projects-dev.sqlite" ||
        (n.startsWith("projects") && (n.endsWith(".sqlite") || n.includes(".sqlite.backup")))
    );
    return candidates.map((name) => ({
      name,
      path: path.join(userDataPath, name),
    }));
  } catch (err) {
    logger.warn("[Database] listLegacyBackupCandidates failed:", err?.message ?? err);
    return [];
  }
};

/**
 * Restore projects and categories from a legacy SQLite or backup file.
 * @param {string} filePath - Full path to the .sqlite or backup file
 * @param {boolean} replaceExisting - If true, clear current projects/categories first
 * @returns {{ restored: { projects: number, categories: number }, error?: string }}
 */
export const restoreFromLegacyBackup = async (filePath, replaceExisting = true) => {
  if (!projectTable || !categoryTable) {
    return { restored: { projects: 0, categories: 0 }, error: "Database not initialized." };
  }

  const normalizedPath = path.normalize(path.resolve(filePath));
  if (!fs.existsSync(normalizedPath)) {
    return { restored: { projects: 0, categories: 0 }, error: "File not found." };
  }

  try {
    const { categories, projects } = await readLegacySQLite(normalizedPath);

    if (replaceExisting) {
      const projectEntries = await projectTable.all();
      for (const e of projectEntries) {
        const key = e.id ?? e.key ?? (e.data && String(e.data.id));
        if (key != null) await projectTable.delete(String(key));
      }
      const categoryEntries = await categoryTable.all();
      for (const e of categoryEntries) {
        const key = e.id ?? e.key ?? (e.data && String(e.data.id));
        if (key != null) await categoryTable.delete(String(key));
      }
    }

    for (const row of categories) {
      await categoryTable.set(row.id.toString(), row);
    }
    for (const row of projects) {
      await projectTable.set(row.id.toString(), row);
    }

    logger.info(
      `[Database] Restore complete: ${projects.length} projects, ${categories.length} categories.`
    );
    return { restored: { projects: projects.length, categories: categories.length } };
  } catch (err) {
    const message = err?.message ?? String(err);
    logger.error("[Database] restoreFromLegacyBackup failed:", err);
    return { restored: { projects: 0, categories: 0 }, error: message };
  }
};
