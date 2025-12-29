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
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  projectsAtom,
  selectedProjectAtom,
  selectedProjectIdAtom,
  isAddProjectModalOpenAtom,
} from "@/store/atoms";
import AddProjectDialog from "./AddProjectDialog";

const API = window.api;

const Sidebar = React.memo(({ onProjectsChange }) => {
  const projects = useAtomValue(projectsAtom);
  const selectedProject = useAtomValue(selectedProjectAtom);
  const [selectedProjectId, setSelectedProjectId] = useAtom(
    selectedProjectIdAtom
  );
  const isAddOpen = useAtomValue(isAddProjectModalOpenAtom);
  const setIsAddOpen = useSetAtom(isAddProjectModalOpenAtom);
  const navigate = useNavigate();
  const [width, setWidth] = useState(72);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [discordInfo, setDiscordInfo] = useState(null);
  const [discordLoading, setDiscordLoading] = useState(true);

  const DISCORD_INVITE_CODE = "C62mj58Q2D";

  useEffect(() => {
    fetchDiscordInfo();
    const savedWidth = localStorage.getItem("sidebarWidth");
    if (savedWidth) {
      const w = parseInt(savedWidth);
      setWidth(w);
      setIsCollapsed(w < 120);
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < 72) newWidth = 72;
      if (newWidth > 400) newWidth = 400;
      setWidth(newWidth);
      setIsCollapsed(newWidth < 120);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem("sidebarWidth", width);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, width]);

  const toggleSidebar = () => {
    if (width < 120) {
      setWidth(280);
      setIsCollapsed(false);
    } else {
      setWidth(72);
      setIsCollapsed(true);
    }
  };

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

  return (
    <motion.aside
      className="bg-transparent border-r border-white/5 flex flex-col backdrop-blur-xl relative overflow-hidden group/sidebar"
      initial={false}
      animate={{ width: width }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
        duration: 0.1,
      }}
    >
      {/* Resizer Handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-50"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
      />
      <div
        className={cn(
          "flex items-center shrink-0 drag h-16 transition-all duration-300",
          width < 120 ? "justify-center px-0" : "justify-between px-4"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <AnimatePresence>
            {width >= 120 && (
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-bold text-lg tracking-tight"
              >
                SelfHost
              </motion.h1>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1 shrink-0 no-drag">
          {width >= 120 && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsAddOpen(true)}
              className="hover:bg-primary/20 hover:text-primary cursor-pointer w-8 h-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => toggleSidebar()}
            className="w-8 h-8 p-0 hover:bg-primary/20 hover:text-primary cursor-pointer flex items-center justify-center"
          >
            {width < 120 ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <AddProjectDialog onProjectsChange={onProjectsChange} />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
        {projects.map((p) => {
          const isSelected = selectedProject?.id === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className={cn(
                "sidebar-item group relative transition-all duration-200",
                width < 120 ? "collapsed" : "",
                isSelected ? "active" : "hover:bg-white/5",
                // Centering now handled by .collapsed in CSS, border styles restored via CSS active class
                width < 120 ? "mx-auto" : "px-3 py-2.5"
              )}
              title={width < 120 ? p.name : undefined}
            >
              {/* Icon Container */}
              <div
                className={cn(
                  "relative shrink-0 flex items-center justify-center transition-all duration-300",
                  width < 120 ? "w-10 h-10" : "w-10 h-10"
                )}
              >
                {p.icon ? (
                  <div
                    className={cn(
                      "rounded-lg overflow-hidden flex items-center justify-center transition-all duration-300",
                      width < 120
                        ? "w-10 h-10 rounded-xl"
                        : "w-8 h-8 rounded-md"
                    )}
                  >
                    <img
                      src={
                        p.icon.match(/^(https?:\/\/|data:)/)
                          ? p.icon
                          : `media:///${p.icon.replace(/\\/g, "/")}`
                      }
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex items-center justify-center font-bold text-lg bg-white/5 rounded-lg transition-all",
                      width < 120 ? "w-10 h-10 rounded-xl" : "w-8 h-8"
                    )}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Text Content (Hidden when narrow) */}
              {width >= 120 && (
                <div
                  className={cn(
                    "flex flex-col min-w-0 flex-1 ml-3 transition-all duration-300 origin-left"
                  )}
                >
                  <span className="font-medium truncate text-sm">{p.name}</span>
                  <span className="text-xs opacity-50 truncate text-muted-foreground">
                    {p.path}
                  </span>
                </div>
              )}

              {/* Status Dot */}
              <div
                className={cn(
                  "absolute transition-all duration-300 flex items-center justify-center",
                  width < 120
                    ? "top-0 right-0 -translate-y-1/4 translate-x-1/4"
                    : "relative right-auto top-auto ml-auto transform-none"
                )}
              >
                {p.status === "running" && (
                  <div className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                  </div>
                )}
                {p.status === "error" && (
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                )}
                {(!p.status || p.status === "stopped") && width >= 120 && (
                  <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-4 bg-card/30 space-y-2 mt-auto">
        <AnimatePresence mode="wait">
          {isCollapsed ? (
            <motion.div
              key="discord-collapsed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <Button
                variant="ghost"
                className="w-10 h-10 rounded-lg p-0 flex items-center justify-center shrink-0"
                onClick={() => {
                  setWidth(280);
                  setIsCollapsed(false);
                }}
              >
                {getDiscordAvatarUrl() ? (
                  <img
                    src={getDiscordAvatarUrl()}
                    alt="Discord"
                    className="w-8 h-8 rounded-md object-cover"
                  />
                ) : (
                  <MessageCircle className="h-5 w-5" />
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="discord-expanded"
              layoutId="discord-card-container"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="overflow-hidden rounded-xl border border-white/10 bg-black/20"
            >
              <div
                className="relative p-4 bg-cover bg-center"
                style={{
                  backgroundImage: getDiscordBannerUrl()
                    ? `url(${getDiscordBannerUrl()})`
                    : undefined,
                }}
              >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-3">
                    {getDiscordAvatarUrl() ? (
                      <img
                        src={getDiscordAvatarUrl()}
                        alt="Discord"
                        className="w-12 h-12 rounded-lg border border-white/10 shadow-lg"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
                        <MessageCircle className="text-white h-6 w-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm truncate text-white">
                        {discordInfo?.guild?.name || "Join Community"}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                        <span className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          {discordInfo?.approximate_presence_count?.toLocaleString() ||
                            "-"}
                        </span>
                        <span>•</span>
                        <span>
                          {discordInfo?.approximate_member_count?.toLocaleString() ||
                            "-"}{" "}
                          Members
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs font-medium"
                    onClick={() =>
                      API.openExternal(
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

        <motion.div layout>
          <Button
            variant="ghost"
            onClick={() => navigate("/settings")}
            className={cn(
              "w-full flex items-center gap-2 transition-all duration-200 text-muted-foreground hover:text-foreground cursor-pointer",
              isCollapsed ? "justify-center px-0" : "justify-start px-3"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                className="truncate"
              >
                Settings
              </motion.span>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.aside>
  );
});

export default Sidebar;
