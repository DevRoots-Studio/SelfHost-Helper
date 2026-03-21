<div id="top">

<!-- HEADER STYLE: CLASSIC -->
<div align="center">

# SELFHOST-HELPER

<em>Simplify local project hosting, process management, and tunneling</em>

**v0.39.0** (mirrors [`package.json`](package.json) — update both when releasing)

<!-- BADGES -->
<img src="https://img.shields.io/github/license/DevRoots-Studio/SelfHost-Helper?style=flat&logo=opensourceinitiative&logoColor=white&color=0080ff" alt="license">
<img src="https://img.shields.io/github/last-commit/DevRoots-Studio/SelfHost-Helper?style=flat&logo=git&logoColor=white&color=0080ff" alt="last-commit">
<img src="https://img.shields.io/github/languages/top/DevRoots-Studio/SelfHost-Helper?style=flat&color=0080ff" alt="repo-top-language">
<img src="https://img.shields.io/github/languages/count/DevRoots-Studio/SelfHost-Helper?style=flat&color=0080ff" alt="repo-language-count">

<em>Built with the tools and technologies:</em>

<img src="https://img.shields.io/badge/JSON-000000.svg?style=flat&logo=JSON&logoColor=white" alt="JSON">
<img src="https://img.shields.io/badge/Markdown-000000.svg?style=flat&logo=Markdown&logoColor=white" alt="Markdown">
<img src="https://img.shields.io/badge/electronbuilder-000000.svg?style=flat&logo=electron-builder&logoColor=white" alt="electronbuilder">
<img src="https://img.shields.io/badge/npm-CB3837.svg?style=flat&logo=npm&logoColor=white" alt="npm">
<img src="https://img.shields.io/badge/Autoprefixer-DD3735.svg?style=flat&logo=Autoprefixer&logoColor=white" alt="Autoprefixer">
<img src="https://img.shields.io/badge/PostCSS-DD3A0A.svg?style=flat&logo=PostCSS&logoColor=white" alt="PostCSS">
<img src="https://img.shields.io/badge/JavaScript-F7DF1E.svg?style=flat&logo=JavaScript&logoColor=black" alt="JavaScript">
<img src="https://img.shields.io/badge/TypeScript-3178C6.svg?style=flat&logo=TypeScript&logoColor=white" alt="TypeScript">
<br>
<img src="https://img.shields.io/badge/Electron-47848F.svg?style=flat&logo=Electron&logoColor=white" alt="Electron">
<img src="https://img.shields.io/badge/React-61DAFB.svg?style=flat&logo=React&logoColor=black" alt="React">
<img src="https://img.shields.io/badge/Sequelize-52B0E7.svg?style=flat&logo=Sequelize&logoColor=white" alt="Sequelize">
<img src="https://img.shields.io/badge/C++-00599C.svg?style=flat&logo=C++&logoColor=white" alt="C++">
<img src="https://img.shields.io/badge/Docker-2496ED.svg?style=flat&logo=Docker&logoColor=white" alt="Docker">
<img src="https://img.shields.io/badge/Vite-646CFF.svg?style=flat&logo=Vite&logoColor=white" alt="Vite">
<img src="https://img.shields.io/badge/ESLint-4B32C3.svg?style=flat&logo=ESLint&logoColor=white" alt="ESLint">
<img src="https://img.shields.io/badge/Prettier-F7B93E.svg?style=flat&logo=Prettier&logoColor=black" alt="Prettier">
<img src="https://img.shields.io/badge/Jotai-333333.svg?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+" alt="Jotai">
<img src="https://img.shields.io/badge/Framer_Motion-0055FF.svg?style=flat&logo=framer&logoColor=white" alt="Framer Motion">
<img src="https://img.shields.io/badge/Cloudflare_Tunnels-F38020.svg?style=flat&logo=cloudflare&logoColor=white" alt="Cloudflare Tunnels">
<br>
<br>
<a href="https://deepwiki.com/DevRoots-Studio/SelfHost-Helper"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</div>

## <br>

## Table of Contents

- [Overview](#overview)
- [Recent updates](#recent-updates)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Scripts](#scripts)
  - [Testing](#testing)
- [Features](#features)
- [Project Structure](#project-structure)
  - [Key directories and entry points](#key-directories-and-entry-points)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgment](#acknowledgment)

---

## Overview

SelfHost-Helper is an advanced developer tool designed to simplify local project hosting, process management, and system monitoring. Built with a focus on stability, performance, and user experience, it integrates native Windows process control, real-time resource monitoring, and a modern UI to streamline development workflows.

**Why SelfHost-Helper?**

This project aims to provide developers with a robust, all-in-one solution for managing local projects efficiently. The core features include:

- 🛠️ **Optional Docker builds:** A Dockerfile is available for reproducible CI/container builds; everyday development uses npm only.
- ⚙️ **Native Process Control:** Implements Windows-specific job objects for reliable process grouping and resource management.
- 🔍 **Real-Time Monitoring:** Resource tracking, process insights, live logs, a configurable **Overview** grid, and a **Resources** view for deeper stats.
- 🎨 **Modern UI:** Frameless desktop shell with custom title bar, toast notifications, and styling via **Tailwind CSS v4** (`@tailwindcss/postcss`, `@theme` in `src/index.css`, plus `tailwind.config.js` for legacy/theme alignment).
- 📁 **Project Lifecycle Management:** Start/stop/restart projects, editor and file tools, settings split into General, Data, Backup, Runtimes, Updates, and About.
- 🔄 **Cross-Platform Utilities:** Process tree management and packaging targets for Windows (NSIS) and Linux (AppImage, deb, rpm).
- 🌐 **Cloudflare Tunnels:** Quick or authenticated tunnels via cloudflared, optional auto-start, dedicated tunnel tab and logs.
- 🔄 **In-app updates:** **electron-updater** checks GitHub Releases; **Settings → Updates** for checks and release notes (see [`docs/auto-update-publishing.md`](docs/auto-update-publishing.md) for maintainers).

---

## Recent updates

Recent development has expanded SelfHost-Helper into a full-featured local dev workspace:

- **Overview & Resources:** Per-project **Overview** tab with a draggable grid (`@eleung/react-grid-layout`) and metric tiles; **Resources** tab for sparklines, uptime, and process detail.
- **Editor & LSP:** Monaco with an LSP bridge (`typescript-language-server`, `ws`) for in-app editing per project.
- **Search & Git (Editor):** Ripgrep-based **`SearchPanel`** and full Git via **`GitPanel`** live inside **`EditorView`** as resizable panels—not separate top-level router tabs (those are Overview, Console, Editor, Tunnel, Resources).
- **File system:** Create, delete, rename files and folders; read/write and directory listing; folder watcher; ignore patterns for trees and search.
- **Multi-workspace:** Multiple projects with **categories** (`Category` model), drag-and-drop reorder, and bulk reorder; each project is a workspace root.
- **Backup & restore:** Legacy SQLite migration with automatic backup; **Settings → Backup** (and data sections) to restore from a file or open the data folder; see [`docs/RESTORE_FROM_BACKUP.md`](docs/RESTORE_FROM_BACKUP.md).
- **Auto-updates:** GitHub Releases–driven updates via **electron-updater**; **Settings → Updates**; maintainers follow [`docs/auto-update-publishing.md`](docs/auto-update-publishing.md).
- **Error handling & logging:** Central `electron/services/logger.js`, IPC error logging, and debug logging for key operations.

Roadmap and planning notes are in **[TODO.md](TODO.md)**.

---

## Features

|     | Component             | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| :-- | :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚙️  | **Architecture**      | <ul><li>Modular Electron desktop app with React renderer</li><li>Vite for dev and production frontend builds</li><li>Main/preload/renderer separation with context isolation</li><li>Hash-based `react-router-dom` routes for dashboard, project views, and settings</li></ul>                                                                                                                                                                                                                                                                                                                                  |
| 🔩  | **Code Quality**      | <ul><li>ESLint and Prettier</li><li>Path aliases via `jsconfig.json`</li><li>`npm run typecheck` — `tsc --noEmit` with `tsconfig.json` (JS codebase; types for tooling/checks)</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 📄  | **Documentation**     | <ul><li>Dockerfile for containerized builds</li><li>This README; `ChangeLog`; historical `RELEASE_NOTES_v0.7.0.md`</li><li><strong>Current</strong> release notes: <a href="https://github.com/DevRoots-Studio/SelfHost-Helper/releases">GitHub Releases</a> (used by the updater)</li><li><a href="docs/RESTORE_FROM_BACKUP.md">docs/RESTORE_FROM_BACKUP.md</a>; <a href="docs/auto-update-publishing.md">docs/auto-update-publishing.md</a></li><li>Roadmap: <a href="TODO.md">TODO.md</a></li></ul>                                                                                                          |
| 🎛️  | **Overview & layout** | <ul><li><strong>Overview</strong> tab: draggable grid and tiles (CPU, RAM, tunnel mini-views, etc.)</li><li><strong>Resources</strong> tab: detailed resource history and process views</li><li><strong>ViewTabs</strong> routes: overview, console, editor, tunnel, resources</li></ul>                                                                                                                                                                                                                                                                                                                        |
| 🔔  | **Shell & UX**        | <ul><li>Frameless window with <code>TitleBar</code> window controls</li><li><code>react-toastify</code> for status toasts</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 🔌  | **Integrations**      | <ul><li>Electron, React, Vite, electron-builder, electron-updater</li><li>Tailwind v4 pipeline (<code>@tailwindcss/postcss</code>), <code>tailwind.config.js</code></li><li>Jotai, Framer Motion, Radix UI, lucide-react</li><li>Monaco + LSP (<code>ws</code>, <code>typescript-language-server</code>), xterm addons</li><li>cloudflared, SQLite3, Sequelize, <code>st.db</code> settings</li><li>simple-git, <code>@vscode/ripgrep</code>, chokidar</li><li><code>@hello-pangea/dnd</code>, <code>@eleung/react-grid-layout</code></li><li><code>react-markdown</code> (e.g. update release notes)</li></ul> |
| 🔍  | **Search**            | <ul><li>Ripgrep-backed <code>SearchPanel</code> inside the editor workspace</li><li>Case-sensitive, whole-word, glob options; structured results</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 📂  | **Git**               | <ul><li>Full Git via <code>simple-git</code> in <code>GitPanel</code> (editor workspace): status, diff, stage, commit, push, pull, branches, clone, init, remotes</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 💾  | **Backup & restore**  | <ul><li>Legacy SQLite migration with automatic backup on upgrade</li><li>Settings sections for data folder, backup/restore (<code>adm-zip</code> / config backup flows where applicable)</li><li><a href="docs/RESTORE_FROM_BACKUP.md">docs/RESTORE_FROM_BACKUP.md</a></li></ul>                                                                                                                                                                                                                                                                                                                                |
| 🌐  | **Tunneling**         | <ul><li>Cloudflare quick and authenticated tunnels via cloudflared</li><li>Tunnel tab + log viewer; optional auto-start with project</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ⬆️  | **Auto-updates**      | <ul><li><code>updateService</code> + electron-updater against GitHub Releases</li><li>Settings → Updates; <code>publish:prod</code> for maintainers (requires <code>GH_TOKEN</code> — see docs)</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                       |
| 🧩  | **Modularity**        | <ul><li>Component-based React UI under <code>src/components</code></li><li>Electron services under <code>electron/services</code></li><li>Hooks (<code>src/hooks</code>) and shared lib</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                               |
| 🧪  | **Testing**           | <ul><li>No automated test suite yet; ESLint + optional <code>npm run typecheck</code></li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ⚡️  | **Performance**       | <ul><li><code>pidusage</code> and <code>statsService</code> for monitoring</li><li>Vite, Tailwind, React Fast Refresh</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 🛡️  | **Security**          | <ul><li>Context isolation, hardened preload surface</li><li><code>secretStore</code> (safeStorage) for tunnel tokens</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 📦  | **Runtime**           | <ul><li><code>runtimeService</code> / Settings → Runtimes for toolchain hints and environment</li><li>Windows job object native addon under <code>electron/job</code></li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                 |

---

## Project Structure

The user-visible app version is defined in `package.json`; **keep the README header version in sync** when releasing.

```sh
└── SelfHost-Helper/
    ├── ChangeLog
    ├── Dockerfile
    ├── LICENSE
    ├── README.md
    ├── RELEASE_NOTES_v0.7.0.md   # historical; current notes on GitHub Releases
    ├── TODO.md
    ├── tsconfig.json
    ├── database/
    │   └── models/                 # Project.js, Category.js (Sequelize + SQLite)
    ├── docs/
    │   ├── RESTORE_FROM_BACKUP.md
    │   └── auto-update-publishing.md
    ├── electron/
    │   ├── ipc/
    │   ├── job/                    # native Windows job object addon (C++)
    │   ├── services/               # DB, projects, tunnels, git, search, LSP, stats, updates, …
    │   ├── tray/
    │   ├── main.js
    │   └── preload.js
    ├── public/
    │   └── file-icons/
    ├── resources/
    ├── src/
    │   ├── components/             # UI, overview grid, panels
    │   ├── editors/
    │   ├── hooks/
    │   ├── lib/
    │   ├── pages/                  # Dashboard, Settings (+ settings/* sections)
    │   ├── store/
    │   ├── config/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── index.css               # Tailwind v4: @import "tailwindcss", @theme
    │   └── monacoWorkers.js
    ├── eslint.config.js
    ├── index.html
    ├── jsconfig.json
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    └── vite.config.js
```

### Key directories and entry points

- **`electron/main.js`** — BrowserWindow, custom protocol, lifecycle; registers IPC and services.
- **`electron/preload.js`** — Exposes `window.api` to the renderer (context isolation).
- **`electron/ipc/handlers.js`** — IPC for projects, files, git, search, tunnels, settings, updates, and more.
- **`electron/services/`** — Includes `projectsManager`, `database`, `tunnelManager`, `gitService`, `searchService`, `lspBridge`, `statsService`, `runtimeService`, `updateService`, `configBackupService`, `secretStore`, `settingsService`, `filesWatcher`, `logger`, `processTree`, `ignorePatterns`, and related helpers.
- **`src/App.jsx`** — Hash routes: dashboard, `project/:projectId/{overview|console|editor|tunnel|resources}`, `/settings/*`.
- **`src/components/ProjectLayout.jsx`** — Project shell and data loading; **`ViewTabs.jsx`** switches the five primary views and shows the stats pill.
- **`src/components/EditorView.jsx`** — Monaco, file tree, resizable **`SearchPanel`** and **`GitPanel`** (search/git are editor panels, not separate top-level tabs).
- **`src/components/overview/`** — Dashboard grid (`@eleung/react-grid-layout`) and metric tiles.
- **`src/pages/settings/`** — General, data, backup, runtimes, updates (release notes via `react-markdown`), about.
- **[Full repository tree on GitHub](https://github.com/DevRoots-Studio/SelfHost-Helper/tree/main)** — exhaustive listing.

---

## Getting Started

### Prerequisites

For local development:

- **Runtime:** Node.js (LTS recommended)
- **Language:** JavaScript (renderer + main); TypeScript toolchain for `npm run typecheck` only
- **Package manager:** npm

**Docker** is **optional** — use it only if you want the Dockerfile-based build pipeline. Most contributors run `npm install` and `npm run dev` directly on the host.

### Installation

Build SelfHost-Helper from the source and install dependencies:

1. **Clone the repository:**

   ```sh
   ❯ git clone https://github.com/DevRoots-Studio/SelfHost-Helper
   ```

2. **Navigate to the project directory:**

   ```sh
   ❯ cd SelfHost-Helper
   ```

3. **Install the dependencies:**

**Using [docker](https://www.docker.com/):**

```sh
❯ docker build -t DevRoots-Studio/SelfHost-Helper .
```

**Using [npm](https://www.npmjs.com/):**

```sh
❯ npm install
```

### Usage

Run the project in development:

**Using [docker](https://www.docker.com/):**

Build the image, then run a container; the built app is in `/app/release` inside the image (see Dockerfile `VOLUME`). Example:

```sh
docker build -t DevRoots-Studio/SelfHost-Helper .
docker run -it -v release-out:/app/release DevRoots-Studio/SelfHost-Helper
```

**Using [npm](https://www.npmjs.com/):**

```sh
npm run dev
```

This starts the Vite dev server and Electron together. For production, run `npm run build` then run the installer or unpacked app from the `release/` directory.

### Scripts

| Script                 | Description                                                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`          | Start development (Vite + Electron via `concurrently`)                                                                                                                                                                               |
| `npm run build`        | Production build: Vite → `dist/`, then electron-builder → `release/`                                                                                                                                                                 |
| `npm run build:dev`    | Dev artifact (separate `appId`, output under `release-dev/`)                                                                                                                                                                         |
| `npm run build:prod`   | Same as production build with `NODE_ENV=production` set for electron-builder                                                                                                                                                         |
| `npm run build:web`    | Vite build only (frontend to `dist/`, no Electron package)                                                                                                                                                                           |
| `npm run publish:prod` | **Maintainers:** build and **publish** to GitHub Releases (`electron-builder --publish always`). Requires `GH_TOKEN` (and optional `.env` via `dotenv-cli`). See [`docs/auto-update-publishing.md`](docs/auto-update-publishing.md). |
| `npm run lint`         | Run ESLint                                                                                                                                                                                                                           |
| `npm run typecheck`    | `tsc --noEmit` (no compile output; checks against `tsconfig.json`)                                                                                                                                                                   |
| `npm run format`       | Format with Prettier                                                                                                                                                                                                                 |
| `npm run format:check` | Check Prettier formatting                                                                                                                                                                                                            |

### Testing

There is no automated test suite yet. Use **ESLint**, **Prettier**, and optionally **`npm run typecheck`** before releases.

---

## Roadmap

The project roadmap and task list live in **[TODO.md](TODO.md)** — planned work, ideas, and completed items. For shipped versions, see **[GitHub Releases](https://github.com/DevRoots-Studio/SelfHost-Helper/releases)**.

---

## Contributing

- **💬 [Join the Discussions](https://github.com/DevRoots-Studio/SelfHost-Helper/discussions)**: Share your insights, provide feedback, or ask questions.
- **🐛 [Report Issues](https://github.com/DevRoots-Studio/SelfHost-Helper/issues)**: Submit bugs found or log feature requests for the `SelfHost-Helper` project.
- **💡 [Submit Pull Requests](https://github.com/DevRoots-Studio/SelfHost-Helper/pulls)**: Review open PRs and submit your own against the `main` branch.

<details closed>
<summary>Contributing Guidelines</summary>

1. **Fork the Repository**: Start by forking the project repository to your github account.
2. **Clone Locally**: Clone the forked repository to your local machine using a git client.
   ```sh
   git clone https://github.com/DevRoots-Studio/SelfHost-Helper
   ```
3. **Create a New Branch**: Always work on a new branch, giving it a descriptive name.
   ```sh
   git checkout -b new-feature-x
   ```
4. **Make Your Changes**: Develop and test your changes locally.
5. **Commit Your Changes**: Commit with a clear message describing your updates.
   ```sh
   git commit -m 'Implemented new feature x.'
   ```
6. **Push to github**: Push the changes to your forked repository.
   ```sh
   git push origin new-feature-x
   ```
7. **Submit a Pull Request**: Create a PR against the original project repository. Clearly describe the changes and their motivations.
8. **Review**: Once your PR is reviewed and approved, it will be merged into the main branch. Congratulations on your contribution!
</details>

<details closed>
<summary>Contributor Graph</summary>
<br>
<p align="left">
   <a href="https://github.com/DevRoots-Studio/SelfHost-Helper/graphs/contributors">
      <img src="https://contrib.rocks/image?repo=DevRoots-Studio/SelfHost-Helper">
   </a>
</p>
</details>

---

## License

SelfHost-Helper is licensed under the ISC License. See the [LICENSE](LICENSE) file in the repository root for the full text.

---

## Acknowledgments

- Credit `contributors`, `inspiration`, `references`, etc.

<div align="left"><a href="#top">⬆ Return</a></div>

---
