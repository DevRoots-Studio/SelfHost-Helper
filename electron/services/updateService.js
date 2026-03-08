import logger from "./logger.js";

const GITHUB_OWNER = "DevRoots-Studio";
const GITHUB_REPO = "SelfHost-Helper";

const CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
// const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const INITIAL_CHECK_DELAY_MS = 10 * 1000; // 10 seconds after app ready

let autoUpdater = null;
let updateCheckIntervalId = null;
let updateStatus = "idle"; // idle | checking | available | downloading | downloaded | error
let updateVersion = null;
let releaseNotes = null;
let updateError = null;

function sendStatus(payload) {
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    try {
      global.mainWindow.webContents.send("updater:status", payload);
    } catch (err) {
      logger.debug("[UpdateService] Could not send status to renderer:", err?.message);
    }
  }
}

async function fetchReleaseNotesFromGitHub(version, retries = 2) {
  const tag = version.startsWith("v") ? version : `v${version}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${tag}`;
      const res = await fetch(url, {
        headers: { Accept: "application/vnd.github.v3+json" },
      });
      if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
        logger.warn("[UpdateService] GitHub API rate limit hit; release notes skipped.");
        return null;
      }
      if (!res.ok) {
        if (attempt < retries) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      const data = await res.json();
      return data.body || null;
    } catch (err) {
      logger.warn("[UpdateService] Failed to fetch release notes from GitHub:", err?.message);
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return null;
}

function formatUpdateError(rawMessage) {
  if (!rawMessage || typeof rawMessage !== "string") return rawMessage;
  const is404 = rawMessage.includes("404") || rawMessage.includes("Not Found");
  const isLatestYml = rawMessage.includes("latest.yml");
  if (is404 && isLatestYml) {
    return (
      "Update server returned 404 (latest.yml not found). " +
      "Ensure the GitHub release tag is vX.Y.Z (e.g. v0.8.0, not 0.8.0v) and the release includes latest.yml and installer files. " +
      "Publish with: npm run build && npx electron-builder --publish always"
    );
  }
  if (is404) {
    return "Update server returned 404. Check that a GitHub release exists with tag vX.Y.Z and contains latest.yml (publish with electron-builder --publish always).";
  }
  return rawMessage;
}

function getReleaseNotesFromUpdateInfo(updateInfo) {
  if (!updateInfo) return null;
  if (typeof updateInfo.releaseNotes === "string") return updateInfo.releaseNotes;
  if (updateInfo.releaseNotes && typeof updateInfo.releaseNotes === "object") {
    const notes = updateInfo.releaseNotes;
    if (notes.constructor === Array && notes.length > 0) {
      return notes.map((n) => (typeof n === "string" ? n : n.note || "")).join("\n\n");
    }
  }
  return null;
}

function startPeriodicUpdateCheck() {
  if (updateCheckIntervalId) return;
  updateCheckIntervalId = setInterval(() => {
    checkForUpdates();
  }, CHECK_INTERVAL_MS);
  logger.info(`[UpdateService] Periodic update check every ${CHECK_INTERVAL_MS / 60000} minutes.`);
  setTimeout(() => checkForUpdates(), INITIAL_CHECK_DELAY_MS);
}

function stopPeriodicUpdateCheck() {
  if (updateCheckIntervalId) {
    clearInterval(updateCheckIntervalId);
    updateCheckIntervalId = null;
    logger.info(
      "[UpdateService] Stopped periodic update check (update found). Will not check again until next app restart."
    );
  }
}

export async function initUpdateService() {
  try {
    const mod = await import("electron-updater");
    const updater = mod.autoUpdater ?? mod.default?.autoUpdater;
    if (!updater) {
      logger.warn("[UpdateService] electron-updater: autoUpdater export not found.");
      return;
    }
    autoUpdater = updater;
  } catch (err) {
    logger.warn("[UpdateService] electron-updater not available:", err?.message, err?.stack);
    return;
  }

  try {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on("update-available", async (info) => {
      stopPeriodicUpdateCheck();
      updateStatus = "available";
      updateVersion = info.version;
      releaseNotes = getReleaseNotesFromUpdateInfo(info);
      if (!releaseNotes && info.version) {
        releaseNotes = await fetchReleaseNotesFromGitHub(info.version);
      }
      updateError = null;
      logger.info(`[UpdateService] Update available: ${info.version}`);
      sendStatus({ status: "available", version: updateVersion, releaseNotes });
    });

    autoUpdater.on("update-not-available", () => {
      updateStatus = "idle";
      updateVersion = null;
      releaseNotes = null;
      updateError = null;
      sendStatus({ status: "idle" });
    });

    autoUpdater.on("download-progress", (progress) => {
      updateStatus = "downloading";
      sendStatus({
        status: "downloading",
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      });
    });

    autoUpdater.on("update-downloaded", async (info) => {
      stopPeriodicUpdateCheck();
      updateStatus = "downloaded";
      updateVersion = info.version;
      if (!releaseNotes && info.version) {
        releaseNotes = await fetchReleaseNotesFromGitHub(info.version);
      }
      if (!releaseNotes) {
        releaseNotes = getReleaseNotesFromUpdateInfo(info);
      }
      logger.info(`[UpdateService] Update downloaded: ${info.version}`);
      sendStatus({ status: "downloaded", version: updateVersion, releaseNotes });
    });

    autoUpdater.on("error", (err) => {
      updateStatus = "error";
      updateError = err?.message || String(err);
      logger.error("[UpdateService] Error:", err);
      sendStatus({ status: "error", error: updateError });
    });

    startPeriodicUpdateCheck();
    logger.info("[UpdateService] Initialized.");
  } catch (err) {
    logger.error("[UpdateService] Failed to configure electron-updater:", err?.message, err?.stack);
    autoUpdater = null;
  }
}

export async function checkForUpdates() {
  if (!autoUpdater) {
    sendStatus({ status: "idle" });
    return;
  }
  if (updateStatus === "checking" || updateStatus === "downloading") {
    return;
  }
  updateStatus = "checking";
  updateError = null;
  sendStatus({ status: "checking" });
  try {
    const result = await autoUpdater.checkForUpdates();
    const info = result?.updateInfo;
    if (!info) {
      updateStatus = "idle";
      sendStatus({ status: "idle" });
      return;
    }
    stopPeriodicUpdateCheck();
    updateStatus = "available";
    updateVersion = info.version;
    releaseNotes = getReleaseNotesFromUpdateInfo(info);
    if (!releaseNotes && info.version) {
      releaseNotes = await fetchReleaseNotesFromGitHub(info.version);
    }
    updateError = null;
    logger.info(`[UpdateService] Update available: ${info.version}`);
    sendStatus({ status: "available", version: updateVersion, releaseNotes });
  } catch (err) {
    updateStatus = "error";
    const raw = err?.message || String(err);
    updateError = formatUpdateError(raw);
    sendStatus({ status: "error", error: updateError });
  }
}

export function startInstall() {
  if (!autoUpdater) return;
  if (updateStatus !== "available") {
    logger.warn("[UpdateService] startInstall called but no update available.");
    return;
  }
  updateStatus = "downloading";
  sendStatus({ status: "downloading" });
  autoUpdater.downloadUpdate().catch((err) => {
    updateStatus = "error";
    const raw = err?.message || String(err);
    updateError = formatUpdateError(raw);
    sendStatus({ status: "error", error: updateError });
  });
}

export function getUpdateStatus() {
  return {
    status: updateStatus,
    version: updateVersion ?? null,
    releaseNotes: releaseNotes ?? null,
    error: updateError ?? null,
  };
}

export async function restartToApplyUpdate() {
  if (!autoUpdater || updateStatus !== "downloaded") {
    logger.warn("[UpdateService] restartToApply called but update not downloaded.");
    return;
  }

  const { getRunningProjects } = await import("./projectsManager.js");
  const { getProjects } = await import("./database.js");
  const settingsService = (await import("./settingsService.js")).default;

  const runningIds = getRunningProjects();
  const projects = await getProjects();
  const projectMap = new Map(projects.map((p) => [p.id?.toString(), p]));
  const toRelaunch = runningIds.filter((id) => {
    const p = projectMap.get(id);
    return p && !p.autoStart;
  });

  await settingsService.set("projectsToRelaunchAfterUpdate", toRelaunch);
  logger.info(`[UpdateService] Persisted ${toRelaunch.length} projects to relaunch after update.`);

  autoUpdater.quitAndInstall(false, true);
}
