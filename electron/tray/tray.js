import { Tray, Menu, app } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tray = null;

export const initTray = (mainWindow, onQuit) => {
  const iconPath = path.join(process.resourcesPath, "icon.png");
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => mainWindow.show(),
    },
    {
      label: "Hide App",
      click: () => mainWindow.hide(),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        onQuit();
      },
    },
  ]);

  tray.setToolTip("SelfHost Helper");
  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    mainWindow.show();
  });

  return tray;
};
