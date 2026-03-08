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

/**
 * Get the path to the runtimes directory inside the application's user data directory.
 * @returns {string} The full filesystem path to the runtimes directory for this application.
 */
function getRuntimesDir() {
  return path.join(app.getPath("userData"), "runtimes");
}

/**
 * Get the filesystem path to the runtimes index file.
 * @returns {string} The full path to the runtimes index file (`index.json`) inside the runtimes directory.
 */
function getIndexPath() {
  return path.join(getRuntimesDir(), INDEX_FILENAME);
}

/**
 * Scan the runtimes directory and build index entries for installed Node and Python runtimes.
 *
 * Searches the runtimes directory for "node" and "python" subfolders, detects installed runtime
 * directories that contain the platform-specific executable, and returns a list of index entries.
 *
 * @returns {Array<{id: string, type: string, version: string, path: string, platform: string, arch: string}>}
 * An array of runtime index entries where each entry contains:
 * - `id`: the runtime identifier (e.g., "v18.16.0" for Node or "3.11.2" for Python),
 * - `type`: `"node"` or `"python"`,
 * - `version`: normalized version string (Node `id` without a leading `v`, Python same as `id`),
 * - `path`: full filesystem path to the runtime installation directory,
 * - `platform`: the current process.platform value captured when scanning,
 * - `arch`: the current process.arch value captured when scanning.
 */
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

/**
 * Read the runtimes index file from disk and return the stored entries.
 *
 * If the index file is missing, malformed, or cannot be read, this function
 * attempts to rebuild the index from the filesystem; if rebuilding fails,
 * it returns an empty array.
 * @returns {Array<Object>} An array of runtime index entries, or an empty array if none are available.
 */
function readIndex() {
  const indexPath = getIndexPath();
 
  if (!fs.existsSync(indexPath)) {
    const rebuilt = rebuildIndexFromFilesystem();
    if (rebuilt.length > 0) {
      writeIndex(rebuilt);
      logger.info(
        "[RuntimeService] Rebuilt missing runtimes index from filesystem:",
        rebuilt.length
      );
    }
    return rebuilt;
  }
  
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

/**
 * Persist the runtimes index to disk, ensuring the runtimes directory exists.
 * @param {Array<Object>} entries - Array of runtime index entries to write to disk; each entry should include id, type, version, path, platform, and arch as applicable.
 */
function writeIndex(entries) {
  const dir = getRuntimesDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getIndexPath(), JSON.stringify(entries, null, 2), "utf8");
}

/**
 * Send a runtime progress update to the renderer window if one is available.
 * @param {object} payload - Progress payload to send over the "runtime:progress" IPC channel (e.g., { phase, percent, id, message }).
 */
function sendProgress(payload) {
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    try {
      global.mainWindow.webContents.send("runtime:progress", payload);
    } catch (err) {
      logger.debug("[RuntimeService] Could not send progress:", err?.message);
    }
  }
}

/**
 * Selects the appropriate Node protocol module for a given URL.
 * @param {string} urlStr - The URL whose protocol should determine the module.
 * @returns {object} The Node `https` module if the URL uses the `https:` protocol, otherwise the `http` module.
 */
function getProtocolModule(urlStr) {
  const protocol = new URL(urlStr).protocol;
  return protocol === "https:" ? https : http;
}

/**
 * Download a file from a URL to a local destination path.
 *
 * Follows HTTP(S) redirects, reports download progress via sendProgress, and
 * removes partially written files on error.
 * @param {string} url - The URL to download.
 * @param {string} destPath - The local file path to write the downloaded content to.
 * @returns {string} The destination path when the download completes successfully.
 */
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

/**
 * Extracts a ZIP archive into the specified destination directory on Windows using PowerShell.
 *
 * This operation is performed asynchronously and rejects on non-Windows platforms
 * or when PowerShell returns a non-zero exit code.
 *
 * @param {string} zipPath - Path to the ZIP archive to extract.
 * @param {string} destDir - Destination directory where files will be extracted.
 * @returns {Promise<void>} Resolves when extraction completes successfully; rejects with an Error on failure.
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

/**
 * Fetches JSON from the given URL and parses the response.
 * @param {string} urlStr - The request URL.
 * @param {Object} [options] - Optional request settings.
 * @param {Object} [options.headers] - HTTP request headers.
 * @returns {any} The parsed JSON response.
 */
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

/**
 * Fetches available Node.js versions that include Windows x64 binaries.
 *
 * Attempts to retrieve the official Node.js distribution index and returns up to 50 entries filtered to those that provide "win-x64" files. If the remote API fails or yields no suitable entries, returns a predefined fallback list.
 * @returns {{version: string, id: string}[]} An array of objects where `version` is the version string without a leading "v" and `id` is the version identifier (prefixed with "v" when present or added).
 */
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

/**
 * Fetches recent stable CPython release tags from GitHub and returns them as version/id pairs.
 *
 * Filters tags matching the `vMAJOR.MINOR.PATCH` pattern, normalizes them by removing the `v`
 * prefix, deduplicates by id, and limits the result to 60 entries.
 * @returns {Array<{version: string, id: string}>} An array of objects with `version` and `id` for each Python release; if the GitHub API call fails, returns a predefined fallback list in the same shape.
 */
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

/**
 * Retrieve a list of available runtimes for the given type from official sources.
 * @param {string} type - Runtime type to list; valid values are `"node"` or `"python"`.
 * @returns {Promise<Array<{id: string, version: string}>>} An array of available runtime descriptors; each object contains `id` (identifier used for installs) and `version` (the human-readable version string). An empty array is returned for unknown `type`.
 */
export async function listAvailable(type) {
  if (type === "node") return listAvailableNode();
  if (type === "python") return await listAvailablePython();
  return [];
}

/**
 * List installed runtimes, optionally filtered by type.
 * 
 * Only entries whose runtime directory and runtime executable exist on disk are returned.
 * 
 * @param {string|null} type - Optional runtime type to filter by (e.g., "node" or "python").
 * @returns {Array<Object>} Array of installed runtime entries. Each entry includes properties such as `id`, `type`, `version`, `path`, `platform`, and `arch`.
 */
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

/**
 * Return the installation directory that contains the runtime executable, suitable for adding to PATH.
 * @param {string} type - Runtime type, either "node" or "python".
 * @param {string} id - Runtime id or version to match (e.g., "v16.14.0" or "3.11.2").
 * @returns {string|null} The directory path containing the runtime executable, or `null` if not found.
 */
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

/**
 * Get the absolute path to the runtime executable for a given runtime type and id.
 * @param {string} type - Runtime type, either `"node"` or `"python"`.
 * @param {string} id - Runtime identifier or version string as used by the index.
 * @returns {string|null} The absolute path to the executable if the runtime is installed, `null` otherwise.
 */
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

/**
 * Quote a filesystem path that contains spaces so it is safe to use in a shell.
 * @param {string} p - The path to quote.
 * @returns {string} The original path if it contains no spaces; otherwise the path wrapped in double quotes (on non-Windows internal double quotes are escaped).
 */
export function quotePath(p) {
  if (!p || !p.includes(" ")) return p;
  if (process.platform === "win32") return `"${p}"`;
  return `"${p.replace(/"/g, '\\"')}"`;
}

const VALID_RUNTIME_TYPES = ["node", "python"];

/** In-flight install promises per (type, id) to prevent concurrent install of same version. */
const installLocks = new Map();

/**
 * Ensure the provided runtime type is one of the supported values.
 * @param {string} type - Runtime type; must be either `"node"` or `"python"`.
 * @throws {Error} If `type` is not a string or is not `"node"` or `"python"`.
 */
export function validateRuntimeType(type) {
  if (typeof type !== "string" || !VALID_RUNTIME_TYPES.includes(type)) {
    throw new Error(`Invalid runtime type: ${type}. Must be "node" or "python".`);
  }
}

/**
 * Install a portable Node or Python runtime into the application's runtimes directory.
 *
 * @param {string} type - Runtime type, either "node" or "python".
 * @param {string} versionId - Version identifier (examples: "v20.10.0" or "3.12.0").
 * @returns {{success: true, path: string, id: string}} An object containing `success: true`, the installation `path`, and the normalized runtime `id` on successful installation.
 * @throws {Error} If `type` is invalid or `versionId` is missing/invalid, or if the installation fails.
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
                  const destSub = path.join(dest, subName);
                  const destSubDir = path.dirname(destSub);
                  if (!fs.existsSync(destSubDir)) {
                    fs.mkdirSync(destSubDir, { recursive: true });
                  }

                  fs.renameSync(path.join(src, subName), destSub);
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
 * Remove an installed runtime and its entry from the runtimes index.
 *
 * If the runtime is referenced by any project, the uninstall is prevented unless
 * `options.force` is true.
 *
 * @param {string} type - Runtime type, either `"node"` or `"python"`.
 * @param {string} id - Runtime identifier or version to uninstall.
 * @param {Object} [options] - Optional settings.
 * @param {boolean} [options.force=false] - When true, remove the runtime even if projects reference it.
 * @returns {Object} `{ success: true }` on successful uninstall; `{ success: false, error: string }` on failure (e.g., runtime not found or in use).
 */
export async function uninstallRuntime(type, id, options = {}) {
  const { force = false } = options;
  const entries = readIndex();
  const entry = entries.find((e) => e.type === type && (e.id === id || e.version === id));
  if (!entry) return { success: false, error: "Runtime not found." };
  const matchesEntry = (value) => {
    if (value == null) return false;
    const str = value.toString();
    return str === entry.id || str === entry.version;
  };
  if (!force) {
    const projects = await getProjects();
    const usedBy = projects.filter(
      (p) =>
        (type === "node" && matchesEntry(p.nodeVersionId)) ||
        (type === "python" && matchesEntry(p.pythonVersionId))
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

    for (const p of projects) {
      const clearNode = matchesEntry(p.nodeVersionId);
      const clearPython = matchesEntry(p.pythonVersionId);
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
