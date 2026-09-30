import { vcPrices } from "../../data/vcPrices";
import { ExtLink } from "../../shell/Layout";

const fmt = (n: number) => n.toLocaleString("en-US");
const usd = (n: number) => `$${n.toFixed(2)}`;
/** Coin stacks drawn per tier, smallest to largest: [x, stack height] per column. */
const COINS: [number, number][][] = [
  [[60, 2]], [[60, 5]], [[60, 8]], [[38, 6], [84, 5]], [[30, 7], [62, 6], [94, 5]], [[30, 9], [62, 8], [94, 7]], [[30, 11], [62, 10], [94, 9]],
];

/** Coin art drawn in SVG: each column is a stack of coin edges with a face on top. */
function CoinArt({ stacks }: { stacks: [number, number][] }) {
  return (
    <svg className="coinart" viewBox="0 0 124 160" aria-hidden="true">
      {stacks.map(([x, n]) => {
        const top = 150 - 7 * (n - 1);
        return (
          <g key={x}>
            {Array.from({ length: n }, (_, i) => {
              const face = i === n - 1;
              return (
                <ellipse key={i} cx={x} cy={150 - 7 * i} rx="32" ry="11" fill={face ? "url(#coinFace)" : "url(#coinEdge)"}
                  stroke={face ? "oklch(.58 .11 68)" : "oklch(.5 .1 66)"} strokeWidth={face ? 1.2 : 1} />
              );
            })}
            <ellipse cx={x} cy={top} rx="26" ry="8" fill="none" stroke="oklch(.70 .10 78)" strokeWidth="1" opacity=".7" />
            <path d={`M${x - 9},${top + 2} q9,-8 18,0`} fill="none" stroke="oklch(.55 .10 66)" strokeWidth="1.6" opacity=".8" />
          </g>
        );
      })}
    </svg>
  );
}

export function VcPanel() {
  const { tiers, season1Bundles, maxBuild } = vcPrices;
  const best = Math.max(...tiers.map((t) => t.vcPerDollar));
  return (
    <>
      <h2>VC Prices</h2>
      <p className="plead">
        Every Virtual Currency tier and what it works out to per dollar. You pay for all of it: bigger tiers just cost less per VC.
      </p>
      <svg className="coin-defs" width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
        <defs>
          <radialGradient id="coinFace" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="oklch(.92 .10 92)" />
            <stop offset="55%" stopColor="oklch(.82 .13 86)" />
            <stop offset="100%" stopColor="oklch(.66 .12 72)" />
          </radialGradient>
          <linearGradient id="coinEdge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(.74 .12 80)" />
            <stop offset="100%" stopColor="oklch(.55 .11 66)" />
          </linearGradient>
        </defs>
      </svg>

      <h3 className="vc-sub">Season 1 bundles</h3>
      <div className="bundlegrid">
        {season1Bundles.map((b) => (
          <div className="bundle" key={b.name}>
            <div className="bundle-top"><span className="bundle-name">{b.name}</span><span className="bundle-price">{usd(b.price)}</span></div>
            <ul>{b.contents.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        ))}
      </div>
      <p className="mediahint">Both bundles cost the same as the 75,000 VC tier and include that 75,000 VC.</p>

      <h3 className="vc-sub">Standard tiers</h3>
      <div className="packgrid">
        {tiers.map((t, i) => (
          <div className={`pack${t.vcPerDollar === best ? " is-featured" : ""}`} key={t.vc}>
            <div className="pack-top"><span className="amt">{fmt(t.vc)}</span><span className="unit">VC</span></div>
            <div className="bonus">
              <span className="rate">{fmt(t.vcPerDollar)} VC per $1</span>
              {t.vcPerDollar === best && <span className="free">Most VC per dollar</span>}
            </div>
            <div className="pack-art"><CoinArt stacks={COINS[Math.min(i, COINS.length - 1)]!} /></div>
            <div className="price">{usd(t.price)}</div>
          </div>
        ))}
      </div>

      <div className="vc-max">
        <h3>How much VC does a build take?</h3>
        <p>
          By 2KLab&rsquo;s estimate, attributes alone cost about <b>{fmt(maxBuild.to85)} VC</b> to take a player to 85, and nearer{" "}
          <b>{fmt(maxBuild.to99)} VC</b> to reach 99. Animations and cosmetics come on top, so even the biggest tier realistically funds one build.
        </p>
      </div>
      <p className="mediahint">
        Prices from 2KLab&rsquo;s VC page, captured {vcPrices.captured}. <ExtLink href={vcPrices.source}>VC prices on 2KLab</ExtLink>
      </p>
    </>
  );
}
