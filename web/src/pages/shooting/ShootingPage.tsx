import { useEffect, type ReactNode } from "react";
import { badges } from "../../data/badges";
import { shootingBadgeTests } from "../../data/shootingBadgeTests";
import { TIER_LABEL, type Badge, type Tier } from "../../domain";
import { ExtLink } from "../../shell/Layout";
import { live } from "../../shell/links";
import "./shooting.css";

const SECTIONS: [string, string][] = [
  ["green-window", "What a green window is"],
  ["what-moves-it", "What moves your window"],
  ["rhythm-vs-button", "Rhythm vs button"],
  ["jumpshot-grades", "The four jumpshot grades"],
  ["release-speed", "Release speed"],
  ["ratings-and-levers", "Ratings and other levers"],
  ["shooting-badges", "Shooting badges"],
  ["settings", "Settings and shot cues"],
  ["practice", "How to practice"],
];
const TIERS: Tier[] = ["bronze", "silver", "gold", "hof"];

/** A measurement or claim still being tested by 2KLab: labeled, never presented as measured. */
const Pending = ({ children }: { children: ReactNode }) => <span className="status">Still testing: {children}</span>;

function Card(props: { title: ReactNode; stat?: string; link?: [string, string]; keyCard?: boolean; children: ReactNode }) {
  return (
    <div className={`card${props.keyCard ? " key" : ""}`}>
      <h3>{props.title}</h3>
      {props.stat && <span className="stat">{props.stat}</span>}
      <p>{props.children}</p>
      {props.link && <ExtLink className="xl" href={live(props.link[0])}>{props.link[1]}</ExtLink>}
    </div>
  );
}

function BadgeRow({ b, test }: { b: Badge; test: (typeof shootingBadgeTests)[number] }) {
  const c0 = b.conditions[0]!;
  const keys = b.conditions.map((c) => c.attribute).join(` ${b.operator} `);
  return (
    <div className="bdg">
      <span className="nm">{b.name}</span>
      <span className="tiles">
        {TIERS.map((t) =>
          c0[t] == null
            ? <span key={t} className="tile na" aria-label={`${TIER_LABEL[t]}: not published`}>&mdash;</span>
            : <span key={t} className={`tile t-${t}`} aria-label={`${TIER_LABEL[t]} ${c0[t]}`}>{c0[t]}</span>,
        )}
      </span>
      <span className="links">
        {test.status === "Results" && test.link
          ? <ExtLink className="xl" href={live(test.link)}>2KLab test results</ExtLink>
          : <span className="pend">Test pending</span>}
        <a className="il" href={`reference-table.html?badge=${b.id}#badges`}>Requirements &rarr;</a>
      </span>
      <span className="ds">{b.description} <span className="small">Keys on {keys}.</span></span>
    </div>
  );
}

export function ShootingPage() {
  // Sections render after load, so the browser can't jump to an incoming #anchor on its own.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  const shootingBadges = shootingBadgeTests
    .map((t) => ({ t, b: badges.find((b) => b.name === t.name) }))
    .filter((x): x is { t: (typeof shootingBadgeTests)[number]; b: Badge } => !!x.b);

  return (
    <div className="wrap">
      <div className="crumb"><a href="index.html">Home</a> / Shooting</div>
      <div className="pagehead">
        <div className="eyebrow">Shooting</div>
        <h1>How to Shoot in NBA 2K27</h1>
        <p>What a green window is, what shifts it, what widens it, and how to practice, built on 2KLab&rsquo;s measured shooting tests. Where a test is still running, this page says so.</p>
        <p className="source-note">Summarized from 2KLab&rsquo;s shooting guide and test pages. <ExtLink className="xl" href={live("/how-to-shoot")}>Read the full guide</ExtLink></p>
      </div>
      <div className="layout">
        <nav className="toc" aria-labelledby="toc-h">
          <h2 id="toc-h">In this guide</h2>
          <ol>{SECTIONS.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ol>
        </nav>
        <main>
          <section className="sec" id="green-window">
            <h2>What a green window is</h2>
            <p>Every jumper has a <b>green window</b>: the range of release timing that counts as a make. Without boosts, the part that goes in on every single attempt, the <b>pure window</b>, is typically only <b>15 to 20 milliseconds</b> wide.</p>
            <p>It&rsquo;s a threshold, not a dice roll. A release inside the pure window always goes in, so a miss tells you something specific: you were early or late. Around the pure window sit <b>shoulders</b>, where the make rate falls away instead of stopping dead.</p>
            <figure className="schem">
              <svg viewBox="0 0 640 200" role="img" aria-labelledby="schem-t schem-d">
                <title id="schem-t">Schematic of a green window</title>
                <desc id="schem-d">Make rate across release timing: zero when far too early, rising through a shoulder, one hundred percent across the pure window, falling through a second shoulder, and zero when far too late.</desc>
                <line x1="40" y1="160" x2="620" y2="160" stroke="var(--border-strong)" strokeWidth="1.5" />
                <path d="M40 160 L170 160 C210 160 215 40 255 40 L405 40 C445 40 450 160 490 160 L620 160" fill="none" stroke="var(--accent)" strokeWidth="3" />
                <rect x="255" y="40" width="150" height="120" fill="color-mix(in oklch,var(--accent) 16%,transparent)" />
                <text x="330" y="100" textAnchor="middle" fill="var(--text)" fontSize="14" fontWeight="700" fontFamily="var(--font-heading)">Pure window</text>
                <text x="330" y="118" textAnchor="middle" fill="var(--text-muted)" fontSize="12">every release here goes in</text>
                <text x="212" y="30" textAnchor="middle" fill="var(--text-muted)" fontSize="12">shoulder</text>
                <text x="448" y="30" textAnchor="middle" fill="var(--text-muted)" fontSize="12">shoulder</text>
                <text x="100" y="150" textAnchor="middle" fill="var(--text-subtle)" fontSize="12">no make</text>
                <text x="560" y="150" textAnchor="middle" fill="var(--text-subtle)" fontSize="12">no make</text>
                <text x="40" y="184" fill="var(--text-subtle)" fontSize="12">&#8592; earlier release</text>
                <text x="620" y="184" textAnchor="end" fill="var(--text-subtle)" fontSize="12">later release &#8594;</text>
                <text x="30" y="44" textAnchor="end" fill="var(--text-subtle)" fontSize="11">100%</text>
                <text x="30" y="164" textAnchor="end" fill="var(--text-subtle)" fontSize="11">0%</text>
              </svg>
              <figcaption>Schematic, not to scale. 2KLab&rsquo;s own figure for this is marked as placeholder until its 2K27 testing is finished, so no measured widths are shown here.</figcaption>
            </figure>
            <p>2KLab finds each window with modded controllers that hold the shoot button for an exact number of milliseconds, stepping through release times one millisecond at a time.</p>
          </section>

          <section className="sec" id="what-moves-it">
            <h2>What moves your window</h2>
            <p>A jumper&rsquo;s window has a fixed width, but <b>when</b> it arrives changes from shot to shot. Anything that changes your shot speed slides it earlier or later:</p>
            <ul className="factors">
              <li><b>Stamina</b>A tired player gathers and releases slower, so the window comes later.</li>
              <li><b>Low adrenaline</b>Same effect as fatigue, and 2K has said lower shot ratings also shrink the window.</li>
              <li><b>Distance</b>A deep three and a shot inside the arc release at different moments.</li>
              <li><b>The catch</b>How you receive the pass decides when the gather starts.</li>
              <li><b>Load-ups</b>An awkward catch can trigger a slow gather that isn&rsquo;t the shot you practiced.</li>
              <li><b>Contests</b>A contested release runs on a different clock and narrows the window too.</li>
              <li><b>Ball position at the start</b>A gather from the left hip times slightly differently from the right. The smallest effect, and the hardest to control.</li>
              <li><b>Set vs moving</b>Set feet, pull-ups, hop steps and spin shots each have their own timing.</li>
              <li><b>Grades and release speed</b>The jumper sets the baseline; the creator&rsquo;s release speed moves it.</li>
            </ul>
            <Pending>window width open vs contested, and at full vs drained adrenaline</Pending>
          </section>

          <section className="sec" id="rhythm-vs-button">
            <h2>Rhythm vs button shooting</h2>
            <p>Both start from the same base window. The difference is what happens after that.</p>
            <div className="grid2">
              <Card title="Button">You get the base window every time, with no bonus and no penalty. The reliable choice while you&rsquo;re learning a new jumper.</Card>
              <Card title="Rhythm">Your tempo, how fast you move the right stick from down to up, changes the window both ways. Match the shot&rsquo;s tempo and it grows; rush or drag it and it shrinks below what the button gives. You still have to time the release.</Card>
            </div>
            <p className="small">Rhythm now applies at the free-throw line too.</p>
          </section>

          <section className="sec" id="jumpshot-grades">
            <h2>The four jumpshot grades</h2>
            <p>Every jumper in the creator is graded on four things. Three describe how it holds up against a defender; the fourth is the one to read first.</p>
            <div className="grid3">
              <Card keyCard title={<>Release Window <span className="flag">Read first</span></>}>A direct multiplier on the size of your green window. The biggest effect on greening.</Card>
              <Card title="Release Height">How high the ball is at release. Matters against contests, not in an open gym.</Card>
              <Card title="Defensive Immunity">How much of a contest the jumper shrugs off.</Card>
              <Card title="Release Speed">How quickly the shot leaves. It trades directly against window size; see the next section.</Card>
            </div>
            <Pending>measured window width across the A+ to F grade ladder</Pending>
          </section>

          <section className="sec" id="release-speed">
            <h2>Release speed is a trade</h2>
            <p>Setting a faster release shrinks your green window. 2KLab tested 2K&rsquo;s stated figures over <b>4,500 shots</b> across the five settings.</p>
            <div className="tbl-wrap">
              <table className="rs">
                <caption className="small" style={{ textAlign: "left", captionSide: "bottom", paddingTop: ".5rem" }}>
                  2K&rsquo;s figures as stated by Mike Wang on 29 August 2026. Measurements from{" "}
                  <ExtLink className="xl" href={live("/release-speed-test")}>2KLab&rsquo;s release speed test</ExtLink>.
                </caption>
                <thead><tr><th scope="col">Release speed</th><th scope="col">2K stated</th><th scope="col">2KLab measured</th></tr></thead>
                <tbody>
                  <tr><td>Very Quick</td><td>&minus;10% window</td><td className="m neg">&minus;12.1%</td></tr>
                  <tr><td>Quick</td><td>&minus;5% window</td><td className="m neg">&minus;8.5%</td></tr>
                  <tr><td>Normal</td><td>No change</td><td className="m">Reference</td></tr>
                  <tr><td>Slow</td><td>Small boost</td><td className="m unres">+1.1%, not resolved</td></tr>
                  <tr><td>Very Slow</td><td>Small boost</td><td className="m unres">+1.1%, not resolved</td></tr>
                </tbody>
              </table>
            </div>
            <p>The two quick settings checked out: slightly worse than stated, within the margin of error. The slow settings came back about a point above Normal, but the margin was several times larger than that. That&rsquo;s a boost 2KLab <b>couldn&rsquo;t confirm</b>, not one it measured.</p>
          </section>

          <section className="sec" id="ratings-and-levers">
            <h2>Ratings and other levers</h2>
            <p>A higher rating doesn&rsquo;t make you green more. It makes near-misses forgiving. The measured levers, each from its own 2KLab test:</p>
            <div className="grid3">
              <Card keyCard title="Shooting ratings" stat={"2.4× more room"} link={["/shooting-ratings-test", "Ratings test"]}>
                Over 30,700 shots, the always-green core barely moved: about &plusmn;3.1 ms at a 65 vs &plusmn;3.6 ms at a 99. The band that still makes ~70% of the time grew from &plusmn;5.8 to &plusmn;13.9 ms.
              </Card>
              <Card title="Calibrated takeover" stat={"2× the rating ladder"} link={["/takeover-test", "Takeover test"]}>
                Worth twice what the whole 65-to-99 range buys, plus a 20 ms stretch of release times that greened 500 of 500.
              </Card>
              <Card title="Hot zones" stat={"+5.4 lethal / −2.1 cold"} link={["/hot-zone-test", "Hot zone test"]}>
                Points across the window, mostly on late releases. A lethal zone is worth about 2.3 Jump Shots boosts, earned by practice.
              </Card>
              <Card title="Jump Shots skill boost" stat="+4.3% makes" link={["/shooting-boost-test", "Shooting boost test"]}>
                Across the window, mostly on early releases.
              </Card>
            </div>
            <p>
              Your Three-Point Shot and Mid-Range Shot ratings also decide which jumpshot bases and releases you can equip at all.{" "}
              <a className="il" href="reference-table.html#animations">Shooting animation requirements &rarr;</a>{" "}
              <a className="il" href="builder.html">Plan ratings in the Builder &rarr;</a>
            </p>
          </section>

          <section className="sec" id="shooting-badges">
            <h2>Shooting badges</h2>
            <p>2K27 has <b>{shootingBadges.length} shooting badges</b>, 5 of them new. Four of the new ones split cleanly by shot type:</p>
            <div className="matrix" role="table" aria-label="New shooting badges by shot type">
              <div role="row" style={{ display: "contents" }}>
                <div className="h" role="columnheader" /><div className="h" role="columnheader">Three</div><div className="h" role="columnheader">Mid-range</div>
              </div>
              <div role="row" style={{ display: "contents" }}>
                <div className="h" role="rowheader">Set</div><div className="b" role="cell">Set and Fire</div><div className="b" role="cell">Static Middy</div>
              </div>
              <div role="row" style={{ display: "contents" }}>
                <div className="h" role="rowheader">Moving</div><div className="b" role="cell">Arc Cadence</div><div className="b" role="cell">Smooth Operator</div>
              </div>
            </div>
            <p>So a spot-up shooter and a shot creator now want different badges, not different tiers of the same one. Tier values are the attribute ratings needed for Bronze, Silver, Gold and HoF.</p>
            <div>{shootingBadges.map(({ b, t }) => <BadgeRow key={b.id} b={b} test={t} />)}</div>
          </section>

          <section className="sec" id="settings">
            <h2>Settings and shot cues</h2>
            <div className="grid2">
              <Card keyCard title="Shot meter" link={["/shot-meter-test", "Shot meter test"]}>
                A live tick now tracks your stick tempo as you shoot. Leave it on while learning rhythm. Turning it off is a real boost: <b>about 10 points</b> across the window, all of it on late releases.
              </Card>
              <Card title="Shot feedback">Now separates timing (early or late) from tempo (fast or slow). Different problems, different fixes.</Card>
              <Card title="Shot cues">Worth turning on while you learn where a jumper releases.</Card>
              <Card title="Real Percentage">Available offline, where dunk timing can also be switched off.</Card>
            </div>
            <p><a className="il" href="game-details.html#settings">Best 2K27 settings &rarr;</a> <a className="il" href="game-details.html#controls">Controls &rarr;</a></p>
          </section>

          <section className="sec" id="practice">
            <h2>How to practice</h2>
            <p>2K&rsquo;s own advice has two steps: find a jumper whose tempo you can match consistently, then stay on it and put in the reps.</p>
            <p>The first step is the hard one. The creator has roughly 800 bases and about 800 options in each of two release slots, with 100 blend steps between them: billions of jumpers, with very different pure windows. Trial and error can&rsquo;t search that.</p>
            <div className="grid3">
              <Card title="Pick one and stay on it">Switching jumpers resets the timing you&rsquo;ve built.</Card>
              <Card title="Aim for the middle">Not the earliest release that greens. The middle is the only part wide enough to survive a slightly different start.</Card>
              <Card title="Practice game shots">Off the catch and off the dribble, not only standing still. They time differently.</Card>
            </div>
            <p>2KLab Premium&rsquo;s <ExtLink className="xl" href={live("/jumpshot-recommender")}>Jumpshot Recommender</ExtLink> reads ten shots off your meter and suggests jumpers that match the timing you already have.</p>
          </section>

          <div className="cta">
            <p>This page summarizes 2KLab&rsquo;s shooting guide. The full guide has more detail and 2K developer posts on shooting.</p>
            <ExtLink className="xl" href={live("/how-to-shoot")}>Read the full guide</ExtLink>
          </div>
        </main>
      </div>
    </div>
  );
}
