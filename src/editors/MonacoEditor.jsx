import React from "react";
import Editor from "@monaco-editor/react";

const MonacoEditor = ({
  value,
  onChange,
  language = "javascript",
  theme = "vs-dark",
}) => {
  const handleEditorChange = (value) => {
    onChange(value);
  };

  return (
    <div className="h-full w-full rounded-md overflow-hidden border">
      <Editor
        height="100%"
        width="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        theme={theme}
        onChange={handleEditorChange}
        onMount={(editor, monaco) => {
          if (
            monaco?.languages?.javascriptDefaults &&
            monaco?.languages?.typescriptDefaults
          ) {
            monaco.languages.javascriptDefaults.setCompilerOptions({
              allowNonTsExtensions: true,
              checkJs: true,
              jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
              target: monaco.languages.ScriptTarget.ESNext,
            });

            monaco.languages.typescriptDefaults.setCompilerOptions({
              jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
              target: monaco.languages.ScriptTarget.ESNext,
            });
          }
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
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: true,
          automaticLayout: true,
          wordWrap: "off",
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,

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
