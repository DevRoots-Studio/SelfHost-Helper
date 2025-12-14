import React, { useEffect, useRef, useState } from "react";
import Ansi from "ansi-to-react";
import { Terminal as TerminalIcon, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function LogViewer({ logs, projectId, onSendInput }) {
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendInput(projectId, input);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="flex flex-col h-full bg-black/95 text-white font-mono text-sm rounded-lg overflow-hidden border border-border/20 shadow-inner">
      <div
        className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-0.5"
        ref={containerRef}
      >
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 select-none">
            <TerminalIcon className="h-10 w-10 mb-2" />
            <p>No output to display</p>
          </div>
        )}
        {logs.map((log, i) => (
          <div
            key={i}
            className={cn(
              "wrap-break-word leading-tight",
              log.type === "stderr" ? "opacity-90" : ""
            )}
          >
            {/* <span className="opacity-30 text-[10px] mr-2 select-none inline-block w-14 text-right">
              {new Date(log.timestamp).toLocaleTimeString([], {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span> */}
            {log.type === "stdin" ? (
              <span className="text-cyan-400 font-bold opacity-80">
                {log.data}
              </span>
            ) : (
              <span
                className={cn(
                  "leading-tight",
                  log.type === "stderr" ? "text-red-400" : "text-gray-100",
                  "whitespace-pre-wrap"
                )}
              >
                <Ansi useClasses={false}>{log.data}</Ansi>
              </span>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
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
