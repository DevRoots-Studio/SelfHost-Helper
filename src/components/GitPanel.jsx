import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  GitBranch,
  Upload,
  Download,
  Check,
  Loader2,
  ExternalLink,
  RefreshCw,
  FileDiff,
  X,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
const API = window.api;

function getFileDisplayStatus(file) {
  const code = file.workingDir || file.working_dir || "?";
  switch (code) {
    case "U":
      return { code: "U", label: "Untracked", tone: "text-emerald-400" };
    case "M":
      return { code: "M", label: "Modified", tone: "text-amber-400" };
    case "A":
      return { code: "A", label: "Added", tone: "text-sky-400" };
    case "D":
      return { code: "D", label: "Deleted", tone: "text-rose-400" };
    default:
      return { code, label: "Changed", tone: "text-muted-foreground" };
  }
}

export default function GitPanel({
  projectPath,
  isOpen,
  onClose,
  onRefreshFileTree,
  onStatusChange,
}) {
  const [status, setStatus] = useState(null);
  const [branches, setBranches] = useState({ current: null, all: [] });
  const [commitMessage, setCommitMessage] = useState("");
  const [error, setError] = useState(null);
  const [remoteUrl, setRemoteUrl] = useState(null);
  const [diffFile, setDiffFile] = useState(null);
  const [diffContent, setDiffContent] = useState("");
  const [diffLoading, setDiffLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingStage, setLoadingStage] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [loadingPush, setLoadingPush] = useState(false);
  const [loadingPull, setLoadingPull] = useState(false);
  const [loadingBranch, setLoadingBranch] = useState(false);
  const [isInitializingRepo, setIsInitializingRepo] = useState(false);
  const [remotes, setRemotes] = useState([]);
  const [remoteEditName, setRemoteEditName] = useState(null);
  const [remoteAddOpen, setRemoteAddOpen] = useState(false);
  const [remoteFormName, setRemoteFormName] = useState("");
  const [remoteFormUrl, setRemoteFormUrl] = useState("");
  const [savingRemote, setSavingRemote] = useState(false);

  const stagedFiles = status?.files?.filter((f) => f.index && f.index !== " ") || [];
  const workingFiles =
    status?.files?.filter((f) => !f.index || f.index === " " || f.workingDir === "U") || [];

  const loadGitStatus = useCallback(async () => {
    if (!projectPath) return;
    setError(null);
    setIsRefreshing(true);
    try {
      const [s, b, url, remotesList] = await Promise.all([
        API.gitStatus(projectPath),
        API.gitBranches(projectPath),
        API.gitRemoteUrl(projectPath),
        API.gitRemotes?.(projectPath) ?? Promise.resolve([]),
      ]);
      setStatus(s);
      setBranches(b);
      setRemoteUrl(url);
      setRemotes(Array.isArray(remotesList) ? remotesList : []);
      if (!s?.isRepo) {
        setError(
          "Git is not initialized for this project. Initialize a repository to use Git features."
        );
      }
      onStatusChange?.(s);
    } catch (err) {
      setStatus(null);
      setBranches({ current: null, all: [] });
      setRemotes([]);
      setError(err?.message ?? "Git status unavailable");
      onStatusChange?.(null);
    } finally {
      setIsRefreshing(false);
    }
  }, [onStatusChange, projectPath]);

  useEffect(() => {
    if (isOpen && projectPath) {
      loadGitStatus();
    }
  }, [isOpen, loadGitStatus, projectPath]);

  const handleAddAll = async () => {
    if (!projectPath) return;
    setLoadingStage(true);
    try {
      await API.gitAdd(projectPath, []);
      toast.success("Staged all changes");
      loadGitStatus();
    } catch (err) {
      toast.error(err?.message ?? "Failed to stage");
    } finally {
      setLoadingStage(false);
    }
  };

  const handleStageFile = async (filePath) => {
    if (!projectPath || !filePath) return;
    setLoadingStage(true);
    try {
      await API.gitAdd(projectPath, [filePath]);
      toast.success(`Staged ${filePath}`);
      loadGitStatus();
    } catch (err) {
      toast.error(err?.message ?? "Failed to stage file");
    } finally {
      setLoadingStage(false);
    }
  };

  const handleUnstageFile = async (filePath) => {
    if (!projectPath || !filePath) return;
    setLoadingStage(true);
    try {
      await API.gitUnstage(projectPath, [filePath]);
      toast.success(`Unstaged ${filePath}`);
      loadGitStatus();
    } catch (err) {
      toast.error(err?.message ?? "Failed to unstage file");
    } finally {
      setLoadingStage(false);
    }
  };

  const handleCommit = async () => {
    if (!projectPath || !commitMessage.trim()) return;
    setLoadingCommit(true);
    try {
      await API.gitCommit(projectPath, commitMessage.trim());
      toast.success("Committed");
      setCommitMessage("");
      loadGitStatus();
      onRefreshFileTree?.();
    } catch (err) {
      toast.error(err?.message ?? "Failed to commit");
    } finally {
      setLoadingCommit(false);
    }
  };

  const handlePush = async () => {
    if (!projectPath) return;
    setLoadingPush(true);
    try {
      await API.gitPush(projectPath);
      toast.success("Pushed");
      loadGitStatus();
    } catch (err) {
      toast.error(err?.message ?? "Failed to push");
    } finally {
      setLoadingPush(false);
    }
  };

  const handlePull = async () => {
    if (!projectPath) return;
    setLoadingPull(true);
    try {
      await API.gitPull(projectPath);
      toast.success("Pulled");
      loadGitStatus();
      onRefreshFileTree?.();
    } catch (err) {
      toast.error(err?.message ?? "Failed to pull");
    } finally {
      setLoadingPull(false);
    }
  };

  const handleCheckoutBranch = async (branchName) => {
    if (!projectPath || !branchName || branchName === branches.current) return;
    setLoadingBranch(true);
    try {
      await API.gitCheckout(projectPath, branchName);
      toast.success(`Checked out ${branchName}`);
      await loadGitStatus();
      onRefreshFileTree?.();
    } catch (err) {
      toast.error(err?.message ?? "Failed to switch branch");
    } finally {
      setLoadingBranch(false);
    }
  };

  const openOnGitHub = () => {
    if (!remoteUrl) return;
    let url = remoteUrl.replace(/^git@github\.com:/, "https://github.com/").replace(/\.git$/, "");
    if (status?.currentBranch) url += `/tree/${status.currentBranch}`;
    API.openExternal(url);
  };

  const handleViewDiff = async (filePath) => {
    if (!projectPath) return;
    setDiffFile(filePath);
    setDiffContent("");
    setDiffLoading(true);
    try {
      const content = await API.gitDiff(projectPath, filePath);
      setDiffContent(content ?? "");
    } catch (err) {
      toast.error(err?.message ?? "Failed to load diff");
      setDiffContent("");
    } finally {
      setDiffLoading(false);
    }
  };

  const loadGitStatusRef = useRef(loadGitStatus);
  loadGitStatusRef.current = loadGitStatus;

  useEffect(() => {
    if (!isOpen || !projectPath || !API.onFileChange) return;
    let debounceTimer = null;
    const normalize = (p) => (p || "").replace(/\\/g, "/");
    const root = normalize(projectPath);

    const unsubscribe = API.onFileChange(({ filePath }) => {
      if (!filePath) return;
      const fp = normalize(filePath);
      if (!fp.startsWith(root)) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadGitStatusRef.current?.();
      }, 400);
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe?.();
    };
  }, [isOpen, projectPath]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full border-t border-white/5 bg-background/80 text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <span className="font-medium flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" /> Git
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 cursor-pointer"
            onClick={loadGitStatus}
            title="Refresh"
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 cursor-pointer"
            onClick={onClose}
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {error && <p className="text-muted-foreground text-xs">{error}</p>}
        {!status?.isRepo && (
          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col gap-2">
              <div className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                Initialize local Git repository
              </div>
              <p className="text-xs text-muted-foreground">
                Set up Git for this project folder so you can track changes, commit, and sync with
                remotes.
              </p>
              <Button
                size="sm"
                className="mt-1 cursor-pointer text-xs self-start"
                disabled={isInitializingRepo}
                onClick={async () => {
                  if (!projectPath) return;
                  setIsInitializingRepo(true);
                  try {
                    const res = await API.gitInit(projectPath);
                    if (res?.alreadyRepo) {
                      toast.info("Git is already initialized for this folder.");
                    } else {
                      toast.success("Initialized Git repository for this project.");
                    }
                    await loadGitStatus();
                  } catch (err) {
                    toast.error(err?.message ?? "Failed to initialize Git repository");
                  } finally {
                    setIsInitializingRepo(false);
                  }
                }}
              >
                {isInitializingRepo ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" /> Initializing...
                  </>
                ) : (
                  "Initialize Git here"
                )}
              </Button>
            </div>
          </div>
        )}
        {status?.isRepo && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground text-xs">Branch</span>
              <div className="flex items-center gap-1">
                <Select
                  value={branches.current || ""}
                  onValueChange={handleCheckoutBranch}
                  disabled={!branches.all?.length || loadingBranch}
                >
                  <SelectTrigger className="h-7 px-2 text-xs font-mono w-40 bg-background/80 border-white/10">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.all?.map((b) => (
                      <SelectItem key={b} value={b} className="font-mono text-xs">
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingBranch && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              {(status.ahead > 0 || status.behind > 0) && (
                <span className="text-xs text-muted-foreground">
                  {status.ahead > 0 && `↑${status.ahead}`}
                  {status.behind > 0 && ` ↓${status.behind}`}
                </span>
              )}
            </div>

            {/* Remotes: view, add, edit, remove */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Remotes
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5 text-[10px] cursor-pointer gap-1"
                  onClick={() => {
                    setRemoteAddOpen(true);
                    setRemoteFormName("");
                    setRemoteFormUrl("");
                    setRemoteEditName(null);
                  }}
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              {remoteAddOpen && (
                <div className="flex flex-col gap-1.5 p-2 rounded-md bg-white/5 border border-white/10">
                  <input
                    type="text"
                    value={remoteFormName}
                    onChange={(e) => setRemoteFormName(e.target.value)}
                    placeholder="Remote name (e.g. origin)"
                    className="px-2 py-1 text-xs bg-black/30 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text"
                    value={remoteFormUrl}
                    onChange={(e) => setRemoteFormUrl(e.target.value)}
                    placeholder="URL (https://... or git@...)"
                    className="px-2 py-1 text-xs bg-black/30 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="h-6 text-[10px] cursor-pointer"
                      disabled={savingRemote || !remoteFormName.trim() || !remoteFormUrl.trim()}
                      onClick={async () => {
                        if (!projectPath || !remoteFormName.trim() || !remoteFormUrl.trim()) return;
                        setSavingRemote(true);
                        try {
                          await API.gitAddRemote(
                            projectPath,
                            remoteFormName.trim(),
                            remoteFormUrl.trim()
                          );
                          toast.success(`Remote ${remoteFormName.trim()} added`);
                          setRemoteAddOpen(false);
                          setRemoteFormName("");
                          setRemoteFormUrl("");
                          loadGitStatus();
                        } catch (err) {
                          toast.error(err?.message ?? "Failed to add remote");
                        } finally {
                          setSavingRemote(false);
                        }
                      }}
                    >
                      {savingRemote ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] cursor-pointer"
                      onClick={() => {
                        setRemoteAddOpen(false);
                        setRemoteFormName("");
                        setRemoteFormUrl("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {remotes.length === 0 && !remoteAddOpen && (
                <p className="text-[11px] text-muted-foreground">
                  No remotes. Add one to push/pull.
                </p>
              )}
              <ul className="space-y-1">
                {remotes.map((r) => (
                  <li key={r.name} className="flex items-center gap-1.5 group text-xs">
                    {remoteEditName === r.name ? (
                      <div className="flex-1 flex flex-col gap-1 min-w-0">
                        <input
                          type="text"
                          defaultValue={r.fetch}
                          id={`remote-url-${r.name}`}
                          className="px-2 py-1 text-xs bg-black/30 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Remote URL"
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-6 text-[10px] cursor-pointer"
                            disabled={savingRemote}
                            onClick={async () => {
                              const input = document.getElementById(`remote-url-${r.name}`);
                              const url = input?.value?.trim();
                              if (!projectPath || !url) return;
                              setSavingRemote(true);
                              try {
                                await API.gitAddRemote(projectPath, r.name, url);
                                toast.success(`Remote ${r.name} updated`);
                                setRemoteEditName(null);
                                loadGitStatus();
                              } catch (err) {
                                toast.error(err?.message ?? "Failed to update remote");
                              } finally {
                                setSavingRemote(false);
                              }
                            }}
                          >
                            {savingRemote ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] cursor-pointer"
                            onClick={() => setRemoteEditName(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span
                          className="font-mono text-muted-foreground shrink-0 w-14 truncate"
                          title={r.name}
                        >
                          {r.name}
                        </span>
                        <span
                          className="flex-1 min-w-0 truncate text-muted-foreground"
                          title={r.fetch}
                        >
                          {r.fetch || r.push}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                          onClick={() => {
                            setRemoteEditName(r.name);
                            setRemoteAddOpen(false);
                          }}
                          title="Edit URL"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 cursor-pointer shrink-0 text-destructive hover:text-destructive"
                          onClick={async () => {
                            if (!projectPath || !confirm(`Remove remote "${r.name}"?`)) return;
                            try {
                              await API.gitRemoveRemote(projectPath, r.name);
                              toast.success(`Remote ${r.name} removed`);
                              loadGitStatus();
                            } catch (err) {
                              toast.error(err?.message ?? "Failed to remove remote");
                            }
                          }}
                          title="Remove remote"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {(stagedFiles.length > 0 || workingFiles.length > 0) && (
              <div className="space-y-2">
                {stagedFiles.length > 0 && (
                  <div>
                    <div className="text-muted-foreground text-xs mb-1 flex items-center gap-1">
                      <span>Staged</span>
                      <span className="text-[10px] text-muted-foreground/80">
                        ({stagedFiles.length})
                      </span>
                    </div>
                    <ul className="max-h-24 overflow-auto space-y-0.5 text-xs">
                      {stagedFiles.slice(0, 20).map((f) => {
                        const { code, tone, label } = getFileDisplayStatus(f);
                        return (
                          <li key={`staged-${f.path}`} className="flex items-center gap-1 group">
                            <span className={cn("w-4 text-center font-mono", tone)} title={label}>
                              {code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleViewDiff(f.path)}
                              className="flex-1 min-w-0 text-left truncate hover:text-primary hover:underline cursor-pointer"
                              title="View diff"
                            >
                              {f.path}
                            </button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                              onClick={() => handleViewDiff(f.path)}
                              title="View diff"
                            >
                              <FileDiff className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1 text-[10px] cursor-pointer shrink-0"
                              onClick={() => handleUnstageFile(f.path)}
                              disabled={loadingStage}
                              title="Unstage file"
                            >
                              Unstage
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {workingFiles.length > 0 && (
                  <div>
                    <div className="text-muted-foreground text-xs mb-1 flex items-center gap-1">
                      <span>Unstaged / Untracked</span>
                      <span className="text-[10px] text-muted-foreground/80">
                        ({workingFiles.length})
                      </span>
                    </div>
                    <ul className="max-h-24 overflow-auto space-y-0.5 text-xs">
                      {workingFiles.slice(0, 20).map((f) => {
                        const { code, tone, label } = getFileDisplayStatus(f);
                        return (
                          <li key={`working-${f.path}`} className="flex items-center gap-1 group">
                            <span className={cn("w-4 text-center font-mono", tone)} title={label}>
                              {code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleViewDiff(f.path)}
                              className="flex-1 min-w-0 text-left truncate hover:text-primary hover:underline cursor-pointer"
                              title="View diff"
                            >
                              {f.path}
                            </button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                              onClick={() => handleViewDiff(f.path)}
                              title="View diff"
                            >
                              <FileDiff className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1 text-[10px] cursor-pointer shrink-0"
                              onClick={() => handleStageFile(f.path)}
                              disabled={loadingStage}
                              title="Stage file"
                            >
                              Stage
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer text-xs"
                onClick={handleAddAll}
                disabled={loadingStage || !status.files?.length}
              >
                {loadingStage ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Stage all
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer text-xs"
                onClick={handlePush}
                disabled={loadingPush}
              >
                {loadingPush ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}{" "}
                Push
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer text-xs"
                onClick={handlePull}
                disabled={loadingPull}
              >
                {loadingPull ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}{" "}
                Pull
              </Button>
              {remoteUrl && (remoteUrl.includes("github") || remoteUrl.includes("gitlab")) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="cursor-pointer text-xs"
                  onClick={openOnGitHub}
                >
                  <ExternalLink className="h-3 w-3" /> Open remote
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Commit message"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                size="sm"
                className="cursor-pointer text-xs shrink-0"
                onClick={handleCommit}
                disabled={loadingCommit || !commitMessage.trim()}
              >
                {loadingCommit ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Commit
              </Button>
            </div>
          </>
        )}
      </div>

      <Dialog open={!!diffFile} onOpenChange={(open) => !open && setDiffFile(null)}>
        <DialogContent
          className="max-w-4xl max-h-[85vh] flex flex-col gap-0"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="text-sm font-mono truncate pr-8">
              {diffFile ? `Diff: ${diffFile}` : "Diff"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-white/10 bg-black/40 mt-2">
            {diffLoading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading diff...
              </div>
            ) : diffContent ? (
              <div className="p-4 text-xs font-mono whitespace-pre-wrap wrap-break-word m-0 space-y-0.5">
                {diffContent.split("\n").map((line, i) => {
                  const isMetaHeader =
                    line.startsWith("diff ") ||
                    line.startsWith("index ") ||
                    line.startsWith("--- ") ||
                    line.startsWith("+++ ");
                  if (isMetaHeader) return null;
                  const isHunk = line.startsWith("@@ ");
                  const isAdd = line.startsWith("+") && !line.startsWith("+++");
                  const isDel = line.startsWith("-") && !line.startsWith("---");
                  return (
                    <div
                      key={i}
                      className={cn(
                        "px-2 -mx-2 rounded-sm border-l-2",
                        isHunk && "bg-slate-800/80 text-sky-300 border-sky-500/60",
                        isAdd && "bg-green-500/15 text-green-300 border-green-500/50",
                        isDel && "bg-red-500/15 text-red-300 border-red-500/50",
                        !isHunk && !isAdd && !isDel && "border-transparent"
                      )}
                    >
                      {line || " "}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <span>No diff found. File may be unchanged or binary.</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
