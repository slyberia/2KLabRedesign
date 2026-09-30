import faceJson from "@data/face-creations.json";

export interface FaceSection { key: string; title: string; fields: { key: string; label: string }[] }
export interface FacePlayer {
  id: string;
  name: string;
  team: string;
  years: string;
  category: "current" | "legend";
  /** 2KLab's finished-face image (hotlinked); null for a few players. */
  image: string | null;
  /** section key -> { preset, ...field values }. Values are strings exactly as published. */
  sections: Record<string, Record<string, string | null>>;
}
export interface FaceCreations {
  source: string;
  captured: string;
  credit: { name: string; tiktok: string | null; youtube: string | null };
  note: string;
  sections: FaceSection[];
  players: FacePlayer[];
}
export const faceCreations = faceJson as FaceCreations;
