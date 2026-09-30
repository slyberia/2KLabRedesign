// Reference values from HANDOVER.md section 6. Each was checked against an independent
// recomputation during the static build; the port must reproduce them exactly.
import { describe, expect, it } from "vitest";
import {
  animations, badges, blueprints, capBreakers, crewRewards, lifetimeRewards, repRewards, specializations, takeovers,
} from "../data";
import {
  badgeTier, badgesAvailableAtHeight, badgesKeyedOn, blueprintStartingBuild, buildShareQuery, coUnlocks,
  countBadgeTiers, countUnlockedAnimations, crewRoadmap, decodeOverrides, encodeOverrides, heightFromParam,
  isWithinHeight, lifetimeRoadmap, parsePreset, qualifiesForSpecialization, repRoadmap, takeoverUnlocked,
  tallyCapBreakers, atLeast, type Badge, type Blueprint, type Build,
} from ".";

const badge = (id: string): Badge => badges.find((b) => b.id === id)!;
const blueprint = (id: string): Blueprint => blueprints.find((b) => b.id === id)!;

const limitlessRange = badge("LimitlessRange");
const certifiedBucket = blueprint("certified-bucket");
const cbStart = blueprintStartingBuild(certifiedBucket);

describe("badge thresholds and co-unlocks", () => {
  it("Limitless Range Bronze is Three-Point Shot 83", () => {
    expect(limitlessRange.conditions).toHaveLength(1);
    expect(limitlessRange.conditions[0]).toMatchObject({ attribute: "Three-Point Shot", bronze: 83 });
  });

  it("co-unlocks at Limitless Range Bronze (3PT >= 83), any height: 866", () => {
    expect(coUnlocks(animations, "Three-Point Shot", 83, null)).toHaveLength(866);
  });

  it("same, height filter 6'11: 310", () => {
    expect(coUnlocks(animations, "Three-Point Shot", 83, "6'11")).toHaveLength(310);
  });

  it("co-unlocks at Silver (3PT >= 89), height 6'2: 474", () => {
    expect(limitlessRange.conditions[0]!.silver).toBe(89);
    expect(coUnlocks(animations, "Three-Point Shot", 89, "6'2")).toHaveLength(474);
  });

  it("AND co-unlocks name their other required attributes", () => {
    const partial = coUnlocks(animations, "Three-Point Shot", 99, null).filter((c) => !c.fullyUnlocked);
    for (const c of partial) {
      expect(c.animation.operator).toBe("AND");
      expect(c.otherAttributes.length).toBeGreaterThan(0);
    }
  });
});

describe("height gate", () => {
  it("46 of 53 badges are available at 6'11", () => {
    expect(badges).toHaveLength(53);
    expect(badgesAvailableAtHeight(badges, "6'11")).toHaveLength(46);
  });

  it("Mini Marksman is 5'9-6'4 (excluded at 6'11); Arc Cadence is 5'9-6'11 (included)", () => {
    const mini = badges.find((b) => b.name === "Mini Marksman")!;
    const arc = badges.find((b) => b.name === "Arc Cadence")!;
    expect([mini.minHeight, mini.maxHeight]).toEqual(["5'9", "6'4"]);
    expect([arc.minHeight, arc.maxHeight]).toEqual(["5'9", "6'11"]);
    expect(isWithinHeight("6'11", mini.minHeight, mini.maxHeight)).toBe(false);
    expect(isWithinHeight("6'11", arc.minHeight, arc.maxHeight)).toBe(true);
  });

  it("a badge outside the height range is unreachable at any attribute value", () => {
    const mini = badges.find((b) => b.name === "Mini Marksman")!;
    const maxed: Build = { height: "6'11", attributes: Object.fromEntries(mini.conditions.map((c) => [c.attribute, 99])) };
    expect(badgeTier(mini, maxed)).toBe("none");
  });

  it("parses the URL height form", () => {
    expect(heightFromParam("6-2")).toBe("6'2");
    expect(heightFromParam("6-12")).toBeNull();
    expect(heightFromParam("tall")).toBeNull();
  });
});

describe("Certified Bucket (PG, 6'2)", () => {
  it("Limitless Range at 3PT 89 / 92 / 93 / 95 is Silver / Silver / Gold / Gold", () => {
    const at = (v: number) => badgeTier(limitlessRange, { ...cbStart, attributes: { ...cbStart.attributes, "Three-Point Shot": v } });
    expect(certifiedBucket.attributeRange["Three-Point Shot"]).toEqual([89, 95]);
    expect([89, 92, 93, 95].map(at)).toEqual(["silver", "silver", "gold", "gold"]);
  });

  it("starting build: 1 HoF, 11 Gold, 18 Silver, 2 Bronze; 1,203 animations", () => {
    expect(certifiedBucket.position).toBe("PG");
    expect(cbStart.height).toBe("6'2");
    expect(countBadgeTiers(badges, cbStart)).toEqual({ hof: 1, gold: 11, silver: 18, bronze: 2 });
    expect(countUnlockedAnimations(animations, cbStart)).toBe(1203);
  });

  it("starting build: 12 of 24 takeovers, 12 Gold-or-better badges, 5 of 6 specializations (not Rebounding)", () => {
    expect(takeovers).toHaveLength(24);
    expect(takeovers.filter((t) => takeoverUnlocked(t, cbStart))).toHaveLength(12);
    expect(badges.filter((b) => atLeast(badgeTier(b, cbStart), "gold"))).toHaveLength(12);
    const missed = specializations.filter((s) => !qualifiesForSpecialization(s, cbStart));
    expect(missed.map((s) => s.name)).toEqual(["Rebounding"]);
  });
});

describe("badge tier operators", () => {
  const cond = (attribute: Badge["conditions"][number]["attribute"], t: [number | null, number | null, number | null, number | null]) =>
    ({ attribute, bronze: t[0], silver: t[1], gold: t[2], hof: t[3] });
  const base = { id: "x", name: "x", category: "x", type: "Primary", minHeight: "5'9", maxHeight: "7'4", description: "" } as const;
  const two = [cond("Speed", [60, 70, 80, 90]), cond("Agility", [60, 70, 80, 90])];
  const build: Build = { height: "6'5", attributes: { Speed: 85, Agility: 65 } };

  it("OR takes the best tier, AND the weakest", () => {
    expect(badgeTier({ ...base, operator: "OR", conditions: two }, build)).toBe("gold");
    expect(badgeTier({ ...base, operator: "AND", conditions: two }, build)).toBe("bronze");
  });

  it("a null threshold is unreachable, never 0", () => {
    const b = { ...base, operator: "SINGLE" as const, conditions: [cond("Speed", [60, 70, 80, null])] };
    expect(badgeTier(b, { height: "6'5", attributes: { Speed: 99 } })).toBe("gold");
  });

  it("Unpluckable's Post Control path has no HoF value", () => {
    const post = badge("Unpluckable").conditions.find((c) => c.attribute === "Post Control")!;
    expect(post.hof).toBeNull();
  });
});

describe("exact attribute matching and presets", () => {
  it("badges keyed on Three-Point Shot / on Speed: 6 / 2", () => {
    expect(badgesKeyedOn(badges, "Three-Point Shot")).toHaveLength(6);
    expect(badgesKeyedOn(badges, "Speed")).toHaveLength(2);
  });

  it("8 PG Signature Blueprints", () => {
    expect(blueprints.filter((b) => b.position === "PG")).toHaveLength(8);
  });

  it("14 blueprints unlock Shot Artist at their starting build", () => {
    const shotArtist = takeovers.find((t) => t.id === "ShotArtist")!;
    expect(blueprints.filter((bp) => takeoverUnlocked(shotArtist, blueprintStartingBuild(bp)))).toHaveLength(14);
  });
});

describe("rewards and Cap Breakers", () => {
  const roadmaps = { rep: repRoadmap(repRewards), lifetime: lifetimeRoadmap(lifetimeRewards), crew: crewRoadmap(crewRewards) };

  it("roadmaps have 39 REP levels, 21 Lifetime milestones and 41 Crew levels", () => {
    expect(roadmaps.rep).toHaveLength(39);
    expect(roadmaps.lifetime).toHaveLength(21);
    expect(roadmaps.crew).toHaveLength(41);
  });

  it("REP Veteran IV, Lifetime 250, Crew 30, goal 9, 3 seasons: 15 of 28 (13 free, 2 locked)", () => {
    const rep = roadmaps.rep.findIndex((n) => n.group === "Veteran" && n.label === "IV");
    const lifetime = roadmaps.lifetime.findIndex((n) => n.label === "250");
    const crew = roadmaps.crew.findIndex((n) => n.label === "30");
    expect(rep).toBe(18);
    const tally = tallyCapBreakers({ rep, lifetime, crew, spec9: true, seasons: 3 }, roadmaps, capBreakers);
    expect(tally).toEqual({ rep: 6, lifetime: 1, crew: 3, specialization: 2, season: 3, total: 15, free: 13, locked: 2, of: 28 });
  });

  it("nothing set: 0 of 28", () => {
    expect(tallyCapBreakers({ rep: null, lifetime: null, crew: null, spec9: false, seasons: 0 }, roadmaps, capBreakers).total).toBe(0);
  });

  it("every track at its end reaches all 28", () => {
    const end = (n: readonly unknown[]) => n.length - 1;
    const all = tallyCapBreakers(
      { rep: end(roadmaps.rep), lifetime: end(roadmaps.lifetime), crew: end(roadmaps.crew), spec9: true, seasons: 9 },
      roadmaps, capBreakers,
    );
    expect(all).toMatchObject({ total: 28, free: 26, locked: 2 });
  });
});

describe("share links", () => {
  it("tpt99.mid10.swb07 on Certified Bucket clamps tpt->95, mid->93 (floor, dropped), swb->86 (floor), each reported", () => {
    const d = decodeOverrides("tpt99.mid10.swb07", certifiedBucket);
    expect(d.values).toEqual({ "Three-Point Shot": 95, "Mid-Range Shot": 93, "Speed With Ball": 86 });
    expect(d.clamped).toEqual([
      { attribute: "Three-Point Shot", asked: 99, used: 95 },
      { attribute: "Mid-Range Shot", asked: 10, used: 93 },
      { attribute: "Speed With Ball", asked: 7, used: 86 },
    ]);
    const build = { ...cbStart, attributes: { ...cbStart.attributes, ...d.values } };
    expect(encodeOverrides(build, certifiedBucket)).toBe("tpt95");
  });

  it("encodes in canonical order and round-trips", () => {
    const build = { ...cbStart, attributes: { ...cbStart.attributes, "Speed": 90, "Mid-Range Shot": 95, "Ball Handle": 92, "Three-Point Shot": 93 } };
    const a = encodeOverrides(build, certifiedBucket);
    expect(a).toBe("mid95.tpt93.bh92.spd90");
    expect(decodeOverrides(a, certifiedBucket)).toEqual({
      values: { "Mid-Range Shot": 95, "Three-Point Shot": 93, "Ball Handle": 92, "Speed": 90 },
      clamped: [],
    });
    expect(buildShareQuery({ type: "blueprint", id: "certified-bucket" }, a)).toBe("preset=blueprint:certified-bucket&a=mid95.tpt93.bh92.spd90");
  });

  it("ignores unknown or malformed parts", () => {
    expect(decodeOverrides("xyz90.tpt.93mid.TPT90..bh90", certifiedBucket).values).toEqual({ "Ball Handle": 90 });
  });

  it("floor-only blueprints ignore a", () => {
    const floorOnly = blueprints.find((b) => b.potentialOverall == null)!;
    expect(decodeOverrides("tpt99", floorOnly)).toEqual({ values: {}, clamped: [] });
  });

  it("parses preset references", () => {
    expect(parsePreset("blueprint:certified-bucket")).toEqual({ type: "blueprint", id: "certified-bucket" });
    expect(parsePreset("player:1")).toEqual({ type: "player", id: 1 });
    expect(parsePreset("player:abc")).toBeNull();
    expect(parsePreset("team:1")).toBeNull();
  });
});
