import { app, BrowserWindow, ipcMain, shell, protocol, net } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { registerHandlers, validateExternalUrl } from "./ipc/handlers.js";
import { initializeDatabase } from "./services/database.js";
import { initTray } from "./tray/tray.js";
import { stopAllProjects } from "./services/projectsManager.js";
import logger from "./services/logger.js";
import settingsService from "./services/settingsService.js";

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
const EXTERNAL_MEDIA_DIRS_ENV_KEY = "SELFHOST_MEDIA_ALLOWED_DIRS";
const configuredExternalMediaBases = (process.env[EXTERNAL_MEDIA_DIRS_ENV_KEY] || "")
  .split(path.delimiter)
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => path.resolve(entry));
let hasLoggedPermissiveExternalMediaMode = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizePathForComparison = (targetPath) => {
  const normalizedPath = path.normalize(path.resolve(targetPath));
  return process.platform === "win32" ? normalizedPath.toLowerCase() : normalizedPath;
};

const isPathWithinBase = (targetPath, basePath) => {
  const normalizedTarget = normalizePathForComparison(targetPath);
  const normalizedBase = normalizePathForComparison(basePath);

  if (normalizedTarget === normalizedBase) return true;

  const normalizedBaseWithSeparator = normalizedBase.endsWith(path.sep)
    ? normalizedBase
    : `${normalizedBase}${path.sep}`;

  return normalizedTarget.startsWith(normalizedBaseWithSeparator);
};

const resolveAndValidatePath = (candidatePath, allowedBases) => {
  const resolvedPath = path.resolve(candidatePath);
  const isAllowed = allowedBases.some((basePath) => isPathWithinBase(resolvedPath, basePath));
  return isAllowed ? resolvedPath : null;
};

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    title: isDev ? "SelfHost helper Dev" : "SelfHost helper",
    titleBarStyle: "hidden",
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
    const devServerUrl = "http://localhost:5173";
    const maxRetries = 5;
    const retryDelayMs = 1500;
    let loadedDevUrl = false;

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      if (!mainWindow || mainWindow.isDestroyed()) return null;

      try {
        await mainWindow.loadURL(devServerUrl);
        loadedDevUrl = true;
        break;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        if (isLastAttempt) {
          logger.error("[Window] Failed to load Vite server after retries:", error);
          break;
        }

        logger.info(`[Window] Waiting for Vite server (attempt ${attempt}/${maxRetries})...`);
        await sleep(retryDelayMs);

        if (!mainWindow || mainWindow.isDestroyed()) return null;
      }
    }

    if (loadedDevUrl && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.openDevTools();
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      const fallbackHtml = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>SelfHost Helper Dev</title>
    <style>
      body { font-family: sans-serif; margin: 32px; color: #111; }
      h1 { margin-bottom: 8px; }
      p { line-height: 1.5; }
      code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>Failed to connect to Vite dev server</h1>
    <p>Could not load <code>${devServerUrl}</code> after multiple retries.</p>
    <p>Ensure <code>npm run dev:react</code> is running, then reload the window.</p>
  </body>
</html>`;
      try {
        await mainWindow.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml)}`
        );
      } catch (fallbackError) {
        logger.error("[Window] Failed to load dev fallback error page:", fallbackError);
        return null;
      }
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  if (!mainWindow || mainWindow.isDestroyed()) return null;

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
    const safeUrl = validateExternalUrl(url);
    if (safeUrl) {
      shell.openExternal(safeUrl).catch((err) => {
        logger.error(`Failed to open external URL: ${err.message}`);
      });
    } else {
      logger.warn(`Blocked unsafe window open URL: ${String(url).slice(0, 200)}`);
    }
    return { action: "deny" };
  });

  const startMaximized = await settingsService.get("startMaximized");
  if (startMaximized && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.maximize();
  }

  return mainWindow;
}

// to separate the dev env from the prod
if (process.env.NODE_ENV === "development") {
  app.setAppUserModelId("com.selfhosthelper.dev");
  app.setPath("userData", app.getPath("userData") + "-dev");
}

// Initialize settings early
await settingsService.init();

// Initialize logger early to catch startup issues
logger.init();

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

  app
    .whenReady()
    .then(async () => {
      try {
        logger.info("Application starting up (Ready)...");
      } catch (e) {
        try {
          const logPath = path.join(app.getPath("userData"), "main.log");
          fs.appendFileSync(logPath, `[FATAL] Logger failed: ${String(e?.message || e)}\n`);
        } catch (_) {}
      }
      protocol.handle("media", async (request) => {
        try {
          const url = new URL(request.url);
          let filePath;
          let allowedBases = [];

          if (url.hostname === "app") {
            const relativePath = decodeURIComponent(url.pathname).replace(/^[/\\]+/, "");
            const appBase = path.resolve(app.getAppPath());
            const cwdBase = path.resolve(process.cwd());
            const appCandidate = path.resolve(appBase, relativePath);
            const cwdCandidate = path.resolve(cwdBase, relativePath);

            if (isPathWithinBase(appCandidate, appBase) && fs.existsSync(appCandidate)) {
              filePath = appCandidate;
            } else if (isPathWithinBase(cwdCandidate, cwdBase) && fs.existsSync(cwdCandidate)) {
              filePath = cwdCandidate;
            } else {
              // Keep deterministic lookup and validate against both app-local bases below.
              filePath = appCandidate;
            }
            allowedBases = [appBase, cwdBase];
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

            if (!path.isAbsolute(filePath)) {
              logger.warn(`[Media Protocol] Rejected non-absolute path: ${filePath}`);
              return new Response("Forbidden", { status: 403 });
            }

            if (configuredExternalMediaBases.length > 0) {
              allowedBases.push(...configuredExternalMediaBases);
            } else {
              // Backward-compatible permissive mode: allow readable files on the resolved drive root.
              const driveRoot = path.parse(path.resolve(filePath)).root;
              if (driveRoot) {
                allowedBases.push(driveRoot);
              }
              if (
                process.platform === "win32" &&
                hostname &&
                hostname.length === 1 &&
                /^[a-zA-Z]$/.test(hostname)
              ) {
                allowedBases.push(path.resolve(`${hostname}:\\`));
              }

              if (!hasLoggedPermissiveExternalMediaMode) {
                logger.warn(
                  `[Media Protocol] External media requests are using permissive drive-root mode. Set ${EXTERNAL_MEDIA_DIRS_ENV_KEY} to a ${path.delimiter}-separated list of allowed directories to restrict access.`
                );
                hasLoggedPermissiveExternalMediaMode = true;
              }
            }
          }

          // Remove any surrounding quotes that might have been pasted
          filePath = filePath.replace(/^["']|["']$/g, "").trim();
          filePath = path.normalize(filePath);

          const resolvedFilePath = resolveAndValidatePath(filePath, allowedBases);
          if (!resolvedFilePath) {
            logger.warn(`[Media Protocol] Blocked path outside allowed bases: ${filePath}`);
            return new Response("Forbidden", { status: 403 });
          }
          filePath = resolvedFilePath;

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

      const { initUpdateService } = await import("./services/updateService.js");
      try {
        await initUpdateService();
      } catch (err) {
        logger.error(
          "[Startup] Update service init failed (continuing without updates):",
          err?.message,
          err?.stack
        );
      }

      // Create the main window *before* starting or recovering projects so that
      // status and stats events can be delivered to the renderer.
      const window = await createWindow();
      if (!window) {
        logger.error("[Window] createWindow returned null during startup. Aborting tray setup.");
        app.quit();
        return;
      }

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
      const { getProjects, getCategories } = await import("./services/database.js");
      const { updateTrayMenu } = await import("./tray/tray.js");

      const refreshTray = async () => {
        logger.debug("[Tray] Refreshing menu state.");
        const [projects, categories] = await Promise.all([getProjects(), getCategories()]);
        const runningIds = getRunningProjects();
        updateTrayMenu(
          projects,
          categories,
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

      // Auto-start projects and check for zombies *after* window + tray exist so
      // that sendStatus / stats events have an attached BrowserWindow.
      const {
        startAutoStartProjects,
        checkZombieProcesses,
        relaunchProjectsAfterUpdate,
        getProjectStartTime,
      } = await import("./services/projectsManager.js");
      await checkZombieProcesses();
      await startAutoStartProjects();
      await relaunchProjectsAfterUpdate();

      // Sync running status to renderer so it doesn't show stale "stopped" for auto-started projects
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          const runningIds = getRunningProjects();
          const running = runningIds.map((id) => {
            const startTime = getProjectStartTime(id);
            return {
              id,
              startTime: startTime instanceof Date ? startTime.getTime() : (startTime ?? null),
            };
          });
          if (running.length > 0) {
            mainWindow.webContents.send("project:status-sync", { running });
          }
        } catch (err) {
          logger.warn("[Window] Failed to send project:status-sync:", err);
        }
      }

      app.on("activate", async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          try {
            const createdWindow = await createWindow();
            if (!createdWindow) {
              logger.error("[Window] createWindow returned null on activate.");
            }
          } catch (error) {
            logger.error("[Window] Failed to create window on activate:", error);
          }
        } else if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
        }
      });
    })
    .catch((error) => {
      logger.error("[Startup] Fatal initialization error:", error);
      app.exit(1);
    });
}

let isShuttingDown = false;

app.on("before-quit", async (e) => {
  if (isShuttingDown) return;
  e.preventDefault();
  isShuttingDown = true;

  logger.info("Shutting down... performing fast cleanup.");

  try {
    const { stopAllProjects } = await import("./services/projectsManager.js");
    const { stopAllTunnels } = await import("./services/tunnelManager.js");
    const { clearAllProjectPids } = await import("./services/database.js");

    // Fast kill all running projects and tunnels
    await Promise.all([stopAllProjects(), stopAllTunnels()]);
    // Fast clear all PIDs in st.db
    await clearAllProjectPids();
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
