<div id="top">

<!-- HEADER STYLE: CLASSIC -->
<div align="center">

# SELFHOST-HELPER

<em>Simplify local project hosting, process management, and tunneling</em>

**v0.18.0**

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

</div>
<br>

---

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
  - [Project Index](#project-index)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgment](#acknowledgment)

---

## Overview

SelfHost-Helper is an advanced developer tool designed to simplify local project hosting, process management, and system monitoring. Built with a focus on stability, performance, and user experience, it integrates native Windows process control, real-time resource monitoring, and a modern UI to streamline development workflows.

**Why SelfHost-Helper?**

This project aims to provide developers with a robust, all-in-one solution for managing local projects efficiently. The core features include:

- 🛠️ **Containerized Environment:** Uses Docker to ensure consistent setup and dependencies across deployments.
- ⚙️ **Native Process Control:** Implements Windows-specific job objects for reliable process grouping and resource management.
- 🔍 **Real-Time Monitoring:** Offers comprehensive resource tracking, process insights, and live logs for debugging.
- 🎨 **Modern UI Components:** Features a responsive, customizable interface for project control, file management, and system stats.
- 📁 **Project Lifecycle Management:** Facilitates project startup, shutdown, editing, and automation with seamless integration.
- 🔄 **Cross-Platform Utilities:** Provides process tree management and system integration for Windows and Unix environments.
- 🌐 **Cloudflare Tunnels:** Expose local projects via quick or authenticated Cloudflare tunnels, with optional auto-start and a dedicated tunnel tab and logs in the UI.

---

## Recent updates

Recent development has expanded SelfHost-Helper into a full-featured local dev workspace:

- **Editor & LSP:** Monaco editor with LSP bridge for in-app code editing and language support per project.
- **Search:** Ripgrep-based project search (`SearchPanel`) with case-sensitive, whole-word, and glob options and JSON line results.
- **Git:** Full Git integration via `simple-git` — status, diff, add, unstage, commit, push, pull, branches, checkout, clone, init, remotes — with a dedicated **Git** tab (`GitPanel`) in the UI.
- **File system:** Create, delete, and rename files and folders; read/write files and directory listing; folder watcher for live updates; ignore patterns for trees and search.
- **Multi-workspace:** Multiple projects with categories, drag-and-drop reorder, and bulk reorder; each project is a workspace root.
- **Backup & restore:** Legacy SQLite migration with automatic backup; **Settings → Data & backup** to restore from a file or open the data folder; see `docs/RESTORE_FROM_BACKUP.md` for recovery steps.
- **Error handling & logging:** Central `logger.js`, IPC handlers logging errors, and debug logging for key operations.

The roadmap and phased plan (editor stability, cloud integration planning, app capability preparation) are tracked in **MyToDo.md**.

---

## Features

|     | Component            | Details                                                                                                                                                                                                                                                                                                                                                                                 |
| :-- | :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚙️  | **Architecture**     | <ul><li>Modular Electron-based desktop app with React frontend</li><li>Uses Vite for build tooling</li><li>Separation of main and renderer processes</li></ul>                                                                                                                                                                                                                          |
| 🔩  | **Code Quality**     | <ul><li>Consistent code style with ESLint and Prettier</li><li>Path aliases via jsconfig.json</li><li>Well-structured project with clear separation of concerns</li></ul>                                                                                                                                                                                                               |
| 📄  | **Documentation**    | <ul><li>Includes Dockerfile for containerization</li><li>README provides setup and usage instructions</li><li>In-code comments and README sections for dependencies and build steps</li><li>MyToDo.md for roadmap and phased plan; RESTORE_FROM_BACKUP.md for backup recovery</li></ul>                                                                                                 |
| 🔌  | **Integrations**     | <ul><li>Electron, React, Tailwind CSS, Vite, Electron-builder</li><li>Jotai for state; Framer Motion for animations</li><li>Monaco Editor (LSP bridge) and xterm for code/terminal</li><li>Radix UI, react-router-dom, cloudflared (tunnels), lucide-react</li><li>SQLite3 and Sequelize; @hello-pangea/dnd for sidebar reorder</li><li>simple-git, @vscode/ripgrep, chokidar</li></ul> |
| 🔍  | **Search**           | <ul><li>Ripgrep-based project search with SearchPanel in the UI</li><li>Case-sensitive, whole-word, and glob options; JSON line results</li></ul>                                                                                                                                                                                                                                       |
| 📂  | **Git**              | <ul><li>Full Git integration via simple-git: status, diff, add, unstage, commit, push, pull</li><li>Branches, checkout, clone, init, remotes (add/remove); dedicated GitPanel tab</li></ul>                                                                                                                                                                                             |
| 💾  | **Backup & restore** | <ul><li>Legacy SQLite migration with automatic backup on upgrade</li><li>Settings → Data & backup: restore from file or open data folder</li><li>See docs/RESTORE_FROM_BACKUP.md for recovery</li></ul>                                                                                                                                                                                 |
| 🌐  | **Tunneling**        | <ul><li>Cloudflare quick and authenticated tunnels via cloudflared</li><li>Dedicated tunnel tab and log viewer in the UI</li><li>Optional auto-start tunnel with project</li></ul>                                                                                                                                                                                                      |
| 🧩  | **Modularity**       | <ul><li>Component-based React architecture</li><li>Electron main and renderer processes separated</li><li>Custom hooks and utility modules</li></ul>                                                                                                                                                                                                                                    |
| 🧪  | **Testing**          | <ul><li>No automated test suite yet; ESLint used for code quality</li></ul>                                                                                                                                                                                                                                                                                                             |
| ⚡️  | **Performance**      | <ul><li>Uses `pidusage` for process monitoring</li><li>Optimized build with Vite, Tailwind CSS, and React Fast Refresh</li></ul>                                                                                                                                                                                                                                                        |
| 🛡️  | **Security**         | <ul><li>Electron security best practices (e.g., context isolation)</li><li>Secret store for encrypted tokens (safeStorage)</li></ul>                                                                                                                                                                                                                                                    |
| 📦  | **Dependencies**     | <ul><li>React, Tailwind CSS, Electron, SQLite3, Sequelize, cloudflared, Jotai, Framer Motion, Monaco, xterm</li><li>Dev: ESLint, Prettier, Docker, Vite, Radix UI</li></ul>                                                                                                                                                                                                             |

---

## Project Structure

```sh
└── SelfHost-Helper/
    ├── ChangeLog
    ├── Dockerfile
    ├── LICENSE
    ├── README.md
    ├── RELEASE_NOTES_v0.7.0.md
    ├── TODO.md
    ├── MyToDo.md
    ├── database
    │   └── models
    ├── electron
    │   ├── ipc
    │   ├── job
    │   ├── main.js
    │   ├── preload.js
    │   ├── services
    │   │   ├── database.js
    │   │   ├── filesWatcher.js
    │   │   ├── logger.js
    │   │   ├── processTree.js
    │   │   ├── projectsManager.js
    │   │   ├── secretStore.js
    │   │   ├── settingsService.js
    │   │   └── tunnelManager.js
    │   └── tray
    ├── eslint.config.js
    ├── index.html
    ├── jsconfig.json
    ├── package.json
    ├── postcss.config.js
    ├── public
    │   └── file-icons
    ├── resources
    │   ├── icon.ico
    │   └── icon.png
    ├── src
    │   ├── App.jsx
    │   ├── components
    │   ├── editors
    │   ├── index.css
    │   ├── lib
    │   ├── main.jsx
    │   ├── pages
    │   └── store
    ├── tailwind.config.js
    └── vite.config.js
```

---

### Project Index

<details open>
	<summary><b><code>SELFHOST-HELPER/</code></b></summary>
	<!-- __root__ Submodule -->
	<details>
		<summary><b>__root__</b></summary>
		<blockquote>
			<div class='directory-path' style='padding: 8px 0; color: #666;'>
				<code><b>⦿ __root__</b></code>
			<table style='width: 100%; border-collapse: collapse;'>
			<thead>
				<tr style='background-color: #f8f9fa;'>
					<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
					<th style='text-align: left; padding: 8px;'>Summary</th>
				</tr>
			</thead>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/Dockerfile'>Dockerfile</a></b></td>
					<td style='padding: 8px;'>- Builds a containerized environment for the Electron application, ensuring consistent setup and dependencies<br>- It prepares the app for production by installing necessary packages, executing the build process, and defining a volume for release artifacts<br>- This setup facilitates streamlined deployment and distribution within the overall project architecture.</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/LICENSE'>LICENSE</a></b></td>
					<td style='padding: 8px;'>- ISC license text; see the file for full terms.</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/ChangeLog'>ChangeLog</a></b></td>
					<td style='padding: 8px;'>- Provides a comprehensive change log detailing major enhancements in resource monitoring, process management, UI responsiveness, and stability<br>- It highlights the architectures focus on reliable process control, native performance optimizations, real-time updates, and robust system integration, ensuring seamless project monitoring, control, and user experience across Windows environments.</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/jsconfig.json'>jsconfig.json</a></b></td>
					<td style='padding: 8px;'>- Defines module resolution and path aliasing configurations to streamline import statements across the project<br>- Enhances developer experience by simplifying code navigation and maintaining consistent referencing within the source directory, thereby supporting scalable and organized project architecture.</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/README.md'>README.md</a></b></td>
					<td style='padding: 8px;'>- Provides core functionality for managing local Node.js projects within the SelfHost Helper application<br>- It orchestrates project lifecycle operations, facilitates real-time log streaming, and integrates file editing and watching capabilities<br>- Serving as a central component, it ensures seamless project control, system tray interactions, and startup automation, forming the backbone of the applications architecture for efficient local development and management.</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/TODO.md'>TODO.md</a></b></td>
					<td style='padding: 8px;'>- Provides a comprehensive roadmap for developing and enhancing the SelfHost Helper application, focusing on core features, user experience improvements, and system robustness<br>- It guides the evolution of project management, process control, UI/UX refinements, and system stability, ensuring scalable, high-performance, and user-friendly functionalities within the overall architecture.</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/RELEASE_NOTES_v0.7.0.md'>RELEASE_NOTES_v0.7.0.md</a></b></td>
					<td style='padding: 8px;'>- Provides detailed release notes for SelfHost Helper v0.7.0, emphasizing significant enhancements in stability, process management, UI/UX, and developer tools<br>- Highlights include native Windows process control, advanced resource monitoring, a modern interface, integrated code editing, and improved project management features, positioning the application as a robust, industrial-grade process manager for local project hosting.</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/tailwind.config.js'>tailwind.config.js</a></b></td>
					<td style='padding: 8px;'>- Defines the design system and visual styling for the project by configuring Tailwind CSS<br>- It establishes color schemes, responsive container layouts, border radii, and animations, ensuring a cohesive and customizable user interface across pages and components<br>- This configuration supports consistent theming and responsive design within the overall application architecture.</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/eslint.config.js'>eslint.config.js</a></b></td>
					<td style='padding: 8px;'>- Defines ESLint configuration to enforce coding standards and best practices across the project<br>- It integrates recommended rules for JavaScript, React, and development tools, while customizing environment-specific settings and ignoring non-essential directories<br>- This setup ensures code quality, consistency, and maintainability within the overall architecture.</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/package.json'>package.json</a></b></td>
					<td style='padding: 8px;'>- Defines project metadata, scripts, and build configurations for SelfHost Helper, a Node.js-based desktop application<br>- Facilitates development, packaging, and distribution across platforms, integrating Electron for desktop functionality and Vite for frontend bundling<br>- Serves as the central configuration hub ensuring streamlined workflows and consistent application deployment within the overall architecture.</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/vite.config.js'>vite.config.js</a></b></td>
					<td style='padding: 8px;'>- Configures the development and build environment for a React application using Vite, establishing project structure, server settings, and build output parameters<br>- It ensures efficient module resolution, optimizes the development experience, and prepares the application for deployment by defining key build options and aliasing paths within the overall project architecture.</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/index.html'>index.html</a></b></td>
					<td style='padding: 8px;'>- Establishes the entry point and foundational structure for the SelfHost Helper web application, enabling the rendering of the user interface within a secure, optimized environment<br>- Coordinates the loading of core scripts and assets, facilitating seamless initialization and interaction with the applications features<br>- Serves as the gateway that connects the visual interface to underlying functionalities within the overall architecture.</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/postcss.config.js'>postcss.config.js</a></b></td>
					<td style='padding: 8px;'>- Configures PostCSS to integrate Tailwind CSS and autoprefixer, enabling streamlined styling workflows within the project<br>- It ensures that utility-first CSS from Tailwind is processed correctly and that vendor prefixes are automatically added for cross-browser compatibility<br>- This setup supports a consistent, maintainable, and efficient styling architecture across the entire codebase.</td>
				</tr>
			</table>
		</blockquote>
	</details>
	<!-- src Submodule -->
	<details>
		<summary><b>src</b></summary>
		<blockquote>
			<div class='directory-path' style='padding: 8px 0; color: #666;'>
				<code><b>⦿ src</b></code>
			<table style='width: 100%; border-collapse: collapse;'>
			<thead>
				<tr style='background-color: #f8f9fa;'>
					<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
					<th style='text-align: left; padding: 8px;'>Summary</th>
				</tr>
			</thead>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/main.jsx'>main.jsx</a></b></td>
					<td style='padding: 8px;'>- Initialize and render the main React application within the DOM, setting up the core user interface for the project<br>- It integrates global styles and conditionally loads a development tool for enhanced debugging during development<br>- This file serves as the entry point, orchestrating the startup process and ensuring the app is properly mounted and ready for user interaction.</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/App.jsx'>App.jsx</a></b></td>
					<td style='padding: 8px;'>- Orchestrates the applications core structure by managing routing between the Dashboard and Settings pages, handling shutdown events, and displaying global notifications<br>- It establishes the main user interface layout, integrates system shutdown signals, and ensures consistent user experience across different views within the SelfHost Helper project.</td>
				</tr>
			</table>
			<!-- pages Submodule -->
			<details>
				<summary><b>pages</b></summary>
				<blockquote>
					<div class='directory-path' style='padding: 8px 0; color: #666;'>
						<code><b>⦿ src.pages</b></code>
					<table style='width: 100%; border-collapse: collapse;'>
					<thead>
						<tr style='background-color: #f8f9fa;'>
							<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
							<th style='text-align: left; padding: 8px;'>Summary</th>
						</tr>
					</thead>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/pages/Settings.jsx'>Settings.jsx</a></b></td>
							<td style='padding: 8px;'>- Provides the user interface for managing application settings and viewing version information within the Electron-based SelfHost Helper<br>- Facilitates toggling auto-launch on startup and displays app details, integrating with backend APIs to reflect current configurations and ensure seamless user control over startup behavior and application metadata.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/pages/Dashboard.jsx'>Dashboard.jsx</a></b></td>
							<td style='padding: 8px;'>- Orchestrates the main dashboard interface by managing project selection, status updates, and real-time log streaming<br>- Facilitates user interactions for starting, stopping, and configuring projects while dynamically loading project data, file structures, and statistics<br>- Integrates various components to provide a cohesive view for monitoring and controlling multiple projects within the application architecture.</td>
						</tr>
					</table>
				</blockquote>
			</details>
			<!-- store Submodule -->
			<details>
				<summary><b>store</b></summary>
				<blockquote>
					<div class='directory-path' style='padding: 8px 0; color: #666;'>
						<code><b>⦿ src.store</b></code>
					<table style='width: 100%; border-collapse: collapse;'>
					<thead>
						<tr style='background-color: #f8f9fa;'>
							<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
							<th style='text-align: left; padding: 8px;'>Summary</th>
						</tr>
					</thead>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/store/atoms.js'>atoms.js</a></b></td>
							<td style='padding: 8px;'>- Defines and manages global application state related to projects, logs, performance metrics, file structure, editor states, and UI modals<br>- Facilitates seamless data sharing and synchronization across components, enabling efficient rendering, user interactions, and state updates within the project management and development environment<br>- Serves as the central hub for state management in the architecture.</td>
						</tr>
					</table>
				</blockquote>
			</details>
			<!-- components Submodule -->
			<details>
				<summary><b>components</b></summary>
				<blockquote>
					<div class='directory-path' style='padding: 8px 0; color: #666;'>
						<code><b>⦿ src.components</b></code>
					<table style='width: 100%; border-collapse: collapse;'>
					<thead>
						<tr style='background-color: #f8f9fa;'>
							<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
							<th style='text-align: left; padding: 8px;'>Summary</th>
						</tr>
					</thead>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/ShutdownOverlay.jsx'>ShutdownOverlay.jsx</a></b></td>
							<td style='padding: 8px;'>- Provides a full-screen overlay indicating a graceful shutdown process, visually communicating to users that projects are being stopped and data is being saved<br>- Integrates animated elements to enhance user experience during system transitions, ensuring clear feedback and reducing uncertainty during shutdown sequences within the applications architecture.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/ProjectHeader.jsx'>ProjectHeader.jsx</a></b></td>
							<td style='padding: 8px;'>- Provides an interactive header component for project management, displaying project status, name, and real-time uptime<br>- Facilitates user actions such as starting, stopping, restarting, editing settings, and deleting projects, while maintaining a responsive and visually engaging interface within the overall application architecture<br>- Enhances user experience by integrating status indicators and control buttons seamlessly.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/AddProjectDialog.jsx'>AddProjectDialog.jsx</a></b></td>
							<td style='padding: 8px;'>- Facilitates adding new projects through a user-friendly dialog interface, enabling users to specify project details such as path, name, type, start script, and icon<br>- Integrates with backend APIs to save project configurations and updates the project list dynamically, supporting efficient project management within the applications architecture.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/ViewTabs.jsx'>ViewTabs.jsx</a></b></td>
							<td style='padding: 8px;'>- Provides a tabbed interface for switching between console logs and code editor views within the application<br>- It also displays real-time system statistics such as CPU and memory usage, enhancing user awareness of resource consumption during development or debugging sessions<br>- This component integrates seamlessly into the overall architecture to facilitate interactive view management and system monitoring.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/ProjectSettingsDialog.jsx'>ProjectSettingsDialog.jsx</a></b></td>
							<td style='padding: 8px;'>- Provides a user interface for configuring and managing project settings within the application<br>- Facilitates editing project details, selecting project paths and icons, and adjusting startup behaviors<br>- Supports project deletion and ensures seamless user interactions through animations and validation, integrating with the broader architecture to enable dynamic project customization and management.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/FileTree.jsx'>FileTree.jsx</a></b></td>
							<td style='padding: 8px;'>- Provides an interactive, hierarchical file explorer component that displays project files and directories with dynamic icons and expand/collapse functionality<br>- It enables users to navigate and select files within the applications architecture, supporting seamless integration into interfaces that require visual file structure representation and user interaction with project assets.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/Sidebar.jsx'>Sidebar.jsx</a></b></td>
							<td style='padding: 8px;'>- Src/components/Sidebar.jsx`This component serves as the primary navigation and project management interface within the application<br>- It provides users with a sidebar that displays a list of projects, allowing for easy selection, reordering via drag-and-drop, and access to project-specific actions<br>- The Sidebar also integrates controls for adding new projects and navigating between different views, thereby facilitating seamless project organization and user interaction across the app<br>- Overall, it acts as the central hub for project navigation, contributing to the applications modular and user-friendly architecture.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/LogViewer.jsx'>LogViewer.jsx</a></b></td>
							<td style='padding: 8px;'>- Provides an interactive terminal interface for real-time log viewing and command input within a project environment<br>- Integrates with global state management to display logs, supports user commands with history navigation, and offers functionalities like clearing logs<br>- Facilitates seamless communication between the user and project processes, enhancing debugging and operational workflows.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/EmptyState.jsx'>EmptyState.jsx</a></b></td>
							<td style='padding: 8px;'>- Provides a user-friendly placeholder interface indicating no project is currently selected, guiding users to manage existing projects or create new ones<br>- It enhances the overall user experience by offering clear visual cues and an actionable button, supporting seamless navigation within the applications project management architecture.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/EditorView.jsx'>EditorView.jsx</a></b></td>
							<td style='padding: 8px;'>- Provides a comprehensive code editing interface within a project workspace, integrating a file explorer, syntax-aware editor, and file management functionalities<br>- Facilitates seamless file navigation, real-time content loading, and saving capabilities, supporting an efficient development workflow<br>- Ensures user-friendly interactions with dynamic resizing, error handling, and keyboard shortcuts, contributing to an intuitive and productive coding environment.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/TunnelView.jsx'>TunnelView.jsx</a></b></td>
							<td style='padding: 8px;'>- Provides the tunnel configuration and control UI for Cloudflare tunnels (quick and authenticated modes)<br>- Allows users to set port, mode, and optional token, start/stop tunnels, and optionally auto-start with the project.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/TunnelLogViewer.jsx'>TunnelLogViewer.jsx</a></b></td>
							<td style='padding: 8px;'>- Displays real-time tunnel output and logs for the selected project within the tunnel tab.</td>
						</tr>
					</table>
					<!-- ui Submodule -->
					<details>
						<summary><b>ui</b></summary>
						<blockquote>
							<div class='directory-path' style='padding: 8px 0; color: #666;'>
								<code><b>⦿ src.components.ui</b></code>
							<table style='width: 100%; border-collapse: collapse;'>
							<thead>
								<tr style='background-color: #f8f9fa;'>
									<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
									<th style='text-align: left; padding: 8px;'>Summary</th>
								</tr>
							</thead>
								<tr style='border-bottom: 1px solid #eee;'>
									<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/ui/input.jsx'>input.jsx</a></b></td>
									<td style='padding: 8px;'>- Defines a reusable, styled input component integrated into the applications UI library, facilitating consistent user input handling across various forms and interfaces<br>- It enhances the overall architecture by providing a flexible, accessible, and visually cohesive element that can be easily customized and extended within the component ecosystem.</td>
								</tr>
								<tr style='border-bottom: 1px solid #eee;'>
									<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/ui/card.jsx'>card.jsx</a></b></td>
									<td style='padding: 8px;'>- Provides a set of reusable, styled UI components for building consistent card layouts within the application<br>- These components facilitate the creation of visually cohesive cards with distinct sections such as headers, titles, descriptions, content, and footers, supporting a modular and maintainable approach to UI design across the codebase.</td>
								</tr>
								<tr style='border-bottom: 1px solid #eee;'>
									<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/ui/label.jsx'>label.jsx</a></b></td>
									<td style='padding: 8px;'>- Defines a reusable label component that standardizes text styling and accessibility within the user interface<br>- It integrates Radix UI primitives with custom styling, ensuring consistent appearance and behavior across form elements<br>- This component enhances the overall architecture by promoting modularity, accessibility, and design consistency in form-related UI elements.</td>
								</tr>
								<tr style='border-bottom: 1px solid #eee;'>
									<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/ui/switch.jsx'>switch.jsx</a></b></td>
									<td style='padding: 8px;'>- Provides a reusable toggle switch component designed for user interface interactions, enabling users to easily switch between binary states such as on and off<br>- Integrates accessibility features and visual feedback to enhance user experience, serving as a fundamental UI element within the broader component library to ensure consistency and accessibility across the application.</td>
								</tr>
								<tr style='border-bottom: 1px solid #eee;'>
									<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/ui/select.jsx'>select.jsx</a></b></td>
									<td style='padding: 8px;'>- Provides a customizable, accessible dropdown select component built with Radix UI primitives and React<br>- Facilitates consistent styling, keyboard navigation, and smooth animations for select menus across the application, enhancing user experience and interface cohesion within the overall architecture.</td>
								</tr>
								<tr style='border-bottom: 1px solid #eee;'>
									<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/ui/button.jsx'>button.jsx</a></b></td>
									<td style='padding: 8px;'>- Defines a versatile, styled button component for the UI library, supporting multiple visual variants and sizes<br>- Facilitates consistent button appearance and behavior across the application, enabling easy customization and accessibility<br>- Serves as a foundational element within the component architecture, promoting reusable and maintainable UI patterns.</td>
								</tr>
								<tr style='border-bottom: 1px solid #eee;'>
									<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/ui/textarea.jsx'>textarea.jsx</a></b></td>
									<td style='padding: 8px;'>- Provides a reusable, styled textarea component integral to the user interface, enabling consistent and accessible multi-line text input across the application<br>- It enhances the overall architecture by encapsulating styling and behavior, promoting maintainability and a cohesive user experience within the component-based design system.</td>
								</tr>
								<tr style='border-bottom: 1px solid #eee;'>
									<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/ui/titleBar.jsx'>titleBar.jsx</a></b></td>
									<td style='padding: 8px;'>- Provides a custom title bar component for the applications user interface, enabling window management actions such as minimize, maximize, and close<br>- It dynamically reflects window state changes and integrates with the underlying window API to facilitate seamless window control within the desktop environment, contributing to a cohesive and user-friendly application architecture.</td>
								</tr>
								<tr style='border-bottom: 1px solid #eee;'>
									<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/ui/dialog.jsx'>dialog.jsx</a></b></td>
									<td style='padding: 8px;'>- Defines a reusable, accessible dialog component suite for the user interface, enabling consistent modal interactions across the application<br>- It encapsulates dialog structure, overlay effects, and close functionality, facilitating seamless integration of modal dialogs that enhance user experience and maintain visual consistency within the overall architecture.</td>
								</tr>
								<tr style='border-bottom: 1px solid #eee;'>
									<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/components/ui/context-menu.jsx'>context-menu.jsx</a></b></td>
									<td style='padding: 8px;'>- Radix UI-based context menu component for right-click menus across the application.</td>
								</tr>
							</table>
						</blockquote>
					</details>
				</blockquote>
			</details>
			<!-- editors Submodule -->
			<details>
				<summary><b>editors</b></summary>
				<blockquote>
					<div class='directory-path' style='padding: 8px 0; color: #666;'>
						<code><b>⦿ src.editors</b></code>
					<table style='width: 100%; border-collapse: collapse;'>
					<thead>
						<tr style='background-color: #f8f9fa;'>
							<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
							<th style='text-align: left; padding: 8px;'>Summary</th>
						</tr>
					</thead>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/editors/MonacoEditor.jsx'>MonacoEditor.jsx</a></b></td>
							<td style='padding: 8px;'>- Provides a React component integrating the Monaco Editor to enable rich, customizable code editing within the application<br>- It supports syntax highlighting, theme customization, and language-specific compiler options, facilitating an interactive development environment<br>- This component plays a central role in the code editing architecture, ensuring a seamless and flexible user experience for editing code snippets across different languages.</td>
						</tr>
					</table>
				</blockquote>
			</details>
			<!-- lib Submodule -->
			<details>
				<summary><b>lib</b></summary>
				<blockquote>
					<div class='directory-path' style='padding: 8px 0; color: #666;'>
						<code><b>⦿ src.lib</b></code>
					<table style='width: 100%; border-collapse: collapse;'>
					<thead>
						<tr style='background-color: #f8f9fa;'>
							<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
							<th style='text-align: left; padding: 8px;'>Summary</th>
						</tr>
					</thead>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/lib/utils.js'>utils.js</a></b></td>
							<td style='padding: 8px;'>- Provides a utility function that consolidates class name management by combining conditional class names with Tailwind CSS merging capabilities<br>- It streamlines styling logic across the codebase, ensuring consistent and conflict-free application of styles within the project’s component architecture<br>- This enhances maintainability and visual consistency throughout the user interface.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/src/lib/materialIcons.js'>materialIcons.js</a></b></td>
							<td style='padding: 8px;'>- This code file, <code>materialIcons.js</code>, serves as a mapping utility within the project’s architecture, categorizing various file extensions and filenames into their corresponding material icon types<br>- Its primary purpose is to facilitate consistent and intuitive visual representation of files across the application, enhancing user experience by enabling the interface to display appropriate icons based on file types<br>- This contributes to the overall design system by ensuring that files are easily recognizable, supporting the projects goal of providing a clear, organized, and user-friendly environment for managing diverse code and document formats.</td>
						</tr>
					</table>
				</blockquote>
			</details>
		</blockquote>
	</details>
	<!-- electron Submodule -->
	<details>
		<summary><b>electron</b></summary>
		<blockquote>
			<div class='directory-path' style='padding: 8px 0; color: #666;'>
				<code><b>⦿ electron</b></code>
			<table style='width: 100%; border-collapse: collapse;'>
			<thead>
				<tr style='background-color: #f8f9fa;'>
					<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
					<th style='text-align: left; padding: 8px;'>Summary</th>
				</tr>
			</thead>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/main.js'>main.js</a></b></td>
					<td style='padding: 8px;'>- Orchestrates the Electron applications main process by initializing the user interface, managing system tray interactions, handling media protocol requests, and coordinating startup and shutdown procedures<br>- Ensures seamless integration between the UI, background services, and project management, facilitating efficient operation, resource cleanup, and user interaction within the overall architecture.</td>
				</tr>
				<tr style='border-bottom: 1px solid #eee;'>
					<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/preload.js'>preload.js</a></b></td>
					<td style='padding: 8px;'>- Facilitates secure communication between the Electron renderer process and main process by exposing a comprehensive API for managing projects, files, logs, application settings, and window controls<br>- Enables seamless integration of user interactions with core functionalities, ensuring smooth operation and real-time updates within the applications architecture.</td>
				</tr>
			</table>
			<!-- tray Submodule -->
			<details>
				<summary><b>tray</b></summary>
				<blockquote>
					<div class='directory-path' style='padding: 8px 0; color: #666;'>
						<code><b>⦿ electron.tray</b></code>
					<table style='width: 100%; border-collapse: collapse;'>
					<thead>
						<tr style='background-color: #f8f9fa;'>
							<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
							<th style='text-align: left; padding: 8px;'>Summary</th>
						</tr>
					</thead>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/tray/tray.js'>tray.js</a></b></td>
							<td style='padding: 8px;'>- Provides system tray integration for managing application visibility and server processes<br>- Facilitates user interaction through a context menu to start, stop, and restart individual or all projects, while also enabling quick access to show or hide the main window and quit the application<br>- Enhances user experience by offering streamlined control within the desktop environment.</td>
						</tr>
					</table>
				</blockquote>
			</details>
			<!-- ipc Submodule -->
			<details>
				<summary><b>ipc</b></summary>
				<blockquote>
					<div class='directory-path' style='padding: 8px 0; color: #666;'>
						<code><b>⦿ electron.ipc</b></code>
					<table style='width: 100%; border-collapse: collapse;'>
					<thead>
						<tr style='background-color: #f8f9fa;'>
							<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
							<th style='text-align: left; padding: 8px;'>Summary</th>
						</tr>
					</thead>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/ipc/handlers.js'>handlers.js</a></b></td>
							<td style='padding: 8px;'>- Defines IPC handlers to facilitate communication between the Electron renderer process and main process, managing project lifecycle, file operations, application settings, window controls, and external integrations<br>- Serves as the central interface for orchestrating core functionalities, ensuring seamless interaction within the applications architecture and enabling features like project management, file handling, auto-launch, and external URL access.</td>
						</tr>
					</table>
				</blockquote>
			</details>
			<!-- job Submodule -->
			<details>
				<summary><b>job</b></summary>
				<blockquote>
					<div class='directory-path' style='padding: 8px 0; color: #666;'>
						<code><b>⦿ electron.job</b></code>
					<table style='width: 100%; border-collapse: collapse;'>
					<thead>
						<tr style='background-color: #f8f9fa;'>
							<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
							<th style='text-align: left; padding: 8px;'>Summary</th>
						</tr>
					</thead>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/job/job.cpp'>job.cpp</a></b></td>
							<td style='padding: 8px;'>- Defines a Windows-specific Job Object interface for process management within the application<br>- Facilitates creating, assigning processes, retrieving resource usage statistics, terminating, and closing job handles, enabling efficient group control and monitoring of processes in the overall architecture<br>- This component ensures robust process isolation, resource accounting, and cleanup in the systems process lifecycle management.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/job/job.h'>job.h</a></b></td>
							<td style='padding: 8px;'>- Defines a native module for managing Windows job objects within the Electron environment, enabling process grouping, resource control, and lifecycle management<br>- Facilitates interaction between Node.js and Windows APIs to assign processes, retrieve status, terminate, and close job handles, supporting robust process supervision and resource isolation in the applications architecture.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/job/package.json'>package.json</a></b></td>
							<td style='padding: 8px;'>- Defines the package configuration for the job-addon module, enabling seamless integration of native C++ functionalities into the Electron applications architecture<br>- Facilitates building and installing native extensions through node-gyp, ensuring efficient communication between Electrons JavaScript environment and underlying native code components within the overall project ecosystem.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/job/index.js'>index.js</a></b></td>
							<td style='padding: 8px;'>- Provides an interface for managing native job objects within the Electron application, enabling creation, process assignment, and cleanup of background tasks<br>- Facilitates seamless integration of native modules for job handling, ensuring proper resource management and error handling in the applications architecture<br>- Acts as a bridge between JavaScript and native code to support robust job lifecycle operations.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/job/binding.gyp'>binding.gyp</a></b></td>
							<td style='padding: 8px;'>- Defines the build configuration for the native job processing module within the Electron application, enabling seamless integration of C++ code with Node.js<br>- It orchestrates compilation, dependencies, and platform-specific settings to facilitate efficient execution of background job tasks, contributing to the overall architecture by extending Electron’s capabilities with high-performance native functionalities.</td>
						</tr>
					</table>
				</blockquote>
			</details>
			<!-- services Submodule -->
			<details>
				<summary><b>services</b></summary>
				<blockquote>
					<div class='directory-path' style='padding: 8px 0; color: #666;'>
						<code><b>⦿ electron.services</b></code>
					<table style='width: 100%; border-collapse: collapse;'>
					<thead>
						<tr style='background-color: #f8f9fa;'>
							<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
							<th style='text-align: left; padding: 8px;'>Summary</th>
						</tr>
					</thead>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/services/filesWatcher.js'>filesWatcher.js</a></b></td>
							<td style='padding: 8px;'>- Facilitates real-time monitoring of specified directories for file changes, additions, and deletions within the Electron application<br>- It ensures the application remains synchronized with filesystem updates by detecting modifications and notifying the main process to trigger appropriate responses<br>- This component is essential for maintaining dynamic, responsive interactions based on filesystem activity across the project architecture.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/services/database.js'>database.js</a></b></td>
							<td style='padding: 8px;'>- Provides database initialization and management for the application, establishing a persistent SQLite storage tailored to development or production environments<br>- Ensures seamless connection, schema synchronization, and data integrity by setting up the Project model with unique identifiers and order attributes<br>- Facilitates reliable data operations within the overall architecture, supporting project data persistence and consistency across sessions.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/services/projectsManager.js'>projectsManager.js</a></b></td>
							<td style='padding: 8px;'>- The <code>electron/services/projectsManager.js</code> file serves as the central orchestrator for managing project processes within the application<br>- Its primary purpose is to oversee the lifecycle of project instances—initiating, monitoring, and terminating them—while maintaining real-time status updates and process information<br>- This module facilitates seamless coordination between project execution and the applications user interface, ensuring users receive accurate, up-to-date insights into project states<br>- Overall, it acts as the backbone for project process management, enabling robust control and observability within the applications architecture.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/services/processTree.js'>processTree.js</a></b></td>
							<td style='padding: 8px;'>- Provides cross-platform utilities to identify, analyze, and manage process trees related to specific project roots<br>- Facilitates retrieving process details, constructing process hierarchies, and terminating entire process groups reliably on Windows and Unix systems, supporting robust project lifecycle management and cleanup within the applications architecture.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/services/logger.js'>logger.js</a></b></td>
							<td style='padding: 8px;'>- Provides centralized logging functionality for the Electron application, capturing runtime events, errors, and system messages<br>- Ensures persistent log storage in the user data directory, supports real-time console output with color-coded severity levels, and handles global error events to facilitate debugging and application monitoring within the overall architecture.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/services/tunnelManager.js'>tunnelManager.js</a></b></td>
							<td style='padding: 8px;'>- Manages Cloudflare tunnel lifecycle (quick and authenticated) via the cloudflared package<br>- Handles start/stop, status, logs, and graceful shutdown of tunnels per project.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/services/settingsService.js'>settingsService.js</a></b></td>
							<td style='padding: 8px;'>- Application settings persistence using st.db (JSON file in user data directory)<br>- Manages options such as clearLogsBeforeStart and other app-level preferences.</td>
						</tr>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/electron/services/secretStore.js'>secretStore.js</a></b></td>
							<td style='padding: 8px;'>- Encrypts and decrypts sensitive values (e.g. tunnel tokens) using Electron safeStorage for machine-bound secrets.</td>
						</tr>
					</table>
				</blockquote>
			</details>
		</blockquote>
	</details>
	<!-- database Submodule -->
	<details>
		<summary><b>database</b></summary>
		<blockquote>
			<div class='directory-path' style='padding: 8px 0; color: #666;'>
				<code><b>⦿ database</b></code>
			<!-- models Submodule -->
			<details>
				<summary><b>models</b></summary>
				<blockquote>
					<div class='directory-path' style='padding: 8px 0; color: #666;'>
						<code><b>⦿ database.models</b></code>
					<table style='width: 100%; border-collapse: collapse;'>
					<thead>
						<tr style='background-color: #f8f9fa;'>
							<th style='width: 30%; text-align: left; padding: 8px;'>File Name</th>
							<th style='text-align: left; padding: 8px;'>Summary</th>
						</tr>
					</thead>
						<tr style='border-bottom: 1px solid #eee;'>
							<td style='padding: 8px;'><b><a href='https://github.com/DevRoots-Studio/SelfHost-Helper/blob/main/database/models/Project.js'>Project.js</a></b></td>
							<td style='padding: 8px;'>- Defines the Project data model within the database schema, encapsulating core attributes such as project identification, configuration, environment variables, and metadata<br>- Serves as the foundational structure for managing project entities, enabling consistent storage, retrieval, and manipulation of project-related information across the application architecture.</td>
						</tr>
					</table>
				</blockquote>
			</details>
		</blockquote>
	</details>
</details>

---

## Getting Started

### Prerequisites

This project requires the following dependencies:

- **Programming Language:** JavaScript
- **Package Manager:** Npm
- **Container Runtime:** Docker

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

| Script                 | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| `npm run dev`          | Start development (Vite + Electron)                           |
| `npm run build`        | Build for production (Vite + electron-builder)                |
| `npm run build:dev`    | Build dev variant (different appId, output in `release-dev/`) |
| `npm run build:prod`   | Build production variant explicitly                           |
| `npm run lint`         | Run ESLint                                                    |
| `npm run format`       | Format code with Prettier                                     |
| `npm run format:check` | Check formatting with Prettier                                |

### Testing

There is no automated test suite yet. Code quality is enforced via ESLint (and Prettier for formatting).

---

## Roadmap

The project roadmap and phased development plan are maintained in **[MyToDo.md](MyToDo.md)** (current plan, phases 1–4) and **[TODO.md](TODO.md)**. They cover core features, editor stability, cloud integration planning, and system robustness. See those files for the current list of planned and completed items.

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
