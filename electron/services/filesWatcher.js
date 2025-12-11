import chokidar from "chokidar";

const watchers = {};

export const watchFolder = (folderPath) => {
  if (watchers[folderPath]) {
    return; // Already watching
  }

  const watcher = chokidar.watch(folderPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
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
  console.log(`Started watching ${folderPath}`);
};

const notifyChange = (event, filePath) => {
  if (global.mainWindow) {
    global.mainWindow.webContents.send("file:change", { event, filePath });
  }
};

export const stopWatching = async (folderPath) => {
  if (watchers[folderPath]) {
    await watchers[folderPath].close();
    delete watchers[folderPath];
  }
};
