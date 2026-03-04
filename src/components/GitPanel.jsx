import React, { useState, useEffect } from "react";
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
  const [githubTokenKnown, setGithubTokenKnown] = useState(false);
  const [hasGithubToken, setHasGithubToken] = useState(false);
  const [githubTokenInput, setGithubTokenInput] = useState("");
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [isCreatingGithubRepo, setIsCreatingGithubRepo] = useState(false);
  const [githubRepoName, setGithubRepoName] = useState("");
  const [githubRepoPrivate, setGithubRepoPrivate] = useState(true);
  const [githubInitLocal, setGithubInitLocal] = useState(true);
  const githubTokenRef = React.useRef(null);

  const stagedFiles = status?.files?.filter((f) => f.index && f.index !== " ") || [];
  const workingFiles =
    status?.files?.filter((f) => !f.index || f.index === " " || f.workingDir === "U") || [];

  const loadGitStatus = async () => {
    if (!projectPath) return;
    setError(null);
    setIsRefreshing(true);
    try {
      const [s, b, url] = await Promise.all([
        API.gitStatus(projectPath),
        API.gitBranches(projectPath),
        API.gitRemoteUrl(projectPath),
      ]);
      setStatus(s);
      setBranches(b);
      setRemoteUrl(url);
      if (!s?.isRepo) {
        setError("Git is not initialized for this project. Initialize a repository to use Git features.");
      }
      onStatusChange?.(s);
    } catch (err) {
      setStatus(null);
      setBranches({ current: null, all: [] });
      setError(err?.message ?? "Git status unavailable");
      onStatusChange?.(null);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectPath) {
      loadGitStatus();
    }
  }, [isOpen, projectPath]);

  // Load GitHub token info once when panel opens
  useEffect(() => {
    if (!isOpen || githubTokenKnown) return;
    const loadToken = async () => {
      try {
        const settings = await API.getSettings?.();
        const token = settings?.githubToken;
        githubTokenRef.current = token || null;
        setHasGithubToken(!!token);
      } catch {
        githubTokenRef.current = null;
        setHasGithubToken(false);
      } finally {
        setGithubTokenKnown(true);
      }
    };
    loadToken();
  }, [isOpen, githubTokenKnown]);

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
        loadGitStatus();
      }, 400);
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                Set up Git for this project folder so you can track changes, commit, and sync with remotes.
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

            <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex flex-col gap-3">
              <div className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                Create GitHub repository and link
              </div>
              {!hasGithubToken && (
                <div className="space-y-2 rounded-md border border-amber-400/40 bg-amber-500/10 p-2">
                  <p className="text-[11px] text-amber-100">
                    To create repositories on GitHub from here, add a{" "}
                    <span className="font-semibold">personal access token</span> with{" "}
                    <code className="px-1 py-0.5 rounded bg-black/40 border border-white/10 text-[10px]">
                      repo
                    </code>{" "}
                    permissions.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={githubTokenInput}
                      onChange={(e) => setGithubTokenInput(e.target.value)}
                      placeholder="GitHub personal access token..."
                      className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-black/40 border border-white/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="cursor-pointer text-[11px] shrink-0"
                      type="button"
                      onClick={() =>
                        API.openExternal(
                          "https://github.com/settings/tokens/new?scopes=repo&description=SelfHost%20Helper"
                        )
                      }
                    >
                      Get token
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    className="cursor-pointer text-[11px] mt-1"
                    disabled={isSavingToken || !githubTokenInput.trim()}
                    onClick={async () => {
                      if (!githubTokenInput.trim()) return;
                      setIsSavingToken(true);
                      try {
                        await API.updateSettings?.({ githubToken: githubTokenInput.trim() });
                        githubTokenRef.current = githubTokenInput.trim();
                        setHasGithubToken(true);
                        setGithubTokenInput("");
                        toast.success("Saved GitHub token securely in app settings.");
                      } catch (err) {
                        toast.error(err?.message ?? "Failed to save GitHub token");
                      } finally {
                        setIsSavingToken(false);
                      }
                    }}
                  >
                    {isSavingToken ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" /> Saving...
                      </>
                    ) : (
                      "Save token"
                    )}
                  </Button>
                </div>
              )}

              {hasGithubToken && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Create a repository under your GitHub account and optionally initialize and connect this
                    folder as its local clone.
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={githubRepoName}
                        onChange={(e) => setGithubRepoName(e.target.value)}
                        placeholder="Repository name (e.g. my-selfhost-project)"
                        className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-black/30 border border-white/10 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <select
                        value={githubRepoPrivate ? "private" : "public"}
                        onChange={(e) => setGithubRepoPrivate(e.target.value === "private")}
                        className="px-2 py-1.5 text-[11px] bg-black/40 border border-white/10 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="private">Private</option>
                        <option value="public">Public</option>
                      </select>
                    </div>
                    <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="h-3 w-3 rounded border-white/30 bg-transparent"
                        checked={githubInitLocal}
                        onChange={(e) => setGithubInitLocal(e.target.checked)}
                      />
                      <span>Initialize local Git repo here and connect as origin</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="cursor-pointer text-xs"
                      disabled={isCreatingGithubRepo || !githubRepoName.trim()}
                      onClick={async () => {
                        if (!projectPath || !githubRepoName.trim()) return;
                        const token = githubTokenRef.current;
                        if (!token) {
                          toast.error("GitHub token missing. Please add it above.");
                          setHasGithubToken(false);
                          return;
                        }
                        setIsCreatingGithubRepo(true);
                        try {
                          const response = await fetch("https://api.github.com/user/repos", {
                            method: "POST",
                            headers: {
                              Accept: "application/vnd.github+json",
                              Authorization: `Bearer ${token}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              name: githubRepoName.trim(),
                              private: githubRepoPrivate,
                            }),
                          });
                          if (!response.ok) {
                            const text = await response.text();
                            throw new Error(
                              `GitHub API error (${response.status}): ${text || response.statusText}`
                            );
                          }
                          const data = await response.json();
                          const remote = data.clone_url || data.ssh_url;

                          if (githubInitLocal) {
                            const initRes = await API.gitInit(projectPath);
                            if (!initRes?.alreadyRepo) {
                              toast.success("Initialized local Git repository.");
                            }
                            await API.gitAddRemote(projectPath, "origin", remote);
                          }

                          toast.success("GitHub repository created and linked.");
                          // Prefer the HTML URL to open in browser
                          if (data.html_url) {
                            setRemoteUrl(data.html_url);
                          }
                          await loadGitStatus();
                        } catch (err) {
                          toast.error(err?.message ?? "Failed to create GitHub repository");
                        } finally {
                          setIsCreatingGithubRepo(false);
                        }
                      }}
                    >
                      {isCreatingGithubRepo ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" /> Creating on GitHub...
                        </>
                      ) : (
                        "Create on GitHub and link"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="cursor-pointer text-[11px]"
                      type="button"
                      onClick={() =>
                        API.openExternal("https://github.com/new?source=SelfHost%20Helper")
                      }
                    >
                      Open GitHub new repo page
                    </Button>
                  </div>
                </div>
              )}
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
                            <span
                              className={cn("w-4 text-center font-mono", tone)}
                              title={label}
                            >
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
                            <span
                              className={cn("w-4 text-center font-mono", tone)}
                              title={label}
                            >
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
                {loadingCommit ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                Commit
              </Button>
            </div>
          </>
        )}
      </div>

      <Dialog open={!!diffFile} onOpenChange={(open) => !open && setDiffFile(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-0">
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
