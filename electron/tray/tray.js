import { Tray, Menu, app } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tray = null;
let currentMainWindow = null;
let currentOnQuit = null;

export const updateTrayMenu = (
  projects,
  runningIds,
  startProject,
  stopProject,
  restartProject,
  startAll,
  stopAll
) => {
  if (!tray) return;

  const projectItems = projects.map((project) => {
    const isRunning = runningIds.includes(project.id);
    return {
      label: project.name,
      submenu: [
        {
          label: "Start",
          enabled: !isRunning,
          click: () => startProject(project.id),
        },
        {
          label: "Stop",
          enabled: isRunning,
          click: () => stopProject(project.id),
        },
        {
          label: "Restart",
          enabled: isRunning,
          click: () => restartProject(project.id),
        },
      ],
    };
  });

  const template = [
    { label: "Show App", click: () => currentMainWindow.show() },
    { label: "Hide App", click: () => currentMainWindow.hide() },
    { type: "separator" },
    {
      label: "Start All Servers",
      click: () => startAll(),
    },
    {
      label: "Stop All Servers",
      click: () => stopAll(),
    },
    { type: "separator" },
    {
      label: "Servers",
      submenu:
        projectItems.length > 0
          ? projectItems
          : [{ label: "No projects found", enabled: false }],
    },
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
    process.env.NODE_ENV === "development"
      ? "SelfHost helper Dev"
      : "SelfHost helper";

  tray.setToolTip(tooltop);
  tray.on("double-click", () => mainWindow.show());

  return tray;
};
