// Types for the datasets in ../data. Shapes are taken from the files themselves;
// src/data/index.ts casts each import to these, so the compiler flags any drift.

import type { Attribute } from "./attributes";

/** Height as published, feet'inches, e.g. "6'2". */
export type Height = `${number}'${number}`;

export type Tier = "bronze" | "silver" | "gold" | "hof";
/** A tier, or "none" when no tier is reached. */
export type TierResult = Tier | "none";

export interface BadgeCondition {
  attribute: Attribute;
  /** `null` = this tier is not published as reachable through this condition (never 0). */
  bronze: number | null;
  silver: number | null;
  gold: number | null;
  hof: number | null;
}

export interface Badge {
  id: string;
  name: string;
  category: string;
  type: "Primary" | "Secondary";
  operator: "SINGLE" | "AND" | "OR";
  minHeight: Height;
  maxHeight: Height;
  conditions: BadgeCondition[];
  description: string;
}

export type AnimationSubtype = "jumper" | "dribble" | "shooting" | "motionStyle" | "finishing";

export interface Animation {
  id: string;
  animationName: string;
  subtype: AnimationSubtype;
  packageLabel: string | null;
  minHeight: Height;
  maxHeight: Height;
  thresholds: Partial<Record<Attribute, number>>;
  operator: "SINGLE" | "AND" | "OR";
}

export type Position = "PG" | "SG" | "SF" | "PF" | "C";
export type BestSkill = "Finishing" | "Shooting" | "Playmaking" | "Defense" | "Rebounding" | "Balanced";

export interface Blueprint {
  id: string;
  archetype: string;
  position: Position;
  bestSkill: BestSkill;
  description: string;
  height: Height;
  weight: number;
  wingspan: Height;
  /** `null` when unpublished: show "—", never "null". */
  potentialOverall: number | null;
  comparisons: string[];
  /** [floor, ceiling]; ceiling is `null` for the 31 floor-only blueprints. */
  attributeRange: Record<Attribute, [number, number | null]>;
  precomputedUnlocks: Record<string, { badge: string; tier: string }[]>;
}

export interface Player {
  playerId: number;
  name: string;
  team: string;
  position: Position;
  height: Height;
  overall: number;
  potential: string;
  attributes: Record<Attribute, number>;
  extraRatings: Record<string, number>;
}

export interface MinCondition {
  attribute: Attribute;
  min: number;
}

export interface Takeover {
  id: string;
  name: string;
  category: string;
  operator: "ALWAYS" | "SINGLE" | "AND" | "OR";
  conditions: MinCondition[];
  summary: string;
  detail: string;
}

export interface Specialization {
  id: string;
  name: string;
  /** OR across groups, AND within a group. Empty = any build qualifies. */
  unlock: MinCondition[][];
  goals: { goal: number; name: string; requirement: string; rewards: string[] }[];
}

export interface CapBreakerTrack {
  name: string;
  stated: number;
  blurb: string;
  rows: { requirement: string; amount: number }[];
  note: string | null;
  link: string | null;
}

export interface CapBreakers {
  total: number;
  split: string;
  intro: string;
  tracks: CapBreakerTrack[];
}

export interface RepRewards {
  intro: string;
  tiers: { tier: string; stated: number; levels: { level: string; rewards: string[] }[] }[];
}

export interface LifetimeRewards {
  intro: string;
  note: string;
  nodes: { count: number; reward: string; upcoming: boolean }[];
  sections: { name: string; count: number }[];
}

export interface CrewRewards {
  intro: string;
  ladder: { level: number; reward: string; note: string; kind: string }[];
}

/** A build as the Builder holds it: height plus a value for each attribute. */
export interface Build {
  height: Height;
  attributes: Partial<Record<Attribute, number>>;
}
