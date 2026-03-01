import { contextBridge, ipcRenderer } from "electron";

const allowedListenerChannels = [
  "project:log",
  "project:logs-batch",
  "project:status",
  "projects:list-changed",
  "project:logs-cleared",
  "file:change",
  "tunnel:status",
  "tunnel:log",
  "window:maximize",
  "window:unmaximize",
  "app:shutting-down",
];

const removeAllListeners = (channel) => {
  if (!allowedListenerChannels.includes(channel)) {
    console.warn(`[Preload] Blocked removeAllListeners for disallowed channel: ${channel}`);
    return false;
  }

  ipcRenderer.removeAllListeners(channel);
  return true;
};

contextBridge.exposeInMainWorld("api", {
  startProject: (id) => ipcRenderer.invoke("project:start", id),
  stopProject: (id) => ipcRenderer.invoke("project:stop", id),
  restartProject: (id) => ipcRenderer.invoke("project:restart", id),
  startTunnel: (id, options) => ipcRenderer.invoke("tunnel:start", id, options),
  stopTunnel: (id) => ipcRenderer.invoke("tunnel:stop", id),

  readFile: (filePath) => ipcRenderer.invoke("file:read", filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke("file:write", filePath, content),
  createFile: (projectRoot, targetPath, type, content) =>
    ipcRenderer.invoke("file:create", { projectRoot, targetPath, type, content }),
  deletePath: (projectRoot, targetPath) =>
    ipcRenderer.invoke("file:delete", { projectRoot, targetPath }),
  renamePath: (projectRoot, oldPath, newPath) =>
    ipcRenderer.invoke("file:rename", { projectRoot, oldPath, newPath }),
  watchFolder: (folderPath) => ipcRenderer.invoke("watcher:watch", folderPath),
  stopWatchingFolder: (folderPath) => ipcRenderer.invoke("watcher:stop", folderPath),

  getLogs: (id) => ipcRenderer.invoke("logs:get", id),
  clearLogs: (id) => ipcRenderer.invoke("logs:clear", id),

  isAutoLaunchEnabled: () => ipcRenderer.invoke("app:isAutoLaunchEnabled"),
  enableAutoLaunch: () => ipcRenderer.invoke("app:enableAutoLaunch"),
  disableAutoLaunch: () => ipcRenderer.invoke("app:disableAutoLaunch"),

  getProjects: () => ipcRenderer.invoke("projects:getAll"),
  addProject: (project) => ipcRenderer.invoke("projects:add", project),
  deleteProject: (id) => ipcRenderer.invoke("projects:delete", id),
  updateProject: (project) => ipcRenderer.invoke("projects:update", project),
  reorderProjects: (payload) => ipcRenderer.invoke("projects:reorder", payload),
  reorderProjectsBulk: (payload) => ipcRenderer.invoke("projects:reorderBulk", payload),

  getCategories: () => ipcRenderer.invoke("categories:getAll"),
  addCategory: (category) => ipcRenderer.invoke("categories:add", category),
  deleteCategory: (id) => ipcRenderer.invoke("categories:delete", id),
  updateCategory: (category) => ipcRenderer.invoke("categories:update", category),
  reorderCategories: (orders) => ipcRenderer.invoke("categories:reorder", orders),

  selectDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  selectFile: () => ipcRenderer.invoke("dialog:openFile"),
  readDirectory: (path) => ipcRenderer.invoke("files:readDirectory", path),
  searchInProject: (projectRoot, query, options) =>
    ipcRenderer.invoke("search:inProject", projectRoot, query, options),

  gitStatus: (projectPath) => ipcRenderer.invoke("git:status", projectPath),
  gitDiff: (projectPath, filePath) => ipcRenderer.invoke("git:diff", projectPath, filePath),
  gitAdd: (projectPath, paths) => ipcRenderer.invoke("git:add", projectPath, paths),
  gitCommit: (projectPath, message) => ipcRenderer.invoke("git:commit", projectPath, message),
  gitPush: (projectPath) => ipcRenderer.invoke("git:push", projectPath),
  gitPull: (projectPath) => ipcRenderer.invoke("git:pull", projectPath),
  gitBranches: (projectPath) => ipcRenderer.invoke("git:branches", projectPath),
  gitCheckout: (projectPath, branchOrRef) =>
    ipcRenderer.invoke("git:checkout", projectPath, branchOrRef),
  gitClone: (repoUrl, targetPath) => ipcRenderer.invoke("git:clone", repoUrl, targetPath),
  gitRemoteUrl: (projectPath) => ipcRenderer.invoke("git:remoteUrl", projectPath),
  lspStart: (projectPath) => ipcRenderer.invoke("lsp:start", projectPath),
  lspStop: (projectPath) => ipcRenderer.invoke("lsp:stop", projectPath),
  sendInput: (id, data) => ipcRenderer.invoke("project:input", { id, data }),
  getLogHistory: (id) => ipcRenderer.invoke("logs:get", id),

  // Events
  onLog: (callback) => {
    const subscription = (_, data) => callback(data);
    ipcRenderer.on("project:log", subscription);
    return () => ipcRenderer.removeListener("project:log", subscription);
  },
  onLogsBatch: (callback) => {
    const subscription = (_, data) => callback(data);
    ipcRenderer.on("project:logs-batch", subscription);
    return () => ipcRenderer.removeListener("project:logs-batch", subscription);
  },
  onStatusChange: (callback) => {
    const subscription = (_, data) => callback(data);
    ipcRenderer.on("project:status", subscription);
    return () => ipcRenderer.removeListener("project:status", subscription);
  },
  onProjectsChange: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on("projects:list-changed", subscription);
    return () => ipcRenderer.removeListener("projects:list-changed", subscription);
  },
  onLogsCleared: (callback) => {
    const subscription = (_, projectId) => callback(projectId);
    ipcRenderer.on("project:logs-cleared", subscription);
    return () => ipcRenderer.removeListener("project:logs-cleared", subscription);
  },
  onFileChange: (callback) => {
    const subscription = (_, data) => callback(data);
    ipcRenderer.on("file:change", subscription);
    return () => ipcRenderer.removeListener("file:change", subscription);
  },
  onTunnelStatus: (callback) => {
    const subscription = (_, data) => callback(data);
    ipcRenderer.on("tunnel:status", subscription);
    return () => ipcRenderer.removeListener("tunnel:status", subscription);
  },
  onTunnelLog: (callback) => {
    const subscription = (_, data) => callback(data);
    ipcRenderer.on("tunnel:log", subscription);
    return () => ipcRenderer.removeListener("tunnel:log", subscription);
  },

  removeAllListeners,
  // for custom title bar
  closeWindow: () => ipcRenderer.send("window:close"),
  minimizeWindow: () => ipcRenderer.send("window:minimize"),
  toggleMaximize: () => ipcRenderer.send("window:toggleMaximize"),
  onMaximize: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on("window:maximize", subscription);
    return () => ipcRenderer.removeListener("window:maximize", subscription);
  },
  onUnmaximize: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on("window:unmaximize", subscription);
    return () => ipcRenderer.removeListener("window:unmaximize", subscription);
  },
  onShutdown: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on("app:shutting-down", subscription);
    return () => ipcRenderer.removeListener("app:shutting-down", subscription);
  },

  // Open external URL in default browser
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),
  openPath: (path) => ipcRenderer.invoke("shell:openPath", path),
  getDiscordInfo: (invitecode) => ipcRenderer.invoke("discord:getInviteInfo", invitecode),
  getProjectStats: (id) => ipcRenderer.invoke("project:getStats", id),
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  getAppPath: () => ipcRenderer.invoke("app:getAppPath"),
  joinPath: (...args) => ipcRenderer.invoke("path:join", ...args),
  clearTunnelLogs: (id) => ipcRenderer.invoke("tunnel:clearLogs", id),
  getTunnelStatus: (id) => ipcRenderer.invoke("tunnel:getStatus", id),
  getTunnelLogs: (id) => ipcRenderer.invoke("tunnel:getLogs", id),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (settings) => ipcRenderer.invoke("settings:update", settings),
});
