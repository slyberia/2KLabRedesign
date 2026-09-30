import type { CapBreakers, CrewRewards, LifetimeRewards, RepRewards } from "./types";

/** "1 Cap Breaker", "2 Cap Breakers", "+1 Cap Breaker", "Cap Breaker" -> count. */
export function capBreakersIn(lines: readonly string[]): number {
  let n = 0;
  for (const r of lines) {
    const m = /(\d+)\s*Cap Breakers?/i.exec(r);
    if (m) n += Number(m[1]);
    else if (/Cap Breaker/i.test(r)) n += 1;
  }
  return n;
}

export interface RoadmapNode {
  group: string;
  label: string;
  rewards: string[];
  capBreakers: number;
  /** "Coming Season 2" and similar: listed but not yet available. */
  pending: boolean;
}

/** REP: 39 levels, index 0 (Rookie II) to 38 (Legend VIII). */
export const repRoadmap = (d: RepRewards): RoadmapNode[] =>
  d.tiers.flatMap((t) =>
    t.levels.map((l) => ({ group: t.tier, label: l.level, rewards: l.rewards, capBreakers: capBreakersIn(l.rewards), pending: false })),
  );

/** Lifetime: 21 milestones, index 0 (10 challenges) to 20 (600). */
export const lifetimeRoadmap = (d: LifetimeRewards): RoadmapNode[] =>
  d.nodes.map((n) => ({ group: "", label: String(n.count), rewards: [n.reward], capBreakers: capBreakersIn([n.reward]), pending: n.upcoming }));

/** Crew: 41 levels, index 0 (level 1) to 40 (level 41). */
export const crewRoadmap = (d: CrewRewards): RoadmapNode[] =>
  d.ladder.map((l) => ({ group: "", label: String(l.level), rewards: [l.reward], capBreakers: capBreakersIn([l.reward]), pending: false }));

/** Sum of Cap Breakers on a roadmap up to and including `position`; `null` = not set. */
export function earnedUpTo(nodes: readonly RoadmapNode[], position: number | null): number {
  if (position == null) return 0;
  return nodes.slice(0, position + 1).reduce((n, node) => n + node.capBreakers, 0);
}

export interface RewardsProgress {
  rep: number | null;
  lifetime: number | null;
  crew: number | null;
  /** Build Specialization goal 9 complete. */
  spec9: boolean;
  /** Seasons finished to level 40, 0 to 9. */
  seasons: number;
}

export interface CapBreakerTally {
  rep: number;
  lifetime: number;
  crew: number;
  specialization: number;
  season: number;
  total: number;
  /** Specialization Cap Breakers are locked to the specialised category. */
  locked: number;
  free: number;
  of: number;
}

export interface Roadmaps {
  rep: readonly RoadmapNode[];
  lifetime: readonly RoadmapNode[];
  crew: readonly RoadmapNode[];
}

/** Cap Breakers are derived from roadmap positions, never ticked by hand. */
export function tallyCapBreakers(progress: RewardsProgress, roadmaps: Roadmaps, capb: CapBreakers): CapBreakerTally {
  const stated = (name: string) => capb.tracks.find((t) => t.name === name)?.stated ?? 0;
  const rep = earnedUpTo(roadmaps.rep, progress.rep);
  const lifetime = earnedUpTo(roadmaps.lifetime, progress.lifetime);
  const crew = earnedUpTo(roadmaps.crew, progress.crew);
  const specialization = progress.spec9 ? stated("Build Specialization") : 0;
  const season = Math.max(0, Math.min(stated("Season Track"), progress.seasons));
  const total = rep + lifetime + crew + specialization + season;
  return { rep, lifetime, crew, specialization, season, total, locked: specialization, free: total - specialization, of: capb.total };
}
