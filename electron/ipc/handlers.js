import { ipcMain, dialog, BrowserWindow, shell, app } from "electron";
import fs from "fs/promises";
import path from "path";
import AutoLaunch from "auto-launch";
import {
  getProjects,
  addProject,
  deleteProject,
  updateProject,
  reorderProjects,
  reorderProjectsBulk,
  getCategories,
  addCategory,
  deleteCategory,
  updateCategory,
  reorderCategories,
  getUserDataPath,
  listLegacyBackupCandidates,
  restoreFromLegacyBackup,
} from "../services/database.js";
import {
  startProject,
  stopProject,
  restartProject,
  getRunningProjects,
  getProjectLogs,
  writeToProcess,
  getProjectStats,
  getProjectStartTime,
  notifyProjectListChanged,
  clearProjectLogs,
} from "../services/projectsManager.js";
import {
  startTunnel,
  stopTunnel,
  getTunnelLogs,
  clearTunnelLogs,
  getTunnelStatus,
} from "../services/tunnelManager.js";
import { watchFolder, stopWatching } from "../services/filesWatcher.js";
import { isIgnoredDirName } from "../services/ignorePatterns.js";
import { searchInProject } from "../services/searchService.js";
import * as gitService from "../services/gitService.js";
import { startLspForProject, stopLspForProject } from "../services/lspBridge.js";
import settingsService from "../services/settingsService.js";
import {
  checkForUpdates,
  startInstall,
  restartToApplyUpdate,
  getUpdateStatus,
} from "../services/updateService.js";
import logger from "../services/logger.js";

const appLauncher = new AutoLaunch({
  name: "SelfHost Helper",
  path: process.execPath,
});

export const registerHandlers = () => {
  // Helper to log all IPC calls
  const originalHandle = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (channel, listener) => {
    return originalHandle(channel, async (event, ...args) => {
      let loggedArgs = args;
      if (channel === "tunnel:start" && args.length > 1 && args[1]?.token) {
        // Redact token in tunnel:start options
        loggedArgs = [args[0], { ...args[1], token: "[REDACTED]" }];
      }

      logger.debug(
        `[IPC:Handle] ${channel} called with args:`,
        JSON.stringify(loggedArgs).slice(0, 500)
      );
      try {
        const result = await listener(event, ...args);
        logger.debug(`[IPC:Handle] ${channel} success.`);
        return result;
      } catch (err) {
        logger.error(`[IPC:Handle] ${channel} error:`, err);
        throw err;
      }
    });
  };

  const originalOn = ipcMain.on.bind(ipcMain);
  ipcMain.on = (channel, listener) => {
    return originalOn(channel, (event, ...args) => {
      logger.debug(`[IPC:On] ${channel} received:`, JSON.stringify(args).slice(0, 500));
      return listener(event, ...args);
    });
  };

  ipcMain.handle("projects:getAll", async () => {
    const projects = await getProjects();
    const runningIds = getRunningProjects();
    return projects.map((p) => ({
      ...p,
      status: runningIds.includes(p.id?.toString()) ? "running" : "stopped",
      startTime: runningIds.includes(p.id?.toString()) ? getProjectStartTime(p.id) : null,
    }));
  });

  ipcMain.handle("projects:add", async (_, projectData) => {
    const project = await addProject(projectData);
    logger.info(`Project added: ${project.name} (ID: ${project.id})`);
    notifyProjectListChanged();
    return project;
  });

  ipcMain.handle("projects:delete", async (_, id) => {
    const success = await deleteProject(id);
    if (success) {
      await stopProject(id);
      clearProjectLogs(id);
      notifyProjectListChanged();
      return true;
    }
    return false;
  });

  ipcMain.handle("projects:update", async (_, projectData) => {
    const project = await updateProject(projectData);
    if (project) {
      notifyProjectListChanged();
      return project;
    }
    return null;
  });

  ipcMain.handle("projects:reorder", async (_, { orders, categoryId }) => {
    const success = await reorderProjects(orders, categoryId);
    notifyProjectListChanged();
    return success;
  });

  ipcMain.handle("projects:reorderBulk", async (_, { updates }) => {
    const success = await reorderProjectsBulk(updates);
    notifyProjectListChanged();
    return success;
  });

  ipcMain.handle("categories:getAll", async () => {
    return await getCategories();
  });

  ipcMain.handle("categories:add", async (_, categoryData) => {
    const category = await addCategory(categoryData);
    notifyProjectListChanged();
    return category;
  });

  ipcMain.handle("categories:update", async (_, categoryData) => {
    const category = await updateCategory(categoryData);
    if (category) {
      notifyProjectListChanged();
      return category;
    }
    return null;
  });

  ipcMain.handle("categories:delete", async (_, id) => {
    const projects = await getProjects();
    const normalizeCategoryId = (value) => {
      if (value === null || value === undefined || value === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const targetCategoryId = normalizeCategoryId(id);

    // Unset categoryId for all projects in this category
    for (const p of projects) {
      if (targetCategoryId !== null && normalizeCategoryId(p.categoryId) === targetCategoryId) {
        await updateProject({ id: p.id, categoryId: null });
      }
    }
    const success = await deleteCategory(id);
    if (success) {
      notifyProjectListChanged();
      return true;
    }
    return false;
  });

  ipcMain.handle("categories:reorder", async (_, orders) => {
    // Convert array of {id, order} to object if needed, but reorderCategories in database.js expects an object currently?
    // Let's check database.js reorderCategories.
    const ordersObj = {};
    orders.forEach((o) => (ordersObj[o.id] = o.order));
    const success = await reorderCategories(ordersObj);
    notifyProjectListChanged();
    return success;
  });

  ipcMain.handle("project:start", async (_, id) => startProject(id));
  ipcMain.handle("project:stop", async (_, id) => stopProject(id));
  ipcMain.handle("project:restart", async (_, id) => restartProject(id));

  const isFileNotFound = (e) => e?.code === "ENOENT";

  ipcMain.handle("file:read", async (_, filePath) => {
    try {
      if (!filePath) {
        throw new Error("File path is required");
      }
      const content = await fs.readFile(filePath, "utf-8");
      return content;
    } catch (e) {
      if (isFileNotFound(e)) {
        logger.info(`File no longer exists (read): ${filePath}`);
        throw new Error("File no longer exists (deleted or moved).");
      }
      logger.error(`Error reading file ${filePath}:`, e);
      const errorMessage = e.message || e.toString() || "Unknown error";
      throw new Error(`Failed to read file: ${errorMessage}`);
    }
  });

  ipcMain.handle("file:write", async (_, filePath, content) => {
    try {
      await fs.writeFile(filePath, content, "utf-8");
      return true;
    } catch (e) {
      if (isFileNotFound(e)) {
        logger.info(`File no longer exists (write): ${filePath}`);
        throw new Error("File no longer exists (deleted or moved).");
      }
      logger.error(`Error writing file ${filePath}:`, e);
      throw e;
    }
  });

  ipcMain.handle("watcher:watch", async (_, folderPath) => {
    watchFolder(folderPath);
    return true;
  });

  ipcMain.handle("watcher:stop", async (_, folderPath) => {
    await stopWatching(folderPath);
    return true;
  });

  // AutoLaunch
  ipcMain.handle("app:isAutoLaunchEnabled", async () => {
    try {
      return await appLauncher.isEnabled();
    } catch (e) {
      return false;
    }
  });

  ipcMain.handle("app:enableAutoLaunch", async () => {
    try {
      await appLauncher.enable();
      return true;
    } catch (e) {
      return false;
    }
  });

  ipcMain.handle("app:disableAutoLaunch", async () => {
    try {
      await appLauncher.disable();
      return true;
    } catch (e) {
      return false;
    }
  });

  // Settings
  ipcMain.handle("settings:get", async () => {
    return await settingsService.getAll();
  });

  ipcMain.handle("settings:update", async (_, newSettings) => {
    await settingsService.update(newSettings);
    return true;
  });

  // Logs
  ipcMain.handle("logs:get", async (_, id) => {
    return getProjectLogs(id);
  });
  ipcMain.handle("logs:clear", async (_, id) => {
    clearProjectLogs(id);
    return true;
  });

  ipcMain.handle("project:getStats", async (_, id) => {
    return getProjectStats(id);
  });

  ipcMain.handle("project:input", async (_, { id, data }) => {
    return writeToProcess(id, data);
  });

  // Tunnels
  ipcMain.handle("tunnel:start", async (_, id, options) => {
    return startTunnel(id, options);
  });

  ipcMain.handle("tunnel:stop", async (_, id) => {
    return stopTunnel(id);
  });

  ipcMain.handle("tunnel:getLogs", async (_, id) => {
    return getTunnelLogs(id);
  });

  ipcMain.handle("tunnel:clearLogs", async (_, id) => {
    return clearTunnelLogs(id);
  });

  ipcMain.handle("tunnel:getStatus", async (_, id) => {
    return getTunnelStatus(id);
  });

  // Dialogs
  ipcMain.handle("dialog:openDirectory", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (canceled) {
      return null;
    } else {
      return filePaths[0];
    }
  });

  ipcMain.handle("dialog:openFile", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["jpg", "png", "gif", "ico", "svg"] }],
    });
    if (canceled) {
      return null;
    } else {
      return filePaths[0];
    }
  });

  // Help ensure paths stay under project root
  const isUnderRoot = (fullPath, root) => {
    const normalized = path.normalize(path.resolve(fullPath));
    const normalizedRoot = path.normalize(path.resolve(root));
    return normalized === normalizedRoot || normalized.startsWith(normalizedRoot + path.sep);
  };

  ipcMain.handle("file:create", async (_, { projectRoot, targetPath, type, content }) => {
    try {
      if (!projectRoot || !targetPath || !type) {
        throw new Error("projectRoot, targetPath, and type are required");
      }
      const resolved = path.resolve(projectRoot, targetPath);
      if (!isUnderRoot(resolved, projectRoot)) {
        throw new Error("Path must be inside project");
      }
      if (type === "directory") {
        try {
          await fs.mkdir(resolved, { recursive: true });
          return true;
        } catch (e) {
          if (e.code === "EEXIST") {
            const stat = await fs.stat(resolved).catch(() => null);
            if (stat?.isDirectory()) {
              logger.info(`Directory already exists: ${targetPath}`);
              return { alreadyExisted: true };
            }
            throw new Error("A file with that name already exists.");
          }
          throw e;
        }
      } else {
        const dir = path.dirname(resolved);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(resolved, content ?? "", "utf-8");
        return true;
      }
    } catch (e) {
      logger.error(`Error creating ${type} at ${targetPath}:`, e);
      throw e;
    }
  });

  ipcMain.handle("file:delete", async (_, { projectRoot, targetPath }) => {
    try {
      if (!projectRoot || !targetPath) throw new Error("projectRoot and targetPath required");
      const resolved = path.resolve(projectRoot, targetPath);
      if (!isUnderRoot(resolved, projectRoot)) throw new Error("Path must be inside project");
      const stat = await fs.stat(resolved);
      await fs.rm(resolved, { recursive: stat.isDirectory(), force: true });
      return true;
    } catch (e) {
      logger.error(`Error deleting ${targetPath}:`, e);
      throw e;
    }
  });

  ipcMain.handle("file:rename", async (_, { projectRoot, oldPath, newPath }) => {
    try {
      if (!projectRoot || !oldPath || !newPath)
        throw new Error("projectRoot, oldPath, newPath required");
      const resolvedOld = path.resolve(projectRoot, oldPath);
      const resolvedNew = path.resolve(projectRoot, newPath);
      if (!isUnderRoot(resolvedOld, projectRoot) || !isUnderRoot(resolvedNew, projectRoot)) {
        throw new Error("Paths must be inside project");
      }
      await fs.rename(resolvedOld, resolvedNew);
      return true;
    } catch (e) {
      logger.error(`Error renaming ${oldPath} to ${newPath}:`, e);
      throw e;
    }
  });

  ipcMain.handle("search:inProject", async (_, projectRoot, query, options = {}) => {
    try {
      return await searchInProject(projectRoot, query, options);
    } catch (e) {
      logger.error("Search error:", e);
      throw e;
    }
  });

  // Git
  ipcMain.handle("git:status", async (_, projectPath) => {
    try {
      return await gitService.gitStatus(projectPath);
    } catch (e) {
      logger.error("Git status error:", e);
      throw e;
    }
  });
  ipcMain.handle("git:diff", async (_, projectPath, filePath) => {
    try {
      return await gitService.gitDiff(projectPath, filePath);
    } catch (e) {
      logger.error("Git diff error:", e);
      throw e;
    }
  });
  ipcMain.handle("git:add", async (_, projectPath, paths) => {
    try {
      return await gitService.gitAdd(projectPath, paths ?? []);
    } catch (e) {
      logger.error("Git add error:", e);
      throw e;
    }
  });
  ipcMain.handle("git:unstage", async (_, projectPath, paths) => {
    try {
      return await gitService.gitUnstage(projectPath, paths ?? []);
    } catch (e) {
      logger.error("Git unstage error:", e);
      throw e;
    }
  });
  ipcMain.handle("git:commit", async (_, projectPath, message) => {
    try {
      return await gitService.gitCommit(projectPath, message);
    } catch (e) {
      logger.error("Git commit error:", e);
      throw e;
    }
  });
  ipcMain.handle("git:push", async (_, projectPath) => {
    try {
      return await gitService.gitPush(projectPath);
    } catch (e) {
      logger.error("Git push error:", e);
      throw e;
    }
  });
  ipcMain.handle("git:pull", async (_, projectPath) => {
    try {
      return await gitService.gitPull(projectPath);
    } catch (e) {
      logger.error("Git pull error:", e);
      throw e;
    }
  });
  ipcMain.handle("git:branches", async (_, projectPath) => {
    try {
      return await gitService.gitBranches(projectPath);
    } catch (e) {
      logger.error("Git branches error:", e);
      throw e;
    }
  });
  ipcMain.handle("git:checkout", async (_, projectPath, branchOrRef) => {
    try {
      return await gitService.gitCheckout(projectPath, branchOrRef);
    } catch (e) {
      logger.error("Git checkout error:", e);
      throw e;
    }
  });
  ipcMain.handle("git:clone", async (_, repoUrl, targetPath) => {
    try {
      return await gitService.gitClone(repoUrl, targetPath);
    } catch (e) {
      logger.error("Git clone error:", e);
      throw e;
    }
  });
  ipcMain.handle("git:remoteUrl", async (_, projectPath) => {
    try {
      return await gitService.gitRemoteUrl(projectPath);
    } catch (e) {
      logger.error("Git remoteUrl error:", e);
      throw e;
    }
  });

  ipcMain.handle("git:init", async (_, projectPath) => {
    try {
      return await gitService.gitInit(projectPath);
    } catch (e) {
      logger.error("Git init error:", e);
      throw e;
    }
  });

  ipcMain.handle("git:addRemote", async (_, projectPath, name, url) => {
    try {
      return await gitService.gitAddRemote(projectPath, name, url);
    } catch (e) {
      logger.error("Git addRemote error:", e);
      throw e;
    }
  });

  ipcMain.handle("git:remotes", async (_, projectPath) => {
    try {
      return await gitService.gitRemotes(projectPath);
    } catch (e) {
      logger.error("Git remotes error:", e);
      throw e;
    }
  });

  ipcMain.handle("git:removeRemote", async (_, projectPath, name) => {
    try {
      return await gitService.gitRemoveRemote(projectPath, name);
    } catch (e) {
      logger.error("Git removeRemote error:", e);
      throw e;
    }
  });

  ipcMain.handle("lsp:start", async (_, projectPath) => {
    try {
      return await startLspForProject(projectPath);
    } catch (e) {
      logger.error("LSP start error:", e);
      throw e;
    }
  });
  ipcMain.handle("lsp:stop", async (_, projectPath) => {
    await stopLspForProject(projectPath);
    return true;
  });

  // File System (Recursive list)
  ipcMain.handle("files:readDirectory", async (_, dirPath) => {
    async function getFiles(dir) {
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(
        dirents.map((dirent) => {
          const res = path.resolve(dir, dirent.name);
          if (dirent.isDirectory()) {
            return getFiles(res).then((children) => ({
              name: dirent.name,
              path: res,
              type: "directory",
              children,
            }));
          } else {
            return {
              name: dirent.name,
              path: res,
              type: "file",
            };
          }
        })
      );
      return files;
    }

    try {
      return await getFiles(dirPath);
    } catch (e) {
      console.error(e);
      return [];
    }
  });

  // Window controls
  ipcMain.on("window:close", () => {
    const window = BrowserWindow.getFocusedWindow() || global.mainWindow;
    if (window) {
      window.close();
    }
  });

  ipcMain.on("window:minimize", () => {
    const window = BrowserWindow.getFocusedWindow() || global.mainWindow;
    if (window) {
      window.minimize();
    }
  });

  ipcMain.on("window:toggleMaximize", () => {
    const window = BrowserWindow.getFocusedWindow() || global.mainWindow;
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  });

  // Open external URL in default browser
  ipcMain.handle("app:openExternal", async (_, url) => {
    try {
      await shell.openExternal(url);
      return true;
    } catch (error) {
      logger.error(`Failed to open external URL ${url}:`, error);
      return false;
    }
  });

  ipcMain.handle("shell:openPath", async (_, path) => {
    try {
      await shell.openPath(path);
      return true;
    } catch (error) {
      logger.error(`Failed to open path ${path}:`, error);
      return false;
    }
  });
  ipcMain.handle("discord:getInviteInfo", async (_, inviteCode) => {
    try {
      const response = await fetch(
        `https://discord.com/api/invites/${inviteCode}?with_counts=true`
      );
      if (!response.ok) throw new Error("Failed to fetch Discord server info");
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("app:getVersion", () => {
    return app.getVersion();
  });
  ipcMain.handle("app:getAppPath", () => {
    return app.getAppPath();
  });
  ipcMain.handle("path:join", (_, ...args) => {
    return path.join(...args);
  });

  ipcMain.handle("database:getUserDataPath", () => getUserDataPath());
  ipcMain.handle("database:listLegacyBackupCandidates", () => listLegacyBackupCandidates());
  ipcMain.handle(
    "database:restoreFromLegacyBackup",
    async (_, filePath, replaceExisting = true) => {
      const result = await restoreFromLegacyBackup(filePath, replaceExisting);
      if (result.error) return result;
      notifyProjectListChanged();
      return result;
    }
  );
  ipcMain.handle("dialog:openBackupFile", async () => {
    const userDataPath = getUserDataPath();
    const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
      title: "Select legacy database or backup file",
      defaultPath: userDataPath,
      filters: [
        { name: "SQLite / Backup", extensions: ["sqlite", "db"] },
        { name: "All", extensions: ["*"] },
      ],
      properties: ["openFile"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("updater:check", () => checkForUpdates());
  ipcMain.handle("updater:startInstall", () => startInstall());
  ipcMain.handle("updater:restartToApply", () => restartToApplyUpdate());
  ipcMain.handle("updater:getStatus", () => getUpdateStatus());
};
