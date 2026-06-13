import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { Terminal as TerminalIcon, Send } from "lucide-react";
import { toast } from "react-toastify";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { WebLinksAddon } from "@xterm/addon-web-links";

import { Button } from "@/components/ui/button";
import { logsAtom } from "@/store/atoms";

const API = window.api;

export default function ConsoleMiniTile({ projectId, status, onSendInput }) {
  const allLogs = useAtomValue(logsAtom);
  const logs = useMemo(() => allLogs?.[projectId] || [], [allLogs, projectId]);

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
      disableStdin: true, // allow native selection/copy behavior
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

    // If logs have shrunk (cleared), clear terminal and reset index
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
        {!isMounted && <div className="h-full text-xs text-muted-foreground/50 flex items-center">Loading…</div>}
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
          <span className="absolute left-2 top-2 text-green-500 font-bold pointer-events-none select-none">$</span>
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

