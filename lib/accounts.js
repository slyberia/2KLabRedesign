import { randomUUID } from "node:crypto";
import { store, update } from "./store.js";
import { readSession } from "./http.js";
import { BLUEPRINTS } from "./blueprints.js";

const err = (status, message) => Object.assign(new Error(message), { status });

// ---- demo accounts: name only, no password (stated on the sign-in screen) ----
export function slugFor(name) {
  const n = String(name || "").trim().replace(/\s+/g, " ");
  if (!/^[A-Za-z0-9 _-]{2,20}$/.test(n)) throw err(400, "Name must be 2-20 letters, numbers, spaces, - or _");
  return { display: n, slug: n.toLowerCase().replace(/ /g, "-") };
}
export const accountPath = (id) => `accounts/${id}.json`;
export async function getAccount(id) { const r = await (await store()).read(accountPath(id)); return r ? r.data : null; }
export async function requireUser(request) {
  const s = readSession(request); if (!s) throw err(401, "Sign in first");
  const a = await getAccount(s.id); if (!a) throw err(401, "Sign in first");
  return a;
}
export const publicUser = (a) => ({ id: a.id, name: a.name, premium: !!a.premium });

// ---- progress: whitelisted keys, each validated; stored as {v, at} so merges can take the newer value ----
const int = (lo, hi) => (v) => v === null || (Number.isInteger(v) && v >= lo && v <= hi);
const VALID = {
  rep: int(0, 38),        // 39 REP levels (Rookie II .. Legend VIII)
  lifetime: int(0, 20),   // 21 Lifetime Challenge milestones
  crew: int(0, 40),       // 41 Crew levels
  seasons: (v) => Number.isInteger(v) && v >= 0 && v <= 9,
  spec9: (v) => typeof v === "boolean",
  starter: (v) => v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length <= 21 &&
    Object.entries(v).every(([k, x]) => /^[0-5]\.\d{1,2}$/.test(k) && typeof x === "boolean"),
};
export function mergeProgress(server, incoming) {
  if (!incoming || typeof incoming !== "object") throw err(400, "progress must be an object");
  const now = Date.now(); let changed = false;
  for (const [k, entry] of Object.entries(incoming)) {
    if (!VALID[k]) throw err(400, `Unknown progress key: ${k}`);
    if (!entry || typeof entry !== "object" || !("v" in entry)) throw err(400, `Bad entry for ${k}`);
    if (!VALID[k](entry.v)) throw err(400, `Invalid value for ${k}`);
    const at = Math.min(Number(entry.at) || 0, now + 60000);
    if (!server[k] || at > server[k].at) { server[k] = { v: entry.v, at }; changed = true; }
  }
  return changed;
}

// ---- builds: same share format as the Builder (?preset=...&a=...), re-validated here ----
const CODE_ATTR = { cls: "Close Shot", lay: "Driving Layup", dnk: "Driving Dunk", sdk: "Standing Dunk", pst: "Post Control",
  mid: "Mid-Range Shot", tpt: "Three-Point Shot", ft: "Free Throw", pas: "Pass Accuracy", bh: "Ball Handle", swb: "Speed With Ball",
  id: "Interior Defense", pd: "Perimeter Defense", stl: "Steal", blk: "Block", orb: "Offensive Rebound", drb: "Defensive Rebound",
  spd: "Speed", agl: "Agility", str: "Strength", vrt: "Vertical" };
const ATTR_CODE = Object.fromEntries(Object.entries(CODE_ATTR).map(([c, a]) => [a, c]));
export function normalizeBuild(input) {
  const name = String(input.name || "").trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 40) throw err(400, "Build name must be 1-40 characters");
  const m = /^(blueprint|player):([a-z0-9-]{1,40})$/.exec(String(input.preset || ""));
  if (!m) throw err(400, "Unknown preset");
  let a = "";
  if (m[1] === "blueprint") {
    const bp = BLUEPRINTS[m[2]]; if (!bp) throw err(400, "Unknown blueprint");
    const editable = Object.values(bp.range).every(([, max]) => max != null);
    if (editable && input.a) {
      const vals = {};
      for (const part of String(input.a).split(".")) {
        const p = /^([a-z]+)(\d{1,3})$/.exec(part); if (!p || !CODE_ATTR[p[1]]) continue;
        const attr = CODE_ATTR[p[1]], [lo, hi] = bp.range[attr];
        vals[attr] = Math.min(hi, Math.max(lo, +p[2]));           // clamp to the published range
      }
      a = Object.keys(ATTR_CODE).filter((k) => vals[k] != null && vals[k] !== bp.range[k][0]).map((k) => ATTR_CODE[k] + vals[k]).join(".");
    }
    return { name, preset: `blueprint:${m[2]}`, a, archetype: bp.archetype, position: bp.position };
  }
  if (!/^\d{1,9}$/.test(m[2])) throw err(400, "Unknown player");
  return { name, preset: `player:${m[2]}`, a: "", archetype: null, position: null };
}
export const newId = () => randomUUID().slice(0, 12);
export { update, err };
