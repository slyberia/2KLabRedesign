(function () {
  "use strict";

  // ---------- data ----------
  const badges = JSON.parse(document.getElementById("data-badges").textContent);
  const animations = JSON.parse(document.getElementById("data-anims").textContent);

  const ATTRIBUTE_CATEGORY = {
    "Close Shot": "finishing", "Driving Layup": "finishing", "Driving Dunk": "finishing",
    "Standing Dunk": "finishing", "Post Control": "finishing",
    "Mid-Range Shot": "shooting", "Three-Point Shot": "shooting", "Free Throw": "shooting",
    "Pass Accuracy": "playmaking", "Ball Handle": "playmaking", "Speed With Ball": "playmaking",
    "Interior Defense": "defense", "Perimeter Defense": "defense", "Steal": "defense", "Block": "defense",
    "Offensive Rebound": "rebounding", "Defensive Rebound": "rebounding",
    "Speed": "physical", "Agility": "physical", "Strength": "physical", "Vertical": "physical",
  };
  const CAT_LABEL = { finishing: "Finishing", shooting: "Shooting", playmaking: "Playmaking",
    defense: "Defense", rebounding: "Rebounding", physical: "Physical" };
  const CAT_ORDER = ["finishing", "shooting", "playmaking", "defense", "rebounding", "physical"];

  function primaryCategorySlug(badge) {
    return ATTRIBUTE_CATEGORY[badge.conditions[0].attribute] || "physical";
  }

  // ---------- deep links: ?badge=<id>&tier=<tier>&height=6-11&q=<search>, #badges|#animations ----------
  const params = new URLSearchParams(location.search);
  const TAB_HASH = { "tab-badges": "badges", "tab-anims": "animations", "tab-takeovers": "takeovers" };
  const NO_HEIGHT = new Set(["tab-takeovers"]);  // no published height requirements
  let focusTakeover = null;
  let focusBadge = null;
  let activeAttr = null;  // exact attribute filter (?attr=), unlike the substring search box
  let dlReady = false;  // don't rewrite the URL until the incoming link has been applied
  function syncURL() {
    if (!dlReady) return;
    const p = new URLSearchParams();
    if (focusBadge) p.set("badge", focusBadge);
    if (params.get("tier") && focusBadge) p.set("tier", params.get("tier"));
    if (activeHeight) p.set("height", activeHeight.replace("'", "-"));
    if (activeAttr) p.set("attr", activeAttr);
    const q = (document.getElementById("badgeSearch").value || "").trim(); if (q) p.set("q", q);
    if (focusTakeover) p.set("takeover", focusTakeover);
    const tab = document.querySelector('.pagehead .tabs [aria-selected="true"]');
    const hash = "#" + (TAB_HASH[tab && tab.id] || "badges");
    history.replaceState(null, "", `${location.pathname}${p.toString() ? "?" + p.toString() : ""}${hash}`);
  }

  // ---------- top-level tabs ----------
  const topTabs = [...document.querySelectorAll(".pagehead .tabs > [role=tab]")];
  function selectTopTab(tab) {
    topTabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    // the height filter has nothing to act on for takeovers / cap breakers -- hide it rather than let it silently do nothing
    document.querySelector(".heightbar").hidden = NO_HEIGHT.has(tab.id);
    syncURL();
  }
  topTabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTopTab(t));
    t.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const n = topTabs[(i + (e.key === "ArrowRight" ? 1 : topTabs.length - 1)) % topTabs.length];
        n.focus(); selectTopTab(n);
      }
    });
  });

  // ---------- height gating -- checked BEFORE any attribute, not a display column.
  // A badge/animation outside this range is unreachable at any attribute value. ----------
  function heightToInches(h) {
    const [feet, inches] = h.split("'").map(Number);
    return feet * 12 + inches;
  }
  function isWithinHeight(buildHeight, minH, maxH) {
    if (!buildHeight) return true; // "Any height" -- no filter applied
    const h = heightToInches(buildHeight);
    return h >= heightToInches(minH) && h <= heightToInches(maxH);
  }
  const HEIGHT_OPTIONS = (() => {
    const out = [];
    for (let ft = 5, inch = 9; ft < 7 || (ft === 7 && inch <= 4); ) {
      out.push(`${ft}'${inch}`);
      inch++;
      if (inch > 11) { inch = 0; ft++; }
    }
    return out;
  })();
  let activeHeight = "";

  const heightSelect = document.getElementById("heightSelect");
  HEIGHT_OPTIONS.forEach((h) => {
    const opt = document.createElement("option");
    opt.value = h; opt.textContent = h;
    heightSelect.appendChild(opt);
  });
  heightSelect.addEventListener("change", () => {
    activeHeight = heightSelect.value;
    document.getElementById("heightHint").textContent = activeHeight
      ? "Badges and animations outside this height are hidden below."
      : "";
    renderBadges();
    renderAnimations();
    syncURL();
  });

  // ---------- co-unlock crossing: which animations share this attribute+threshold ----------
  function findCrossings(attribute, value) {
    const hits = [];
    for (const a of animations) {
      if (!isWithinHeight(activeHeight, a.minHeight, a.maxHeight)) continue;
      const t = a.thresholds[attribute];
      if (t == null || t > value) continue;
      const otherAttrs = Object.keys(a.thresholds).filter((k) => k !== attribute);
      const fullyUnlocked = a.operator !== "AND" || otherAttrs.length === 0;
      hits.push({ ...a, fullyUnlocked, otherAttrs });
    }
    return hits;
  }

  // ---------- render: category filter chips ----------
  const chipRow = document.getElementById("catChips");
  chipRow.innerHTML =
    `<button class="chip is-on" data-cat="all" aria-pressed="true">All</button>` +
    CAT_ORDER.map((c) =>
      `<button class="chip" data-cat="${c}" aria-pressed="false" style="--sk:var(--skill-${c})">
         <span class="cdot" aria-hidden="true"></span>${CAT_LABEL[c]}</button>`
    ).join("");

  // ---------- render: badge cards ----------
  const groupsEl = document.getElementById("badgeGroups");
  const noneEl = document.getElementById("badgeNone");
  const countEl = document.getElementById("badgeCount");
  let activeCat = "all";
  let pinnedBadges = new Set();
  let pinnedAnims = new Set();
  let trayExpanded = false;
  let sideExpanded = false;

  function tierTileHTML(badgeId, cond, tier) {
    const val = cond[tier];
    const label = { bronze: "Bronze", silver: "Silver", gold: "Gold", hof: "HoF" }[tier];
    if (val == null) return `<span class="tile na" aria-label="${label}: not applicable"><span class="v">&mdash;</span></span>`;
    return `<button type="button" class="tile t-${tier}" data-badge="${badgeId}" data-attr="${cond.attribute}" data-value="${val}" data-tier="${tier}" aria-label="${label}: ${val}. Click to see animations unlocked at this rating."><span class="v">${val}</span></button>`;
  }

  function badgeCardHTML(b) {
    const c0 = b.conditions[0];
    const attrLabel = b.operator === "SINGLE"
      ? c0.attribute
      : `${b.conditions[0].attribute} <span class="op-chip ${b.operator.toLowerCase()}">${b.operator}</span> ${b.conditions[1].attribute}`;
    const isPinned = pinnedBadges.has(b.id);
    return `
      <div class="badge-card${isPinned ? " pinned" : ""}${focusBadge === b.id ? " is-focus" : ""}" data-badge-row="${b.id}" id="bcard-${b.id}">
        <div class="card-top">
          <input type="checkbox" class="pinbox" data-pin="${b.id}" ${isPinned ? "checked" : ""} aria-label="Pin ${b.name} to compare">
          <a class="badge-name" data-toggle-desc="${b.id}">${b.name}</a>
          <span class="attrs">${attrLabel}</span>
          <a class="card-link" href="builder.html?focus=${b.id}">Builder &rarr;</a>
        </div>
        <div class="tilerow">
          ${tierTileHTML(b.id, c0, "bronze")}
          ${tierTileHTML(b.id, c0, "silver")}
          ${tierTileHTML(b.id, c0, "gold")}
          ${tierTileHTML(b.id, c0, "hof")}
          <span class="htchip">${b.minHeight}&ndash;${b.maxHeight}</span>
        </div>
      </div>
      <div class="descrow" id="desc-${b.id}" hidden>
        <div class="inner">
          <div class="desc-text">${b.description || "No description available."}</div>
          <div class="crossings" id="crossings-${b.id}"></div>
        </div>
      </div>`;
  }

  function renderCrossings(badgeId, attribute, value, tier) {
    const el = document.getElementById(`crossings-${badgeId}`);
    const hits = findCrossings(attribute, value);
    if (hits.length === 0) {
      el.innerHTML = `<div class="crossings-head">Animations Unlocked at ${tier[0].toUpperCase() + tier.slice(1)} (${attribute} \u2265 ${value})</div>
        <div class="crossings-empty">No animations key on this attribute at this threshold.</div>`;
      el.classList.add("show");
      return;
    }
    const shown = hits.slice(0, 14);
    const items = shown.map((h) => {
      const note = h.fullyUnlocked ? "" : `<span class="sub">+ ${h.otherAttrs.join(", ")}</span>`;
      return `<span class="cross-item"><b>${h.animationName}</b><span class="sub">${h.subtype}</span>${note}</span>`;
    }).join("");
    const more = hits.length > shown.length ? `<span class="cross-item">+${hits.length - shown.length} more</span>` : "";
    el.innerHTML = `<div class="crossings-head">Animations Unlocked at ${tier[0].toUpperCase() + tier.slice(1)} &middot; ${attribute} \u2265 ${value} (${hits.length} total)</div>
      <div class="cross-list">${items}${more}</div>`;
    el.classList.add("show");
  }

  function renderBadges() {
    const q = (document.getElementById("badgeSearch").value || "").trim().toLowerCase();
    const filtered = badges.filter((b) => {
      const catOk = activeCat === "all" || primaryCategorySlug(b) === activeCat;
      const qOk = !q || b.name.toLowerCase().includes(q) ||
        b.conditions.some((c) => c.attribute.toLowerCase().includes(q));
      const heightOk = isWithinHeight(activeHeight, b.minHeight, b.maxHeight);
      const attrOk = !activeAttr || b.conditions.some((c) => c.attribute === activeAttr);
      return catOk && qOk && heightOk && attrOk;
    });
    countEl.textContent = `${filtered.length} of ${badges.length} badges`;
    const chip = document.getElementById("attrFilter");
    if (activeAttr) {
      chip.hidden = false;
      chip.innerHTML = `Keyed on <b>${activeAttr}</b> <button type="button" aria-label="Clear attribute filter">&times;</button>`;
    } else chip.hidden = true;
    noneEl.hidden = filtered.length > 0;

    const byCat = {};
    filtered.forEach((b) => {
      const cat = primaryCategorySlug(b);
      (byCat[cat] = byCat[cat] || []).push(b);
    });

    groupsEl.innerHTML = CAT_ORDER.filter((c) => byCat[c] && byCat[c].length).map((cat) => `
      <div class="cat-group" style="--sk:var(--skill-${cat})">
        <div class="cat-head"><span class="dot" aria-hidden="true"></span><h3>${CAT_LABEL[cat]}</h3><span class="count">${byCat[cat].length}</span></div>
        <div class="cardlist">${byCat[cat].map(badgeCardHTML).join("")}</div>
      </div>`).join("");
  }

  document.getElementById("badgeSearch").addEventListener("input", () => { renderBadges(); syncURL(); });
  document.getElementById("attrFilter").addEventListener("click", (e) => {
    if (!e.target.closest("button")) return;
    activeAttr = null; renderBadges(); syncURL(); document.getElementById("badgeSearch").focus();
  });
  chipRow.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    chipRow.querySelectorAll(".chip").forEach((c) => { c.classList.remove("is-on"); c.setAttribute("aria-pressed", "false"); });
    chip.classList.add("is-on"); chip.setAttribute("aria-pressed", "true");
    activeCat = chip.dataset.cat;
    renderBadges();
  });

  groupsEl.addEventListener("click", (e) => {
    const tc = e.target.closest(".tile:not(.na)");
    if (tc) {
      const { badge, attr, value, tier } = tc.dataset;
      const descRow = document.getElementById(`desc-${badge}`);
      descRow.hidden = false;
      renderCrossings(badge, attr, Number(value), tier);
      return;
    }
    const nameEl = e.target.closest("[data-toggle-desc]");
    if (nameEl) {
      const id = nameEl.dataset.toggleDesc;
      const row = document.getElementById(`desc-${id}`);
      row.hidden = !row.hidden;
    }
  });
  groupsEl.addEventListener("change", (e) => {
    const pin = e.target.closest(".pinbox");
    if (!pin) return;
    const id = pin.dataset.pin;
    if (pin.checked) { pinnedBadges.add(id); onPinAdded(); }
    else { pinnedBadges.delete(id); renderCompareTray(); renderSidePanel(); }
    document.querySelector(`[data-badge-row="${id}"]`).classList.toggle("pinned", pin.checked);
  });

  function totalPinned() { return pinnedBadges.size + pinnedAnims.size; }
  function onPinAdded() {
    trayExpanded = true;
    if (totalPinned() === 1) sideExpanded = false;
    renderCompareTray(); renderSidePanel();
  }

  // ---------- animations panel ----------
  const SUBTYPES = ["jumper", "shooting", "dribble", "motionStyle", "finishing"];
  const SUBTYPE_LABEL = { jumper: "Jumpers", shooting: "Shooting Packages", dribble: "Dribble Moves", motionStyle: "Motion Styles", finishing: "Finishing" };
  let activeSubtype = "jumper";
  let animPage = 0;
  const PAGE_SIZE = 25;

  const subtabsEl = document.getElementById("animSubtabs");
  subtabsEl.innerHTML = SUBTYPES.map((s) =>
    `<button class="subtab" data-sub="${s}" aria-pressed="${s === activeSubtype}">${SUBTYPE_LABEL[s]}</button>`
  ).join("");
  subtabsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".subtab");
    if (!b) return;
    subtabsEl.querySelectorAll(".subtab").forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    activeSubtype = b.dataset.sub;
    animPage = 0;
    renderAnimations();
  });
  document.getElementById("animSearch").addEventListener("input", () => { animPage = 0; renderAnimations(); });
  document.getElementById("panel-anims").addEventListener("change", (e) => {
    const pin = e.target.closest(".animpin");
    if (!pin) return;
    const id = pin.dataset.pin;
    if (pin.checked) { pinnedAnims.add(id); onPinAdded(); }
    else { pinnedAnims.delete(id); renderCompareTray(); renderSidePanel(); }
  });

  function thresholdPillsHTML(a) {
    const entries = Object.entries(a.thresholds);
    const pills = entries.map(([attr, val]) =>
      `<span class="thresh-pill"><span class="dot" style="--sk:var(--skill-${ATTRIBUTE_CATEGORY[attr]})"></span>${attr} ${val}+</span>`
    ).join("");
    const op = entries.length > 1 ? `<span class="op-chip ${a.operator.toLowerCase()}">${a.operator}</span>` : "";
    return pills + op;
  }

  function renderAnimations() {
    const q = (document.getElementById("animSearch").value || "").trim().toLowerCase();
    const filtered = animations.filter((a) => a.subtype === activeSubtype &&
      (!q || a.animationName.toLowerCase().includes(q) || (a.packageLabel || "").toLowerCase().includes(q)) &&
      isWithinHeight(activeHeight, a.minHeight, a.maxHeight));
    document.getElementById("animCount").textContent = `${filtered.length} ${SUBTYPE_LABEL[activeSubtype].toLowerCase()}`;
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    animPage = Math.min(animPage, totalPages - 1);
    const page = filtered.slice(animPage * PAGE_SIZE, animPage * PAGE_SIZE + PAGE_SIZE);

    document.getElementById("animBody").innerHTML = page.length
      ? page.map((a) => `
        <tr>
          <td><input type="checkbox" class="pinbox animpin" data-pin="${a.id}" ${pinnedAnims.has(a.id) ? "checked" : ""} aria-label="Pin ${a.animationName} to compare"></td>
          <td><span class="anim-name">${a.animationName}</span>${a.packageLabel ? `<div class="anim-pkg">${a.packageLabel}</div>` : ""}</td>
          <td>${thresholdPillsHTML(a)}</td>
          <td class="htcell">${a.minHeight}&ndash;${a.maxHeight}</td>
        </tr>`).join("")
      : `<tr><td colspan="4" class="noresults">No animations match your search.</td></tr>`;

    document.getElementById("animPager").innerHTML = `
      <button id="pgPrev" ${animPage === 0 ? "disabled" : ""}>&larr; Prev</button>
      <span class="pageinfo">Page ${animPage + 1} of ${totalPages}</span>
      <button id="pgNext" ${animPage >= totalPages - 1 ? "disabled" : ""}>Next &rarr;</button>`;
    document.getElementById("pgPrev")?.addEventListener("click", () => { animPage--; renderAnimations(); });
    document.getElementById("pgNext")?.addEventListener("click", () => { animPage++; renderAnimations(); });
  }

  // ---------- shared compare data (badges AND animations, two sections, never merged) ----------
  function pinnedBadgeList() { return badges.filter((b) => pinnedBadges.has(b.id)); }
  function pinnedAnimList() { return animations.filter((a) => pinnedAnims.has(a.id)); }

  function badgeSectionHTML(compact) {
    const list = pinnedBadgeList();
    if (!list.length) return "";
    const rows = [
      { lbl: "Attribute", get: (b) => b.conditions.map((c) => c.attribute).join(b.operator === "AND" ? " + " : " / ") + (b.operator !== "SINGLE" ? ` (${b.operator})` : "") },
      { lbl: "Bronze", get: (b) => b.conditions[0].bronze ?? "\u2014" },
      { lbl: "Silver", get: (b) => b.conditions[0].silver ?? "\u2014" },
      { lbl: "Gold", get: (b) => b.conditions[0].gold ?? "\u2014" },
      { lbl: "HoF", get: (b) => b.conditions[0].hof ?? "\u2014" },
      { lbl: "Height", get: (b) => `${b.minHeight}\u2013${b.maxHeight}` },
    ];
    let html = `<div class="ct-cell lbl"></div>` + list.map((b) => `<div class="ct-cell name">${b.name}</div>`).join("");
    rows.forEach((r) => { html += `<div class="ct-cell lbl">${r.lbl}</div>` + list.map((b) => `<div class="ct-cell">${r.get(b)}</div>`).join(""); });
    return `<div class="ct-cell lbl" style="background:transparent;padding-left:0;margin-bottom:.3rem">Badges (${list.length})</div>
      <div class="ct-grid" style="grid-template-columns:120px repeat(${list.length},1fr)">${html}</div>`;
  }
  function animSectionHTML() {
    const list = pinnedAnimList();
    if (!list.length) return "";
    const attrUnion = [...new Set(list.flatMap((a) => Object.keys(a.thresholds)))];
    let html = `<div class="ct-cell lbl"></div>` + list.map((a) => `<div class="ct-cell name">${a.animationName}</div>`).join("");
    html += `<div class="ct-cell lbl">Type</div>` + list.map((a) => `<div class="ct-cell">${SUBTYPE_LABEL[a.subtype]}</div>`).join("");
    attrUnion.forEach((attr) => {
      html += `<div class="ct-cell lbl">${attr}</div>` + list.map((a) => {
        const v = a.thresholds[attr];
        return v == null ? `<div class="ct-cell">\u2014 not required</div>` : `<div class="ct-cell">${v}+</div>`;
      }).join("");
    });
    html += `<div class="ct-cell lbl">Height</div>` + list.map((a) => `<div class="ct-cell">${a.minHeight}\u2013${a.maxHeight}</div>`).join("");
    return `<div class="ct-cell lbl" style="background:transparent;padding-left:0;margin:var(--space-4) 0 .3rem">Animations (${list.length})</div>
      <div class="ct-grid vertical" style="grid-template-columns:120px repeat(${list.length},1fr)">${html}</div>`;
  }
  function clearAllPins() {
    pinnedBadges.clear(); pinnedAnims.clear(); trayExpanded = false; sideExpanded = false;
    document.querySelectorAll(".pinbox").forEach((cb) => (cb.checked = false));
    document.querySelectorAll("[data-badge-row]").forEach((r) => r.classList.remove("pinned"));
    renderCompareTray(); renderSidePanel();
  }

  // ---------- mobile bottom tray (<768px) ----------
  const tray = document.getElementById("compareTray");
  const handle = document.getElementById("ctHandle");
  const bodyEl = document.getElementById("ctBody");
  const titleEl = document.getElementById("ctTitle");

  function renderCompareTray() {
    const total = totalPinned();
    titleEl.textContent = `Compare (${total})`;
    tray.classList.toggle("has-items", total > 0);
    tray.classList.toggle("expanded", trayExpanded && total > 0);
    handle.setAttribute("aria-expanded", trayExpanded && total > 0 ? "true" : "false");
    if (total === 0) { bodyEl.innerHTML = ""; return; }
    bodyEl.innerHTML = `<button class="ct-clear" id="ctClear">Clear all</button>${badgeSectionHTML()}${animSectionHTML()}`;
    document.getElementById("ctClear").addEventListener("click", clearAllPins);
  }
  handle.addEventListener("click", () => { trayExpanded = !trayExpanded; renderCompareTray(); });

  // ---------- desktop/tablet side panel (>=768px) ----------
  const sidePanel = document.getElementById("sidePanel");
  const spToggle = document.getElementById("spToggle");
  const spBody = document.getElementById("spBody");
  const spTitle = document.getElementById("spTitle");

  function miniCardsHTML() {
    const badgeCards = pinnedBadgeList().map((b) => `
      <div class="mini-preset" style="--sk:var(--skill-${primaryCategorySlug(b)})">
        <button type="button" class="mp-remove" data-unpin-badge="${b.id}" aria-label="Remove ${b.name}">&times;</button>
        <div class="mp-name">${b.name}<span class="mp-type">Badge</span></div>
        <div class="mp-meta">${b.conditions[0].attribute}${b.operator !== "SINGLE" ? ` ${b.operator}` : ""}</div>
      </div>`).join("");
    const animCards = pinnedAnimList().map((a) => `
      <div class="mini-preset" style="--sk:var(--skill-${ATTRIBUTE_CATEGORY[Object.keys(a.thresholds)[0]] || "physical"})">
        <button type="button" class="mp-remove" data-unpin-anim="${a.id}" aria-label="Remove ${a.animationName}">&times;</button>
        <div class="mp-name">${a.animationName}<span class="mp-type">${SUBTYPE_LABEL[a.subtype]}</span></div>
        <div class="mp-meta">${a.minHeight}&ndash;${a.maxHeight}</div>
      </div>`).join("");
    return `<div class="sp-cards">${badgeCards}${animCards}</div>`;
  }

  function renderSidePanel() {
    const total = totalPinned();
    spTitle.textContent = `Compare (${total})`;
    sidePanel.classList.toggle("has-items", total > 0);
    sidePanel.classList.toggle("extended", sideExpanded && total > 0);
    document.body.classList.toggle("side-has-items", total > 0);
    document.body.classList.toggle("side-extended", sideExpanded && total > 0);
    spToggle.setAttribute("aria-expanded", sideExpanded && total > 0 ? "true" : "false");
    spToggle.textContent = sideExpanded ? "Show Condensed" : "View Full Comparison \u2192";
    spToggle.disabled = total < 2;
    if (!total) { spBody.innerHTML = ""; return; }

    let html = miniCardsHTML();
    if (sideExpanded && total >= 2) {
      html += badgeSectionHTML() + animSectionHTML();
    } else if (total === 1) {
      html += `<p class="sp-hint">Pin one more to compare them side by side.</p>`;
    }
    spBody.innerHTML = html;
  }
  spToggle.addEventListener("click", () => { sideExpanded = !sideExpanded; renderSidePanel(); });
  document.getElementById("spClear").addEventListener("click", clearAllPins);
  spBody.addEventListener("click", (e) => {
    const rmB = e.target.closest("[data-unpin-badge]");
    if (rmB) {
      const id = rmB.dataset.unpinBadge;
      pinnedBadges.delete(id);
      const cb = document.querySelector(`.pinbox[data-pin="${id}"]`); if (cb) cb.checked = false;
      document.querySelector(`[data-badge-row="${id}"]`)?.classList.remove("pinned");
      renderCompareTray(); renderSidePanel();
      return;
    }
    const rmA = e.target.closest("[data-unpin-anim]");
    if (rmA) {
      const id = rmA.dataset.unpinAnim;
      pinnedAnims.delete(id);
      const cb = document.querySelector(`.animpin[data-pin="${id}"]`); if (cb) cb.checked = false;
      renderCompareTray(); renderSidePanel();
    }
  });

  // ---------- Takeovers ----------
  const takeovers = JSON.parse(document.getElementById("data-takeovers").textContent);
  const TK_ORDER = ["Shooting", "Finishing", "Playmaking", "Defense", "Rebounding", "Universal"];
  const tkSkill = (cat) => (cat === "Universal" ? "var(--text-subtle)" : `var(--skill-${cat.toLowerCase()})`);
  const escT = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  {
    const always = takeovers.filter((t) => t.operator === "ALWAYS").length;
    document.getElementById("tkLede").textContent =
      `All ${takeovers.length} takeovers. ${always} are always available; the other ${takeovers.length - always} unlock at an attribute rating. No height requirements are published for takeovers.`;
  }
  function tkReqHTML(t) {
    if (t.operator === "ALWAYS") return `<span class="req-pill always">Always available</span>`;
    return t.conditions.map((c, i) =>
      `${i ? `<span class="op-chip ${t.operator.toLowerCase()}">${t.operator}</span>` : ""}<span class="req-pill" style="--sk:${tkSkill(ATTRIBUTE_CATEGORY[c.attribute] ? CAT_LABEL[ATTRIBUTE_CATEGORY[c.attribute]] : "Universal")}"><b>${c.min}</b> ${escT(c.attribute)}</span>`).join("");
  }
  function renderTakeovers() {
    const q = (document.getElementById("tkSearch").value || "").trim().toLowerCase();
    const list = takeovers.filter((t) => !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) ||
      t.conditions.some((c) => c.attribute.toLowerCase().includes(q)) || t.summary.toLowerCase().includes(q));
    document.getElementById("tkCount").textContent = `${list.length} of ${takeovers.length} takeovers`;
    document.getElementById("tkNone").hidden = list.length > 0;
    document.getElementById("tkGroups").innerHTML = TK_ORDER.map((cat) => {
      const items = list.filter((t) => t.category === cat);
      if (!items.length) return "";
      return `<div class="cat-group" style="--sk:${tkSkill(cat)}">
        <div class="cat-head"><span class="dot" aria-hidden="true"></span><h3>${cat}</h3><span class="count">${items.length}</span></div>
        <div class="cardlist">${items.map((t) => `<article class="tk-card${focusTakeover === t.id ? " is-focus" : ""}" id="tk-${t.id}">
          <div class="tk-name">${escT(t.name)}</div>
          <div class="tk-req">${tkReqHTML(t)}</div>
          <div class="tk-desc">${escT(t.summary)}${t.detail ? `<span>${escT(t.detail)}</span>` : ""}</div>
        </article>`).join("")}</div></div>`;
    }).join("");
  }
  document.getElementById("tkSearch").addEventListener("input", renderTakeovers);

  // ---------- init ----------
  renderBadges();
  renderAnimations();
  renderTakeovers();
  renderCompareTray();
  renderSidePanel();
  (function applyDeepLink() {
    const fromHash = Object.keys(TAB_HASH).find((k) => "#" + TAB_HASH[k] === location.hash);
    if (fromHash) selectTopTab(document.getElementById(fromHash));
    const tkId = params.get("takeover");
    const tkHit = takeovers.find((t) => t.id === tkId);
    if (tkHit) {
      focusTakeover = tkHit.id;
      selectTopTab(document.getElementById("tab-takeovers"));
      renderTakeovers();
      document.getElementById(`tk-${tkHit.id}`)?.scrollIntoView({ block: "center" });
    }
    const at = params.get("attr");
    if (at && Object.prototype.hasOwnProperty.call(ATTRIBUTE_CATEGORY, at)) { activeAttr = at; renderBadges(); }
    const q = params.get("q");
    if (q) { document.getElementById("badgeSearch").value = q; renderBadges(); }
    const hp = (params.get("height") || "").replace("-", "'");
    if (hp && HEIGHT_OPTIONS.includes(hp)) { heightSelect.value = hp; heightSelect.dispatchEvent(new Event("change")); }
    const id = params.get("badge");
    const b = badges.find((x) => x.id === id);
    if (b) {
      focusBadge = b.id;
      selectTopTab(document.getElementById("tab-badges"));
      renderBadges();
      const card = document.getElementById(`bcard-${b.id}`);
      if (!card) {
        // hidden by the height filter: the badge is out of reach at this height -- say so instead of silently showing nothing
        const n = document.createElement("p"); n.className = "dl-notice";
        n.innerHTML = `<b>${b.name}</b> isn't available at ${activeHeight} (its height range is ${b.minHeight}&ndash;${b.maxHeight}). <button type="button" id="dlClearH">Show all heights</button>`;
        document.getElementById("badgeGroups").before(n);
        document.getElementById("dlClearH").addEventListener("click", () => {
          heightSelect.value = ""; heightSelect.dispatchEvent(new Event("change")); n.remove();
          document.getElementById(`bcard-${b.id}`)?.scrollIntoView({ block: "center" });
        });
      } else {
        document.getElementById(`desc-${b.id}`).hidden = false;
        const tier = params.get("tier"), c0 = b.conditions[0];
        if (["bronze", "silver", "gold", "hof"].includes(tier) && c0[tier] != null) renderCrossings(b.id, c0.attribute, c0[tier], tier);
        card.scrollIntoView({ block: "center" });
      }
    }
    dlReady = true; syncURL();
  })();
  // same-page links (e.g. the footer's #cap-breakers) change only the hash -- switch the tab too
  window.addEventListener("hashchange", () => {
    const k = Object.keys(TAB_HASH).find((x) => "#" + TAB_HASH[x] === location.hash);
    if (!k) return;
    selectTopTab(document.getElementById(k));
    document.querySelector(".pagehead .tabs").scrollIntoView({ block: "start" });
  });
})();
