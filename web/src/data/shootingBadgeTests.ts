import testsJson from "@data/shooting-badge-tests.json";

/** 2KLab's test status for each shooting badge: "Results" links to the test, "Pending" has none yet. */
export const shootingBadgeTests = testsJson as { name: string; status: "Results" | "Pending"; link: string | null }[];
