// Typed access to the verified datasets in the repo-level data/ folder.
// Each cast is checked against src/domain/types.ts, so a shape change in data/ fails typecheck.
import type {
  Animation, Badge, Blueprint, CapBreakers, CrewRewards, LifetimeRewards, Player, RepRewards, Specialization, Takeover,
} from "../domain/types";

import badgesJson from "@data/badges.json";
import animationsJson from "@data/animations.json";
import blueprintsJson from "@data/blueprints.json";
import playersJson from "@data/players.json";
import takeoversJson from "@data/takeovers.json";
import specializationsJson from "@data/specializations.json";
import capBreakersJson from "@data/cap-breakers.json";
import repJson from "@data/rewards-rep.json";
import lifetimeJson from "@data/rewards-lifetime.json";
import crewJson from "@data/rewards-crew.json";

export const badges = badgesJson as Badge[];
export const animations = animationsJson as Animation[];
// JSON arrays infer as number[], not the [floor, ceiling] tuple, so this one cast can't be
// checked by the compiler; data.test.ts checks every range is a 2-element tuple instead.
export const blueprints = blueprintsJson as unknown as Blueprint[];
export const players = playersJson as Player[];
export const takeovers = takeoversJson as Takeover[];
export const specializations = specializationsJson as Specialization[];
export const capBreakers = capBreakersJson as CapBreakers;
export const repRewards = repJson as RepRewards;
export const lifetimeRewards = lifetimeJson as LifetimeRewards;
export const crewRewards = crewJson as CrewRewards;
