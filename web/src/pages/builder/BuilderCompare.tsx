import { badges } from "../../data/badges";
import { blueprints } from "../../data/blueprints";
import { players } from "../../data/players";
import {
  ATTRIBUTES, TIER_LABEL, badgeTier, blueprintStartingBuild, formatPotential, playerBuild,
  type Blueprint, type Build, type Player, type PresetRef, type Tier,
} from "../../domain";
import { CompareGrid } from "../../components/Compare";

type Pinned = { ref: PresetRef; d: Blueprint | Player; build: Build; name: string };

export const samePreset = (a: PresetRef, b: PresetRef) => a.type === b.type && a.id === b.id;

/** Pinned presets compare at their starting builds (floors for blueprints). */
function resolve(refs: PresetRef[]): Pinned[] {
  return refs.flatMap((ref): Pinned[] => {
    if (ref.type === "blueprint") {
      const d = blueprints.find((b) => b.id === ref.id);
      return d ? [{ ref, d, build: blueprintStartingBuild(d), name: d.archetype }] : [];
    }
    const d = players.find((p) => p.playerId === ref.id);
    return d ? [{ ref, d, build: playerBuild(d), name: d.name }] : [];
  });
}

export function BuilderCompareCards({ pinned, onUnpin }: { pinned: PresetRef[]; onUnpin: (r: PresetRef) => void }) {
  return (
    <>
      {resolve(pinned).map(({ ref, d, name }) => {
        const bp = ref.type === "blueprint" ? (d as Blueprint) : null;
        const pl = ref.type === "player" ? (d as Player) : null;
        return (
          <div className="mini-preset" key={`${ref.type}:${ref.id}`} style={bp ? { ["--sk" as string]: `var(--skill-${bp.bestSkill.toLowerCase()})` } : undefined}>
            <button type="button" className="mp-remove" aria-label={`Remove ${name} from comparison`} onClick={() => onUnpin(ref)}>&times;</button>
            <div className="mp-name">{name}<span className="mp-type">{bp ? "Blueprint" : "Player"}</span></div>
            <div className="mp-meta">{d.position} &middot; {d.height}{pl ? ` · ${pl.team}` : ""}</div>
            <div className="mp-potential">{bp ? formatPotential(bp) : pl!.overall} <span>{bp ? "Potential" : "Overall"}</span></div>
          </div>
        );
      })}
    </>
  );
}

const TIERS: Tier[] = ["hof", "gold", "silver", "bronze"];

export function BuilderCompareFull({ pinned }: { pinned: PresetRef[] }) {
  const list = resolve(pinned);
  const names = list.map((p) => p.name);
  return (
    <>
      <CompareGrid
        title="Attributes"
        vertical
        names={names}
        rows={ATTRIBUTES.map((attr): [string, (number | string)[]] => [attr, list.map((p) => p.build.attributes[attr] ?? "—")])}
        cellClass={(r, c) => {
          // highlight a value only when it is the single highest in its row
          const vals = list.map((p) => p.build.attributes[ATTRIBUTES[r]!] ?? -1);
          const max = Math.max(...vals);
          return vals[c] === max && vals.filter((v) => v === max).length === 1 ? "delta-up" : "";
        }}
      />
      <CompareGrid
        title="Badges Reached, by Tier"
        first={false}
        vertical
        names={names}
        rows={TIERS.map((t): [string, string[]] => [
          TIER_LABEL[t],
          list.map((p) => {
            const n = badges.filter((b) => badgeTier(b, p.build) === t).length;
            return `${n} badge${n === 1 ? "" : "s"}`;
          }),
        ])}
      />
    </>
  );
}
