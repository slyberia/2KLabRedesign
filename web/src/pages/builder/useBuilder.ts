import { useCallback, useMemo, useState } from "react";
import { blueprints } from "../../data/blueprints";
import { players } from "../../data/players";
import {
  blueprintStartingBuild, decodeOverrides, encodeOverrides, hasFullRange, parsePreset,
  type Attribute, type Blueprint, type Build, type Clamped, type Player, type PresetRef,
} from "../../domain";

export type Loaded =
  | { type: "blueprint"; bp: Blueprint; mode: "range" | "floor" }
  | { type: "player"; p: Player };

export const presetRef = (l: Loaded): PresetRef =>
  l.type === "blueprint" ? { type: "blueprint", id: l.bp.id } : { type: "player", id: l.p.playerId };

export function findPreset(param: string | null | undefined): Blueprint | Player | null {
  const ref = parsePreset(param);
  if (!ref) return null;
  return ref.type === "blueprint" ? blueprints.find((b) => b.id === ref.id) ?? null : players.find((p) => p.playerId === ref.id) ?? null;
}

export const isBlueprint = (x: Blueprint | Player): x is Blueprint => "archetype" in x;

/** The build on screen: which preset is loaded, its current attribute values, and any clamped link values. */
export function useBuilder() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attrs, setAttrs] = useState<Partial<Record<Attribute, number>>>({});
  const [clamped, setClamped] = useState<Clamped[]>([]);

  /** Blueprints load at their floors, plus any (already clamped) share-link values. */
  const loadBlueprint = useCallback((bp: Blueprint, a?: string | null) => {
    const o = decodeOverrides(a, bp);
    setLoaded({ type: "blueprint", bp, mode: hasFullRange(bp) ? "range" : "floor" });
    setAttrs({ ...blueprintStartingBuild(bp).attributes, ...o.values });
    setClamped(o.clamped);
  }, []);

  const loadPlayer = useCallback((p: Player) => {
    setLoaded({ type: "player", p });
    setAttrs({ ...p.attributes });
    setClamped([]);
  }, []);

  const load = useCallback((x: Blueprint | Player, a?: string | null) => (isBlueprint(x) ? loadBlueprint(x, a) : loadPlayer(x)), [loadBlueprint, loadPlayer]);

  const setAttr = useCallback((a: Attribute, v: number) => setAttrs((x) => ({ ...x, [a]: v })), []);

  const reset = useCallback(() => {
    if (loaded?.type !== "blueprint") return;
    setAttrs(blueprintStartingBuild(loaded.bp).attributes);
    setClamped([]);
  }, [loaded]);

  const build: Build | null = useMemo(
    () => (loaded ? { height: loaded.type === "blueprint" ? loaded.bp.height : loaded.p.height, attributes: attrs } : null),
    [loaded, attrs],
  );

  /** Share-link overrides for the build on screen ("" when unchanged or not editable). */
  const overrides = loaded?.type === "blueprint" && build ? encodeOverrides(build, loaded.bp) : "";

  return { loaded, attrs, build, clamped, overrides, load, loadBlueprint, loadPlayer, setAttr, reset };
}
