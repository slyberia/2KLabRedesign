import vcJson from "@data/vc-prices.json";

export interface VcPrices {
  source: string;
  captured: string;
  tiers: { vc: number; price: number; vcPerDollar: number }[];
  season1Bundles: { name: string; price: number; contents: string[] }[];
  maxBuild: { to85: number; to99: number };
}
export const vcPrices = vcJson as VcPrices;
