import React, { useState, useEffect } from "react";
import { Folder as FolderIcon, Image as ImageIcon, Download, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAtom } from "jotai";
import { isAddProjectModalOpenAtom } from "@/store/atoms";
import { Switch } from "@/components/ui/switch";

const API = window.api;

const PROJECT_TYPES = [
  {
    value: "nodejs",
    label: "Node.js",
    script: "npm install && npm start",
    icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg",
  },
  {
    value: "react",
    label: "React",
    script: "npm install && npm run dev",
    icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg",
  },
  {
    value: "python",
    label: "Python",
    script: "pip install -r requirements.txt && python main.py",
    icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg",
  },
  {
    value: "go",
    label: "Go",
    script: "go mod download && go run .",
    icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/go/go-original.svg",
  },
  {
    value: "minecraft",
    label: "Minecraft Server",
    script: "java -Xms2G -Xmx2G -jar server.jar nogui",
    icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/java/java-original.svg",
  },
  { value: "other", label: "Other", script: "", icon: "" },
];

const NODE_PROJECT_TYPES = ["nodejs", "react"];

/**
 * Render a modal dialog that collects project metadata, allows selecting or installing Node/Python runtimes, and submits a new project to the backend.
 *
 * The dialog manages internal form state (name, path, type, start script, icon, runtime selections, and a clear-logs flag), fetches available and installed runtimes when opened, provides quick-install actions for missing runtimes, debounces the icon preview, and calls the backend API to add the project. On successful add the dialog closes, the form resets, and a success toast is shown; errors produce an error toast.
 *
 * @param {{ onProjectsChange?: () => void }} props - Component props.
 * @param {() => void} [props.onProjectsChange] - Optional callback invoked after a project is successfully added.
 * @returns {JSX.Element} The Add Project dialog component.
 */
export default function AddProjectDialog({ onProjectsChange }) {
  const [isOpen, setIsOpen] = useAtom(isAddProjectModalOpenAtom);
  const [newProject, setNewProject] = useState({
    name: "",
    path: "",
    type: "nodejs",
    script: "npm install && npm start",
    icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg",
    clearLogsBeforeStart: false,
    nodeVersionId: null,
    pythonVersionId: null,
  });

  const [iconPreview, setIconPreview] = useState(newProject.icon);
  const [installedNodeRuntimes, setInstalledNodeRuntimes] = useState([]);
  const [installedPythonRuntimes, setInstalledPythonRuntimes] = useState([]);
  const [availableNodeVersions, setAvailableNodeVersions] = useState([]);
  const [availablePythonVersions, setAvailablePythonVersions] = useState([]);
  const [installingRuntime, setInstallingRuntime] = useState(null);

  useEffect(() => {
    if (isOpen && API.runtimeListInstalled) {
      API.runtimeListInstalled("node")
        .then(setInstalledNodeRuntimes)
        .catch(() => setInstalledNodeRuntimes([]));
      API.runtimeListInstalled("python")
        .then(setInstalledPythonRuntimes)
        .catch(() => setInstalledPythonRuntimes([]));
    }
    if (isOpen && API.runtimeListAvailable) {
      API.runtimeListAvailable("node")
        .then(setAvailableNodeVersions)
        .catch(() => setAvailableNodeVersions([]));
      API.runtimeListAvailable("python")
        .then(setAvailablePythonVersions)
        .catch(() => setAvailablePythonVersions([]));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !API.onRuntimeProgress) return;
    const unsub = API.onRuntimeProgress((payload) => {
      if (payload?.phase === "done" || payload?.phase === "error") {
        setInstallingRuntime(null);
        API.runtimeListInstalled("node")
          .then(setInstalledNodeRuntimes)
          .catch(() => {});
        API.runtimeListInstalled("python")
          .then(setInstalledPythonRuntimes)
          .catch(() => {});
      }
    });
    return () => (typeof unsub === "function" ? unsub() : undefined);
  }, [isOpen]);

  const handleClearLogsToggle = (enabled) => {
    setNewProject((prev) => ({ ...prev, clearLogsBeforeStart: enabled }));
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIconPreview(newProject.icon);
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [newProject.icon]);

  const handleAddProject = async () => {
    if (newProject.name.trim() && newProject.path && newProject.script.trim()) {
      try {
        await API.addProject(newProject);
        toast.success("Project added successfully!");
        onProjectsChange?.();
        setIsOpen(false);
        setNewProject({
          name: "",
          path: "",
          type: "nodejs",
          script: "npm install && npm start",
          icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg",
          nodeVersionId: null,
          pythonVersionId: null,
        });
      } catch (error) {
        toast.error(`Failed to add project: ${error.message}`);
      }
    }
  };

  const handleInstallRuntime = (type, versionId) => {
    setInstallingRuntime({ type, versionId });
    API.runtimeInstall?.(type, versionId)?.catch(() => setInstallingRuntime(null));
  };
  const isInstalling = (type, id) =>
    installingRuntime?.type === type && installingRuntime?.versionId === id;
  const notInstalledNode = availableNodeVersions.filter(
    (v) =>
      !installedNodeRuntimes.some(
        (r) => r.id === (v.id || v.version) || r.version === (v.id || v.version)
      )
  );
  const notInstalledPython = availablePythonVersions.filter(
    (v) =>
      !installedPythonRuntimes.some(
        (r) => r.id === (v.id || v.version) || r.version === (v.id || v.version)
      )
  );

  const handleBrowseValues = async () => {
    const path = await API.selectDirectory();
    if (path) {
      setNewProject((prev) => ({ ...prev, path }));
      const name = path.split("\\").pop().split("/").pop();
      if (!newProject.name) setNewProject((prev) => ({ ...prev, name }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Add Project</DialogTitle>
          <DialogDescription>Select a Node.js project directory to manage.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="path">
              Project Path <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="path"
                value={newProject.path}
                readOnly
                placeholder="Select a directory..."
                className="bg-muted/50 focus-visible:ring-1"
              />
              <Button variant="secondary" onClick={handleBrowseValues} className="cursor-pointer">
                <FolderIcon className="mr-2 h-4 w-4" /> Browse
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              placeholder="My Server"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Project Type</Label>
            <Select
              value={newProject.type}
              onValueChange={(value) => {
                const typeInfo = PROJECT_TYPES.find((t) => t.value === value);
                setNewProject((prev) => ({
                  ...prev,
                  type: value,
                  script: typeInfo ? typeInfo.script : prev.script,
                  icon: typeInfo?.icon || prev.icon,
                }));
              }}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(NODE_PROJECT_TYPES.includes(newProject.type) || newProject.type === "python") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {NODE_PROJECT_TYPES.includes(newProject.type) && (
                <div className="grid gap-2">
                  <Label>Node version</Label>
                  <Select
                    value={newProject.nodeVersionId ?? "__system__"}
                    onValueChange={(v) =>
                      setNewProject((prev) => ({
                        ...prev,
                        nodeVersionId: v === "__system__" ? null : v,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="System (PATH)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__system__">System (PATH)</SelectItem>
                      {installedNodeRuntimes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          <span className="flex items-center justify-between gap-2 w-full">
                            {r.version || r.id}
                            <span className="text-xs text-green-600 dark:text-green-400">
                              Installed
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {notInstalledNode.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Install another version:</p>
                      <div className="flex flex-wrap gap-1">
                        {notInstalledNode.slice(0, 8).map((v) => {
                          const id = v.id || v.version;
                          const installing = isInstalling("node", id);
                          return (
                            <Button
                              key={id}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 gap-1 text-xs"
                              disabled={!!installingRuntime}
                              onClick={(e) => {
                                e.preventDefault();
                                handleInstallRuntime("node", id);
                              }}
                            >
                              {installing ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Download className="h-3 w-3" />
                              )}
                              {v.version || id}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {newProject.type === "python" && (
                <div className="grid gap-2">
                  <Label>Python version</Label>
                  <Select
                    value={newProject.pythonVersionId ?? "__system__"}
                    onValueChange={(v) =>
                      setNewProject((prev) => ({
                        ...prev,
                        pythonVersionId: v === "__system__" ? null : v,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="System (PATH)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__system__">System (PATH)</SelectItem>
                      {installedPythonRuntimes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          <span className="flex items-center justify-between gap-2 w-full">
                            {r.version || r.id}
                            <span className="text-xs text-green-600 dark:text-green-400">
                              Installed
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {notInstalledPython.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Install another version:</p>
                      <div className="flex flex-wrap gap-1">
                        {notInstalledPython.slice(0, 8).map((v) => {
                          const id = v.id || v.version;
                          const installing = isInstalling("python", id);
                          return (
                            <Button
                              key={id}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 gap-1 text-xs"
                              disabled={!!installingRuntime}
                              onClick={(e) => {
                                e.preventDefault();
                                handleInstallRuntime("python", id);
                              }}
                            >
                              {installing ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Download className="h-3 w-3" />
                              )}
                              {v.version || id}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="script">
              Start Script <span className="text-destructive">*</span>
            </Label>
            <Input
              id="script"
              value={newProject.script}
              onChange={(e) => setNewProject({ ...newProject, script: e.target.value })}
              placeholder="npm start"
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{node}}"} or {"{{python}}"} to use the selected runtime executable in the
              command.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="icon">Icon URL or Path</Label>
            <motion.div className="flex gap-2 items-center">
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="flex-1 min-w-0"
              >
                <Input
                  id="icon"
                  value={newProject.icon || ""}
                  onChange={(e) => setNewProject({ ...newProject, icon: e.target.value })}
                  className="bg-muted/50 focus-visible:ring-1 w-full"
                  placeholder="https://... or C:\..."
                />
              </motion.div>
              <AnimatePresence initial={false} mode="sync">
                {iconPreview && (
                  <motion.div
                    layout
                    className="w-10 h-10 bg-black/20 rounded-md overflow-hidden border border-border flex items-center justify-center relative shrink-0"
                    role="img"
                    aria-label="Icon preview"
                    initial={{ opacity: 0, width: 0, x: -6 }}
                    animate={{ opacity: 1, width: 40, x: 0 }}
                    exit={{ opacity: 0, width: 0, x: 6 }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 28,
                      duration: 0.28,
                    }}
                  >
                    <AnimatePresence initial={false} mode="sync">
                      <motion.img
                        src={
                          iconPreview.match(/^(https?:\/\/|data:)/)
                            ? iconPreview
                            : `media:///${iconPreview.replace(/\\/g, "/")}`
                        }
                        className="absolute inset-0 w-full h-full object-cover"
                        alt="Preview"
                        key={iconPreview}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        style={{ imageRendering: "auto" }}
                      />
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
              <Button
                variant="secondary"
                size="icon"
                onClick={async () => {
                  try {
                    const file = await API.selectFile();
                    if (file) {
                      setNewProject((prev) => ({ ...prev, icon: file }));
                    }
                  } catch (e) {
                    console.error("Failed to select file:", e);
                  }
                }}
                className="w-10 h-10 p-0 flex items-center justify-center shrink-0 cursor-pointer"
                title="Select Icon"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20">
            <div className="space-y-0.5">
              <Label htmlFor="clearLogsBeforeStart" className="text-base cursor-pointer">
                Clear Logs Before Start
              </Label>
              <p className="text-xs text-muted-foreground">
                Wipe terminal log history every time this project starts
              </p>
            </div>
            <Switch
              id="clearLogsBeforeStart"
              checked={newProject.clearLogsBeforeStart}
              onCheckedChange={handleClearLogsToggle}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleAddProject}
            disabled={!newProject.path || !newProject.name.trim() || !newProject.script.trim()}
            className="cursor-pointer"
          >
            Add Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
