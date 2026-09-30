import { useEffect, useRef, useState } from "react";
import { badges } from "../../data/badges";
import { buildShareQuery, TIER_LABEL, type PresetRef } from "../../domain";
import { Compare, useCompareView } from "../../components/Compare";
import { Tabs, type TabDef } from "../../components/Tabs";
import { initialParams, queryString, useDebouncedEffect } from "../../lib/url";
import { AttributeWorkspace } from "./AttributeWorkspace";
import { BuilderCompareCards, BuilderCompareFull, samePreset } from "./BuilderCompare";
import { DerivedPanel } from "./DerivedPanel";
import { LoadedBanner } from "./LoadedBanner";
import { MyBuilds } from "./MyBuilds";
import { BlueprintGrid, PlayerGrid } from "./PresetPicker";
import { findPreset, isBlueprint, presetRef, useBuilder } from "./useBuilder";
import "./builder.css";

type PickerTab = "bp" | "pl" | "my";
const TABS: TabDef<PickerTab>[] = [
  { id: "bp", label: "Signature Blueprints" },
  { id: "pl", label: "Real Players" },
  { id: "my", label: "My Builds" },
];
const MY_HASH = "#my-builds";

export function BuilderPage() {
  const b = useBuilder();
  const [focusBadge] = useState(() => {
    const f = initialParams().get("focus");
    return badges.some((x) => x.id === f) ? f : null;
  });
  const [tab, setTab] = useState<PickerTab>(() => (location.hash === MY_HASH ? "my" : "bp"));
  const [pinned, setPinned] = useState<PresetRef[]>([]);
  const [buildsVersion, setBuildsVersion] = useState(0);
  const compare = useCompareView();
  const bannerRef = useRef<HTMLDivElement>(null);

  // Deep link: ?preset=blueprint:<id>|player:<id>&a=<overrides>&focus=<badgeId>
  useEffect(() => {
    const p = initialParams();
    const preset = findPreset(p.get("preset"));
    if (preset) {
      b.load(preset, p.get("a"));
      if (!isBlueprint(preset) && location.hash !== MY_HASH) setTab("pl");
    }
  }, []);

  // Same-page links to #my-builds (the account menu while already on the Builder) change only the hash.
  useEffect(() => {
    const on = () => {
      if (location.hash !== MY_HASH) return;
      setTab("my");
      const t = document.getElementById("tab-my");
      t?.scrollIntoView({ block: "center" });
      t?.focus();
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  // Land on the focused badge once a build is on screen.
  const focusedOnce = useRef(false);
  useEffect(() => {
    if (!b.loaded || !focusBadge || focusedOnce.current) return;
    focusedOnce.current = true;
    requestAnimationFrame(() => document.getElementById(`bcard-${focusBadge}`)?.scrollIntoView({ block: "center" }));
  }, [b.loaded, focusBadge]);

  const shareQuery = () => {
    if (!b.loaded) return "";
    const p = new URLSearchParams(buildShareQuery(presetRef(b.loaded), b.overrides));
    if (focusBadge) p.set("focus", focusBadge);
    return queryString(p);
  };
  // The URL always describes the build on screen, so it can be shared as-is. Slider drags are
  // batched: Safari caps history rewrites at about 100 per 30 seconds.
  useDebouncedEffect(() => {
    if (!b.loaded) return; // nothing to describe yet: keep the incoming link (e.g. ?focus=) as it is
    const next = `${location.pathname}${shareQuery()}${tab === "my" ? MY_HASH : ""}`;
    if (next !== location.pathname + location.search + location.hash) history.replaceState(null, "", next);
  }, [b.loaded, b.overrides, tab], 250);

  const current = b.loaded ? presetRef(b.loaded) : null;
  const isPinned = !!current && pinned.some((p) => samePreset(p, current));
  const togglePin = (ref: PresetRef) => {
    if (pinned.some((p) => samePreset(p, ref))) {
      setPinned(pinned.filter((p) => !samePreset(p, ref)));
      return;
    }
    // Open the tray once to confirm the first pin; later pins leave it as it is, since it sits
    // over the picker people are pinning from.
    if (pinned.length === 0) compare.pinAdded(1);
    setPinned([...pinned, ref]);
  };

  const focusName = focusBadge ? badges.find((x) => x.id === focusBadge)!.name : null;
  const changes = b.overrides ? b.overrides.split(".").length : 0;

  return (
    <>
      <div className="wrap">
        <div className="crumb"><a href="/">Home</a> / Builder</div>
        <div className="pagehead">
          <div className="eyebrow">MyPlayer Builder</div>
          <h1>NBA 2K27 MyPlayer Builder</h1>
          <p>
            Load a Signature Blueprint archetype or a real NBA player&rsquo;s card, then explore how the attributes translate
            into badge unlocks. Every threshold shown reads from the same data behind the Requirements page.
          </p>
        </div>

        <Tabs tabs={TABS} selected={tab} onSelect={setTab} label="Preset type" className="picker-tabs" />
        <div id="panel-bp" role="tabpanel" aria-labelledby="tab-bp" hidden={tab !== "bp"}>
          <BlueprintGrid activeId={b.loaded?.type === "blueprint" ? b.loaded.bp.id : null} onLoad={(bp) => b.loadBlueprint(bp)} />
        </div>
        <div id="panel-pl" role="tabpanel" aria-labelledby="tab-pl" hidden={tab !== "pl"}>
          <PlayerGrid activeId={b.loaded?.type === "player" ? b.loaded.p.playerId : null} onLoad={(p) => b.loadPlayer(p)} />
        </div>
        <div id="panel-my" role="tabpanel" aria-labelledby="tab-my" hidden={tab !== "my"}>
          <MyBuilds
            version={buildsVersion}
            onOpen={(saved) => {
              const preset = findPreset(saved.preset);
              if (!preset) return;
              b.load(preset, saved.a);
              requestAnimationFrame(() => bannerRef.current?.scrollIntoView({ block: "start" }));
            }}
          />
        </div>

        {!b.loaded && focusName && (
          <p className="dl-notice">Pick a Signature Blueprint or a real player to see where it stands on <b>{focusName}</b>.</p>
        )}

        <div ref={bannerRef}>
          {b.loaded && (
            <LoadedBanner
              loaded={b.loaded}
              clamped={b.clamped}
              changes={changes}
              overrides={b.overrides}
              pinned={isPinned}
              onPin={() => current && togglePin(current)}
              onReset={b.reset}
              shareUrl={() => `${location.origin}${location.pathname}${shareQuery()}`}
              onSaved={() => setBuildsVersion((v) => v + 1)}
            />
          )}
        </div>

        {b.loaded && b.build ? (
          <div className="workspace">
            <div className="wcol">
              <h2>Attributes</h2>
              <AttributeWorkspace loaded={b.loaded} attrs={b.attrs} onChange={b.setAttr} />
            </div>
            <div className="wcol">
              <div className="dp-head">
                <h2>What This Unlocks</h2>
                <div className="legend" aria-hidden="true">
                  {(["bronze", "silver", "gold", "hof"] as const).map((t) => (
                    <span className="lg" key={t}><span className="sw" style={{ ["--lc" as string]: `var(--tier-${t})` }} />{TIER_LABEL[t]}</span>
                  ))}
                </div>
              </div>
              <DerivedPanel build={b.build} focusBadge={focusBadge} />
            </div>
          </div>
        ) : (
          <div className="derived-empty">Pick a Signature Blueprint or a real player above to see what it unlocks.</div>
        )}
      </div>

      <Compare
        view={compare}
        count={pinned.length}
        label="Compare presets"
        hint="Pin one more preset to compare them side by side."
        cards={<BuilderCompareCards pinned={pinned} onUnpin={togglePin} />}
        full={<BuilderCompareFull pinned={pinned} />}
        onClear={() => setPinned([])}
      />
    </>
  );
}
