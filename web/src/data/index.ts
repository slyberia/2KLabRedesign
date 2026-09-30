// Typed access to the verified datasets in the repo-level data/ folder, one module per dataset so
// each page bundles only what it imports. Each cast is checked against src/domain/types.ts, so a
// shape change in data/ fails typecheck.
export { badges } from "./badges";
export { animations } from "./animations";
export { blueprints } from "./blueprints";
export { players } from "./players";
export { takeovers } from "./takeovers";
export { specializations } from "./specializations";
export { capBreakers } from "./capBreakers";
export { repRewards } from "./repRewards";
export { lifetimeRewards } from "./lifetimeRewards";
export { crewRewards } from "./crewRewards";
