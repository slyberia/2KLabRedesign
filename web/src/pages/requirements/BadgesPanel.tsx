import { useMemo, useState, type ReactNode } from "react";
import { animations } from "../../data/animations";
import { badges } from "../../data/badges";
import {
  CATEGORIES, CATEGORY_LABEL, SUBTYPE_LABEL, TIER_LABEL, badgeCategory, coUnlocks, isWithinHeight,
  type Attribute, type Badge, type BadgeCondition, type Category, type Height, type Tier,
} from "../../domain";
import { OpChip } from "../../components/OpChip";
import { SearchBox } from "../../components/SearchBox";

export interface Crossing {
  attribute: Attribute;
  value: number;
  tier: Tier;
}

const TILE_ORDER: Tier[] = ["bronze", "silver", "gold", "hof"];
const CROSSINGS_SHOWN = 14;

function TierTile({ cond, tier, onPick }: { cond: BadgeCondition; tier: Tier; onPick: (c: Crossing) => void }) {
  const v = cond[tier];
  if (v == null) {
    return (
      <span className="tile na" role="img" aria-label={`${TIER_LABEL[tier]}: not published`}>
        <span className="v" aria-hidden="true">&mdash;</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`tile t-${tier}`}
      aria-label={`${TIER_LABEL[tier]}: ${v}. Show animations unlocked at this rating.`}
      onClick={() => onPick({ attribute: cond.attribute, value: v, tier })}
    >
      <span className="v">{v}</span>
    </button>
  );
}

function Crossings({ c, height }: { c: Crossing; height: Height | null }) {
  const hits = useMemo(() => coUnlocks(animations, c.attribute, c.value, height), [c, height]);
  const head = `Animations unlocked at ${TIER_LABEL[c.tier]}`;
  if (!hits.length) {
    return (
      <div className="crossings show">
        <div className="crossings-head">{head} ({c.attribute} &ge; {c.value})</div>
        <div className="crossings-empty">No animations key on this attribute at this threshold.</div>
      </div>
    );
  }
  return (
    <div className="crossings show">
      <div className="crossings-head">
        {head} &middot; {c.attribute} &ge; {c.value} ({hits.length} total{height ? ` at ${height}` : ""})
      </div>
      <div className="cross-list">
        {hits.slice(0, CROSSINGS_SHOWN).map((h) => (
          <span className="cross-item" key={h.animation.id}>
            <b>{h.animation.animationName}</b>
            <span className="sub">{SUBTYPE_LABEL[h.animation.subtype]}</span>
            {!h.fullyUnlocked && <span className="sub">+ {h.otherAttributes.join(", ")}</span>}
          </span>
        ))}
        {hits.length > CROSSINGS_SHOWN && <span className="cross-item">+{hits.length - CROSSINGS_SHOWN} more</span>}
      </div>
    </div>
  );
}

function BadgeCard(props: {
  b: Badge;
  focus: boolean;
  pinned: boolean;
  open: boolean;
  crossing: Crossing | undefined;
  height: Height | null;
  onPin: (on: boolean) => void;
  onToggle: () => void;
  onTile: (c: Crossing) => void;
}) {
  const { b } = props;
  const c0 = b.conditions[0]!;
  return (
    <>
      <div className={`badge-card${props.pinned ? " pinned" : ""}${props.focus ? " is-focus" : ""}`} id={`bcard-${b.id}`}>
        <div className="card-top">
          <input type="checkbox" className="pinbox" checked={props.pinned} onChange={(e) => props.onPin(e.target.checked)} aria-label={`Pin ${b.name} to compare`} />
          <button type="button" className="badge-name" aria-expanded={props.open} aria-controls={`desc-${b.id}`} onClick={props.onToggle}>
            {b.name}
          </button>
          <span className="attrs">
            {b.operator === "SINGLE" ? c0.attribute : <>{c0.attribute} <OpChip op={b.operator} /> {b.conditions[1]!.attribute}</>}
          </span>
          <a className="card-link" href={`/builder?focus=${b.id}`}>Builder &rarr;</a>
        </div>
        <div className="tilerow">
          {TILE_ORDER.map((t) => <TierTile key={t} cond={c0} tier={t} onPick={props.onTile} />)}
          <span className="htchip">{b.minHeight}&ndash;{b.maxHeight}</span>
        </div>
      </div>
      <div className="descrow" id={`desc-${b.id}`} hidden={!props.open}>
        <div className="inner">
          <div className="desc-text">{b.description || "No description available."}</div>
          {props.crossing && <Crossings c={props.crossing} height={props.height} />}
        </div>
      </div>
    </>
  );
}

export function BadgesPanel(props: {
  height: Height | null;
  query: string;
  onQuery: (q: string) => void;
  attr: Attribute | null;
  onClearAttr: () => void;
  focusBadge: string | null;
  focusNotice: ReactNode;
  openDesc: Record<string, boolean>;
  onToggleDesc: (id: string) => void;
  crossings: Record<string, Crossing>;
  onTile: (id: string, c: Crossing) => void;
  pinned: string[];
  onPin: (id: string, on: boolean) => void;
}) {
  const [cat, setCat] = useState<Category | "all">("all");
  const q = props.query.trim().toLowerCase();
  const filtered = badges.filter(
    (b) =>
      (cat === "all" || badgeCategory(b) === cat) &&
      (!q || b.name.toLowerCase().includes(q) || b.conditions.some((c) => c.attribute.toLowerCase().includes(q))) &&
      isWithinHeight(props.height, b.minHeight, b.maxHeight) &&
      // exact match: "Speed" must not match "Speed With Ball"
      (!props.attr || b.conditions.some((c) => c.attribute === props.attr)),
  );
  const groups = CATEGORIES.map((c) => [c, filtered.filter((b) => badgeCategory(b) === c)] as const).filter(([, list]) => list.length);

  return (
    <>
      <div className="toolbar">
        <SearchBox id="badgeSearch" value={props.query} onChange={props.onQuery} placeholder="Search badges..." label="Search badges" />
        <div className="chips" role="group" aria-label="Filter by category">
          <button type="button" className={`chip${cat === "all" ? " is-on" : ""}`} aria-pressed={cat === "all"} onClick={() => setCat("all")}>All</button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip${cat === c ? " is-on" : ""}`}
              aria-pressed={cat === c}
              style={{ ["--sk" as string]: `var(--skill-${c})` }}
              onClick={() => setCat(c)}
            >
              <span className="cdot" aria-hidden="true" />
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <span className="resultcount" aria-live="polite">{filtered.length} of {badges.length} badges</span>
        {props.attr && (
          <span className="attr-filter">
            Keyed on <b>{props.attr}</b>
            <button type="button" aria-label="Clear attribute filter" onClick={props.onClearAttr}>&times;</button>
          </span>
        )}
        <div className="legend" aria-hidden="true">
          {TILE_ORDER.map((t) => (
            <span className="lg" key={t}><span className="sw" style={{ ["--lc" as string]: `var(--tier-${t})` }} />{TIER_LABEL[t]}</span>
          ))}
        </div>
      </div>
      {props.focusNotice}
      {groups.map(([c, list]) => (
        <div className="cat-group" key={c} style={{ ["--sk" as string]: `var(--skill-${c})` }}>
          <div className="cat-head">
            <span className="dot" aria-hidden="true" />
            <h3>{CATEGORY_LABEL[c]}</h3>
            <span className="count">{list.length}</span>
          </div>
          <div className="cardlist">
            {list.map((b) => (
              <BadgeCard
                key={b.id}
                b={b}
                focus={props.focusBadge === b.id}
                pinned={props.pinned.includes(b.id)}
                open={!!props.openDesc[b.id]}
                crossing={props.crossings[b.id]}
                height={props.height}
                onPin={(on) => props.onPin(b.id, on)}
                onToggle={() => props.onToggleDesc(b.id)}
                onTile={(c) => props.onTile(b.id, c)}
              />
            ))}
          </div>
        </div>
      ))}
      {filtered.length === 0 && <p className="noresults">No badges match your search.</p>}
    </>
  );
}
