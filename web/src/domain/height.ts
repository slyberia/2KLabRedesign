import type { Height } from "./types";

export function heightToInches(h: Height): number {
  const [feet = 0, inches = 0] = h.split("'").map(Number);
  return feet * 12 + inches;
}

/**
 * Height gate: outside [min, max] (inclusive, compared in inches) a badge or animation is
 * unreachable at any attribute value. `null` height means "any height" (no filter).
 */
export function isWithinHeight(height: Height | null, min: Height, max: Height): boolean {
  if (height == null) return true;
  const h = heightToInches(height);
  return h >= heightToInches(min) && h <= heightToInches(max);
}

/** URL form: 6'2 -> "6-2". */
export const heightToParam = (h: Height): string => h.replace("'", "-");

/** Parses the URL form "6-2" (or "6'2"); returns null when malformed. */
export function heightFromParam(s: string): Height | null {
  const m = /^(\d)['-](\d{1,2})$/.exec(s);
  if (!m) return null;
  const inches = Number(m[2]);
  return inches <= 11 ? (`${m[1]}'${inches}` as Height) : null;
}
