import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileCode,
  Save,
  FolderOpen,
  RefreshCw,
  FilePlus,
  FolderPlus,
  Search,
  GitBranch,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";
import { useAtom } from "jotai";
import * as atoms from "@/store/atoms";
import FileTree from "@/components/FileTree";
import SearchPanel from "@/components/SearchPanel";
import GitPanel from "@/components/GitPanel";
import MonacoEditor from "@/editors/MonacoEditor";

const API = window.api;

const getLanguageFromPath = (filePath) => {
  if (!filePath) return "plaintext";
  const ext = filePath.split(".").pop()?.toLowerCase();

  const languageMap = {
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    go: "go",
    rs: "rust",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    yml: "yaml",
    yaml: "yaml",
    xml: "xml",
    md: "markdown",
    markdown: "markdown",
    sql: "sql",
    vue: "vue",
    svelte: "svelte",
    tsbuildinfo: "plaintext",
    lock: "plaintext",
    env: "dotenv",
    dockerfile: "docker",
    gitignore: "git",
    gitattributes: "git",
    editorconfig: "config",
    npmignore: "config",
  };

  const nameMap = {
    Dockerfile: "docker",
    Makefile: "makefile",
    README: "markdown",
    LICENSE: "plaintext",
  };

  const baseName = filePath.split("/").pop();
  if (nameMap[baseName]) return nameMap[baseName];

  return languageMap[ext] || "plaintext";
};

export default function EditorView({
  projectId,
  projectPath,
  fileTree,
  isFileTreeLoading,
  initialFile,
  onFileSelect,
  onRefreshFileTree,
}) {
  const [editorContent, setEditorContent] = useState("");
  const [currentFile, setCurrentFile] = useState(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileLoadError, setFileLoadError] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useAtom(atoms.unsavedChangesAtom);
  const [searchOpen, setSearchOpen] = useState(false);
  const [gitOpen, setGitOpen] = useState(false);
  const [scrollToLine, setScrollToLine] = useState(null);
  const [gitStatusByPath, setGitStatusByPath] = useState({});

  const editorContentRef = useRef(editorContent);
  const currentFileRef = useRef(currentFile);
  const unsavedChangesRef = useRef(unsavedChanges);

  useEffect(() => {
    editorContentRef.current = editorContent;
  }, [editorContent]);

  useEffect(() => {
    currentFileRef.current = currentFile;
  }, [currentFile]);

  useEffect(() => {
    unsavedChangesRef.current = unsavedChanges;
  }, [unsavedChanges]);

  const normalizePath = (p) => (p || "").replace(/\\/g, "/");

  const applyGitStatusToMap = useCallback(
    (status) => {
      if (!status || !status.files) {
        setGitStatusByPath({});
        return;
      }
      const rootNorm = normalizePath(projectPath);
      const map = {};
      status.files.forEach((f) => {
        const full = normalizePath(f.fullPath || `${rootNorm}/${f.path}`);
        const working = f.workingDir || f.working_dir || " ";
        const index = f.index || " ";
        let code = " ";
        // Staged changes take priority in the explorer badge
        if (index && index !== " ") {
          code = "S"; // Staged
        } else if (working === "U" || working === "?") {
          code = "U"; // Untracked
        } else if (working && working !== " ") {
          code = working; // M, D, etc. from working tree
        }
        map[full] = code;
      });
      setGitStatusByPath(map);
    },
    [projectPath]
  );

  const loadGitStatus = useCallback(async () => {
    if (!projectPath) {
      setGitStatusByPath({});
      return;
    }
    try {
      const status = await API.gitStatus(projectPath);
      applyGitStatusToMap(status);
    } catch {
      setGitStatusByPath({});
    }
  }, [projectPath, applyGitStatusToMap]);

  // File tree resize state and ref
  const treeRef = useRef(null);
  const [treeWidth, setTreeWidth] = useState(() => {
    const saved = localStorage.getItem("editorFileTreeWidth");
    return saved ? parseInt(saved, 10) : 256; // default 256px (w-64)
  });
  const [isTreeResizing, setIsTreeResizing] = useState(false);
  const TREE_MIN = 200;
  const TREE_MAX = 600;

  // Bottom panels (Search/Git) resize state
  const [bottomPanelHeight, setBottomPanelHeight] = useState(() => {
    const saved = localStorage.getItem("editorBottomPanelHeight");
    return saved ? parseInt(saved, 10) : 224; // default ~h-56
  });
  const [isBottomResizing, setIsBottomResizing] = useState(false);
  const bottomResizeStartRef = useRef({ y: 0, height: 0 });
  const BOTTOM_MIN = 140;
  const BOTTOM_MAX = 600;

  // Inner split between Search and Git when both are open
  const [searchPanelHeight, setSearchPanelHeight] = useState(() => {
    const saved = localStorage.getItem("editorSearchPanelHeight");
    const base = saved ? parseInt(saved, 10) : 112; // default half of 224
    return Number.isFinite(base) && base > 0 ? base : 112;
  });
  const [isInnerBottomResizing, setIsInnerBottomResizing] = useState(false);
  const innerResizeStartRef = useRef({ y: 0, height: 0 });
  const INNER_MIN = 80;

  useEffect(() => {
    const onMouseMove = (e) => {
      if (isTreeResizing && treeRef.current) {
        const rect = treeRef.current.getBoundingClientRect();
        let newWidth = e.clientX - rect.left;
        if (newWidth < TREE_MIN) newWidth = TREE_MIN;
        if (newWidth > TREE_MAX) newWidth = TREE_MAX;
        setTreeWidth(newWidth);
      }

      if (isBottomResizing) {
        const start = bottomResizeStartRef.current;
        const delta = start.y - e.clientY;
        let newHeight = start.height + delta;
        if (newHeight < BOTTOM_MIN) newHeight = BOTTOM_MIN;
        if (newHeight > BOTTOM_MAX) newHeight = BOTTOM_MAX;
        setBottomPanelHeight(newHeight);
      }

      if (isInnerBottomResizing) {
        const start = innerResizeStartRef.current;
        const delta = e.clientY - start.y;
        let newHeight = start.height + delta;
        // Clamp so Search and Git each keep a minimum
        const maxForSearch = bottomPanelHeight - INNER_MIN;
        if (newHeight < INNER_MIN) newHeight = INNER_MIN;
        if (newHeight > maxForSearch) newHeight = maxForSearch;
        setSearchPanelHeight(newHeight);
      }
    };

    const onMouseUp = () => {
      if (isTreeResizing) {
        setIsTreeResizing(false);
        localStorage.setItem("editorFileTreeWidth", String(treeWidth));
      }
      if (isBottomResizing) {
        setIsBottomResizing(false);
        localStorage.setItem("editorBottomPanelHeight", String(bottomPanelHeight));
      }
      if (isInnerBottomResizing) {
        setIsInnerBottomResizing(false);
        localStorage.setItem("editorSearchPanelHeight", String(searchPanelHeight));
      }
      document.body.style.userSelect = "";
    };

    if (isTreeResizing || isBottomResizing || isInnerBottomResizing) {
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
    };
  }, [
    isTreeResizing,
    isBottomResizing,
    isInnerBottomResizing,
    treeWidth,
    bottomPanelHeight,
    searchPanelHeight,
  ]);

  useEffect(() => {
    if (initialFile) {
      if (initialFile !== currentFile) {
        loadFile(initialFile);
      }
    } else {
      setCurrentFile(null);
      setEditorContent("");
    }
  }, [projectId, initialFile]);

  useEffect(() => {
    loadGitStatus();
  }, [loadGitStatus]);

  // Start TypeScript LSP for this project when editor is shown (WebSocket URL available for future client)
  useEffect(() => {
    if (!projectPath) return;
    API.lspStart?.(projectPath).catch(() => {});
    return () => {
      API.lspStop?.(projectPath).catch(() => {});
    };
  }, [projectPath]);

  // Sync with external file changes: reload current file if it changed on disk
  useEffect(() => {
    const unsub = API.onFileChange?.(({ filePath }) => {
      const current = currentFileRef.current;
      if (!current || !filePath) return;
      const norm = (p) => (p || "").replace(/\\/g, "/");
      if (norm(filePath) !== norm(current)) return;
      if (unsavedChangesRef.current[current] !== undefined) {
        toast.info("File changed on disk. Save or reload to see changes.");
        return;
      }
      loadFile(current);
    });
    return () => unsub?.();
  }, [projectPath]);

  const loadFile = async (filePath) => {
    setIsFileLoading(true);
    setFileLoadError(null);
    setCurrentFile(filePath);

    // Use ref so callers (e.g. onFileChange) always see latest unsaved state
    if (unsavedChangesRef.current[filePath] !== undefined) {
      setEditorContent(unsavedChangesRef.current[filePath]);
      setIsFileLoading(false);
      onFileSelect?.(filePath);
      return;
    }

    setEditorContent("");

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("File read timeout after 10 seconds")), 10000)
      );

      const contentPromise = API.readFile(filePath);
      const content = await Promise.race([contentPromise, timeoutPromise]);

      setEditorContent(content || "");
      setFileLoadError(null);
      onFileSelect?.(filePath);
    } catch (e) {
      const msg = e?.message || e?.toString() || "";
      const isDeleted = msg.includes("no longer exists") || e?.code === "ENOENT";
      if (isDeleted) {
        toast.info("This file was deleted or moved.");
        setFileLoadError("This file was deleted or moved.");
      } else {
        console.error("Failed to read file", e);
        setFileLoadError(`Failed to load file: ${msg || "Unknown error"}`);
      }
      setEditorContent("");
    } finally {
      setIsFileLoading(false);
    }
  };

  const handleFileSelect = async (node) => {
    if (node.type === "file") {
      setScrollToLine(null);
      loadFile(node.path);
    }
  };

  const handleOpenSearchResult = (filePath, lineNumber) => {
    const current = currentFileRef.current;
    if (normalizePath(filePath) !== normalizePath(current)) {
      loadFile(filePath).then(() => {
        // Defer scroll until after React has committed the new content so Monaco scrolls in the correct file
        requestAnimationFrame(() => requestAnimationFrame(() => setScrollToLine(lineNumber)));
      });
    } else {
      setScrollToLine(lineNumber);
    }
  };

  const handleSaveFile = useCallback(async () => {
    const fileToSave = currentFileRef.current;
    const contentToSave = editorContentRef.current;

    if (fileToSave && contentToSave !== undefined) {
      try {
        const success = await API.writeFile(fileToSave, contentToSave);
        if (success) {
          toast.success("File saved");
          // Remove from unsaved changes
          setUnsavedChanges((prev) => {
            const next = { ...prev };
            delete next[fileToSave];
            return next;
          });
        } else {
          toast.error("Failed to save file");
        }
      } catch (err) {
        const isDeleted =
          (err?.message && err.message.includes("no longer exists")) || err?.code === "ENOENT";
        if (isDeleted) {
          toast.info("File was deleted or moved; cannot save.");
        } else {
          toast.error(`Error saving file: ${err?.message || "Unknown error"}`);
        }
      }
    }
  }, [setUnsavedChanges]);

  const handleEditorChange = (newContent) => {
    setEditorContent(newContent);
    if (currentFile) {
      setUnsavedChanges((prev) => ({
        ...prev,
        [currentFile]: newContent,
      }));
    }
  };

  // Bind Ctrl/Cmd+S to save the current file (capture phase to prevent browser default)
  useEffect(() => {
    const onKeyDown = (e) => {
      const isSave = (e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S");
      if (isSave) {
        e.preventDefault();
        handleSaveFile();
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [handleSaveFile]);

  return (
    <div className="h-full min-h-0 flex text-sm">
      {/* Editor Sidebar (File Tree) */}
      <div
        ref={treeRef}
        className="relative border-r border-white/5 flex flex-col"
        style={{ width: treeWidth }}
      >
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 z-50"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsTreeResizing(true);
          }}
        />
        <div className="h-12 flex items-center justify-between gap-1 px-2 border-b border-white/5 shadow-sm shrink-0">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 truncate">
            Explorer
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 cursor-pointer"
              disabled={!projectPath}
              onClick={async () => {
                if (!projectPath) return;
                const name = prompt("File name:");
                if (!name?.trim()) return;
                const relativeName = name.trim().replace(/^[\\/]+/, "");
                const targetPath = relativeName;
                try {
                  await API.createFile(projectPath, targetPath, "file", "");
                  toast.success("File created");
                  onRefreshFileTree?.();
                  const base = (projectPath || "").replace(/\\/g, "/").replace(/\/$/, "");
                  const fullPath = base ? base + "/" + relativeName : relativeName;
                  loadFile(fullPath);
                } catch (err) {
                  toast.error(err?.message || "Failed to create file");
                }
              }}
              title="New File"
            >
              <FilePlus className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 cursor-pointer"
              disabled={!projectPath}
              onClick={async () => {
                if (!projectPath) return;
                const name = prompt("Folder name:");
                if (!name?.trim()) return;
                const relativeName = name.trim().replace(/^[\\/]+/, "");
                const targetPath = relativeName;
                try {
                  await API.createFile(projectPath, targetPath, "directory");
                  toast.success("Folder created");
                  onRefreshFileTree?.();
                } catch (err) {
                  toast.error(err?.message || "Failed to create folder");
                }
              }}
              title="New Folder"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 cursor-pointer"
              onClick={() => onRefreshFileTree?.()}
              title="Refresh file tree"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {isFileTreeLoading ? (
            <div className="p-4 text-xs text-muted-foreground">Loading...</div>
          ) : (
            <FileTree
              files={fileTree}
              onSelectFile={handleFileSelect}
              selectedPath={currentFile}
              projectRoot={projectPath}
              onRefresh={onRefreshFileTree}
              gitStatusByPath={gitStatusByPath}
            />
          )}
        </div>
      </div>
      {/* Editor Main */}
      <div className="flex-1 min-h-0 flex flex-col bg-transparent relative z-0">
        <div className="px-4 h-12 flex items-center justify-between text-xs border-b border-white/5 z-10 shadow-sm shrink-0">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {currentFile ? (
              <span className="flex items-center text-foreground font-medium truncate">
                <FileCode className="h-4 w-4 mr-2 text-primary opacity-80" />
                {currentFile.replace(projectPath, "")}
              </span>
            ) : (
              <span className="opacity-40 italic">Select a file to edit</span>
            )}
          </div>
          <div className="flex items-center gap-2 pl-2">
            <Button
              size="sm"
              variant="ghost"
              className={`h-8 text-xs cursor-pointer gap-1.5 ${
                searchOpen ? "bg-primary/15 text-primary" : ""
              }`}
              onClick={() => setSearchOpen((v) => !v)}
              title="Search in project"
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={`h-8 text-xs cursor-pointer gap-1.5 ${
                gitOpen ? "bg-primary/15 text-primary" : ""
              }`}
              onClick={() => setGitOpen((v) => !v)}
              title="Git"
            >
              <GitBranch className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs cursor-pointer gap-1.5 btn-primary shadow-sm"
              onClick={handleSaveFile}
              disabled={!currentFile}
            >
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 relative">
            {currentFile ? (
              isFileLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="mb-4"
                  >
                    <FileCode className="h-12 w-12 opacity-50" />
                  </motion.div>
                  <p className="text-sm">Loading file...</p>
                </div>
              ) : fileLoadError ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                  <FileCode
                    className={cn(
                      "h-12 w-12 mb-4 opacity-50",
                      fileLoadError.includes("deleted or moved")
                        ? "text-amber-500"
                        : "text-destructive"
                    )}
                  />
                  <p
                    className={cn(
                      "text-sm mb-4 text-center",
                      fileLoadError.includes("deleted or moved")
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-destructive"
                    )}
                  >
                    {fileLoadError}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const node = {
                        type: "file",
                        path: currentFile,
                      };
                      handleFileSelect(node);
                    }}
                    className="cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Retry
                  </Button>
                </div>
              ) : (
                <div className="absolute inset-0">
                  <MonacoEditor
                    value={editorContent}
                    onChange={handleEditorChange}
                    onSave={handleSaveFile}
                    language={getLanguageFromPath(currentFile)}
                    scrollToLine={scrollToLine}
                  />
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-30">
                <FolderOpen className="h-16 w-16 mb-4 stroke-[1.5]" />
                <p className="text-lg font-medium">No File Selected</p>
                <p className="text-xs">Select a file from the explorer to start editing</p>
              </div>
            )}
          </div>
          {(searchOpen || gitOpen) && (
            <>
              <div
                className="h-1.5 cursor-row-resize bg-white/5 hover:bg-primary/50 border-t border-white/10 relative z-10"
                onMouseDown={(e) => {
                  e.preventDefault();
                  bottomResizeStartRef.current = {
                    y: e.clientY,
                    height: bottomPanelHeight,
                  };
                  setIsBottomResizing(true);
                }}
              />
              <div
                className="shrink-0 border-t border-white/5"
                style={{ height: bottomPanelHeight }}
              >
                <div className="flex flex-col h-full">
                  {searchOpen && gitOpen ? (
                    <>
                      <div
                        className="border-b border-white/5"
                        style={{ height: searchPanelHeight, minHeight: INNER_MIN }}
                      >
                        <SearchPanel
                          projectRoot={projectPath}
                          projectPathLabel
                          onOpenResult={handleOpenSearchResult}
                          isOpen={searchOpen}
                          onClose={() => setSearchOpen(false)}
                        />
                      </div>
                      <div
                        className="h-1 cursor-row-resize bg-white/5 hover:bg-primary/50 border-y border-white/10 relative z-10"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          innerResizeStartRef.current = {
                            y: e.clientY,
                            height: searchPanelHeight,
                          };
                          setIsInnerBottomResizing(true);
                        }}
                      />
                      <div className="flex-1 min-h-[80px]">
                        <GitPanel
                          projectPath={projectPath}
                          isOpen={gitOpen}
                          onClose={() => setGitOpen(false)}
                          onRefreshFileTree={onRefreshFileTree}
                          onStatusChange={applyGitStatusToMap}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {searchOpen && (
                        <div className="h-full">
                          <SearchPanel
                            projectRoot={projectPath}
                            projectPathLabel
                            onOpenResult={handleOpenSearchResult}
                            isOpen={searchOpen}
                            onClose={() => setSearchOpen(false)}
                          />
                        </div>
                      )}
                      {gitOpen && (
                        <div className="h-full">
                          <GitPanel
                            projectPath={projectPath}
                            isOpen={gitOpen}
                            onClose={() => setGitOpen(false)}
                            onRefreshFileTree={onRefreshFileTree}
                            onStatusChange={applyGitStatusToMap}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
