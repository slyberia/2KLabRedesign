import type { Build, MinCondition, Specialization, Takeover } from "./types";

const meets = (build: Build, c: MinCondition) => (build.attributes[c.attribute] ?? -1) >= c.min;

/** ALWAYS | SINGLE | all-AND | all-OR. No published takeover mixes AND and OR. */
export function takeoverUnlocked(t: Takeover, build: Build): boolean {
  if (t.operator === "ALWAYS") return true;
  const hits = t.conditions.map((c) => meets(build, c));
  return t.operator === "OR" ? hits.some(Boolean) : hits.every(Boolean);
}

/** OR across groups, AND within a group; no groups = any build qualifies (Physicals). */
export function qualifiesForSpecialization(spec: Specialization, build: Build): boolean {
  if (spec.unlock.length === 0) return true;
  return spec.unlock.some((group) => group.every((c) => meets(build, c)));
}
