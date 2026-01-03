import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Get all processes on Windows using PowerShell for reliability.
 * Returns an array of { pid, parentPid, commandLine }
 */
async function getAllWindowsProcesses() {
  try {
    const cmd = `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, CommandLine | ConvertTo-Json -Compress"`;
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    if (!stdout.trim()) return [];

    // ConvertTo-Json might return a single object or an array
    const data = JSON.parse(stdout);
    const rawList = Array.isArray(data) ? data : [data];

    return rawList.map((p) => ({
      pid: p.ProcessId,
      parentPid: p.ParentProcessId,
      commandLine: p.CommandLine || "",
    }));
  } catch (_err) {
    console.error(`[processTree] Failed to get Windows processes:`, _err);
    return [];
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
      const { stdout } = await execAsync(
        `ps -o pid=,args= -p ${pids.join(",")}`
      );
      return stdout
        .split("\n")
        .filter((l) => l.trim())
        .map((line) => {
          const match = line.trim().match(/^(\d+)\s+(.+)$/);
          return match
            ? { pid: parseInt(match[1], 10), commandLine: match[2] }
            : null;
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
      // Force kill the entire tree immediately
      exec(`taskkill /pid ${child.pid} /f /t`, () => {
        clearTimeout(timer);
        done(0);
      });
    } else {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        // Ignore
      }
      clearTimeout(timer);
      done(0);
    }
  });
}
