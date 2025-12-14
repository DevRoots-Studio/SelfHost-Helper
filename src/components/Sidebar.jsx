import React, { useState, useEffect } from "react";
import { Plus, Terminal, Settings, Folder as FolderIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const API = window.api;

export default function Sidebar({
  projects,
  selectedProject,
  onProjectSelect,
  onProjectsChange,
  isAddOpen: externalIsAddOpen,
  onAddOpenChange: externalOnAddOpenChange,
}) {
  const [internalIsAddOpen, setInternalIsAddOpen] = useState(false);
  const isAddOpen =
    externalIsAddOpen !== undefined ? externalIsAddOpen : internalIsAddOpen;
  const setIsAddOpen = externalOnAddOpenChange || setInternalIsAddOpen;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    path: "",
    script: "npm start",
  });

  useEffect(() => {
    loadAutoLaunchStatus();
  }, []);

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

  const handleAddProject = async () => {
    if (newProject.name && newProject.path) {
      await API.addProject(newProject);
      onProjectsChange();
      setIsAddOpen(false);
      setNewProject({ name: "", path: "", script: "npm start" });
    }
  };

  const handleBrowseValues = async () => {
    const path = await API.selectDirectory();
    if (path) {
      setNewProject((prev) => ({ ...prev, path }));
      const name = path.split("\\").pop().split("/").pop();
      if (!newProject.name) setNewProject((prev) => ({ ...prev, name }));
    }
  };

  return (
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
              className="hover:bg-primary/20 hover:text-primary cursor-pointer"
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
                  <Button
                    variant="secondary"
                    onClick={handleBrowseValues}
                    className="cursor-pointer"
                  >
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
              <Button
                onClick={handleAddProject}
                disabled={!newProject.path}
                className="cursor-pointer"
              >
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
            onClick={() => onProjectSelect(p)}
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
              className="w-full justify-start text-muted-foreground hover:text-foreground cursor-pointer"
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
                className="cursor-pointer"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  );
}
