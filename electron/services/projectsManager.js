import { spawn } from "child_process";
import { getProjects, getProjectById, updateProject } from "./database.js";
import pidusage from "pidusage";
import chalk from "chalk";
import { getProjectPids, killProjectGroup, getProjectProcessInfo } from "./processTree.js";
import path from "path";
import fs from "fs";
import { createJob, assignPid } from "../job/index.js";
import logger from "./logger.js";
import os from "os";
import settingsService from "./settingsService.js";
import {
  getRuntimePath,
  getRuntimeDir,
  quotePath,
} from "./runtimeService.js";

const numCPUs = os.cpus().length;

const runningRuntimes = {};
const logHistory = {};
const statusListeners = new Set();
const listListeners = new Set();
import { startTunnel } from "./tunnelManager.js";
import { startStatsStream, stopStatsStream, stopAllStatsStreams, getLastStats } from "./statsService.js";

export const onStatusChange = (callback) => {
  statusListeners.add(callback);
  return () => statusListeners.delete(callback);
};

export const onProjectListChange = (callback) => {
  listListeners.add(callback);
  return () => listListeners.delete(callback);
};

export const notifyProjectListChanged = () => {
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    logger.debug(`[ProjectsManager] Notifying renderer: projects:list-changed`);
    global.mainWindow.webContents.send("projects:list-changed");
  }
};

export const clearProjectLogs = (id) => {
  delete logHistory[id];
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    global.mainWindow.webContents.send("project:logs-cleared", id);
  }
};

//============================{Sends Logs to the Front-end}=============================
const logQueues = {};

const flushLogQueue = (projectId) => {
  if (logQueues[projectId] && logQueues[projectId].length > 0) {
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      try {
        global.mainWindow.webContents.send("project:logs-batch", {
          projectId,
          logs: logQueues[projectId],
        });
      } catch (err) {}
    }
    logQueues[projectId] = [];
  }
};

const sendLog = (projectId, data, type = "stdout") => {
  const logEntry = {
    projectId,
    data: data.toString(),
    type,
    timestamp: new Date(),
  };

  if (!logHistory[projectId]) {
    logHistory[projectId] = [];
  }
  logHistory[projectId].push(logEntry);
  if (logHistory[projectId].length > 1000) {
    logHistory[projectId].shift();
  }

  // Batching: instead of immediate send, add to queue
  if (!logQueues[projectId]) {
    logQueues[projectId] = [];
  }
  logQueues[projectId].push(logEntry);

  // If queue is too big or it's been a while, flush it
  if (logQueues[projectId].length >= 50) {
    flushLogQueue(projectId);
  } else if (logQueues[projectId].length === 1) {
    // Start a timer for the first item in the batch
    setTimeout(() => flushLogQueue(projectId), 100);
  }
};

//============================{Sends Projects Power Status }=============================
const sendStatus = (projectId, status, extraData = {}) => {
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    try {
      logger.info(`[ProjectsManager] Status Change: Project ${projectId} -> ${status}`);
      global.mainWindow.webContents.send("project:status", {
        projectId,
        status,
        ...extraData,
      });
    } catch (error) {
      // Window might be destroyed during shutdown, ignore silently
    }
  }

  // Notify listeners
  statusListeners.forEach((cb) => cb(projectId, status, extraData));
};

export const checkZombieProcesses = async () => {
  const projects = await getProjects();

  for (const project of projects) {
    // On Windows, try to recover the Job Object by name
    if (process.platform === "win32") {
      const jobName = `Global\\SelfHostHelper_Project_${project.uuid}`;
      const existingJob = createJob(jobName);

      if (existingJob) {
        try {
          const stats = existingJob.getStats();
          if (stats.activeProcesses > 0) {
            logger.info(
              `[ProjectsManager] Recovered running project via Job Object: ${project.name}`
            );

            // Re-establish runtime without a child object (since we don't have the handle)
            // But we have the job, which is enough for stats and killing.
            const recoveredStartTime =
              project.updatedAt ? new Date(project.updatedAt) : new Date();
            runningRuntimes[project.id] = {
              job: existingJob,
              startTime: recoveredStartTime,
              platform: process.platform,
              isRecovered: true,
              child: {
                pid: project.pid || 0,
                killed: false,
                once: () => {}, // Mock for killProjectGroup compatibility
                emit: () => {},
                on: () => {},
                stderr: { on: () => {} },
                stdout: { on: () => {} },
              },
            };

            sendStatus(project.id, "running", {
              startTime: recoveredStartTime,
              isRecovered: true,
            });
            // Start native stats stream for recovered project
            startStatsStream(
              project.id,
              existingJob,
              recoveredStartTime,
              project.pid || null
            );
            continue;
          } else {
            existingJob.close();
          }
        } catch (err) {
          existingJob.close();
        }
      }
    }

    // Fallback if not Windows or Job recovery failed
    if (project.pid) {
      const isAlive = await isProcessGroupAlive(project.pid, process.platform);
      if (isAlive) {
        logger.warn(`Zombie process group found for project ${project.name} (PID: ${project.pid})`);
        sendStatus(project.id, "zombie", {
          message: "Improper Shutdown Detected",
          pid: project.pid,
        });
      } else {
        logger.info(`Cleaning up stale PID for project ${project.name}`);
        await updateProject({ id: project.id, pid: null });
        sendStatus(project.id, "stopped");
      }
    }
  }
};

async function isProcessGroupAlive(rootPid, platform) {
  try {
    const pids = await getProjectPids(rootPid, platform);
    return pids.length > 0;
  } catch (e) {
    return false;
  }
}

export const getRunningProjects = () => Object.keys(runningRuntimes);
export const getProjectLogs = (id) => logHistory[id] || [];
/**
 * Get all in-memory project console logs.
 * Returned object shape: { [projectId: string]: Array<{data,type,timestamp,projectId}> }
 */
export const getAllProjectLogs = () => ({ ...logHistory });
export const getProjectStartTime = (id) =>
  runningRuntimes[id] ? runningRuntimes[id].startTime : null;

//============================{Writes Commands to the Projects Processes}=============================
export const writeToProcess = (id, data) => {
  const runtime = runningRuntimes[id];
  if (!runtime || !runtime.child || runtime.child.killed) {
    sendLog(id, `Failed to send input: process not running\n`, "stderr");
    return false;
  }

  const { child } = runtime;
  if (child.stdin) {
    const toWrite = data.endsWith("\n") ? data : data + "\n";
    try {
      logger.debug(`[ProjectsManager] Writing stdin to project ${id}: ${toWrite.trim()}`);
      child.stdin.write(toWrite);
      sendLog(id, `> ${toWrite}`, "stdin");
      return true;
    } catch (err) {
      sendLog(id, `Failed to write to process stdin: ${err.message}\n`, "stderr");
      return false;
    }
  }

  sendLog(id, `Failed to send input: process stdin not available\n`, "stderr");
  return false;
};

//============================{Starts a Project}=============================
export const startProject = async (id) => {
  const project = await getProjectById(id);
  if (!project) throw new Error("Project not found");

  if (runningRuntimes[id]) {
    return { success: false, message: "Already running" };
  }

  let nodePath = "node";
  if (project.nodeVersionId) {
    const p = getRuntimePath("node", project.nodeVersionId);
    if (!p) {
      return {
        success: false,
        message: "Selected Node version is not installed. Install it in Settings → Portable runtimes.",
      };
    }
    nodePath = p;
  }
  let pythonPath = "python";
  if (project.pythonVersionId) {
    const p = getRuntimePath("python", project.pythonVersionId);
    if (!p) {
      return {
        success: false,
        message: "Selected Python version is not installed. Install it in Settings → Portable runtimes.",
      };
    }
    pythonPath = p;
  }

  const commandStr = project.script || "npm start";
  const resolvedCommand = commandStr
    .replace(/\{\{node\}\}/g, quotePath(nodePath))
    .replace(/\{\{python\}\}/g, quotePath(pythonPath));
  const resolvedScript = resolveNpmScript(project.path, resolvedCommand);

  logger.info(
    `Starting project ${id}: ${resolvedCommand} (resolved: ${resolvedScript}) in ${project.path}`
  );

  // Safety: check if there's an existing process tree for this project already
  if (runningRuntimes[id]) {
    return { success: false, message: "Project is already running/active." };
  }

  const existingPids = await getProjectPids(project.pid, process.platform);
  if (existingPids.length > 0) {
    logger.warn(`Project ${id} has orphans. Attempting cleanup before start.`);
    // If it's Windows, we can use the Job to kill everything fast
    if (process.platform === "win32") {
      const jobName = `Global\\SelfHostHelper_Project_${project.uuid}`;
      const job = createJob(jobName);
      if (job) {
        job.terminate();
        job.close();
      }
    } else {
      await killProjectGroup({ pid: project.pid }, process.platform);
    }
    // Wait a bit for OS to cleanup
    await new Promise((r) => setTimeout(r, 500));
  }

  // Clear logs if enabled (globally or per-project)
  const globalClearLogs = await settingsService.get("clearLogsBeforeStart");
  if (globalClearLogs || project.clearLogsBeforeStart) {
    logger.info(`[ProjectsManager] Clearing logs for project ${id} before start.`);
    clearProjectLogs(id);
  }

  const pathDirs = [];
  if (project.nodeVersionId) {
    const nodeDir = getRuntimeDir("node", project.nodeVersionId);
    if (nodeDir) pathDirs.push(nodeDir);
  }
  if (project.pythonVersionId) {
    const pythonDir = getRuntimeDir("python", project.pythonVersionId);
    if (pythonDir) pathDirs.push(pythonDir);
  }
  const baseEnv = {
    ...process.env,
    ...project.env,
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
    FORCE_COLOR: "1",
    NPM_CONFIG_COLOR: "always",
  };
  if (pathDirs.length > 0) {
    baseEnv.PATH = pathDirs.join(path.delimiter) + path.delimiter + (baseEnv.PATH || process.env.PATH || "");
  }

  try {
    const child = spawn(resolvedCommand, {
      cwd: project.path,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: baseEnv,
      detached: process.platform !== "win32",
    });

    const startTime = new Date();
    runningRuntimes[id] = {
      child,
      startTime,
      platform: process.platform,
      supervisorType: detectSupervisor(resolvedScript),
    };

    // Windows-only: Assign to Named Job Object
    if (process.platform === "win32") {
      const jobName = `Global\\SelfHostHelper_Project_${project.uuid}`;
      const projectJob = createJob(jobName);
      if (projectJob) {
        projectJob.assignProcess(child.pid);
        runningRuntimes[id].job = projectJob;
      }
      assignPid(child.pid);
    }

    await updateProject({ id: project.id, pid: child.pid });

    sendStatus(id, "running", { startTime });

    // Start native stats stream (Windows Job Object push monitor)
    if (process.platform === "win32" && runningRuntimes[id]?.job) {
      startStatsStream(id, runningRuntimes[id].job, startTime, child.pid);
    }

    child.stdout.on("data", (data) => {
      const text = data.toString();
      if (runningRuntimes[id] && !runningRuntimes[id].supervisorType) {
        runningRuntimes[id].supervisorType = detectSupervisorFromOutput(text);
      }
      sendLog(id, data, "stdout");
    });
    child.stderr.on("data", (data) => sendLog(id, data, "stderr"));

    child.on("close", async (code) => {
      logger.info(`Project ${id} shell exited with code ${code}`);
      const runtime = runningRuntimes[id];
      if (!runtime) return;

      // Reliability: Check if any processes remain
      let pidsCount = 0;
      if (runtime.platform === "win32" && runtime.job) {
        try {
          const stats = runtime.job.getStats();
          pidsCount = stats.activeProcesses;
        } catch (err) {
          logger.error(`Failed to get job stats during close for ${id}:`, err);
        }
      } else {
        const pids = await getProjectPids(child.pid, process.platform);
        pidsCount = pids.length;
      }

      logger.debug(`Project ${id} shell closed. Surviving PIDs: ${pidsCount}`);

      if (pidsCount === 0) {
        logger.info(`Project ${id} has no leaves left. Marking as STOPPED (Exit code: ${code}).`);
        await cleanupProjectRuntime(id);
      } else {
        logger.info(
          `Project ${id} shell closed but processes remain. System will continue monitoring.`
        );
      }
    });

    child.on("error", (err) => {
      logger.error(`Failed to start project ${id}:`, err);
      sendLog(id, `Failed to start: ${err.message}`, "error");
      delete runningRuntimes[id];
      sendStatus(id, "error");
    });

    // Auto-start Tunnel if configured
    if (project.autoStartTunnel) {
      logger.info(`[ProjectsManager] Auto-starting tunnel for project: ${project.name}`);
      startTunnel(project.id, {
        mode: project.tunnelMode || "quick",
        port: project.tunnelPort || 3000,
        token: project.encryptedTunnelToken || null,
        config: project.tunnelConfig || {},
      })
        .then((result) => {
          if (result && result.success === false) {
            logger.error(
              `[ProjectsManager] Failed to auto-start tunnel for ${project.name}: ${result.message}`
            );
          }
        })
        .catch((err) => {
          logger.error(`[ProjectsManager] Failed to auto-start tunnel for ${project.name}:`, err);
        });
    }

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
};

function resolveNpmScript(projectPath, command) {
  const match = command.match(/^(npm|yarn|pnpm)\s+(run\s+)?([^\s]+)/);
  if (!match) return command;

  const scriptName = match[3];
  try {
    const pkgPath = path.join(projectPath, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.scripts && pkg.scripts[scriptName]) {
        return pkg.scripts[scriptName];
      }
    }
  } catch (_e) {
    // Ignore and return original command
  }
  return command;
}

function detectSupervisor(command) {
  if (!command) return null;
  const c = command.toLowerCase();
  if (c.includes("nodemon")) return "nodemon";
  if (c.includes("vite")) return "vite";
  if (c.includes("pm2")) return "pm2";
  if (c.includes("uvicorn")) return "uvicorn";
  if (c.includes("gunicorn")) return "gunicorn";
  return null;
}

function detectSupervisorFromOutput(output) {
  if (output.includes("[nodemon]")) return "nodemon";
  if (output.includes("VITE v")) return "vite";
  return null;
}

//============================{Stops a Project}=============================
export const stopProject = async (id) => {
  const runtime = runningRuntimes[id];
  if (!runtime) return { success: false, message: "Not running" };

  // Stop the native stats stream before closing the job handle
  stopStatsStream(id);

  const code = await killProjectGroup(runtime.child, runtime.platform);

  if (runtime.job) {
    try {
      runtime.job.close();
    } catch (err) {
      logger.error(`Failed to close job for project ${id}:`, err);
    }
  }

  delete runningRuntimes[id];

  try {
    await updateProject({ id, pid: null });
  } catch (_err) {}

  sendLog(id, chalk.red(`Project ${id} terminated with exit code ${code}\n`), "stdout");
  sendStatus(id, "stopped");

  return { success: true, code };
};

//============================{Restarts a Project}=============================
export const restartProject = async (id) => {
  await stopProject(id);
  return new Promise((resolve) => {
    setTimeout(async () => {
      const res = await startProject(id);
      resolve(res);
    }, 1000);
  });
};

export const startAllProjects = async () => {
  try {
    const projects = await getProjects();
    logger.info(`Starting all ${projects.length} projects...`);
    const promises = projects.map((project) => {
      if (!runningRuntimes[project.id]) {
        return startProject(project.id);
      }
      return Promise.resolve({ success: true, message: "Already running" });
    });
    await Promise.all(promises);
  } catch (error) {
    logger.error("Failed to start all projects:", error);
  }
};

//============================{Stops All Projects at Once}=============================
export const stopAllProjects = async () => {
  const ids = Object.keys(runningRuntimes);
  logger.info(`Stopping all ${ids.length} running projects...`);
  stopAllStatsStreams();
  const promises = ids.map((id) => stopProject(id));
  await Promise.all(promises);
};

//============================{Get Project Stats}=============================

export const getProjectStats = async (id) => {
  const runtime = runningRuntimes[id];
  if (!runtime) return null;

  try {
    // Primary path: return the last sample from the native push-based monitor
    const cached = getLastStats(id);
    if (cached) {
      return {
        ...cached,
        startTime: runtime.startTime,
        supervisorType: runtime.supervisorType,
      };
    }

    // On Windows, if the monitor hasn't emitted yet, do a one-off synchronous read
    if (runtime.platform === "win32" && runtime.job) {
      const stats = runtime.job.getStats();
      const now = Date.now();

      return {
        id,
        startTime: runtime.startTime,
        uptime: now - runtime.startTime.getTime(),
        cpu: 0,
        memory: stats.memory,
        pids: Array.isArray(stats.pids) ? stats.pids : [],
        processCount: Array.isArray(stats.pids) ? stats.pids.length : 0,
        activeProcesses: stats.activeProcesses,
        mainPid: runtime.child?.pid ?? null,
        timestamp: now,
        supervisorType: runtime.supervisorType,
      };
    }

    // Fallback for Unix or if Job is not available
    const procInfo = await getProjectProcessInfo(runtime.child.pid, runtime.platform);

    if (procInfo.length === 0) {
      return {
        id,
        startTime: runtime.startTime,
        uptime: Date.now() - runtime.startTime.getTime(),
        cpu: 0,
        memory: 0,
        timestamp: Date.now(),
        pidsCount: 0,
        supervisorType: runtime.supervisorType,
      };
    }

    // Dynamic Supervisor Check (keep existing logic)
    if (!runtime.supervisorType) {
      for (const info of procInfo) {
        const detected = detectSupervisor(info.commandLine);
        if (detected) {
          runtime.supervisorType = detected;
          break;
        }
      }
    }

    const pids = procInfo.map((i) => i.pid);
    let totalCpu = 0;
    let totalMemory = 0;

    try {
      const usages = await pidusage(pids);
      for (const pid of pids) {
        if (usages[pid]) {
          totalCpu += usages[pid].cpu;
          totalMemory += usages[pid].memory;
        }
      }
    } catch (err) {
      logger.warn(`[projectsManager] pidusage failed for project ${id}`);
    }

    return {
      id,
      startTime: runtime.startTime,
      uptime: Date.now() - runtime.startTime.getTime(),
      cpu: totalCpu,
      memory: totalMemory,
      timestamp: Date.now(),
      pidsCount: procInfo.length,
      supervisorType: runtime.supervisorType,
    };
  } catch (err) {
    logger.error(`Failed to get stats for project ${id}:`, err);
    return null;
  }
};

//============================{Start Auto-Start Projects}=============================
export const startAutoStartProjects = async () => {
  try {
    const projects = await getProjects();
    const autoStartProjects = projects.filter((p) => p.autoStart);

    if (autoStartProjects.length > 0) {
      logger.info(`[ProjectsManager] Found ${autoStartProjects.length} auto-start projects.`);
      for (const project of autoStartProjects) {
        // Check if already running (redundant if app just started, but good practice)
        if (!runningRuntimes[project.id]) {
          logger.info(`[ProjectsManager] Auto-starting project: ${project.name}`);
          await startProject(project.id).catch((err) =>
            logger.error(`Auto-start failed for ${project.name}:`, err)
          );
        }
      }
    }
  } catch (error) {
    logger.error("Failed to auto-start projects:", error);
  }
};

//============================{Relaunch projects after app update}=============================
export const relaunchProjectsAfterUpdate = async () => {
  try {
    const ids = await settingsService.get("projectsToRelaunchAfterUpdate");
    if (!Array.isArray(ids) || ids.length === 0) return;

    logger.info(`[ProjectsManager] Relaunching ${ids.length} projects after update.`);
    for (const id of ids) {
      if (!runningRuntimes[id]) {
        await startProject(id).catch((err) =>
          logger.error(`Relaunch after update failed for project ${id}:`, err)
        );
      }
    }
    await settingsService.set("projectsToRelaunchAfterUpdate", []);
  } catch (error) {
    logger.error("Failed to relaunch projects after update:", error);
  }
};

//============================{Background Health Monitoring}=============================

const cleanupProjectRuntime = async (id) => {
  stopStatsStream(id);
  const runtime = runningRuntimes[id];
  if (runtime && runtime.job) {
    try {
      runtime.job.close();
    } catch (err) {
      logger.error(`Failed to close job for project ${id} during cleanup:`, err);
    }
  }
  delete runningRuntimes[id];
  try {
    await updateProject({ id, pid: null });
  } catch (err) {
    logger.error(`Failed to clear PID from DB for project ${id}:`, err);
  }
  sendStatus(id, "stopped");
};

/**
 * Periodically checks all 'running' projects to see if they are actually alive.
 * This handles cases where the root shell died but children remained,
 * and then those children eventually died.
 */
const startStatusPoller = () => {
  setInterval(async () => {
    const runningIds = Object.keys(runningRuntimes);
    for (const id of runningIds) {
      const runtime = runningRuntimes[id];
      if (!runtime) continue;

      try {
        let hasActiveProcesses = false;
        if (runtime.platform === "win32" && runtime.job) {
          const stats = runtime.job.getStats();
          hasActiveProcesses = stats.activeProcesses > 0;
        } else {
          const pids = await getProjectPids(runtime.child.pid, runtime.platform);
          hasActiveProcesses = pids.length > 0;
        }

        if (!hasActiveProcesses) {
          logger.info(`Health Poller: Project ${id} has no active processes. Cleaning up.`);
          await cleanupProjectRuntime(id);
        }
      } catch (err) {
        logger.error(`Health Poller error for project ${id}:`, err);
      }
    }
  }, 5000); // Check every 5 seconds
};

// Start the poller immediately
startStatusPoller();
