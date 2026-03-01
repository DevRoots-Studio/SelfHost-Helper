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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const API = window.api;

export default function GitPanel({ projectPath, isOpen, onClose, onRefreshFileTree }) {
  const [status, setStatus] = useState(null);
  const [branches, setBranches] = useState({ current: null, all: [] });
  const [commitMessage, setCommitMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [remoteUrl, setRemoteUrl] = useState(null);
  const [diffFile, setDiffFile] = useState(null);
  const [diffContent, setDiffContent] = useState("");
  const [diffLoading, setDiffLoading] = useState(false);

  const loadGitStatus = async () => {
    if (!projectPath) return;
    setError(null);
    try {
      const [s, b, url] = await Promise.all([
        API.gitStatus(projectPath),
        API.gitBranches(projectPath),
        API.gitRemoteUrl(projectPath),
      ]);
      setStatus(s);
      setBranches(b);
      setRemoteUrl(url);
    } catch (err) {
      setStatus(null);
      setBranches({ current: null, all: [] });
      setError(err?.message ?? "Not a git repository");
    }
  };

  useEffect(() => {
    if (isOpen && projectPath) loadGitStatus();
  }, [isOpen, projectPath]);

  const handleAddAll = async () => {
    if (!projectPath) return;
    setLoading(true);
    try {
      await API.gitAdd(projectPath, []);
      toast.success("Staged all changes");
      loadGitStatus();
    } catch (err) {
      toast.error(err?.message ?? "Failed to stage");
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!projectPath || !commitMessage.trim()) return;
    setLoading(true);
    try {
      await API.gitCommit(projectPath, commitMessage.trim());
      toast.success("Committed");
      setCommitMessage("");
      loadGitStatus();
      onRefreshFileTree?.();
    } catch (err) {
      toast.error(err?.message ?? "Failed to commit");
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    if (!projectPath) return;
    setLoading(true);
    try {
      await API.gitPush(projectPath);
      toast.success("Pushed");
      loadGitStatus();
    } catch (err) {
      toast.error(err?.message ?? "Failed to push");
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    if (!projectPath) return;
    setLoading(true);
    try {
      await API.gitPull(projectPath);
      toast.success("Pulled");
      loadGitStatus();
      onRefreshFileTree?.();
    } catch (err) {
      toast.error(err?.message ?? "Failed to pull");
    } finally {
      setLoading(false);
    }
  };

  const openOnGitHub = () => {
    if (!remoteUrl) return;
    let url = remoteUrl.replace(/^git@github\.com:/, "https://github.com/").replace(/\.git$/, "");
    if (status?.current) url += `/tree/${status.current}`;
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

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full border-t border-white/5 bg-background/80 text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
        <span className="font-medium flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" /> Git
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 cursor-pointer"
          onClick={loadGitStatus}
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {error && <p className="text-muted-foreground text-xs">{error}</p>}
        {status?.isRepo && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground text-xs">Branch:</span>
              <span className="font-mono text-primary">{status.currentBranch}</span>
              {(status.ahead > 0 || status.behind > 0) && (
                <span className="text-xs text-muted-foreground">
                  {status.ahead > 0 && `↑${status.ahead}`}
                  {status.behind > 0 && ` ↓${status.behind}`}
                </span>
              )}
            </div>
            {status.files?.length > 0 && (
              <div>
                <div className="text-muted-foreground text-xs mb-1">
                  Changed ({status.files.length})
                </div>
                <ul className="max-h-24 overflow-auto space-y-0.5 text-xs">
                  {status.files.slice(0, 20).map((f) => (
                    <li key={f.path} className="flex items-center gap-1 group">
                      <span
                        className={cn(
                          (f.workingDir || f.working_dir) === "M" ||
                            (f.workingDir || f.working_dir) === "A" ||
                            (f.workingDir || f.working_dir) === "D"
                            ? "text-amber-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {f.workingDir ?? f.working_dir ?? "?"}
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
                    </li>
                  ))}
                  {status.files.length > 20 && (
                    <li className="text-muted-foreground">+{status.files.length - 20} more</li>
                  )}
                </ul>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer text-xs"
                onClick={handleAddAll}
                disabled={loading || !status.files?.length}
              >
                {loading ? (
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
                disabled={loading}
              >
                <Upload className="h-3 w-3" /> Push
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer text-xs"
                onClick={handlePull}
                disabled={loading}
              >
                <Download className="h-3 w-3" /> Pull
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
                disabled={loading || !commitMessage.trim()}
              >
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
            ) : (
              <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words m-0">
                {diffContent.split("\n").map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "px-1 -mx-1",
                      line.startsWith("+") &&
                        !line.startsWith("+++") &&
                        "bg-green-500/15 text-green-300",
                      line.startsWith("-") &&
                        !line.startsWith("---") &&
                        "bg-red-500/15 text-red-300"
                    )}
                  >
                    {line || " "}
                  </div>
                ))}
                {!diffContent && !diffLoading && (
                  <span className="text-muted-foreground">
                    No diff or file is binary / unchanged.
                  </span>
                )}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
