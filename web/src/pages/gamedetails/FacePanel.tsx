import { useState } from "react";
import { faceCreations, type FacePlayer } from "../../data/faceCreations";
import { SearchBox } from "../../components/SearchBox";
import { Tabs, type TabDef } from "../../components/Tabs";
import { ExtLink } from "../../shell/Layout";

type Group = "current" | "legend";
const { players, sections, credit } = faceCreations;
const count = (g: Group) => players.filter((p) => p.category === g).length;
const GROUPS: TabDef<Group>[] = [
  { id: "current", label: `Current Players (${count("current")})`, tabId: "face-t-current", panelId: "face-list" },
  { id: "legend", label: `Legends (${count("legend")})`, tabId: "face-t-legend", panelId: "face-list" },
];

/** A value as published. A trailing ⚠️ is kept and marked, since 2KLab shows it without saying why. */
function Value({ v }: { v: string | null | undefined }) {
  if (v == null || v === "") return <span className="fv-none">&mdash;</span>;
  const m = /^(.*?)\s*⚠️?$/u.exec(v);
  if (!m) return <>{v}</>;
  return (
    <>
      {m[1]} <span className="fv-flag" title="Marked with a warning sign in 2KLab's data (not explained there)">&#9888;<span className="sr-only"> (flagged in the source)</span></span>
    </>
  );
}

function Settings({ p }: { p: FacePlayer }) {
  return (
    <div className="face-settings" id={`face-${p.id}`}>
      {sections.map((s) => {
        const vals = p.sections[s.key] ?? {};
        return (
          <section className="fs" key={s.key}>
            <h4>{s.title} <span className="fs-preset"><Value v={vals.preset} /></span></h4>
            {s.fields.length > 0 && (
              <dl>
                {s.fields.filter((f) => f.key in vals).map((f) => (
                  <div key={f.key}><dt>{f.label}</dt><dd><Value v={vals[f.key]} /></dd></div>
                ))}
              </dl>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function FacePanel() {
  const [group, setGroup] = useState<Group>("current");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  // A search looks across both groups, as on 2KLab's page.
  const list = players.filter((p) => (q ? p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q) : p.category === group));

  return (
    <>
      <h2>Face Creations</h2>
      <p className="plead">
        Face creator settings for {players.length} NBA players and legends. Pick a player to see every setting, section by section.
      </p>
      <div className="face-credit">
        <span>Tutorials by <b>{credit.name}</b>, published on 2KLab.</span>
        {credit.tiktok && <ExtLink href={credit.tiktok}>{credit.name} on TikTok</ExtLink>}
        {credit.youtube && <ExtLink href={credit.youtube}>{credit.name} on YouTube</ExtLink>}
      </div>
      <div className="face-tools">
        <Tabs tabs={GROUPS} selected={group} onSelect={(g) => { setGroup(g); setQuery(""); }} label="Player type" className="seg face-tabs" />
        <SearchBox id="faceSearch" value={query} onChange={setQuery} placeholder="Search players or teams" label="Search players" />
      </div>
      <p className="resultcount" role="status">
        {q ? `${list.length} result${list.length === 1 ? "" : "s"} across both groups for “${query.trim()}”` : `${list.length} players`}
      </p>
      <div className="facegrid" id="face-list" role="tabpanel" aria-labelledby={q ? undefined : `face-t-${group}`}>
        {list.map((p) => {
          const isOpen = open === p.id;
          return (
            <article className={`face-card${isOpen ? " is-open" : ""}`} key={p.id}>
              <div className="portrait">
                {p.image
                  ? <img src={`${p.image}?w=900&h=506&fit=crop&auto=format`} alt={`${p.name} face creation`} loading="lazy" width={800} height={450} />
                  : <span className="noimg">No image published</span>}
              </div>
              <div className="face-meta">
                <h3 className="face-name">{p.name}</h3>
                <span className="face-sub">{p.category === "legend" ? "Legend · " : ""}{p.team} &middot; {p.years}</span>
                <button type="button" className="face-cta" aria-expanded={isOpen} aria-controls={`face-${p.id}`} onClick={() => setOpen(isOpen ? null : p.id)}>
                  {isOpen ? "Hide settings" : "Show settings"}
                </button>
              </div>
              {isOpen && <Settings p={p} />}
            </article>
          );
        })}
        {list.length === 0 && <p className="noresults">No players match your search.</p>}
      </div>
      <p className="mediahint">
        Settings as published on 2KLab, captured {faceCreations.captured}. A &#9888; next to a value is carried over from 2KLab&rsquo;s data, which doesn&rsquo;t say what it means.{" "}
        <ExtLink href={faceCreations.source}>Face Creations on 2KLab</ExtLink>
      </p>
    </>
  );
}
