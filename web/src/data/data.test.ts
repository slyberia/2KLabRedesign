// Dataset invariants from HANDOVER.md section 5. If a data refresh breaks one of these,
// the rules built on it need revisiting before the new data ships.
import { describe, expect, it } from "vitest";
import { ATTRIBUTES, hasFullRange } from "../domain";
import { animations, badges, blueprints, capBreakers, players, specializations, takeovers } from ".";

const countBy = <T,>(xs: readonly T[], key: (x: T) => string) =>
  xs.reduce<Record<string, number>>((acc, x) => ({ ...acc, [key(x)]: (acc[key(x)] ?? 0) + 1 }), {});

describe("datasets", () => {
  it("record counts", () => {
    expect([badges.length, animations.length, blueprints.length, players.length, takeovers.length, specializations.length])
      .toEqual([53, 2503, 40, 516, 24, 6]);
  });

  it("uses only the 21 canonical attribute names", () => {
    const known = new Set<string>(ATTRIBUTES);
    const used = [
      ...badges.flatMap((b) => b.conditions.map((c) => c.attribute)),
      ...animations.flatMap((a) => Object.keys(a.thresholds)),
      ...blueprints.flatMap((b) => Object.keys(b.attributeRange)),
      ...players.flatMap((p) => Object.keys(p.attributes)),
      ...takeovers.flatMap((t) => t.conditions.map((c) => c.attribute)),
      ...specializations.flatMap((s) => s.unlock.flat().map((c) => c.attribute)),
    ];
    expect(used.filter((a) => !known.has(a))).toEqual([]);
  });

  it("no badge has more than 2 conditions", () => {
    expect(Math.max(...badges.map((b) => b.conditions.length))).toBe(2);
  });

  it("animation operator by subtype", () => {
    const bySubtype = countBy(animations, (a) => `${a.subtype}:${a.operator}`);
    expect(bySubtype).toEqual({
      "jumper:SINGLE": 781, "dribble:SINGLE": 775, "shooting:OR": 341, "motionStyle:AND": 353, "finishing:AND": 253,
    });
  });

  it("every blueprint range is a [floor, ceiling] pair for all 21 attributes", () => {
    for (const bp of blueprints) {
      expect(Object.keys(bp.attributeRange).sort()).toEqual([...ATTRIBUTES].sort());
      for (const r of Object.values(bp.attributeRange)) {
        expect(r).toHaveLength(2);
        expect(typeof r[0]).toBe("number");
      }
    }
  });

  it("9 blueprints are full-range; the 31 floor-only ones are exactly those without a potential", () => {
    const full = blueprints.filter(hasFullRange);
    expect(full).toHaveLength(9);
    expect(blueprints.filter((b) => !hasFullRange(b)).map((b) => b.id))
      .toEqual(blueprints.filter((b) => b.potentialOverall == null).map((b) => b.id));
  });

  it("bestSkill has a 7th value, Balanced, on 10 blueprints", () => {
    expect(blueprints.filter((b) => b.bestSkill === "Balanced")).toHaveLength(10);
  });

  it("takeovers: 6 ALWAYS, 10 SINGLE, 6 AND, 2 OR; Muscle is a three-condition AND", () => {
    expect(countBy(takeovers, (t) => t.operator)).toEqual({ ALWAYS: 6, SINGLE: 10, AND: 6, OR: 2 });
    const muscle = takeovers.find((t) => t.name === "Muscle")!;
    expect(muscle.operator).toBe("AND");
    expect(muscle.conditions.map((c) => [c.attribute, c.min])).toEqual([
      ["Offensive Rebound", 80], ["Defensive Rebound", 80], ["Strength", 80],
    ]);
  });

  it("specializations: Defense is (PD & Steal) OR (ID & Block) at 60; Physicals has no requirement; 10 goals each", () => {
    const defense = specializations.find((s) => s.name === "Defense")!;
    expect(defense.unlock).toEqual([
      [{ attribute: "Perimeter Defense", min: 60 }, { attribute: "Steal", min: 60 }],
      [{ attribute: "Interior Defense", min: 60 }, { attribute: "Block", min: 60 }],
    ]);
    expect(specializations.find((s) => s.name === "Physicals")!.unlock).toEqual([]);
    for (const s of specializations) expect(s.goals).toHaveLength(10);
  });

  it("Cap Breakers: 28 across REP 11, Crew 4, Specialization 2, Lifetime 2, Season 9", () => {
    expect(capBreakers.total).toBe(28);
    expect(Object.fromEntries(capBreakers.tracks.map((t) => [t.name, t.stated]))).toEqual({
      "REP Track": 11, "Crew Track": 4, "Build Specialization": 2, "Lifetime Challenges": 2, "Season Track": 9,
    });
  });
});

describe("homepage examples", () => {
  it("the animation preview matches the data", async () => {
    const { HOME_ANIMATION_EXAMPLE: ex } = await import("../pages/home/examples");
    const a = animations.find((x) => x.id === ex.id)!;
    expect(a.animationName).toBe(ex.name);
    expect(a.thresholds).toEqual(ex.thresholds);
    expect(a.operator).toBe("AND");
  });
});

describe("scraped live data", () => {
  it("face creations: 108 players, unique ids, every section present", async () => {
    const { faceCreations: f } = await import("./faceCreations");
    expect(f.players).toHaveLength(108);
    expect(new Set(f.players.map((p) => p.id)).size).toBe(108);
    expect(f.sections).toHaveLength(13);
    for (const p of f.players) {
      expect(["current", "legend"]).toContain(p.category);
      for (const s of f.sections) expect(p.sections[s.key]).toBeDefined();
    }
  });

  it("VC: seven tiers whose stated VC per $1 matches VC / price", async () => {
    const { vcPrices: v } = await import("./vcPrices");
    expect(v.tiers).toHaveLength(7);
    for (const t of v.tiers) expect(t.vcPerDollar).toBe(Math.round(t.vc / t.price));
    expect(v.season1Bundles.map((b) => b.name)).toEqual(["Season 1 MyCAREER", "Season 1 MyTEAM"]);
  });
});
