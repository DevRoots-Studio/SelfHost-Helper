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
        defaultLanguage={language}
        language={language}
        value={value}
        theme={theme}
        onChange={handleEditorChange}
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
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
};

export default MonacoEditor;
