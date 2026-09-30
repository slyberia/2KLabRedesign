import { useEffect, useMemo, useRef, useState } from "react";
import { animations } from "../../data/animations";
import { badges } from "../../data/badges";
import { specializations } from "../../data/specializations";
import { takeovers } from "../../data/takeovers";
import {
  CATEGORIES, CATEGORY_LABEL, SUBTYPES, SUBTYPE_LABEL, TIER_LABEL, animationUnlocked, badgeCategory, badgeTier,
  heightToParam, qualifiesForSpecialization, takeoverUnlocked, tierRank,
  type Badge, type Build, type Category, type Tier, type TierResult,
} from "../../domain";
import { OpChip } from "../../components/OpChip";

const TILE_ORDER: Tier[] = ["bronze", "silver", "gold", "hof"];
const TOTALS_ORDER: Tier[] = ["hof", "gold", "silver", "bronze"];
/** Where the workspace stacks; categories start collapsed and the results bar appears. */
const NARROW = "(max-width: 1050px)";

function useMediaQuery(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

function BadgeRow({ b, tier, build, focus }: { b: Badge; tier: TierResult; build: Build; focus: boolean }) {
  const c0 = b.conditions[0]!;
  // The Requirements link carries this build's height and reached tier, so the lookup opens scoped to it.
  const q = new URLSearchParams({ badge: b.id, height: heightToParam(build.height) });
  if (tier !== "none") q.set("tier", tier);
  return (
    <div className={`badge-card${focus ? " is-focus" : ""}`} id={`bcard-${b.id}`}>
      <div className="card-top">
        <span className="badge-name">{b.name}</span>
        <span className="attrs">
          {b.operator === "SINGLE" ? c0.attribute : <>{c0.attribute} <OpChip op={b.operator} /> {b.conditions[1]!.attribute}</>}
        </span>
        <span className={`reached-tag r-${tier}`}>{tier === "none" ? "Not Reached" : TIER_LABEL[tier]}</span>
        <a className="card-link" href={`reference-table.html?${q.toString()}#badges`}>Requirements &rarr;</a>
      </div>
      <div className="tilerow">
        {TILE_ORDER.map((t) =>
          c0[t] == null ? (
            <span key={t} className="tile na" role="img" aria-label={`${TIER_LABEL[t]}: not published`}><span className="v" aria-hidden="true">&mdash;</span></span>
          ) : (
            <span key={t} className={`tile t-${t}${tier === t ? " reached" : ""}`} aria-label={`${TIER_LABEL[t]}: ${c0[t]}${tier === t ? " (reached)" : ""}`}>
              <span className="v" aria-hidden="true">{c0[t]}</span>
            </span>
          ),
        )}
        <span className="htchip">{b.minHeight}&ndash;{b.maxHeight}</span>
      </div>
    </div>
  );
}

export function DerivedPanel({ build, focusBadge }: { build: Build; focusBadge: string | null }) {
  const narrow = useMediaQuery(NARROW);
  const [catOpen, setCatOpen] = useState<Partial<Record<Category, boolean>>>({});

  const statuses = useMemo(() => badges.map((b) => ({ b, tier: badgeTier(b, build) })), [build]);
  const totals = useMemo(() => {
    const t: Record<Tier, number> = { hof: 0, gold: 0, silver: 0, bronze: 0 };
    for (const s of statuses) if (s.tier !== "none") t[s.tier]++;
    return t;
  }, [statuses]);
  const animCounts = useMemo(() => {
    const c = Object.fromEntries(SUBTYPES.map((s) => [s, { unlocked: 0, total: 0 }])) as Record<(typeof SUBTYPES)[number], { unlocked: number; total: number }>;
    for (const a of animations) {
      c[a.subtype].total++;
      if (animationUnlocked(a, build)) c[a.subtype].unlocked++;
    }
    return c;
  }, [build]);
  const animUnlocked = Object.values(animCounts).reduce((n, c) => n + c.unlocked, 0);
  const takeoversUnlocked = takeovers.filter((t) => takeoverUnlocked(t, build)).length;

  // The results bar pulses when the totals change (not on first render). Restarting a CSS
  // animation needs the class removed and a reflow before it is added back.
  const bar = useRef<HTMLDivElement>(null);
  const key = JSON.stringify([totals, animUnlocked]);
  const lastKey = useRef(key);
  useEffect(() => {
    const el = bar.current;
    if (el && lastKey.current !== key) {
      el.classList.remove("pulse");
      void el.offsetWidth;
      el.classList.add("pulse");
    }
    lastKey.current = key;
  }, [key]);

  return (
    <>
      <div className="specsummary">
        <span className="lbl">Specializations</span>
        {specializations.map((r) => {
          const ok = qualifiesForSpecialization(r, build);
          const sk = r.id === "physicals" ? "physical" : r.id;
          return (
            <a key={r.id} className={`spec-chip${ok ? " ok" : ""}`} style={{ ["--sk" as string]: `var(--skill-${sk})` }} href={`mycareer.html?spec=${r.id}#specializations`}>
              <span className="cdot" aria-hidden="true" />
              {r.name}
              <span className="sr-only">{ok ? " (qualifies)" : " (not yet)"}</span>
            </a>
          );
        })}
      </div>
      <div className="specsummary">
        <span className="lbl">Takeovers {takeoversUnlocked}/{takeovers.length}</span>
        {/* Always-available takeovers are counted, not listed. */}
        {takeovers.filter((t) => t.operator !== "ALWAYS").map((t) => {
          const ok = takeoverUnlocked(t, build);
          return (
            <a key={t.id} className={`spec-chip${ok ? " ok" : ""}`} style={{ ["--sk" as string]: `var(--skill-${t.category.toLowerCase()})` }} href={`reference-table.html?takeover=${t.id}#takeovers`}>
              <span className="cdot" aria-hidden="true" />
              {t.name}
              <span className="sr-only">{ok ? " (unlocked)" : " (locked)"}</span>
            </a>
          );
        })}
      </div>
      <div className="animsummary">
        {SUBTYPES.map((s) => (
          <div className="animcount" key={s}>
            <div className="n">{animCounts[s].unlocked} <em>/ {animCounts[s].total}</em></div>
            <div className="l">{SUBTYPE_LABEL[s]}</div>
          </div>
        ))}
      </div>
      {CATEGORIES.map((cat) => {
        const items = statuses.filter((s) => badgeCategory(s.b) === cat).sort((x, y) => tierRank(y.tier) - tierRank(x.tier));
        if (!items.length) return null;
        const reached = items.filter((i) => i.tier !== "none").length;
        const open = catOpen[cat] ?? !narrow;
        return (
          <details
            key={cat}
            className="cat-group"
            open={open}
            style={{ ["--sk" as string]: `var(--skill-${cat})` }}
            onToggle={(e) => {
              const now = (e.currentTarget as HTMLDetailsElement).open;
              if (now !== open) setCatOpen((o) => ({ ...o, [cat]: now }));
            }}
          >
            <summary className="cat-head">
              <span className="dot" aria-hidden="true" />
              <h3>{CATEGORY_LABEL[cat]}</h3>
              <span className="count">{reached}/{items.length} reached</span>
              <span className="chev" aria-hidden="true" />
            </summary>
            <div className="cardlist">
              {items.map((i) => <BadgeRow key={i.b.id} b={i.b} tier={i.tier} build={build} focus={focusBadge === i.b.id} />)}
            </div>
          </details>
        );
      })}
      {narrow && (
        <div className="results-bar" ref={bar} role="region" aria-label="Live results">
          <span className="rb-lbl">Badges</span>
          <span className="rb-stats" aria-live="polite">
            {TOTALS_ORDER.map((t) => <span key={t} className={`rb-t rb-${t}`}><b>{totals[t]}</b> {TIER_LABEL[t]}</span>)}
            <span className="rb-t"><b>{animUnlocked}</b> anims</span>
          </span>
          <button type="button" className="rb-jump" onClick={() => document.querySelector(".dp-head")?.scrollIntoView({ block: "start" })}>
            <span className="rb-long">See unlocks</span><span className="rb-short">Unlocks</span> &darr;
          </button>
        </div>
      )}
    </>
  );
}
