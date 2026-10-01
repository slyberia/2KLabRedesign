// The Vercel Functions in ../api, called directly with web-standard Requests against a temporary
// local store (lib/store.js's STORE_DIR mode). Covers the HANDOVER.md section 13 hardening rules.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "nba2klab-api-"));
process.env.STORE_DIR = dir;
process.env.SESSION_SECRET = "s".repeat(48);
const ORIGIN = "http://lab.test";

let session, progress, builds, http;
beforeAll(async () => {
  session = (await import("../../api/session.js")).default;
  progress = (await import("../../api/progress.js")).default;
  builds = (await import("../../api/builds.js")).default;
  http = await import("../../lib/http.js");
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const call = (handler, method, path, { body, cookie, origin = ORIGIN, type = "application/json" } = {}) => {
  const headers = {};
  if (origin) headers.origin = origin;
  if (cookie) headers.cookie = cookie;
  if (body !== undefined && type) headers["content-type"] = type;
  return handler.fetch(new Request(ORIGIN + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
};
const signIn = async (name, premium = false) => {
  const r = await call(session, "POST", "/api/session", { body: { name, premium } });
  return { r, cookie: (r.headers.get("set-cookie") || "").split(";")[0], data: await r.json() };
};
/** A session cookie signed like lib/http.js does, with a chosen issue time. */
const cookieWithIat = (id, iat) => {
  const v = Buffer.from(JSON.stringify({ id, iat })).toString("base64url");
  return `nba2klab_demo=${v}.${createHmac("sha256", process.env.SESSION_SECRET).update(v).digest("base64url")}`;
};

describe("sessions", () => {
  it("signs in and reads the session back", async () => {
    const { r, cookie } = await signIn("Ada Lovelace");
    expect(r.status).toBe(200);
    expect(r.headers.get("set-cookie")).toMatch(/Max-Age=2592000/);
    const me = await (await call(session, "GET", "/api/session", { cookie, origin: null })).json();
    expect(me.user).toMatchObject({ id: "ada-lovelace", name: "Ada Lovelace" });
  });

  it("refuses a session older than 30 days, even with a valid signature", async () => {
    await signIn("Old Timer");
    const fresh = cookieWithIat("old-timer", Date.now() - 29 * 864e5);
    const stale = cookieWithIat("old-timer", Date.now() - 31 * 864e5);
    const future = cookieWithIat("old-timer", Date.now() + 864e5);
    const who = async (cookie) => (await (await call(session, "GET", "/api/session", { cookie, origin: null })).json()).user;
    expect(await who(fresh)).toMatchObject({ id: "old-timer" });
    expect(await who(stale)).toBeNull();
    expect(await who(future)).toBeNull();
    expect((await call(progress, "GET", "/api/progress", { cookie: stale, origin: null })).status).toBe(401);
  });

  it("names that only differ in capitals, spaces or hyphens don't silently share an account", async () => {
    expect((await signIn("Test User")).r.status).toBe(200);
    for (const variant of ["test user", "test-user", "TEST  USER"]) {
      const { r, data } = await signIn(variant);
      expect(r.status).toBe(409);
      expect(data.error).toContain("“Test User”");
    }
    expect((await signIn("Test User")).r.status).toBe(200);
  });
});

describe("writes", () => {
  it("require a matching Origin header", async () => {
    const body = { name: "No Origin" };
    expect((await call(session, "POST", "/api/session", { body, origin: null })).status).toBe(403);
    expect((await call(session, "POST", "/api/session", { body, origin: "https://evil.test" })).status).toBe(403);
    expect((await call(session, "DELETE", "/api/session", { origin: null })).status).toBe(403);
    expect((await call(session, "POST", "/api/session", { body })).status).toBe(200);
  });

  it("require JSON for POST and PUT", async () => {
    const { cookie } = await signIn("Json Only");
    const r = await call(session, "POST", "/api/session", { body: { name: "Json Only" }, type: "text/plain" });
    expect(r.status).toBe(415);
    expect((await call(progress, "PUT", "/api/progress", { cookie, body: { progress: {} }, type: null })).status).toBe(415);
    expect((await call(progress, "PUT", "/api/progress", { cookie, body: { progress: { rep: { v: 3, at: Date.now() } } } })).status).toBe(200);
  });

  it("GET needs no Origin", async () => {
    const { cookie } = await signIn("Reader");
    expect((await call(builds, "GET", "/api/builds", { cookie, origin: null })).status).toBe(200);
  });
});

describe("errors", () => {
  it("a status-carrying error becomes that status, with Retry-After when given", async () => {
    const h = http.handle({ async GET() { throw Object.assign(new Error("Storage is busy"), { status: 503, retryAfter: 7 }); } });
    const r = await h.fetch(new Request(ORIGIN + "/api/x"));
    expect(r.status).toBe(503);
    expect(r.headers.get("retry-after")).toBe("7");
    expect(await r.json()).toEqual({ error: "Storage is busy" });
  });
});
