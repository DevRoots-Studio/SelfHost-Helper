import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

export default function ProcessIdsTile({ stats }) {
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

  return (
    <div className="h-full overflow-hidden flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
        <div className="rounded-xl border border-white/5 bg-white/3 overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
                  PID
                </th>
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
                  Role
                </th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
                  Copy
                </th>
              </tr>
            </thead>
            <tbody>
              {pids.map((pid) => {
                const isMain = pid === mainPid;
                return (
                  <tr key={pid} className="border-b border-white/4 last:border-0 hover:bg-white/3 transition-colors">
                    <td className="px-3 py-2">
                      <span
                        className={`font-mono text-[12px] ${isMain ? "text-emerald-400 font-semibold" : "text-foreground/80"}`}
                      >
                        {pid}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {isMain ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
                          Main
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/50">Child</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs border border-white/10 hover:bg-white/5"
                        onClick={() => void copyPid(pid)}
                        disabled={isCopyingId === pid}
                      >
                        {isCopyingId === pid ? "Copy…" : "Copy"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

