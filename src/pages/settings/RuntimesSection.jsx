import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Trash2, Download, Loader2, RefreshCw, PackageX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function InstalledRuntimeCard({ title, runtimes, type, projects, onUninstall }) {
  if (runtimes.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/2.5 p-5">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-4">
          {title}
        </p>
        <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground/40">
          <PackageX className="h-8 w-8" />
          <p className="text-sm">No versions installed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/2.5 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
      <div className="px-5 pt-4 pb-2">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
          {title}
        </p>
      </div>
      <div className="divide-y divide-white/5">
        {runtimes.map((r) => {
          const usedBy = projects.filter(
            (p) =>
              (type === "node" && (p.nodeVersionId === r.id || p.nodeVersionId === r.version)) ||
              (type === "python" && (p.pythonVersionId === r.id || p.pythonVersionId === r.version))
          );
          return (
            <div
              key={r.id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-white/3 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <span className="font-mono text-sm font-semibold text-foreground">
                  {r.version || r.id}
                </span>
                <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5" title={r.path}>
                  {r.path}
                </p>
                {usedBy.length > 0 && (
                  <p className="text-[11px] text-primary/70 mt-0.5">
                    Used by: {usedBy.map((p) => p.name).join(", ")}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onUninstall(type, r.id)}
                className="shrink-0 gap-1.5 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AvailableVersionsList({
  title,
  accentColor,
  versions,
  loaded,
  type,
  isVersionInstalled,
  isInstalling,
  installLoading,
  installProgress,
  onInstall,
}) {
  const [filter, setFilter] = useState("");
  const filtered = versions.filter((v) =>
    (v.version || v.id || "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/2.5 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
      <div className="px-5 pt-4 pb-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-3">
          {title}
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter versions…"
            className="w-full bg-black/20 border border-white/8 rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-white/4">
        {!loaded ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground/50">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground/40">
            {filter ? "No versions match your filter." : "No versions available."}
          </div>
        ) : (
          filtered.map((v) => {
            const id = v.id || v.version;
            const installed = isVersionInstalled(id);
            const installing = isInstalling(type, id);
            return (
              <div
                key={id}
                className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-white/3 transition-colors"
              >
                <span
                  className={cn(
                    "font-mono text-sm",
                    installed ? "text-muted-foreground/50" : "text-foreground"
                  )}
                >
                  {v.version || id}
                </span>
                {installed ? (
                  <span className="text-[11px] font-semibold text-emerald-400 shrink-0">
                    Installed
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn("h-7 gap-1.5 shrink-0 text-xs", accentColor)}
                    disabled={installLoading}
                    onClick={(e) => {
                      e.preventDefault();
                      onInstall(type, id);
                    }}
                  >
                    {installing ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {installProgress?.percent != null
                          ? `${Math.round(installProgress.percent)}%`
                          : "…"}
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3" />
                        Install
                      </>
                    )}
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function RuntimesSection() {
  const {
    installedNodeRuntimes,
    installedPythonRuntimes,
    availableNodeVersions,
    availablePythonVersions,
    availableVersionsLoaded,
    runtimeInstallLoading,
    runtimeInstallProgress,
    runtimeInstallError,
    isNodeVersionInstalled,
    isPythonVersionInstalled,
    isInstalling,
    handleInstallRuntime,
    handleUninstallRuntime,
    projects,
    loadRuntimesAndProjects,
  } = useOutletContext();

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Runtimes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Portable Node.js and Python versions stored in your data folder.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => loadRuntimesAndProjects()}
          className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0 mt-1"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Installed */}
      <div className="mb-8">
        <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-3">
          Installed
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InstalledRuntimeCard
            title="Node.js"
            type="node"
            runtimes={installedNodeRuntimes}
            projects={projects}
            onUninstall={handleUninstallRuntime}
          />
          <InstalledRuntimeCard
            title="Python"
            type="python"
            runtimes={installedPythonRuntimes}
            projects={projects}
            onUninstall={handleUninstallRuntime}
          />
        </div>
      </div>

      {/* Install new */}
      <div>
        <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-3">
          Install new version
        </h2>
        {runtimeInstallError && (
          <p className="text-sm text-destructive mb-3">{runtimeInstallError}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AvailableVersionsList
            title="Node.js"
            accentColor="text-emerald-400 hover:bg-emerald-400/10"
            type="node"
            versions={availableNodeVersions}
            loaded={availableVersionsLoaded}
            isVersionInstalled={isNodeVersionInstalled}
            isInstalling={isInstalling}
            installLoading={runtimeInstallLoading}
            installProgress={runtimeInstallProgress}
            onInstall={handleInstallRuntime}
          />
          <AvailableVersionsList
            title="Python"
            accentColor="text-sky-400 hover:bg-sky-400/10"
            type="python"
            versions={availablePythonVersions}
            loaded={availableVersionsLoaded}
            isVersionInstalled={isPythonVersionInstalled}
            isInstalling={isInstalling}
            installLoading={runtimeInstallLoading}
            installProgress={runtimeInstallProgress}
            onInstall={handleInstallRuntime}
          />
        </div>
      </div>
    </div>
  );
}
