import React, { useEffect, useRef } from "react";
import { Terminal as TerminalIcon } from "lucide-react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { cn } from "@/lib/utils";

export default function TunnelLogViewer({ logs = [] }) {
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
      fontSize: 14,
      convertEol: true,
      scrollback: 5000,
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
    term.loadAddon(
      new WebLinksAddon((event, uri) => {
        event.preventDefault();
        window.api.openExternal(uri);
      })
    );

    term.attachCustomKeyEventHandler((arg) => {
      if (arg.ctrlKey && (arg.code === "KeyC" || arg.code === "KeyV")) {
        return false;
      }
      return true;
    });

    term.open(terminalContainerRef.current);

    // Initial fit
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        console.warn("TunnelTerm fit error", e);
      }
    });

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const resizeObserver = new ResizeObserver(() => {
      if (terminalContainerRef.current && terminalContainerRef.current.clientWidth > 0) {
        try {
          fitAddon.fit();
        } catch (e) {
          console.warn("Tunnel resize fit error", e);
        }
      }
    });

    resizeObserver.observe(terminalContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
    };
  }, []);

  useEffect(() => {
    if (!xtermRef.current) return;

    const term = xtermRef.current;

    // If logs have shrunk (cleared), clear terminal and reset index
    if (lastLogIndexRef.current > logs.length) {
      term.clear();
      lastLogIndexRef.current = 0;
    }

    // ANSI escape codes for improved colors
    const colors = {
      info: "\x1b[96m", // Bright Cyan (for info)
      success: "\x1b[92m", // Bright Green
      warn: "\x1b[93m", // Bright Yellow
      error: "\x1b[91m", // Bright Red
      reset: "\x1b[0m",
    };

    for (let i = lastLogIndexRef.current; i < logs.length; i++) {
      const log = logs[i];
      const timestamp = new Date(log.timestamp).toLocaleTimeString("en-US", { hour12: false });
      const color = colors[log.type] || colors.info;

      term.write(`\x1b[90m[${timestamp}]\x1b[0m ${color}${log.message}${colors.reset}\n`);
    }

    lastLogIndexRef.current = logs.length;
  }, [logs]);

  return (
    <div className="flex-1 relative p-3 bg-[#0a0a0c] overflow-hidden">
      {logs.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-30 select-none pointer-events-none">
          <TerminalIcon className="h-10 w-10 mb-2" />
          <p>No tunnel output</p>
        </div>
      )}
      <div
        ref={terminalContainerRef}
        className={cn("h-full w-full", logs.length === 0 && "opacity-0")}
      />
    </div>
  );
}
