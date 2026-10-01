// Storage adapter. On Vercel: a private Blob store. In local tests: a folder (STORE_DIR).
// Every write can be conditional on the ETag read, so concurrent edits never silently overwrite each other.
import { createHash } from "node:crypto";

export class Conflict extends Error {}

async function blobStore() {
  const { get, put, BlobNotFoundError, BlobPreconditionFailedError, BlobServiceRateLimited, BlobServiceNotAvailable } = await import("@vercel/blob");
  // Rate limits and outages are temporary: answer 503 with a clear message instead of a generic 500.
  const unavailable = (e) => {
    if (e instanceof BlobServiceRateLimited || e instanceof BlobServiceNotAvailable) {
      throw Object.assign(new Error("Storage is busy right now. Please try again in a moment."), { status: 503, retryAfter: e.retryAfter });
    }
    throw e;
  };
  return {
    async read(path) {
      // A missing file may come back as null/404 or as BlobNotFoundError depending on the SDK path; both mean "not there".
      const r = await get(path, { access: "private", useCache: false }).catch((e) => (e instanceof BlobNotFoundError ? null : unavailable(e)));
      if (!r || r.statusCode === 404 || !r.stream) return null;
      const text = await new Response(r.stream).text();
      return { data: JSON.parse(text), etag: r.blob.etag };
    },
    async write(path, data, etag) {
      try {
        const opts = { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true };
        if (etag) opts.ifMatch = etag;
        await put(path, JSON.stringify(data), opts);
      } catch (e) {
        if (e instanceof BlobPreconditionFailedError) throw new Conflict("changed since read");
        unavailable(e);
      }
    },
  };
}

const locks = new Map();
async function folderStore(dir) {
  const fs = await import("node:fs/promises");
  const p = (x) => `${dir}/${x.replace(/\//g, "__")}`;
  const tag = (t) => createHash("sha1").update(t).digest("hex");
  return {
    async read(path) {
      try { const t = await fs.readFile(p(path), "utf8"); return { data: JSON.parse(t), etag: tag(t) }; }
      catch (e) { if (e.code === "ENOENT") return null; throw e; }
    },
    // Matches Blob's server-side ifMatch: the ETag check and the write happen as one step (per-path lock),
    // and the file is replaced atomically (write temp, rename) so a reader never sees a half-written file.
    async write(path, data, etag) {
      const prev = locks.get(path) || Promise.resolve();
      let release; const mine = new Promise((r) => (release = r));
      locks.set(path, prev.then(() => mine));
      await prev;
      try {
        if (etag) { const cur = await this.read(path); if (!cur || cur.etag !== etag) throw new Conflict("changed since read"); }
        await fs.mkdir(dir, { recursive: true });
        const tmp = p(path) + "." + process.pid + "." + Math.random().toString(36).slice(2);
        await fs.writeFile(tmp, JSON.stringify(data)); await fs.rename(tmp, p(path));
      } finally { release(); }
    },
  };
}

let _store;
export async function store() {
  if (!_store) _store = process.env.STORE_DIR ? await folderStore(process.env.STORE_DIR) : await blobStore();
  return _store;
}

// read -> change -> conditional write, retried on conflict
export async function update(path, fallback, change, tries = 10) {
  const s = await store();
  for (let i = 0; i < tries; i++) {
    const cur = await s.read(path);
    const data = cur ? cur.data : structuredClone(fallback);
    const result = await change(data);
    if (result === false) return data;            // no write needed
    try { await s.write(path, data, cur ? cur.etag : undefined); return data; }
    catch (e) {
      if (!(e instanceof Conflict)) throw e;
      if (i === tries - 1) throw Object.assign(new Error("Busy, please try again"), { status: 503 });
      await new Promise((r) => setTimeout(r, 20 + Math.random() * 60 * (i + 1)));   // jittered backoff before re-reading
    }
  }
}
