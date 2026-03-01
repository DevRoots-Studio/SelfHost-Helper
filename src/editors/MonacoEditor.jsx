import React, { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

const MonacoEditor = ({
  value,
  onChange,
  onSave,
  language = "javascript",
  theme = "vs-dark",
  scrollToLine,
}) => {
  const editorRef = useRef(null);

  const handleEditorChange = (value) => {
    onChange(value);
  };

  useEffect(() => {
    if (scrollToLine != null && editorRef.current) {
      editorRef.current.revealLineInCenter(Math.max(1, scrollToLine));
    }
  }, [scrollToLine]);

  return (
    <div className="h-full w-full overflow-hidden">
      <Editor
        height="100%"
        width="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        theme={theme}
        onChange={handleEditorChange}
        onMount={(editor, monaco) => {
          editorRef.current = editor;
          if (scrollToLine != null) {
            editor.revealLineInCenter(Math.max(1, scrollToLine));
          }
          if (monaco?.languages?.javascriptDefaults && monaco?.languages?.typescriptDefaults) {
            const jsTsOpts = {
              allowNonTsExtensions: true,
              checkJs: true,
              jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
              target: monaco.languages.typescript.ScriptTarget.ESNext,
              module: monaco.languages.typescript.ModuleKind.ESNext,
              moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            };
            monaco.languages.javascriptDefaults.setCompilerOptions(jsTsOpts);
            monaco.languages.typescriptDefaults.setCompilerOptions({
              ...jsTsOpts,
              strict: true,
            });
            monaco.languages.typescriptDefaults.setDiagnosticsOptions({
              noSemanticValidation: false,
              noSyntaxValidation: false,
            });
          }

          // Add save action (Ctrl/Cmd+S)
          editor.addAction({
            id: "save-file",
            label: "Save File",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
            run: () => {
              if (onSave) onSave();
            },
          });
        }}
        loading={
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p>Loading editor...</p>
            </div>
          </div>
        }
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          scrollBeyondLastLine: true,
          automaticLayout: true,
          wordWrap: "off",
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          quickSuggestionsDelay: 10,
          parameterHints: { enabled: true },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          folding: true,
          bracketPairColorization: { enabled: true },
          scrollbar: {
            horizontal: "auto",
            horizontalScrollbarSize: 10,
            verticalScrollbarSize: 10,
          },
        }}
      />
    </div>
  );
};

export default MonacoEditor;
