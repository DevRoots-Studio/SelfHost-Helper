import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Play,
  Square,
  RefreshCw,
  Terminal,
  FileCode,
  Settings,
  FolderOpen,
  Save,
  Trash2,
  Folder as FolderIcon,
  History,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import MonacoEditor from "@/editors/MonacoEditor";
import { cn } from "@/lib/utils";
// New Components
import FileTree from "@/components/FileTree";
import LogViewer from "@/components/LogViewer"; // Assuming created

const API = window.api;

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [logs, setLogs] = useState({});
  const [viewMode, setViewMode] = useState("logs");
  const [editorContent, setEditorContent] = useState("");
  const [currentFile, setCurrentFile] = useState(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileLoadError, setFileLoadError] = useState(null);

  // Detect language from file extension
  const getLanguageFromPath = (filePath) => {
    if (!filePath) return "plaintext";
    const ext = filePath.split(".").pop()?.toLowerCase();
    const languageMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      json: "json",
      html: "html",
      css: "css",
      scss: "scss",
      sass: "sass",
      py: "python",
      java: "java",
      c: "c",
      cpp: "cpp",
      cs: "csharp",
      php: "php",
      rb: "ruby",
      go: "go",
      rs: "rust",
      sh: "shell",
      bash: "shell",
      yml: "yaml",
      yaml: "yaml",
      xml: "xml",
      md: "markdown",
      sql: "sql",
      vue: "vue",
      svelte: "svelte",
    };
    return languageMap[ext] || "plaintext";
  };

  // File Tree State
  const [fileTree, setFileTree] = useState([]);
  const [isFileTreeLoading, setIsFileTreeLoading] = useState(false);

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    path: "",
    script: "npm start",
  });

  useEffect(() => {
    loadProjects();
    loadAutoLaunchStatus();
    const cleanupStatus = API.onStatusChange(({ projectId, status }) => {
      setProjects((prev) => {
        const updated = prev.map((p) =>
          p.id === projectId ? { ...p, status } : p
        );
        return updated;
      });
      // Update selectedProject if it matches the projectId
      setSelectedProject((prevSelected) => {
        if (prevSelected?.id === projectId) {
          return { ...prevSelected, status };
        }
        return prevSelected;
      });
    });
    const cleanupLogs = API.onLog(({ projectId, data, type, timestamp }) => {
      setLogs((prev) => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), { data, type, timestamp }],
      }));
    });

    return () => {
      cleanupStatus();
      cleanupLogs();
      API.removeAllListeners("project:status");
      API.removeAllListeners("project:log");
    };
  }, [selectedProject?.id]);

  const loadAutoLaunchStatus = async () => {
    try {
      const enabled = await API.isAutoLaunchEnabled();
      setAutoLaunchEnabled(enabled);
    } catch (e) {
      console.error("Failed to load auto-launch status", e);
    }
  };

  const handleAutoLaunchToggle = async (enabled) => {
    try {
      if (enabled) {
        await API.enableAutoLaunch();
      } else {
        await API.disableAutoLaunch();
      }
      setAutoLaunchEnabled(enabled);
    } catch (e) {
      console.error("Failed to toggle auto-launch", e);
    }
  };

  // Fetch log history when selecting a project
  useEffect(() => {
    if (selectedProject) {
      // Reload projects to ensure status is synced when switching
      const syncProjectStatus = async () => {
        const list = await API.getProjects();
        setProjects(list);
        // Update selectedProject with the latest data from projects array
        const updatedProject = list.find((p) => p.id === selectedProject.id);
        if (updatedProject) {
          setSelectedProject(updatedProject);
        }
      };
      syncProjectStatus();

      API.getLogHistory(selectedProject.id).then((history) => {
        if (history && history.length > 0) {
          setLogs((prev) => ({
            ...prev,
            [selectedProject.id]: history,
          }));
        }
      });

      // Load File Tree
      loadFileTree(selectedProject.path);
    }
  }, [selectedProject?.id]);

  const loadFileTree = async (path) => {
    setIsFileTreeLoading(true);
    const tree = await API.readDirectory(path);
    setFileTree(tree);
    setIsFileTreeLoading(false);
  };

  const loadProjects = async () => {
    const list = await API.getProjects();
    setProjects(list);
  };

  const handleStart = (id) => API.startProject(id);
  const handleStop = (id) => API.stopProject(id);
  const handleRestart = (id) => API.restartProject(id);

  const handleSendInput = (id, data) => {
    API.sendInput(id, data);
  };

  const handleAddProject = async () => {
    if (newProject.name && newProject.path) {
      await API.addProject(newProject);
      loadProjects();
      setIsAddOpen(false);
      setNewProject({ name: "", path: "", script: "npm start" });
    }
  };

  const handleBrowseValues = async () => {
    const path = await API.selectDirectory();
    if (path) {
      setNewProject((prev) => ({ ...prev, path }));
      // Auto guess name?
      const name = path.split("\\").pop().split("/").pop();
      if (!newProject.name) setNewProject((prev) => ({ ...prev, name }));
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to remove this project?")) {
      await API.deleteProject(id);
      loadProjects();
      if (selectedProject?.id === id) setSelectedProject(null);
    }
  };

  // When clicking a file in tree
  const handleFileSelect = async (node) => {
    if (node.type === "file") {
      console.log("Loading file:", node.path);
      setIsFileLoading(true);
      setFileLoadError(null);
      setCurrentFile(node.path);
      setViewMode("editor");
      setEditorContent(""); // Clear previous content

      try {
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("File read timeout after 10 seconds")),
            10000
          )
        );

        const contentPromise = API.readFile(node.path);
        const content = await Promise.race([contentPromise, timeoutPromise]);

        console.log("File loaded successfully, length:", content?.length || 0);
        setEditorContent(content || "");
        setFileLoadError(null);
      } catch (e) {
        console.error("Failed to read file", e);
        const errorMessage = e?.message || e?.toString() || "Unknown error";
        setFileLoadError(`Failed to load file: ${errorMessage}`);
        setEditorContent("");
      } finally {
        setIsFileLoading(false);
      }
    }
  };

  const handleSaveFile = async () => {
    if (currentFile && editorContent) {
      await API.writeFile(currentFile, editorContent);
      alert("Saved!");
    }
  };

  const activeLogs = selectedProject ? logs[selectedProject.id] || [] : [];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-muted/20 border-r border-border flex flex-col backdrop-blur-xl">
        <div className="p-4 border-b border-border/50 flex justify-between items-center bg-card/50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Terminal className="text-white h-5 w-5" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">SelfHost</h1>
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="hover:bg-primary/20 hover:text-primary"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
              <DialogHeader>
                <DialogTitle>Add Project</DialogTitle>
                <DialogDescription>
                  Select a Node.js project directory to manage.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="path">Project Path</Label>
                  <div className="flex gap-2">
                    <Input
                      id="path"
                      value={newProject.path}
                      readOnly
                      placeholder="Select a directory..."
                      className="bg-muted/50"
                    />
                    <Button variant="secondary" onClick={handleBrowseValues}>
                      <FolderIcon className="mr-2 h-4 w-4" /> Browse
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, name: e.target.value })
                    }
                    placeholder="My Server"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="script">Start Script</Label>
                  <Input
                    id="script"
                    value={newProject.script}
                    onChange={(e) =>
                      setNewProject({ ...newProject, script: e.target.value })
                    }
                    placeholder="npm start"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddProject} disabled={!newProject.path}>
                  Add Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProject(p)}
              className={cn(
                "group p-3 rounded-lg cursor-pointer flex items-center justify-between transition-all border border-transparent select-none",
                selectedProject?.id === p.id
                  ? "bg-accent/10 border-border bg-linear-to-r from-secondary/50 to-transparent shadow-sm"
                  : "hover:bg-accent/50 hover:border-border/50"
              )}
            >
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground truncate opacity-70">
                  {p.path}
                </span>
              </div>
              <motion.div
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  p.status === "running" ? "bg-green-500" : "bg-red-500/20"
                )}
                animate={{
                  scale: p.status === "running" ? [1, 1.2, 1] : 1,
                  opacity: p.status === "running" ? [0.8, 1, 0.8] : 0.5,
                }}
                transition={{
                  duration: 2,
                  repeat: p.status === "running" ? Infinity : 0,
                  ease: "easeInOut",
                }}
                style={{
                  boxShadow:
                    p.status === "running"
                      ? "0 0 8px rgba(34, 197, 94, 0.5), 0 0 16px rgba(34, 197, 94, 0.3)"
                      : "none",
                }}
              />
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border bg-card/30">
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
              >
                <Settings className="mr-2 h-4 w-4" /> Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </DialogTitle>
                <DialogDescription>
                  Configure application preferences and behavior.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                {/* Auto Launch Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor="auto-launch"
                        className="text-base font-semibold cursor-pointer"
                      >
                        Launch on Startup
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically start SelfHost Helper when your computer
                        boots up.
                      </p>
                    </div>
                    <Switch
                      id="auto-launch"
                      checked={autoLaunchEnabled}
                      onCheckedChange={handleAutoLaunchToggle}
                      className="ml-4"
                    />
                  </div>
                </div>

                {/* App Info Section */}
                <div className="space-y-2 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    About
                  </h3>
                  <div className="p-4 rounded-lg border border-border bg-muted/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                        <Terminal className="text-white h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold">SelfHost Helper</p>
                        <p className="text-xs text-muted-foreground">
                          Version 1.0.0
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Manage and monitor your self-hosted Node.js applications
                      with ease.
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background/50 relative">
        {selectedProject ? (
          <>
            <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {selectedProject.name}
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border uppercase tracking-wider font-bold text-[10px]",
                      selectedProject.status === "running"
                        ? "border-green-500/30 text-green-500 bg-green-500/10"
                        : "border-red-500/30 text-red-500 bg-red-500/10"
                    )}
                  >
                    {selectedProject.status || "stopped"}
                  </span>
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                <AnimatePresence mode="wait">
                  {selectedProject.status === "running" ? (
                    <motion.div
                      key="running-buttons"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center space-x-2"
                    >
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleStop(selectedProject.id)}
                        className="shadow-lg shadow-red-900/20 active:scale-95 transition-transform"
                      >
                        <Square className="mr-2 h-4 w-4 fill-current" /> Stop
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRestart(selectedProject.id)}
                        className="active:scale-95 transition-transform"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" /> Restart
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="start-button"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/20 text-white active:scale-95 transition-transform"
                        onClick={() => handleStart(selectedProject.id)}
                      >
                        <Play className="mr-2 h-4 w-4 fill-current" /> Start
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="h-6 w-px bg-border mx-2"></div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => handleDelete(selectedProject.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </header>

            <div className="flex-1 flex flex-col min-h-0">
              {/* Tabs area */}
              <div className="flex border-b border-border bg-muted/10">
                <button
                  onClick={() => setViewMode("logs")}
                  className={cn(
                    "px-6 py-3 text-sm font-medium border-b-2 transition-all flex items-center focus:outline-none",
                    viewMode === "logs"
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
                  )}
                >
                  <Terminal className="mr-2 h-4 w-4" /> Console
                </button>
                <button
                  onClick={() => {
                    setViewMode("editor");
                  }}
                  className={cn(
                    "px-6 py-3 text-sm font-medium border-b-2 transition-all flex items-center focus:outline-none",
                    viewMode === "editor"
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
                  )}
                >
                  <FileCode className="mr-2 h-4 w-4" /> Editor
                </button>
              </div>

              <div className="flex-1 overflow-hidden relative">
                {viewMode === "logs" ? (
                  <div className="h-full p-0">
                    <LogViewer
                      logs={activeLogs}
                      projectId={selectedProject.id}
                      onSendInput={handleSendInput}
                    />
                  </div>
                ) : (
                  <div className="h-full flex">
                    {/* Editor Sidebar (File Tree) */}
                    <div className="w-64 border-r border-border bg-card/30 flex flex-col">
                      <div className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/20">
                        Explorer
                      </div>
                      <div className="flex-1 overflow-hidden">
                        {isFileTreeLoading ? (
                          <div className="p-4 text-xs text-muted-foreground">
                            Loading...
                          </div>
                        ) : (
                          <FileTree
                            files={fileTree}
                            onSelectFile={handleFileSelect}
                            selectedPath={currentFile}
                          />
                        )}
                      </div>
                    </div>
                    {/* Editor Main */}
                    <div className="flex-1 flex flex-col bg-background">
                      <div className="p-2 flex items-center justify-between text-xs border-b border-border bg-muted/20 h-10">
                        <div className="flex items-center space-x-2 flex-1 px-2">
                          {currentFile ? (
                            <span className="flex items-center text-muted-foreground">
                              <FileCode className="h-3 w-3 mr-2" />
                              {currentFile.replace(selectedProject.path, "")}
                            </span>
                          ) : (
                            <span className="opacity-50">
                              Select a file to edit
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={handleSaveFile}
                            disabled={!currentFile}
                          >
                            <Save className="h-3 w-3 mr-1" /> Save
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1">
                        {currentFile ? (
                          isFileLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="mb-4"
                              >
                                <FileCode className="h-12 w-12 opacity-50" />
                              </motion.div>
                              <p className="text-sm">Loading file...</p>
                            </div>
                          ) : fileLoadError ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                              <FileCode className="h-12 w-12 mb-4 text-destructive opacity-50" />
                              <p className="text-sm text-destructive mb-2">
                                {fileLoadError}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const node = {
                                    type: "file",
                                    path: currentFile,
                                  };
                                  handleFileSelect(node);
                                }}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" /> Retry
                              </Button>
                            </div>
                          ) : (
                            <MonacoEditor
                              value={editorContent}
                              onChange={setEditorContent}
                              language={getLanguageFromPath(currentFile)}
                            />
                          )
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                            <FolderOpen className="h-10 w-10 mb-2" />
                            <p>Select a file from the explorer</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col bg-radial-gradient">
            <div className="p-8 bg-muted/20 rounded-full mb-6 ring-1 ring-border shadow-2xl animate-in fade-in zoom-in duration-500">
              <Terminal className="h-16 w-16 opacity-50 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-2 text-foreground">
              No Project Selected
            </h3>
            <p className="max-w-md text-center text-muted-foreground">
              Select a project from the sidebar or create a new one to get
              started handling your self-hosted apps.
            </p>
            <Button className="mt-8" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create New Project
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
