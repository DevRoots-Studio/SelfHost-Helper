import { useState, useMemo } from "react";
import {
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
  Plus,
  CircleDot,
  Minus,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { getFileIcon, getFolderIcon } from "@/lib/materialIcons";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FILE_TAG_MODE } from "@/config/fileTagConfig";

const API = window.api;
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

const dirname = (p) => p.replace(/[/\\][^/\\]+$/, "") || p;
// Normalize to forward slashes so paths are never mixed (backend accepts both)
const joinPath = (parent, name) => {
  const p = (parent || "").replace(/\\/g, "/");
  return p.endsWith("/") ? p + name : p + "/" + name;
};
const normalizePath = (p) => (p || "").replace(/\\/g, "/");

// Build a map of directories that contain any changed files (directly or nested)
const buildFolderChangeMap = (nodes, gitStatusByPath) => {
  const result = {};
  if (!nodes || !Array.isArray(nodes) || !gitStatusByPath) return result;

  const walk = (node) => {
    const nodePathNorm = normalizePath(node.path);
    if (node.type === "file") {
      const code = gitStatusByPath[nodePathNorm];
      return !!code && code !== " ";
    }
    if (!node.children || !Array.isArray(node.children)) return false;
    let hasChangedDescendant = false;
    for (const child of node.children) {
      if (walk(child)) {
        hasChangedDescendant = true;
      }
    }
    if (hasChangedDescendant) {
      result[nodePathNorm] = true;
    }
    return hasChangedDescendant;
  };

  nodes.forEach(walk);
  return result;
};

const FileTreeNode = ({
  node,
  onSelect,
  selectedPath,
  level = 0,
  defaultOpen = false,
  projectRoot,
  onRefresh,
  gitStatusByPath,
  folderChangesByPath,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen); // All folders closed by default
  const [iconError, setIconError] = useState(false);
  const isDirectory = node.type === "directory";
  const isSelected = selectedPath === node.path;
  const hasChildren = isDirectory && node.children && node.children.length > 0;
  const parentPath = isDirectory ? node.path : dirname(node.path);
  const gitStatus =
    !isDirectory && gitStatusByPath ? gitStatusByPath[normalizePath(node.path)] || null : null;
  const hasNestedChanges =
    isDirectory && folderChangesByPath ? !!folderChangesByPath[normalizePath(node.path)] : false;

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

  const handleNewFile = async () => {
    const name = prompt("File name:");
    if (!name?.trim()) return;
    const trimmed = name.trim();
    const projectNorm = normalizePath(projectRoot);
    const parentNorm = normalizePath(parentPath);
    const relParent = parentNorm.startsWith(projectNorm)
      ? parentNorm.slice(projectNorm.length).replace(/^[/\\]/, "")
      : "";
    const relativeTarget = relParent ? joinPath(relParent, trimmed) : trimmed;
    const fullPath = joinPath(parentPath, trimmed);
    try {
      await API.createFile(projectRoot, relativeTarget, "file", "");
      toast.success("File created");
      onRefresh?.();
      onSelect?.({
        type: "file",
        path: fullPath,
        name: trimmed,
      });
    } catch (err) {
      toast.error(err?.message || "Failed to create file");
    }
  };

  const handleNewFolder = async () => {
    const name = prompt("Folder name:");
    if (!name?.trim()) return;
    const trimmed = name.trim();
    const projectNorm = normalizePath(projectRoot);
    const parentNorm = normalizePath(parentPath);
    const relParent = parentNorm.startsWith(projectNorm)
      ? parentNorm.slice(projectNorm.length).replace(/^[/\\]/, "")
      : "";
    const relativeTarget = relParent ? joinPath(relParent, trimmed) : trimmed;
    try {
      await API.createFile(projectRoot, relativeTarget, "directory");
      toast.success("Folder created");
      onRefresh?.();
    } catch (err) {
      toast.error(err?.message || "Failed to create folder");
    }
  };

  const handleRename = async () => {
    const newName = prompt("New name:", node.name);
    if (newName == null || newName.trim() === "" || newName.trim() === node.name) return;
    const trimmed = newName.trim();
    const newPath = joinPath(dirname(node.path), trimmed);
    const projectNorm = normalizePath(projectRoot);
    const oldNorm = normalizePath(node.path);
    const relOld = oldNorm.startsWith(projectNorm)
      ? oldNorm.slice(projectNorm.length).replace(/^[/\\]/, "")
      : oldNorm;
    const relNew = normalizePath(newPath).startsWith(projectNorm)
      ? normalizePath(newPath)
          .slice(projectNorm.length)
          .replace(/^[/\\]/, "")
      : newPath;
    try {
      await API.renamePath(projectRoot, relOld, relNew);
      toast.success("Renamed");
      onRefresh?.();
    } catch (err) {
      toast.error(err?.message || "Failed to rename");
    }
  };

  const handleDelete = async () => {
    const msg = isDirectory
      ? `Delete folder "${node.name}" and its contents?`
      : `Delete file "${node.name}"?`;
    if (!confirm(msg)) return;
    const projectNorm = normalizePath(projectRoot);
    const nodeNorm = normalizePath(node.path);
    const relPath = nodeNorm.startsWith(projectNorm)
      ? nodeNorm.slice(projectNorm.length).replace(/^[/\\]/, "")
      : nodeNorm;
    try {
      await API.deletePath(projectRoot, relPath);
      toast.success("Deleted");
      onRefresh?.();
    } catch (err) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  const iconName = isDirectory ? getFolderIcon(node.name, isOpen) : getFileIcon(node.name);

  // If the iconName is just "file" or "folder", we use Lucide by default
  // to avoid trying to load non-existent generic icons.
  const getIconUrl = (iconName) => {
    return import.meta.env.DEV
      ? `/file-icons/${iconName}.svg`
      : `media://app/dist/file-icons/${iconName}.svg`;
  };

  const useLucide =
    iconError || iconName === "file" || iconName === "folder" || iconName === "folder-open";

  const iconUrl = getIconUrl(iconName);

  return (
    <div className="select-none">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            className={cn(
              "flex items-center py-1.5 px-2 hover:bg-white/5 cursor-pointer transition-colors text-sm group rounded-lg mx-1",
              isSelected
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground/70 hover:text-foreground"
            )}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={handleSelect}
            whileHover={{ x: 2 }}
            transition={{ duration: 0.15 }}
          >
            <span
              className="mr-1.5 flex items-center justify-center w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity"
              onClick={isDirectory ? handleToggle : undefined}
            >
              {isDirectory ? (
                <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </motion.div>
              ) : (
                <span className="w-4" />
              )}
            </span>
            <div className="flex items-center flex-1 min-w-0">
              {useLucide ? (
                isDirectory ? (
                  isOpen ? (
                    <FolderOpen className="h-4 w-4 mr-2 text-primary shrink-0" />
                  ) : (
                    <Folder className="h-4 w-4 mr-2 text-primary/80 shrink-0" />
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
              <span className="truncate flex-1">{node.name}</span>
              {gitStatus && gitStatus !== " " && FILE_TAG_MODE === "letters" && (
                <span
                  className={cn(
                    "ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold uppercase tracking-tight border bg-white/5 shadow-sm/40 border-white/15",
                    gitStatus === "U" && "border-emerald-400 text-emerald-300",
                    gitStatus === "M" && "border-amber-400 text-amber-300",
                    gitStatus === "A" && "border-sky-400 text-sky-300",
                    gitStatus === "D" && "border-rose-400 text-rose-300",
                    gitStatus === "S" && "border-indigo-400 text-indigo-300"
                  )}
                  title={
                    gitStatus === "U"
                      ? "Untracked"
                      : gitStatus === "M"
                        ? "Modified"
                        : gitStatus === "A"
                          ? "Added"
                          : gitStatus === "D"
                            ? "Deleted"
                            : gitStatus === "S"
                              ? "Staged"
                              : "Changed"
                  }
                >
                  {gitStatus}
                </span>
              )}
              {gitStatus && gitStatus !== " " && FILE_TAG_MODE === "icons" && (
                <span
                  className="ml-2 flex items-center justify-center"
                  title={
                    gitStatus === "U"
                      ? "Untracked"
                      : gitStatus === "M"
                        ? "Modified"
                        : gitStatus === "A"
                          ? "Added"
                          : gitStatus === "D"
                            ? "Deleted"
                            : gitStatus === "S"
                              ? "Staged"
                              : "Changed"
                  }
                >
                  {gitStatus === "U" && <Plus className="h-3.5 w-3.5 text-emerald-400" />}
                  {gitStatus === "M" && <CircleDot className="h-3.5 w-3.5 text-amber-300" />}
                  {gitStatus === "A" && <Plus className="h-3.5 w-3.5 text-sky-400" />}
                  {gitStatus === "D" && <Minus className="h-3.5 w-3.5 text-rose-400" />}
                  {gitStatus === "S" && <Check className="h-3.5 w-3.5 text-indigo-300" />}
                </span>
              )}
              {isDirectory && hasNestedChanges && !gitStatus && (
                <span
                  className="ml-2 h-2 w-2 rounded-full bg-amber-400/80 border border-amber-300/70"
                  title="Contains changed files"
                />
              )}
            </div>
          </motion.div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {isDirectory && (
            <>
              <ContextMenuItem onSelect={handleNewFile}>
                <FilePlus className="h-4 w-4 mr-2" /> New File
              </ContextMenuItem>
              <ContextMenuItem onSelect={handleNewFolder}>
                <FolderPlus className="h-4 w-4 mr-2" /> New Folder
              </ContextMenuItem>
            </>
          )}
          <ContextMenuItem onSelect={handleRename}>
            <Pencil className="h-4 w-4 mr-2" /> Rename
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
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
                projectRoot={projectRoot}
                onRefresh={onRefresh}
                gitStatusByPath={gitStatusByPath}
                folderChangesByPath={folderChangesByPath}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function FileTree({
  files,
  onSelectFile,
  selectedPath,
  projectRoot,
  onRefresh,
  gitStatusByPath,
}) {
  // Sort files and compute which folders contain any changes
  const { sortedFiles, folderChangesByPath } = useMemo(() => {
    const sorted = sortTree(files);
    const folderChanges = buildFolderChangeMap(sorted, gitStatusByPath);
    return { sortedFiles: sorted, folderChangesByPath: folderChanges };
  }, [files, gitStatusByPath]);

  if (!files || files.length === 0) {
    return (
      <div className="p-4 text-xs text-muted-foreground italic text-center">No files found</div>
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
          projectRoot={projectRoot}
          onRefresh={onRefresh}
          gitStatusByPath={gitStatusByPath}
          folderChangesByPath={folderChangesByPath}
        />
      ))}
    </div>
  );
}
