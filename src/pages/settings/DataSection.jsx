import React from "react";
import { useOutletContext } from "react-router-dom";
import { FolderOpen, FileUp, RotateCcw, Loader2, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";

function ActionCard({ icon: Icon, accentColor, title, subtitle, actionLabel, onAction, disabled, loading }) {
  return (
    <div className="flex items-center gap-5 rounded-2xl border border-white/[0.07] bg-white/2.5 px-6 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.4)]">
      <div className={`rounded-xl p-3 shrink-0 ${accentColor}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{title}</p>
        {subtitle && (
          <p className="text-[12px] text-muted-foreground mt-0.5 truncate font-mono leading-snug" title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAction}
        disabled={disabled || loading}
        className="shrink-0 gap-2 border-white/10 hover:bg-white/10"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
        {actionLabel}
      </Button>
    </div>
  );
}

export default function DataSection() {
  const {
    userDataPath, backupCandidates, restoreLoading,
    handleOpenDataFolder, handleChooseBackupFile, handleRestoreFromPath,
  } = useOutletContext();

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Data & Backup</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your data folder and restore from backup files.
        </p>
      </div>

      <div className="space-y-3">
        <ActionCard
          icon={FolderOpen}
          accentColor="bg-emerald-500/15 text-emerald-400"
          title="Data Folder"
          subtitle={userDataPath || "Loading…"}
          actionLabel="Open"
          onAction={handleOpenDataFolder}
          disabled={!userDataPath}
        />
        <ActionCard
          icon={FileUp}
          accentColor="bg-violet-500/15 text-violet-400"
          title="Restore from Backup"
          subtitle="Import a .sqlite backup file to restore projects and categories."
          actionLabel="Choose file…"
          onAction={handleChooseBackupFile}
          loading={restoreLoading}
        />
      </div>

      {backupCandidates.length > 0 && (
        <div className="mt-8">
          <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-3">
            Backup files in data folder
          </h2>
          <div className="space-y-2">
            {backupCandidates.map((c) => (
              <div
                key={c.path}
                className="flex items-center gap-4 rounded-xl border border-white/[0.07] bg-white/2 px-4 py-3"
              >
                <HardDrive className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                <span className="flex-1 text-sm text-muted-foreground truncate" title={c.path}>
                  {c.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRestoreFromPath(c.path, true)}
                  disabled={restoreLoading}
                  className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  {restoreLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
