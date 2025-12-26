import React, { useState, useEffect } from "react";
import {
  Plus,
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
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API = window.api;

const PROJECT_TYPES = [
  { value: "nodejs", label: "Node.js", script: "npm install && npm start" },
  { value: "react", label: "React", script: "npm install && npm run dev" },
  {
    value: "python",
    label: "Python",
    script: "pip install -r requirements.txt && python main.py",
  },
  { value: "go", label: "Go", script: "go mod download && go run ." },
  { value: "other", label: "Other", script: "" },
];

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
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [discordInfo, setDiscordInfo] = useState(null);
  const [discordLoading, setDiscordLoading] = useState(true);
  const [newProject, setNewProject] = useState({
    name: "",
    path: "",
    type: "nodejs",
    script: "npm install && npm start",
  });

  const DISCORD_INVITE_CODE = "C62mj58Q2D";

  useEffect(() => {
    fetchDiscordInfo();
  }, []);

  const fetchDiscordInfo = async () => {
    try {
      setDiscordLoading(true);
      const result = await API.getDiscordInfo(DISCORD_INVITE_CODE);

      if (result.success) {
        setDiscordInfo(result.data);
      } else {
        console.error("Error fetching Discord info:", result.error);
      }
    } catch (error) {
      console.error("IPC error:", error);
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

  const handleAddProject = async () => {
    if (newProject.name.trim() && newProject.path && newProject.script.trim()) {
      await API.addProject(newProject);
      onProjectsChange();
      setIsAddOpen(false);
      setNewProject({
        name: "",
        path: "",
        type: "nodejs",
        script: "npm install && npm start",
      });
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
      className="bg-muted/20 border-r border-border flex flex-col backdrop-blur-xl relative overflow-x-hidden"
      initial={false}
      animate={{ width: isCollapsed ? "64px" : "288px" }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      <div
        className={cn(
          "flex items-center bg-card/50",
          isCollapsed ? "justify-center px-2 py-4" : "justify-between p-4"
        )}
      >
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

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <div className="flex items-center gap-2 shrink-0">
            {!isCollapsed && (
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:bg-primary/20 hover:text-primary cursor-pointer"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </DialogTrigger>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-10 h-10 p-2 hover:bg-primary/20 hover:text-primary cursor-pointer flex items-center justify-center"
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
          </div>
          <DialogContent className="sm:max-w-125 bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add Project</DialogTitle>
              <DialogDescription>
                Select a Node.js project directory to manage.
              </DialogDescription>
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
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
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
                <Label htmlFor="type">Project Type</Label>
                <Select
                  value={newProject.type}
                  onValueChange={(value) => {
                    const typeInfo = PROJECT_TYPES.find(
                      (t) => t.value === value
                    );
                    setNewProject((prev) => ({
                      ...prev,
                      type: value,
                      script: typeInfo ? typeInfo.script : prev.script,
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
              <div className="grid gap-2">
                <Label htmlFor="script">
                  Start Script <span className="text-destructive">*</span>
                </Label>
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
                disabled={
                  !newProject.path ||
                  !newProject.name.trim() ||
                  !newProject.script.trim()
                }
                className="cursor-pointer"
              >
                Add Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {!isCollapsed ? (
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => onProjectSelect(p)}
              className={cn(
                "group p-3 rounded-lg cursor-pointer flex items-center justify-between transition-all border border-transparent select-none",
                selectedProject?.id === p.id
                  ? "border-[hsl(217,91%,60%)] shadow-[0_0_0_1px_hsl(217,91%,60%,0.2),0_2px_8px_hsl(217,91%,60%,0.15)] dark:shadow-[0_0_0_1px_hsl(217,91%,60%,0.3),0_2px_12px_hsl(217,91%,60%,0.25)]" +
                      " " +
                      "bg-[linear-gradient(to_right,hsl(217,91%,60%,0.15),hsl(217,91%,60%,0.08))] dark:bg-[linear-gradient(to_right,hsl(217,91%,60%,0.25),hsl(217,91%,60%,0.12))]"
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 flex flex-col items-center gap-2">
          {projects.map((p) => (
            <motion.button
              key={p.id}
              onClick={() => onProjectSelect(p)}
              className={cn(
                "w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center transition-all border-2 select-none relative group",
                selectedProject?.id === p.id
                  ? "bg-[hsl(217,91%,60%,0.15)] dark:bg-[hsl(217,91%,60%,0.25)] border-[hsl(217,91%,60%)] shadow-[0_0_0_1px_hsl(217,91%,60%,0.3),0_4px_12px_hsl(217,91%,60%,0.25)] scale-110"
                  : "bg-muted/30 border-border/50 hover:bg-accent/50 hover:border-border hover:scale-105"
              )}
              whileHover={{ scale: 1.1, duration: 0.1 }}
              whileTap={{ scale: 0.95 }}
              title={p.name}
            >
              {p.icon ? (
                <div className="w-8 h-8 rounded overflow-hidden flex items-center justify-center m-auto">
                  <img
                    src={`media:///${p.icon.replace(/\\/g, "/")}`}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <span className="font-bold text-sm text-foreground">
                  {p.name.charAt(0).toUpperCase()}
                </span>
              )}
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
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            <div className="flex justify-center items-center mb-2">
              <motion.button
                key="discord-collapsed"
                layoutId="discord-card"
                transition={{
                  layout: { type: "spring", stiffness: 200, damping: 30 },
                  opacity: { duration: 0.15 },
                }}
                className="w-10 h-10 rounded-lg bg-muted/30 border border-border/50 hover:bg-accent/50 flex items-center justify-center shrink-0 cursor-pointer"
                onClick={() => setIsCollapsed(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {getDiscordAvatarUrl() ? (
                  <img
                    src={getDiscordAvatarUrl()}
                    alt={discordInfo?.guild?.name || "Discord Server"}
                    className="w-8 h-8 rounded object-cover block"
                  />
                ) : (
                  <MessageCircle className="h-5 w-5 text-foreground block" />
                )}
              </motion.button>
            </div>
          ) : (
            <motion.div
              key="discord-expanded"
              layoutId="discord-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                layout: { type: "spring", stiffness: 200, damping: 32 },
                opacity: { duration: 0.2 },
              }}
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
                          : discordInfo?.guild?.name || "DivRoots Studio"}
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
                    onClick={async () =>
                      await API.openExternal(
                        `https://discord.gg/${DISCORD_INVITE_CODE}`
                      )
                    }
                  >
                    Join Server
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          layout
          transition={{
            layout: { type: "spring", stiffness: 250, damping: 30 },
          }}
          className={isCollapsed ? "flex justify-center" : ""}
        >
          <motion.div
            layoutId="settings-button"
            transition={{
              layout: { type: "spring", stiffness: 400, damping: 30 },
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              onClick={() => navigate("/settings")}
              className={cn(
                "text-muted-foreground hover:text-foreground cursor-pointer flex items-center border",

                isCollapsed
                  ? "w-10 h-10 items-center justify-center p-2"
                  : "w-full justify-start px-3 py-2 gap-2"
              )}
            >
              <motion.div
                layout
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center"
              >
                <Settings
                  className={cn(
                    isCollapsed ? "h-5 w-5" : "h-4 w-4",
                    !isCollapsed && "mr-2"
                  )}
                />
              </motion.div>

              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.1 }}
                  >
                    Settings
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </motion.aside>
  );
}
