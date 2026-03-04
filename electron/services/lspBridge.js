import { spawn } from "child_process";
import { createServer } from "net";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const projectServers = new Map(); // projectPath -> { wss, lspProcess, port }

function findFreePort() {
  return new Promise((resolve) => {
    const server = createServer(() => {});
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

/**
 * Start TypeScript language server for a project and expose it via WebSocket.
 * Returns { url } or throws.
 */
export async function startLspForProject(projectPath) {
  if (!projectPath || typeof projectPath !== "string" || !projectPath.trim()) {
    throw new Error("Project path is required");
  }
  const normalizedPath = projectPath.trim();
  if (projectServers.has(normalizedPath)) {
    const existing = projectServers.get(normalizedPath);
    return { url: `ws://127.0.0.1:${existing.port}` };
  }

  const port = await findFreePort();
  const wss = new WebSocketServer({ port, host: "127.0.0.1" });

  const tsServerPath = path.join(
    path.dirname(__dirname),
    "..",
    "node_modules",
    "typescript-language-server",
    "lib",
    "cli.mjs"
  );
  const fs = await import("fs/promises");
  let cliPath = tsServerPath;
  try {
    await fs.access(tsServerPath);
  } catch {
    cliPath = null;
  }

  if (!cliPath) {
    wss.close();
    throw new Error("TypeScript language server not found. Install typescript-language-server.");
  }

  const lspProcess = spawn(process.execPath, [cliPath, "--stdio"], {
    cwd: normalizedPath,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
    windowsHide: true,
  });

  let currentSocket = null;

  wss.on("connection", (ws) => {
    if (currentSocket) {
      try {
        currentSocket.close();
      } catch {}
    }
    currentSocket = ws;
    ws.on("message", (data) => {
      if (lspProcess.stdin?.writable) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        lspProcess.stdin.write(buf);
      }
    });
    ws.on("close", () => {
      currentSocket = null;
    });
  });

  lspProcess.stdout.on("data", (data) => {
    if (currentSocket?.readyState === 1) {
      currentSocket.send(data);
    }
  });

  lspProcess.stderr.on("data", () => {
    // Log LSP stderr for debugging if needed
  });

  lspProcess.on("exit", (code) => {
    if (currentSocket?.readyState === 1) {
      try {
        currentSocket.close();
      } catch {}
    }
    wss.close();
    projectServers.delete(normalizedPath);
  });

  projectServers.set(normalizedPath, { wss, lspProcess, port });
  return { url: `ws://127.0.0.1:${port}` };
}

export async function stopLspForProject(projectPath) {
  if (!projectPath || typeof projectPath !== "string") return;
  const normalizedPath = projectPath.trim();
  const entry = projectServers.get(normalizedPath);
  if (!entry) return;
  try {
    entry.lspProcess?.kill();
  } catch {}
  try {
    entry.wss?.close();
  } catch {}
  projectServers.delete(normalizedPath);
}
