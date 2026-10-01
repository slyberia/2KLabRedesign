// Sessions (signed cookie), JSON helpers, validation. Demo accounts only: see /api/session.
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "nba2klab_demo";
const MAX_BODY = 16 * 1024;
/** Sessions last 30 days, enforced on the server from the signed issue time, not only by the cookie's Max-Age. */
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET missing or too short");
  return s;
}
const b64 = (s) => Buffer.from(s).toString("base64url");
const sign = (v) => createHmac("sha256", secret()).update(v).digest("base64url");

export function makeSession(user) {
  const v = b64(JSON.stringify({ id: user.id, iat: Date.now() }));
  return `${v}.${sign(v)}`;
}
export function readSession(request) {
  const raw = (request.headers.get("cookie") || "").split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!raw) return null;
  const [v, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!v || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(sign(v));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let data;
  try { data = JSON.parse(Buffer.from(v, "base64url").toString()); } catch { return null; }
  const age = Date.now() - Number(data && data.iat);
  if (!Number.isFinite(age) || age < -60_000 || age > SESSION_MAX_AGE_S * 1000) return null;   // expired, or issued in the future
  return data;
}
export function cookieHeader(value, maxAge) {
  const secure = process.env.STORE_DIR ? "" : "; Secure";   // local tests run over http
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
export const fail = (status, error) => json({ error }, status);

export async function body(request) {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > MAX_BODY) throw Object.assign(new Error("Request too large"), { status: 413 });
  const text = await request.text();
  if (text.length > MAX_BODY) throw Object.assign(new Error("Request too large"), { status: 413 });
  try { return text ? JSON.parse(text) : {}; } catch { throw Object.assign(new Error("Invalid JSON"), { status: 400 }); }
}

// Same-origin guard for writes (cookie auth + SameSite=Lax is most of CSRF protection; this closes the rest).
// Browsers always send Origin on POST, PUT and DELETE, so a write without one is refused.
export function sameOrigin(request) {
  const o = request.headers.get("origin");
  if (!o) return false;
  try { return new URL(o).host === new URL(request.url).host; } catch { return false; }
}
const isJson = (request) => /^application\/json\b/i.test(request.headers.get("content-type") || "");

export function handle(routes) {
  return {
    async fetch(request) {
      try {
        const fn = routes[request.method];
        if (!fn) return fail(405, "Method not allowed");
        if (request.method !== "GET" && request.method !== "HEAD") {
          if (!sameOrigin(request)) return fail(403, "Cross-origin request refused");
          if ((request.method === "POST" || request.method === "PUT") && !isJson(request)) return fail(415, "Send JSON (Content-Type: application/json)");
        }
        return await fn(request);
      } catch (e) {
        if (e.status) return json({ error: e.message }, e.status, e.retryAfter ? { "retry-after": String(e.retryAfter) } : {});
        console.error(e);
        return fail(500, "Server error");
      }
    },
  };
}
