import { ATTRIBUTES, type Attribute } from "./attributes";
import type { Blueprint, Build, Player } from "./types";

/**
 * True for the 9 blueprints that publish a ceiling for every attribute. The other 31 publish
 * floors only and render fixed, like a player card: never invent a ceiling.
 */
export function hasFullRange(bp: Blueprint): boolean {
  return Object.values(bp.attributeRange).every(([, max]) => max != null);
}

/** Blueprints load at their floors. */
export function blueprintStartingBuild(bp: Blueprint): Build {
  const attributes: Partial<Record<Attribute, number>> = {};
  for (const a of ATTRIBUTES) attributes[a] = bp.attributeRange[a][0];
  return { height: bp.height, attributes };
}

/** Players are fixed values. */
export function playerBuild(p: Player): Build {
  return { height: p.height, attributes: { ...p.attributes } };
}

/** Unpublished potential shows as "—", never "null". */
export const formatPotential = (bp: Blueprint): string =>
  bp.potentialOverall == null ? "—" : String(bp.potentialOverall);
