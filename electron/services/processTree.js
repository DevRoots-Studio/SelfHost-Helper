import { exec } from "child_process";
import { promisify } from "util";
import logger from "./logger.js";

const execAsync = promisify(exec);

/**
 * Get all processes on Windows using PowerShell for reliability.
 * Returns an array of { pid, parentPid, commandLine }
 */
async function getAllWindowsProcesses() {
  try {
    // WMIC is significantly faster than PowerShell for listing processes
    // format:csv includes a header line and uses commas.
    const cmd = `wmic process get processid,parentprocessid,commandline /format:csv`;
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    if (!stdout.trim()) return [];

    const lines = stdout.trim().split("\n");
    const processes = [];

    // Skip header line (Node,CommandLine,ParentProcessId,ProcessId)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // CSV format: Node, CommandLine, ParentProcessId, ProcessId
      // We need to be careful with commas in command lines
      const parts = line.split(",");
      if (parts.length < 4) continue;

      const pid = parseInt(parts[parts.length - 1], 10);
      const ppid = parseInt(parts[parts.length - 2], 10);
      // Command line is everything between the first comma and the second-to-last comma
      const commandLine = parts.slice(1, parts.length - 2).join(",");

      if (!isNaN(pid) && !isNaN(ppid)) {
        processes.push({
          pid: pid,
          parentPid: ppid,
          commandLine: commandLine.replace(/^"|"$/g, ""),
        });
      }
    }

    logger.debug(`[processTree] Found ${processes.length} total system processes using WMIC.`);

    return processes;
  } catch (_err) {
    try {
      logger.info("[processTree] WMIC failed or missing, falling back to PowerShell...");
      const cmd = `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, CommandLine | ConvertTo-Json -Compress"`;
      const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
      if (!stdout.trim()) return [];

      const data = JSON.parse(stdout);
      const rawList = Array.isArray(data) ? data : [data];
      return rawList.map((p) => ({
        pid: p.ProcessId,
        parentPid: p.ParentProcessId,
        commandLine: p.CommandLine || "",
      }));
    } catch (innerErr) {
      logger.error(`[processTree] All process scanners failed:`, innerErr);
      return [];
    }
  }
}

/**
 * Get all PIDs belonging to a "project" tree on Windows.
 */
function buildTree(allProcs, rootPid) {
  const pids = [rootPid];
  const processMap = {};

  // Build a map of parent -> children
  for (const proc of allProcs) {
    if (!processMap[proc.parentPid]) processMap[proc.parentPid] = [];
    processMap[proc.parentPid].push(proc);
  }

  // Recursive lookup
  const queue = [rootPid];
  const tree = [];
  const visited = new Set();

  while (queue.length > 0) {
    const pid = queue.shift();
    if (visited.has(pid)) continue;
    visited.add(pid);

    const proc = allProcs.find((p) => p.pid === pid);
    if (proc) tree.push(proc);

    const children = processMap[pid] || [];
    for (const child of children) {
      queue.push(child.pid);
    }
  }

  logger.debug(`[processTree] Built tree for root PID ${rootPid}. Tree size: ${tree.length}`);
  return tree;
}

/**
 * Get all PIDs in a process group on Unix.
 */
async function getUnixGroupPids(pgid) {
  try {
    const { stdout } = await execAsync(`ps -o pid= -g ${pgid}`);
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line)
      .map((line) => parseInt(line, 10));
  } catch (_err) {
    logger.error(`[processTree] Error fetching Unix group PIDs for PGID ${pgid}:`, _err);
    return [];
  }
}

/**
 * Get accurate PIDs for a project.
 */
export async function getProjectPids(rootPid, platform) {
  if (platform === "win32") {
    const allProcs = await getAllWindowsProcesses();
    const tree = buildTree(allProcs, rootPid);
    const pids = tree.map((p) => p.pid);
    return pids;
  } else {
    // On Unix, rootPid double as pgid if detached: true
    const pids = await getUnixGroupPids(rootPid);
    return pids;
  }
}

/**
 * Get detailed info (PID + Command Line) for all processes in the tree.
 */
export async function getProjectProcessInfo(rootPid, platform) {
  if (platform === "win32") {
    const allProcs = await getAllWindowsProcesses();
    const tree = buildTree(allProcs, rootPid);
    return tree.map((p) => ({
      pid: p.pid,
      commandLine: p.commandLine,
    }));
  } else {
    const pids = await getUnixGroupPids(rootPid);
    if (pids.length === 0) return [];
    try {
      const { stdout } = await execAsync(`ps -o pid=,args= -p ${pids.join(",")}`);
      return stdout
        .split("\n")
        .filter((l) => l.trim())
        .map((line) => {
          const match = line.trim().match(/^(\d+)\s+(.+)$/);
          return match ? { pid: parseInt(match[1], 10), commandLine: match[2] } : null;
        })
        .filter((x) => x);
    } catch (_err) {
      return [];
    }
  }
}

/**
 * Robustly kill a project group.
 */

export async function killProjectGroup(child, platform, timeout = 5000) {
  return new Promise((resolve) => {
    let finished = false;

    const done = (code) => {
      if (finished) return;
      finished = true;
      resolve(code);
    };

    const timer = setTimeout(() => {
      done(1);
    }, timeout);

    child.once("close", () => {
      clearTimeout(timer);
      done(0);
    });

    if (platform === "win32") {
      logger.info(`[processTree] Executing taskkill for PID ${child.pid} (tree=true)`);
      exec(`taskkill /pid ${child.pid} /f /t`, (err) => {
        if (err) logger.warn(`[processTree] taskkill warning for PID ${child.pid}:`, err.message);
        clearTimeout(timer);
        done(0);
      });
    } else {
      try {
        logger.info(`[processTree] Sending SIGKILL to process group ${-child.pid}`);
        process.kill(-child.pid, "SIGKILL");
      } catch (err) {
        logger.warn(`[processTree] SIGKILL failed for group ${-child.pid}:`, err.message);
      }
      clearTimeout(timer);
      done(0);
    }
  });
}
