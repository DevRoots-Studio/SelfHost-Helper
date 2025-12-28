import React, { useState, useEffect } from "react";
import { FileCode, Save, FolderOpen, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import FileTree from "@/components/FileTree";
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
}) {
  const [editorContent, setEditorContent] = useState("");
  const [currentFile, setCurrentFile] = useState(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileLoadError, setFileLoadError] = useState(null);

  useEffect(() => {
    if (initialFile) {
      if (initialFile !== currentFile) {
        loadFile(initialFile);
      }
    } else {
      setCurrentFile(null);
      setEditorContent("");
    }
  }, [projectId]);

  const loadFile = async (filePath) => {
    setIsFileLoading(true);
    setFileLoadError(null);
    setCurrentFile(filePath);
    setEditorContent("");

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("File read timeout after 10 seconds")),
          10000
        )
      );

      const contentPromise = API.readFile(filePath);
      const content = await Promise.race([contentPromise, timeoutPromise]);

      setEditorContent(content || "");
      setFileLoadError(null);
      onFileSelect?.(filePath);
    } catch (e) {
      console.error("Failed to read file", e);
      const errorMessage = e?.message || e?.toString() || "Unknown error";
      setFileLoadError(`Failed to load file: ${errorMessage}`);
      setEditorContent("");
    } finally {
      setIsFileLoading(false);
    }
  };

  const handleFileSelect = async (node) => {
    if (node.type === "file") {
      loadFile(node.path);
    }
  };

  const handleSaveFile = async () => {
    if (currentFile && editorContent !== undefined) {
      try {
        const success = await API.writeFile(currentFile, editorContent);
        if (success) {
          toast.success("File saved");
        } else {
          toast.error("Failed to save file");
        }
      } catch (err) {
        toast.error(`Error saving file: ${err.message}`);
      }
    }
  };

  return (
    <div className="h-full flex text-sm">
      {/* Editor Sidebar (File Tree) */}
      <div className="w-64 border-r border-white/5 bg-background/30 backdrop-blur-md flex flex-col">
        <div className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/5 shadow-sm">
          Explorer
        </div>
        <div className="flex-1 overflow-hidden">
          {isFileTreeLoading ? (
            <div className="p-4 text-xs text-muted-foreground">Loading...</div>
          ) : (
            <FileTree
              files={fileTree}
              onSelectFile={handleFileSelect}
              selectedPath={currentFile}
            />
          )}
        </div>
      </div>
      {/* Editor Main */}
      <div className="flex-1 flex flex-col bg-transparent relative z-0">
        <div className="px-4 h-12 flex items-center justify-between text-xs border-b border-white/5 bg-background/40 backdrop-blur-sm z-10 shadow-sm">
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
              className="h-8 text-xs cursor-pointer gap-1.5 btn-primary shadow-sm"
              onClick={handleSaveFile}
              disabled={!currentFile}
            >
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
        </div>
        <div className="flex-1">
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
                <FileCode className="h-12 w-12 mb-4 text-destructive opacity-50" />
                <p className="text-sm text-destructive mb-4 text-center">
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
              <MonacoEditor
                value={editorContent}
                onChange={setEditorContent}
                language={getLanguageFromPath(currentFile)}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-30">
              <FolderOpen className="h-16 w-16 mb-4 stroke-[1.5]" />
              <p className="text-lg font-medium">No File Selected</p>
              <p className="text-xs">
                Select a file from the explorer to start editing
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
