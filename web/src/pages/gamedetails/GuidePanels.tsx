import { Fragment, useState } from "react";
import { controls, dribbleMoves, howToInputs, settings, tvEpisode, type HowToGuide } from "../../data/guides";
import { Tabs, type TabDef } from "../../components/Tabs";
import { ExtLink } from "../../shell/Layout";
import { live } from "../../shell/links";

/** Short reasons shown next to each recommended setting (summarized from 2KLab's settings FAQ). */
const SETTING_WHY: Record<string, React.ReactNode> = {
  "Shot Meter": <>2KLab&rsquo;s most important setting. Turning the meter off is a measured boost; see the <a href="/shooting#settings">Shooting guide</a>.</>,
  "Passive Dribble Hand Switches": "Stops your player switching dribble hands on their own when you release the left stick.",
  "Auto Lob to Moving Receiver": "Stops the primary pass button throwing contextual lobs to moving teammates.",
  "Camera Angle": "Start at Zoom 1 and Height 10, then adjust.",
};
const CAMERA_MODES = ["2K Legacy", "2K Low", "2K Wire", "Baseline", "Broadcast", "Broadcast Stadium", "Director's Cut", "Drive", "High", "Lower Bowl", "Rail", "Shot Clock", "Skybox"];

export function SettingsPanel() {
  return (
    <>
      <h2>Best Settings</h2>
      <p className="plead">Most settings can stay on defaults. These are the {settings.quick.length} 2KLab says are worth changing.</p>
      <div className="set-list" role="table" aria-label="Recommended settings">
        <div className="set-row set-head" role="row"><div role="columnheader">Setting</div><div role="columnheader">Our Pick</div><div role="columnheader">Why</div></div>
        {settings.quick.map(([name, pick]) => (
          <div className="set-row" role="row" key={name}>
            <div className="set-name" role="rowheader">{name}</div>
            <div className="set-pick" role="cell">{pick}</div>
            <div className="set-why" role="cell">{SETTING_WHY[name] ?? ""}</div>
          </div>
        ))}
      </div>
      <div className="camera">
        <div className="cam-pick">
          <span className="eyebrow">Camera &mdash; 2KLab&rsquo;s pick</span>
          <h3>2K Cam</h3>
          <p>Use it in every mode. Start at <b>Zoom 1, Height 10</b>, then adjust to taste. It gives the best view of the defense, passing lanes and rebounds.</p>
        </div>
        <div className="cam-modes">
          <span className="modelbl">Other modes</span>
          <ul><li>2K Cam <em>(recommended)</em></li>{CAMERA_MODES.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      </div>
      <p className="mediahint">From 2KLab&rsquo;s settings and camera pages. <ExtLink href={live("/nba2k-best-settings")}>Full settings guide</ExtLink></p>
    </>
  );
}

type Callout = { label: string; off: string; def: string; lead: [number, number, number, number]; x: number; y: number; side: "start" | "end" };
const CALLOUTS: Callout[] = [
  { label: "LT / L2", off: "Post Up", def: "Intense-D", lead: [338, 138, 150, 150], x: 150, y: 146, side: "end" },
  { label: "LB / L1", off: "Call Play", def: "Double Team", lead: [330, 160, 150, 210], x: 150, y: 206, side: "end" },
  { label: "Left Stick", off: "Move Player", def: "Move Player", lead: [372, 215, 150, 270], x: 150, y: 266, side: "end" },
  { label: "D-Pad", off: "On-the-Fly Coaching", def: "On-the-Fly Coaching", lead: [414, 302, 150, 330], x: 150, y: 326, side: "end" },
  { label: "RT / R2", off: "Sprint", def: "Sprint", lead: [582, 138, 770, 150], x: 770, y: 146, side: "start" },
  { label: "RB / R1", off: "Icon Pass", def: "Icon Swap", lead: [590, 160, 770, 210], x: 770, y: 206, side: "start" },
  { label: "Face Buttons", off: "Pass · Shoot · Lob", def: "Steal · Block · Swap", lead: [560, 222, 770, 270], x: 770, y: 266, side: "start" },
  { label: "Right Stick", off: "Pro Stick", def: "Pro Stick D", lead: [548, 285, 770, 330], x: 770, y: 326, side: "start" },
];

function Controller({ mode }: { mode: "off" | "def" }) {
  const pad = { fill: "var(--surface-raised)", stroke: "var(--border-strong)", strokeWidth: 2 };
  const btn = { fill: "var(--surface-hover)", stroke: "var(--border)", strokeWidth: 1.5 };
  const stick = { fill: "var(--surface-sunken)", stroke: "var(--border-strong)", strokeWidth: 2 };
  return (
    <svg className="controller" viewBox="0 0 920 400" role="img" aria-label={`NBA 2K27 controller layout, ${mode === "off" ? "offense" : "defense"}`}>
      <g className="pad">
        <rect x="320" y="170" width="280" height="150" rx="46" {...pad} />
        <rect x="250" y="240" width="150" height="120" rx="52" transform="rotate(24 325 300)" {...pad} />
        <rect x="520" y="240" width="150" height="120" rx="52" transform="rotate(-24 595 300)" {...pad} />
        <rect x="330" y="150" width="70" height="20" rx="10" {...btn} />
        <rect x="520" y="150" width="70" height="20" rx="10" {...btn} />
        <rect x="338" y="132" width="54" height="16" rx="8" {...btn} />
        <rect x="528" y="132" width="54" height="16" rx="8" {...btn} />
        <circle cx="372" cy="215" r="24" {...stick} />
        <circle cx="372" cy="215" r="13" {...btn} />
        <g {...btn}><rect x="404" y="276" width="20" height="52" rx="4" /><rect x="388" y="292" width="52" height="20" rx="4" /></g>
        <circle cx="548" cy="285" r="24" {...stick} />
        <circle cx="548" cy="285" r="13" {...btn} />
        <g className="face">
          <circle cx="548" cy="196" r="12" /><circle cx="576" cy="222" r="12" />
          <circle cx="520" cy="222" r="12" /><circle cx="548" cy="248" r="12" />
        </g>
      </g>
      {CALLOUTS.map((c) => (
        <Fragment key={c.label}>
          <line className="lead" x1={c.lead[0]} y1={c.lead[1]} x2={c.lead[2]} y2={c.lead[3]} />
          <g className="callout" textAnchor={c.side}>
            <text className="cb" x={c.x} y={c.y}>{c.label}</text>
            <text className="cm" x={c.x} y={c.y + 18}>{mode === "off" ? c.off : c.def}</text>
          </g>
        </Fragment>
      ))}
    </svg>
  );
}

export function ControlsPanel() {
  const [mode, setMode] = useState<"off" | "def">("off");
  return (
    <>
      <div className="ctrl-head">
        <div><h2>Controls</h2><p className="plead">The core mappings at a glance. Toggle between offense and defense.</p></div>
        <div className="odtoggle" role="group" aria-label="Situation">
          <button type="button" aria-pressed={mode === "off"} onClick={() => setMode("off")}>Offense</button>
          <button type="button" aria-pressed={mode === "def"} onClick={() => setMode("def")}>Defense</button>
        </div>
      </div>
      <div className="ctrl-wrap"><Controller mode={mode} /></div>
      <div className="tablewrap">
        <table className="reftable ctrl-table">
          <caption className="ctrl-cap">Full controller mapping (Xbox / PlayStation)</caption>
          <thead><tr>{controls.header.map((h) => <th scope="col" key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {controls.rows.map((r, i) =>
              r.length === 1 ? (
                <tr className="grp" key={i}><th colSpan={controls.header.length} scope="colgroup">{r[0]}</th></tr>
              ) : (
                <tr key={i}><th scope="row">{r[0]}</th>{r.slice(1).map((c, j) => <td key={j}>{c}</td>)}</tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <p className="mediahint">From 2KLab&rsquo;s controls page. <ExtLink href={live("/nba2k-controls")}>Full controls guide</ExtLink></p>
    </>
  );
}

type Guide = "dribble" | "dunk" | "pass" | "shoot" | "layups" | "post";
const GUIDES: TabDef<Guide>[] = (
  [["dribble", "How to Dribble"], ["dunk", "How to Dunk"], ["pass", "How to Pass"], ["shoot", "How to Shoot"], ["layups", "How to Layups"], ["post", "How to Post"]] as const
).map(([id, label]) => ({ id, label, tabId: `ht-t-${id}`, panelId: `ht-p-${id}` }));
const GUIDE_LINK: Record<Exclude<Guide, "shoot">, string> = {
  dribble: "/nba2k-how-to-dribble", dunk: "/nba2k-how-to-dunk", pass: "/nba2k-how-to-pass", layups: "/nba2k-layup-controls", post: "/nba2k-post-controls",
};

function MovesTable({ g }: { g: HowToGuide }) {
  return (
    <div className="tablewrap">
      <table className="reftable mini">
        <thead><tr><th scope="col">Move</th><th scope="col">Input (Xbox)</th></tr></thead>
        <tbody>{g.moves.map((m) => <tr key={m.name}><th scope="row">{m.name}</th><td>{m.input}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function HowToPanel() {
  const [g, setG] = useState<Guide>("dribble");
  const label = GUIDES.find((x) => x.id === g)!.label;
  const intro = (x: HowToGuide) => `${x.intro ? `${x.intro} ` : ""}${x.moves.length} moves.`;
  return (
    <>
      <h2>How-To Guides</h2>
      <p className="plead">Move lists and inputs for each part of the game, from 2KLab&rsquo;s control guides.</p>
      <div className="vcard">
        <Tabs tabs={GUIDES} selected={g} onSelect={setG} label="How-to guide" className="vtabs" vertical />
        <div className="vcontent">
          <div className="vpanel" role="tabpanel" id={`ht-p-${g}`} aria-labelledby={`ht-t-${g}`}>
            <div className="vp-head">
              <h3>{label}</h3>
              {g === "shoot"
                ? <a className="vp-more" href="/shooting">Shooting guide &rarr;</a>
                : <ExtLink className="vp-more" href={live(GUIDE_LINK[g])}>Full guide &rarr;</ExtLink>}
            </div>
            {g === "dribble" && (
              <>
                <p className="vp-intro">
                  All {dribbleMoves.moves.length} dribble moves in 2KLab&rsquo;s guide. The guide shows each move&rsquo;s stick motion as an
                  animated diagram, so the inputs live there.
                </p>
                <ul className="move-chips">{dribbleMoves.moves.map((m) => <li key={m}>{m}</li>)}</ul>
              </>
            )}
            {g === "shoot" && (
              <>
                <p className="vp-intro">Shooting has its own guide on this site: green windows, what moves them, release speed, ratings, badges and practice, with 2KLab&rsquo;s measurements.</p>
                <p><a className="il-strong" href="/shooting">Open the Shooting guide &rarr;</a></p>
              </>
            )}
            {(g === "dunk" || g === "pass" || g === "layups" || g === "post") && (
              <>
                <p className="vp-intro">{intro(howToInputs[g])}</p>
                <MovesTable g={howToInputs[g]} />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function TvPanel() {
  return (
    <>
      <h2>2KTV Answers</h2>
      <p className="plead">Correct answers to the current 2KTV episode for free VC. Updated as each new episode airs.</p>
      <div className="qa-head"><span className="eyebrow">Episode {tvEpisode.episodeIndex} &middot; snapshot, 24 Sep 2026</span></div>
      <div className="qa-list">
        {tvEpisode.question.map((q, i) => (
          <div className="qa" key={i}><div className="q">{q}</div><div className="a">{tvEpisode.answer[i]}</div></div>
        ))}
      </div>
      <p className="mediahint">Answers change with each episode; this is a snapshot of 2KLab&rsquo;s page. <ExtLink href={live("/2ktv-answers")}>Current answers</ExtLink></p>
    </>
  );
}
