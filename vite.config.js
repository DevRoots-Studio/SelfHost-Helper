import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve("./src"),
    },
  },
  optimizeDeps: {
    include: [
      "monaco-editor/esm/vs/editor/editor.worker",
      "monaco-editor/esm/vs/language/json/json.worker",
      "monaco-editor/esm/vs/language/typescript/ts.worker",
    ],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    cssMinify: "esbuild",
  },
});
