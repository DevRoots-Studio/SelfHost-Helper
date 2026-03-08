import { app } from "electron";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import http from "http";
import https from "https";
import logger from "./logger.js";
import { getProjects, updateProject } from "./database.js";

const INDEX_FILENAME = "index.json";
const NODE_DIST_INDEX = "https://nodejs.org/dist/index.json";
const PYTHON_GITHUB_TAGS = "https://api.github.com/repos/python/cpython/tags?per_page=100";

/** Fallback when API is unreachable (offline/firewall). */
const NODE_FALLBACK_VERSIONS = [
  "v22.12.0",
  "v22.11.0",
  "v22.10.0",
  "v21.7.0",
  "v20.18.0",
  "v20.17.0",
  "v18.20.0",
];
const PYTHON_FALLBACK_VERSIONS = ["3.13.0", "3.12.6", "3.12.5", "3.11.9", "3.11.8", "3.10.14"];

function getRuntimesDir() {
  return path.join(app.getPath("userData"), "runtimes");
}

function getIndexPath() {
  return path.join(getRuntimesDir(), INDEX_FILENAME);
}

/** Rebuild index entries by scanning runtimes dir (node/* and python/*) for existing executables. */
function rebuildIndexFromFilesystem() {
  const runtimesDir = getRuntimesDir();
  const platform = process.platform;
  const arch = process.arch;
  const entries = [];

  for (const type of ["node", "python"]) {
    const typeDir = path.join(runtimesDir, type);
    if (!fs.existsSync(typeDir) || !fs.statSync(typeDir).isDirectory()) continue;
    const exeName = type === "node" ? "node.exe" : "python.exe";
    const dirNames = fs.readdirSync(typeDir);
    for (const id of dirNames) {
      const dirPath = path.join(typeDir, id);
      if (!fs.statSync(dirPath).isDirectory()) continue;
      const exePath = path.join(dirPath, exeName);
      if (!fs.existsSync(exePath)) continue;
      const version = type === "node" ? id.replace(/^v/, "") : id;
      entries.push({ id, type, version, path: dirPath, platform, arch });
    }
  }
  return entries;
}

function readIndex() {
  const indexPath = getIndexPath();
  if (!fs.existsSync(indexPath)) return [];
  try {
    const raw = fs.readFileSync(indexPath, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    logger.warn("[RuntimeService] Failed to read runtimes index:", e?.message);
    try {
      const rebuilt = rebuildIndexFromFilesystem();
      if (rebuilt.length > 0) {
        logger.info("[RuntimeService] Rebuilt runtimes index from filesystem:", rebuilt.length);
      }
      return rebuilt;
    } catch (rebuildErr) {
      logger.warn("[RuntimeService] Could not rebuild index:", rebuildErr?.message);
      return [];
    }
  }
}

function writeIndex(entries) {
  const dir = getRuntimesDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getIndexPath(), JSON.stringify(entries, null, 2), "utf8");
}

function sendProgress(payload) {
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    try {
      global.mainWindow.webContents.send("runtime:progress", payload);
    } catch (err) {
      logger.debug("[RuntimeService] Could not send progress:", err?.message);
    }
  }
}

/** Choose http or https module based on URL protocol (handles redirects to http or https). */
function getProtocolModule(urlStr) {
  const protocol = new URL(urlStr).protocol;
  return protocol === "https:" ? https : http;
}

/** Download url to dest path. Returns path. Uses http or https based on URL protocol. */
function downloadFile(url, destPath) {
  const protocolModule = getProtocolModule(url);
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const request = protocolModule.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirect = response.headers.location;
        if (redirect) {
          file.close();
          fs.unlinkSync(destPath);
          downloadFile(redirect, destPath).then(resolve).catch(reject);
          return;
        }
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const total = parseInt(response.headers["content-length"], 10) || 0;
      let downloaded = 0;
      response.on("data", (chunk) => {
        downloaded += chunk.length;
        if (total > 0)
          sendProgress({
            phase: "download",
            percent: Math.round((downloaded / total) * 100),
            total,
            downloaded,
          });
      });
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve(destPath);
      });
    });
    request.on("error", (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
    file.on("error", (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

/** Extract zip to dir on Windows using PowerShell (async to avoid blocking the main process). */
function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    if (process.platform !== "win32") {
      reject(new Error("Portable runtimes are only supported on Windows in this version."));
      return;
    }
    const ps = `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`;
    const child = spawn("powershell", ["-NoProfile", "-Command", ps], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stderr = "";
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `PowerShell exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

/** GET a URL and parse response as JSON. Uses http or https based on URL protocol (handles redirects). */
function httpsGetJson(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const protocolModule = getProtocolModule(urlStr);
    const reqOpts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "GET",
      headers: options.headers || {},
    };
    const req = protocolModule.request(reqOpts, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (loc) {
          res.resume();
          const resolvedUrl = new URL(loc, urlStr).href;
          return httpsGetJson(resolvedUrl, options).then(resolve).catch(reject);
        }
      }
      if (res.statusCode !== 200) {
        let body = "";
        res.on("data", (chunk) => (body += chunk.toString()));
        res.on("end", () =>
          reject(new Error(`HTTP ${res.statusCode}${body ? ` ${body.slice(0, 200)}` : ""}`))
        );
        return;
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        try {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    req.end();
  });
}

/** List available Node versions (remote). Falls back to a short list if API fails or returns no win-x64. */
export async function listAvailableNode() {
  try {
    const data = await httpsGetJson(NODE_DIST_INDEX);
    const raw = Array.isArray(data) ? data : [];
    const list = raw
      .filter(
        (e) => e && e.version && e.files && Array.isArray(e.files) && e.files.includes("win-x64")
      )
      .map((e) => ({
        version: e.version,
        id: String(e.version).startsWith("v") ? e.version : `v${e.version}`,
      }))
      .slice(0, 50);
    if (list.length > 0) return list;
    logger.warn(
      "[RuntimeService] listAvailableNode: API returned no win-x64 versions, using fallback"
    );
    return NODE_FALLBACK_VERSIONS.map((id) => ({ version: id.replace(/^v/, ""), id }));
  } catch (err) {
    logger.warn("[RuntimeService] listAvailableNode failed, using fallback:", err?.message);
    return NODE_FALLBACK_VERSIONS.map((id) => ({ version: id.replace(/^v/, ""), id }));
  }
}

/** List available Python versions from official GitHub (cpython tags). Falls back if API fails. */
export async function listAvailablePython() {
  try {
    const data = await httpsGetJson(PYTHON_GITHUB_TAGS, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "SelfHost-Helper/1.0 (Electron)",
      },
    });
    const stable = (data || [])
      .filter((t) => t.name && /^v\d+\.\d+\.\d+$/.test(t.name))
      .map((t) => {
        const ver = t.name.replace(/^v/, "");
        return { version: ver, id: ver };
      });
    const seen = new Set();
    const uniq = stable.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
    return uniq.slice(0, 60);
  } catch (err) {
    logger.warn("[RuntimeService] listAvailablePython failed, using fallback:", err?.message);
    return PYTHON_FALLBACK_VERSIONS.map((id) => ({ version: id, id }));
  }
}

/** List available runtimes by type (from official APIs). */
export async function listAvailable(type) {
  if (type === "node") return listAvailableNode();
  if (type === "python") return await listAvailablePython();
  return [];
}

/** List installed runtimes; optionally filter by type. Verifies path and executable exist. */
export function listInstalled(type = null) {
  const entries = readIndex();
  const platform = process.platform;
  const arch = process.arch;
  const out = [];
  for (const e of entries) {
    if (type != null && e.type !== type) continue;
    if (e.platform && e.platform !== platform) continue;
    if (!e.path || !fs.existsSync(e.path)) continue;
    const exe = e.type === "node" ? "node.exe" : "python.exe";
    const exePath = path.join(e.path, exe);
    if (!fs.existsSync(exePath)) continue;
    out.push({ ...e, path: e.path });
  }
  return out;
}

/** Get directory containing the executable for a runtime (for PATH injection). */
export function getRuntimeDir(type, id) {
  const entries = listInstalled(type);
  const entry = entries.find(
    (e) =>
      e.id === id ||
      e.version === id ||
      (type === "node" && (e.id === id || e.id === `v${id}`)) ||
      (type === "python" && e.id === id)
  );
  if (!entry) return null;
  return entry.path;
}

/** Get full path to node or python executable. Returns null if not installed. */
export function getRuntimePath(type, id) {
  const dir = getRuntimeDir(type, id);
  if (!dir) return null;
  const exe =
    process.platform === "win32"
      ? type === "node"
        ? "node.exe"
        : "python.exe"
      : type === "node"
        ? "node"
        : "python3";
  const exePath = path.join(dir, exe);
  return fs.existsSync(exePath) ? exePath : null;
}

/** Quote path for use in shell if it contains spaces. */
export function quotePath(p) {
  if (!p || !p.includes(" ")) return p;
  if (process.platform === "win32") return `"${p}"`;
  return `"${p.replace(/"/g, '\\"')}"`;
}

const VALID_RUNTIME_TYPES = ["node", "python"];

/** In-flight install promises per (type, id) to prevent concurrent install of same version. */
const installLocks = new Map();

export function validateRuntimeType(type) {
  if (typeof type !== "string" || !VALID_RUNTIME_TYPES.includes(type)) {
    throw new Error(`Invalid runtime type: ${type}. Must be "node" or "python".`);
  }
}

/**
 * Install a runtime. type: 'node' | 'python', versionId: e.g. 'v20.10.0' or '3.12.0'.
 * Sends runtime:progress events: { phase: 'download'|'extract'|'done', percent?, error? }
 * Single-flights concurrent installs of the same (type, id).
 */
export async function installRuntime(type, versionId) {
  validateRuntimeType(type);
  if (process.platform !== "win32") {
    throw new Error("Portable runtimes are only supported on Windows in this version.");
  }
  if (versionId == null || typeof versionId !== "string" || !versionId.trim()) {
    throw new Error("Version ID is required and must be a non-empty string.");
  }
  const trimmedVersionId = versionId.trim();

  const id =
    type === "node"
      ? trimmedVersionId.startsWith("v")
        ? trimmedVersionId
        : `v${trimmedVersionId}`
      : trimmedVersionId;
  const key = `${type}:${id}`;

  const existing = installLocks.get(key);
  if (existing) return existing;

  const promise = (async () => {
    sendProgress({ phase: "download", percent: 0 });
    const runtimesDir = getRuntimesDir();
    if (!fs.existsSync(runtimesDir)) fs.mkdirSync(runtimesDir, { recursive: true });

    const installDir = path.join(runtimesDir, type, id);
    if (fs.existsSync(installDir)) {
      const exePath = getRuntimePath(type, id);
      if (exePath) {
        sendProgress({ phase: "done", percent: 100 });
        return { success: true, path: installDir, id };
      }
      fs.rmSync(installDir, { recursive: true, force: true });
    }
    fs.mkdirSync(path.dirname(installDir), { recursive: true });

    let zipPath = null;
    try {
      if (type === "node") {
        const version = id.startsWith("v") ? id : `v${id}`;
        const zipName = `node-${version}-win-x64.zip`;
        const url = `https://nodejs.org/dist/${version}/${zipName}`;
        zipPath = path.join(runtimesDir, zipName);
        await downloadFile(url, zipPath);
      } else if (type === "python") {
        const ver = id;
        const zipName = `python-${ver}-embed-amd64.zip`;
        const url = `https://www.python.org/ftp/python/${ver}/${zipName}`;
        zipPath = path.join(runtimesDir, zipName);
        await downloadFile(url, zipPath);
      } else {
        throw new Error(`Unknown runtime type: ${type}`);
      }

      sendProgress({ phase: "extract", percent: 50 });
      await extractZip(zipPath, installDir);

      const exeName = type === "node" ? "node.exe" : "python.exe";
      const expectedExe = path.join(installDir, exeName);
      if (!fs.existsSync(expectedExe)) {
        const topDir = path.join(installDir, path.basename(zipPath, ".zip"));
        const subDir = fs.existsSync(topDir) ? topDir : null;
        const dirToFlatten =
          subDir ||
          (() => {
            const entries = fs.readdirSync(installDir);
            const sub = entries.find((n) => {
              const p = path.join(installDir, n);
              return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, exeName));
            });
            return sub ? path.join(installDir, sub) : null;
          })();
        if (dirToFlatten) {
          const entries = fs.readdirSync(dirToFlatten);
          for (const name of entries) {
            const src = path.join(dirToFlatten, name);
            const dest = path.join(installDir, name);
            if (fs.existsSync(dest)) {
              if (fs.statSync(src).isDirectory()) {
                const subEntries = fs.readdirSync(src);
                for (const subName of subEntries) {
                  fs.renameSync(path.join(src, subName), path.join(dest, subName));
                }
                fs.rmdirSync(src);
              } else {
                fs.unlinkSync(dest);
                fs.renameSync(src, dest);
              }
            } else {
              fs.renameSync(src, dest);
            }
          }
          fs.rmdirSync(dirToFlatten);
        }
      }

      const entries = readIndex();
      const existingIndex = entries.findIndex(
        (e) => e.type === type && (e.id === id || e.version === id)
      );
      const newEntry = {
        id,
        type,
        version: id.replace(/^v/, ""),
        path: installDir,
        platform: process.platform,
        arch: process.arch,
      };
      if (existingIndex >= 0) entries[existingIndex] = newEntry;
      else entries.push(newEntry);
      writeIndex(entries);

      if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      sendProgress({ phase: "done", percent: 100 });
      return { success: true, path: installDir, id };
    } catch (err) {
      if (zipPath && fs.existsSync(zipPath))
        try {
          fs.unlinkSync(zipPath);
        } catch (_) {}
      if (installDir && fs.existsSync(installDir))
        try {
          fs.rmSync(installDir, { recursive: true, force: true });
        } catch (_) {}
      sendProgress({ phase: "error", error: err?.message || String(err) });
      logger.error("[RuntimeService] installRuntime failed:", err);
      throw err;
    }
  })();

  installLocks.set(key, promise);
  promise.finally(() => installLocks.delete(key));
  return promise;
}

/**
 * Uninstall a runtime. Removes directory and index entry.
 * If any project uses this runtime (nodeVersionId/pythonVersionId), returns error unless options.force is true.
 */
export async function uninstallRuntime(type, id, options = {}) {
  const { force = false } = options;
  const entries = readIndex();
  const entry = entries.find((e) => e.type === type && (e.id === id || e.version === id));
  if (!entry) return { success: false, error: "Runtime not found." };

  if (!force) {
    const projects = await getProjects();
    const usedBy = projects.filter(
      (p) =>
        (type === "node" && (p.nodeVersionId === id || p.nodeVersionId === id?.toString())) ||
        (type === "python" && (p.pythonVersionId === id || p.pythonVersionId === id?.toString()))
    );
    if (usedBy.length > 0) {
      const names = usedBy.map((p) => p.name).join(", ");
      return {
        success: false,
        error: `This runtime is used by: ${names}. Unassign it in those projects first, or retry with force.`,
      };
    }
  } else {
    const projects = await getProjects();
    const idStr = id?.toString();
    for (const p of projects) {
      const clearNode = p.nodeVersionId === id || p.nodeVersionId === idStr;
      const clearPython = p.pythonVersionId === id || p.pythonVersionId === idStr;
      if (clearNode || clearPython) {
        const patch = { id: p.id };
        if (clearNode) patch.nodeVersionId = null;
        if (clearPython) patch.pythonVersionId = null;
        await updateProject(patch);
      }
    }
  }

  const dir = entry.path;
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  writeIndex(entries.filter((e) => e.type !== type || (e.id !== id && e.version !== id)));
  return { success: true };
}
