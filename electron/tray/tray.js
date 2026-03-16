import { Tray, Menu, app } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tray = null;
let currentMainWindow = null;
let currentOnQuit = null;

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeOrder(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export const updateTrayMenu = (
  projects,
  categories,
  runningIds,
  startProject,
  stopProject,
  restartProject,
  startAll,
  stopAll
) => {
  if (!tray) return;

  const makeProjectItem = (project) => {
    const isRunning = runningIds.includes(project.id?.toString());
    return {
      label: project.name,
      submenu: [
        { label: "Start", enabled: !isRunning, click: () => startProject(project.id) },
        { label: "Stop", enabled: isRunning, click: () => stopProject(project.id) },
        { label: "Restart", enabled: isRunning, click: () => restartProject(project.id) },
      ],
    };
  };

  const serverSubmenu = [];
  const categoryList = Array.isArray(categories) ? categories : [];
  const projectList = Array.isArray(projects) ? projects : [];

  for (const category of categoryList) {
    const categoryId = toNullableNumber(category?.id);
    if (categoryId === null) continue;
    const inCategory = projectList
      .filter((p) => toNullableNumber(p.categoryId) === categoryId)
      .sort((a, b) => normalizeOrder(a.order) - normalizeOrder(b.order));
    const name = category.name && String(category.name).trim() ? category.name : "Unnamed";
    serverSubmenu.push({
      label: name,
      submenu:
        inCategory.length > 0
          ? inCategory.map(makeProjectItem)
          : [{ label: "No servers", enabled: false }],
    });
  }

  const uncategorized = projectList
    .filter((p) => toNullableNumber(p.categoryId) === null)
    .sort((a, b) => normalizeOrder(a.order) - normalizeOrder(b.order));
  if (uncategorized.length > 0) {
    serverSubmenu.push({
      label: "Uncategorized",
      submenu: uncategorized.map(makeProjectItem),
    });
  }

  if (serverSubmenu.length === 0) {
    serverSubmenu.push({ label: "No projects found", enabled: false });
  }

  const template = [
    { label: "Show App", click: () => currentMainWindow.show() },
    { label: "Hide App", click: () => currentMainWindow.hide() },
    { type: "separator" },
    { label: "Start All Servers", click: () => startAll() },
    { label: "Stop All Servers", click: () => stopAll() },
    { type: "separator" },
    { label: "Servers", submenu: serverSubmenu },
    { type: "separator" },
    { label: "Quit", click: () => currentOnQuit() },
  ];

  const contextMenu = Menu.buildFromTemplate(template);
  tray.setContextMenu(contextMenu);
};

export const initTray = (mainWindow, onQuit) => {
  currentMainWindow = mainWindow;
  currentOnQuit = onQuit;

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(__dirname, "../../resources/icon.ico");

  tray = new Tray(iconPath);

  const tooltop =
    process.env.NODE_ENV === "development" ? "SelfHost helper Dev" : "SelfHost helper";

  tray.setToolTip(tooltop);
  tray.on("double-click", () => mainWindow.show());

  return tray;
};
