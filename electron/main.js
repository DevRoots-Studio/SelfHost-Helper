import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { registerHandlers } from "./ipc/handlers.js";
import { initializeDatabase } from "./services/database.js";
import { initTray } from "./tray/tray.js";

import { stopAllProjects } from "./services/projectsManager.js"; // Import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === "development";

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Make accessible to other modules if needed, though strictly passing it is better
// We will modify the global object for now as requested/implied for easy access,
// but cleaner is to pass it around.
global.mainWindow = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Sometimes needed for certain node modules in preload, but try to avoid if possible.
      devTools: false,
    },
    show: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "../resources/icon.png"),
  });

  global.mainWindow = mainWindow;

  if (isDev) {
    // Wait a bit for Vite to be ready if running simultaneously, or just load
    try {
      await mainWindow.loadURL("http://localhost:5173");
    } catch (e) {
      console.log("Waiting for Vite server...");
      setTimeout(() => mainWindow.loadURL("http://localhost:5173"), 2000);
    }
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  return mainWindow;
}

app.whenReady().then(async () => {
  await initializeDatabase();
  registerHandlers(ipcMain);

  const window = await createWindow();
  tray = initTray(window, () => {
    isQuitting = true;
    app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

let isShuttingDown = false;

app.on("before-quit", async (e) => {
  if (isShuttingDown) return;
  e.preventDefault();
  isShuttingDown = true;
  await stopAllProjects();
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Keep running in tray
  }
});

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
