/// <reference types="vitest/config" />
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Readable } from "node:stream";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Datasets live in the repo-level data/ folder (shared with the legacy build and HANDOVER.md);
// the app imports them through the @data alias rather than keeping a copy.
const dataDir = here("../data");

// One HTML entry per page. Pages are served at clean URLs (/builder, not /builder.html); the
// query strings and hashes from HANDOVER.md section 8 are unchanged.
const PAGES = ["index", "builds", "builder", "reference-table", "mycareer", "shooting", "game-details"];

/**
 * Clean URLs in dev and preview, matching `cleanUrls` in ../vercel.json: /builder serves
 * builder.html, and old links to /builder.html (or /index.html) redirect to the clean path with
 * their query string kept. The hash never reaches the server; the browser keeps it across the redirect.
 */
function cleanUrls(): Plugin {
  const attach = (middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void }) => {
    middlewares.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      const [path, query = ""] = (req.url as string).split(/\?(.*)/s);
      const qs = query ? `?${query}` : "";
      const html = /^\/([a-z-]+)\.html$/.exec(path!);
      if (html && PAGES.includes(html[1]!)) {
        res.statusCode = 308;
        res.setHeader("Location", `${html[1] === "index" ? "/" : `/${html[1]}`}${qs}`);
        return res.end();
      }
      const clean = /^\/([a-z-]+)\/?$/.exec(path!);
      if (clean && clean[1] !== "index" && PAGES.includes(clean[1]!)) req.url = `/${clean[1]}.html${qs}`;
      next();
    });
  };
  return {
    name: "clean-urls",
    configureServer: (server) => attach(server.middlewares),
    configurePreviewServer: (server) => attach(server.middlewares),
  };
}

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

/**
 * Preview only: send the response headers from ../vercel.json (CSP, X-Robots-Tag, ...), so the browser
 * tests run under the same policy production will. Not in dev, where Vite injects inline scripts.
 */
function vercelHeaders(): Plugin {
  const rules = (JSON.parse(readFileSync(here("../vercel.json"), "utf8")).headers ?? []) as { source: string; headers: { key: string; value: string }[] }[];
  const compiled = rules.map((r) => ({ re: new RegExp(`^${r.source.replace(/\(\.\*\)/g, ".*")}$`), headers: r.headers }));
  return {
    name: "vercel-headers",
    configurePreviewServer: (server) => {
      server.middlewares.use((req: any, res: any, next: () => void) => {
        const path = String(req.url).split("?")[0];
        for (const r of compiled) if (r.re.test(path)) for (const h of r.headers) res.setHeader(h.key, h.value);
        next();
      });
    },
  };
}

export default defineConfig({
  // multi-page: unknown paths are 404s, not a fallback to the homepage
  appType: "mpa",
  plugins: [react(), vercelHeaders(), cleanUrls(), localApi()],
  resolve: { alias: { "@data": dataDir } },
  server: { fs: { allow: [".", dataDir] } },
  build: {
    rolldownOptions: { input: Object.fromEntries(PAGES.map((p) => [p, here(`./${p}.html`)])) },
    // Builder and Requirements carry the animation list (2,503 rows); split into shared chunks.
    chunkSizeWarningLimit: 700,
  },
  test: { include: ["src/**/*.test.ts", "test/**/*.test.mjs"] },
});
