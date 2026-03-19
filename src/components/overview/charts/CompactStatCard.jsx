import React from "react";
import { cn } from "@/lib/utils";

export default function CompactStatCard({ label, value, subtitle, accent }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-white/5 bg-white/3 px-4 py-3 min-w-0">
      <div className="flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full shrink-0", accent)} />
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 font-semibold">
          {label}
        </span>
      </div>
      <div className="text-lg font-mono font-bold tracking-tight text-foreground truncate">{value}</div>
      {subtitle ? <div className="text-[11px] text-muted-foreground/50 truncate">{subtitle}</div> : null}
    </div>
  );
}

