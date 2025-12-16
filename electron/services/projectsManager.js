import { spawn, exec } from "child_process";
import { Project } from "../../database/models/Project.js";

const runningProcesses = {};
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

const sendStatus = (projectId, status) => {
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    try {
      global.mainWindow.webContents.send("project:status", {
        projectId,
        status,
      });
    } catch (error) {
      // Window might be destroyed during shutdown, ignore silently
    }
  }
};

export const getRunningProjects = () =>
  Object.keys(runningProcesses).map(Number);
export const getProjectLogs = (id) => logHistory[id] || [];

//============================{Writes Commands to the Projects Processes}=============================
export const writeToProcess = (id, data) => {
  const child = runningProcesses[id];
  if (child && child.stdin) {
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

  sendLog(id, `Failed to send input: process not running\n`, "stderr");
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
    });
    

    runningProcesses[id] = child;
    sendStatus(id, "running");

    child.stdout.on("data", (data) => sendLog(id, data, "stdout"));
    child.stderr.on("data", (data) => sendLog(id, data, "stderr"));

    child.on("close", (code) => {
      console.log(`Project ${id} exited with code ${code}`);
      delete runningProcesses[id];
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
