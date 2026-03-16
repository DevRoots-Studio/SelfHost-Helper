import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Lock, ShieldCheck, UploadCloud, DownloadCloud, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function PasswordField({ label, value, onChange, disabled }) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground/80 flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5 text-muted-foreground/70" />
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type={show ? "text" : "password"}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "flex-1 h-9 rounded-md border border-white/10 bg-black/40 px-3 text-sm outline-none",
            "placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary",
            disabled && "opacity-60 cursor-not-allowed"
          )}
          placeholder="Enter a strong passphrase…"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="border-white/10 hover:bg-white/10"
          onClick={() => setShow((prev) => !prev)}
        >
          {show ? "Hide" : "Show"}
        </Button>
      </div>
    </div>
  );
}

export default function BackupRestoreSection() {
  const {
    appVersion,
    projects,
    handleExportConfig,
    handleImportConfig,
    exportConfigLoading,
    importConfigLoading,
  } = useOutletContext();

  const [exportPassphrase, setExportPassphrase] = useState("");
  const [importPassphrase, setImportPassphrase] = useState("");

  const hasProjects = Array.isArray(projects) && projects.length > 0;

  const onExport = async () => {
    if (!exportPassphrase.trim()) return;
    await handleExportConfig(exportPassphrase.trim());
  };

  const onImport = async () => {
    if (!importPassphrase.trim()) return;
    const confirmMessage =
      "Importing a backup will overwrite your current servers, categories, and settings with values from the backup.\n\nDo you want to continue?";
    if (!window.confirm(confirmMessage)) return;
    await handleImportConfig(importPassphrase.trim());
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Backup &amp; Restore</h1>
        <p className="text-sm text-muted-foreground">
          Securely export and import your servers and app settings as an encrypted backup file.
        </p>
        <p className="text-xs text-muted-foreground/80 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Backups are encrypted with your passphrase. Without it, they cannot be restored.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-white/[0.07] bg-white/2.5 shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1">
                Export
              </p>
              <p className="text-sm text-muted-foreground">
                Create an encrypted backup of your servers, categories, and app settings.
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground/70">
              <div>Projects: {hasProjects ? projects.length : 0}</div>
              {appVersion && <div>App v{appVersion}</div>}
            </div>
          </div>
          <div className="px-6 py-5 space-y-4">
            <PasswordField
              label="Export passphrase"
              value={exportPassphrase}
              onChange={setExportPassphrase}
              disabled={exportConfigLoading}
            />
            <div className="flex items-center justify-between gap-4">
              <p className="text-[11px] text-muted-foreground/65">
                Store the backup file and passphrase safely. Anyone with both can access your
                server configuration and secrets.
              </p>
              <Button
                type="button"
                size="sm"
                className="gap-2"
                disabled={!exportPassphrase.trim() || exportConfigLoading}
                onClick={onExport}
              >
                {exportConfigLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting…
                  </>
                ) : (
                  <>
                    <DownloadCloud className="h-4 w-4" />
                    Export backup
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/2.5 shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1">
                Import
              </p>
              <p className="text-sm text-muted-foreground">
                Restore configuration from an encrypted backup file.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Overwrites existing configuration</span>
            </div>
          </div>
          <div className="px-6 py-5 space-y-4">
            <PasswordField
              label="Import passphrase"
              value={importPassphrase}
              onChange={setImportPassphrase}
              disabled={importConfigLoading}
            />
            <div className="flex items-center justify-between gap-4">
              <p className="text-[11px] text-muted-foreground/70">
                You will be asked to choose a `.selfhost.json` backup file. The current servers and
                settings will be overwritten with the contents of that backup.
              </p>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="gap-2"
                disabled={!importPassphrase.trim() || importConfigLoading}
                onClick={onImport}
              >
                {importConfigLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Import backup
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

