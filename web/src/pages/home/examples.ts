// Real rows shown in the homepage previews. The animation is hardcoded so the homepage doesn't
// load all 2,503 animations; src/data/data.test.ts checks it still matches data/animations.json.
export const HOME_ANIMATION_EXAMPLE = {
  id: "fin2251",
  name: "City Alley-Oop 360s",
  thresholds: { "Driving Dunk": 85, "Vertical": 60 },
} as const;
