import { useMemo, useState } from "react";
import { badges } from "../../data/badges";
import { blueprints } from "../../data/blueprints";
import { takeovers } from "../../data/takeovers";
import {
  ATTRIBUTES, ATTRIBUTE_CATEGORY, CATEGORIES, CATEGORY_LABEL, TIER_LABEL, atLeast, badgeCategory, badgeTier,
  blueprintStartingBuild, formatPotential, takeoverUnlocked,
  type Attribute, type Blueprint, type Category, type Position, type Tier,
} from "../../domain";

const POSITIONS: ("All" | Position)[] = ["All", "PG", "SG", "SF", "PF", "C"];
type Sort = "potential" | "attr" | "badges" | "takeovers";
const SORTS: { id: Sort; label: string }[] = [
  { id: "potential", label: "Potential" },
  { id: "attr", label: "Attribute" },
  { id: "badges", label: "Badges" },
  { id: "takeovers", label: "Takeovers" },
];
const ABBR: Record<Attribute, string> = {
  "Close Shot": "CLS", "Driving Layup": "LAY", "Driving Dunk": "DNK", "Standing Dunk": "SDK", "Post Control": "PST",
  "Mid-Range Shot": "MID", "Three-Point Shot": "3PT", "Free Throw": "FT", "Pass Accuracy": "PAS", "Ball Handle": "BH",
  "Speed With Ball": "SWB", "Interior Defense": "INT", "Perimeter Defense": "PER", "Steal": "STL", "Block": "BLK",
  "Offensive Rebound": "ORB", "Defensive Rebound": "DRB", "Speed": "SPD", "Agility": "AGL", "Strength": "STR", "Vertical": "VRT",
};

/**
 * Every metric is computed at each archetype's starting build, the same values the Builder
 * loads, with the Builder's exact rules (height gate included).
 */
const STATS = blueprints.map((bp) => {
  const build = blueprintStartingBuild(bp);
  const a = build.attributes as Record<Attribute, number>;
  return {
    bp,
    a,
    tiers: new Map(badges.map((b) => [b.id, badgeTier(b, build)])),
    takeovers: new Set(takeovers.filter((t) => takeoverUnlocked(t, build)).map((t) => t.id)),
    top: [...ATTRIBUTES].sort((x, y) => a[y] - a[x] || x.localeCompare(y)).slice(0, 3),
  };
});

export function BlueprintsPanel() {
  const [pos, setPos] = useState<(typeof POSITIONS)[number]>("All");
  const [sort, setSort] = useState<Sort>("potential");
  const [attr, setAttr] = useState<Attribute>("Three-Point Shot");
  const [tier, setTier] = useState<Tier>("gold");
  const [cat, setCat] = useState<Category | "all">("all");
  const [tk, setTk] = useState("");

  const list = useMemo(() => {
    const metric = (s: (typeof STATS)[number]): { v: number; label: React.ReactNode | null } => {
      if (sort === "attr") return { v: s.a[attr], label: <>{attr} <span>{s.a[attr]}</span></> };
      if (sort === "badges") {
        const n = badges.filter((b) => (cat === "all" || badgeCategory(b) === cat) && atLeast(s.tiers.get(b.id)!, tier)).length;
        return {
          v: n,
          label: <>{n} badge{n === 1 ? "" : "s"} <span>{TIER_LABEL[tier]}{tier === "hof" ? "" : "+"}{cat === "all" ? "" : ` · ${CATEGORY_LABEL[cat]}`}</span></>,
        };
      }
      if (sort === "takeovers") return { v: s.takeovers.size, label: <>{s.takeovers.size} <span>of {takeovers.length} takeovers</span></> };
      return { v: s.bp.potentialOverall ?? -1, label: null };
    };
    const tkFilter = sort === "takeovers" ? tk : "";
    return STATS.filter((s) => (pos === "All" || s.bp.position === pos) && (!tkFilter || s.takeovers.has(tkFilter)))
      .map((s) => ({ s, m: metric(s) }))
      // ties sort alphabetically
      .sort((x, y) => y.m.v - x.m.v || x.s.bp.archetype.localeCompare(y.s.bp.archetype));
  }, [pos, sort, attr, tier, cat, tk]);

  return (
    <>
      <div className="src-banner official">
        <span className="src-tag">Official &middot; from 2K</span>
        <p>
          The 40 archetypes 2K designed for MyPLAYER. 2KLab publishes a full attribute range and potential overall for 9 of
          them; the other 31 list a starting build only, shown here as &ldquo;&mdash;&rdquo;.
        </p>
      </div>
      <div className="bp-controls">
        <div className="bp-toolbar" role="group" aria-label="Filter by position">
          {POSITIONS.map((p) => (
            <button key={p} type="button" className="chip" aria-pressed={p === pos} onClick={() => setPos(p)}>{p}</button>
          ))}
        </div>
        <div className="sortbar">
          <span className="sort-lbl" id="sortLbl">Sort by</span>
          <div className="seg" role="group" aria-labelledby="sortLbl">
            {SORTS.map((s) => (
              <button key={s.id} type="button" aria-pressed={s.id === sort} onClick={() => setSort(s.id)}>{s.label}</button>
            ))}
          </div>
          {sort === "attr" && (
            <div className="sort-ctx">
              <label>Attribute{" "}
                <select value={attr} onChange={(e) => setAttr(e.target.value as Attribute)}>
                  {CATEGORIES.map((c) => (
                    <optgroup key={c} label={CATEGORY_LABEL[c]}>
                      {ATTRIBUTES.filter((a) => ATTRIBUTE_CATEGORY[a] === c).map((a) => <option key={a}>{a}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>
          )}
          {sort === "badges" && (
            <div className="sort-ctx">
              <label>Tier{" "}
                <select value={tier} onChange={(e) => setTier(e.target.value as Tier)}>
                  <option value="hof">Hall of Fame</option>
                  <option value="gold">Gold or better</option>
                  <option value="silver">Silver or better</option>
                  <option value="bronze">Bronze or better</option>
                </select>
              </label>
              <label>Category{" "}
                <select value={cat} onChange={(e) => setCat(e.target.value as Category | "all")}>
                  <option value="all">All categories</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </select>
              </label>
            </div>
          )}
          {sort === "takeovers" && (
            <div className="sort-ctx">
              <label>Takeover{" "}
                <select value={tk} onChange={(e) => setTk(e.target.value)}>
                  <option value="">Most unlocked</option>
                  {takeovers.filter((t) => t.operator !== "ALWAYS").map((t) => <option key={t.id} value={t.id}>{t.name} only</option>)}
                </select>
              </label>
            </div>
          )}
        </div>
        <p className="basis">
          Ratings, badges and takeovers are worked out at each archetype&rsquo;s starting build, the same values the Builder
          loads. Badges respect each badge&rsquo;s height range.
        </p>
      </div>
      <div className="bp-count-row"><span className="bp-count" role="status">{list.length} archetype{list.length === 1 ? "" : "s"}</span></div>
      <div className="bp-grid">
        {list.map(({ s, m }) => <BlueprintCard key={s.bp.id} bp={s.bp} a={s.a} top={s.top} metric={m.label} />)}
        {list.length === 0 && <p className="basis">No archetypes match these filters.</p>}
      </div>
    </>
  );
}

function BlueprintCard(props: { bp: Blueprint; a: Record<Attribute, number>; top: Attribute[]; metric: React.ReactNode | null }) {
  const { bp } = props;
  return (
    <article className="bp-card" style={{ ["--sk" as string]: `var(--skill-${bp.bestSkill.toLowerCase()})` }}>
      <div className="bp-top">
        <h3 className="bp-name">{bp.archetype}</h3>
        <span className={`bp-pot${bp.potentialOverall == null ? " unpub" : ""}`} title={bp.potentialOverall == null ? "Not published by 2KLab" : "Potential overall"}>
          {formatPotential(bp)}
          <span className="sr-only">{bp.potentialOverall == null ? " (potential not published)" : " potential"}</span>
        </span>
      </div>
      <div className="bp-skill">{bp.bestSkill}</div>
      {props.metric && <div className="bp-metric">{props.metric}</div>}
      <div className="bp-meta">{bp.position} &middot; {bp.height} &middot; {bp.weight} lbs &middot; {bp.wingspan} wingspan</div>
      <div className="bp-top3" aria-label="Top starting ratings">
        {props.top.map((k) => <span key={k} title={k}>{ABBR[k]} <b>{props.a[k]}</b></span>)}
      </div>
      {bp.comparisons.length > 0 && <div className="bp-comps">Plays like {bp.comparisons.join(", ")}</div>}
      <a className="bp-link" href={`builder.html?preset=blueprint:${encodeURIComponent(bp.id)}`}>Explore in Builder &rarr;</a>
    </article>
  );
}
