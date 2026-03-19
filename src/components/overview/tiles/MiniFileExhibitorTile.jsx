import React, { useEffect, useState } from "react";

export default function MiniFileExhibitorTile({ fileTree, onOpenFile, isLoading }) {
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

