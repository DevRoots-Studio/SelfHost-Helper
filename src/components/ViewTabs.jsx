import React, { useState } from "react";
import { Terminal, FileCode, Cloud, Activity, LayoutDashboard, RefreshCw } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAtomValue, useSetAtom } from "jotai";
import { statsAtom, resourceHistoryAtom, overviewLayoutResetSignalAtom } from "@/store/atoms";
import { useParams } from "react-router-dom";
import { formatMemory } from "@/lib/formatMemory";
import { useSelectedProject } from "@/hooks/useSelectedProject";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TAB_PATHS = ["overview", "console", "editor", "tunnel", "resources"];

// ─────────────────────────────────────────────────────────────────────────────
// Tiny inline sparkline (8 points, 36×14 px)
// ─────────────────────────────────────────────────────────────────────────────
function MiniSparkline({ samples, valueKey, max, color }) {
  if (!samples || samples.length < 3) return null;
  const W = 36;
  const H = 14;
  const recent = samples.slice(-12);
  const effectiveMax = max > 0 ? max : Math.max(...recent.map((s) => s[valueKey] ?? 0), 1);
  const pts = recent
    .map((s, i) => {
      const x = (i / (recent.length - 1)) * W;
      const y = H - ((s[valueKey] ?? 0) / effectiveMax) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} className="opacity-40">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Premium stats pill
// ─────────────────────────────────────────────────────────────────────────────
function StatsPill({ stats, history }) {
  if (!stats) return null;
  const cpuHistory = history.map((s) => ({ cpu: s.cpu }));
  const memHistory = history.map((s) => ({ mem: s.memory / (1024 * 1024) }));
  const maxMem = memHistory.length > 0 ? Math.max(...memHistory.map((s) => s.mem), 1) : 1;

  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-white/8 bg-[#07070d]/80 px-3.5 py-1.5 shadow-[0_2px_20px_rgba(0,0,0,0.7)] backdrop-blur-md">
      {/* CPU */}
      <div className="flex flex-col items-center gap-0 leading-none">
        <span className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground/50 font-semibold mb-0.5">
          CPU
        </span>
        <div className="flex items-center gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
            style={{ boxShadow: "0 0 6px rgba(52,211,153,0.9)" }}
          />
          <span className="text-[11px] font-mono font-semibold tabular-nums">
            {(stats.cpu ?? 0).toFixed(0)}%
          </span>
        </div>
      </div>

      <MiniSparkline samples={cpuHistory} valueKey="cpu" max={100} color="#34d399" />

      <div className="w-px h-6 bg-white/[0.07]" />

      {/* MEM */}
      <div className="flex flex-col items-center gap-0 leading-none">
        <span className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground/50 font-semibold mb-0.5">
          MEM
        </span>
        <div className="flex items-center gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0"
            style={{ boxShadow: "0 0 6px rgba(56,189,248,0.9)" }}
          />
          <span className="text-[11px] font-mono font-semibold tabular-nums">
            {formatMemory(stats.memory)}
          </span>
        </div>
      </div>

      <MiniSparkline samples={memHistory} valueKey="mem" max={maxMem} color="#38bdf8" />

      {/* Process count (if > 1) */}
      {(stats.processCount ?? 0) > 1 && (
        <>
          <div className="w-px h-6 bg-white/[0.07]" />
          <div className="flex flex-col items-center gap-0 leading-none">
            <span className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground/50 font-semibold mb-0.5">
              PROC
            </span>
            <span className="text-[11px] font-mono font-semibold tabular-nums">
              {stats.processCount}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ViewTabs
// ─────────────────────────────────────────────────────────────────────────────

const ViewTabs = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const stats = useAtomValue(statsAtom);
  const allHistory = useAtomValue(resourceHistoryAtom);
  const { projectId } = useParams();
  const project = useSelectedProject();
  const history = projectId ? (allHistory[Number(projectId)]?.samples ?? []) : [];
  const shouldShowStats = !!stats && !!project && project.status === "running";

  const pathname = location.pathname || "";
  const segments = pathname.split("/").filter(Boolean);
  const currentTab = TAB_PATHS.includes(segments[segments.length - 1])
    ? segments[segments.length - 1]
    : "overview";

  const tabBase =
    "px-4 py-2 text-sm font-medium transition-all flex items-center focus:outline-none cursor-pointer border border-transparent border-b-0 rounded-t-lg flex-shrink-0";
  const activeStyle = "bg-muted/40 text-primary border-white/10 backdrop-blur-md shadow-none";
  const inactiveStyle =
    "text-muted-foreground hover:text-foreground hover:bg-white/5 hover:border-white/10";

  const projectBasePath = projectId ? `/project/${projectId}` : null;
  const navigateToTab = (tab) => {
    if (!projectBasePath) {
      navigate(tab);
      return;
    }
    navigate(`${projectBasePath}/${tab}`);
  };

  const setResetSignal = useSetAtom(overviewLayoutResetSignalAtom);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const openResetDialog = () => setResetDialogOpen(true);
  const confirmReset = () => {
    setResetDialogOpen(false);
    setResetSignal((prev) => prev + 1);
  };

  return (
    <div className="px-4 pt-2">
      <div className="flex items-center gap-2 border border-white/5 bg-transparent backdrop-blur-sm rounded-t-lg overflow-hidden">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap px-2 py-2 flex-1">
          <button
            onClick={() => navigateToTab("overview")}
            className={cn(tabBase, currentTab === "overview" ? activeStyle : inactiveStyle)}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" /> Overview
          </button>
          <button
            onClick={() => navigateToTab("console")}
            className={cn(tabBase, currentTab === "console" ? activeStyle : inactiveStyle)}
          >
            <Terminal className="mr-2 h-4 w-4" /> Console
          </button>
          <button
            onClick={() => navigateToTab("editor")}
            className={cn(tabBase, currentTab === "editor" ? activeStyle : inactiveStyle)}
          >
            <FileCode className="mr-2 h-4 w-4" /> Editor
          </button>
          <button
            onClick={() => navigateToTab("tunnel")}
            className={cn(tabBase, currentTab === "tunnel" ? activeStyle : inactiveStyle)}
          >
            <Cloud className="mr-2 h-4 w-4" /> Tunnel
          </button>
          <button
            onClick={() => navigateToTab("resources")}
            className={cn(tabBase, currentTab === "resources" ? activeStyle : inactiveStyle)}
          >
            <Activity className="mr-2 h-4 w-4" /> Resources
          </button>
        </div>

        <div className="shrink-0 pr-2 pb-2 pt-2 flex items-center gap-2">
          {shouldShowStats && <StatsPill stats={stats} history={history} />}
          {currentTab === "overview" && projectId && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="border border-white/10 bg-[#07070d]/60 hover:bg-white/5"
              onClick={openResetDialog}
              title="Reset overview layout"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset overview layout?</DialogTitle>
            <DialogDescription>
              This will clear the saved Overview grid layout for the current project and restore the
              default tile positions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmReset}>
              Reset layout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default ViewTabs;
