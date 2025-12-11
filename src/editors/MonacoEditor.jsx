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
