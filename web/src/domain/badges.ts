import type { Attribute } from "./attributes";
import { isWithinHeight } from "./height";
import type { Badge, BadgeCondition, Build, Height, Tier, TierResult } from "./types";

/** Highest first. */
export const TIERS_DESC: readonly Tier[] = ["hof", "gold", "silver", "bronze"];
export const TIER_LABEL: Record<Tier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold", hof: "HoF" };

export function tierRank(t: TierResult): number {
  return t === "none" ? 0 : 4 - TIERS_DESC.indexOf(t);
}

export function atLeast(t: TierResult, min: Tier): boolean {
  return tierRank(t) >= tierRank(min);
}

/** Tier reached by one condition. A `null` threshold is unreachable, never 0. */
export function tierForValue(value: number, cond: BadgeCondition): TierResult {
  for (const t of TIERS_DESC) {
    const threshold = cond[t];
    if (threshold != null && value >= threshold) return t;
  }
  return "none";
}

/** SINGLE: the one condition. OR: best across conditions. AND: weakest. Height is checked first. */
export function badgeTier(badge: Badge, build: Build): TierResult {
  if (!isWithinHeight(build.height, badge.minHeight, badge.maxHeight)) return "none";
  const results = badge.conditions.map((c) => {
    const v = build.attributes[c.attribute];
    return v == null ? "none" : tierForValue(v, c);
  });
  if (results.length === 0) return "none";
  if (badge.operator === "SINGLE") return results[0]!;
  const pick = badge.operator === "OR" ? Math.max : Math.min;
  const r = pick(...results.map(tierRank));
  return r === 0 ? "none" : TIERS_DESC[4 - r]!;
}

export type TierCounts = Record<Tier, number>;

export function countBadgeTiers(badges: readonly Badge[], build: Build): TierCounts {
  const counts: TierCounts = { bronze: 0, silver: 0, gold: 0, hof: 0 };
  for (const b of badges) {
    const t = badgeTier(b, build);
    if (t !== "none") counts[t]++;
  }
  return counts;
}

/** Badges reachable at all at this height (the height gate alone). */
export function badgesAvailableAtHeight(badges: readonly Badge[], height: Height | null): Badge[] {
  return badges.filter((b) => isWithinHeight(height, b.minHeight, b.maxHeight));
}

/** Exact attribute match: "Speed" does not match "Speed With Ball". */
export function badgesKeyedOn(badges: readonly Badge[], attribute: Attribute): Badge[] {
  return badges.filter((b) => b.conditions.some((c) => c.attribute === attribute));
}
