import { useState, useEffect } from "react";
import { Play, Square, RefreshCw, Trash2, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ProjectSettingsDialog from "./ProjectSettingsDialog";

export default function ProjectHeader({
  selectedProject,
  onStart,
  onStop,
  onRestart,
  onDelete,
  onUpdate,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <header className="h-auto min-h-[64px] flex items-center px-4 md:px-6 justify-between bg-transparent backdrop-blur-md sticky top-0 z-10 shadow-sm drag py-2 flex-wrap gap-2  md:pr-[140px]">
      <div className="flex flex-col no-drag min-w-0">
        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 md:gap-3 flex-wrap">
          <span className="truncate">{selectedProject.name}</span>
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border shadow-[0_0_10px_inset_transparent] shrink-0",
              selectedProject.status === "running"
                ? "border-green-500/30 text-green-400 bg-green-500/10 shadow-[0_0_15px_-3px_rgba(34,197,94,0.4)]"
                : "border-red-500/30 text-red-400 bg-red-500/10"
            )}
          >
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                selectedProject.status === "running"
                  ? "bg-green-400 animate-pulse"
                  : "bg-red-400"
              )}
            />
            {selectedProject.status || "stopped"}
          </div>
        </h2>
        {selectedProject.status === "running" && selectedProject.startTime && (
          <Uptime
            key={selectedProject.id}
            startTime={selectedProject.startTime}
          />
        )}
      </div>
      <div className="flex items-center space-x-2 no-drag flex-wrap gap-2">
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
                onClick={() => onStop(selectedProject.id)}
                className="shadow-lg shadow-red-900/20 active:scale-95 transition-all cursor-pointer hover:shadow-red-500/20"
              >
                <Square className="mr-2 h-4 w-4 fill-current" /> Stop
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onRestart(selectedProject.id)}
                className="active:scale-95 transition-all cursor-pointer glass hover:bg-white/10 border-white/10"
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
                className="btn-primary cursor-pointer"
                onClick={() => onStart(selectedProject.id)}
              >
                <Play className="mr-2 h-4 w-4 fill-current" /> Start
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="h-6 w-px bg-white/10 mx-2"></div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer hover:bg-white/5"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer hover:bg-red-500/10"
          onClick={() => onDelete(selectedProject.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <ProjectSettingsDialog
        project={selectedProject}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={onUpdate}
        onDelete={onDelete}
      />
    </header>
  );
}

function Uptime({ startTime }) {
  const [uptime, setUptime] = useState("00:00:00");

  useEffect(() => {
    const start = new Date(startTime).getTime();

    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, now - start);

      const seconds = Math.floor((diff / 1000) % 60);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      setUptime(
        `${days > 0 ? `${days}d ` : ""}${hours
          .toString()
          .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className="text-xs text-muted-foreground font-mono mt-1 ml-0.5 opacity-60">
      Uptime: {uptime}
    </span>
  );
}
