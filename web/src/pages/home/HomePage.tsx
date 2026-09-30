import { useState } from "react";
import { badges } from "../../data/badges";
import { takeovers } from "../../data/takeovers";
import { TIER_LABEL, type Tier } from "../../domain";
import { OpChip } from "../../components/OpChip";
import { ExtLink } from "../../shell/Layout";
import { live } from "../../shell/links";
import { HOME_ANIMATION_EXAMPLE as anim } from "./examples";
import "./home.css";

const POSITIONS: [string, string][] = [["PG", "Point Guard"], ["SG", "Shooting Guard"], ["SF", "Small Forward"], ["PF", "Power Forward"], ["C", "Center"]];
const TIERS: Tier[] = ["bronze", "silver", "gold", "hof"];

function PositionChips() {
  return (
    <div className="subgrid cols5">
      {POSITIONS.map(([g, name]) => (
        <a key={g} className="pos-chip" href="/builds" aria-label={`${name} builds`}>
          <span className="glyph">{g}</span><span className="tip">{name}</span>
        </a>
      ))}
    </div>
  );
}

/** Click-to-load video facade: no iframe until the visitor asks for it. */
function HeroVideo() {
  // No real video ID yet: the poster stays and says so, rather than pretending to play.
  const VIDEO_ID: string | null = null;
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (playing && VIDEO_ID) {
    return (
      <div className="video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
          title="See the Lab in Action"
          allow="accelerated-motion; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <button
      className="video"
      type="button"
      aria-label="Play video: See the Lab in Action, 2 minutes 14 seconds"
      onClick={() => (VIDEO_ID ? setPlaying(true) : setNote("Video not set up yet in this redesign."))}
    >
      <span className="court" aria-hidden="true" />
      <span className="vtag">Testing Footage</span>
      <span className="vdur">2:14</span>
      <span className="play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></span>
      <span className="vlabel">
        <span className="vt">See the Lab in Action</span>
        <span className="vs" aria-live="polite">{note ?? "How NBA2KLab tests jumpshots, green windows and release timing"}</span>
      </span>
    </button>
  );
}

export function HomePage() {
  const deadeye = badges.find((b) => b.id === "Deadeye")!;
  const shotArtist = takeovers.find((t) => t.id === "ShotArtist")!;
  const [a1, a2] = Object.entries(anim.thresholds);
  return (
    <>
      <section className="hero" style={{ padding: 0 }}>
        <div className="wrap"><div className="grid">
          <div>
            <div className="eyebrow">NBA 2K27</div>
            <h1>The Best Jumpers, Badges and Builds by <span className="brand">NBA2KLab</span></h1>
            <p>Every number here comes from large-sample automated testing, not in-game letter grades or guesswork. This is our 10th year testing the 2K series, at the largest scale yet.</p>
            <div className="actions">
              <a className="btn btn-primary btn-lg" href="/builder">Open the MyPlayer Builder</a>
              <a className="btn btn-ghost btn-lg" href="#jumpshots">Best Jumpshots</a>
              <ExtLink className="patch-pill" href={live("/nba2k-patch-notes")}>
                <span className="dotlive" aria-hidden="true" />Updated for <b>Patch 1.4</b> &middot; Sep 3 &rarr;
              </ExtLink>
            </div>
          </div>
          <HeroVideo />
        </div></div>
      </section>

      <section className="paths" style={{ padding: 0 }}>
        <div className="wrap"><div className="row">
          <div className="path">
            <span className="k">Builds</span>
            <span className="d">2K&rsquo;s Signature Blueprints and community builds, by position.</span>
            <PositionChips />
          </div>
          <div className="path">
            <span className="k">MyPlayer Builder</span>
            <span className="d">Load a build and see every badge it unlocks.</span>
            <div className="subgrid cols3">
              <a className="pill" style={{ ["--pc" as string]: "var(--category-builder)" }} href="/builder">Blueprints</a>
              <a className="pill" style={{ ["--pc" as string]: "var(--category-builder)" }} href="/builder?preset=player:1">Players</a>
              <a className="pill" style={{ ["--pc" as string]: "var(--category-builder)" }} href="/builder#my-builds">My Builds</a>
            </div>
          </div>
          <div className="path">
            <span className="k">Requirements</span>
            <span className="d">The ratings that unlock everything your build can use.</span>
            <div className="subgrid cols3">
              <a className="pill" style={{ ["--pc" as string]: "var(--category-badges)" }} href="/reference-table#badges">Badges</a>
              <a className="pill" style={{ ["--pc" as string]: "var(--category-animations)" }} href="/reference-table#animations">Animations</a>
              <a className="pill" style={{ ["--pc" as string]: "var(--category-takeover)" }} href="/reference-table#takeovers">Takeover</a>
            </div>
          </div>
          <div className="path">
            <span className="k">Best Jumpshots</span>
            <span className="d">The fastest green-window jumper for your build.</span>
            <div className="subgrid cols3">
              {["Windows", "Timing", "Grades"].map((x) => (
                <ExtLink key={x} className="pill" style={{ ["--pc" as string]: "var(--category-shooting)" }} href={live("/jumpshot-recommender")}>{x}</ExtLink>
              ))}
            </div>
          </div>
        </div></div>
      </section>

      <section className="jump tight" id="jumpshots">
        <div className="wrap">
          <div className="section-head">
            <div><div className="eyebrow">Shooting</div><h2>Best Jumpshots for 2K27</h2></div>
            <a className="more" href="/shooting">Read the Full Shooting Guide &rarr;</a>
          </div>
          <div className="inner">
            <div>
              <p style={{ color: "var(--text-muted)" }}>
                How to green your jump shot in 2K27: green windows, release timing, rhythm vs. button shooting, and the badges worth
                equipping. Every jumper is graded from real make-rate data, not feel. Feed your build into the{" "}
                <strong style={{ color: "var(--text)" }}>Jumpshot Lab</strong> and it ranks every base + release combo by the size of its
                green window for your attributes.
              </p>
              <div className="actions" style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-5)", flexWrap: "wrap" }}>
                <ExtLink className="btn btn-primary" href={live("/jumpshot-recommender")}>Open the Jumpshot Lab</ExtLink>
                <ExtLink className="btn btn-ghost" href={live("/jumpshot-recommender")}>Fastest Release Jumpers</ExtLink>
              </div>
            </div>
            <figure className="viz">
              <div className="lbl">GREEN WINDOW &middot; ILLUSTRATION</div>
              <div className="bars" aria-hidden="true">
                {[12, 20, 34, 52, 74, 92, 100, 96, 80, 58, 38, 22, 12].map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}
              </div>
              <div className="cap" style={{ justifyContent: "center", marginTop: ".5rem" }}>Make rate across release timing</div>
              <figcaption className="cap" style={{ justifyContent: "center" }}>Shape only, not a measured jumper.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="hub-wrap tight" id="hub">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">Build Hub</div>
              <h2>It All Starts with Your Build</h2>
              <div className="lead">Your attributes decide every badge, animation and takeover you can use, so it all lives in one place.</div>
            </div>
          </div>
          <div className="hub rule-top">
            <div className="builder-panel">
              <div>
                <h3>Start from a Blueprint or a Player</h3>
                <p className="sub">Load one of 2K&rsquo;s 40 Signature Blueprints or a real player&rsquo;s card, adjust the attributes within the published range, and watch every badge tier update live.</p>
                <a className="btn btn-primary" href="/builder">Open the 2K27 Builder</a>
              </div>
              <div>
                <div className="builder-face" aria-hidden="true">
                  {[["3PT Shot", 88], ["Driving Dunk", 72], ["Perimeter D", 80], ["Ball Handle", 84]].map(([n, v]) => (
                    <div className="attr-row" key={n}><span className="nmn">{n}</span><span className="bar"><i style={{ width: `${v}%` }} /></span><span className="val">{v}</span></div>
                  ))}
                </div>
                <div className="preset">
                  <span className="preset-lbl">Or Start from a Position</span>
                  <PositionChips />
                </div>
              </div>
            </div>
            <div className="unlocks-head">
              <h3>See the Requirements Behind Every Badge, Animation and Takeover</h3>
              <div className="lead">Your attributes decide what you can equip. Look up the exact rating each one needs, at Bronze, Silver, Gold and Hall of Fame.</div>
            </div>
            <div className="facets">
              <a className="facet" style={{ ["--fc" as string]: "var(--category-badges)" }} href="/reference-table?badge=Deadeye#badges">
                <div className="fh"><span className="fd" aria-hidden="true" /><h4>Badge Requirements</h4></div>
                <p>All {badges.length} badges and the rating each needs at every tier, filtered to your build&rsquo;s height.</p>
                <div className="preview" aria-hidden="true">
                  <div className="prow">
                    <span className="pname">{deadeye.name}</span>
                    <span style={{ color: "var(--text-muted)" }}>{deadeye.conditions.map((c) => c.attribute).join(" or ")}</span>
                  </div>
                  <div className="tiers">
                    {TIERS.map((t) => (
                      <b key={t} title={TIER_LABEL[t]} style={{ color: `var(--tier-${t})`, border: `1px solid var(--tier-${t})` }}>{deadeye.conditions[0]![t] ?? "—"}</b>
                    ))}
                  </div>
                </div>
                <span className="go">Explore Badges &rarr;</span>
              </a>
              <a className="facet" style={{ ["--fc" as string]: "var(--category-animations)" }} href="/reference-table#animations">
                <div className="fh"><span className="fd" aria-hidden="true" /><h4>Animation Requirements</h4></div>
                <p>Jumpers, dribble moves, shooting packages, motion styles and finishing, and the attributes each one needs.</p>
                <div className="preview" aria-hidden="true">
                  <div className="prow"><span className="pname">{anim.name}</span></div>
                  <div className="tiers">
                    <b style={{ color: "var(--category-animations)", border: "1px solid var(--category-animations)" }}>{a1![0]} {a1![1]}+</b>
                    <OpChip op="AND" />
                    <b style={{ color: "var(--category-animations)", border: "1px solid var(--category-animations)" }}>{a2![0]} {a2![1]}+</b>
                  </div>
                </div>
                <span className="go">Explore Animations &rarr;</span>
              </a>
              <a className="facet" style={{ ["--fc" as string]: "var(--category-takeover)" }} href={`/reference-table?takeover=${shotArtist.id}#takeovers`}>
                <div className="fh"><span className="fd" aria-hidden="true" /><h4>Takeover Requirements</h4></div>
                <p>All {takeovers.length} takeover abilities, what each does, and the attributes that unlock them.</p>
                <div className="preview" aria-hidden="true">
                  <div className="prow"><span className="pname">{shotArtist.name}</span></div>
                  <div className="tiers">
                    {shotArtist.conditions.map((c, i) => (
                      <span key={c.attribute} style={{ display: "contents" }}>
                        {i > 0 && <OpChip op="OR" />}
                        <b style={{ color: "var(--category-takeover)", border: "1px solid var(--category-takeover)" }}>{c.attribute} {c.min}+</b>
                      </span>
                    ))}
                  </div>
                </div>
                <span className="go">Explore Takeovers &rarr;</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="premium-wrap tight" id="premium">
        <div className="wrap">
          <div className="premium rule-top">
            <div>
              <div className="eyebrow">NBA2KLab Premium</div>
              <h2>Unlock Every Tool and Dataset</h2>
              <p className="blurb">The recommender, the fastest motion styles, green-window data and every tracker: the full testing set behind the numbers.</p>
              <div className="price"><b>From $7.99</b> <span>/ month</span></div>
              <div className="cta-row">
                <ExtLink className="btn btn-primary btn-lg" href={live("/login")}>Become a Member</ExtLink>
              </div>
              <p className="prem-note">Premium lives on the current NBA2KLab site; this redesign doesn&rsquo;t sell memberships.</p>
            </div>
            <div className="prem-tools">
              <span className="head">Premium Tools</span>
              <ExtLink className="prem-tool" href={live("/jumpshot-recommender")}><span className="pt-name">Jumpshot Recommender</span><span className="pt-desc">Best base + release for your exact attributes.</span></ExtLink>
              <ExtLink className="prem-tool" href={live("/motion-styles")}><span className="pt-name">Fastest Motion Styles</span><span className="pt-desc">Ranked dribble speed database.</span></ExtLink>
              <a className="prem-tool" href="/game-details?track=cap-breakers#rewards"><span className="pt-name">Cap Breaker Tracker</span><span className="pt-desc">Mark your progress and see every Cap Breaker you&rsquo;ve earned.</span></a>
              <a className="prem-tool" href="/builds#blueprints"><span className="pt-name">Signature Blueprints</span><span className="pt-desc">Attributes, body and badges per build.</span></a>
              <ExtLink className="prem-tool" href={live("/badge-token-calculator")}><span className="pt-name">Badge Token Calculator</span><span className="pt-desc">Plan upgrades against each token budget.</span></ExtLink>
            </div>
          </div>
        </div>
      </section>

      <section className="secondary tight" id="more">
        <div className="wrap">
          <div className="sec-grid">
            <div>
              <h2>More from NBA2KLab</h2>
              <div className="feature">
                <a className="mini" href="/game-details#guides"><h3>How-To Guides</h3><p>Move lists and inputs for dribbling, dunks, passing, layups and the post.</p></a>
                <a className="mini" href="/game-details#2ktv"><h3>2KTV Answers</h3><p>The latest episode&rsquo;s answers for free VC.</p></a>
                <a className="mini" href="/game-details#face-creations"><h3>Face Creations</h3><p>Recreate NBA players with slider sets.</p></a>
                <a className="mini" href="/game-details#settings"><h3>Best Settings</h3><p>Controller, shot timing and camera.</p></a>
              </div>
            </div>
            <div className="linkgroup">
              <h3>Data &amp; Reference</h3>
              <ExtLink href={live("/nba2k-player-ratings")}>Player Ratings</ExtLink>
              <ExtLink href={live("/teams")}>Team Rosters</ExtLink>
              <a href="/reference-table#badges">Badge Descriptions</a>
              <a href="/reference-table#badges">Badge Tier Unlocks</a>
              <ExtLink href={live("/motion-styles")}>Motion Styles</ExtLink>
            </div>
            <div className="linkgroup">
              <h3>Stay Current</h3>
              <ExtLink href={live("/nba2k-patch-notes")}>Patch Notes</ExtLink>
              <a href="/game-details#2ktv">2KTV Answers</a>
              <a href="/game-details?track=cap-breakers#rewards">Cap Breakers</a>
              <a href="#premium">What&rsquo;s on Premium</a>
              <a href="/game-details">All Guides &amp; Tools</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
