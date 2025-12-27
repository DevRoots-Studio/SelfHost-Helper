import React from "react";
import { Terminal, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

import { useAtomValue } from "jotai";
import { statsAtom } from "@/store/atoms";

const ViewTabs = React.memo(({ viewMode, onViewModeChange }) => {
  const stats = useAtomValue(statsAtom);
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

      {/* Stats Display */}
      <div className="ml-auto flex items-center gap-4 px-6 text-xs font-mono text-muted-foreground">
        {stats && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500/50" />
              <span>CPU: {stats.cpu.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500/50" />
              <span>MEM: {(stats.memory / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default ViewTabs;
