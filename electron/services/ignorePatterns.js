/**
 * Directory names to ignore in file tree, search, and file watcher.
 * Keeps the app light by excluding library/dependency and build output folders.
 */
export const IGNORED_DIR_NAMES = [
  // JS/Node
  "node_modules",
  // Python
  "venv",
  ".venv",
  "env",
  "__pycache__",
  ".pycache",
  ".mypy_cache",
  ".pytest_cache",
  ".ruff_cache",
  // Go
  "vendor",
  // Rust
  "target",
  // Build/output
  "dist",
  "build",
  ".next",
  ".nuxt",
  "out",
  ".turbo",
  ".cache",
  "coverage",
  ".parcel-cache",
  ".vite",
  // VCS
  ".git",
  ".svn",
  ".hg",
  // Other
  "bower_components",
  ".sass-cache",
  ".gradle",
  "bin",
  "obj",
];

const IGNORED_LOWER = new Set(IGNORED_DIR_NAMES.map((d) => d.toLowerCase()));

/**
 * Returns true if the given directory name should be ignored (case-insensitive on Windows).
 */
export function isIgnoredDirName(name) {
  if (!name || typeof name !== "string") return false;
  return IGNORED_LOWER.has(name.toLowerCase());
}

/**
 * Returns true if the given absolute path contains any ignored directory as a path segment.
 * Used by the file watcher to ignore events under node_modules, venv, etc.
 */
export function isPathIgnored(filePath) {
  if (!filePath || typeof filePath !== "string") return false;
  const normalized = filePath.replace(/\\/g, "/");
  const segments = normalized.split("/");
  return segments.some((seg) => IGNORED_LOWER.has(seg.toLowerCase()));
}

/**
 * Returns ripgrep --glob exclusion args for each ignored directory.
 */
export function getRipgrepExcludeGlobs() {
  return IGNORED_DIR_NAMES.map((d) => `!**/${d}/**`);
}
