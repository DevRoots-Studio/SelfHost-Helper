import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { Plus, Grid3x3, List, Server, Orbit, Clock, Cpu, HardDrive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { projectsAtom, resourceHistoryAtom, isAddProjectModalOpenAtom } from "@/store/atoms";
import { formatMemory } from "@/lib/formatMemory";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatUptime(ms) {
  if (!ms || ms <= 0) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Project Card (Grid View)
// ─────────────────────────────────────────────────────────────────────────────

function ProjectCard({ project, stats, onClick }) {
  const latestCpu = stats?.cpu ?? 0;
  const latestMemory = stats?.memory ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border border-white/5 bg-linear-to-br from-white/2 to-white/0.5 hover:border-white/10 hover:from-white/4 hover:to-white/1 transition-all duration-300 cursor-pointer p-5 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Background accent */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/0 via-transparent to-primary/0 group-hover:from-primary/5 group-hover:via-primary/2 group-hover:to-primary/5 transition-all duration-500 pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Header with name and status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            <p className="text-xs text-muted-foreground/60 truncate mt-1">{project.path}</p>
          </div>
          <div className="shrink-0">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Orbit className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400/60" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
                Uptime
              </span>
            </div>
            <div className="text-sm font-mono font-bold text-foreground">
              {formatUptime(
                project.startTime ? Date.now() - new Date(project.startTime).getTime() : 0
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-emerald-400/60" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
                CPU
              </span>
            </div>
            <div className="text-sm font-mono font-bold text-foreground">
              {latestCpu > 0 ? `${latestCpu.toFixed(1)}%` : "—"}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-sky-400/60" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
                RAM
              </span>
            </div>
            <div className="text-sm font-mono font-bold text-foreground truncate">
              {latestMemory > 0 ? formatMemory(latestMemory) : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Click hint */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="text-[10px] text-muted-foreground/40 font-medium">View →</div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Project Row (List View)
// ─────────────────────────────────────────────────────────────────────────────

function ProjectRow({ project, stats, onClick }) {
  const latestCpu = stats?.cpu ?? 0;
  const latestMemory = stats?.memory ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{ x: 4 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-lg border border-white/5 hover:border-white/10 hover:bg-white/2 transition-all duration-300 cursor-pointer p-4 flex items-center justify-between gap-4 hover:shadow-md hover:shadow-primary/5"
    >
      <div className="absolute inset-0 bg-linear-to-r from-primary/0 via-transparent to-primary/0 group-hover:from-primary/3 group-hover:via-primary/1 group-hover:to-primary/3 transition-all duration-500 pointer-events-none" />

      <div className="relative z-10 flex-1 min-w-0 flex items-center gap-4">
        {/* Icon + name */}
        <div className="shrink-0">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <Server className="h-5 w-5 text-emerald-400" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {project.name}
          </h3>
          <p className="text-xs text-muted-foreground/50 truncate">{project.path}</p>
        </div>
      </div>

      {/* Stats inline */}
      <div className="relative z-10 shrink-0 flex items-center gap-6 text-sm">
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-semibold">
            Uptime
          </div>
          <div className="font-mono font-bold text-foreground text-sm">
            {formatUptime(
              project.startTime ? Date.now() - new Date(project.startTime).getTime() : 0
            )}
          </div>
        </div>

        <div className="text-right min-w-16">
          <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-semibold">
            CPU
          </div>
          <div className="font-mono font-bold text-foreground text-sm">
            {latestCpu > 0 ? `${latestCpu.toFixed(1)}%` : "—"}
          </div>
        </div>

        <div className="text-right min-w-20">
          <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-semibold">
            RAM
          </div>
          <div className="font-mono font-bold text-foreground text-sm">
            {latestMemory > 0 ? formatMemory(latestMemory) : "—"}
          </div>
        </div>
      </div>

      {/* Chevron hint */}
      <div className="relative z-10 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors">
        →
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────────────────────

function EmptyRunningProjects({ onCreateServer }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex items-center justify-center px-4"
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full pointer-events-none" />
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="relative p-6 bg-white/5 rounded-full border border-white/10 backdrop-blur"
            >
              <Orbit className="h-12 w-12 text-primary/80" />
            </motion.div>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">No Projects Running</h2>
          <p className="text-muted-foreground/70 text-sm leading-relaxed">
            Start a project from the sidebar to see live monitoring data, resource usage, and
            insights here.
          </p>
        </div>

        <Button
          onClick={onCreateServer}
          className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Server
        </Button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();
  const projects = useAtomValue(projectsAtom);
  const resourceHistory = useAtomValue(resourceHistoryAtom);
  const setAddProjectModalOpen = useSetAtom(isAddProjectModalOpenAtom);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"

  // Filter to only running projects
  const runningProjects = useMemo(() => {
    return projects
      .filter((p) => p.status === "running")
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [projects]);

  const handleProjectClick = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  const handleCreateServer = () => {
    setAddProjectModalOpen(true);
  };

  // Empty state
  if (runningProjects.length === 0) {
    return <EmptyRunningProjects onCreateServer={handleCreateServer} />;
  }

  // Main content with header
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col min-w-0 overflow-hidden"
    >
      {/* Header */}
      <div className="shrink-0 px-6 py-5 border-b border-white/5 bg-background/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Orbit className="h-6 w-6 text-primary" />
              Running Servers
            </h1>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {runningProjects.length} {runningProjects.length === 1 ? "project" : "projects"}{" "}
              actively running
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded transition-all duration-200",
                  viewMode === "grid"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
                title="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 rounded transition-all duration-200",
                  viewMode === "list"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Create button */}
            <Button
              onClick={handleCreateServer}
              className="gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 hover:border-primary/50"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              New Server
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-6">
          <AnimatePresence mode="popLayout">
            {viewMode === "grid" ? (
              <motion.div
                key="grid-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {runningProjects.map((project) => {
                  const history = resourceHistory[project.id];
                  const latestStats = history?.samples?.[history.samples.length - 1];
                  return (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      stats={latestStats}
                      onClick={() => handleProjectClick(project.id)}
                    />
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="list-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3 max-w-4xl"
              >
                {runningProjects.map((project) => {
                  const history = resourceHistory[project.id];
                  const latestStats = history?.samples?.[history.samples.length - 1];
                  return (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      stats={latestStats}
                      onClick={() => handleProjectClick(project.id)}
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
