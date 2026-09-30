# NBA2KLab Builder/Requirements — Shared Data Schema

The contract both surfaces read from: the **Reference Table** (fast, static, SEO-facing lookup) and the **Builder** (interactive tool, own page in the tool suite). Neither owns this data — both consume it. If either surface starts encoding logic the other doesn't share, the split has failed and we've rebuilt the live site's fragmentation with nicer styling.

Grounded entirely in the crawl (`/home/claude/builder-data/`). Every field below is marked with where it actually comes from.

---

## Provenance tiers — read this before trusting any field

| Tier | Meaning | Datasets |
|---|---|---|
| **A — Structured, typed** | Embedded JSON (`__NEXT_DATA__`), clean field names, typed values | Badge Requirements, Animation Requirements, Player Ratings, Signature Blueprints |
| **B — Rendered-only** | Real data, visible in the DOM, but not shipped as JSON — reconstructed by parsing `<table>` markup | Takeover Requirements, Build Specializations |
| **C — Derived/computed** | Not stored anywhere; calculated at runtime from Tier A data | Badge unlock status, Potential Overall, comparison diffs |
| **D — External, unverified** | Third-party, different game mode, not validated against our threshold logic | nba2kapi.com (real-player pre-assigned badges) |

Tier B fields carry a `_confidence: "scraped"` marker in the schema below. They should render with a visible "may be outdated" affordance in both surfaces until/unless upgraded to Tier A.

---

## 1. The join key: canonical Attribute enum

Every entity below keys off this exact 20-value set, confirmed identical (modulo one rename) across Badge Requirements, Signature Blueprints, and Player Ratings.

```ts
type SkillCategory =
  | "Finishing" | "Shooting" | "Playmaking"
  | "Defense" | "Rebounding" | "Physical";

// The 20 attributes that badges/animations actually key on.
// (Player Ratings has 21 more real-player-only stats — Post Fade, Draw Foul,
// Vision, etc. — that no badge or animation requirement references. Excluded
// from this enum; carried as extra, inert fields on the Player preset only.)
type AttributeName =
  | "Close Shot" | "Driving Layup" | "Driving Dunk" | "Standing Dunk" | "Post Control"   // Finishing
  | "Mid-Range Shot" | "Three-Point Shot" | "Free Throw"                                  // Shooting
  | "Pass Accuracy" | "Ball Handle" | "Speed With Ball"                                   // Playmaking
  | "Interior Defense" | "Perimeter Defense" | "Steal" | "Block"                          // Defense
  | "Offensive Rebound" | "Defensive Rebound"                                             // Rebounding
  | "Speed" | "Agility" | "Strength" | "Vertical";                                        // Physical

const ATTRIBUTE_CATEGORY: Record<AttributeName, SkillCategory> = { /* 1:1 map, six groups */ };

// Reconciliation note: Player Ratings names this stat "Layup" (real players don't
// have separate standing/driving layup caps). Treat as the same attribute as
// "Driving Layup" when reading a Player preset.
```

This enum is what `--skill-finishing/shooting/playmaking/defense/rebounding/physical` (built for Game Reference) colors. Both surfaces render every attribute through this same six-way palette — that consistency is load-bearing, not decorative.

---

## 2. Requirement — two real subtypes, not one shape forced to fit both

**Badge/Takeover requirements** are tiered with a binary operator. **Animation requirements** are single-threshold with an implicit AND. Confirmed by direct inspection — do not unify these into one interface; it would misrepresent real game logic.

```ts
// ---- Badges & Takeovers (Tier A for badges; Tier B/"scraped" for takeovers) ----
type TierOperator = "SINGLE" | "AND" | "OR";
// SINGLE: one condition, no operator needed (22 of 53 badges)
// AND / OR: exactly two conditions — confirmed no badge has 3+ (31 of 53 badges)

interface TieredRequirement {
  id: string;
  name: string;
  requirementType: "badge" | "takeover";
  category: string;              // e.g. "Outside Scoring", "Inside Scoring", "Defense"
  operator: TierOperator;
  minHeight: string;              // e.g. "5'9"
  maxHeight: string;
  conditions: {
    attribute: AttributeName;
    bronze: number;
    silver: number;
    gold: number;
    hof: number;
  }[];                             // length 1 (SINGLE) or 2 (AND/OR)
  description?: string;            // from Badge Descriptions dataset
  _confidence: "structured" | "scraped";  // "scraped" for every Takeover row
}

// ---- Animations (Tier A) ----
interface AnimationRequirement {
  id: string;
  animationName: string;
  animationSubtype: "jumper" | "dribble" | "shooting" | "motionStyle" | "finishing";
  packageLabel?: string;           // e.g. "Alley-Oops - City Alley-Oops" (finishing only)
  minHeight: string;
  maxHeight: string;
  thresholds: Partial<Record<AttributeName, number>>;
  // ^ implicit AND across every populated key. Sparse — most animations gate
  //   on 1-2 attributes; finishing animations can gate on up to 5.
  _confidence: "structured";
}
```

**Why not one `Requirement` interface for everything:** a badge has four tiers and at most two attributes; an animation has one tier and up to five. Unifying them would mean padding animations with fake Bronze/Silver/Gold fields that don't exist in the game, or padding badges with three unused attribute slots. Two honest shapes, one shared attribute vocabulary.

---

## 3. Preset — two real sources, explicitly not equivalent

```ts
// ---- Signature Blueprint archetype (Tier A) ----
interface BlueprintPreset {
  id: string;                      // e.g. "backcourt-bully"
  archetype: string;               // display name
  position: "PG" | "SG" | "SF" | "PF" | "C";
  bestSkill: SkillCategory;
  description: string;
  height: string; weight: number; wingspan: string;
  potentialOverall: number;
  comparisons: string[];           // real NBA player comps — 2KLabs' own, not ours
  attributeRange: Record<AttributeName, [min: number, max: number]>;
  // ^ NOT a fixed spread. A floor and a ceiling. The Builder's sliders for a
  //   loaded blueprint should default-position at min and allow travel to max —
  //   this IS the slider bound, not something we invent.
  precomputedUnlocks?: {           // present for ~13 of 40 archetypes (unlocksByBuild)
    [category in SkillCategory]?: { badge: string; tier: "Bronze"|"Silver"|"Gold"|"HoF" }[];
  };
}

// ---- Real player (Tier A) ----
interface PlayerPreset {
  playerId: number;
  name: string; team: string; position: string; height: number;
  overall: number; potential: string;
  attributes: Record<AttributeName, number>;   // fixed values, not ranges — real, not archetypal
  extraRatings: Record<string, number>;         // Post Fade, Draw Foul, Vision, etc. — inert for build purposes
}
```

**These are not interchangeable and the UI must not blur them.** A Blueprint is an archetype with a range to explore; a Player is one real person's exact card. Label them differently in the preset picker — "Archetype" vs. "Real Player" — not as two rows in one undifferentiated list.

---

## 4. Build — the one piece of live, mutable state

Everything else in the Builder is derived from this. There is exactly one of these per session (or per saved slot, if we add persistence).

```ts
interface Build {
  id: string;                                  // local/session id, or saved-build id
  name?: string;                                // user-given, only if saved
  position: "PG" | "SG" | "SF" | "PF" | "C";
  height: string; weight: number; wingspan: string;
  attributes: Record<AttributeName, number>;    // 0-99, the ONLY editable state
  sourcePreset?: { type: "blueprint" | "player"; id: string };  // provenance, optional
  capMode: "unconstrained" | "blueprint-range";
  // "unconstrained": free-input, 0-99, explicitly not enforcing 2K's real body-driven
  //   caps (we don't have that formula — see prior turns). Must render a visible
  //   disclosure when active.
  // "blueprint-range": attribute travel is bounded to the loaded blueprint's [min,max].
  //   Still not real 2K caps, but at least grounded in 2KLabs' own published range.
}
```

No `potentialOverall`, no `unlockedBadges` field here — those are Tier C, computed on read, never stored redundantly. Storing a derived value invites it to drift from the attributes that produced it.

---

## 5. Derived views (Tier C) — computed, never stored

```ts
// Given a Build and the full TieredRequirement[] dataset:
function getBadgeStatus(build: Build, req: TieredRequirement): {
  tier: "None" | "Bronze" | "Silver" | "Gold" | "HoF";
  metCondition: number | null;   // which condition index satisfied it (for AND/OR display)
} {
  // SINGLE: check the one condition's thresholds against build.attributes[attr]
  // AND: both conditions must independently clear the same tier
  // OR: either condition clearing a tier is sufficient — take the max
}

function getAnimationUnlocked(build: Build, req: AnimationRequirement): boolean {
  // true iff every populated threshold in req.thresholds is met — pure AND
}

function diffBuilds(a: Build, b: Build): {
  attributeDelta: Partial<Record<AttributeName, number>>;
  unlockDelta: { requirement: string; tierA: string; tierB: string }[];
}
```

`diffBuilds` is the build-vs-build comparison from earlier in this project — a pure function over two `Build` objects and the requirement dataset. No new state, no new schema. This is what "derived state" buys us: comparison isn't a feature we build, it's a function we call.

---

## 6. Validated — not just asserted

The derivation logic in `schema.ts` (§5) was run against the real, resolved `requirements-badges.json` with boundary-pinned synthetic builds, then swept across all 31 multi-attribute badges. Results:

- 8/8 hand-picked boundary tests pass (OR taking the best-qualifying condition, AND taking the weaker, SINGLE resolving directly) — see `validate_schema.py`.
- 0/31 mismatches on a systematic sweep: every AND badge fed "one condition at Gold, one failing" correctly resolves to `None`; every OR badge in the same shape correctly resolves to `Gold`.

**The sweep surfaced one real data gap, not a bug:** `Unpluckable`'s `Post Control` condition has no published HoF threshold in 2KLabs' own dataset (Ball Handle's does — 97 — Post Control's is blank). This is now encoded explicitly: `TieredCondition`'s tier fields are typed `number | null`, and `tierForValue` treats `null` as unreachable (`Infinity`), never as `0`. Silently defaulting a blank to zero would make that HoF tier look free through Post Control alone, which is the opposite of what the source data is saying. `requirements-badges.json` carries this as an explicit `"hof": null`, not an empty string.

This is the kind of edge case that only shows up when you actually run the logic against every real record instead of testing the two examples you happened to look at — which is the point of doing it now, before either surface is built on top of it.

## 6a. Badges and animations move together — a corrected operator, and the feature it unlocks

Stats, badges, and animations are not three independent systems — a single attribute crossing a single threshold can flip a badge tier and a large batch of animations simultaneously, because both are derived from the same number. Verified concretely: **Bronze Limitless Range requires exactly 83 Three-Point Shot.** That same 83 is also the boundary for 655 of 781 jumper animations and 211 of 420 shooting-package animations (cumulative — everything unlocked at or below 83). The *marginal* crossing — moving a build from 82 to 83 — flips Limitless Range from `None` to `Bronze` and exactly 75 animations (40 jumper + 35 shooting) at that specific step, confirmed against an independently computed sanity check.

**This surfaced a real bug in the first draft of this schema, not just a missing feature.** `AnimationRequirement.thresholds` was documented as an implicit AND across every populated attribute. That's correct for `finishing` and `motionStyle` (simultaneous physical requirements — a dunk package genuinely needs Driving Dunk *and* Vertical together) but wrong for `shooting`. Checked directly: `mid` and `three` are numerically identical in **420 of 420** shooting rows, which means 2KLabs' own published data can never distinguish AND from OR for that pair — the two conditions never separate. The correct read is a judgment call grounded in real game mechanics, not something provable from the table: which rating governs a pull-up/go-to/spin/hop jumper depends on *where the shot is taken from*, not a simultaneous requirement. So `shooting` is `OR`. This matters in practice, not just in theory — 2KLabs' test rows always publish matching mid/three values, but a real user's Build will not, so the operator choice changes real derivation output even though it's invisible in the source table.

Verified operator per subtype, checked against every row in the crawl (2,595 total):

| Subtype | Field pattern (verified) | Operator |
|---|---|---|
| `jumper` | always exactly 1 populated field | `SINGLE` |
| `dribble` | always exactly 1 of 3 populated fields | `SINGLE` |
| `shooting` | `mid == three` in 420/420 rows | `OR` (judgment call — see above) |
| `motionStyle` | both fields populated in 352/353 rows | `AND` |
| `finishing` | varied 1–3 field combos | `AND` |

**The feature this unlocks:** `getThresholdCrossings(build, attribute, fromValue, toValue, requirements, animations)` — holds every other attribute constant, moves one attribute by the amount the user just dragged a slider, and returns every badge *and* every animation whose derived status changed as a result, in one call. This is what the Builder's "what just changed" feed calls on every slider commit, and what a Reference Table entry's "related unlocks" cross-link calls for its own threshold. Badges and animations stay two honest, structurally different derivations (§2) — this doesn't merge them — but the moment they move together is now a first-class, queryable thing instead of something a user would only notice by checking two separate pages.

## 7. What's real data vs. representative right now

| Entity | Status |
|---|---|
| Badge Requirements (53 badges, operator resolved) | **Real, complete.** `requirements-badges.json` |
| Animation Requirements (2,595 rows, 5 subtypes) | **Real, complete.** In `animation-requirements.html` `__NEXT_DATA__` |
| Player Ratings (516 players, 41 attrs) | **Real, complete.** |
| Signature Blueprints (40 archetypes, ranges + comps) | **Real, complete.** `unlocksByBuild` covers 13 of 40 — the rest would need live computation via §5. |
| Takeover Requirements | **Real values, Tier B.** Needs one clean scrape pass into this schema's shape; carries `_confidence: "scraped"` permanently unless the API is found. |
| Build Specializations | **Real values, Tier B.** Same treatment. |
| Badge Descriptions | Real (Tier A, separate dataset) — merge into `TieredRequirement.description` by badge name. |

Nothing in this schema is fabricated. Where a field can't be sourced (2K's real body-driven attribute caps), the schema omits it entirely rather than approximating it — that was the scoping decision from three turns ago, now encoded structurally: there is no `attributeCap()` function in this contract, on purpose.

---

## 8. Open decisions before either surface starts

1. **Takeover/Build-Spec scrape pass** — one script, run once, output shaped to `TieredRequirement[]` / a comparable interface. Small, mechanical, not blocking design.
2. **Badge Descriptions merge key** — confirm it joins on badge name cleanly (no casing/punctuation drift) before wiring `description` in.
3. **`unlocksByBuild` gap (13/40 archetypes)** — decide whether the missing 27 get computed live via §5 on page load (cheap, consistent) or left unpopulated with a "compute in Builder" link (simpler, less complete on the reference side).

None of these block starting the Reference Table build — it only needs Badge + Animation Requirements, both fully real. They matter once the Builder or the takeover/spec sections come into scope.
