import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Terminal as TerminalIcon,
  Send,
  BrushCleaning,
  Copy,
  Download,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { toast } from "react-toastify";

import { useAtomValue, useSetAtom } from "jotai";
import { logsAtom } from "@/store/atoms";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

export default function LogViewer(props) {
  const context = useOutletContext();
  const projectId = context?.project?.id;
  const status = context?.project?.status;
  const onSendInput = context?.handleSendInput;
  const allLogs = useAtomValue(logsAtom);
  const logs = useMemo(() => allLogs[projectId] || [], [allLogs, projectId]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalContainerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const lastLogIndexRef = useRef(0);
  const [isCopying, setIsCopying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    lastLogIndexRef.current = 0;

    const term = new Terminal({
      fontFamily: "monospace",
      scrollOnUserInput: true,
      smoothScrollDuration: 0,
      fontSize: 16,
      convertEol: true,
      scrollback: 5000,
      theme: {
        background: "#000",
        foreground: "#e5e7eb",
        cursor: "#22c55e",
      },
      disableStdin: true, // Allow native selection/copy behavior
    });

    const fitAddon = new FitAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(new ClipboardAddon());
    const webLinksAddon = new WebLinksAddon((event, uri) => {
      event.preventDefault();
      window.api.openExternal(uri);
    });

    term.loadAddon(webLinksAddon);

    term.attachCustomKeyEventHandler((arg) => {
      // Allow Ctrl+C and Ctrl+V to propagate for copy/paste
      if (arg.ctrlKey && (arg.code === "KeyC" || arg.code === "KeyV")) {
        return false;
      }
      return true;
    });

    term.open(terminalContainerRef.current);
    term.open(terminalContainerRef.current);
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        console.warn("Term fit error", e);
      }
    });

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    const resizeObserver = new ResizeObserver(() => {
      if (terminalContainerRef.current && terminalContainerRef.current.clientWidth > 0) {
        try {
          fitAddon.fit();
        } catch (e) {
          console.warn("Resize fit error", e);
        }
      }
    });

    resizeObserver.observe(terminalContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [projectId]);

  useEffect(() => {
    if (!xtermRef.current) return;

    const term = xtermRef.current;

    // If logs have shrunk or we switched projects, clear terminal and reset index
    if (lastLogIndexRef.current > logs.length) {
      term.clear();
      lastLogIndexRef.current = 0;
    }

    for (let i = lastLogIndexRef.current; i < logs.length; i++) {
      const log = logs[i];

      if (log.type === "stdin") {
        term.write(`\x1b[36m${log.data}\x1b[0m`);
      } else {
        term.write(log.data);
      }
    }

    lastLogIndexRef.current = logs.length;
  }, [logs]);

  const handleSend = async () => {
    if (!input.trim() || status !== "running") return;
    const dataToSend = input;

    setHistory((prev) => [...prev, dataToSend]);
    setHistoryIndex(-1);
    setInput("");

    const res = await onSendInput(projectId, dataToSend);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSend();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;

      const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInput(history[newIndex]);
    } else if (e.key === "ArrowDown") {
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
  const setAllLogs = useSetAtom(logsAtom);

  const copyTextToClipboard = async (text) => {
    await navigator.clipboard.writeText(text);
  };

  const handleCopyCurrentLogs = async () => {
    if (!logs || logs.length === 0) {
      toast.info("No console logs to copy");
      return;
    }
    setIsCopying(true);
    try {
      const text = logs.map((l) => l?.data ?? "").join("");
      await copyTextToClipboard(text);
      toast.success("Console logs copied");
    } catch (err) {
      console.error("Failed to copy console logs:", err);
      toast.error("Failed to copy console logs");
    } finally {
      setIsCopying(false);
    }
  };

  const handleExportCurrentLogs = async () => {
    setIsExporting(true);
    try {
      const res = await window.api.exportConsoleLogsProject(projectId);
      if (res?.canceled) {
        toast.info("Export canceled");
        return;
      }
      toast.success("Console logs exported");
    } catch (err) {
      console.error("Failed to export console logs:", err);
      toast.error("Failed to export console logs");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyAllLogs = async () => {
    setIsCopying(true);
    try {
      const [projects, allLogs] = await Promise.all([
        window.api.getProjects(),
        window.api.getAllLogs(),
      ]);
      const parts = projects.map((p) => {
        const id = p?.id;
        const key = String(id);
        const projectLogs = allLogs?.[key] || [];
        const projectName = p?.name || `Project ${id}`;
        const header = `===== Console Logs: ${projectName} (ID: ${id}) =====\n`;
        const body = Array.isArray(projectLogs)
          ? projectLogs.map((l) => l?.data ?? "").join("")
          : "";
        return `${header}${body}`;
      });
      const text = parts.join("\n");
      await copyTextToClipboard(text);
      toast.success("All console logs copied");
    } catch (err) {
      console.error("Failed to copy all console logs:", err);
      toast.error("Failed to copy all console logs");
    } finally {
      setIsCopying(false);
    }
  };

  const handleExportAllLogs = async () => {
    setIsExporting(true);
    try {
      const res = await window.api.exportConsoleLogsAll();
      if (res?.canceled) {
        toast.info("Export canceled");
        return;
      }
      toast.success("Console logs exported (.zip)");
    } catch (err) {
      console.error("Failed to export all console logs:", err);
      toast.error("Failed to export all console logs");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClear = () => {
    lastLogIndexRef.current = 0;
    xtermRef.current.clear();
    setAllLogs((prev) => ({
      ...prev,
      [projectId]: [],
    }));
    window.api.clearLogs(projectId);
    toast.success("Terminal cleared");
  };

  if (!context?.project) return null;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-white font-mono text-sm shadow-inner relative z-0">
      <div className="flex-1 relative p-3 bg-[#0a0a0c] overflow-hidden">
        {logs.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-30 select-none pointer-events-none">
            <TerminalIcon className="h-10 w-10 mb-2" />
            <p>No output to display</p>
          </div>
        )}
        <div
          ref={terminalContainerRef}
          className={cn("h-full w-full", logs.length === 0 && "opacity-0")}
        />
      </div>

      <div className="p-2 bg-white/5 border-t border-white/5 flex gap-2 backdrop-blur-md">
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-green-500 font-bold pointer-events-none select-none">
            $
          </span>
          <input
            className="w-full bg-black/40 border border-white/5 rounded-lg text-white focus:ring-1 focus:ring-primary pl-8 h-10 font-mono text-sm placeholder:text-white/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status === "running" ? "Type command..." : "Project is offline"}
            spellCheck={false}
            autoComplete="off"
            disabled={status !== "running"}
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 rounded-lg border border-transparent hover:border-white/10 transition-all"
          onClick={handleSend}
          disabled={status !== "running"}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            title="Logs actions"
            className="absolute top-4 right-4 cursor-pointer h-8 w-8"
            onClick={(e) => {
              // Radix ContextMenu opens on right-click; for left-click we synthesize a `contextmenu` event.
              e.preventDefault();
              e.stopPropagation();
              const ev = new MouseEvent("contextmenu", {
                bubbles: true,
                cancelable: true,
                clientX: e.clientX,
                clientY: e.clientY,
              });
              e.currentTarget.dispatchEvent(ev);
            }}
            onContextMenu={(e) => {
              e.stopPropagation();
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleCopyCurrentLogs} disabled={isCopying || isExporting}>
            <Copy className="w-4 h-4 mr-2" />
            Copy this project's console logs
          </ContextMenuItem>
          <ContextMenuItem onClick={handleExportCurrentLogs} disabled={isCopying || isExporting}>
            <Download className="w-4 h-4 mr-2" />
            Export this project's console logs (.log)
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleCopyAllLogs} disabled={isCopying || isExporting}>
            <Copy className="w-4 h-4 mr-2" />
            Copy all projects' console logs
          </ContextMenuItem>
          <ContextMenuItem onClick={handleExportAllLogs} disabled={isCopying || isExporting}>
            <Download className="w-4 h-4 mr-2" />
            Export all projects' console logs (.zip)
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={handleClear}
            disabled={isCopying || isExporting}
            className="text-destructive focus:text-destructive"
          >
            <BrushCleaning className="w-4 h-4 mr-2" />
            Clear this project's console logs
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
