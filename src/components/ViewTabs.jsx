import React from "react";
import { Terminal, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ViewTabs({ viewMode, onViewModeChange }) {
  return (
    <div className="flex border-b border-border bg-muted/10">
      <button
        onClick={() => onViewModeChange("logs")}
        className={cn(
          "px-6 py-3 text-sm font-medium border-b-2 transition-all flex items-center focus:outline-none cursor-pointer",
          viewMode === "logs"
            ? "border-primary text-primary bg-primary/5"
            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
        )}
      >
        <Terminal className="mr-2 h-4 w-4" /> Console
      </button>
      <button
        onClick={() => onViewModeChange("editor")}
        className={cn(
          "px-6 py-3 text-sm font-medium border-b-2 transition-all flex items-center focus:outline-none cursor-pointer",
          viewMode === "editor"
            ? "border-primary text-primary bg-primary/5"
            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
        )}
      >
        <FileCode className="mr-2 h-4 w-4" /> Editor
      </button>
    </div>
  );
}
