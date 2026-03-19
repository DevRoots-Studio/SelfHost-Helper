import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import GridLayout, { WidthProvider } from "@eleung/react-grid-layout";
import "@eleung/react-grid-layout/css/styles.css";
import "@xterm/xterm/css/xterm.css";
import { Terminal as TerminalIcon, Send, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { statsAtom, resourceHistoryAtom, tunnelStateAtom, logsAtom } from "@/store/atoms";
import { formatMemory } from "@/lib/formatMemory";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { WebLinksAddon } from "@xterm/addon-web-links";
import TunnelLogViewer from "./TunnelLogViewer";
import OverviewGrid from "./overview/OverviewGrid";

const ReactGridLayout = WidthProvider(GridLayout);
const API = window.api;

function MiniSparkline({ samples, valueKey, maxValue, color }) {
  if (!samples || samples.length < 3) return null;
  const W = 72;
  const H = 20;
  const recent = samples.slice(-30);
  const effectiveMax =
    maxValue > 0 ? maxValue : Math.max(...recent.map((s) => s[valueKey] ?? 0), 1);
  const pts = recent
    .map((s, i) => {
      const x = (i / (recent.length - 1)) * W;
      const y = H - ((s[valueKey] ?? 0) / effectiveMax) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} className="opacity-50 shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TileShell({ title, right, children }) {
  return (
    <div className="h-full w-full rounded-xl border border-white/5 bg-[#0a0a0c] overflow-hidden flex flex-col">
      <div className="overview-tile-handle flex items-center justify-between px-3 py-2 border-b border-white/5 cursor-move select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold truncate">
            {title}
          </span>
        </div>
        {right}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function useProjectLayout({ projectId, defaultLayout }) {
  const [layout, setLayout] = useState(defaultLayout);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    if (projectId == null) return;
    const key = `selfhost-overview-grid:${projectId}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        setLayout(defaultLayout);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setLayout(parsed);
      } else {
        setLayout(defaultLayout);
      }
    } catch {
      setLayout(defaultLayout);
    }
  }, [projectId, defaultLayout]);

  const onLayoutChange = (nextLayout) => {
    setLayout(nextLayout);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (projectId == null) return;
      const key = `selfhost-overview-grid:${projectId}`;
      try {
        localStorage.setItem(key, JSON.stringify(nextLayout));
      } catch {
        // Ignore storage errors (private mode / quota).
      }
    }, 250);
  };

  return { layout, onLayoutChange };
}

function ConsoleMiniTile({ projectId, status, onSendInput }) {
  const allLogs = useAtomValue(logsAtom);
  const logs = allLogs?.[projectId] || [];

  const terminalContainerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const lastLogIndexRef = useRef(0);

  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    lastLogIndexRef.current = 0;

    const term = new Terminal({
      fontFamily: "monospace",
      scrollOnUserInput: true,
      smoothScrollDuration: 0,
      fontSize: 13,
      convertEol: true,
      scrollback: 2000,
      theme: {
        background: "#0a0a0c",
        foreground: "#e5e7eb",
        cursor: "#22c55e",
      },
      disableStdin: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new ClipboardAddon());

    const webLinksAddon = new WebLinksAddon((event, uri) => {
      event.preventDefault();
      API.openExternal(uri);
    });
    term.loadAddon(webLinksAddon);

    term.attachCustomKeyEventHandler((arg) => {
      if (arg.ctrlKey && (arg.code === "KeyC" || arg.code === "KeyV")) return false;
      return true;
    });

    term.open(terminalContainerRef.current);
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        console.warn("Overview ConsoleTerm fit error", e);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      if (terminalContainerRef.current && terminalContainerRef.current.clientWidth > 0) {
        try {
          fitAddon.fit();
        } catch (e) {
          console.warn("Overview ConsoleTerm resize fit error", e);
        }
      }
    });
    resizeObserver.observe(terminalContainerRef.current);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    setIsMounted(true);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [projectId]);

  useEffect(() => {
    if (!xtermRef.current) return;

    const term = xtermRef.current;
    if (lastLogIndexRef.current > logs.length) {
      term.clear();
      lastLogIndexRef.current = 0;
    }

    for (let i = lastLogIndexRef.current; i < logs.length; i++) {
      const log = logs[i];
      if (!log?.data) continue;

      if (log.type === "stdin") term.write(`\x1b[36m${log.data}\x1b[0m`);
      else term.write(log.data);
    }

    lastLogIndexRef.current = logs.length;
  }, [logs]);

  const handleSend = async () => {
    if (!input.trim() || status !== "running") return;
    const dataToSend = input;
    setHistory((prev) => [...prev, dataToSend]);
    setHistoryIndex(-1);
    setInput("");
    try {
      await onSendInput(projectId, dataToSend);
    } catch {
      toast.error("Failed to send command");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      void handleSend();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInput(history[newIndex]);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (history.length === 0 || historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= history.length) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0c]">
      <div className="flex-1 min-h-0 p-2 bg-[#0a0a0c] relative">
        {!isMounted && (
          <div className="h-full text-xs text-muted-foreground/50 flex items-center">Loading…</div>
        )}
        {logs.length === 0 && isMounted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-30 select-none pointer-events-none">
            <TerminalIcon className="h-8 w-8 mb-1" />
            <p>No output</p>
          </div>
        )}
        <div ref={terminalContainerRef} className="h-full w-full" />
      </div>

      <div className="shrink-0 p-2 bg-white/5 border-t border-white/5 flex gap-2 backdrop-blur-md">
        <div className="relative flex-1">
          <span className="absolute left-2 top-2 text-green-500 font-bold pointer-events-none select-none">
            $
          </span>
          <input
            className="w-full bg-black/40 border border-white/5 rounded-lg text-white focus:ring-1 focus:ring-primary pl-7 h-8 font-mono text-xs placeholder:text-white/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status === "running" ? "Type command…" : "Project is offline"}
            spellCheck={false}
            autoComplete="off"
            disabled={status !== "running"}
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 rounded-lg border border-transparent hover:border-white/10 transition-all"
          onClick={() => void handleSend()}
          disabled={status !== "running" || !input.trim()}
          title="Send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TunnelMiniTile({ project, tunnelState }) {
  const projectId = project.id;
  const state = tunnelState?.[projectId] || { status: "stopped", url: null, logs: [], error: null };
  const status = state.status || "stopped";
  const url = state.url || null;
  const error = state.error || null;

  const [isProcessing, setIsProcessing] = useState(false);

  const portNum = project?.tunnelPort != null ? parseInt(String(project.tunnelPort), 10) : 3000;
  const mode = project?.tunnelMode || "quick";
  const token = project?.encryptedTunnelToken || "";
  const cfg = project?.tunnelConfig || {};
  const config = {
    protocol: cfg?.protocol || "http2",
    loglevel: cfg?.loglevel || "info",
    noTLSVerify: cfg?.noTLSVerify || false,
    connectTimeout: cfg?.connectTimeout || "30s",
    httpHostHeader: cfg?.httpHostHeader || "",
  };

  const startTunnel = async () => {
    // Keep validation behavior consistent with TunnelView.
    const portToCheck = Number.isFinite(portNum) ? portNum : parseInt(String(portNum), 10);
    if (Number.isNaN(portToCheck) || portToCheck < 1 || portToCheck > 65535) {
      toast.error("Please enter a valid tunnel port number (1-65535)");
      return;
    }
    if (mode === "authenticated" && !token.trim()) {
      toast.error("Cloudflare Tunnel Token is required for authenticated mode");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await window.api.startTunnel(projectId, {
        mode,
        port: portToCheck,
        token,
        config,
      });
      if (!res?.success) toast.error(`Failed to start tunnel: ${res?.message || "Unknown error"}`);
    } catch (e) {
      toast.error(`Failed to start tunnel`);
    } finally {
      setIsProcessing(false);
    }
  };

  const stopTunnel = async () => {
    setIsProcessing(true);
    try {
      const res = await window.api.stopTunnel(projectId);
      if (!res?.success) toast.error(`Failed to stop tunnel: ${res?.message || "Unknown error"}`);
    } catch {
      toast.error("Failed to stop tunnel");
    } finally {
      setIsProcessing(false);
    }
  };

  const openUrl = () => {
    if (!url) return;
    window.api.openExternal(url);
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
                    : `: localhost:${Number.isFinite(portNum) ? portNum : 3000}`}
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
            {mode === "authenticated" ? "Authenticated tunnel" : "Quick tunnel"}{" "}
            {Number.isFinite(portNum) ? `on :${portNum}` : ""}
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
            <div className="mt-2 text-[10px] text-destructive/80">
              Token missing (configure it in the Tunnel tab).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TunnelLogsMiniTile({ logs }) {
  // Reuse the existing TunnelLogViewer for now to keep ANSI/color handling consistent.
  // The overview tile provides a tight container; TunnelLogViewer already manages FitAddon resize.
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <TunnelLogViewer logs={logs} />
    </div>
  );
}

function MiniFileExhibitorTile({ fileTree, onOpenFile, isLoading }) {
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    setExpanded({});
  }, [fileTree]);

  const maxDepth = 2;
  const maxShown = 60;
  let shownCount = 0;

  const renderNode = (node, level) => {
    if (shownCount >= maxShown) return null;
    shownCount += 1;

    const isDir = node.type === "directory";
    const path = node.path;
    const isOpen = expanded[path] || false;

    const indent = level * 10;
    if (isDir) {
      if (level >= maxDepth) return null;
      const children = Array.isArray(node.children) ? node.children : [];
      return (
        <div key={path} className="select-none">
          <div
            className="flex items-center gap-2 px-2 py-1 hover:bg-white/5 cursor-pointer rounded-md"
            style={{ paddingLeft: indent }}
            onClick={() => setExpanded((prev) => ({ ...prev, [path]: !prev[path] }))}
          >
            <span className="text-muted-foreground/70">{isOpen ? "▾" : "▸"}</span>
            <span className="text-xs text-foreground/85 truncate">{node.name}</span>
          </div>
          {isOpen && children.length > 0 && (
            <div className="pt-0.5">{children.map((child) => renderNode(child, level + 1))}</div>
          )}
        </div>
      );
    }

    // File
    if (level > maxDepth) return null;
    return (
      <div key={path} className="select-none">
        <div
          className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5 cursor-pointer"
          style={{ paddingLeft: indent }}
          onClick={() => onOpenFile(node.path)}
          title={node.path}
        >
          <span className="text-muted-foreground/60">•</span>
          <span className="text-xs text-foreground/85 truncate">{node.name}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {isLoading ? (
        <div className="flex-1 min-h-0 flex items-center justify-center text-muted-foreground/60 text-xs">
          Loading files…
        </div>
      ) : fileTree && fileTree.length > 0 ? (
        <div className="flex-1 min-h-0 overflow-auto p-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold px-1 pb-2">
            Files (preview)
          </div>
          <div className="space-y-1">{fileTree.map((n) => renderNode(n, 0))}</div>
          {shownCount >= maxShown && (
            <div className="text-[10px] text-muted-foreground/50 pt-2 px-1">… truncated</div>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex items-center justify-center text-muted-foreground/60 text-xs">
          No files found.
        </div>
      )}
    </div>
  );
}

function ProcessIdsTile({ stats }) {
  const [isCopyingId, setIsCopyingId] = useState(null);

  const mainPid = stats?.mainPid ?? null;
  const pids = Array.isArray(stats?.pids) ? stats.pids : [];
  const activeProcesses = stats?.activeProcesses ?? stats?.processCount ?? 0;

  const copyPid = async (pid) => {
    try {
      setIsCopyingId(pid);
      await navigator.clipboard.writeText(String(pid));
      toast.success(`Copied PID ${pid}`);
    } catch {
      toast.error(`Failed to copy PID ${pid}`);
    } finally {
      setIsCopyingId(null);
    }
  };

  if (pids.length === 0 && (stats?.activeProcesses ?? 0) > 0) {
    return (
      <div className="h-full p-4 overflow-auto">
        <div className="text-xs text-muted-foreground/60">
          PID enumeration not available for this project (recovered Job Object). Active processes:{" "}
          <span className="text-foreground font-mono">{activeProcesses}</span>
        </div>
      </div>
    );
  }

  if (pids.length === 0) {
    return (
      <div className="h-full p-4 overflow-auto">
        <div className="text-xs text-muted-foreground/40">No processes detected.</div>
      </div>
    );
  }

  const shown = pids.slice(0, 12);

  return (
    <div className="h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto p-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold px-1 pb-2">
          Process IDs
        </div>
        <div className="space-y-1">
          {shown.map((pid) => {
            const isMain = pid === mainPid;
            return (
              <div
                key={pid}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-white/5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-xs font-mono truncate ${isMain ? "text-emerald-400 font-semibold" : "text-foreground/80"}`}
                    >
                      {pid}
                    </span>
                    {isMain && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
                        Main
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs border border-white/10 hover:bg-white/5"
                  onClick={() => void copyPid(pid)}
                  disabled={isCopyingId === pid}
                >
                  {isCopyingId === pid ? "Copy…" : "Copy"}
                </Button>
              </div>
            );
          })}
          {pids.length > shown.length && (
            <div className="text-[10px] text-muted-foreground/50 pt-1 px-1">
              … showing first {shown.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CpuTile({ stats, historySamples }) {
  const cpu = stats?.cpu ?? 0;
  const samples = historySamples || [];
  return (
    <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
            CPU
          </div>
          <div className="text-lg font-mono font-bold">{Number(cpu).toFixed(0)}%</div>
        </div>
        <MiniSparkline
          samples={samples.map((s) => ({ cpu: s.cpu }))}
          valueKey="cpu"
          maxValue={100}
          color="#34d399"
        />
      </div>
      <div className="text-[10px] text-muted-foreground/60 whitespace-nowrap overflow-hidden text-ellipsis">
        {samples.length
          ? `Last: ${(samples[samples.length - 1]?.cpu ?? 0).toFixed(0)}%`
          : "Collecting…"}
      </div>
    </div>
  );
}

function RamTile({ stats, historySamples }) {
  const mem = stats?.memory ?? 0;
  const samples = historySamples || [];
  const samplesForSpark = samples.map((s) => ({ mem: s.memory }));
  return (
    <div className="h-full flex flex-col p-3 gap-2 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
            RAM
          </div>
          <div className="text-lg font-mono font-bold">{formatMemory(mem)}</div>
        </div>
        <MiniSparkline
          samples={samplesForSpark}
          valueKey="mem"
          maxValue={
            Math.max(...samplesForSpark.map((s) => (s.mem ?? 0) / (1024 * 1024)), 1) * 1024 * 1024
          }
          color="#38bdf8"
        />
      </div>
      <div className="text-[10px] text-muted-foreground/60 whitespace-nowrap overflow-hidden text-ellipsis">
        {samples.length
          ? `Last: ${formatMemory(samples[samples.length - 1]?.memory ?? 0)}`
          : "Collecting…"}
      </div>
    </div>
  );
}

export default function OverviewView() {
  const context = useOutletContext();
  const project = context?.project ?? null;
  const navigate = useNavigate();

  const fileTree = context?.fileTree ?? [];
  const isFileTreeLoading = context?.isFileTreeLoading ?? false;
  const handleSendInput = context?.handleSendInput;
  const handleEditorFileChange = context?.handleEditorFileChange;

  const stats = useAtomValue(statsAtom);
  const resourceHistory = useAtomValue(resourceHistoryAtom);
  const tunnelState = useAtomValue(tunnelStateAtom);

  const historySamples = useMemo(() => {
    if (!project) return [];
    const bucket = resourceHistory?.[project.id];
    return bucket?.samples ?? [];
  }, [resourceHistory, project]);

  const onOpenFile = (path) => {
    handleEditorFileChange?.(project.id, path);
    navigate(`/project/${project.id}/editor`);
  };

  if (!project) return null;

  return (
    <OverviewGrid
      project={project}
      fileTree={fileTree}
      isFileTreeLoading={isFileTreeLoading}
      stats={stats}
      historySamples={historySamples}
      tunnelState={tunnelState}
      onSendInput={handleSendInput}
      onOpenFile={onOpenFile}
    />
  );
}
