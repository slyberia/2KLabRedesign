import { Fragment, useEffect, useState } from "react";
import { attributeDescriptions } from "../../data/attributeDescriptions";
import { badges } from "../../data/badges";
import { rebirth } from "../../data/rebirth";
import { specializations } from "../../data/specializations";
import { workoutWarrior as ww } from "../../data/workoutWarrior";
import { ATTRIBUTES, ATTRIBUTE_CATEGORY, CATEGORIES, CATEGORY_LABEL, badgesKeyedOn, type Specialization } from "../../domain";
import { OpChip } from "../../components/OpChip";
import { Tabs, type TabDef } from "../../components/Tabs";
import { initialParams, replaceUrl, useHashTab } from "../../lib/url";
import "./mycareer.css";

type Tab = "attributes" | "specializations" | "rebirth" | "workout";
const TABS: TabDef<Tab>[] = [
  { id: "attributes", label: "Attributes" },
  { id: "specializations", label: "Specializations" },
  { id: "rebirth", label: "Rebirth" },
  { id: "workout", label: "Workout Warrior" },
];
const specSkill = (id: string) => (id === "physicals" ? "physical" : id);

export function MyCareerPage() {
  const [specParam] = useState(() => {
    const s = initialParams().get("spec");
    return specializations.some((x) => x.id === s) ? s! : null;
  });
  const [tab, setTab] = useHashTab<Tab>(TABS.map((t) => t.id), specParam ? "specializations" : "attributes", () => {
    document.querySelector(".pagehead [role=tablist]")?.scrollIntoView({ block: "start" });
  });
  const [spec, setSpec] = useState(specParam ?? specializations[0]!.id);
  const [touched, setTouched] = useState(false);

  // ?spec= deep links open the Specializations tab.
  useEffect(() => { if (specParam) setTab("specializations"); }, [specParam, setTab]);
  // Once the visitor changes tab or specialization, the URL follows so the section is linkable.
  useEffect(() => {
    if (!touched) return;
    const p = new URLSearchParams();
    if (tab === "specializations") p.set("spec", spec);
    replaceUrl(p, tab);
  }, [tab, spec, touched]);

  const selectTab = (t: Tab) => { setTouched(true); setTab(t); };
  const selectSpec = (id: string) => { setTouched(true); setSpec(id); };

  return (
    <>
      <div className="wrap">
        <div className="crumb"><a href="index.html">Home</a> / MyCareer</div>
        <div className="pagehead">
          <div className="eyebrow">MyCareer</div>
          <h1>NBA 2K27 MyCareer Progression</h1>
          <p>What each attribute does, how Build Specializations unlock and what they pay out, Rebirth tiers, and the Workout Warrior checklist.</p>
          <Tabs tabs={TABS} selected={tab} onSelect={selectTab} label="MyCareer sections" />
        </div>
      </div>
      <main className="wrap">
        <section className="panel" id="panel-attributes" role="tabpanel" aria-labelledby="tab-attributes" hidden={tab !== "attributes"}>
          <AttributesPanel
            onGotoSpec={(id) => {
              selectTab("specializations");
              selectSpec(id);
              requestAnimationFrame(() => document.querySelector(".spec-tabs")?.scrollIntoView({ block: "start" }));
            }}
          />
        </section>
        <section className="panel" id="panel-specializations" role="tabpanel" aria-labelledby="tab-specializations" hidden={tab !== "specializations"}>
          <p className="panel-lede">Six Specializations, ten goals each. A build qualifies for a Specialization by meeting its attribute requirement; Physicals has none.</p>
          <SpecializationsPanel selected={spec} onSelect={selectSpec} />
        </section>
        <section className="panel" id="panel-rebirth" role="tabpanel" aria-labelledby="tab-rebirth" hidden={tab !== "rebirth"}>
          <RebirthPanel />
        </section>
        <section className="panel" id="panel-workout" role="tabpanel" aria-labelledby="tab-workout" hidden={tab !== "workout"}>
          <WorkoutPanel />
        </section>
      </main>
    </>
  );
}

function AttributesPanel({ onGotoSpec }: { onGotoSpec: (id: string) => void }) {
  return (
    <>
      <p className="panel-lede">All 21 attributes, grouped by category. Each one shows how many badges key on it and which Specialization it can unlock.</p>
      {CATEGORIES.map((cat) => (
        <div className="cat-group" key={cat} style={{ ["--sk" as string]: `var(--skill-${cat})` }}>
          <div className="cat-head"><span className="dot" aria-hidden="true" /><h3>{CATEGORY_LABEL[cat]}</h3></div>
          {ATTRIBUTES.filter((a) => ATTRIBUTE_CATEGORY[a] === cat).map((a) => {
            const n = badgesKeyedOn(badges, a).length;
            const specs = specializations.filter((s) => s.unlock.flat().some((c) => c.attribute === a));
            return (
              <div className="attr-row" key={a}>
                <h4 className="attr-name">{a}</h4>
                <div className="attr-desc">{attributeDescriptions[a]}</div>
                <div className="attr-meta">
                  {n ? (
                    <a className="meta-pill" href={`reference-table.html?attr=${encodeURIComponent(a)}#badges`}>Keys {n} badge{n === 1 ? "" : "s"}</a>
                  ) : (
                    <span className="meta-pill">No badge keys on it</span>
                  )}
                  {specs.map((s) => (
                    <button key={s.id} type="button" className="meta-pill" style={{ ["--sk" as string]: `var(--skill-${specSkill(s.id)})` }} onClick={() => onGotoSpec(s.id)}>
                      Unlocks {s.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

/** The unlock rule as published: groups joined by OR, conditions inside a group joined by AND. */
function UnlockRule({ s }: { s: Specialization }) {
  if (!s.unlock.length) return <p className="unlock-none">No attribute requirement. Any build can pick it.</p>;
  return (
    <div className="unlock-list">
      {s.unlock.map((g, gi) => (
        <Fragment key={gi}>
          {gi > 0 && <OpChip op="OR" />}
          <div className="unlock-group">
            {g.map((c, ci) => (
              <Fragment key={c.attribute}>
                {ci > 0 && <OpChip op="AND" />}
                <span className="req-pill"><b>{c.min}</b> {c.attribute}</span>
              </Fragment>
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

function SpecializationsPanel({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const s = specializations.find((x) => x.id === selected) ?? specializations[0]!;
  const tabs: TabDef<string>[] = specializations.map((x) => ({ id: x.id, label: x.name, tabId: `spec-${x.id}`, panelId: "specBody", color: `var(--skill-${specSkill(x.id)})` }));
  return (
    <>
      <div className="spec-tabs-wrap">
        <Tabs tabs={tabs} selected={s.id} onSelect={onSelect} label="Specialization" className="spec-tabs" />
      </div>
      <div id="specBody" role="tabpanel" aria-labelledby={`spec-${s.id}`} style={{ ["--sk" as string]: `var(--skill-${specSkill(s.id)})` }}>
        <div className="spec-body">
          <div className="unlock">
            <h3>To unlock {s.name}</h3>
            <UnlockRule s={s} />
          </div>
          <div className="goals-wrap">
            <table className="goals">
              <caption className="sr-only">{s.name} goals, requirements and rewards</caption>
              <thead><tr><th>Goal</th><th>Name</th><th>Requirement</th><th>Rewards</th></tr></thead>
              <tbody>
                {s.goals.map((g) => (
                  <tr key={g.goal}>
                    <td className="goal-num">{g.goal}</td>
                    <td className="goal-name">{g.name}</td>
                    <td>{g.requirement}</td>
                    <td><div className="rewards">{g.rewards.map((r) => <span className="reward" key={r}>{r}</span>)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function RebirthPanel() {
  return (
    <>
      <ol className="tier-grid">
        {rebirth.tiers.map((t) => (
          // Rebirth tiers use the accent, never the badge-tier colors.
          <li className="tier" key={t.tier} style={{ ["--tc" as string]: "var(--accent-text)" }}>
            <span className="tier-num">Tier {t.tier}</span>
            <span className="tier-tokens">{t.badgeTokens}</span>
            <span className="tier-tokens-lbl">of your badge tokens on day one</span>
            {t.extra && <span className="tier-extra">{t.extra}</span>}
            <div className="tier-status"><span>Status</span>{t.status}</div>
          </li>
        ))}
      </ol>
      <p className="shared-note">{rebirth.shared}</p>
      <h2 className="sec-title">How Rebirth Works in 2K27</h2>
      <div className="how-grid">
        {rebirth.how.map((h) => <div className="how-item" key={h.title}><h3>{h.title}</h3><p>{h.body}</p></div>)}
      </div>
      {rebirth.source && <p className="srcnote">Source: {rebirth.source}</p>}
    </>
  );
}

function WorkoutPanel() {
  const [done, setDone] = useState<boolean[]>(() => ww.workouts.map(() => false));
  const n = done.filter(Boolean).length;
  return (
    <>
      <aside className="answer"><h2>The short answer</h2><p>{ww.answer}</p></aside>
      <div className="ww-cols">
        <div>
          <h2 className="sec-title">How a gym session works</h2>
          <ol className="steps">{ww.steps.map((s) => <li key={s.title}><h3>{s.title}</h3><p>{s.body}</p></li>)}</ol>
        </div>
        <div>
          <div className="check-head">
            <h2 className="sec-title" style={{ margin: 0 }}>All {ww.workouts.length} workouts</h2>
            <span className="progress" aria-live="polite">{n === ww.workouts.length ? "Workout Warrior unlocked" : `${n} / ${ww.workouts.length} done`}</span>
          </div>
          <ul className="checklist">
            {ww.workouts.map((w, i) => (
              <li key={w}>
                <label>
                  <input type="checkbox" checked={done[i]} onChange={(e) => setDone(done.map((d, j) => (j === i ? e.target.checked : d)))} />
                  <span>{w}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="check-note">Ticks are for this visit only. They aren&rsquo;t saved.</p>
        </div>
      </div>
      <h2 className="sec-title" style={{ marginTop: "var(--space-8)" }}>What the gym gives you</h2>
      <dl className="facts">
        {ww.facts.map((f) => <div className="fact" key={f.term}><dt>{f.term}</dt><dd>{f.detail}</dd></div>)}
      </dl>
    </>
  );
}
