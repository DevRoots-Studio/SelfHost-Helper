import { ipcMain, dialog } from "electron";
import fs from "fs/promises";
import path from "path"; // Added import
import AutoLaunch from "auto-launch";
import { Project } from "../../database/models/Project.js";
import {
  startProject,
  stopProject,
  restartProject,
  getRunningProjects,
  getProjectLogs,
  writeToProcess,
} from "../services/projectsManager.js";
import { watchFolder } from "../services/filesWatcher.js";

const appLauncher = new AutoLaunch({
  name: "SelfHost Helper",
  path: process.execPath,
});

export const registerHandlers = () => {
  // Projects
  ipcMain.handle("projects:getAll", async () => {
    const projects = await Project.findAll();
    // mix in status? for now just data. Status is sent via events or separate query.
    // We could map running state:
    const runningIds = getRunningProjects(); // array of ids
    return projects.map((p) => ({
      ...p.toJSON(),
      status: runningIds.includes(p.id) ? "running" : "stopped",
    }));
  });

  ipcMain.handle("projects:add", async (_, projectData) => {
    return await Project.create(projectData);
  });

  ipcMain.handle("projects:delete", async (_, id) => {
    const project = await Project.findByPk(id);
    if (project) {
      await stopProject(id); // ensure stopped
      await project.destroy();
      return true;
    }
    return false;
  });

  ipcMain.handle("projects:update", async (_, projectData) => {
    const { id, ...data } = projectData;
    const project = await Project.findByPk(id);
    if (project) {
      await project.update(data);
      return project;
    }
    return null;
  });

  // Process Control
  ipcMain.handle("project:start", async (_, id) => startProject(id));
  ipcMain.handle("project:stop", async (_, id) => stopProject(id));
  ipcMain.handle("project:restart", async (_, id) => restartProject(id));

  // Files
  ipcMain.handle("file:read", async (_, filePath) => {
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  ipcMain.handle("file:write", async (_, filePath, content) => {
    try {
      await fs.writeFile(filePath, content, "utf-8");
      return true;
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  ipcMain.handle("watcher:watch", async (_, folderPath) => {
    watchFolder(folderPath);
    return true;
  });

  // AutoLaunch
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

  // File System (Recursive list)
  ipcMain.handle("files:readDirectory", async (_, dirPath) => {
    // Simple recursive scanner or just one level?
    // For efficiency, let's do one level if requested, or recursive with mapped structure.
    // Let's do recursive but careful with depth.
    // Actually, for a file tree, typically we load on demand or small depth.
    // Let's provide a full tree for now (small projects) or a level scanner.
    // User said "file directory of the project, the files and folders".
    // Let's use a function to get tree.

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
};
