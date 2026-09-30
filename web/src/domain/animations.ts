import type { Attribute } from "./attributes";
import { isWithinHeight } from "./height";
import type { Animation, Build, Height } from "./types";

export function animationUnlocked(anim: Animation, build: Build): boolean {
  if (!isWithinHeight(build.height, anim.minHeight, anim.maxHeight)) return false;
  const checks = (Object.entries(anim.thresholds) as [Attribute, number][]).map(([attr, min]) => {
    const v = build.attributes[attr];
    return v != null && v >= min;
  });
  if (checks.length === 0) return false;
  return anim.operator === "OR" ? checks.some(Boolean) : checks.every(Boolean);
}

export function countUnlockedAnimations(animations: readonly Animation[], build: Build): number {
  return animations.reduce((n, a) => n + (animationUnlocked(a, build) ? 1 : 0), 0);
}

export interface CoUnlock {
  animation: Animation;
  /** False for an AND animation that also needs other attributes. */
  fullyUnlocked: boolean;
  /** The other attributes an AND animation requires. */
  otherAttributes: Attribute[];
}

/**
 * Co-unlocks for a badge tier at attribute value `value`: every animation within the height
 * filter whose threshold on the same attribute is <= value. `height: null` = any height.
 */
export function coUnlocks(
  animations: readonly Animation[],
  attribute: Attribute,
  value: number,
  height: Height | null,
): CoUnlock[] {
  const out: CoUnlock[] = [];
  for (const a of animations) {
    if (!isWithinHeight(height, a.minHeight, a.maxHeight)) continue;
    const t = a.thresholds[attribute];
    if (t == null || t > value) continue;
    const otherAttributes = (Object.keys(a.thresholds) as Attribute[]).filter((k) => k !== attribute);
    out.push({ animation: a, fullyUnlocked: a.operator !== "AND" || otherAttributes.length === 0, otherAttributes });
  }
  return out;
}
