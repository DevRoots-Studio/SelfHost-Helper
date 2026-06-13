import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
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
import { useAtom, useSetAtom } from "jotai";
import * as atoms from "@/store/atoms";
import FileTree from "@/components/FileTree";
import SearchPanel from "@/components/SearchPanel";
import GitPanel from "@/components/GitPanel";
import MonacoEditor from "@/editors/MonacoEditor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

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

export default function EditorView() {
  const context = useOutletContext();
  const project = context?.project ?? null;
  const projectId = project?.id;
  const projectPath = project?.path ?? "";
  const fileTree = context?.fileTree ?? [];
  const isFileTreeLoading = context?.isFileTreeLoading ?? false;
  const projectEditorStates = context?.projectEditorStates ?? {};
  const rawProjectState = project ? projectEditorStates[project.id] : null;
  const initialProjectState = useMemo(() => {
    if (!project) return null;
    if (!rawProjectState || typeof rawProjectState !== "object") {
      return {
        openTabs: [],
        activeTabId: null,
        explorerExpanded: {},
        lastActiveFile: rawProjectState || null,
      };
    }
    return {
      openTabs: Array.isArray(rawProjectState.openTabs) ? rawProjectState.openTabs : [],
      activeTabId:
        typeof rawProjectState.activeTabId === "string" ? rawProjectState.activeTabId : null,
      explorerExpanded: rawProjectState.explorerExpanded || {},
      lastActiveFile: rawProjectState.lastActiveFile || null,
    };
  }, [project, rawProjectState]);
  const onFileSelect = context?.handleEditorFileChange
    ? (path) => context.handleEditorFileChange(project?.id, path)
    : () => {};
  const onRefreshFileTree = context?.loadFileTree
    ? () => project?.path && context.loadFileTree(project.path)
    : () => {};
  const [editorContent, setEditorContent] = useState("");
  const [currentFile, setCurrentFile] = useState(initialProjectState?.lastActiveFile || null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileLoadError, setFileLoadError] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useAtom(atoms.unsavedChangesAtom);
  const [searchOpen, setSearchOpen] = useState(false);
  const [gitOpen, setGitOpen] = useState(false);
  const [scrollToLine, setScrollToLine] = useState(null);
  const [gitStatusByPath, setGitStatusByPath] = useState({});
  const [openTabs, setOpenTabs] = useState(initialProjectState?.openTabs || []);
  const [activeTabId, setActiveTabId] = useState(initialProjectState?.activeTabId || null);
  const [explorerExpanded, setExplorerExpanded] = useState(
    initialProjectState?.explorerExpanded || {}
  );
  const [pendingCloseTabId, setPendingCloseTabId] = useState(null);
  const [isSavingCloseTab, setIsSavingCloseTab] = useState(false);

  const setProjectEditorStates = useSetAtom(atoms.projectEditorStatesAtom);

  const editorContentRef = useRef(editorContent);
  const currentFileRef = useRef(currentFile);
  const unsavedChangesRef = useRef(unsavedChanges);
  const suppressReloadForPathRef = useRef({});

  useEffect(() => {
    editorContentRef.current = editorContent;
  }, [editorContent]);

  useEffect(() => {
    currentFileRef.current = currentFile;
  }, [currentFile]);

  useEffect(() => {
    unsavedChangesRef.current = unsavedChanges;
  }, [unsavedChanges]);

  // Persist per-project editor UI state whenever relevant pieces change.
  useEffect(() => {
    if (!projectId) return;
    setProjectEditorStates((prev) => ({
      ...prev,
      [projectId]: {
        openTabs,
        activeTabId,
        explorerExpanded,
        lastActiveFile: currentFile || null,
      },
    }));
  }, [projectId, openTabs, activeTabId, explorerExpanded, currentFile, setProjectEditorStates]);

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

  // On project change, ensure initial file content is loaded.
  // Without this, we may restore `currentFile` from state but keep `editorContent`
  // at the initial empty string, resulting in an empty editor on re-open.
  useEffect(() => {
    if (!projectId) return;
    const targetFile = initialProjectState?.lastActiveFile;
    if (targetFile) {
      const shouldLoad = targetFile !== currentFileRef.current || editorContentRef.current === "";
      if (shouldLoad) {
        loadFile(targetFile);
      }
    } else {
      setCurrentFile(null);
      setEditorContent("");
    }
  }, [projectId, initialProjectState?.lastActiveFile]);

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
    const unsub = API.onFileChange?.(({ event, filePath }) => {
      const current = currentFileRef.current;
      if (!current || !filePath) return;
      const norm = (p) => (p || "").replace(/\\/g, "/");
      if (norm(filePath) !== norm(current)) return;

      const suppressedAt = suppressReloadForPathRef.current[current];
      if (suppressedAt && Date.now() - suppressedAt < 2000) {
        return;
      }

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

    // Ensure tab exists for this file
    setOpenTabs((prev) => {
      const existing = prev.find((t) => t.path === filePath);
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }
      const id = filePath;
      const fileName = filePath.split(/[/\\]/).pop() || filePath;
      const next = [
        ...prev,
        {
          id,
          path: filePath,
          fileName,
          language: getLanguageFromPath(filePath),
        },
      ];
      setActiveTabId(id);
      return next;
    });

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

  const handleToggleFolder = useCallback(
    (folderPath) => {
      const norm = normalizePath(folderPath);
      setExplorerExpanded((prev) => ({
        ...prev,
        [norm]: !prev[norm],
      }));
    },
    [setExplorerExpanded]
  );

  const handleSelectTab = (tabId) => {
    const tab = openTabs.find((t) => t.id === tabId);
    if (!tab) return;
    setActiveTabId(tabId);
    if (tab.path !== currentFileRef.current) {
      loadFile(tab.path);
    }
  };

  const performCloseTab = useCallback(
    (tabId) => {
      const tab = openTabs.find((t) => t.id === tabId);
      if (!tab) return;
      const nextTabs = openTabs.filter((t) => t.id !== tabId);
      setOpenTabs(nextTabs);
      setUnsavedChanges((prev) => {
        const updated = { ...prev };
        delete updated[tab.path];
        return updated;
      });
      // Keep watcher dirty-check in sync immediately.
      // This avoids a race where chokidar fires before the Jotai atom propagates.
      delete unsavedChangesRef.current?.[tab.path];
      if (activeTabId === tabId) {
        const idx = openTabs.findIndex((t) => t.id === tabId);
        const replacement = nextTabs[idx] ?? nextTabs[idx - 1] ?? null;
        setActiveTabId(replacement ? replacement.id : null);
        if (replacement) {
          if (replacement.path !== currentFileRef.current) {
            loadFile(replacement.path);
          }
        } else {
          setCurrentFile(null);
          setEditorContent("");
        }
      }
      setPendingCloseTabId(null);
    },
    [openTabs, activeTabId, setUnsavedChanges]
  );

  const handleCloseTab = (tabId) => {
    const tab = openTabs.find((t) => t.id === tabId);
    if (tab && unsavedChangesRef.current[tab.path] !== undefined) {
      setPendingCloseTabId(tabId);
      return;
    }
    performCloseTab(tabId);
  };

  const handleConfirmCloseSave = useCallback(async () => {
    if (pendingCloseTabId == null) return;
    const tab = openTabs.find((t) => t.id === pendingCloseTabId);
    if (!tab) {
      setPendingCloseTabId(null);
      return;
    }
    setIsSavingCloseTab(true);
    const content =
      currentFileRef.current === tab.path
        ? editorContentRef.current
        : unsavedChangesRef.current[tab.path];
    const contentToWrite = content ?? "";
    try {
      const success = await API.writeFile(tab.path, contentToWrite);
      if (success) {
        toast.success("File saved");
        performCloseTab(pendingCloseTabId);
      } else {
        toast.error("Failed to save file");
        setPendingCloseTabId(null);
      }
    } catch (err) {
      const isDeleted =
        (err?.message && err.message.includes("no longer exists")) || err?.code === "ENOENT";
      if (isDeleted) {
        toast.info("File was deleted or moved; cannot save.");
      } else {
        toast.error(`Error saving file: ${err?.message || "Unknown error"}`);
      }
      setPendingCloseTabId(null);
    } finally {
      setIsSavingCloseTab(false);
    }
  }, [pendingCloseTabId, openTabs, performCloseTab]);

  const handleConfirmCloseDiscard = useCallback(() => {
    if (pendingCloseTabId == null) return;
    performCloseTab(pendingCloseTabId);
  }, [pendingCloseTabId, performCloseTab]);

  const handleConfirmCloseCancel = useCallback(() => {
    setPendingCloseTabId(null);
  }, []);

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
        // Prevent the file watcher from re-loading the editor immediately after
        // our own save (which can look like the file "re-opens" and disrupt cursor).
        suppressReloadForPathRef.current[fileToSave] = Date.now();

        const success = await API.writeFile(fileToSave, contentToSave);
        if (success) {
          toast.success("File saved");
          // Ensure watcher sees this as clean right away.
          delete unsavedChangesRef.current?.[fileToSave];
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
    // IMPORTANT:
    // Do not update `editorContent` state on every keystroke.
    // Updating the controlled Monaco `value` frequently can cause Monaco
    // to reset cursor/selection and sometimes drop keystrokes.
    // We keep the latest text in refs + dirty atom instead.
    editorContentRef.current = newContent;
    if (currentFile) {
      // Keep watcher dirty-check in sync immediately.
      unsavedChangesRef.current[currentFile] = newContent;
      setUnsavedChanges((prev) => ({
        ...prev,
        [currentFile]: newContent,
      }));
    }
  };

  // Bind Ctrl/Cmd+S to save the current file (capture phase to prevent browser default)
  useEffect(() => {
    const onKeyDown = (e) => {
      const isCloseTab = (e.ctrlKey || e.metaKey) && (e.key === "w" || e.key === "W");
      if (isCloseTab) {
        e.preventDefault();
        if (activeTabId) {
          handleCloseTab(activeTabId);
        }
        return;
      }

      const isNextTab =
        (e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "Tab" || e.key === "tab");
      const isPrevTab =
        (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "Tab" || e.key === "tab");
      if ((isNextTab || isPrevTab) && openTabs.length > 0) {
        e.preventDefault();
        const idx = openTabs.findIndex((t) => t.id === activeTabId);
        if (idx === -1) return;
        const delta = isNextTab ? 1 : -1;
        const nextIdx = (idx + delta + openTabs.length) % openTabs.length;
        const nextTab = openTabs[nextIdx];
        if (nextTab) {
          handleSelectTab(nextTab.id);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [activeTabId, openTabs, handleCloseTab]);

  if (!project) return null;

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
              expandedPaths={explorerExpanded}
              onToggleFolder={handleToggleFolder}
            />
          )}
        </div>
      </div>
      {/* Editor Main */}
      <div className="flex-1 min-h-0 flex flex-col bg-transparent relative z-0">
        <div className="px-2 h-10 flex items-center justify-between text-xs border-b border-white/5 z-10 shadow-sm shrink-0">
          <div className="flex items-center space-x-1 flex-1 min-w-0 overflow-x-auto">
            {openTabs.length === 0 ? (
              <span className="ml-2 opacity-40 italic whitespace-nowrap">
                Select a file to edit
              </span>
            ) : (
              openTabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const isDirty = unsavedChanges[tab.path] !== undefined;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={cn(
                      "group flex items-center px-2 h-7 rounded-md border text-xs mr-1 whitespace-nowrap cursor-pointer",
                      isActive
                        ? "bg-background text-foreground border-primary/60"
                        : "bg-black/10 text-muted-foreground border-transparent hover:bg-white/5"
                    )}
                    onClick={() => handleSelectTab(tab.id)}
                  >
                    <FileCode className="h-3.5 w-3.5 mr-1 text-primary/80" />
                    <span className="truncate max-w-35">{tab.fileName}</span>
                    {isDirty && (
                      <span className="ml-1 text-primary text-[11px] group-hover:hidden">*</span>
                    )}
                    <span
                      className="ml-1 text-xs opacity-60 hover:opacity-100 px-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTab(tab.id);
                      }}
                    >
                      ×
                    </span>
                  </button>
                );
              })
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
                      <div className="flex-1 min-h-20">
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

      <Dialog
        open={pendingCloseTabId != null}
        onOpenChange={(open) => !open && setPendingCloseTabId(null)}
      >
        <DialogContent
          className="sm:max-w-md"
          aria-describedby="unsaved-dialog-description"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription id="unsaved-dialog-description">
              {pendingCloseTabId != null &&
                (() => {
                  const tab = openTabs.find((t) => t.id === pendingCloseTabId);
                  return tab
                    ? `Do you want to save the changes you made to "${tab.fileName}"?`
                    : null;
                })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleConfirmCloseCancel}
              disabled={isSavingCloseTab}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-amber-500/60 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              onClick={handleConfirmCloseDiscard}
              disabled={isSavingCloseTab}
            >
              Don&apos;t save
            </Button>
            <Button
              type="button"
              className="btn-primary cursor-pointer"
              onClick={handleConfirmCloseSave}
              disabled={isSavingCloseTab}
            >
              {isSavingCloseTab ? (
                "Saving…"
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
