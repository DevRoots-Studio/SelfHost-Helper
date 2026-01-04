import { spawn } from "child_process";
import { Project } from "../../database/models/Project.js";
import { Op } from "sequelize";
import pidusage from "pidusage";
import chalk from "chalk";
import {
  getProjectPids,
  killProjectGroup,
  getProjectProcessInfo,
} from "./processTree.js";
import path from "path";
import fs from "fs";
import { assignPid } from "../job/index.js";

const runningRuntimes = {};
const logHistory = {};
const statusListeners = new Set();
const listListeners = new Set();

export const onStatusChange = (callback) => {
  statusListeners.add(callback);
  return () => statusListeners.delete(callback);
};

export const onProjectListChange = (callback) => {
  listListeners.add(callback);
  return () => listListeners.delete(callback);
};

export const notifyProjectListChanged = () => {
  listListeners.forEach((cb) => cb());
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    global.mainWindow.webContents.send("projects:list-changed");
  }
};

export const clearProjectLogs = (id) => {
  delete logHistory[id];
};

//============================{Sends Logs to the Front-end}=============================
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
    logHistory[projectId].shift(); // Keep last 1000 log line
  }

  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    try {
      global.mainWindow.webContents.send("project:log", logEntry);
    } catch (error) {
      // Window might be destroyed during shutdown, ignore silently
    }
  }
};

//============================{Sends Projects Power Status }=============================
const sendStatus = (projectId, status, extraData = {}) => {
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    try {
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
  const projects = await Project.findAll({
    where: {
      pid: { [Op.ne]: null },
    },
  });

  for (const project of projects) {
    if (project.pid) {
      const isAlive = await isProcessGroupAlive(project.pid, process.platform);
      if (isAlive) {
        console.warn(
          `Zombie process group found for project ${project.name} (PID: ${project.pid})`
        );

        setTimeout(() => {
          sendStatus(project.id, "zombie", {
            message: "Improper Shutdown Detected",
            pid: project.pid,
          });
        }, 2000);
      } else {
        console.log(`Cleaning up stale PID for project ${project.name}`);
        project.pid = null;
        await project.save();
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

export const getRunningProjects = () =>
  Object.keys(runningRuntimes).map(Number);
export const getProjectLogs = (id) => logHistory[id] || [];
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
      child.stdin.write(toWrite);
      sendLog(id, `> ${toWrite}`, "stdin");
      return true;
    } catch (err) {
      sendLog(
        id,
        `Failed to write to process stdin: ${err.message}\n`,
        "stderr"
      );
      return false;
    }
  }

  sendLog(id, `Failed to send input: process stdin not available\n`, "stderr");
  return false;
};

//============================{Starts a Project}=============================
export const startProject = async (id) => {
  const project = await Project.findByPk(id);
  if (!project) throw new Error("Project not found");

  if (runningRuntimes[id]) {
    return { success: false, message: "Already running" };
  }

  const commandStr = project.script || "npm start";
  const resolvedScript = resolveNpmScript(project.path, commandStr);

  console.log(
    `Starting project ${id}: ${commandStr} (resolved: ${resolvedScript}) in ${project.path}`
  );

  try {
    const child = spawn(commandStr, {
      cwd: project.path,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        ...project.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
        FORCE_COLOR: "1",
        NPM_CONFIG_COLOR: "always",
      },
      detached: process.platform !== "win32",
    });

    // Windows-only: Assign to Job Object to ensure cleanup on exit/crash
    if (process.platform === "win32") {
      assignPid(child.pid);
    }

    const startTime = new Date();
    runningRuntimes[id] = {
      child,
      startTime,
      platform: process.platform,
      supervisorType: detectSupervisor(resolvedScript),
    };

    project.pid = child.pid;
    await project.save();

    project.pid = child.pid;
    await project.save();

    sendStatus(id, "running", { startTime });

    child.stdout.on("data", (data) => {
      const text = data.toString();
      if (runningRuntimes[id] && !runningRuntimes[id].supervisorType) {
        runningRuntimes[id].supervisorType = detectSupervisorFromOutput(text);
      }
      sendLog(id, data, "stdout");
    });
    child.stderr.on("data", (data) => sendLog(id, data, "stderr"));

    child.on("close", async (code) => {
      console.log(`Project ${id} shell exited with code ${code}\n`);
      const runtime = runningRuntimes[id];

      // If no supervisor, or if the whole group is gone, mark as stopped
      const pids = await getProjectPids(child.pid, process.platform);
      if (pids.length === 0 || !runtime.supervisorType) {
        delete runningRuntimes[id];
        try {
          await Project.update({ pid: null }, { where: { id } });
        } catch (err) {
          console.error("Failed to clear PID from DB", err);
        }
        sendStatus(id, "stopped");
      } else {
        console.log(
          `Supervisor detected for project ${id}, keeping status as running even if shell closed.`
        );
      }
    });

    child.on("error", (err) => {
      console.error(`Failed to start project ${id}`, err);
      sendLog(id, `Failed to start: ${err.message}`, "error");
      delete runningRuntimes[id];
      sendStatus(id, "error");
    });

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

  const code = await killProjectGroup(runtime.child, runtime.platform);
  delete runningRuntimes[id];

  try {
    await Project.update({ pid: null }, { where: { id } });
  } catch (_err) {}

  sendLog(
    id,
    chalk.red(`Project ${id} terminated with exit code ${code}\n`),
    "stdout"
  );
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
    const projects = await Project.findAll();
    console.log(`Starting all ${projects.length} projects...`);
    const promises = projects.map((project) => {
      if (!runningRuntimes[project.id]) {
        return startProject(project.id);
      }
      return Promise.resolve({ success: true, message: "Already running" });
    });
    await Promise.all(promises);
  } catch (error) {
    console.error("Failed to start all projects:", error);
  }
};

//============================{Stops All Projects at Once}=============================
export const stopAllProjects = async () => {
  const ids = Object.keys(runningRuntimes);
  console.log(`Stopping all ${ids.length} running projects...`);
  const promises = ids.map((id) => stopProject(id));
  await Promise.all(promises);
};

//============================{Get Project Stats}=============================

export const getProjectStats = async (id) => {
  const runtime = runningRuntimes[id];
  if (!runtime) return null;

  try {
    const procInfo = await getProjectProcessInfo(
      runtime.child.pid,
      runtime.platform
    );

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

    // Dynamic Supervisor Check: if not already detected, look at command lines of children
    if (!runtime.supervisorType) {
      for (const info of procInfo) {
        const detected = detectSupervisor(info.commandLine);
        if (detected) {
          runtime.supervisorType = detected;
          console.log(
            `Dynamically detected supervisor ${detected} for project ${id} from process tree.`
          );
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
      console.warn(
        `[projectsManager] pidusage failed for some PIDs of project ${id}:`,
        err.message
      );
    }

    const result = {
      id,
      startTime: runtime.startTime,
      uptime: Date.now() - runtime.startTime.getTime(),
      cpu: totalCpu,
      memory: totalMemory,
      timestamp: Date.now(),
      pidsCount: procInfo.length,
      supervisorType: runtime.supervisorType,
    };

    return result;
  } catch (err) {
    console.error(`Failed to get stats for project ${id}:`, err);
    return {
      id,
      startTime: runtime.startTime,
      uptime: Date.now() - runtime.startTime.getTime(),
      cpu: 0,
      memory: 0,
    };
  }
};

//============================{Start Auto-Start Projects}=============================
export const startAutoStartProjects = async () => {
  try {
    const projects = await Project.findAll({ where: { autoStart: true } });
    if (projects.length > 0) {
      console.log(`Found ${projects.length} projects to auto-start.`);
      // Start sequentially to avoid resource spikes, or use Promise.all for speed
      for (const project of projects) {
        // Check if already running (redundant if app just started, but good practice)
        if (!runningRuntimes[project.id]) {
          await startProject(project.id);
        }
      }
    }
  } catch (error) {
    console.error("Failed to auto-start projects:", error);
  }
};
