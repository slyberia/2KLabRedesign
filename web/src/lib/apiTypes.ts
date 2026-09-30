// Response shapes of the Vercel Functions in ../api (HANDOVER.md section 9).

export interface SavedBuild {
  id: string;
  name: string;
  /** "blueprint:<id>" or "player:<id>" */
  preset: string;
  /** Share-link overrides, e.g. "mid95.tpt93" (always "" for players and floor-only blueprints). */
  a: string;
  archetype: string | null;
  position: string | null;
  createdAt: number;
}

export interface CommunityBuild {
  id: string;
  name: string;
  preset: string;
  a: string;
  archetype: string | null;
  position: string | null;
  ownerName: string;
  createdAt: number;
  ratingCount: number;
  rating: number | null;
  mine: boolean;
  myRating: number | null;
  /** Only present for the owner: the saved build it was shared from. */
  sourceId?: string;
}
