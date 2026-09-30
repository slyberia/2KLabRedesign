import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { capBreakers } from "../../data/capBreakers";
import { crewRewards } from "../../data/crewRewards";
import { lifetimeRewards } from "../../data/lifetimeRewards";
import { repRewards } from "../../data/repRewards";
import { seasonRewards } from "../../data/seasonRewards";
import { starterRewards } from "../../data/starterRewards";
import { crewRoadmap, earnedUpTo, lifetimeRoadmap, repRoadmap, tallyCapBreakers, type RoadmapNode } from "../../domain";
import { Tabs, type TabDef } from "../../components/Tabs";
import { useAccount } from "../../shell/account";
import { initialParams, replaceUrl } from "../../lib/url";
import { useProgress, type Progress, type SaveStatus } from "../../lib/progress";

type Track = "rep" | "lifetime" | "capb" | "crew" | "season" | "starter";
const TRACKS: TabDef<Track>[] = [
  { id: "rep", label: "REP", tabId: "rw-t-rep", panelId: "rw-p-rep" },
  { id: "lifetime", label: "Lifetime Challenges", tabId: "rw-t-lifetime", panelId: "rw-p-lifetime" },
  { id: "capb", label: "Cap Breakers", tabId: "rw-t-capb", panelId: "rw-p-capb" },
  { id: "crew", label: "Crew", tabId: "rw-t-crew", panelId: "rw-p-crew" },
  { id: "season", label: "Season", tabId: "rw-t-season", panelId: "rw-p-season" },
  { id: "starter", label: "Starter Challenges", tabId: "rw-t-starter", panelId: "rw-p-starter" },
];
/** The public URL name for the Cap Breakers track (?track=cap-breakers). */
const toParam = (t: Track) => (t === "capb" ? "cap-breakers" : t);
const fromParam = (s: string | null): Track | null => {
  const t = s === "cap-breakers" ? "capb" : s;
  return TRACKS.some((x) => x.id === t) ? (t as Track) : null;
};

const ROADMAPS = { rep: repRoadmap(repRewards), lifetime: lifetimeRoadmap(lifetimeRewards), crew: crewRoadmap(crewRewards) };
const cbTotal = (nodes: RoadmapNode[]) => nodes.reduce((n, x) => n + x.capBreakers, 0);

export function RewardsPanel() {
  const [track, setTrack] = useState<Track>(() => fromParam(initialParams().get("track")) ?? "rep");
  const progress = useProgress();
  const select = (t: Track) => {
    setTrack(t);
    replaceUrl(new URLSearchParams({ track: toParam(t) }), "rewards");
  };
  return (
    <>
      <h2>Rewards</h2>
      <p className="plead">Every MyCAREER progression track and what it pays out. Mark where you are on a roadmap and the Cap Breakers tab adds up what you&rsquo;ve earned.</p>
      <div className="vcard rw">
        <Tabs tabs={TRACKS} selected={track} onSelect={select} label="Reward track" className="vtabs" vertical />
        <div className="vcontent">
              <div className="vpanel" role="tabpanel" id="rw-p-rep" aria-labelledby="rw-t-rep" hidden={track !== "rep"}>
                <RoadmapTrack p={progress} k="rep" title="REP" intro={repRewards.intro} nodes={ROADMAPS.rep} label="Your REP level"
                  nameOf={(n) => `${n.group} ${n.label}`}
                  status={(i) => `${ROADMAPS.rep[i]!.group} ${ROADMAPS.rep[i]!.label} · ${earnedUpTo(ROADMAPS.rep, i)} of ${cbTotal(ROADMAPS.rep)} Cap Breakers`} />
              </div>
              <div className="vpanel" role="tabpanel" id="rw-p-lifetime" aria-labelledby="rw-t-lifetime" hidden={track !== "lifetime"}>
                <RoadmapTrack p={progress} k="lifetime" title="Lifetime Challenges" intro={lifetimeRewards.intro} nodes={ROADMAPS.lifetime} label="Lifetime Challenges completed"
                  nameOf={(n) => `${n.label} challenges`} sub="challenges"
                  status={(i) => `${ROADMAPS.lifetime[i]!.label} challenges · ${i + 1} of ${ROADMAPS.lifetime.length} rewards`} />
                <h4 className="rw-sub">All {lifetimeRewards.sections.reduce((n, s) => n + s.count, 0)} challenges, by section</h4>
                <ul className="rw-sections">{lifetimeRewards.sections.map((s) => <li key={s.name}>{s.name}<b>{s.count}</b></li>)}</ul>
                {lifetimeRewards.note && <p className="rw-intro" style={{ marginTop: ".8rem" }}>{lifetimeRewards.note}</p>}
              </div>
              <div className="vpanel" role="tabpanel" id="rw-p-capb" aria-labelledby="rw-t-capb" hidden={track !== "capb"}>
                <CapBreakersTrack p={progress} goTo={(t) => { select(t); requestAnimationFrame(() => document.getElementById(`rw-t-${t}`)?.focus()); }} />
              </div>
              <div className="vpanel" role="tabpanel" id="rw-p-crew" aria-labelledby="rw-t-crew" hidden={track !== "crew"}>
                <RoadmapTrack p={progress} k="crew" title="Crew" intro={crewRewards.intro.replace(/ The tiles below.*$/, "")} nodes={ROADMAPS.crew} label="Your Crew level"
                  nameOf={(n) => `Level ${n.label}`} sub="level" kinds={crewRewards.ladder.map((l) => l.kind)}
                  status={(i) => `Level ${ROADMAPS.crew[i]!.label} · ${earnedUpTo(ROADMAPS.crew, i)} of ${cbTotal(ROADMAPS.crew)} Cap Breakers`} />
              </div>
              <div className="vpanel" role="tabpanel" id="rw-p-season" aria-labelledby="rw-t-season" hidden={track !== "season"}>
                <SeasonTrack />
              </div>
              <div className="vpanel" role="tabpanel" id="rw-p-starter" aria-labelledby="rw-t-starter" hidden={track !== "starter"}>
                <StarterTrack p={progress} />
              </div>
        </div>
      </div>
      <SaveLine status={progress.status} />
    </>
  );
}

function SaveLine({ status }: { status: SaveStatus }) {
  const { signIn } = useAccount();
  let text: ReactNode;
  switch (status.kind) {
    case "local": text = "Your marked progress is kept in this browser."; break;
    case "local-signin":
      text = <>Your marked progress is kept in this browser. <button type="button" className="linkbtn" onClick={() => signIn()}>Sign in</button> to save it to your account.</>;
      break;
    case "syncing": text = "Syncing with your account…"; break;
    case "saving": text = "Saving…"; break;
    case "saved": text = `Saved to your demo account, ${status.name}.`; break;
    case "error": text = status.message; break;
  }
  return <p className="rw-save" aria-live="polite">{text}</p>;
}

function TrackHead(props: { title: string; status: string; intro?: string; onClear?: () => void }) {
  return (
    <>
      <div className="rw-head"><h3>{props.title}</h3><span className="rw-status" aria-live="polite">{props.status}</span></div>
      {props.intro && <p className="rw-intro">{props.intro}</p>}
      {props.onClear && (
        <div className="rw-tools">
          <span>Click where you are now. Everything before it counts as reached.</span>
          <button type="button" className="rw-btn" onClick={props.onClear}>Clear</button>
        </div>
      )}
    </>
  );
}

/** A roadmap is one radio group: one tab stop, arrow keys move and select, Home/End jump. */
function RoadmapTrack(props: {
  p: Progress;
  k: "rep" | "lifetime" | "crew";
  title: string;
  intro: string;
  nodes: RoadmapNode[];
  label: string;
  nameOf: (n: RoadmapNode) => string;
  status: (i: number) => string;
  sub?: string;
  kinds?: string[];
}) {
  const { nodes } = props;
  const pos = props.p.get(props.k);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const groups = useMemo(() => {
    const out: { name: string; items: number[] }[] = [];
    nodes.forEach((n, i) => {
      const last = out[out.length - 1];
      if (!last || last.name !== n.group) out.push({ name: n.group, items: [i] });
      else last.items.push(i);
    });
    return out;
  }, [nodes]);
  const choose = (i: number, focus: boolean) => {
    props.p.set(props.k, i);
    if (focus) refs.current[i]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    let to: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") to = Math.min(nodes.length - 1, i + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") to = Math.max(0, i - 1);
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = nodes.length - 1;
    if (to == null) return;
    e.preventDefault();
    choose(to, true);
  };
  const tabStop = pos ?? 0;
  return (
    <>
      <TrackHead title={props.title} status={pos == null ? "" : props.status(pos)} intro={props.intro} onClear={() => props.p.set(props.k, null)} />
      <div className="rw-body">
        <div role="radiogroup" aria-label={props.label}>
          {groups.map((g, gi) => (
            <div className="rm-tier" key={gi}>
              {g.name && <div className="rm-tier-name">{g.name}</div>}
              <ol className="rm-row">
                {g.items.map((i) => {
                  const n = nodes[i]!;
                  const reached = pos != null && i <= pos;
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        role="radio"
                        ref={(el) => { refs.current[i] = el; }}
                        className={`rm-node${reached ? " reached" : ""}${n.pending ? " pending" : ""}`}
                        aria-checked={pos === i}
                        tabIndex={i === tabStop ? 0 : -1}
                        aria-label={`${props.nameOf(n)}: ${n.rewards.join("; ")}${reached ? ". Reached" : ""}`}
                        onClick={() => choose(i, true)}
                        onKeyDown={(e) => onKey(e, i)}
                      >
                        <span className="rm-chip"><b>{n.label}</b><small>{props.sub ?? n.group}</small></span>
                        <span className="rm-rewards">
                          {n.rewards.map((r, ri) => <span key={ri} className={n.capBreakers && n.rewards.length === 1 ? "cb-line" : undefined}>{r}</span>)}
                          {props.kinds?.[i] && <span className="rm-kind">{props.kinds[i]}</span>}
                          {n.capBreakers > 0 && n.rewards.length > 1 && (
                            <span className="rm-cb">+{n.capBreakers} Cap Breaker{n.capBreakers > 1 ? "s" : ""}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/** Cap Breakers are derived from the roadmaps (and two controls), never ticked by hand. */
function CapBreakersTrack({ p, goTo }: { p: Progress; goTo: (t: Track) => void }) {
  const rep = p.get("rep"), lifetime = p.get("lifetime"), crew = p.get("crew"), spec9 = p.get("spec9"), seasons = p.get("seasons");
  const tally = tallyCapBreakers({ rep, lifetime, crew, spec9, seasons }, ROADMAPS, capBreakers);
  const track = (name: string) => capBreakers.tracks.find((t) => t.name === name)!;
  const plusRef = useRef<HTMLButtonElement>(null);
  const minusRef = useRef<HTMLButtonElement>(null);
  const setSeasons = (d: number) => {
    const v = Math.max(0, Math.min(9, seasons + d));
    p.set("seasons", v);
    // keep focus on a usable stepper button when one end disables
    requestAnimationFrame(() => ((d > 0 && v >= 9) || (d < 0 && v <= 0) ? (d > 0 ? minusRef : plusRef) : d > 0 ? plusRef : minusRef).current?.focus());
  };
  const from = (pos: number | null, notSet: string, set: (i: number) => string, t: Track) => (
    <>
      {pos == null ? "Not set. " : `${set(pos)}. `}
      <button type="button" className="linkbtn" onClick={() => goTo(t)}>{pos == null ? notSet : "Change"}</button>
    </>
  );
  const sources: { name: string; got: number; of: number; how: ReactNode; ctrl?: ReactNode }[] = [
    { name: "REP Track", got: tally.rep, of: track("REP Track").stated,
      how: from(rep, "Mark your REP level", (i) => `From your REP level, ${ROADMAPS.rep[i]!.group} ${ROADMAPS.rep[i]!.label}`, "rep") },
    { name: "Lifetime Challenges", got: tally.lifetime, of: track("Lifetime Challenges").stated,
      how: from(lifetime, "Mark your challenge count", (i) => `From ${ROADMAPS.lifetime[i]!.label} lifetime challenges`, "lifetime") },
    { name: "Crew Track", got: tally.crew, of: track("Crew Track").stated,
      how: from(crew, "Mark your Crew level", (i) => `From Crew level ${ROADMAPS.crew[i]!.label}`, "crew") },
    { name: "Build Specialization", got: tally.specialization, of: track("Build Specialization").stated,
      how: track("Build Specialization").note,
      ctrl: (
        <>
          <button type="button" className="toggle" aria-pressed={spec9} onClick={() => p.set("spec9", !spec9)}>
            <span className="knob" aria-hidden="true" />Goal 9 complete
          </button>{" "}
          <a className="linkbtn" href="/mycareer#specializations">See the goals</a>
        </>
      ) },
    { name: "Season Track", got: tally.season, of: track("Season Track").stated,
      how: track("Season Track").blurb,
      ctrl: (
        <>
          <span>Seasons finished to level 40</span>
          <span className="stepper">
            <button ref={minusRef} type="button" aria-label="One fewer season" disabled={seasons <= 0} onClick={() => setSeasons(-1)}>&minus;</button>
            <output aria-live="polite">{seasons}</output>
            <button ref={plusRef} type="button" aria-label="One more season" disabled={seasons >= 9} onClick={() => setSeasons(1)}>+</button>
          </span>
        </>
      ) },
  ];
  return (
    <>
      <TrackHead title="Cap Breakers" status={`${tally.total} of ${tally.of} earned`} intro={capBreakers.intro} />
      <div className="rw-body">
        <div className="cb-sum">
          <span className="cb-big">{tally.total} <small>of {tally.of}</small></span>
          <p>
            {capBreakers.split}
            {tally.total > 0 && ` You have ${tally.free} free${tally.locked ? ` and ${tally.locked} locked` : ""}.`}
          </p>
        </div>
        {sources.map((s) => (
          <div className="cb-src" key={s.name}>
            <h4>{s.name}</h4>
            <span className="n">{s.got} / {s.of}</span>
            <div className="cb-bar" aria-hidden="true"><span style={{ width: `${(100 * s.got) / s.of}%` }} /></div>
            <p>{s.how}</p>
            {s.ctrl && <div className="cb-ctrl">{s.ctrl}</div>}
          </div>
        ))}
      </div>
    </>
  );
}

function SeasonTrack() {
  const [i, setI] = useState(0);
  const t = seasonRewards.tracks[i]!;
  return (
    <>
      <TrackHead title="Season 1" status="" intro={seasonRewards.intro} />
      <div className="rw-body">
        <div className="seg" role="group" aria-label="Season track">
          {seasonRewards.tracks.map((x, j) => (
            <button key={x.title} type="button" aria-pressed={j === i} onClick={() => setI(j)}>
              {x.title.replace(/^Season \d+\s*/, "").replace(/^Rewards\s*/, "")}
            </button>
          ))}
        </div>
        <ol className="slist">{t.items.map((x) => <li key={x.level}><b>{x.level}</b><span>{x.reward}</span></li>)}</ol>
      </div>
    </>
  );
}

/** Starter Challenges are independent tasks: toggle buttons, not a roadmap. */
function StarterTrack({ p }: { p: Progress }) {
  const done = p.get("starter");
  const all = starterRewards.sections.reduce((n, s) => n + s.tasks.length, 0);
  const total = Object.values(done).filter(Boolean).length;
  return (
    <>
      <TrackHead title="Starter Challenges" status={`${total} of ${all} tasks done`} intro={starterRewards.intro} />
      <div className="rw-body">
        <div className="st-grid">
          {starterRewards.sections.map((s, si) => {
            const n = s.tasks.filter((_, ti) => done[`${si}.${ti}`]).length;
            return (
              <section className={`st-card${n === s.tasks.length ? " done" : ""}`} key={s.name}>
                <h4>{s.name}<span>{n} / {s.tasks.length}</span></h4>
                {s.tasks.map((task, ti) => {
                  const key = `${si}.${ti}`;
                  return (
                    <button key={key} type="button" className="task" aria-pressed={!!done[key]} onClick={() => p.set("starter", { ...done, [key]: !done[key] })}>
                      <span className="tick" aria-hidden="true">&#10003;</span><span className="tt">{task}</span>
                    </button>
                  );
                })}
                <p className="st-reward">Reward: <b>{s.reward}</b></p>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
