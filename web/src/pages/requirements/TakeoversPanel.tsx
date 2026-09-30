import { useState } from "react";
import { takeovers } from "../../data/takeovers";
import { ATTRIBUTE_CATEGORY, type Takeover } from "../../domain";
import { OpChip } from "../../components/OpChip";
import { SearchBox } from "../../components/SearchBox";

const ORDER = ["Shooting", "Finishing", "Playmaking", "Defense", "Rebounding", "Universal"];
const groupColor = (cat: string) => (cat === "Universal" ? "var(--text-subtle)" : `var(--skill-${cat.toLowerCase()})`);

function Requirement({ t }: { t: Takeover }) {
  if (t.operator === "ALWAYS") return <span className="req-pill always">Always available</span>;
  const op = t.operator;
  return (
    <>
      {t.conditions.map((c, i) => (
        <span key={c.attribute} style={{ display: "contents" }}>
          {i > 0 && op !== "SINGLE" && <OpChip op={op} />}
          <span className="req-pill" style={{ ["--sk" as string]: `var(--skill-${ATTRIBUTE_CATEGORY[c.attribute]})` }}>
            <b>{c.min}</b> {c.attribute}
          </span>
        </span>
      ))}
    </>
  );
}

export function TakeoversPanel({ focusTakeover }: { focusTakeover: string | null }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const list = takeovers.filter(
    (t) =>
      !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) ||
      t.conditions.some((c) => c.attribute.toLowerCase().includes(q)) || t.summary.toLowerCase().includes(q),
  );
  const always = takeovers.filter((t) => t.operator === "ALWAYS").length;
  return (
    <>
      <p className="panel-lede">
        All {takeovers.length} takeovers. {always} are always available; the other {takeovers.length - always} unlock at an
        attribute rating. No height requirements are published for takeovers.
      </p>
      <div className="toolbar">
        <SearchBox id="tkSearch" value={query} onChange={setQuery} placeholder="Search takeovers or attributes..." label="Search takeovers" />
        <span className="resultcount" aria-live="polite">{list.length} of {takeovers.length} takeovers</span>
      </div>
      {ORDER.map((cat) => {
        const items = list.filter((t) => t.category === cat);
        if (!items.length) return null;
        return (
          <div className="cat-group" key={cat} style={{ ["--sk" as string]: groupColor(cat) }}>
            <div className="cat-head">
              <span className="dot" aria-hidden="true" />
              <h3>{cat}</h3>
              <span className="count">{items.length}</span>
            </div>
            <div className="cardlist">
              {items.map((t) => (
                <article className={`tk-card${focusTakeover === t.id ? " is-focus" : ""}`} id={`tk-${t.id}`} key={t.id}>
                  <h4 className="tk-name">{t.name}</h4>
                  <div className="tk-req"><Requirement t={t} /></div>
                  <div className="tk-desc">{t.summary}{t.detail && <span>{t.detail}</span>}</div>
                </article>
              ))}
            </div>
          </div>
        );
      })}
      {list.length === 0 && <p className="noresults">No takeovers match your search.</p>}
    </>
  );
}
