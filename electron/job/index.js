import { join, dirname } from "path";
import { existsSync } from "fs";
import logger from "../services/logger.js";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

let bindingPath = join(__dirname, "build/Release/job.node");

// Handle Electron ASAR packaging: native modules must be loaded from app.asar.unpacked
if (
  bindingPath.includes("app.asar") &&
  !bindingPath.includes("app.asar.unpacked")
) {
  bindingPath = bindingPath.replace("app.asar", "app.asar.unpacked");
}

let job;
let jobAddon;

try {
  if (existsSync(bindingPath)) {
    jobAddon = require(bindingPath);
    job = new jobAddon.JobObject();
  } else {
    logger.warn("Native job addon not found at:", bindingPath);
  }
} catch (error) {
  logger.error("Failed to load native job addon:", error);
}

export const assignPid = (pid) => {
  if (job) {
    try {
      job.assignProcess(pid);
      return true;
    } catch (err) {
      logger.error(`Failed to assign PID ${pid} to job:`, err);
      return false;
    }
  }
  return false;
};

export const closeJob = () => {
  if (job) {
    job.close();
  }
};

export default job;
