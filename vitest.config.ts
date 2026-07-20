import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "prosemirror-model": path.resolve(__dirname, "node_modules/prosemirror-model/dist/index.js"),
      "prosemirror-transform": path.resolve(__dirname, "node_modules/prosemirror-transform/dist/index.js"),
      "prosemirror-state": path.resolve(__dirname, "node_modules/prosemirror-state/dist/index.js"),
      "prosemirror-view": path.resolve(__dirname, "node_modules/prosemirror-view/dist/index.js"),
      "prosemirror-commands": path.resolve(__dirname, "node_modules/prosemirror-commands/dist/index.js"),
      "prosemirror-keymap": path.resolve(__dirname, "node_modules/prosemirror-keymap/dist/index.js"),
      "prosemirror-schema-list": path.resolve(__dirname, "node_modules/prosemirror-schema-list/dist/index.js"),
      "prosemirror-history": path.resolve(__dirname, "node_modules/prosemirror-history/dist/index.js"),
    },
  },
});