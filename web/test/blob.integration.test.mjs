// Hardening item 2 (HANDOVER.md section 13): lib/store.js against a REAL private Vercel Blob store.
// Skipped unless BLOB_READ_WRITE_TOKEN is set, which only happens once a Blob store exists
// (the project isn't deployed yet). Run with: BLOB_READ_WRITE_TOKEN=... npm test
import { afterAll, describe, expect, it } from "vitest";

const token = process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.STORE_DIR; // always the Blob adapter here, never the local folder
const prefix = `itest/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe.skipIf(!token)("lib/store.js on a real Blob store", () => {
  afterAll(async () => {
    const { list, del } = await import("@vercel/blob");
    const { blobs } = await list({ prefix });
    if (blobs.length) await del(blobs.map((b) => b.url));
  });

  it("reads a missing path as null", async () => {
    const { store } = await import("../../lib/store.js");
    expect(await (await store()).read(`${prefix}/missing.json`)).toBeNull();
  });

  it("reads its own write back immediately, with an ETag", async () => {
    const { store } = await import("../../lib/store.js");
    const s = await store();
    await s.write(`${prefix}/a.json`, { n: 1 });
    const r = await s.read(`${prefix}/a.json`);
    expect(r?.data).toEqual({ n: 1 });
    expect(typeof r?.etag).toBe("string");
  });

  it("refuses a write against a stale ETag", async () => {
    const { store, Conflict } = await import("../../lib/store.js");
    const s = await store();
    await s.write(`${prefix}/b.json`, { n: 1 });
    const first = await s.read(`${prefix}/b.json`);
    await s.write(`${prefix}/b.json`, { n: 2 }, first.etag);
    await expect(s.write(`${prefix}/b.json`, { n: 3 }, first.etag)).rejects.toBeInstanceOf(Conflict);
  });

  it("keeps all 12 concurrent read-change-write updates", async () => {
    const { update, store } = await import("../../lib/store.js");
    const path = `${prefix}/ratings.json`;
    await Promise.all(Array.from({ length: 12 }, (_, i) => update(path, { votes: {} }, (d) => { d.votes[`u${i}`] = 1 + (i % 5); })));
    expect(Object.keys((await (await store()).read(path)).data.votes)).toHaveLength(12);
  }, 60_000);
});
