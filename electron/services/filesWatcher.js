import chokidar from "chokidar";
import logger from "./logger.js";

const watchers = {};

//============================{Starts a WatchDog on a Specific Directory}=============================
export const watchFolder = (folderPath) => {
  if (watchers[folderPath]) {
    return;
  }

  const watcher = chokidar.watch(folderPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
  });

  watcher
    .on("add", (path) => notifyChange("add", path))
    .on("change", (path) => notifyChange("change", path))
    .on("unlink", (path) => notifyChange("unlink", path))
    .on("addDir", (path) => notifyChange("addDir", path))
    .on("unlinkDir", (path) => notifyChange("unlinkDir", path));

  watchers[folderPath] = watcher;
  logger.info(`[FilesWatcher] Started watching ${folderPath}`);
};

const notifyChange = (event, filePath) => {
  logger.debug(`[FilesWatcher] Change detected: [${event}] ${filePath}`);
  if (global.mainWindow) {
    global.mainWindow.webContents.send("file:change", { event, filePath });
  }
};

//============================{Stops a WatchDog on a Specific Directory}=============================
export const stopWatching = async (folderPath) => {
  if (watchers[folderPath]) {
    logger.info(`[FilesWatcher] Stopping watch on ${folderPath}`);
    await watchers[folderPath].close();
    delete watchers[folderPath];
  }
};
