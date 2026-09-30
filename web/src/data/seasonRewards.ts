import seasonJson from "@data/rewards-season.json";

/** Season 1 only: later seasons are not in the data yet (HANDOVER.md section 7). */
export interface SeasonRewards {
  intro: string;
  tracks: { title: string; items: { level: number; reward: string }[] }[];
}
export const seasonRewards = seasonJson as SeasonRewards;
