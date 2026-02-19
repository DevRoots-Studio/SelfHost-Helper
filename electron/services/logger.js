import fs from "fs";
import path from "path";
import { app } from "electron";
import chalk from "chalk";

class Logger {
  constructor() {
    this.logFile = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    const userDataPath = app.getPath("userData");
    this.logFile = path.join(userDataPath, "main.log");

    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Use a writable stream for better performance than appendFileSync
    this.stream = fs.createWriteStream(this.logFile, { flags: "a" });

    this.write(`\n--- Log Session Started: ${new Date().toISOString()} ---\n`);
    this.initialized = true;

    // Catch Global Errors
    process.on("uncaughtException", (err) => {
      this.error("GLOBAL UNCAUGHT EXCEPTION:", err.message, err.stack);
    });

    process.on("unhandledRejection", (reason, promise) => {
      this.error("GLOBAL UNHANDLED REJECTION:", reason);
    });
  }

  write(message) {
    const output = message + "\n";
    if (this.stream) {
      this.stream.write(output);
    } else {
      // Fallback if not yet initialized
      console.log(output);
    }
  }

  format(msg, ...args) {
    let output = msg;
    if (args.length > 0) {
      const formattedArgs = args.map((arg) => {
        if (arg instanceof Error) {
          return `${arg.message}\n${arg.stack}`;
        }
        return typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg);
      });
      output += " " + formattedArgs.join(" ");
    }
    return output;
  }

  info(msg, ...args) {
    const formatted = `[INFO] [${new Date().toISOString()}] ${this.format(msg, ...args)}`;
    console.log(chalk.blue(formatted));
    this.write(formatted);
  }

  warn(msg, ...args) {
    const formatted = `[WARN] [${new Date().toISOString()}] ${this.format(msg, ...args)}`;
    console.log(chalk.yellow(formatted));
    this.write(formatted);
  }

  error(msg, ...args) {
    const formatted = `[ERROR] [${new Date().toISOString()}] ${this.format(msg, ...args)}`;
    console.error(chalk.red(formatted));
    this.write(formatted);
  }

  debug(msg, ...args) {
    const formatted = `[DEBUG] [${new Date().toISOString()}] ${this.format(msg, ...args)}`;
    console.log(chalk.gray(formatted));
    this.write(formatted);
  }
}

const logger = new Logger();
export default logger;
