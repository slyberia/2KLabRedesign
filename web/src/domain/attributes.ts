// The 21 canonical attributes (HANDOVER.md section 5), in canonical order.
// This order is also the order share links list attributes in.

export const ATTRIBUTES = [
  "Close Shot", "Driving Layup", "Driving Dunk", "Standing Dunk", "Post Control",
  "Mid-Range Shot", "Three-Point Shot", "Free Throw",
  "Pass Accuracy", "Ball Handle", "Speed With Ball",
  "Interior Defense", "Perimeter Defense", "Steal", "Block",
  "Offensive Rebound", "Defensive Rebound",
  "Speed", "Agility", "Strength", "Vertical",
] as const;

export type Attribute = (typeof ATTRIBUTES)[number];

export const CATEGORIES = ["finishing", "shooting", "playmaking", "defense", "rebounding", "physical"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  finishing: "Finishing",
  shooting: "Shooting",
  playmaking: "Playmaking",
  defense: "Defense",
  rebounding: "Rebounding",
  physical: "Physical",
};

export const ATTRIBUTE_CATEGORY: Record<Attribute, Category> = {
  "Close Shot": "finishing", "Driving Layup": "finishing", "Driving Dunk": "finishing",
  "Standing Dunk": "finishing", "Post Control": "finishing",
  "Mid-Range Shot": "shooting", "Three-Point Shot": "shooting", "Free Throw": "shooting",
  "Pass Accuracy": "playmaking", "Ball Handle": "playmaking", "Speed With Ball": "playmaking",
  "Interior Defense": "defense", "Perimeter Defense": "defense", "Steal": "defense", "Block": "defense",
  "Offensive Rebound": "rebounding", "Defensive Rebound": "rebounding",
  "Speed": "physical", "Agility": "physical", "Strength": "physical", "Vertical": "physical",
};

/** Share-link codes (HANDOVER.md section 8). Letters only, so "tpt93" can't be misread. */
export const ATTRIBUTE_CODE: Record<Attribute, string> = {
  "Close Shot": "cls", "Driving Layup": "lay", "Driving Dunk": "dnk", "Standing Dunk": "sdk", "Post Control": "pst",
  "Mid-Range Shot": "mid", "Three-Point Shot": "tpt", "Free Throw": "ft",
  "Pass Accuracy": "pas", "Ball Handle": "bh", "Speed With Ball": "swb",
  "Interior Defense": "id", "Perimeter Defense": "pd", "Steal": "stl", "Block": "blk",
  "Offensive Rebound": "orb", "Defensive Rebound": "drb",
  "Speed": "spd", "Agility": "agl", "Strength": "str", "Vertical": "vrt",
};

export const CODE_ATTRIBUTE: Readonly<Record<string, Attribute>> = Object.fromEntries(
  ATTRIBUTES.map((a) => [ATTRIBUTE_CODE[a], a]),
);
