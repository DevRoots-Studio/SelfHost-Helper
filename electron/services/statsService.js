import os from "os";
import logger from "./logger.js";

const numCPUs = Math.max(1, os.cpus().length);

// Per-project state for the streaming monitor
// Map<projectId, { job, startTime, mainPid, lastPayload }>
const monitors = new Map();

/**
 * Start the native sampling thread for a project's Job Object.
 * Safe to call multiple times — idempotent.
 */
export function startStatsStream(projectId, job, startTime, mainPid = null) {
  if (!job) return;
  if (monitors.has(projectId)) {
    stopStatsStream(projectId);
  }

  const state = { job, startTime, mainPid, lastPayload: null };
  monitors.set(projectId, state);

  try {
    job.startMonitor(500, (rawStats) => {
      if (!global.mainWindow || global.mainWindow.isDestroyed()) return;

      const now = Date.now();
      const uptime = now - startTime.getTime();

      const payload = {
        projectId,
        cpu:             rawStats.cpu ?? 0,
        memory:          rawStats.memory ?? 0,
        uptime,
        mainPid:         state.mainPid,
        pids:            Array.isArray(rawStats.pids) ? rawStats.pids : [],
        processCount:    Array.isArray(rawStats.pids) ? rawStats.pids.length : 0,
        activeProcesses: rawStats.activeProcesses ?? 0,
        timestamp:       now,
      };

      state.lastPayload = payload;

      try {
        global.mainWindow.webContents.send("project:stats", payload);
      } catch (err) {
        // Window may have been destroyed between the null check and the send
      }
    });

    logger.debug(`[StatsService] Started native monitor for project ${projectId}`);
  } catch (err) {
    logger.error(`[StatsService] Failed to start monitor for project ${projectId}:`, err);
    monitors.delete(projectId);
  }
}

/**
 * Stop the native sampling thread for a project.
 * Safe to call when no monitor is active.
 */
export function stopStatsStream(projectId) {
  const state = monitors.get(projectId);
  if (!state) return;

  try {
    state.job.stopMonitor();
    logger.debug(`[StatsService] Stopped native monitor for project ${projectId}`);
  } catch (err) {
    logger.error(`[StatsService] Error stopping monitor for project ${projectId}:`, err);
  }

  monitors.delete(projectId);
}

/**
 * Stop all running native monitors (called on app shutdown).
 */
export function stopAllStatsStreams() {
  for (const [projectId] of monitors) {
    stopStatsStream(projectId);
  }
}

/**
 * Return the last emitted stats payload for a project (used by the one-off
 * getProjectStats IPC handler instead of recomputing from scratch).
 */
export function getLastStats(projectId) {
  return monitors.get(projectId)?.lastPayload ?? null;
}
