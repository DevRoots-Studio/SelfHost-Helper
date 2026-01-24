/**
 * Cloudflare Tunnel Manager
 * Manages tunnel processes for projects using the cloudflared npm package.
 * Supports Quick Tunnel (no auth) and Authenticated Tunnel (with token).
 */
import { Tunnel, ConfigHandler } from "cloudflared";
import logger from "./logger.js";

// Store running tunnels by project ID
const runningTunnels = {};

// Store tunnel logs per project
const tunnelLogs = {};

/**
 * Send tunnel status update to renderer
 */
const sendTunnelStatus = (projectId, data) => {
  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    try {
      global.mainWindow.webContents.send("tunnel:status", {
        projectId,
        ...data,
      });
    } catch (error) {
      logger.error(
        `Failed to send tunnel status for project ${projectId}:`,
        error,
      );
    }
  }
};

/**
 * Send tunnel log to renderer
 */
const sendTunnelLog = (projectId, message, type = "info") => {
  const logEntry = {
    projectId,
    message,
    type,
    timestamp: new Date().toISOString(),
  };

  // Store in history
  if (!tunnelLogs[projectId]) {
    tunnelLogs[projectId] = [];
  }
  tunnelLogs[projectId].push(logEntry);
  if (tunnelLogs[projectId].length > 100) {
    tunnelLogs[projectId].shift();
  }

  if (global.mainWindow && !global.mainWindow.isDestroyed()) {
    try {
      global.mainWindow.webContents.send("tunnel:log", logEntry);
    } catch (error) {
      // Ignore if window is destroyed
    }
  }
};

/**
 * Sanitizes sensitive information from log messages
 */
const sanitizeLog = (message) => {
  if (!message || typeof message !== "string") return message;

  // Patterns to redact
  const patterns = [
    {
      regex: /Authorization:\s*([^\r\n;]+)/gi,
      replacement: "Authorization: [REDACTED]",
    },
    { regex: /Bearer\s+([^\r\n;]+)/gi, replacement: "Bearer [REDACTED]" },
    { regex: /Cookie:\s*([^\r\n;]+)/gi, replacement: "Cookie: [REDACTED]" },
    {
      regex: /Set-Cookie:\s*([^\r\n;]+)/gi,
      replacement: "Set-Cookie: [REDACTED]",
    },
    {
      regex: /X-Auth-[a-zA-Z-]*:\s*([^\r\n;]+)/gi,
      replacement: "X-Auth-Header: [REDACTED]",
    },
    { regex: /token=[a-zA-Z0-9._-]+/gi, replacement: "token=[REDACTED]" },
    // Rough pattern for JWT or long Base64 strings (>= 40 chars with minimal spacing)
    { regex: /[a-zA-Z0-9_-]{40,}/gi, replacement: "[REDACTED]" },
  ];

  let sanitized = message;
  for (const { regex, replacement } of patterns) {
    sanitized = sanitized.replace(regex, replacement);
  }
  return sanitized;
};

/**
 * Start a tunnel for a project
 * @param {number} projectId - Project ID
 * @param {Object} options - Tunnel options
 * @param {string} options.mode - "quick" or "authenticated"
 * @param {number} options.port - Local port to tunnel
 * @param {string} options.token - Cloudflare tunnel token (for authenticated mode)
 * @param {Object} options.config - Advanced config (protocol, loglevel, etc.)
 */
export const startTunnel = async (
  projectId,
  { mode, port, token, config = {} },
) => {
  // Check if tunnel already running
  if (runningTunnels[projectId]) {
    return { success: false, message: "Tunnel already running" };
  }

  // Port validation
  const portNum = parseInt(port);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    sendTunnelStatus(projectId, { status: "error" });
    return { success: false, message: "Invalid port" };
  }

  try {
    let tunnel;
    const targetUrl = `http://localhost:${portNum}`;

    sendTunnelStatus(projectId, { status: "connecting" });
    sendTunnelLog(projectId, `Starting ${mode} tunnel to ${targetUrl}...`);

    let currentUrl = null;

    if (mode === "quick") {
      // Quick tunnel - no authentication needed
      tunnel = Tunnel.quick(targetUrl);
      logger.info(
        `[TunnelManager] Starting quick tunnel for project ${projectId} on port ${portNum}`,
      );
    } else {
      // Authenticated tunnel with token
      if (!token) {
        sendTunnelStatus(projectId, {
          status: "error",
          error: "Token is required for authenticated tunnel",
        });
        return { success: false, message: "Token is required" };
      }

      const tunnelOptions = {
        "--protocol": config.protocol || "http2",
        "--loglevel": config.loglevel || "info",
      };

      if (config.noTLSVerify) {
        tunnelOptions["--no-tls-verify"] = true;
      }

      if (config.connectTimeout) {
        tunnelOptions["--proxy-connect-timeout"] = config.connectTimeout;
      }

      if (config.httpHostHeader) {
        tunnelOptions["--http-host-header"] = config.httpHostHeader;
      }

      tunnel = Tunnel.withToken(token, tunnelOptions);
      logger.info(
        `[TunnelManager] Starting authenticated tunnel for project ${projectId}`,
      );
    }

    // Store the tunnel instance early so it can be stopped while connecting
    // Config Parser for Auth Tunnels
    const configHandler = new ConfigHandler(tunnel);
    configHandler.on("config", ({ config }) => {
      // Look for the first ingress rule that has a hostname
      const ingress = config.ingress || [];
      const publicHostnameRule = ingress.find((rule) => rule.hostname);

      if (publicHostnameRule) {
        const url = `https://${publicHostnameRule.hostname}`;
        currentUrl = url; // Persist URL
        tunnel.url = url;
        logger.info(`[TunnelManager] Detected auth tunnel hostname: ${url}`);
        sendTunnelStatus(projectId, { status: "running", url, port: portNum });
        sendTunnelLog(projectId, `Tunnel URL detected: ${url}`, "success");
      }
    });

    tunnel.port = portNum; // Store running port
    runningTunnels[projectId] = tunnel;

    // Event: URL available
    tunnel.on("url", (url) => {
      logger.info(`[TunnelManager] Project ${projectId} tunnel URL: ${url}`);
      currentUrl = `https://${url}`; // Persist URL
      tunnel.url = currentUrl;
      sendTunnelStatus(projectId, { status: "running", url: currentUrl, port: portNum });
      sendTunnelLog(projectId, `Tunnel established: ${url}`, "success");
    });

    // Event: Connected to Cloudflare edge
    tunnel.on("connected", (connection) => {
      const location = connection?.location || "unknown";
      sendTunnelLog(projectId, `Connected to Cloudflare edge: ${location}`);

      // NOTE: Authenticated tunnels may not emit a 'url' event.
      // The 'connected' event acts as confirmation that the tunnel is active.
      if (mode === "authenticated") {
        sendTunnelStatus(projectId, { status: "running", url: currentUrl, port: portNum });
      }
    });

    // Event: Disconnected
    tunnel.on("disconnected", (connection) => {
      const id = connection?.id || "unknown";
      sendTunnelLog(projectId, `Disconnected: ${id}`, "warn");
    });

    /**
     * Helper to determine log type from message content
     */
    const getLogType = (msg, defaultType) => {
      const lower = msg.toLowerCase();
      if (lower.includes(" err ") || lower.includes(" error")) return "error";
      if (lower.includes(" wrn ") || lower.includes(" warn")) return "warn";
      if (lower.includes(" inf ") || lower.includes(" info")) return "info";
      return defaultType;
    };

    // Event: stdout
    tunnel.on("stdout", (data) => {
      const message = data.toString().trim();
      if (message) {
        // Honor config.loglevel for forwarding
        const currentLogLevel = config.loglevel || "info";
        if (
          currentLogLevel === "debug" ||
          !message.toLowerCase().includes("debug")
        ) {
          sendTunnelLog(
            projectId,
            sanitizeLog(message),
            getLogType(message, "info"),
          );
        }
      }
    });

    // Event: stderr
    tunnel.on("stderr", (data) => {
      const message = data.toString().trim();
      if (message) {
        // Cloudflared often puts all logs on stderr, parse level
        sendTunnelLog(
          projectId,
          sanitizeLog(message),
          getLogType(message, "error"),
        );
      }
    });

    // Event: Error
    tunnel.on("error", (error) => {
      logger.error(`[TunnelManager] Project ${projectId} tunnel error:`, error);
      sendTunnelStatus(projectId, { status: "error", error: error.message });
      sendTunnelLog(projectId, sanitizeLog(error.message), "error");
    });

    // Event: Exit
    tunnel.on("exit", (code, signal) => {
      logger.info(
        `[TunnelManager] Project ${projectId} tunnel exited with code ${code}`,
      );

      // Verification of instance to prevent double-deletion / race conditions
      if (runningTunnels[projectId] === tunnel) {
        delete runningTunnels[projectId];
      }

      sendTunnelStatus(projectId, { status: "stopped" });
      sendTunnelLog(projectId, `Tunnel stopped (exit code: ${code})`);
    });

    return { success: true };
  } catch (error) {
    logger.error(
      `[TunnelManager] Failed to start tunnel for project ${projectId}:`,
      error,
    );
    sendTunnelStatus(projectId, { status: "error", error: error.message });
    sendTunnelLog(projectId, `Failed to start: ${error.message}`, "error");
    return { success: false, message: error.message };
  }
};

/**
 * Stop a tunnel for a project
 * @param {number} projectId - Project ID
 */
export const stopTunnel = (projectId) => {
  const tunnel = runningTunnels[projectId];
  if (!tunnel) {
    return { success: false, message: "No tunnel running" };
  }

  try {
    logger.info(`[TunnelManager] Stopping tunnel for project ${projectId}`);
    tunnel.stop();
    delete runningTunnels[projectId];
    sendTunnelStatus(projectId, { status: "stopped" });
    sendTunnelLog(projectId, "Tunnel stopped by user");
    return { success: true };
  } catch (error) {
    logger.error(
      `[TunnelManager] Failed to stop tunnel for project ${projectId}:`,
      error,
    );
    return { success: false, message: error.message };
  }
};

/**
 * Get tunnel status for a project
 * @param {number} projectId - Project ID
 */
export const getTunnelStatus = (projectId) => {
  const tunnel = runningTunnels[projectId];
  if (!tunnel) {
    return { status: "stopped", url: null };
  }
  // Tunnel is running but we might not have URL yet
  return { status: "running", url: tunnel.url || null, port: tunnel.port };
};

/**
 * Get tunnel logs for a project
 * @param {number} projectId - Project ID
 */
export const getTunnelLogs = (projectId) => {
  return tunnelLogs[projectId] || [];
};

/**
 * Clear tunnel logs for a project
 * @param {number} projectId - Project ID
 */
export const clearTunnelLogs = (projectId) => {
  tunnelLogs[projectId] = [];
};

/**
 * Check if a tunnel is running for a project
 * @param {number} projectId - Project ID
 */
export const isTunnelRunning = (projectId) => {
  return !!runningTunnels[projectId];
};

/**
 * Stop all running tunnels (for graceful shutdown)
 */
export const stopAllTunnels = () => {
  const projectIds = Object.keys(runningTunnels);
  logger.info(`[TunnelManager] Stopping all ${projectIds.length} tunnels...`);

  for (const projectId of projectIds) {
    try {
      const tunnel = runningTunnels[projectId];
      if (tunnel) {
        tunnel.stopping = true;
        tunnel.stop();
        // Entry is deleted in the 'exit' handler
      }
    } catch (error) {
      logger.error(
        `[TunnelManager] Failed to stop tunnel for project ${projectId}:`,
        error,
      );
    }
  }
};

/**
 * Get all running tunnel project IDs
 */
export const getRunningTunnels = () => {
  return Object.keys(runningTunnels).map(Number);
};
