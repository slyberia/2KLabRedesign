// Local stand-in for Vercel: static files + /api/<name> -> api/<name>.js default.fetch(Request)
import http from "node:http"; import fs from "node:fs/promises"; import path from "node:path";
const ROOT = process.env.SITE_DIR, API = process.env.API_DIR, PORT = +process.env.PORT || 4321;
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" };
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      const mod = await import(path.join(API, url.pathname.slice(5) + ".js"));
      const chunks = []; for await (const c of req) chunks.push(c);
      const r = await mod.default.fetch(new Request(url, { method: req.method, headers: req.headers, body: ["GET","HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) }));
      res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); return;
    }
    let f = path.join(ROOT, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname));
    const data = await fs.readFile(f); res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); res.end(data);
  } catch (e) { res.writeHead(e.code === "ENOENT" || e.code === "ERR_MODULE_NOT_FOUND" ? 404 : 500); res.end(String(e.message)); }
}).listen(PORT, () => console.log("dev on", PORT));
