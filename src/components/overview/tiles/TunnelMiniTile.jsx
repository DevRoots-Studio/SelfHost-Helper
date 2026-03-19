import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "react-toastify";

const API = window.api;

export default function TunnelMiniTile({ project, tunnelState }) {
  const projectId = project.id;
  const state =
    tunnelState?.[projectId] || { status: "stopped", url: null, logs: [], error: null };

  const status = state.status || "stopped";
  const url = state.url || null;
  const error = state.error || null;

  const [isProcessing, setIsProcessing] = useState(false);

  const portNum = useMemo(() => {
    if (project?.tunnelPort == null) return 3000;
    const parsed = parseInt(String(project.tunnelPort), 10);
    return Number.isFinite(parsed) ? parsed : 3000;
  }, [project?.tunnelPort]);

  const mode = project?.tunnelMode || "quick";
  const token = project?.encryptedTunnelToken || "";

  const config = useMemo(() => {
    const cfg = project?.tunnelConfig || {};
    return {
      protocol: cfg?.protocol || "http2",
      loglevel: cfg?.loglevel || "info",
      noTLSVerify: cfg?.noTLSVerify || false,
      connectTimeout: cfg?.connectTimeout || "30s",
      httpHostHeader: cfg?.httpHostHeader || "",
    };
  }, [project?.tunnelConfig]);

  const startTunnel = async () => {
    // Validation consistent with TunnelView logic.
    if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
      toast.error("Please enter a valid tunnel port number (1-65535)");
      return;
    }

    if (mode === "authenticated" && !token.trim()) {
      toast.error("Cloudflare Tunnel Token is required for authenticated mode");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await API.startTunnel(projectId, {
        mode,
        port: portNum,
        token,
        config,
      });
      if (!res?.success) toast.error(`Failed to start tunnel: ${res?.message || "Unknown error"}`);
    } catch {
      toast.error("Failed to start tunnel");
    } finally {
      setIsProcessing(false);
    }
  };

  const stopTunnel = async () => {
    setIsProcessing(true);
    try {
      const res = await API.stopTunnel(projectId);
      if (!res?.success) toast.error(`Failed to stop tunnel: ${res?.message || "Unknown error"}`);
    } catch {
      toast.error("Failed to stop tunnel");
    } finally {
      setIsProcessing(false);
    }
  };

  const openUrl = () => {
    if (!url) return;
    API.openExternal(url);
  };

  const copyUrl = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Tunnel URL copied");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const isRunning = status === "running";
  const isConnecting = status === "connecting";
  const isOffline = status === "stopped" || status === "error";

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 p-3 flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isRunning ? "bg-green-500" : isConnecting ? "bg-yellow-500" : "bg-destructive"
              }`}
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest truncate">
                {isRunning
                  ? "Running"
                  : isConnecting
                    ? "Connecting"
                    : status === "error"
                      ? "Error"
                      : "Offline"}
              </div>
              <div className="text-[11px] text-foreground/80 font-mono truncate">
                {isRunning && url
                  ? url
                  : error
                    ? String(error)
                    : `: localhost:${portNum}`}
              </div>
            </div>
          </div>
        </div>

        {isRunning && url ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs border border-white/10 hover:bg-white/5"
              onClick={openUrl}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-2" />
              Open
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs border border-white/10 hover:bg-white/5"
              onClick={() => void copyUrl()}
            >
              <Copy className="h-3.5 w-3.5 mr-2" />
              Copy
            </Button>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground/70">
            {mode === "authenticated" ? "Authenticated tunnel" : "Quick tunnel"} on :{portNum}
          </div>
        )}

        <div className="mt-auto pt-1">
          {isOffline ? (
            <Button
              className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all shadow-lg active:scale-95 gap-2"
              disabled={isProcessing}
              onClick={() => void startTunnel()}
            >
              Start Tunnel
            </Button>
          ) : (
            <Button
              className="w-full h-9 font-semibold rounded-xl transition-all shadow-lg active:scale-95 gap-2 cursor-pointer"
              variant="destructive"
              disabled={isProcessing}
              onClick={() => void stopTunnel()}
            >
              Stop Tunnel
            </Button>
          )}

          {mode === "authenticated" && isOffline && !token.trim() && (
            <div className="mt-2 text-[10px] text-destructive/80">Token missing (configure it in Tunnel tab).</div>
          )}
        </div>
      </div>
    </div>
  );
}

