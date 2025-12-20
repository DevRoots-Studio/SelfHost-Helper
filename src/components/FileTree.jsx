import { useState, useMemo } from "react";
import { ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getFileIcon, getFolderIcon } from "@/lib/materialIcons";

// Sort function: folders first, then files (alphabetically)
const sortTree = (nodes) => {
  if (!nodes || !Array.isArray(nodes)) return [];

  return [...nodes]
    .sort((a, b) => {
      // Folders first
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    })
    .map((node) => {
      if (node.children && Array.isArray(node.children)) {
        return {
          ...node,
          children: sortTree(node.children),
        };
      }
      return node;
    });
};

const FileTreeNode = ({
  node,
  onSelect,
  selectedPath,
  level = 0,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen); // All folders closed by default
  const [iconError, setIconError] = useState(false);
  const isDirectory = node.type === "directory";
  const isSelected = selectedPath === node.path;
  const hasChildren = isDirectory && node.children && node.children.length > 0;

  const handleToggle = (e) => {
    e.stopPropagation();
    if (isDirectory) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (e) => {
    e.stopPropagation();
    if (isDirectory) {
      if (hasChildren) {
        setIsOpen(!isOpen);
      }
      // Don't call onSelect for directories
      return;
    }
    // Only call onSelect for files
    onSelect(node);
  };

  const iconName = isDirectory
    ? getFolderIcon(node.name, isOpen)
    : getFileIcon(node.name);

  // If the iconName is just "file" or "folder", we use Lucide by default
  // to avoid trying to load non-existent generic icons.
  const useLucide =
    iconError ||
    iconName === "file" ||
    iconName === "folder" ||
    iconName === "folder-open";

  const iconUrl = `media://app/src/assets/file-icons/${iconName}.svg`;

  return (
    <div className="select-none">
      <motion.div
        className={cn(
          "flex items-center py-1.5 px-2 hover:bg-accent/50 cursor-pointer transition-colors text-sm group",
          isSelected
            ? "bg-accent text-accent-foreground font-medium"
            : "text-foreground/80"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
        whileHover={{ x: 2 }}
        transition={{ duration: 0.15 }}
      >
        <span
          className="mr-1.5 flex items-center justify-center w-4 h-4"
          onClick={isDirectory ? handleToggle : undefined}
        >
          {isDirectory ? (
            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </motion.div>
          ) : (
            <span className="w-4" />
          )}
        </span>
        <div className="flex items-center flex-1 min-w-0">
          {useLucide ? (
            isDirectory ? (
              isOpen ? (
                <FolderOpen className="h-4 w-4 mr-2 text-blue-400 shrink-0" />
              ) : (
                <Folder className="h-4 w-4 mr-2 text-blue-400 shrink-0" />
              )
            ) : (
              <File className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
            )
          ) : (
            <img
              src={iconUrl}
              className="h-4 w-4 mr-2 shrink-0 object-contain"
              alt=""
              onError={() => setIconError(true)}
            />
          )}
          <span className="truncate">{node.name}</span>
        </div>
      </motion.div>
      <AnimatePresence>
        {isOpen && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                onSelect={onSelect}
                selectedPath={selectedPath}
                level={level + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function FileTree({ files, onSelectFile, selectedPath }) {
  // Sort files: folders first, then files
  const sortedFiles = useMemo(() => {
    return sortTree(files);
  }, [files]);

  if (!files || files.length === 0) {
    return (
      <div className="p-4 text-xs text-muted-foreground italic text-center">
        No files found
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full pb-4">
      {sortedFiles.map((node) => (
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
