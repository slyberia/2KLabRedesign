import starterJson from "@data/rewards-starter.json";

export interface StarterRewards {
  intro: string;
  sections: { name: string; tasks: string[]; reward: string }[];
}
export const starterRewards = starterJson as StarterRewards;
