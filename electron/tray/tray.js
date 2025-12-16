import { Tray, Menu, app } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tray = null;

export const initTray = (mainWindow, onQuit) => {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(__dirname, "../../resources/icon.ico");

  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    { label: "Show App", click: () => mainWindow.show() },
    { label: "Hide App", click: () => mainWindow.hide() },
    { type: "separator" },
    { label: "Quit", click: () => onQuit() },
  ]);
  const tooltop =
    process.env.NODE_ENV === "development"
      ? "SelfHost helper Dev"
      : "SelfHost helper";

  tray.setToolTip(tooltop);
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => mainWindow.show());

  return tray;
};
