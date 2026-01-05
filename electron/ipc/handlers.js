import { ipcMain, dialog, BrowserWindow, shell, app } from "electron";
import fs from "fs/promises";
import path from "path";
import AutoLaunch from "auto-launch";
import { Project } from "../../database/models/Project.js";
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
import { watchFolder } from "../services/filesWatcher.js";
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
      logger.debug(
        `[IPC:Handle] ${channel} called with args:`,
        JSON.stringify(args).slice(0, 500)
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
      logger.debug(
        `[IPC:On] ${channel} received:`,
        JSON.stringify(args).slice(0, 500)
      );
      return listener(event, ...args);
    });
  };

  ipcMain.handle("projects:getAll", async () => {
    const projects = await Project.findAll({
      order: [["order", "ASC"]],
    });
    const runningIds = getRunningProjects();
    return projects.map((p) => ({
      ...p.toJSON(),
      status: runningIds.includes(p.id) ? "running" : "stopped",
      startTime: runningIds.includes(p.id) ? getProjectStartTime(p.id) : null,
    }));
  });

  ipcMain.handle("projects:add", async (_, projectData) => {
    const project = await Project.create(projectData);
    logger.info(`Project added: ${project.name} (ID: ${project.id})`);
    notifyProjectListChanged();
    return project;
  });

  ipcMain.handle("projects:delete", async (_, id) => {
    const project = await Project.findByPk(id);
    if (project) {
      logger.info(`Deleting project: ${project.name} (ID: ${id})`);
      await stopProject(id);
      clearProjectLogs(id);
      await project.destroy();
      notifyProjectListChanged();
      return true;
    }
    return false;
  });

  ipcMain.handle("projects:update", async (_, projectData) => {
    const { id, ...data } = projectData;
    const project = await Project.findByPk(id);
    if (project) {
      await project.update(data);
      notifyProjectListChanged();
      return project;
    }
    return null;
  });

  ipcMain.handle("projects:reorder", async (_, orders) => {
    for (const item of orders) {
      await Project.update({ order: item.order }, { where: { id: item.id } });
    }
    notifyProjectListChanged();
    return true;
  });

  ipcMain.handle("project:start", async (_, id) => startProject(id));
  ipcMain.handle("project:stop", async (_, id) => stopProject(id));
  ipcMain.handle("project:restart", async (_, id) => restartProject(id));

  ipcMain.handle("file:read", async (_, filePath) => {
    try {
      if (!filePath) {
        throw new Error("File path is required");
      }
      const content = await fs.readFile(filePath, "utf-8");
      return content;
    } catch (e) {
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
      logger.error(`Error writing file ${filePath}:`, e);
      throw e;
    }
  });

  ipcMain.handle("watcher:watch", async (_, folderPath) => {
    watchFolder(folderPath);
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
      filters: [
        { name: "Images", extensions: ["jpg", "png", "gif", "ico", "svg"] },
      ],
    });
    if (canceled) {
      return null;
    } else {
      return filePaths[0];
    }
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
};
