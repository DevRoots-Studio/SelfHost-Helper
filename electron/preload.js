import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  startProject: (id) => ipcRenderer.invoke("project:start", id),
  stopProject: (id) => ipcRenderer.invoke("project:stop", id),
  restartProject: (id) => ipcRenderer.invoke("project:restart", id),

  readFile: (filePath) => ipcRenderer.invoke("file:read", filePath),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke("file:write", filePath, content),
  watchFolder: (folderPath) => ipcRenderer.invoke("watcher:watch", folderPath),

  getLogs: (id) => ipcRenderer.invoke("logs:get", id),

  isAutoLaunchEnabled: () => ipcRenderer.invoke("app:isAutoLaunchEnabled"),
  enableAutoLaunch: () => ipcRenderer.invoke("app:enableAutoLaunch"),
  disableAutoLaunch: () => ipcRenderer.invoke("app:disableAutoLaunch"),

  getProjects: () => ipcRenderer.invoke("projects:getAll"),
  addProject: (project) => ipcRenderer.invoke("projects:add", project),
  deleteProject: (id) => ipcRenderer.invoke("projects:delete", id),
  updateProject: (project) => ipcRenderer.invoke("projects:update", project),

  // New Feature APIs
  selectDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  readDirectory: (path) => ipcRenderer.invoke("files:readDirectory", path),
  sendInput: (id, data) => ipcRenderer.invoke("project:input", { id, data }),
  getLogHistory: (id) => ipcRenderer.invoke("logs:get", id),

  // Events
  onLog: (callback) => {
    const subscription = (_, data) => callback(data);
    ipcRenderer.on("project:log", subscription);
    return () => ipcRenderer.removeListener("project:log", subscription);
  },
  onStatusChange: (callback) => {
    const subscription = (_, data) => callback(data);
    ipcRenderer.on("project:status", subscription);
    return () => ipcRenderer.removeListener("project:status", subscription);
  },
  onFileChange: (callback) => {
    const subscription = (_, data) => callback(data);
    ipcRenderer.on("file:change", subscription);
    return () => ipcRenderer.removeListener("file:change", subscription);
  },

  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
