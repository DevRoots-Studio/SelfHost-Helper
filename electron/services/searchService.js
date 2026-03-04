import { spawn } from "child_process";
import path from "path";
import { getRipgrepExcludeGlobs } from "./ignorePatterns.js";

let rgPath = null;

async function getRgPath() {
  if (rgPath) return rgPath;
  const mod = await import("@vscode/ripgrep");
  let bin = mod.rgPath ?? mod.default?.rgPath;
  if (!bin) throw new Error("ripgrep binary path not found");
  // Production: binary is unpacked from asar; path from module points inside asar and cannot be executed
  if (bin.includes("app.asar") && !bin.includes("app.asar.unpacked")) {
    bin = bin.replace("app.asar", "app.asar.unpacked");
  }
  rgPath = bin;
  return rgPath;
}

/**
 * Search in project directory. Returns array of { filePath, lineNumber, lineText, matchText }.
 * @param {string} projectRoot - Root directory to search
 * @param {string} query - Search string (regex supported)
 * @param {{ caseSensitive?: boolean, wholeWord?: boolean, includePattern?: string, excludePattern?: string }} options
 */
export async function searchInProject(projectRoot, query, options = {}) {
  if (!projectRoot || !query?.trim()) return [];

  const bin = await getRgPath();
  const args = [
    "--json",
    "--no-ignore-parent", // still respect .gitignore in project
    "-e",
    query.trim(),
  ];
  getRipgrepExcludeGlobs().forEach((glob) => args.push("--glob", glob));
  if (options.caseSensitive) args.push("--case-sensitive");
  if (options.wholeWord) args.push("--word-regexp");
  if (options.includePattern) args.push("--glob", options.includePattern);
  if (options.excludePattern) args.push("--glob", "!" + options.excludePattern);
  args.push("--", projectRoot);

  return new Promise((resolve, reject) => {
    const results = [];
    const proc = spawn(bin, args, {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let buffer = "";
    proc.stdout.setEncoding("utf8");
    proc.stdout.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          if (obj.type === "match" && obj.data?.path?.text != null) {
            const filePath = path.isAbsolute(obj.data.path.text)
              ? obj.data.path.text
              : path.join(projectRoot, obj.data.path.text);
            results.push({
              filePath: path.normalize(filePath),
              lineNumber: obj.data.line_number ?? 0,
              lineText: obj.data.lines?.text?.trimEnd() ?? "",
              matchText: obj.data.submatches?.[0]?.match?.text ?? query,
            });
          }
        } catch {
          // skip malformed lines
        }
      }
    });

    proc.stderr.setEncoding("utf8");
    proc.stderr.on("data", (data) => {
      // ripgrep may write progress to stderr; ignore unless exit code is non-zero
    });

    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code !== 0 && code !== 1) {
        reject(new Error(`ripgrep exited with code ${code}`));
        return;
      }
      resolve(results);
    });
  });
}
