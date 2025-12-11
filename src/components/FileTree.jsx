import React, { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

const FileTreeNode = ({ node, onSelect, selectedPath, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleSelect = (e) => {
    e.stopPropagation();
    onSelect(node);
    if (node.type === "directory") {
      setIsOpen(!isOpen);
    }
  };

  const isSelected = selectedPath === node.path;

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center py-1 px-2 hover:bg-accent/50 cursor-pointer transition-colors text-sm",
          isSelected
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleSelect}
      >
        <span
          className="mr-1 opacity-70"
          onClick={node.type === "directory" ? handleToggle : undefined}
        >
          {node.type === "directory" ? (
            isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="w-4 inline-block" />
          )}
        </span>
        {node.type === "directory" ? (
          <Folder
            className={cn("h-4 w-4 mr-2 text-blue-400 fill-blue-400/20")}
          />
        ) : (
          <File className="h-4 w-4 mr-2" />
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              onSelect={onSelect}
              selectedPath={selectedPath}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function FileTree({ files, onSelectFile, selectedPath }) {
  if (!files || files.length === 0) {
    return (
      <div className="p-4 text-xs text-muted-foreground italic">
        No files found or not loaded
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full pb-4">
      {files.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          onSelect={onSelectFile}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}
