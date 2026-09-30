import rebirthJson from "@data/rebirth.json";

export interface Rebirth {
  tiers: { tier: string; badgeTokens: string; extra: string | null; status: string }[];
  shared: string;
  how: { title: string; body: string }[];
  source: string | null;
}
export const rebirth = rebirthJson as Rebirth;
