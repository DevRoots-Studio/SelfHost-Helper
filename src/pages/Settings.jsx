import React, { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, SlidersHorizontal, Database, Shield, Box, Download, Info } from "lucide-react";

const API = window.api;

const UPDATE_STATUS_IDLE = "idle";
const UPDATE_STATUS_CHECKING = "checking";
const UPDATE_STATUS_AVAILABLE = "available";
const UPDATE_STATUS_DOWNLOADING = "downloading";
const UPDATE_STATUS_DOWNLOADED = "downloaded";
const UPDATE_STATUS_ERROR = "error";

// ─────────────────────────────────────────────────────────────────────────────
// Settings nav sidebar
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { path: "general", label: "General", Icon: SlidersHorizontal },
  { path: "data", label: "Data & Backup", Icon: Database },
  { path: "backup", label: "Backup & Restore", Icon: Shield },
  { path: "runtimes", label: "Runtimes", Icon: Box },
  { path: "updates", label: "Updates", Icon: Download },
  { path: "about", label: "About", Icon: Info },
];

function SettingsNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="w-56 shrink-0 flex flex-col h-screen border-r border-white/5 bg-transparent backdrop-blur-xl overflow-hidden">
      {/* Brand + back */}
      <div className="px-4 pt-5 pb-4 drag">
        <div className="flex items-center gap-2.5 mb-5 no-drag">
          <img
            src="media://app/resources/icon.png"
            alt="SelfHost Helper"
            className="w-8 h-8 rounded-lg object-cover shrink-0"
            draggable={false}
          />
          <span className="font-bold text-sm tracking-tight">Settings</span>
        </div>
        <Link
          to="/"
          className="no-drag flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to app
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 pb-6 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ path, label, Icon }) => {
          const isActive = location.pathname.includes(`/settings/${path}`);
          return (
            <button
              key={path}
              onClick={() => navigate(`/settings/${path}`)}
              className={[
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer text-left",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
              ].join(" ")}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings layout (holds all state + handlers, passes via Outlet context)
// ─────────────────────────────────────────────────────────────────────────────

export default function Settings() {
  // ── General ──────────────────────────────────────────────────────────────
  const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(false);
  const [clearLogsBeforeStart, setClearLogsBeforeStart] = useState(false);
  const [startMaximized, setStartMaximized] = useState(false);

  // ── Data & Backup ─────────────────────────────────────────────────────────
  const [appVersion, setAppVersion] = useState("");
  const [userDataPath, setUserDataPath] = useState("");
  const [backupCandidates, setBackupCandidates] = useState([]);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // ── Updates ───────────────────────────────────────────────────────────────
  const [updateStatus, setUpdateStatus] = useState(UPDATE_STATUS_IDLE);
  const [updateVersion, setUpdateVersion] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const unsubUpdaterRef = useRef(null);

  // ── Runtimes ─────────────────────────────────────────────────────────────
  const [installedNodeRuntimes, setInstalledNodeRuntimes] = useState([]);
  const [installedPythonRuntimes, setInstalledPythonRuntimes] = useState([]);
  const [availableNodeVersions, setAvailableNodeVersions] = useState([]);
  const [availablePythonVersions, setAvailablePythonVersions] = useState([]);
  const [availableVersionsLoaded, setAvailableVersionsLoaded] = useState(false);
  const [projects, setProjects] = useState([]);
  const [runtimeInstallLoading, setRuntimeInstallLoading] = useState(false);
  const [runtimeInstallProgress, setRuntimeInstallProgress] = useState(null);
  const [runtimeInstallError, setRuntimeInstallError] = useState("");
  const [installingRuntime, setInstallingRuntime] = useState(null);
  const [exportConfigLoading, setExportConfigLoading] = useState(false);
  const [importConfigLoading, setImportConfigLoading] = useState(false);

  // ── Initialization ────────────────────────────────────────────────────────
  useEffect(() => {
    loadSettings();
    loadAutoLaunchStatus();
    loadAppVersion();
    loadBackupInfo();
    loadRuntimesAndProjects();
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

  useEffect(() => {
    if (!API.onRuntimeProgress) return;
    const unsub = API.onRuntimeProgress((payload) => {
      if (payload?.phase === "done") {
        setRuntimeInstallProgress(null);
        setRuntimeInstallLoading(false);
        setInstallingRuntime(null);
        setRuntimeInstallError("");
        loadRuntimesAndProjects();
        toast.success("Runtime installed successfully");
      } else if (payload?.phase === "error") {
        setRuntimeInstallError(payload?.error ?? "Install failed");
        setRuntimeInstallProgress(null);
        setRuntimeInstallLoading(false);
        setInstallingRuntime(null);
        toast.error(payload?.error ?? "Install failed");
      } else if (payload?.phase === "download" && payload?.percent != null) {
        setRuntimeInstallProgress({ phase: "download", percent: payload.percent });
      } else if (payload?.phase === "extract") {
        setRuntimeInstallProgress({ phase: "extract", percent: 50 });
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadRuntimesAndProjects = async () => {
    try {
      if (API.runtimeListInstalled) {
        const [nodeList, pythonList] = await Promise.all([
          API.runtimeListInstalled("node"),
          API.runtimeListInstalled("python"),
        ]);
        setInstalledNodeRuntimes(Array.isArray(nodeList) ? nodeList : []);
        setInstalledPythonRuntimes(Array.isArray(pythonList) ? pythonList : []);
      }
      if (API.getProjects) {
        const list = await API.getProjects();
        setProjects(Array.isArray(list) ? list : []);
      }
      if (window.api?.runtimeListAvailable) {
        const [nodeAvail, pythonAvail] = await Promise.allSettled([
          window.api.runtimeListAvailable("node"),
          window.api.runtimeListAvailable("python"),
        ]);
        const toArray = (v) => {
          if (Array.isArray(v)) return v;
          if (v && typeof v === "object" && typeof v.length === "number") return Array.from(v);
          return [];
        };
        setAvailableNodeVersions(nodeAvail.status === "fulfilled" ? toArray(nodeAvail.value) : []);
        setAvailablePythonVersions(
          pythonAvail.status === "fulfilled" ? toArray(pythonAvail.value) : []
        );
      }
    } catch (e) {
      console.error("Failed to load runtimes/projects", e);
      setAvailableNodeVersions([]);
      setAvailablePythonVersions([]);
    } finally {
      setAvailableVersionsLoaded(true);
    }
  };

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
      setStartMaximized(settings.startMaximized ?? false);
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

  // ── Handlers ─────────────────────────────────────────────────────────────
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
      toast.error("Failed to change auto-launch setting");
    }
  };

  const handleClearLogsToggle = async (enabled) => {
    try {
      await API.updateSettings({ clearLogsBeforeStart: enabled });
      setClearLogsBeforeStart(enabled);
      toast.success(`Clear Logs Before Start ${enabled ? "enabled" : "disabled"} globally`);
    } catch (e) {
      toast.error("Failed to update setting");
    }
  };

  const handleStartMaximizedToggle = async (enabled) => {
    try {
      await API.updateSettings({ startMaximized: enabled });
      setStartMaximized(enabled);
      toast.success(`Start maximized ${enabled ? "enabled" : "disabled"}`);
    } catch (e) {
      toast.error("Failed to update setting");
    }
  };

  const handleOpenDataFolder = async () => {
    try {
      if (userDataPath) await API.openPath(userDataPath);
      else toast.error("Data folder path not available");
    } catch (e) {
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
      const { projects: p = 0, categories: c = 0 } = result?.restored ?? {};
      toast.success(`Restored ${p} projects and ${c} categories.`);
      loadBackupInfo();
    } catch (e) {
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

  const handleInstallRuntime = async (type, versionId) => {
    if (!versionId?.trim()) return;
    setRuntimeInstallLoading(true);
    setRuntimeInstallError("");
    setInstallingRuntime({ type, versionId: versionId.trim() });
    setRuntimeInstallProgress({ phase: "download", percent: 0 });
    try {
      await API.runtimeInstall?.(type, versionId.trim());
    } catch (e) {
      setRuntimeInstallError(e?.message ?? "Install failed");
      setRuntimeInstallProgress(null);
      setRuntimeInstallLoading(false);
      setInstallingRuntime(null);
      toast.error(e?.message ?? "Install failed");
    }
  };

  const handleUninstallRuntime = async (type, id) => {
    const usedBy = projects.filter(
      (p) =>
        (type === "node" && (p.nodeVersionId === id || p.nodeVersionId === id?.toString())) ||
        (type === "python" && (p.pythonVersionId === id || p.pythonVersionId === id?.toString()))
    );
    const force = usedBy.length > 0;
    if (force) {
      const names = usedBy.map((p) => p.name).join(", ");
      if (
        !confirm(
          `This version is used by: ${names}. Remove anyway? Those projects will use system PATH until you pick another version.`
        )
      )
        return;
    }
    try {
      await API.runtimeUninstall?.(type, id, force);
      toast.success("Runtime removed");
      loadRuntimesAndProjects();
    } catch (e) {
      toast.error(e?.message ?? "Failed to remove");
    }
  };

  const handleExportConfig = async (passphrase) => {
    if (!API.exportConfig) return;
    setExportConfigLoading(true);
    try {
      const result = await API.exportConfig(passphrase);
      if (result?.canceled) return;
      if (result?.success && result?.path) {
        toast.success("Backup exported successfully");
      } else {
        toast.success("Backup export completed");
      }
    } catch (e) {
      toast.error(e?.message || "Failed to export backup");
    } finally {
      setExportConfigLoading(false);
    }
  };

  const handleImportConfig = async (passphrase) => {
    if (!API.importConfig) return;
    setImportConfigLoading(true);
    try {
      const result = await API.importConfig(passphrase, true);
      if (result?.canceled) return;
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      const restored = result?.restored || {};
      const projectsCount = restored.projects ?? 0;
      const categoriesCount = restored.categories ?? 0;
      toast.success(
        `Imported backup: ${projectsCount} servers and ${categoriesCount} categories restored.`
      );
      // Refresh projects and related views after restore
      await loadRuntimesAndProjects();
      await loadBackupInfo();
    } catch (e) {
      toast.error(e?.message || "Failed to import backup");
    } finally {
      setImportConfigLoading(false);
    }
  };

  const isNodeVersionInstalled = (id) =>
    installedNodeRuntimes.some((r) => r.id === id || r.version === id);
  const isPythonVersionInstalled = (id) =>
    installedPythonRuntimes.some((r) => r.id === id || r.version === id);
  const isInstalling = (type, versionId) =>
    installingRuntime?.type === type && installingRuntime?.versionId === versionId;

  const outletContext = {
    // General
    autoLaunchEnabled,
    handleAutoLaunchToggle,
    clearLogsBeforeStart,
    handleClearLogsToggle,
    startMaximized,
    handleStartMaximizedToggle,
    // Data
    userDataPath,
    backupCandidates,
    restoreLoading,
    handleOpenDataFolder,
    handleChooseBackupFile,
    handleRestoreFromPath,
    // Runtimes
    installedNodeRuntimes,
    installedPythonRuntimes,
    availableNodeVersions,
    availablePythonVersions,
    availableVersionsLoaded,
    runtimeInstallLoading,
    runtimeInstallProgress,
    runtimeInstallError,
    installingRuntime,
    handleInstallRuntime,
    handleUninstallRuntime,
    isNodeVersionInstalled,
    isPythonVersionInstalled,
    isInstalling,
    projects,
    loadRuntimesAndProjects,
    // Updates
    updateStatus,
    updateVersion,
    updateError,
    releaseNotes,
    handleCheckForUpdates,
    handleStartInstall,
    handleRestartToApply,
    // Shared
    appVersion,
    // Encrypted config backup
    handleExportConfig,
    handleImportConfig,
    exportConfigLoading,
    importConfigLoading,
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <SettingsNav />
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <Outlet context={outletContext} />
      </main>
    </div>
  );
}
