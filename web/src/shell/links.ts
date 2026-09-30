// Link map carried over from legacy/build/shell.py. Built pages are relative; everything else
// goes to a live nba2klab.com URL that was verified to return 200.
export const LIVE = "https://www.nba2klab.com";
export const live = (path: string) => LIVE + path;

export type PageKey = "home" | "builds" | "builder" | "requirements" | "mycareer" | "shooting" | "gamedetails";

export const PAGE_PATH: Record<PageKey, string> = {
  home: "/",
  builds: "/builds",
  builder: "/builder",
  requirements: "/reference-table",
  mycareer: "/mycareer",
  shooting: "/shooting",
  gamedetails: "/game-details",
};

export const NAV: { label: string; key: Exclude<PageKey, "home"> }[] = [
  { label: "Builds", key: "builds" },
  { label: "Builder", key: "builder" },
  { label: "Requirements", key: "requirements" },
  { label: "MyCareer", key: "mycareer" },
  { label: "Shooting", key: "shooting" },
  { label: "Game Details", key: "gamedetails" },
];

export const EXT_DESC_ID = "sh-ext-desc";
