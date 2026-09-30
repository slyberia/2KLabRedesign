(function () {
  "use strict";
  const read = (id) => JSON.parse(document.getElementById(id).textContent);
  const attributes = read("data-attributes");
  const specs = read("data-specs");
  const rebirth = read("data-rebirth");
  const ww = read("data-ww");
  const badgeAttrs = read("data-badge-attrs"); // one array of condition attributes per badge

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const ATTRIBUTE_CATEGORY = {
    "Close Shot": "finishing", "Driving Layup": "finishing", "Driving Dunk": "finishing",
    "Standing Dunk": "finishing", "Post Control": "finishing",
    "Mid-Range Shot": "shooting", "Three-Point Shot": "shooting", "Free Throw": "shooting",
    "Pass Accuracy": "playmaking", "Ball Handle": "playmaking", "Speed With Ball": "playmaking",
    "Interior Defense": "defense", "Perimeter Defense": "defense", "Steal": "defense", "Block": "defense",
    "Offensive Rebound": "rebounding", "Defensive Rebound": "rebounding",
    "Speed": "physical", "Agility": "physical", "Strength": "physical", "Vertical": "physical",
  };
  const CAT_ORDER = ["finishing", "shooting", "playmaking", "defense", "rebounding", "physical"];
  const CAT_LABEL = { finishing: "Finishing", shooting: "Shooting", playmaking: "Playmaking", defense: "Defense", rebounding: "Rebounding", physical: "Physical" };
  const specSkill = (id) => (id === "physicals" ? "physical" : id);
  let currentSpec = null;

  // ---------- top-level tabs, synced to the URL hash so sections are linkable ----------
  const tabs = [...document.querySelectorAll(".pagehead [role=tab]")];
  const tabFor = (key) => tabs.find((t) => t.id === `tab-${key}`);
  function selectTab(tab, { updateHash = true, focus = false } = {}) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
    if (updateHash) {
      const key = tab.id.replace("tab-", "");
      const spec = key === "specializations" && currentSpec ? `?spec=${currentSpec}` : "";
      history.replaceState(null, "", `${location.pathname}${spec}#${key}`);
    }
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t));
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(n, { focus: true });
    });
  });

  // ---------- Attributes: description + real cross-references ----------
  // badge count: badges with any condition on this attribute (from the validated badge data)
  const badgeCount = {};
  badgeAttrs.forEach((conds) => new Set(conds).forEach((a) => (badgeCount[a] = (badgeCount[a] || 0) + 1)));
  // specializations whose unlock rule mentions this attribute
  const specsFor = {};
  specs.forEach((s) => s.unlock.flat().forEach((c) => (specsFor[c.attribute] = specsFor[c.attribute] || new Set()).add(s.id)));

  document.getElementById("attrGroups").innerHTML = CAT_ORDER.map((cat) => {
    const rows = Object.keys(ATTRIBUTE_CATEGORY).filter((a) => ATTRIBUTE_CATEGORY[a] === cat).map((a) => {
      const n = badgeCount[a] || 0;
      const specLinks = [...(specsFor[a] || [])].map((id) => {
        const s = specs.find((x) => x.id === id);
        return `<button type="button" class="meta-pill" data-goto-spec="${id}" style="--sk:var(--skill-${specSkill(id)})">Unlocks ${esc(s.name)}</button>`;
      }).join("");
      return `<div class="attr-row">
        <div class="attr-name">${esc(a)}</div>
        <div class="attr-desc">${esc(attributes[a] || "")}</div>
        <div class="attr-meta">
          ${n ? `<a class="meta-pill" href="reference-table.html?attr=${encodeURIComponent(a)}#badges">Keys ${n} badge${n === 1 ? "" : "s"}</a>` : `<span class="meta-pill">No badge keys on it</span>`}
          ${specLinks}
        </div>
      </div>`;
    }).join("");
    return `<div class="cat-group" style="--sk:var(--skill-${cat})">
      <div class="cat-head"><span class="dot" aria-hidden="true"></span><h3>${CAT_LABEL[cat]}</h3></div>${rows}</div>`;
  }).join("");

  document.getElementById("attrGroups").addEventListener("click", (e) => {
    const b = e.target.closest("[data-goto-spec]");
    if (!b) return;
    selectTab(tabFor("specializations"));
    selectSpec(b.dataset.gotoSpec);
    document.getElementById("specTabs").scrollIntoView({ block: "start" });
  });

  // ---------- Specializations ----------
  const specTabsEl = document.getElementById("specTabs");
  const specBody = document.getElementById("specBody");
  specTabsEl.innerHTML = specs.map((s, i) =>
    `<button type="button" role="tab" class="spec-tab" data-spec="${s.id}" aria-selected="${i === 0}" style="--sk:var(--skill-${specSkill(s.id)})"><span class="cdot" aria-hidden="true"></span>${esc(s.name)}</button>`
  ).join("");

  function unlockHTML(s) {
    if (!s.unlock.length) return `<p class="unlock-none">No attribute requirement. Any build can pick it.</p>`;
    // disjunctive normal form, exactly as published: groups joined by OR, conditions inside a group by AND
    return `<div class="unlock-list">${s.unlock.map((g, gi) => `
      ${gi > 0 ? `<span class="op-chip or">or</span>` : ""}
      <div class="unlock-group">${g.map((c, ci) => `${ci > 0 ? `<span class="op-chip and">and</span>` : ""}<span class="req-pill"><b>${c.min}</b> ${esc(c.attribute)}</span>`).join("")}</div>`).join("")}</div>`;
  }

  function selectSpec(id) {
    const s = specs.find((x) => x.id === id) || specs[0];
    currentSpec = s.id;
    if (!document.getElementById("panel-specializations").hidden) history.replaceState(null, "", `${location.pathname}?spec=${s.id}#specializations`);
    specTabsEl.querySelectorAll(".spec-tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.spec === s.id));
    specBody.style.setProperty("--sk", `var(--skill-${specSkill(s.id)})`);
    specBody.innerHTML = `<div class="spec-body">
      <div class="unlock"><h3>To unlock ${esc(s.name)}</h3>${unlockHTML(s)}</div>
      <div class="goals-wrap"><table class="goals">
        <caption class="sr-only" style="position:absolute;left:-9999px">${esc(s.name)} goals, requirements and rewards</caption>
        <thead><tr><th>Goal</th><th>Name</th><th>Requirement</th><th>Rewards</th></tr></thead>
        <tbody>${s.goals.map((g) => `<tr>
          <td class="goal-num">${g.goal}</td>
          <td class="goal-name">${esc(g.name)}</td>
          <td>${esc(g.requirement)}</td>
          <td><div class="rewards">${g.rewards.map((r) => `<span class="reward">${esc(r)}</span>`).join("")}</div></td>
        </tr>`).join("")}</tbody>
      </table></div>
    </div>`;
  }
  specTabsEl.addEventListener("click", (e) => {
    const t = e.target.closest(".spec-tab");
    if (t) selectSpec(t.dataset.spec);
  });
  selectSpec(specs[0].id);

  // ---------- Rebirth ----------
  document.getElementById("tierGrid").innerHTML = rebirth.tiers.map((t) => `
    <li class="tier" style="--tc:var(--accent-text)">
      <span class="tier-num">Tier ${esc(t.tier)}</span>
      <span class="tier-tokens">${esc(t.badgeTokens)}</span>
      <span class="tier-tokens-lbl">of your badge tokens on day one</span>
      ${t.extra ? `<span class="tier-extra">${esc(t.extra)}</span>` : ""}
      <div class="tier-status"><span>Status</span>${esc(t.status)}</div>
    </li>`).join("");
  document.getElementById("rebirthShared").textContent = rebirth.shared;
  document.getElementById("howGrid").innerHTML = rebirth.how.map((h) =>
    `<div class="how-item"><h3>${esc(h.title)}</h3><p>${esc(h.body)}</p></div>`).join("");
  document.getElementById("rebirthSrc").textContent = rebirth.source ? `Source: ${rebirth.source}` : "";

  // ---------- Workout Warrior ----------
  document.getElementById("wwAnswer").textContent = ww.answer;
  document.getElementById("wwSteps").innerHTML = ww.steps.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></li>`).join("");
  document.getElementById("wwList").innerHTML = ww.workouts.map((w, i) =>
    `<li><label><input type="checkbox" data-w="${i}"><span>${esc(w)}</span></label></li>`).join("");
  document.getElementById("wwFacts").innerHTML = ww.facts.map((f) => `<div class="fact"><dt>${esc(f.term)}</dt><dd>${esc(f.detail)}</dd></div>`).join("");
  const progressEl = document.getElementById("wwProgress");
  function updateProgress() {
    const done = document.querySelectorAll("#wwList input:checked").length;
    progressEl.textContent = done === ww.workouts.length ? "Workout Warrior unlocked" : `${done} / ${ww.workouts.length} done`;
  }
  document.getElementById("wwList").addEventListener("change", updateProgress);
  updateProgress();

  // ---------- initial tab from URL hash (#specializations, #rebirth, ...) ----------
  const initial = tabFor((location.hash || "").slice(1));
  const specParam = new URLSearchParams(location.search).get("spec");
  if (specParam && specs.some((x) => x.id === specParam)) {
    selectTab(tabFor("specializations"), { updateHash: false });
    selectSpec(specParam);
  } else if (initial) selectTab(initial, { updateHash: false });
  // same-page links (footer Reference column) change only the hash -- switch the tab too
  window.addEventListener("hashchange", () => {
    const t = tabFor((location.hash || "").slice(1));
    if (!t) return;
    selectTab(t, { updateHash: false });
    document.querySelector(".pagehead [role=tablist]").scrollIntoView({ block: "start" });
  });
})();
