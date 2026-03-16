import React from "react";
import { Terminal, FileCode, Cloud } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAtomValue } from "jotai";
import { statsAtom } from "@/store/atoms";

const TAB_PATHS = ["console", "editor", "tunnel"];

const ViewTabs = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const stats = useAtomValue(statsAtom);
  const pathname = location.pathname || "";
  const segments = pathname.split("/").filter(Boolean);
  const currentTab = TAB_PATHS.includes(segments[segments.length - 1])
    ? segments[segments.length - 1]
    : "console";

  return (
    <div className="flex border-b-0 bg-transparent backdrop-blur-sm px-4 pt-2 gap-2">
      <button
        onClick={() => navigate("console")}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-t-lg transition-all flex items-center focus:outline-none cursor-pointer border-t border-x border-transparent",
          currentTab === "console"
            ? "bg-muted/40 text-primary border-white/10 backdrop-blur-md shadow-none"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        )}
      >
        <Terminal className="mr-2 h-4 w-4" /> Console
      </button>
      <button
        onClick={() => navigate("editor")}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-t-lg transition-all flex items-center focus:outline-none cursor-pointer border-t border-x border-transparent",
          currentTab === "editor"
            ? "bg-muted/40 text-primary border-white/10 backdrop-blur-md shadow-none"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        )}
      >
        <FileCode className="mr-2 h-4 w-4" /> Editor
      </button>
      <button
        onClick={() => navigate("tunnel")}
        className={cn(
          "px-4 py-2 text-sm font-medium rounded-t-lg transition-all flex items-center focus:outline-none cursor-pointer border-t border-x border-transparent",
          currentTab === "tunnel"
            ? "bg-muted/40 text-primary border-white/10 backdrop-blur-md shadow-none"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        )}
      >
        <Cloud className="mr-2 h-4 w-4" /> Tunnel
      </button>

      <div className="ml-auto flex items-center gap-4 px-2 pb-2 text-xs font-mono text-muted-foreground">
        {stats && (
          <div className="flex items-center gap-3 bg-white/5 rounded-full px-3 py-1 border border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <span>CPU: {stats.cpu.toFixed(1)}%</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
              <span>MEM: {(stats.memory / 1024 / 1024).toFixed(1)} MB</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default ViewTabs;
