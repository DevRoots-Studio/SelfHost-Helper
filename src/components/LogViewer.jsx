import React, { useEffect, useRef, useState } from "react";
import { Terminal as TerminalIcon, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { WebLinksAddon } from "@xterm/addon-web-links";

export default function LogViewer({ logs, projectId, onSendInput }) {
  const [input, setInput] = useState("");
  const terminalContainerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const lastLogIndexRef = useRef(0);

  useEffect(() => {
    // Reset log index when switching projects
    lastLogIndexRef.current = 0;

    const term = new Terminal({
      fontFamily: "monospace",
      scrollOnUserInput: true,
      smoothScrollDuration: 1,
      fontSize: 16,
      convertEol: true,
      scrollback: 5000,
      theme: {
        background: "#000",
        foreground: "#e5e7eb",
        cursor: "#22c55e",
      },
    });

    const fitAddon = new FitAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(new ClipboardAddon());
    const webLinksAddon = new WebLinksAddon((event, uri) => {
      event.preventDefault();
      window.api.openExternal(uri);
    });

    term.loadAddon(webLinksAddon);

    term.open(terminalContainerRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
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
    if (!input.trim()) return;
    const dataToSend = input;
    setInput("");

    const res = await onSendInput(projectId, dataToSend);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="flex flex-col h-full bg-black/95 text-white font-mono text-sm rounded-lg overflow-hidden border border-border/20 shadow-inner">
      <div className="flex-1 relative p-3 bg-[#000]">
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
            className="w-full bg-transparent border-none text-white focus:ring-0 pl-6 h-10 font-mono text-sm placeholder:text-white/20 focus:outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type command..."
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 text-white/50 hover:text-white hover:bg-white/10"
          onClick={handleSend}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
