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
        {selectedProject.status === "running" && selectedProject.startTime && (
          <Uptime
            key={selectedProject.id}
            startTime={selectedProject.startTime}
          />
        )}
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
                onClick={() => onStop(selectedProject.id)}
                className="shadow-lg shadow-red-900/20 active:scale-95 transition-transform cursor-pointer"
              >
                <Square className="mr-2 h-4 w-4 fill-current" /> Stop
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onRestart(selectedProject.id)}
                className="active:scale-95 transition-transform cursor-pointer"
              >
                <RefreshCw className="mr-2 h-4 w-4 " /> Restart
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
                className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/20 text-white active:scale-95 transition-transform cursor-pointer"
                onClick={() => onStart(selectedProject.id)}
              >
                <Play className="mr-2 h-4 w-4 fill-current " /> Start
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="h-6 w-px bg-border mx-2"></div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
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
    <span className="text-xs text-muted-foreground font-mono mt-0.5 ml-0.5">
      Uptime: {uptime}
    </span>
  );
}
