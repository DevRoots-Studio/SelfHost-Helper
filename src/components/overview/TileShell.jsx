import React from "react";

export default function TileShell({ title, right, children }) {
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

