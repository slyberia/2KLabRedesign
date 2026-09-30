import { useState } from "react";
import { animations } from "../../data/animations";
import { ATTRIBUTE_CATEGORY, SUBTYPES, SUBTYPE_LABEL, isWithinHeight, type Animation, type Attribute, type Height } from "../../domain";
import { OpChip } from "../../components/OpChip";
import { SearchBox } from "../../components/SearchBox";

const PAGE_SIZE = 25;

export function ThresholdPills({ a }: { a: Animation }) {
  const entries = Object.entries(a.thresholds) as [Attribute, number][];
  return (
    <>
      {entries.map(([attr, v], i) => (
        <span key={attr}>
          {i > 0 && a.operator !== "SINGLE" && <OpChip op={a.operator} />}
          <span className="thresh-pill">
            <span className="dot" style={{ ["--sk" as string]: `var(--skill-${ATTRIBUTE_CATEGORY[attr]})` }} />
            {attr} {v}+
          </span>
        </span>
      ))}
    </>
  );
}

export function AnimationsPanel(props: { height: Height | null; pinned: string[]; onPin: (id: string, on: boolean) => void }) {
  const [subtype, setSubtype] = useState<Animation["subtype"]>("jumper");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const q = query.trim().toLowerCase();
  const filtered = animations.filter(
    (a) =>
      a.subtype === subtype &&
      (!q || a.animationName.toLowerCase().includes(q) || (a.packageLabel ?? "").toLowerCase().includes(q)) &&
      isWithinHeight(props.height, a.minHeight, a.maxHeight),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <>
      <div className="subtabs" role="group" aria-label="Animation type">
        {SUBTYPES.map((s) => (
          <button key={s} type="button" className="subtab" aria-pressed={s === subtype} onClick={() => { setSubtype(s); setPage(0); }}>
            {SUBTYPE_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <SearchBox id="animSearch" value={query} onChange={(v) => { setQuery(v); setPage(0); }} placeholder="Search animations..." label="Search animations" />
        <span className="resultcount" aria-live="polite">{filtered.length} {SUBTYPE_LABEL[subtype].toLowerCase()}</span>
      </div>
      <div className="tablewrap">
        <table className="animtbl">
          <thead>
            <tr><th><span className="sr-only">Pin</span></th><th>Animation</th><th>Requirement</th><th>Height</th></tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((a) => (
              <tr key={a.id}>
                <td>
                  <input type="checkbox" className="pinbox" checked={props.pinned.includes(a.id)} onChange={(e) => props.onPin(a.id, e.target.checked)} aria-label={`Pin ${a.animationName} to compare`} />
                </td>
                <td>
                  <span className="anim-name">{a.animationName}</span>
                  {a.packageLabel && <div className="anim-pkg">{a.packageLabel}</div>}
                </td>
                <td><ThresholdPills a={a} /></td>
                <td className="htcell">{a.minHeight}&ndash;{a.maxHeight}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="noresults">No animations match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>&larr; Prev</button>
        <span className="pageinfo">Page {current + 1} of {pages}</span>
        <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next &rarr;</button>
      </div>
    </>
  );
}
