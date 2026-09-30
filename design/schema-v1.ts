// NBA2KLab — shared data contract for the Reference Table and the Builder.
// See schema.md for the full rationale and provenance notes. This file is
// the thing both surfaces actually import; schema.md explains why it looks
// like this.

// ============================================================
// 1. Canonical attribute vocabulary — the join key across every dataset
// ============================================================

export type SkillCategory =
  | "Finishing" | "Shooting" | "Playmaking"
  | "Defense" | "Rebounding" | "Physical";

export type AttributeName =
  | "Close Shot" | "Driving Layup" | "Driving Dunk" | "Standing Dunk" | "Post Control"
  | "Mid-Range Shot" | "Three-Point Shot" | "Free Throw"
  | "Pass Accuracy" | "Ball Handle" | "Speed With Ball"
  | "Interior Defense" | "Perimeter Defense" | "Steal" | "Block"
  | "Offensive Rebound" | "Defensive Rebound"
  | "Speed" | "Agility" | "Strength" | "Vertical";

export const ATTRIBUTE_CATEGORY: Record<AttributeName, SkillCategory> = {
  "Close Shot": "Finishing", "Driving Layup": "Finishing", "Driving Dunk": "Finishing",
  "Standing Dunk": "Finishing", "Post Control": "Finishing",
  "Mid-Range Shot": "Shooting", "Three-Point Shot": "Shooting", "Free Throw": "Shooting",
  "Pass Accuracy": "Playmaking", "Ball Handle": "Playmaking", "Speed With Ball": "Playmaking",
  "Interior Defense": "Defense", "Perimeter Defense": "Defense", "Steal": "Defense", "Block": "Defense",
  "Offensive Rebound": "Rebounding", "Defensive Rebound": "Rebounding",
  "Speed": "Physical", "Agility": "Physical", "Strength": "Physical", "Vertical": "Physical",
};

// Player Ratings names this stat "Layup" (no separate standing/driving cap for
// real players). Normalize on read so a Player preset lines up with the enum above.
export const PLAYER_RATINGS_ALIASES: Record<string, AttributeName> = {
  "Layup": "Driving Layup",
};

// ============================================================
// 2. Requirement — two real subtypes (see schema.md §2 for why they differ)
// ============================================================

export type TierOperator = "SINGLE" | "AND" | "OR";
export type BadgeTier = "None" | "Bronze" | "Silver" | "Gold" | "HoF";

export interface TieredCondition {
  attribute: AttributeName;
  // null = 2KLabs' own dataset does not publish this tier as reachable via this
  // condition (real, confirmed case: Unpluckable's Post Control path has no HoF
  // value). Never coerce a null threshold to 0 -- that would make it look free.
  bronze: number | null; silver: number | null; gold: number | null; hof: number | null;
}

export interface TieredRequirement {
  id: string;
  name: string;
  requirementType: "badge" | "takeover";
  category: string;
  operator: TierOperator;
  minHeight: string;
  maxHeight: string;
  conditions: TieredCondition[];       // length 1 (SINGLE) or 2 (AND/OR) — verified, no badge has 3+
  description?: string;
  confidence: "structured" | "scraped";
}

export interface AnimationRequirement {
  id: string;
  animationName: string;
  animationSubtype: "jumper" | "dribble" | "shooting" | "motionStyle" | "finishing";
  packageLabel?: string;
  minHeight: string;
  maxHeight: string;
  thresholds: Partial<Record<AttributeName, number>>;
  // Combination rule across populated thresholds -- NOT uniformly AND.
  // Verified against every row in the crawl (2,595 total):
  //   jumper      -> SINGLE   (always exactly 1 populated field)
  //   dribble     -> SINGLE   (always exactly 1 of 3 populated fields, never 2+)
  //   shooting    -> OR       (mid == three in 420/420 rows -- AND vs OR is
  //                            UNPROVABLE from 2KLabs' own numbers, since the
  //                            two conditions never separate in their data.
  //                            Judgment call, not a measured fact: which rating
  //                            governs a pull-up/go-to/spin/hop jumper depends on
  //                            shot location at release, not a simultaneous
  //                            requirement -- so OR is the game-mechanics-correct
  //                            read. A real Build's mid-range and three-point
  //                            values WILL differ, so this default changes real
  //                            output even though it's invisible in the source table.)
  //   motionStyle -> AND      (352/353 rows populate both agility+speed together --
  //                            a movement-quality package genuinely needs both)
  //   finishing   -> AND      (varied 1-3 field combos; a specific dunk/layup
  //                            package requires its listed physical attributes
  //                            simultaneously to execute)
  operator: "SINGLE" | "AND" | "OR";
  confidence: "structured";
}

// ============================================================
// 3. Preset — Blueprint (archetype, ranged) vs Player (real, fixed)
// ============================================================

export interface BlueprintPreset {
  id: string;
  archetype: string;
  position: "PG" | "SG" | "SF" | "PF" | "C";
  bestSkill: SkillCategory;
  description: string;
  height: string; weight: number; wingspan: string;
  potentialOverall: number;
  comparisons: string[];
  attributeRange: Partial<Record<AttributeName, [number, number]>>;
  precomputedUnlocks?: Partial<Record<SkillCategory, { badge: string; tier: BadgeTier }[]>>;
}

export interface PlayerPreset {
  playerId: number;
  name: string; team: string; position: string; height: number;
  overall: number; potential: string;
  attributes: Partial<Record<AttributeName, number>>;
  extraRatings: Record<string, number>;
}

// ============================================================
// 4. Build — the single mutable state both surfaces derive from
// ============================================================

export interface Build {
  id: string;
  name?: string;
  position: "PG" | "SG" | "SF" | "PF" | "C";
  height: string; weight: number; wingspan: string;
  attributes: Partial<Record<AttributeName, number>>;
  sourcePreset?: { type: "blueprint" | "player"; id: string };
  capMode: "unconstrained" | "blueprint-range";
}

// ============================================================
// 5. Derived views (Tier C) — computed on read, never stored (Tier C)
//
// Height gates BEFORE the attribute check, not beside it. A badge/animation's
// [minHeight, maxHeight] is a hard prerequisite -- a build outside that range
// cannot reach it at ANY attribute value, full stop. This is NOT the same
// question as 2K's real body-driven attribute caps (still out of scope, see
// schema.md history) -- it's a separate, already-published constraint that
// exists as real minHeight/maxHeight fields on every badge and animation
// record. Confirmed non-trivial: 9 distinct height ranges across 53 badges,
// 6-7 distinct ranges per animation subtype, spanning 5'9 to 7'4. Skipping
// this check would silently claim badges/animations are reachable that
// aren't, for any build outside the default full range.
// ============================================================

function heightToInches(h: string): number {
  const [feet, inches] = h.split("'").map(Number);
  return feet * 12 + inches;
}

function isWithinHeightRange(buildHeight: string, minHeight: string, maxHeight: string): boolean {
  const h = heightToInches(buildHeight);
  return h >= heightToInches(minHeight) && h <= heightToInches(maxHeight);
}

const TIER_ORDER: BadgeTier[] = ["HoF", "Gold", "Silver", "Bronze"];

function tierForValue(value: number, c: TieredCondition): BadgeTier {
  // A null threshold means 2KLabs' own dataset does not document that tier as
  // reachable via this condition (e.g. Unpluckable's Post Control path has no
  // published HoF value). Treat as unreachable, never as 0 -- silently
  // defaulting null to 0 would make every build look like it HoFs for free.
  const bound = (x: number | null) => x ?? Infinity;
  if (value >= bound(c.hof)) return "HoF";
  if (value >= bound(c.gold)) return "Gold";
  if (value >= bound(c.silver)) return "Silver";
  if (value >= bound(c.bronze)) return "Bronze";
  return "None";
}

const rank = (t: BadgeTier) => (t === "None" ? 0 : 4 - TIER_ORDER.indexOf(t));

export function getBadgeStatus(
  build: Build,
  req: TieredRequirement
): { tier: BadgeTier; metConditionIndex: number | null } {
  if (!isWithinHeightRange(build.height, req.minHeight, req.maxHeight)) {
    return { tier: "None", metConditionIndex: null };
  }

  const results = req.conditions.map((c) => {
    const v = build.attributes[c.attribute];
    return v == null ? "None" as BadgeTier : tierForValue(v, c);
  });

  if (req.operator === "SINGLE") {
    return { tier: results[0], metConditionIndex: results[0] !== "None" ? 0 : null };
  }
  if (req.operator === "OR") {
    let best = 0, bestIdx = -1;
    results.forEach((t, i) => { if (rank(t) > best) { best = rank(t); bestIdx = i; } });
    return { tier: bestIdx >= 0 ? results[bestIdx] : "None", metConditionIndex: bestIdx >= 0 ? bestIdx : null };
  }
  // AND — the tier reached is the WEAKER of the two conditions
  const weaker = results.reduce((a, b) => (rank(a) <= rank(b) ? a : b));
  return { tier: weaker, metConditionIndex: weaker !== "None" ? 0 : null };
}

export function getAnimationUnlocked(build: Build, req: AnimationRequirement): boolean {
  if (!isWithinHeightRange(build.height, req.minHeight, req.maxHeight)) return false;
  const checks = Object.entries(req.thresholds).map(([attr, min]) => {
    const v = build.attributes[attr as AttributeName];
    return v != null && min != null && v >= min;
  });
  if (checks.length === 0) return false;
  return req.operator === "OR" ? checks.some(Boolean) : checks.every(Boolean);
  // SINGLE and AND both resolve via "every" -- SINGLE only ever has one check.
}

export function diffBuilds(
  a: Build, b: Build, requirements: TieredRequirement[]
): {
  attributeDelta: Partial<Record<AttributeName, number>>;
  unlockDelta: { requirement: string; tierA: BadgeTier; tierB: BadgeTier }[];
} {
  const attrs = new Set([...Object.keys(a.attributes), ...Object.keys(b.attributes)]) as Set<AttributeName>;
  const attributeDelta: Partial<Record<AttributeName, number>> = {};
  attrs.forEach((k) => {
    const d = (b.attributes[k] ?? 0) - (a.attributes[k] ?? 0);
    if (d !== 0) attributeDelta[k] = d;
  });
  const unlockDelta = requirements
    .map((req) => ({
      requirement: req.name,
      tierA: getBadgeStatus(a, req).tier,
      tierB: getBadgeStatus(b, req).tier,
    }))
    .filter((d) => d.tierA !== d.tierB);
  return { attributeDelta, unlockDelta };
}

// ============================================================
// 6. Co-unlock crossing -- the "what moved together" view
//
// A single attribute crossing a single threshold can flip a badge tier AND
// dozens/hundreds of animations at once (verified: Limitless Range Bronze at
// Three-Point Shot 83 co-fires with 655 jumper + 211 shooting-package rows --
// see schema.md). Badges and animations are derived from the same Build via
// two separate functions (§5) for good reason -- they're structurally
// different (tiered+boolean vs. single-threshold+per-subtype-operator, see
// AnimationRequirement above) -- but nothing before this surfaced that they
// share a cause. This function is that surface: hold every other attribute
// constant, move ONE attribute from one value to another, and report every
// requirement AND every animation whose derived status changed as a result.
// This is what the Builder's "what just changed" feed calls on every slider
// commit, and what the Reference Table's "related unlocks" cross-link calls
// for a single requirement's own threshold.
// ============================================================

export function getThresholdCrossings(
  build: Build,
  attribute: AttributeName,
  fromValue: number,
  toValue: number,
  requirements: TieredRequirement[],
  animations: AnimationRequirement[]
): {
  badgeCrossings: { name: string; tierFrom: BadgeTier; tierTo: BadgeTier }[];
  animationCrossings: { animationName: string; subtype: string; from: boolean; to: boolean }[];
} {
  const buildAt = (v: number): Build => ({ ...build, attributes: { ...build.attributes, [attribute]: v } });
  const before = buildAt(fromValue);
  const after = buildAt(toValue);

  const relevantBadges = requirements.filter((r) => r.conditions.some((c) => c.attribute === attribute));
  const badgeCrossings = relevantBadges
    .map((r) => ({
      name: r.name,
      tierFrom: getBadgeStatus(before, r).tier,
      tierTo: getBadgeStatus(after, r).tier,
    }))
    .filter((d) => d.tierFrom !== d.tierTo);

  const relevantAnims = animations.filter((a) => attribute in a.thresholds);
  const animationCrossings = relevantAnims
    .map((a) => ({
      animationName: a.animationName,
      subtype: a.animationSubtype,
      from: getAnimationUnlocked(before, a),
      to: getAnimationUnlocked(after, a),
    }))
    .filter((d) => d.from !== d.to);

  return { badgeCrossings, animationCrossings };
}
