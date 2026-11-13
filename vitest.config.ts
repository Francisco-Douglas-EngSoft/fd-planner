import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // Vitest runs on its own bundled Vite; keep JSX on the automatic runtime there
  // even when the React plugin defers JSX to the app's newer Vite.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "prosemirror-model",
      "prosemirror-transform",
      "prosemirror-state",
      "prosemirror-view",
      "prosemirror-commands",
      "prosemirror-keymap",
      "prosemirror-schema-list",
      "prosemirror-history",
      "prosemirror-inputrules",
      "prosemirror-dropcursor",
      "prosemirror-gapcursor",
    ],
  },
});