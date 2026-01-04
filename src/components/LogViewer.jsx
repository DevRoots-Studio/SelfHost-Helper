import React, { useEffect, useRef, useState } from "react";
import { Terminal as TerminalIcon, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { WebLinksAddon } from "@xterm/addon-web-links";

import { useAtomValue, useSetAtom } from "jotai";
import { logsAtom } from "@/store/atoms";

export default function LogViewer({ projectId, status, onSendInput }) {
  const allLogs = useAtomValue(logsAtom);
  const logs = allLogs[projectId] || [];
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalContainerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const lastLogIndexRef = useRef(0);

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
      if (
        terminalContainerRef.current &&
        terminalContainerRef.current.clientWidth > 0
      ) {
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

      const newIndex =
        historyIndex === -1
          ? history.length - 1
          : Math.max(0, historyIndex - 1);
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

  return (
    <div className="flex flex-col h-full bg-black/95 text-white font-mono text-sm rounded-lg overflow-hidden border border-border/20 shadow-inner">
      <div className="flex-1 relative p-3 bg-black">
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

      <div className="p-2 bg-muted/10 border-t border-white/10 flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2 top-2.5 text-green-500 font-bold pointer-events-none">
            $
          </span>
          <input
            className="w-full bg-transparent border-none text-white focus:ring-0 pl-6 h-10 font-mono text-sm placeholder:text-white/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              status === "running" ? "Type command..." : "Project is offline"
            }
            spellCheck={false}
            autoComplete="off"
            disabled={status !== "running"}
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30"
          onClick={handleSend}
          disabled={status !== "running"}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
