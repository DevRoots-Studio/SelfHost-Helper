import React from "react";
import { useOutletContext } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS = {
  IDLE:        "idle",
  CHECKING:    "checking",
  AVAILABLE:   "available",
  DOWNLOADING: "downloading",
  DOWNLOADED:  "downloaded",
  ERROR:       "error",
};

function ReleaseNotes({ notes }) {
  if (!notes?.trim()) return null;
  return (
      <div className="relative mt-4 rounded-xl border border-white/[0.07] bg-black/20 overflow-hidden [&_*]:[mask-image:none]">
      <div className="max-h-52 overflow-y-auto custom-scrollbar p-4 text-sm text-muted-foreground prose prose-invert prose-sm max-w-none">
        <ReactMarkdown
          components={{
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {children}
              </a>
            ),
          }}
        >
          {notes}
        </ReactMarkdown>
      </div>
      {/* Fade at bottom */}
      <div className="absolute bottom-0 inset-x-0 h-10 bg-linear-to-t from-black/60 to-transparent pointer-events-none" />
    </div>
  );
}

export default function UpdatesSection() {
  const {
    appVersion,
    updateStatus, updateVersion, updateError, releaseNotes,
    handleCheckForUpdates, handleStartInstall, handleRestartToApply,
  } = useOutletContext();

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Updates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Keep SelfHost Helper up to date.
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/2.5 shadow-[0_1px_4px_rgba(0,0,0,0.4)] overflow-hidden">
        {/* Version row */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/6">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1">
              Current version
            </p>
            <span className="inline-flex items-center font-mono text-sm font-semibold bg-primary/10 text-primary rounded-full px-3 py-1 border border-primary/20">
              v{appVersion || "—"}
            </span>
          </div>
          {updateStatus === STATUS.IDLE && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCheckForUpdates}
              className="gap-2 border-white/10 hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Check for updates
            </Button>
          )}
        </div>

        {/* Status area */}
        <div className="px-6 py-5">
          {updateStatus === STATUS.IDLE && (
            <p className="text-sm text-muted-foreground/50">
              You are running the latest version.
            </p>
          )}

          {updateStatus === STATUS.CHECKING && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Checking for updates…
            </div>
          )}

          {updateStatus === STATUS.AVAILABLE && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">
                    Version <span className="text-primary">v{updateVersion}</span> is available
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    Download and install the latest release.
                  </p>
                </div>
              </div>
              <ReleaseNotes notes={releaseNotes} />
              <Button type="button" size="sm" onClick={handleStartInstall} className="gap-2 mt-2">
                <Download className="h-4 w-4" />
                Download update
              </Button>
            </div>
          )}

          {(updateStatus === STATUS.DOWNLOADING || updateStatus === "downloading") && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Downloading update… Please wait.
            </div>
          )}

          {updateStatus === STATUS.DOWNLOADED && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-emerald-400">
                    Ready to install
                  </p>
                  {updateVersion && (
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      v{updateVersion} has been downloaded. Restart to apply.
                    </p>
                  )}
                </div>
              </div>
              <ReleaseNotes notes={releaseNotes} />
              <Button
                type="button"
                size="sm"
                onClick={handleRestartToApply}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white mt-2"
              >
                <RefreshCw className="h-4 w-4" />
                Restart and install
              </Button>
            </div>
          )}

          {updateStatus === STATUS.ERROR && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive leading-snug">
                  {updateError || "An error occurred while checking for updates."}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCheckForUpdates}
                className="gap-2 border-white/10 hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
