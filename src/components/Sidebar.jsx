import React, { useState, useEffect } from "react";
import {
  Plus,
  Terminal,
  Settings,
  Folder as FolderIcon,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [discordInfo, setDiscordInfo] = useState(null);
  const [discordLoading, setDiscordLoading] = useState(true);
  const [newProject, setNewProject] = useState({
    name: "",
    path: "",
    script: "npm i && node .",
  });

  const DISCORD_INVITE_CODE = "C62mj58Q2D";

  useEffect(() => {
    loadAutoLaunchStatus();
    fetchDiscordInfo();
  }, []);

  const fetchDiscordInfo = async () => {
    try {
      setDiscordLoading(true);
      const response = await fetch(
        `https://discord.com/api/invites/${DISCORD_INVITE_CODE}?with_counts=true`
      );
      if (response.ok) {
        const data = await response.json();
        setDiscordInfo(data);
      } else {
        console.error("Failed to fetch Discord server info");
      }
    } catch (error) {
      console.error("Error fetching Discord info:", error);
    } finally {
      setDiscordLoading(false);
    }
  };

  const getDiscordAvatarUrl = () => {
    if (!discordInfo?.guild?.icon) return null;
    return `https://cdn.discordapp.com/icons/${discordInfo.guild.id}/${discordInfo.guild.icon}.png?size=256`;
  };

  const getDiscordBannerUrl = () => {
    if (!discordInfo?.guild?.banner) return null;
    return `https://cdn.discordapp.com/banners/${discordInfo.guild.id}/${discordInfo.guild.banner}.png?size=1024`;
  };

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
    <motion.aside
      className="bg-muted/20 border-r border-border flex flex-col backdrop-blur-xl relative"
      initial={false}
      animate={{ width: isCollapsed ? "64px" : "288px" }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      <div className="p-4  flex justify-between items-center bg-card/50">
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.h1
              key="expanded"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="font-bold text-lg tracking-tight truncate flex-1 min-w-0"
            >
              SelfHost
            </motion.h1>
          ) : null}
        </AnimatePresence>

        <div className="flex items-center gap-2 shrink-0">
          {!isCollapsed && (
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
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hover:bg-primary/20 hover:text-primary cursor-pointer"
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
      {!isCollapsed ? (
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
                  "shrink-0 w-2.5 h-2.5 rounded-full",
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
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-2 flex flex-col items-center gap-2">
          {projects.map((p) => (
            <motion.button
              key={p.id}
              onClick={() => onProjectSelect(p)}
              className={cn(
                "w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center transition-all border-2 select-none relative group",
                selectedProject?.id === p.id
                  ? "bg-accent border-primary shadow-lg scale-110"
                  : "bg-muted/30 border-border/50 hover:bg-accent/50 hover:border-border hover:scale-105"
              )}
              whileHover={{ scale: 1.1, duration: 0.1 }}
              whileTap={{ scale: 0.95 }}
              title={p.name}
            >
              <span className="font-bold text-sm text-foreground">
                {p.name.charAt(0).toUpperCase()}
              </span>
              {p.status === "running" && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    boxShadow: "0 0 8px rgba(34, 197, 94, 0.5)",
                  }}
                />
              )}
            </motion.button>
          ))}
        </div>
      )}
      <div className="p-4  bg-card/30 space-y-2 ">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 overflow-hidden rounded-lg border border-border"
            >
              <div
                className="relative p-4 bg-muted/20 group"
                style={{
                  backgroundImage: getDiscordBannerUrl()
                    ? `url(${getDiscordBannerUrl()})`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-background/60 backdrop-blur-md" />

                <div className="relative z-10">
                  <div className="flex items-start gap-3 mb-3">
                    {/* Server Avatar */}
                    {getDiscordAvatarUrl() ? (
                      <img
                        src={getDiscordAvatarUrl()}
                        alt={discordInfo?.guild?.name || "Discord Server"}
                        className="w-16 h-16 rounded-lg border-2 border-border/50 shadow-lg shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/20 shrink-0">
                        <MessageCircle className="text-white h-8 w-8" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base mb-1 truncate">
                        {discordLoading
                          ? "Loading..."
                          : discordInfo?.guild?.name || "Div Root"}
                      </h3>
                      {discordInfo && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {discordInfo.approximate_member_count?.toLocaleString() ||
                              "—"}{" "}
                            members
                          </span>
                          {discordInfo.approximate_presence_count !==
                            undefined && (
                            <span className="flex items-center gap-1 text-green-500">
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                              {discordInfo.approximate_presence_count?.toLocaleString() ||
                                "—"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                    size="sm"
                    onClick={async () => {
                      // Try to open the Discord app via protocol link first.
                      // If that fails (returns false or throws), fall back to the web invite.
                      // const protocolUrl = `discord://invite/${DISCORD_INVITE_CODE}`;
                      const webUrl = `https://discord.gg/${DISCORD_INVITE_CODE}`;

                      // try {
                      //   const opened = await API.openExternal(protocolUrl);
                      //   if (!opened) {
                      //     // Fallback to web
                      //     await API.openExternal(webUrl);
                      //   }
                      // } catch (e) {
                      //   // If opening the protocol fails for any reason, open the web link.
                      //   await API.openExternal(webUrl);
                      // }
                      try {
                        await API.openExternal(webUrl);
                      } catch (error) {
                        console.error("Error opening external URL:", error);
                      }
                    }}
                  >
                    Join Server
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "text-muted-foreground hover:text-foreground cursor-pointer flex items-center border",

                isCollapsed
                  ? "w-10 h-10 justify-center p-2"
                  : "w-full justify-start px-3 py-2 gap-2"
              )}
            >
              <Settings
                className={cn(
                  isCollapsed ? "h-5 w-5" : "h-4 w-4",
                  !isCollapsed && "mr-2"
                )}
              />
              {!isCollapsed && "Settings"}
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
    </motion.aside>
  );
}
