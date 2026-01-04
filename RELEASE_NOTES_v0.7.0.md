# 🚀 SelfHost Helper v0.7.0 - The Evolution Update

SelfHost Helper has grown from a simple shell wrapper into a full-featured, industrial-grade process manager. This v0.7.0 release marks a massive leap in stability, aesthetics, and developer experience.

If you are coming from our first release, you are practically using a new application. Here is everything that has changed:

---

### 🏗️ 1. The New Core: Industrial-Grade Stability

- **Windows Job Objects (Native C++)**: We've integrated a custom C++ module that utilizes Windows Job Objects. This ensures the Windows kernel itself terminates every child process when the app closes. **Zero orphaned processes, guaranteed.**
- **Advanced Process Tree Monitoring**: Real-time CPU and RAM usage now sums up the entire process tree (e.g., if you run a Vite server, we track the shell, node, and all sub-workers).
- **Dynamic Supervisor Detection**: The app intelligently detects if you are using Nodemon, Vite, PM2, or Uvicorn to manage your status correctly, even if the main shell closes.
- **Zombie Protection**: Automatically detects and cleans up "leaked" processes from previous crashed sessions upon startup.

### 🎨 2. Premium UI/UX Redesign

- **Frameless Glassmorphism**: A completely modern, translucent interface with custom drag regions and backdrop blur for a premium look.
- **Full Material Icon Integration**: Integrated 1,100+ high-quality SVG icons with a mapping logic covering 3,100+ file extensions and filenames.
- **Jotai State Management**: Switched to an atomic state model, eliminating UI lag and ensuring 1:1 sync between the dashboard and the system tray.
- **Refined Animations**: Powered by Framer Motion, every dialog and transition feels fluid and responsive.

### 📂 3. Integrated Developer Environment

- **Monaco Code Editor**: Professional-grade built-in editor with syntax highlighting and directory navigation.
- **Interactive Terminal**: Full ANSI color support, command history (Ctrl + ↑/↓), and the ability to copy console output directly (Ctrl + C).
- **Project-Specific Editor State**: Isolated "last opened file" state per project. The app remembers exactly where you left off for every server.
- **File Explorer**: A dedicated sidebar for navigating project files without leaving the dashboard.

### 🛠️ 4. Advanced Project Management

- **Universal Media Protocol**: A rewritten asset engine that allows loading project icons from any drive or partition (G:, D:, etc.) flawlessly.
- **Input Debouncing**: Smart 400ms delay on all path/icon inputs to prevent UI hangs while typing.
- **Smart Script Suggestions**: Automatically suggests startup commands based on your project type (Node.js, Python, Minecraft, Go, etc.).
- **System Tray 2.0**: Bulk "Start All/Stop All" controls and individual server submenus directly in your taskbar.
- **Global Toast Notifications**: Instant visual feedback for status changes, errors, and file saves using `react-toastify`.

---

### � Major Technical Updates:

- **ASAR Compatibility**: Native modules are now correctly handled in packaged production builds.
- **Secure File Access**: Hardened Content Security Policy (CSP) for safe local image loading.
- **Snap-Fast Shutdown**: Optimized the cleanup logic to make the app close instantly without sacrificing system state.
- **MIME Support**: Expanded support for `.ico`, `.webp`, `.bmp`, `.tiff`, and `.svg`.

---

### 🏁 Comparison with First Release

| Feature                 | First Release   | v0.7.0 (Current)                   |
| :---------------------- | :-------------- | :--------------------------------- |
| **Process Control**     | Simple Kill     | Native Windows Job Objects         |
| **Resource Monitoring** | Basic PID       | Full Tree Aggregation (CPU/RAM)    |
| **UI Type**             | OS Default      | Custom Glassmorphism Frameless     |
| **Code Editor**         | Basic Highlight | Full Monaco Editor Integration     |
| **Icons**               | None            | 1,100+ Material Icons              |
| **Tray Support**        | Basic           | Dynamic Bulk & Individual Controls |
| **Stability**           | Manual          | Automatic Zombie Protection        |

---

### 🛠️ Known Issues & Feedback

We strive for perfection! If you encounter any issues, please [report them on GitHub](https://github.com/AboMeezO/SelfHost-Helper/issues).

**Download v0.7.0 now to experience the future of local project hosting.**
