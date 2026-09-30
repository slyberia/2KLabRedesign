/// <reference types="vitest/config" />
import { randomBytes } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Readable } from "node:stream";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Datasets live in the repo-level data/ folder (shared with the legacy build and HANDOVER.md);
// the app imports them through the @data alias rather than keeping a copy.
const dataDir = here("../data");

// One HTML entry per page, named like the static site's files so every URL, hash and deep link
// (HANDOVER.md section 8) keeps working unchanged.
const PAGES = ["index", "builds", "builder", "reference-table", "mycareer", "shooting", "game-details"];

/**
 * Dev and preview only: serves /api/* from the Vercel Functions in ../api, backed by a local
 * folder store (lib/store.js's STORE_DIR mode), so demo accounts work without `vercel dev`.
 * Never part of the production build.
 */
function localApi(): Plugin {
  const attach = (middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void }) => {
    process.env.STORE_DIR ??= here("./.dev-store");
    process.env.SESSION_SECRET ??= randomBytes(32).toString("hex");
    middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith("/api/")) return next();
      const url = new URL(req.url, `http://${req.headers.host}`);
      const name = url.pathname.slice(5);
      if (!/^[a-z]+$/.test(name)) { res.statusCode = 404; return res.end(); }
      try {
        const mod = await import(pathToFileURL(here(`../api/${name}.js`)).href);
        const hasBody = !["GET", "HEAD"].includes(req.method);
        const request = new Request(url, {
          method: req.method,
          headers: req.headers,
          body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
          duplex: "half", // required by Node's fetch for streamed bodies
        } as RequestInit);
        const r: Response = await mod.default.fetch(request);
        res.statusCode = r.status;
        r.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(Buffer.from(await r.arrayBuffer()));
      } catch (e) {
        res.statusCode = (e as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND" ? 404 : 500;
        res.end(String((e as Error).message));
      }
    });
  };
  return {
    name: "local-api",
    configureServer: (server) => attach(server.middlewares),
    configurePreviewServer: (server) => attach(server.middlewares),
  };
}

export default defineConfig({
  plugins: [react(), localApi()],
  resolve: { alias: { "@data": dataDir } },
  server: { fs: { allow: [".", dataDir] } },
  build: {
    rolldownOptions: { input: Object.fromEntries(PAGES.map((p) => [p, here(`./${p}.html`)])) },
    // Builder and Requirements carry the animation list (2,503 rows); split into shared chunks.
    chunkSizeWarningLimit: 700,
  },
  test: { include: ["src/**/*.test.ts"] },
});
