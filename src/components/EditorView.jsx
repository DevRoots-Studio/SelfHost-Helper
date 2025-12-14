import React, { useState } from "react";
import { FileCode, Save, FolderOpen, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import FileTree from "@/components/FileTree";
import MonacoEditor from "@/editors/MonacoEditor";

const API = window.api;

const getLanguageFromPath = (filePath) => {
  if (!filePath) return "plaintext";
  const ext = filePath.split(".").pop()?.toLowerCase();
  const languageMap = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
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
    yml: "yaml",
    yaml: "yaml",
    xml: "xml",
    md: "markdown",
    sql: "sql",
    vue: "vue",
    svelte: "svelte",
  };
  return languageMap[ext] || "plaintext";
};

export default function EditorView({
  projectPath,
  fileTree,
  isFileTreeLoading,
}) {
  const [editorContent, setEditorContent] = useState("");
  const [currentFile, setCurrentFile] = useState(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileLoadError, setFileLoadError] = useState(null);

  const handleFileSelect = async (node) => {
    if (node.type === "file") {
      setIsFileLoading(true);
      setFileLoadError(null);
      setCurrentFile(node.path);
      setEditorContent("");

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("File read timeout after 10 seconds")),
            10000
          )
        );

        const contentPromise = API.readFile(node.path);
        const content = await Promise.race([contentPromise, timeoutPromise]);

        setEditorContent(content || "");
        setFileLoadError(null);
      } catch (e) {
        console.error("Failed to read file", e);
        const errorMessage = e?.message || e?.toString() || "Unknown error";
        setFileLoadError(`Failed to load file: ${errorMessage}`);
        setEditorContent("");
      } finally {
        setIsFileLoading(false);
      }
    }
  };

  const handleSaveFile = async () => {
    if (currentFile && editorContent) {
      await API.writeFile(currentFile, editorContent);
    }
  };

  return (
    <div className="h-full flex">
      {/* Editor Sidebar (File Tree) */}
      <div className="w-64 border-r border-border bg-card/30 flex flex-col">
        <div className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/20">
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
      <div className="flex-1 flex flex-col bg-background">
        <div className="p-2 flex items-center justify-between text-xs border-b border-border bg-muted/20 h-10">
          <div className="flex items-center space-x-2 flex-1 px-2">
            {currentFile ? (
              <span className="flex items-center text-muted-foreground">
                <FileCode className="h-3 w-3 mr-2" />
                {currentFile.replace(projectPath, "")}
              </span>
            ) : (
              <span className="opacity-50">Select a file to edit</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-xs cursor-pointer"
              onClick={handleSaveFile}
              disabled={!currentFile}
            >
              <Save className="h-3 w-3 mr-1" /> Save
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
                <p className="text-sm text-destructive mb-2">{fileLoadError}</p>
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
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
              <FolderOpen className="h-10 w-10 mb-2" />
              <p>Select a file from the explorer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
