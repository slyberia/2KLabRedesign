import settingsJson from "@data/settings.json";
import controlsJson from "@data/controls.json";
import howtoJson from "@data/howto-inputs.json";
import dribbleJson from "@data/howto-dribble-moves.json";
import tvJson from "@data/2ktv-episode.json";

/** 2KLab's recommended settings: [setting, pick]. */
export const settings = settingsJson as { quick: [string, string][]; faq: [string, string][]; camera: string };

/** Full controller mapping. A one-element row is a group heading. */
export const controls = controlsJson as { header: string[]; rows: string[][] };

export interface HowToGuide { title: string; intro: string; moves: { name: string; input: string }[]; source: string }
export const howToInputs = howtoJson as Record<"dunk" | "pass" | "layups" | "post", HowToGuide>;

/** Names only: the live guide shows inputs as animated stick diagrams, not data. */
export const dribbleMoves = dribbleJson as { moves: string[]; note: string };

/** A snapshot of one 2KTV episode; answers change every episode. */
export const tvEpisode = tvJson as { episodeIndex: number; question: string[]; answer: string[] };
