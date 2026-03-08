import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Terminal,
  FolderOpen,
  FileUp,
  RotateCcw,
  Download,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const API = window.api;

const UPDATE_STATUS_IDLE = "idle";
const UPDATE_STATUS_CHECKING = "checking";
const UPDATE_STATUS_AVAILABLE = "available";
const UPDATE_STATUS_DOWNLOADING = "downloading";
const UPDATE_STATUS_DOWNLOADED = "downloaded";
const UPDATE_STATUS_ERROR = "error";

export default function Settings() {
  const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(false);
  const [clearLogsBeforeStart, setClearLogsBeforeStart] = useState(false);
  const [appVersion, setAppVersion] = useState("");
  const [userDataPath, setUserDataPath] = useState("");
  const [backupCandidates, setBackupCandidates] = useState([]);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const [updateStatus, setUpdateStatus] = useState(UPDATE_STATUS_IDLE);
  const [updateVersion, setUpdateVersion] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const unsubUpdaterRef = useRef(null);

  useEffect(() => {
    loadSettings();
    loadAutoLaunchStatus();
    loadAppVersion();
    loadBackupInfo();
  }, []);

  useEffect(() => {
    const syncUpdateStatus = async () => {
      try {
        const status = await API.getUpdateStatus?.();
        if (status && typeof status.status === "string") {
          setUpdateStatus(status.status);
          setUpdateVersion(status.version ?? "");
          setReleaseNotes(status.releaseNotes ?? "");
          setUpdateError(status.error ?? "");
        }
      } catch (_) {}
    };
    syncUpdateStatus();
    unsubUpdaterRef.current = API.onUpdaterStatus?.((payload) => {
      if (payload?.status) setUpdateStatus(payload.status);
      if (payload?.version != null) setUpdateVersion(payload.version ?? "");
      if (payload?.releaseNotes != null) setReleaseNotes(payload.releaseNotes ?? "");
      if (payload?.error != null) setUpdateError(payload.error ?? "");
    });
    return () => {
      if (typeof unsubUpdaterRef.current === "function") unsubUpdaterRef.current();
    };
  }, []);

  const loadBackupInfo = async () => {
    try {
      const path = await API.getUserDataPath();
      setUserDataPath(path || "");
      const list = await API.listLegacyBackupCandidates();
      setBackupCandidates(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Failed to load backup info", e);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await API.getSettings();
      setClearLogsBeforeStart(settings.clearLogsBeforeStart);
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  };

  const loadAutoLaunchStatus = async () => {
    try {
      const enabled = await API.isAutoLaunchEnabled();
      setAutoLaunchEnabled(enabled);
    } catch (e) {
      console.error("Failed to load auto-launch status", e);
    }
  };

  const loadAppVersion = async () => {
    try {
      const version = await API.getVersion();
      setAppVersion(version);
    } catch (e) {
      console.error("Failed to load app version", e);
    }
  };

  const handleAutoLaunchToggle = async (enabled) => {
    try {
      if (enabled) {
        await API.enableAutoLaunch();
        toast.success("Auto-launch enabled");
      } else {
        await API.disableAutoLaunch();
        toast.info("Auto-launch disabled");
      }
      setAutoLaunchEnabled(enabled);
    } catch (e) {
      console.error("Failed to toggle auto-launch", e);
      toast.error("Failed to change auto-launch setting");
    }
  };

  const handleClearLogsToggle = async (enabled) => {
    try {
      await API.updateSettings({ clearLogsBeforeStart: enabled });
      setClearLogsBeforeStart(enabled);
      toast.success(`Clear Logs Before Start ${enabled ? "enabled" : "disabled"} globally`);
    } catch (e) {
      console.error("Failed to toggle clear logs setting", e);
      toast.error("Failed to update setting");
    }
  };

  const handleOpenDataFolder = async () => {
    try {
      if (userDataPath) await API.openPath(userDataPath);
      else toast.error("Data folder path not available");
    } catch (e) {
      console.error("Failed to open data folder", e);
      toast.error("Failed to open folder");
    }
  };

  const handleRestoreFromPath = async (filePath, replaceExisting = true) => {
    if (!filePath) return;
    setRestoreLoading(true);
    try {
      const result = await API.restoreFromLegacyBackup(filePath, replaceExisting);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      const { projects = 0, categories = 0 } = result?.restored ?? {};
      toast.success(
        `Restored ${projects} projects and ${categories} categories. The project list will refresh.`
      );
      loadBackupInfo();
    } catch (e) {
      console.error("Restore failed", e);
      toast.error(e?.message || "Restore failed");
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleChooseBackupFile = async () => {
    try {
      const filePath = await API.openBackupFileDialog();
      if (filePath) await handleRestoreFromPath(filePath, true);
    } catch (e) {
      console.error("Failed to open backup dialog or restore", e);
    }
  };

  const handleCheckForUpdates = async () => {
    setUpdateError("");
    try {
      await API.checkForUpdates?.();
    } catch (e) {
      setUpdateStatus(UPDATE_STATUS_ERROR);
      setUpdateError(e?.message ?? "Failed to check for updates");
    }
  };

  const handleStartInstall = () => {
    setUpdateError("");
    API.startInstall?.();
  };

  const handleRestartToApply = () => {
    API.restartToApplyUpdate?.();
  };

  const renderReleaseNotes = (notes) => {
    if (!notes || !notes.trim()) return null;
    return (
      <div className="mt-3 p-4 rounded-lg bg-black/20 border border-white/5 text-sm text-muted-foreground overflow-y-auto max-h-64 prose prose-invert prose-sm max-w-none">
        <ReactMarkdown
          components={{
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {children}
              </a>
            ),
          }}
        >
          {notes}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-4xl mx-auto h-screen overflow-y-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-3xl font-bold">App Settings</h1>
      </div>

      <div className="space-y-8">
        {/* General Settings */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-white/10 pb-2">General</h2>

          <div className="p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-launch" className="text-base font-semibold cursor-pointer">
                  Launch on Startup
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically start SelfHost Helper when your computer boots up.
                </p>
              </div>
              <Switch
                id="auto-launch"
                checked={autoLaunchEnabled}
                onCheckedChange={handleAutoLaunchToggle}
              />
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-white/5">
              <div className="space-y-1">
                <Label htmlFor="clear-logs" className="text-base font-semibold cursor-pointer">
                  Clear Terminal Logs Before Start (Global)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically clear the logs of any project before it starts.
                </p>
              </div>
              <Switch
                id="clear-logs"
                checked={clearLogsBeforeStart}
                onCheckedChange={handleClearLogsToggle}
              />
            </div>
          </div>
        </section>

        {/* Data & backup – restore from legacy/backup */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-white/10 pb-2">Data &amp; backup</h2>

          <div className="p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/5 shadow-xl space-y-4">
            <p className="text-sm text-muted-foreground">
              If you lost your projects after updating (e.g. from an older version), you can restore
              from a backup. Backups are created automatically when the app migrates an old
              database. Put your backup file in the data folder, or choose it from anywhere.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenDataFolder}
                disabled={!userDataPath}
                className="gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                Open data folder
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleChooseBackupFile}
                disabled={restoreLoading}
                className="gap-2"
              >
                <FileUp className="h-4 w-4" />
                Choose backup file…
              </Button>
            </div>

            {backupCandidates.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <p className="text-sm font-medium">Backup files in data folder:</p>
                <ul className="space-y-1">
                  {backupCandidates.map((c) => (
                    <li key={c.path} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-muted-foreground" title={c.path}>
                        {c.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestoreFromPath(c.path, true)}
                        disabled={restoreLoading}
                        className="gap-1 shrink-0"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Updates */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-white/10 pb-2">Updates</h2>

          <div className="p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/5 shadow-xl space-y-4">
            <p className="text-sm text-muted-foreground">
              Current version:{" "}
              <span className="font-medium text-foreground">{appVersion || "—"}</span>
            </p>

            {updateStatus === UPDATE_STATUS_IDLE && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCheckForUpdates}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Check for updates
              </Button>
            )}

            {updateStatus === UPDATE_STATUS_CHECKING && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking for updates…
              </div>
            )}

            {updateStatus === UPDATE_STATUS_AVAILABLE && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  A new version <strong>v{updateVersion}</strong> is available.
                </p>
                {renderReleaseNotes(releaseNotes)}
                <Button type="button" size="sm" onClick={handleStartInstall} className="gap-2">
                  <Download className="h-4 w-4" />
                  Install
                </Button>
              </div>
            )}

            {(updateStatus === UPDATE_STATUS_DOWNLOADING || updateStatus === "downloading") && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Downloading… Please wait.
              </div>
            )}

            {updateStatus === UPDATE_STATUS_DOWNLOADED && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-green-500 dark:text-green-400">
                  Installation complete. Please restart the app to use the new version.
                </p>
                {updateVersion && (
                  <p className="text-sm text-muted-foreground">New version: v{updateVersion}</p>
                )}
                {renderReleaseNotes(releaseNotes)}
                <Button type="button" size="sm" onClick={handleRestartToApply} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Restart
                </Button>
              </div>
            )}

            {updateStatus === UPDATE_STATUS_ERROR && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{updateError || "An error occurred."}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCheckForUpdates}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Check for updates again
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* About Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-white/10 pb-2">About</h2>

          <div className="p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-32 bg-primary/20 blur-[100px] rounded-full pointer-events-none -mr-16 -mt-16 opacity-50 group-hover:opacity-70 transition-opacity" />

            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-14 h-14 bg-linear-to-br from-primary to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
                <Terminal className="text-white h-8 w-8" />
              </div>
              <div>
                <h3 className="font-bold text-xl tracking-tight">SelfHost Helper</h3>
                <p className="text-sm text-muted-foreground">
                  Version {appVersion || "Loading..."}
                </p>
              </div>
            </div>
            <p className="text-muted-foreground relative z-10 max-w-lg leading-relaxed">
              Manage and monitor your self-hosted Node.js applications with ease. Built with
              Electron, React, and passion.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
