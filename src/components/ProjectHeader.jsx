import React from "react";
import { Play, Square, RefreshCw, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ProjectHeader({
  selectedProject,
  onStart,
  onStop,
  onRestart,
  onDelete,
}) {
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
          className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          onClick={() => onDelete(selectedProject.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
