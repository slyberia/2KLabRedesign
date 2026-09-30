import { ATTRIBUTE_CODE, ATTRIBUTES, CODE_ATTRIBUTE, type Attribute } from "./attributes";
import { hasFullRange } from "./presets";
import type { Blueprint, Build } from "./types";

export interface Clamped {
  attribute: Attribute;
  asked: number;
  used: number;
}

export interface DecodedOverrides {
  values: Partial<Record<Attribute, number>>;
  /** Values outside the published range, pulled back into it. Tell the user about each. */
  clamped: Clamped[];
}

/**
 * Parses `a=mid95.tpt93...` for a blueprint. Unknown or malformed parts are ignored. Players
 * and floor-only blueprints ignore `a` entirely.
 */
export function decodeOverrides(param: string | null | undefined, bp: Blueprint): DecodedOverrides {
  const out: DecodedOverrides = { values: {}, clamped: [] };
  if (!param || !hasFullRange(bp)) return out;
  for (const part of param.split(".")) {
    const m = /^([a-z]+)(\d{1,3})$/.exec(part);
    if (!m) continue;
    const attribute = CODE_ATTRIBUTE[m[1]!];
    if (!attribute) continue;
    const [lo, hi] = bp.attributeRange[attribute];
    const asked = Number(m[2]);
    const used = Math.min(hi ?? lo, Math.max(lo, asked));
    if (used !== asked) out.clamped.push({ attribute, asked, used });
    out.values[attribute] = used;
  }
  return out;
}

/** Lists only attributes that differ from the floor, in canonical order. Empty for floor-only blueprints. */
export function encodeOverrides(build: Build, bp: Blueprint): string {
  if (!hasFullRange(bp)) return "";
  return ATTRIBUTES.filter((a) => build.attributes[a] != null && build.attributes[a] !== bp.attributeRange[a][0])
    .map((a) => `${ATTRIBUTE_CODE[a]}${build.attributes[a]}`)
    .join(".");
}

export type PresetRef = { type: "blueprint"; id: string } | { type: "player"; id: number };

export function parsePreset(param: string | null | undefined): PresetRef | null {
  const m = /^(blueprint|player):(.+)$/.exec(param ?? "");
  if (!m) return null;
  if (m[1] === "blueprint") return { type: "blueprint", id: m[2]! };
  const id = Number(m[2]);
  return Number.isInteger(id) ? { type: "player", id } : null;
}

/** Builds the Builder query string, keeping ":" literal so shared links stay readable. */
export function buildShareQuery(preset: PresetRef, a = ""): string {
  const p = new URLSearchParams({ preset: `${preset.type}:${preset.id}` });
  if (a) p.set("a", a);
  return p.toString().replace(/%3A/gi, ":");
}
