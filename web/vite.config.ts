/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Datasets live in the repo-level data/ folder (shared with the legacy build and HANDOVER.md);
// the app imports them through the @data alias rather than keeping a copy.
const dataDir = fileURLToPath(new URL("../data", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@data": dataDir } },
  server: {
    fs: { allow: [".", dataDir] },
    // The Vercel Functions in ../api are served by `vercel dev`; point the proxy there when needed.
    proxy: { "/api": "http://localhost:3000" },
  },
  test: { include: ["src/**/*.test.ts"] },
});
