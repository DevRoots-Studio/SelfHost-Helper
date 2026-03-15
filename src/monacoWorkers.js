/**
 * Configure Monaco web workers so syntax highlighting and language features work.
 * Must run before Monaco is loaded (e.g. before first Editor mount).
 * Uses Vite's ?worker suffix so workers are bundled correctly.
 */
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

function setupMonacoWorkers() {
  if (typeof window === "undefined" || window.MonacoEnvironment?.getWorker) return;

  window.MonacoEnvironment = {
    getWorker(_, label) {
      if (label === "json") return new JsonWorker();
      if (label === "typescript" || label === "javascript") return new TsWorker();
      return new EditorWorker();
    },
  };
}

setupMonacoWorkers();
