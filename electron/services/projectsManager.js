import { spawn, exec } from "child_process";
import { Project } from "../../database/models/Project.js";
import pidusage from "pidusage";

const runningProcesses = {};
const projectStats = {}; // { [id]: { startTime: Date } }
const logHistory = {};

//============================{Sends Logs to the Front-end}=============================
const sendLog = (projectId, data, type = "stdout") => {
  const logEntry = {
    projectId,
    data: data.toString(),
    type,
    timestamp: new Date(),
  };

  if (!logHistory[projectId]) logHistory[projectId] = [];
  logHistory[projectId].push(logEntry);
  if (logHistory[projectId].length > 1000) logHistory[projectId].shift(); // Keep last 1000 log line

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
};

export const checkZombieProcesses = async () => {
  const projects = await Project.findAll({
    where: {
      pid: { [import("sequelize").Op.ne]: null },
    },
  });

  for (const project of projects) {
    if (project.pid) {
      try {
        process.kill(project.pid, 0);
        console.warn(
          `Zombie process found for project ${project.name} (PID: ${project.pid})`
        );

        setTimeout(() => {
          sendStatus(project.id, "zombie", {
            message: "Improper Shutdown Detected",
            pid: project.pid,
          });
        }, 2000); // Small delay to ensure UI is ready
      } catch (e) {
        console.log(`Cleaning up stale PID for project ${project.name}`);
        project.pid = null;
        await project.save();
      }
    }
  }
};

export const getRunningProjects = () =>
  Object.keys(runningProcesses).map(Number);
export const getProjectLogs = (id) => logHistory[id] || [];
export const getProjectStartTime = (id) =>
  projectStats[id] ? projectStats[id].startTime : null;

//============================{Writes Commands to the Projects Processes}=============================
export const writeToProcess = (id, data) => {
  const child = runningProcesses[id];

  // Extra protection: Check if process actually exists and is not killed
  if (!child || child.killed) {
    sendLog(id, `Failed to send input: process not running\n`, "stderr");
    return false;
  }

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

  if (runningProcesses[id]) {
    return { success: false, message: "Already running" };
  }

  // Use the full script string to support complex shell commands and arguments.
  // Using `shell: true` with the full command string avoids naive space-splitting
  // which breaks quoted arguments or compound commands.
  const commandStr = project.script || "npm start";

  console.log(`Starting project ${id}: ${commandStr} in ${project.path}`);

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
      detached: false,
    });

    runningProcesses[id] = child;
    projectStats[id] = { startTime: new Date() };

    project.pid = child.pid;
    await project.save();

    // Send initial status with start time
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      try {
        global.mainWindow.webContents.send("project:status", {
          projectId: id,
          status: "running",
          startTime: projectStats[id].startTime,
        });
      } catch (error) {
        // Window might be destroyed during shutdown
      }
    }

    child.stdout.on("data", (data) => sendLog(id, data, "stdout"));
    child.stderr.on("data", (data) => sendLog(id, data, "stderr"));

    child.on("close", async (code) => {
      console.log(`Project ${id} exited with code ${code}`);
      delete runningProcesses[id];
      delete projectStats[id];

      try {
        await Project.update({ pid: null }, { where: { id } });
      } catch (err) {
        console.error("Failed to clear PID from DB", err);
      }

      sendStatus(id, "stopped");
    });

    child.on("error", (err) => {
      console.error(`Failed to start project ${id}`, err);
      sendLog(id, `Failed to start: ${err.message}`, "error");
      delete runningProcesses[id];
      sendStatus(id, "error");
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
};

//============================{Stops a Project}=============================
export const stopProject = async (id) => {
  const child = runningProcesses[id];
  if (!child) return { success: false, message: "Not running" };

  const kill = (pid) => {
    return new Promise((resolve) => {
      if (process.platform === "win32") {
        exec(`taskkill /pid ${pid} /f /t`, (err) => {
          resolve();
        });
      } else {
        child.kill();
        resolve();
      }
    });
  };

  await kill(child.pid);
  return { success: true };
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

//============================{Stops All Projects at Once}=============================
export const stopAllProjects = async () => {
  const ids = Object.keys(runningProcesses);
  console.log(`Stopping all ${ids.length} running projects...`);
  const promises = ids.map((id) => stopProject(id));
  await Promise.all(promises);
};

//============================{Get Project Stats}=============================

export const getProjectStats = async (id) => {
  const child = runningProcesses[id];
  const stats = projectStats[id];

  if (!child || !stats) return null;

  try {
    const usage = await pidusage(child.pid);

    return {
      id,
      startTime: stats.startTime,
      uptime: Date.now() - stats.startTime.getTime(),
      cpu: usage.cpu, //
      memory: usage.memory,
      timestamp: Date.now(),
    };
  } catch (err) {
    console.error(`Failed to get stats for project ${id}:`, err);
    return {
      id,
      startTime: stats.startTime,
      uptime: Date.now() - stats.startTime.getTime(),
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
        if (!runningProcesses[project.id]) {
          await startProject(project.id);
        }
      }
    }
  } catch (error) {
    console.error("Failed to auto-start projects:", error);
  }
};
