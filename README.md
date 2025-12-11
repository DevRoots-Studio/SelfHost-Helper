# SelfHost Helper

A Node.js Project Manager built with Electron, React, Vite, and TailwindCSS.

## Features

- **Project Management**: Add, start, stop, and restart local Node.js projects.
- **Log Viewer**: Real-time console output streaming.
- **File Editor**: Built-in Monaco Editor to tweak scripts or config.
- **File Watching**: Chokidar integration to detect file changes.
- **System Tray**: Minimize to tray support.
- **Auto Launch**: Configurable startup on Windows login.

## Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Run in Development**

   ```bash
   npm run dev
   ```

   This runs Vite (port 5173) and Electron simultaneously.

3. **Build Release**
   ```bash
   npm run build
   ```
   Generates a `.exe` installer in the `release/` directory.

## Project Structure

- `electron/`: Main process, IPC handlers, Services (DB, Watcher, Process Manager).
- `src/`: React Renderer (Dashboard, Components, Hooks).
- `database/`: Sequelize models and SQLite storage.
- `resources/`: Assets (icons).

## Notes

- Ensure you add an `icon.ico` to `resources/` before building.
- The database is stored in the user's AppData folder (`projects.sqlite`).
