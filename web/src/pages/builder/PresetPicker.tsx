import { useState } from "react";
import { blueprints } from "../../data/blueprints";
import { players } from "../../data/players";
import { formatPotential, type Blueprint, type Player } from "../../domain";

const PLAYERS_SHOWN = 60;

function PickerSearch(props: { id: string; value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <div className="picker-search">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 10-.7.7l.27.28v.79l5 5 1.5-1.5-5-5zm-6 0A4.5 4.5 0 1114 9.5 4.5 4.5 0 019.5 14z" />
      </svg>
      <input type="search" id={props.id} value={props.value} placeholder={props.placeholder} aria-label={props.label} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  );
}

export function BlueprintGrid(props: { activeId: string | null; onLoad: (bp: Blueprint) => void }) {
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  const list = blueprints.filter(
    (b) => !s || b.archetype.toLowerCase().includes(s) || b.position.toLowerCase().includes(s) || b.bestSkill.toLowerCase().includes(s),
  );
  return (
    <>
      <PickerSearch id="bpSearch" value={q} onChange={setQ} placeholder="Search archetypes or position..." label="Search blueprints" />
      <div className="picker-grid">
        {list.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`preset-card${props.activeId === b.id ? " active" : ""}`}
            aria-pressed={props.activeId === b.id}
            style={{ ["--sk" as string]: `var(--skill-${b.bestSkill.toLowerCase()})` }}
            onClick={() => props.onLoad(b)}
          >
            <span className={`po${b.potentialOverall == null ? " unpub" : ""}`} aria-label={b.potentialOverall == null ? "Potential not published" : `Potential ${b.potentialOverall}`}>
              {formatPotential(b)}
            </span>
            <div className="pn">{b.archetype}</div>
            <div className="pm">{b.position} &middot; {b.height} &middot; {b.bestSkill}</div>
          </button>
        ))}
        {list.length === 0 && <p className="derived-empty" style={{ gridColumn: "1/-1" }}>No archetypes match.</p>}
      </div>
    </>
  );
}

export function PlayerGrid(props: { activeId: number | null; onLoad: (p: Player) => void }) {
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  const matches = players.filter((p) => !s || p.name.toLowerCase().includes(s) || p.team.toLowerCase().includes(s));
  const list = matches.slice(0, PLAYERS_SHOWN);
  return (
    <>
      <PickerSearch id="plSearch" value={q} onChange={setQ} placeholder="Search players or team..." label="Search players" />
      <div className="picker-grid">
        {list.map((p) => (
          <button
            key={p.playerId}
            type="button"
            className={`preset-card${props.activeId === p.playerId ? " active" : ""}`}
            aria-pressed={props.activeId === p.playerId}
            onClick={() => props.onLoad(p)}
          >
            <span className="po" aria-label={`Overall ${p.overall}`}>{p.overall}</span>
            <div className="pn">{p.name}</div>
            <div className="pm">{p.position} &middot; {p.height} &middot; {p.team}</div>
          </button>
        ))}
        {list.length === 0 && <p className="derived-empty" style={{ gridColumn: "1/-1" }}>No players match. Try a full or partial name.</p>}
      </div>
      {matches.length > PLAYERS_SHOWN && (
        <p className="picker-more">Showing {PLAYERS_SHOWN} of {matches.length} players. Search to narrow the list.</p>
      )}
    </>
  );
}
