import { useEffect, useMemo, useState } from "react";
import { badges } from "../../data/badges";
import { takeovers } from "../../data/takeovers";
import {
  ATTRIBUTES, HEIGHT_OPTIONS, TIERS_DESC, heightFromParam, heightToParam, isWithinHeight,
  type Attribute, type Height, type Tier,
} from "../../domain";
import { Compare, useCompareView } from "../../components/Compare";
import { Tabs, type TabDef } from "../../components/Tabs";
import { initialParams, replaceUrl, useHashTab } from "../../lib/url";
import { BadgesPanel, type Crossing } from "./BadgesPanel";
import { AnimationsPanel } from "./AnimationsPanel";
import { TakeoversPanel } from "./TakeoversPanel";
import { RequirementsCompareCards, RequirementsCompareFull } from "./RequirementsCompare";
import "./requirements.css";

type Tab = "badges" | "animations" | "takeovers";
const TABS: TabDef<Tab>[] = [
  { id: "badges", label: "Badges", tabId: "tab-badges", panelId: "panel-badges" },
  { id: "animations", label: "Animations", tabId: "tab-anims", panelId: "panel-anims" },
  { id: "takeovers", label: "Takeovers", tabId: "tab-takeovers", panelId: "panel-takeovers" },
];
const TAB_IDS = TABS.map((t) => t.id);

/** Everything the incoming URL asks for, read once (HANDOVER.md section 8). */
function readDeepLink() {
  const p = initialParams();
  const badge = badges.find((b) => b.id === p.get("badge")) ?? null;
  const takeover = takeovers.find((t) => t.id === p.get("takeover")) ?? null;
  const attr = (ATTRIBUTES as readonly string[]).includes(p.get("attr") ?? "") ? (p.get("attr") as Attribute) : null;
  const heightRaw = heightFromParam(p.get("height") ?? "");
  const height = heightRaw && HEIGHT_OPTIONS.includes(heightRaw) ? heightRaw : null;
  const tierRaw = p.get("tier") as Tier | null;
  const tier = badge && tierRaw && TIERS_DESC.includes(tierRaw) && badge.conditions[0]![tierRaw] != null ? tierRaw : null;
  return { badge, takeover, attr, height, tier, q: p.get("q") ?? "" };
}

export function RequirementsPage() {
  const [link] = useState(readDeepLink);
  const [tab, setTab] = useHashTab<Tab>(TAB_IDS, "badges", () => {
    document.querySelector(".pagehead .tabs")?.scrollIntoView({ block: "start" });
  });
  const [height, setHeight] = useState<Height | null>(link.height);
  const [badgeQuery, setBadgeQuery] = useState(link.q);
  const [attr, setAttr] = useState<Attribute | null>(link.attr);
  const [focusBadge] = useState(link.badge?.id ?? null);
  const [focusTakeover] = useState(link.takeover?.id ?? null);

  // A badge link opens its description, and its tier's co-unlocks when a tier is given.
  const [openDesc, setOpenDesc] = useState<Record<string, boolean>>(() => (link.badge ? { [link.badge.id]: true } : {}));
  const [crossings, setCrossings] = useState<Record<string, Crossing>>(() => {
    if (!link.badge || !link.tier) return {};
    const c0 = link.badge.conditions[0]!;
    return { [link.badge.id]: { attribute: c0.attribute, value: c0[link.tier]!, tier: link.tier } };
  });
  const focusOutOfHeight = link.badge && height != null && !isWithinHeight(height, link.badge.minHeight, link.badge.maxHeight);

  const [pinnedBadges, setPinnedBadges] = useState<string[]>([]);
  const [pinnedAnims, setPinnedAnims] = useState<string[]>([]);
  const compare = useCompareView();
  const total = pinnedBadges.length + pinnedAnims.length;

  // Apply the tab the link implies once, then scroll the focused item into view.
  useEffect(() => {
    if (link.badge) setTab("badges");
    else if (link.takeover) setTab("takeovers");
    requestAnimationFrame(() => {
      const el = link.badge ? document.getElementById(`bcard-${link.badge.id}`) : link.takeover ? document.getElementById(`tk-${link.takeover.id}`) : null;
      el?.scrollIntoView({ block: "center" });
    });
  }, []);

  // Keep the URL shareable: it always reflects the current filters and tab.
  useEffect(() => {
    const p = new URLSearchParams();
    if (focusBadge) p.set("badge", focusBadge);
    if (focusBadge && link.tier) p.set("tier", link.tier);
    if (height) p.set("height", heightToParam(height));
    if (attr) p.set("attr", attr);
    if (badgeQuery.trim()) p.set("q", badgeQuery.trim());
    if (focusTakeover) p.set("takeover", focusTakeover);
    replaceUrl(p, tab);
  }, [tab, height, attr, badgeQuery, focusBadge, focusTakeover, link.tier]);

  const togglePin = (kind: "badge" | "anim", id: string, on: boolean) => {
    const set = kind === "badge" ? setPinnedBadges : setPinnedAnims;
    set((xs) => (on ? [...xs, id] : xs.filter((x) => x !== id)));
    if (on) compare.pinAdded(total + 1);
  };

  const heightHint = useMemo(() => (height ? "Badges and animations outside this height are hidden below." : ""), [height]);

  return (
    <>
      <div className="wrap">
        <div className="crumb"><a href="index.html">Home</a> / Requirements</div>
        <div className="pagehead">
          <div className="eyebrow">Requirements</div>
          <h1>NBA 2K27 Requirements</h1>
          <p>
            Every badge, animation, and takeover threshold in one place. Filter by your build&rsquo;s height, pin badges
            and animations to compare, and click any badge tier to see which animations unlock at that same rating.
          </p>
          <Tabs tabs={TABS} selected={tab} onSelect={setTab} label="Requirement type" />
          {/* Takeovers publish no height requirements: hide the filter rather than let it silently do nothing. */}
          <div className="heightbar" hidden={tab === "takeovers"}>
            <label htmlFor="heightSelect">Your build&rsquo;s height</label>
            <select id="heightSelect" value={height ?? ""} onChange={(e) => setHeight((e.target.value || null) as Height | null)}>
              <option value="">Any height (no filter)</option>
              {HEIGHT_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="heighthint" aria-live="polite">{heightHint}</span>
          </div>
        </div>
      </div>

      <div className="wrap" id="panel-badges" role="tabpanel" aria-labelledby="tab-badges" hidden={tab !== "badges"}>
        <BadgesPanel
          height={height}
          query={badgeQuery}
          onQuery={setBadgeQuery}
          attr={attr}
          onClearAttr={() => { setAttr(null); document.getElementById("badgeSearch")?.focus(); }}
          focusBadge={focusBadge}
          focusNotice={
            focusOutOfHeight && link.badge ? (
              <p className="dl-notice">
                <b>{link.badge.name}</b> isn&rsquo;t available at {height} (its height range is {link.badge.minHeight}&ndash;
                {link.badge.maxHeight}).{" "}
                <button
                  type="button"
                  onClick={() => {
                    setHeight(null);
                    requestAnimationFrame(() => document.getElementById(`bcard-${link.badge!.id}`)?.scrollIntoView({ block: "center" }));
                  }}
                >
                  Show all heights
                </button>
              </p>
            ) : null
          }
          openDesc={openDesc}
          onToggleDesc={(id) => setOpenDesc((o) => ({ ...o, [id]: !o[id] }))}
          crossings={crossings}
          onTile={(id, c) => {
            setOpenDesc((o) => ({ ...o, [id]: true }));
            setCrossings((x) => ({ ...x, [id]: c }));
          }}
          pinned={pinnedBadges}
          onPin={(id, on) => togglePin("badge", id, on)}
        />
      </div>

      <div className="wrap" id="panel-anims" role="tabpanel" aria-labelledby="tab-anims" hidden={tab !== "animations"}>
        <AnimationsPanel height={height} pinned={pinnedAnims} onPin={(id, on) => togglePin("anim", id, on)} />
      </div>

      <div className="wrap" id="panel-takeovers" role="tabpanel" aria-labelledby="tab-takeovers" hidden={tab !== "takeovers"}>
        <TakeoversPanel focusTakeover={focusTakeover} />
      </div>

      <Compare
        view={compare}
        count={total}
        label="Compare pinned items"
        cards={
          <RequirementsCompareCards
            badgeIds={pinnedBadges}
            animIds={pinnedAnims}
            onUnpin={(kind, id) => togglePin(kind, id, false)}
          />
        }
        full={<RequirementsCompareFull badgeIds={pinnedBadges} animIds={pinnedAnims} />}
        onClear={() => { setPinnedBadges([]); setPinnedAnims([]); }}
      />
    </>
  );
}
