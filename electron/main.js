import { app, BrowserWindow, ipcMain, shell, protocol, net } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { registerHandlers } from "./ipc/handlers.js";
import { initializeDatabase } from "./services/database.js";
import { initTray } from "./tray/tray.js";
import { stopAllProjects } from "./services/projectsManager.js";
import logger from "./services/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === "development";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "media",
    privileges: { secure: true, supportFetchAPI: true, standard: true },
  },
]);

let mainWindow = null;
let tray = null;
let isQuitting = false;

global.mainWindow = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    // frame: false,
    title: isDev ? "SelfHost helper Dev" : "SelfHost helper",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0f0f14",
      symbolColor: "#ffffff",
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: isDev,
    },
    show: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "../resources/icon.png"),
  });

  global.mainWindow = mainWindow;

  if (isDev) {
    try {
      await mainWindow.loadURL("http://localhost:5173");
    } catch (e) {
      logger.info("Waiting for Vite server...");
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
      logger.debug("[Window] Intercepted close event, hiding to tray.");
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    logger.info("[Window] Closing for real (isQuitting=true).");
  });

  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("window:maximize");
  });

  mainWindow.on("unmaximize", () => {
    mainWindow.webContents.send("window:unmaximize");
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  return mainWindow;
}

// to separate the dev env from the prod
if (process.env.NODE_ENV === "development") {
  app.setAppUserModelId("com.selfhosthelper.dev");
  app.setPath("userData", app.getPath("userData") + "-dev");
}

// Initialize logger early to catch startup issues
logger.init();

app.whenReady().then(async () => {
  logger.info("Application starting up (Ready)...");
  protocol.handle("media", async (request) => {
    try {
      const url = new URL(request.url);
      let filePath;

      if (url.hostname === "app") {
        const relativePath = decodeURIComponent(url.pathname);
        filePath = path.join(app.getAppPath(), relativePath);
        if (!fs.existsSync(filePath)) {
          filePath = path.join(process.cwd(), relativePath);
        }
      } else {
        // Handle media://G/path, media:///G:/path, media:///G/path
        let rawPath = decodeURIComponent(url.pathname);
        let hostname = url.hostname;

        if (hostname && hostname.length === 1 && /^[a-zA-Z]$/.test(hostname)) {
          // If hostname is "G", and rawPath is "/Minecraft server/image.png"
          filePath = path.join(`${hostname}:`, rawPath);
        } else if (process.platform === "win32") {
          // If rawPath is "/G:/Minecraft server image.png"
          if (/^\/[a-zA-Z]:/.test(rawPath)) {
            filePath = rawPath.slice(1);
          } else if (/^\/[a-zA-Z]\//.test(rawPath)) {
            // Case: /G/path
            filePath = rawPath.charAt(1) + ":" + rawPath.slice(2);
          } else {
            filePath = rawPath;
          }
        } else {
          filePath = rawPath;
        }
      }

      filePath = path.normalize(filePath);
      // Remove any surrounding quotes that might have been pasted
      filePath = filePath.replace(/^["']|["']$/g, "").trim();

      try {
        await fs.promises.access(filePath, fs.constants.R_OK);
      } catch (e) {
        return new Response("File not found", { status: 404 });
      }

      const buffer = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      logger.debug(`[Protocol:Media] Serving file: ${filePath} (${ext})`);
      const mimeTypes = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".ico": "image/x-icon",
        ".svg": "image/svg+xml",
        ".bmp": "image/bmp",
      };

      return new Response(buffer, {
        headers: {
          "Content-Type": mimeTypes[ext] || "application/octet-stream",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (e) {
      logger.error("[Media Protocol] Error:", e);
      return new Response("Internal Error", { status: 500 });
    }
  });

  await initializeDatabase();
  registerHandlers(ipcMain);

  // Auto-start projects and check for zombies
  import("./services/projectsManager.js").then(
    ({ startAutoStartProjects, checkZombieProcesses }) => {
      checkZombieProcesses();
      startAutoStartProjects();
    }
  );

  const window = await createWindow();

  const {
    startProject,
    stopProject,
    restartProject,
    startAllProjects,
    stopAllProjects,
    getRunningProjects,
    onStatusChange,
    onProjectListChange,
  } = await import("./services/projectsManager.js");
  const { Project } = await import("../database/models/Project.js");
  const { updateTrayMenu } = await import("./tray/tray.js");

  const refreshTray = async () => {
    logger.debug("[Tray] Refreshing menu state.");
    const projects = await Project.findAll();
    const runningIds = getRunningProjects();
    updateTrayMenu(
      projects,
      runningIds,
      startProject,
      stopProject,
      restartProject,
      startAllProjects,
      stopAllProjects
    );
  };

  tray = initTray(window, () => {
    isQuitting = true;
    app.quit();
  });

  // Update tray on status changes
  onStatusChange(() => {
    refreshTray();
  });

  // Update tray on project list changes (add/delete)
  onProjectListChange(() => {
    refreshTray();
  });

  // Initial tray setup
  refreshTray();

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

  logger.info("Shutting down... performing fast cleanup.");

  try {
    const { stopAllProjects } = await import("./services/projectsManager.js");
    const { Project } = await import("../database/models/Project.js");

    // Fast kill all running projects
    await stopAllProjects();
    // Fast clear all PIDs in DB
    await Project.update({ pid: null }, { where: {} });
  } catch (err) {
    logger.error("Cleanup error during shutdown:", err);
  } finally {
    logger.info("Cleanup complete. Quitting.");
    app.quit();
  }
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
