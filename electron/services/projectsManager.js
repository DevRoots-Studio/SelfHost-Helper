import { spawn, exec } from "child_process";
import { Project } from "../../database/models/Project.js";
import path from "path";

const runningProcesses = {};
const logHistory = {};

const sendLog = (projectId, data, type = "stdout") => {
  const logEntry = {
    projectId,
    data: data.toString(),
    type,
    timestamp: new Date(),
  };

  // Update history
  if (!logHistory[projectId]) logHistory[projectId] = [];
  logHistory[projectId].push(logEntry);
  if (logHistory[projectId].length > 1000) logHistory[projectId].shift(); // Keep last 1000

  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    try {
      global.mainWindow.webContents.send("project:log", logEntry);
    } catch (error) {
      // Window might be destroyed during shutdown, ignore silently
    }
  }
};

const sendStatus = (projectId, status) => {
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    try {
      global.mainWindow.webContents.send("project:status", { projectId, status });
    } catch (error) {
      // Window might be destroyed during shutdown, ignore silently
    }
  }
};

export const getRunningProjects = () =>
  Object.keys(runningProcesses).map(Number);
export const getProjectLogs = (id) => logHistory[id] || [];

export const writeToProcess = (id, data) => {
  const child = runningProcesses[id];
  if (child && child.stdin) {
    child.stdin.write(data + "\n");
    // Echo input to logs for visibility?
    sendLog(id, `> ${data}\n`, "stdin");
    return true;
  }
  return false;
};

export const startProject = async (id) => {
  const project = await Project.findByPk(id);
  if (!project) throw new Error("Project not found");

  if (runningProcesses[id]) {
    return { success: false, message: "Already running" };
  }

  // Parse command "npm start" -> cmd: "npm", args: ["start"]
  const [cmd, ...args] = project.script.split(" ");

  // Windows compatibility for npm
  const command =
    process.platform === "win32" && cmd === "npm" ? "npm.cmd" : cmd;

  console.log(
    `Starting project ${id}: ${command} ${args.join(" ")} in ${project.path}`
  );

  try {
    const child = spawn(command, args, {
      cwd: project.path,
      env: { ...process.env, ...project.env }, // user envs
      shell: true,
      stdio: ["pipe", "pipe", "pipe"], // explicitly pipe for stdin
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
  // Status update happens in 'close' event
  return { success: true };
};

export const restartProject = async (id) => {
  await stopProject(id);
  return new Promise((resolve) => {
    setTimeout(async () => {
      const res = await startProject(id);
      resolve(res);
    }, 1000);
  });
};

export const stopAllProjects = async () => {
  const ids = Object.keys(runningProcesses);
  console.log(`Stopping all ${ids.length} running projects...`);
  const promises = ids.map((id) => stopProject(id));
  await Promise.all(promises);
};
