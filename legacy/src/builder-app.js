(function () {
  "use strict";

  // ---------- data ----------
  const badges = JSON.parse(document.getElementById("data-badges").textContent);
  const animations = JSON.parse(document.getElementById("data-anims").textContent);
  const blueprints = JSON.parse(document.getElementById("data-blueprints").textContent);
  const players = JSON.parse(document.getElementById("data-players").textContent);
  const attrDescriptions = JSON.parse(document.getElementById("data-attrdesc").textContent);
  const specRules = JSON.parse(document.getElementById("data-specs").textContent);
  const takeoverRules = JSON.parse(document.getElementById("data-takeovers").textContent);
  // Takeover unlock, straight from the published rule: ALWAYS | SINGLE | all-AND | all-OR (no published takeover mixes the two)
  function takeoverUnlocked(t, attrs) {
    if (t.operator === "ALWAYS") return true;
    const hit = t.conditions.map((c) => (attrs[c.attribute] ?? -1) >= c.min);
    return t.operator === "OR" ? hit.some(Boolean) : hit.every(Boolean);
  }

  // ---------- deep links: ?preset=blueprint:<id>|player:<id> & focus=<badgeId> ----------
  const params = new URLSearchParams(location.search);
  let focusBadge = null;           // badge id to highlight; lives in state because the panel re-renders on every slider move
  const heightParam = (h) => h.replace("'", "-");   // 6'11 -> 6-11 (URL-safe, readable)
  // ---------- shareable builds: ?a=<code><value>.<code><value>... ----------
  // Only attributes that differ from the archetype's starting (floor) value are written.
  // Codes are letters only, so "tpt93" can never be misread. This is the same format a
  // saved build will store once accounts exist.
  const ATTR_CODE = {
    "Close Shot": "cls", "Driving Layup": "lay", "Driving Dunk": "dnk", "Standing Dunk": "sdk", "Post Control": "pst",
    "Mid-Range Shot": "mid", "Three-Point Shot": "tpt", "Free Throw": "ft",
    "Pass Accuracy": "pas", "Ball Handle": "bh", "Speed With Ball": "swb",
    "Interior Defense": "id", "Perimeter Defense": "pd", "Steal": "stl", "Block": "blk",
    "Offensive Rebound": "orb", "Defensive Rebound": "drb",
    "Speed": "spd", "Agility": "agl", "Strength": "str", "Vertical": "vrt",
  };
  const CODE_ATTR = Object.fromEntries(Object.entries(ATTR_CODE).map(([a, c]) => [c, a]));
  function changedAttrs() {
    if (!currentBuild || currentBuild.capMode !== "blueprint-range") return [];
    const range = currentPreset.data.attributeRange;
    return Object.keys(ATTR_CODE).filter((a) => range[a] && currentBuild.attributes[a] !== range[a][0]);
  }
  function encodeOverrides() { return changedAttrs().map((a) => ATTR_CODE[a] + currentBuild.attributes[a]).join("."); }
  // -> { values: {attr: v}, clamped: [{attr, asked, used}] }. Unknown or malformed parts are ignored;
  // values outside the archetype's published range are pulled back into it and reported, never used as-is.
  function decodeOverrides(param, bp) {
    const out = { values: {}, clamped: [] };
    if (!param || !Object.values(bp.attributeRange).every(([, max]) => max != null)) return out;
    param.split(".").forEach((part) => {
      const m = /^([a-z]+)(\d{1,3})$/.exec(part); if (!m) return;
      const attr = CODE_ATTR[m[1]], r = attr && bp.attributeRange[attr]; if (!r) return;
      const asked = +m[2], used = Math.min(r[1], Math.max(r[0], asked));
      if (used !== asked) out.clamped.push({ attr, asked, used });
      out.values[attr] = used;
    });
    return out;
  }
  function buildQuery() {
    const p = new URLSearchParams();
    if (currentPreset) p.set("preset", `${currentPreset.type}:${currentPreset.type === "blueprint" ? currentPreset.data.id : currentPreset.data.playerId}`);
    const a = encodeOverrides(); if (a) p.set("a", a);
    return p;
  }
  // ":" and "." are legal in a query string; keep them literal so shared links stay readable
  const readable = (p) => p.toString().replace(/%3A/gi, ":");
  function syncURL() {
    const p = buildQuery();
    if (focusBadge) p.set("focus", focusBadge);
    history.replaceState(null, "", `${location.pathname}?${readable(p)}`);
  }
  // Sliders fire "input" continuously; Safari caps history rewrites (~100 per 30s), so batch them.
  let syncTimer = null;
  function syncURLSoon() { clearTimeout(syncTimer); syncTimer = setTimeout(syncURL, 250); }
  // Specialization eligibility, straight from the published unlock rules:
  // OR across groups, AND within a group; no groups = any build qualifies (Physicals).
  function qualifiesFor(rule, attrs) {
    if (!rule.unlock.length) return true;
    return rule.unlock.some((g) => g.every((c) => (attrs[c.attribute] ?? -1) >= c.min));
  }

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
  const TIER_LABEL = { bronze: "Bronze", silver: "Silver", gold: "Gold", hof: "HoF" };
  const TIER_ORDER = ["hof", "gold", "silver", "bronze"];
  const SUBTYPE_LABEL = { jumper: "Jumpers", shooting: "Shooting Pkgs", dribble: "Dribble Moves", motionStyle: "Motion Styles", finishing: "Finishing" };

  // ---------- height gating (same rule as the Reference Table and schema.ts:
  // a badge/animation outside this range is unreachable at ANY attribute value) ----------
  function heightToInches(h) {
    const [feet, inches] = h.split("'").map(Number);
    return feet * 12 + inches;
  }
  function isWithinHeight(buildHeight, minH, maxH) {
    const h = heightToInches(buildHeight);
    return h >= heightToInches(minH) && h <= heightToInches(maxH);
  }

  // ---------- derivation logic -- ported directly from the validated schema.ts ----------
  function tierForValue(value, cond) {
    const bound = (x) => (x == null ? Infinity : x);
    if (value >= bound(cond.hof)) return "hof";
    if (value >= bound(cond.gold)) return "gold";
    if (value >= bound(cond.silver)) return "silver";
    if (value >= bound(cond.bronze)) return "bronze";
    return "none";
  }
  const rank = (t) => (t === "none" ? 0 : 4 - TIER_ORDER.indexOf(t));

  function getBadgeStatus(build, req) {
    if (!isWithinHeight(build.height, req.minHeight, req.maxHeight)) return { tier: "none" };
    const results = req.conditions.map((c) => {
      const v = build.attributes[c.attribute];
      return v == null ? "none" : tierForValue(v, c);
    });
    if (req.operator === "SINGLE") return { tier: results[0] };
    if (req.operator === "OR") {
      let best = "none";
      results.forEach((t) => { if (rank(t) > rank(best)) best = t; });
      return { tier: best };
    }
    return { tier: results.reduce((a, b) => (rank(a) <= rank(b) ? a : b)) }; // AND -> weaker
  }

  function getAnimationUnlocked(build, req) {
    if (!isWithinHeight(build.height, req.minHeight, req.maxHeight)) return false;
    const checks = Object.entries(req.thresholds).map(([attr, min]) => {
      const v = build.attributes[attr];
      return v != null && min != null && v >= min;
    });
    if (checks.length === 0) return false;
    return req.operator === "OR" ? checks.some(Boolean) : checks.every(Boolean);
  }

  // ---------- state ----------
  let currentBuild = null;        // { position, height, weight, wingspan, attributes, sourcePreset, capMode }
  let currentPreset = null;       // { type: "blueprint"|"player", data }
  let pinnedPresets = [];         // [{type, id}] for the compare tray
  let trayExpanded = false;

  // ---------- preset pickers ----------
  const bpGrid = document.getElementById("bpGrid");
  const plGrid = document.getElementById("plGrid");

  function pinBtnHTML(type, id) {
    const pinned = pinnedPresets.some((p) => p.type === type && p.id === id);
    return `<button type="button" class="pinpreset" data-pintype="${type}" data-pinid="${id}" aria-pressed="${pinned}" aria-label="${pinned ? "Unpin" : "Pin"} to compare" title="Pin to compare">${pinned ? "&#9733;" : "&#9734;"}</button>`;
  }

  function renderBlueprintGrid() {
    const q = (document.getElementById("bpSearch").value || "").trim().toLowerCase();
    const list = blueprints.filter((b) => !q || b.archetype.toLowerCase().includes(q) || b.position.toLowerCase().includes(q) || b.bestSkill.toLowerCase().includes(q));
    bpGrid.innerHTML = list.map((b) => `
      <button type="button" class="preset-card${currentPreset && currentPreset.type === "blueprint" && currentPreset.data.id === b.id ? " active" : ""}" data-load="blueprint:${b.id}" style="--sk:var(--skill-${b.bestSkill.toLowerCase()})">
        <span class="po${b.potentialOverall == null ? " unpub" : ""}">${b.potentialOverall ?? "&mdash;"}</span>
        <div class="pn">${b.archetype}</div>
        <div class="pm">${b.position} &middot; ${b.height} &middot; ${b.bestSkill}</div>
      </button>`).join("") || `<p class="derived-empty" style="grid-column:1/-1">No archetypes match.</p>`;
  }
  function renderPlayerGrid() {
    const q = (document.getElementById("plSearch").value || "").trim().toLowerCase();
    const list = players.filter((p) => !q || p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q)).slice(0, 60);
    plGrid.innerHTML = list.map((p) => `
      <button type="button" class="preset-card${currentPreset && currentPreset.type === "player" && currentPreset.data.playerId === p.playerId ? " active" : ""}" data-load="player:${p.playerId}">
        <span class="po">${p.overall}</span>
        <div class="pn">${p.name}</div>
        <div class="pm">${p.position} &middot; ${p.height} &middot; ${p.team}</div>
      </button>`).join("") || `<p class="derived-empty" style="grid-column:1/-1">No players match. Try a full or partial name.</p>`;
  }

  document.getElementById("bpSearch").addEventListener("input", renderBlueprintGrid);
  document.getElementById("plSearch").addEventListener("input", renderPlayerGrid);

  // top-level preset-type tabs
  const ptabs = [...document.querySelectorAll(".picker-tabs [role=tab]")];
  ptabs.forEach((t) => t.addEventListener("click", () => {
    ptabs.forEach((x) => { x.setAttribute("aria-selected", x === t ? "true" : "false"); x.tabIndex = x === t ? 0 : -1; document.getElementById(x.getAttribute("aria-controls")).hidden = x !== t; });
  }));

  // ---------- load a preset into the live Build ----------
  let clampNote = [];  // values a shared link asked for that were outside the published range
  function loadBlueprint(bp, overrides) {
    const attrs = {};
    Object.entries(bp.attributeRange).forEach(([k, [min]]) => { attrs[k] = min; }); // start at the archetype's floor
    Object.assign(attrs, (overrides && overrides.values) || {});                   // shared-link values, already clamped
    clampNote = (overrides && overrides.clamped) || [];
    // Only 9 of 40 archetypes have a published ceiling for every attribute; the
    // other 31 only ever had a floor published (confirmed: this set is IDENTICAL
    // to the set with a published potentialOverall -- 2KLab never finished
    // publishing a ceiling for the rest). Faking a max bound for those would be
    // exactly the fabricated-cap problem this project has deliberately avoided
    // throughout, so they render fixed, the same as a real player's card.
    const hasFullRange = Object.values(bp.attributeRange).every(([, max]) => max != null);
    currentBuild = { position: bp.position, height: bp.height, weight: bp.weight, wingspan: bp.wingspan, attributes: attrs, sourcePreset: { type: "blueprint", id: bp.id }, capMode: hasFullRange ? "blueprint-range" : "blueprint-floor-only" };
    currentPreset = { type: "blueprint", data: bp };
    afterLoad();
  }
  function loadPlayer(p) {
    clampNote = [];
    currentBuild = { position: p.position, height: p.height, weight: null, wingspan: p.height, attributes: { ...p.attributes }, sourcePreset: { type: "player", id: p.playerId }, capMode: "fixed" };
    currentPreset = { type: "player", data: p };
    afterLoad();
  }
  function afterLoad() {
    document.getElementById("emptyState").hidden = true;
    const n = document.getElementById("dlNotice"); if (n) n.remove();
    document.getElementById("workspace").hidden = false;
    renderLoadedBanner();
    renderAttributeWorkspace();
    renderDerivedPanel();
    renderBlueprintGrid(); renderPlayerGrid(); // refresh .active state
    syncURL();
    if (focusBadge) {
      const el = document.getElementById(`bcard-${focusBadge}`);
      if (el) el.scrollIntoView({ block: "center" });
    }
  }

  document.getElementById("bpGrid").addEventListener("click", (e) => {
    const card = e.target.closest("[data-load]");
    if (card) { const id = card.dataset.load.split(":")[1]; loadBlueprint(blueprints.find((b) => b.id === id)); return; }
    const pin = e.target.closest(".pinpreset");
    if (pin) togglePin(pin.dataset.pintype, pin.dataset.pinid);
  });
  document.getElementById("plGrid").addEventListener("click", (e) => {
    const card = e.target.closest("[data-load]");
    if (card) { const id = Number(card.dataset.load.split(":")[1]); loadPlayer(players.find((p) => p.playerId === id)); return; }
    const pin = e.target.closest(".pinpreset");
    if (pin) togglePin(pin.dataset.pintype, pin.dataset.pinid);
  });

  // ---------- loaded preset banner ----------
  function renderLoadedBanner() {
    const el = document.getElementById("loadedBanner");
    if (!currentPreset) { el.innerHTML = ""; return; }
    const isBp = currentPreset.type === "blueprint";
    const d = currentPreset.data;
    const potentialLabel = isBp ? "Archetype Potential" : "Player Overall";
    const potentialVal = isBp ? d.potentialOverall : d.overall;
    const potentialDisplay = potentialVal == null ? `<span class="unpub-num">&mdash;</span>` : potentialVal;
    const potentialSub = potentialVal == null ? "Not published by 2KLab" : potentialLabel;
    const comps = isBp && d.comparisons.length ? `<div class="lcomps">Plays like: ${d.comparisons.join(", ")}</div>` : "";
    const pinned = pinnedPresets.some((p) => p.type === currentPreset.type && p.id === String(isBp ? d.id : d.playerId));
    el.innerHTML = `
      <div class="loaded">
        <div>
          <span class="lname">${isBp ? d.archetype : d.name}<span class="ltype">${isBp ? "Blueprint" : "Real Player"}</span></span>
          <div class="lmeta">${d.position} &middot; ${d.height}${isBp ? ` &middot; ${d.weight} lbs &middot; ${d.wingspan} wingspan` : ` &middot; ${d.team}`}</div>
          ${comps}
          ${clampNote.length ? `<p class="clamp-note" role="status">This link had values outside the archetype&rsquo;s range, so they were adjusted: ${clampNote.map((c) => `${c.attr} ${c.asked} &rarr; ${c.used}`).join(", ")}.</p>` : ""}
          <div class="lactions"><button type="button" class="btn btn-primary" id="saveBuildBtn">Save build</button><button type="button" class="btn btn-ghost" id="copyLinkBtn">Copy link</button>${currentBuild.capMode === "blueprint-range" ? `<button type="button" class="btn btn-ghost" id="resetBuildBtn">Reset</button><span class="custom-state" id="customState"></span>` : ""}<span class="copy-msg" id="copyMsg" role="status" aria-live="polite"></span><button type="button" class="btn btn-ghost" id="pinCurrentBtn" data-pintype="${currentPreset.type}" data-pinid="${isBp ? d.id : d.playerId}">${pinned ? "&#9733; Pinned" : "&#9734; Pin to Compare"}</button></div>
        </div>
        <div class="lpotential"><div class="num">${potentialDisplay}</div><div class="cap">${potentialSub}</div></div>
      </div>`;
    document.getElementById("pinCurrentBtn").addEventListener("click", (e) => togglePin(e.target.dataset.pintype, e.target.dataset.pinid));
    document.getElementById("copyLinkBtn").addEventListener("click", copyLink);
    document.getElementById("saveBuildBtn").addEventListener("click", () => {
      if (!acct || acct.available === false) return showSaveMsg("Saving builds works on the deployed site.");
      if (!acct.user) return acct.signIn(() => openSaveForm());
      openSaveForm();
    });
    const rb = document.getElementById("resetBuildBtn");
    if (rb) rb.addEventListener("click", () => {
      const bp = currentPreset.data;
      Object.entries(bp.attributeRange).forEach(([k, [min]]) => { currentBuild.attributes[k] = min; });
      clampNote = [];
      renderLoadedBanner(); renderAttributeWorkspace(); renderDerivedPanel(); syncURL();
      document.getElementById("resetBuildBtn").focus();
    });
    updateCustomState();
  }

  // ---------- phone/tablet: collapsible categories + live results bar ----------
  const narrow = window.matchMedia("(max-width: 1050px)");   // same breakpoint where the workspace stacks
  const catOpen = {};
  document.getElementById("badgeGroups").addEventListener("toggle", (e) => {
    const d = e.target.closest && e.target.closest("details[data-cat]"); if (d) catOpen[d.dataset.cat] = d.open;
  }, true);
  let lastTotals = null;
  function updateResultsBar(t, anims) {
    const bar = document.getElementById("resultsBar"); if (!bar) return;
    bar.hidden = false;
    const key = JSON.stringify([t, anims]);
    bar.querySelector(".rb-stats").innerHTML =
      ["hof", "gold", "silver", "bronze"].map((k) => `<span class="rb-t rb-${k}"><b>${t[k]}</b> ${TIER_LABEL[k]}</span>`).join("") +
      `<span class="rb-t"><b>${anims}</b> anims</span>`;
    if (lastTotals && lastTotals !== key) { bar.classList.remove("pulse"); void bar.offsetWidth; bar.classList.add("pulse"); }
    lastTotals = key;
  }
  document.getElementById("rbJump").addEventListener("click", () => {
    const d = document.querySelector(".dp-head"); if (d) d.scrollIntoView({ block: "start" });
  });

  // ---------- saved builds (demo accounts) ----------
  let acct = null;          // shared account script runs after this file; connected on DOMContentLoaded
  let myBuilds = [], sharedIds = new Set();
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function showSaveMsg(t) { const m = document.getElementById("copyMsg"); if (m) m.textContent = t; }
  function currentPresetParam() { return `${currentPreset.type}:${currentPreset.type === "blueprint" ? currentPreset.data.id : currentPreset.data.playerId}`; }
  function openSaveForm() {
    const host = document.querySelector(".loaded > div"); if (!host || host.querySelector(".save-form")) return;
    const base = currentPreset.type === "blueprint" ? currentPreset.data.archetype : currentPreset.data.name;
    const n = changedAttrs().length;
    host.insertAdjacentHTML("beforeend", `<form class="save-form"><label class="sh-sr" for="saveName">Build name</label>
      <input id="saveName" maxlength="40" value="${esc(n ? base + " (custom)" : base)}"><button type="submit" class="btn btn-primary">Save</button><button type="button" class="btn btn-ghost" data-cancel>Cancel</button></form>`);
    const f = host.querySelector(".save-form"), inp = f.querySelector("input"); inp.focus(); inp.select();
    f.querySelector("[data-cancel]").addEventListener("click", () => f.remove());
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      acct.api("/api/builds", { method: "POST", body: { name: inp.value, preset: currentPresetParam(), a: encodeOverrides() } })
        .then((d) => { f.remove(); showSaveMsg(`Saved as \u201c${d.build.name}\u201d in My Builds`); loadMyBuilds(); })
        .catch((x) => showSaveMsg(x.message));
    });
  }
  function loadMyBuilds() {
    if (!acct || !acct.user) { myBuilds = []; sharedIds = new Set(); return renderMyBuilds(); }
    Promise.all([acct.api("/api/builds"), acct.api("/api/community")]).then(([b, c]) => {
      myBuilds = b.builds || []; sharedIds = new Set((c.builds || []).filter((x) => x.mine).map((x) => x.sourceId)); renderMyBuilds();
    }).catch((x) => renderMyBuilds(x.message));
  }
  function renderMyBuilds(errMsg) {
    const el = document.getElementById("myBuilds"); if (!el) return;
    if (!acct || acct.available === false) { el.innerHTML = `<div class="my-empty">Saved builds need the deployed site. This copy has no server behind it.</div>`; return; }
    if (!acct.user) { el.innerHTML = `<div class="my-empty">Sign in to save builds and see them here.<br><button type="button" class="btn btn-primary" data-my-signin>Sign in (demo)</button></div>`; return; }
    if (errMsg) { el.innerHTML = `<div class="my-empty">Couldn&rsquo;t load your builds: ${esc(errMsg)}</div>`; return; }
    if (!myBuilds.length) { el.innerHTML = `<div class="my-empty">No saved builds yet. Load an archetype or a player, then use <b>Save build</b>.</div>`; return; }
    el.innerHTML = `<p class="my-msg" id="myMsg">${myBuilds.length} saved build${myBuilds.length === 1 ? "" : "s"} (up to 25).</p><div class="my-list">` + myBuilds.map((b) => {
      const edits = b.a ? b.a.split(".").length : 0, shared = sharedIds.has(b.id);
      const kind = b.archetype ? `${esc(b.archetype)} &middot; ${b.position}` : "Real player card";
      return `<article class="my-card"><h3>${esc(b.name)}</h3><div class="my-meta">${kind} &middot; ${edits ? edits + " change" + (edits === 1 ? "" : "s") : "archetype start"}</div>
        <div class="my-meta">Saved ${new Date(b.createdAt).toLocaleDateString()}${shared ? ' &middot; <span class="my-shared">Shared</span>' : ""}</div>
        <div class="my-actions"><button type="button" class="btn btn-primary" data-open="${b.id}">Open</button>
        ${b.archetype && !shared ? `<button type="button" class="btn btn-ghost" data-share="${b.id}">Share to community</button>` : ""}
        <button type="button" class="btn btn-ghost" data-del="${b.id}">Delete</button></div></article>`;
    }).join("") + `</div>`;
  }
  document.getElementById("myBuilds").addEventListener("click", (e) => {
    if (e.target.closest("[data-my-signin]")) return acct.signIn();
    const o = e.target.closest("[data-open]"), sh = e.target.closest("[data-share]"), d = e.target.closest("[data-del]");
    const msg = (t) => { const m = document.getElementById("myMsg"); if (m) m.textContent = t; };
    if (o) {
      const b = myBuilds.find((x) => x.id === o.dataset.open); const [type, id] = b.preset.split(":");
      if (type === "blueprint") { const bp = blueprints.find((x) => x.id === id); if (bp) loadBlueprint(bp, decodeOverrides(b.a, bp)); }
      else { const pl = players.find((x) => String(x.playerId) === id); if (pl) loadPlayer(pl); }
      document.getElementById("loadedBanner").scrollIntoView({ block: "start" });
    }
    if (sh) acct.api("/api/community", { method: "POST", body: { action: "publish", buildId: sh.dataset.share } })
      .then(() => { sharedIds.add(sh.dataset.share); renderMyBuilds(); msg("Shared. It now appears under Builds \u2192 Community Builds."); })
      .catch((x) => msg(x.message));
    if (d && confirm("Delete this saved build?")) acct.api(`/api/builds?id=${encodeURIComponent(d.dataset.del)}`, { method: "DELETE" })
      .then(loadMyBuilds).catch((x) => msg(x.message));
  });
  document.addEventListener("DOMContentLoaded", () => {
    acct = window.NBA2KLab && window.NBA2KLab.account;
    if (!acct) return renderMyBuilds();
    acct.ready.then(loadMyBuilds); acct.onChange(loadMyBuilds);
    if (location.hash === "#my-builds") document.getElementById("tab-my").click();
  });
  // same-page links to #my-builds (e.g. the account menu while already on the Builder)
  window.addEventListener("hashchange", () => {
    if (location.hash !== "#my-builds") return;
    const t = document.getElementById("tab-my"); t.click(); t.scrollIntoView({ block: "center" }); t.focus();
  });

  function updateCustomState() {
    const el = document.getElementById("customState"); if (!el) return;
    const n = changedAttrs().length;
    el.textContent = n ? `Custom build: ${n} change${n === 1 ? "" : "s"} from the archetype start` : "Archetype start";
    const rb = document.getElementById("resetBuildBtn"); if (rb) rb.disabled = n === 0;
  }
  function copyLink() {
    syncURL();
    const url = location.href, msg = document.getElementById("copyMsg");
    const fallback = () => {
      // clipboard blocked (sandboxed preview, older browser): show the link ready to copy by hand
      msg.innerHTML = `<input class="copy-field" readonly value="${url.replace(/"/g, "&quot;")}" aria-label="Build link">`;
      const f = msg.querySelector("input"); f.focus(); f.select();
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => { msg.textContent = "Link copied"; setTimeout(() => { if (msg.textContent === "Link copied") msg.textContent = ""; }, 2500); }, fallback);
    } else fallback();
  }

  // ---------- attribute workspace ----------
  function renderAttributeWorkspace() {
    const hintText = currentBuild.capMode === "blueprint-range"
      ? "Sliders are bounded to this archetype's published range."
      : currentBuild.capMode === "blueprint-floor-only"
      ? "Only a starting build is published for this archetype &mdash; no ceiling to slide toward, so values are fixed."
      : "Real player card &mdash; values are fixed, not editable.";
    document.getElementById("bodyInfo").innerHTML = `
      <span><b>Height</b> ${currentBuild.height}</span>
      <span><b>Position</b> ${currentBuild.position}</span>
      ${currentBuild.weight ? `<span><b>Weight</b> ${currentBuild.weight} lbs</span>` : ""}
      <span>${hintText}</span>`;

    const isBp = currentBuild.capMode === "blueprint-range";
    const range = isBp ? currentPreset.data.attributeRange : null;

    // Hoverable label carrying the real Attributes-page description as a
    // tooltip -- reuses the exact reveal pattern already established for the
    // homepage's position-chip tooltips (hover OR keyboard focus reveals it;
    // desktop/web only, since a touch device has no hover state to trigger it).
    function attrLabelHTML(name) {
      const desc = attrDescriptions[name] || "";
      const tid = `tt-${name.replace(/[^a-z0-9]/gi, "")}`;
      return `<span class="attr-label" tabindex="0" aria-describedby="${tid}">${name}<span class="attr-tooltip" role="tooltip" id="${tid}">${desc}</span></span>`;
    }

    let html = "";
    CAT_ORDER.forEach((cat) => {
      const attrs = Object.keys(ATTRIBUTE_CATEGORY).filter((a) => ATTRIBUTE_CATEGORY[a] === cat && currentBuild.attributes[a] != null);
      if (!attrs.length) return;
      html += `<div class="attr-group" style="--sk:var(--skill-${cat})"><div class="attr-group-head"><span class="dot"></span><h3>${CAT_LABEL[cat]}</h3></div>`;
      attrs.forEach((a) => {
        const v = currentBuild.attributes[a];
        if (isBp) {
          const [min, max] = range[a];
          html += `<div class="attr-row">
            <div class="al">${attrLabelHTML(a)} <b data-vlabel="${a}">${v}</b></div>
            <input type="range" min="${min}" max="${max}" value="${v}" step="1" data-attr="${a}" aria-label="${a}, ${min} to ${max}">
            <div class="rangehint">Archetype range: ${min}&ndash;${max}</div>
          </div>`;
        } else {
          const fixedReason = currentBuild.capMode === "blueprint-floor-only" ? "fixed, only a floor is published" : "fixed, real player card";
          html += `<div class="attr-row">
            <div class="al">${attrLabelHTML(a)} <b>${v}</b></div>
            <input type="range" min="0" max="99" value="${v}" disabled aria-label="${a}: ${v} (${fixedReason})">
          </div>`;
        }
      });
      html += `</div>`;
    });
    document.getElementById("attrGroups").innerHTML = html;

    document.getElementById("attrGroups").querySelectorAll("input[type=range]:not([disabled])").forEach((inp) => {
      inp.addEventListener("input", () => {
        const attr = inp.dataset.attr;
        currentBuild.attributes[attr] = Number(inp.value);
        document.querySelector(`[data-vlabel="${CSS.escape(attr)}"]`).textContent = inp.value;
        renderDerivedPanel(); // live recompute -- this is schema.ts's getBadgeStatus doing real work
        updateCustomState();
        syncURLSoon();        // the URL always describes the build on screen, so it can be shared as-is
      });
    });
  }

  // ---------- derived panel: badges (reached tier) + animation unlock counts ----------
  function primaryCategorySlug(badge) { return ATTRIBUTE_CATEGORY[badge.conditions[0].attribute] || "physical"; }

  function badgeCardHTML(b, status) {
    const c0 = b.conditions[0];
    const attrLabel = b.operator === "SINGLE" ? c0.attribute
      : `${b.conditions[0].attribute} <span class="op-chip ${b.operator.toLowerCase()}">${b.operator}</span> ${b.conditions[1].attribute}`;
    const tiles = ["bronze", "silver", "gold", "hof"].map((t) => {
      const val = c0[t];
      if (val == null) return `<span class="tile na"><span class="v">&mdash;</span></span>`;
      const reached = status.tier === t;
      return `<span class="tile t-${t}${reached ? " reached" : ""}"><span class="v">${val}</span></span>`;
    }).join("");
    // Requirements link carries this build's height + the tier it reaches, so the lookup opens scoped to the build
    const q = new URLSearchParams({ badge: b.id, height: heightParam(currentBuild.height) });
    if (status.tier !== "none") q.set("tier", status.tier);
    return `<div class="badge-card${focusBadge === b.id ? " is-focus" : ""}" id="bcard-${b.id}">
      <div class="card-top"><span class="badge-name">${b.name}</span><span class="attrs">${attrLabel}</span><span class="reached-tag r-${status.tier}">${status.tier === "none" ? "Not Reached" : TIER_LABEL[status.tier]}</span><a class="card-link" href="reference-table.html?${q.toString()}#badges">Requirements &rarr;</a></div>
      <div class="tilerow">${tiles}<span class="htchip">${b.minHeight}&ndash;${b.maxHeight}</span></div>
    </div>`;
  }

  function renderDerivedPanel() {
    // badges, grouped by category, each showing the tier this build currently reaches
    const byCat = {};
    badges.forEach((b) => {
      const status = getBadgeStatus(currentBuild, b);
      const cat = primaryCategorySlug(b);
      (byCat[cat] = byCat[cat] || []).push({ b, status });
    });
    // tier totals feed the phone/tablet results bar
    const tierTotals = { hof: 0, gold: 0, silver: 0, bronze: 0 };
    Object.values(byCat).flat().forEach((i) => { if (tierTotals[i.status.tier] != null) tierTotals[i.status.tier]++; });
    document.getElementById("badgeGroups").innerHTML = CAT_ORDER.filter((c) => byCat[c]).map((cat) => {
      const items = byCat[cat].sort((x, y) => rank(y.status.tier) - rank(x.status.tier));
      const reachedCount = items.filter((i) => i.status.tier !== "none").length;
      const open = catOpen[cat] ?? !narrow.matches;
      return `<details class="cat-group" data-cat="${cat}" style="--sk:var(--skill-${cat})"${open ? " open" : ""}>
        <summary class="cat-head"><span class="dot"></span><h3>${CAT_LABEL[cat]}</h3><span class="count">${reachedCount}/${items.length} reached</span><span class="chev" aria-hidden="true"></span></summary>
        <div class="cardlist">${items.map((i) => badgeCardHTML(i.b, i.status)).join("")}</div>
      </details>`;
    }).join("");

    // Specialization eligibility for this build -> MyCareer
    document.getElementById("specSummary").innerHTML = `<span class="lbl">Specializations</span>` + specRules.map((r) => {
      const ok = qualifiesFor(r, currentBuild.attributes);
      const sk = r.id === "physicals" ? "physical" : r.id;
      return `<a class="spec-chip${ok ? " ok" : ""}" style="--sk:var(--skill-${sk})" href="mycareer.html?spec=${r.id}#specializations" title="${ok ? "This build qualifies" : "This build doesn't meet the unlock requirement"}"><span class="cdot" aria-hidden="true"></span>${r.name}<span class="sh-sr">${ok ? " (qualifies)" : " (not yet)"}</span></a>`;
    }).join("");

    // Takeovers this build unlocks -> Requirements (Takeovers tab). Always-available ones are counted, not listed.
    const gated = takeoverRules.filter((t) => t.operator !== "ALWAYS");
    const unlockedN = takeoverRules.filter((t) => takeoverUnlocked(t, currentBuild.attributes)).length;
    document.getElementById("tkSummary").innerHTML = `<span class="lbl">Takeovers ${unlockedN}/${takeoverRules.length}</span>` + gated.map((t) => {
      const ok = takeoverUnlocked(t, currentBuild.attributes);
      const sk = t.category.toLowerCase();
      return `<a class="spec-chip${ok ? " ok" : ""}" style="--sk:var(--skill-${sk})" href="reference-table.html?takeover=${t.id}#takeovers" title="${ok ? "Unlocked by this build" : "Not unlocked by this build"}"><span class="cdot" aria-hidden="true"></span>${t.name}<span class="sh-sr">${ok ? " (unlocked)" : " (locked)"}</span></a>`;
    }).join("");

    // animation unlock counts per subtype
    const counts = {};
    Object.keys(SUBTYPE_LABEL).forEach((s) => (counts[s] = { unlocked: 0, total: 0 }));
    animations.forEach((a) => {
      counts[a.subtype].total++;
      if (getAnimationUnlocked(currentBuild, a)) counts[a.subtype].unlocked++;
    });
    const animUnlocked = Object.values(counts).reduce((a, c) => a + c.unlocked, 0);
    updateResultsBar(tierTotals, animUnlocked);
    document.getElementById("animSummary").innerHTML = Object.entries(counts).map(([s, c]) =>
      `<div class="animcount"><div class="n">${c.unlocked} <em>/ ${c.total}</em></div><div class="l">${SUBTYPE_LABEL[s]}</div></div>`
    ).join("");
  }

  // ---------- compare data -- shared by BOTH tray shells (side panel >=768px,
  // bottom tray <768px) so the two never drift into different comparison logic ----------
  function presetById(type, id) {
    return type === "blueprint" ? blueprints.find((b) => b.id === id) : players.find((p) => String(p.playerId) === String(id));
  }
  function buildFromPreset(type, d) {
    if (type === "blueprint") {
      const attrs = {}; Object.entries(d.attributeRange).forEach(([k, [min]]) => (attrs[k] = min));
      return { height: d.height, attributes: attrs };
    }
    return { height: d.height, attributes: d.attributes };
  }
  function getPinnedList() {
    return pinnedPresets.map((p) => ({ ...p, d: presetById(p.type, p.id) })).filter((p) => p.d);
  }
  function presetSummary(p) {
    const isBp = p.type === "blueprint";
    return {
      name: isBp ? p.d.archetype : p.d.name,
      type: isBp ? "Blueprint" : "Player",
      meta: isBp ? `${p.d.position} \u00b7 ${p.d.height}` : `${p.d.position} \u00b7 ${p.d.height} \u00b7 ${p.d.team}`,
      potential: isBp ? (p.d.potentialOverall ?? "\u2014") : p.d.overall,
      potentialLabel: isBp ? "Potential" : "Overall",
      sk: isBp ? p.d.bestSkill.toLowerCase() : null,
    };
  }
  function miniCardsHTML(list) {
    return list.map((p) => {
      const s = presetSummary(p);
      return `<div class="mini-preset"${s.sk ? ` style="--sk:var(--skill-${s.sk})"` : ""}>
        <button type="button" class="mp-remove" data-unpin-type="${p.type}" data-unpin-id="${p.id}" aria-label="Remove ${s.name} from comparison">&times;</button>
        <div class="mp-name">${s.name}<span class="mp-type">${s.type}</span></div>
        <div class="mp-meta">${s.meta}</div>
        <div class="mp-potential">${s.potential} <span>${s.potentialLabel}</span></div>
      </div>`;
    }).join("");
  }
  function attrGridHTML(list) {
    const names = list.map((p) => presetSummary(p).name);
    const builds = list.map((p) => buildFromPreset(p.type, p.d));
    const attrUnion = [...new Set(builds.flatMap((b) => Object.keys(b.attributes)))].sort();
    let html = `<div class="ct-cell lbl"></div>` + names.map((n) => `<div class="ct-cell name">${n}</div>`).join("");
    attrUnion.forEach((attr) => {
      const vals = builds.map((b) => b.attributes[attr]);
      const max = Math.max(...vals.filter((v) => v != null));
      html += `<div class="ct-cell lbl">${attr}</div>` + vals.map((v) =>
        `<div class="ct-cell${v === max && vals.filter((x) => x === max).length === 1 ? " delta-up" : ""}">${v ?? "\u2014"}</div>`).join("");
    });
    return { html, cols: list.length };
  }
  function tierGridHTML(list) {
    const names = list.map((p) => presetSummary(p).name);
    const builds = list.map((p) => buildFromPreset(p.type, p.d));
    let html = `<div class="ct-cell lbl"></div>` + names.map((n) => `<div class="ct-cell name">${n}</div>`).join("");
    ["hof", "gold", "silver", "bronze"].forEach((t) => {
      html += `<div class="ct-cell lbl">${TIER_LABEL[t]}</div>` + builds.map((b) => {
        const n = badges.filter((bd) => getBadgeStatus(b, bd).tier === t).length;
        return `<div class="ct-cell">${n} badge${n === 1 ? "" : "s"}</div>`;
      }).join("");
    });
    return { html, cols: list.length };
  }

  function togglePin(type, id) {
    const idx = pinnedPresets.findIndex((p) => p.type === type && p.id === id);
    if (idx >= 0) {
      pinnedPresets.splice(idx, 1);
    } else {
      const wasEmpty = pinnedPresets.length === 0;
      pinnedPresets.push({ type, id });
      // Expand once, to confirm the first pin landed -- but don't keep forcing
      // the tray open on every later pin. It sits above the preset picker, and
      // a user comparing several presets is typically pinning multiple in a
      // row from that same picker; re-popping a large panel over it after
      // each click would fight the exact workflow this is meant to support.
      if (wasEmpty) trayExpanded = true;
    }
    renderCompareTray(); renderSidePanel(); renderLoadedBanner(); renderBlueprintGrid(); renderPlayerGrid();
  }

  // ---------- MOBILE shell (<768px): the original bottom tray, unchanged behavior ----------
  const tray = document.getElementById("compareTray");
  const handle = document.getElementById("ctHandle");
  const bodyEl = document.getElementById("ctBody");
  const titleEl = document.getElementById("ctTitle");

  function renderCompareTray() {
    titleEl.textContent = `Compare (${pinnedPresets.length})`;
    tray.classList.toggle("has-items", pinnedPresets.length > 0);
    tray.classList.toggle("expanded", trayExpanded && pinnedPresets.length > 0);
    handle.setAttribute("aria-expanded", trayExpanded && pinnedPresets.length > 0 ? "true" : "false");
    if (!pinnedPresets.length) { bodyEl.innerHTML = ""; trayExpanded = false; return; }

    const list = getPinnedList();
    const attr = attrGridHTML(list);
    const tier = tierGridHTML(list);

    bodyEl.innerHTML = `
      <button class="ct-clear" id="ctClear">Clear all</button>
      <div class="ct-cell lbl" style="background:transparent;padding-left:0;margin-bottom:.3rem">Attributes</div>
      <div class="ct-grid" style="grid-template-columns:140px repeat(${attr.cols},1fr)">${attr.html}</div>
      <div class="ct-cell lbl" style="background:transparent;padding-left:0;margin-bottom:.3rem">Badges Reached, by Tier</div>
      <div class="ct-grid" style="grid-template-columns:140px repeat(${tier.cols},1fr)">${tier.html}</div>`;
    document.getElementById("ctClear").addEventListener("click", clearAllPins);
  }

  handle.addEventListener("click", () => { trayExpanded = !trayExpanded; renderCompareTray(); });

  // ---------- DESKTOP/TABLET shell (>=768px): side panel, condensed + extended ----------
  const sidePanel = document.getElementById("sidePanel");
  const spToggle = document.getElementById("spToggle");
  const spBody = document.getElementById("spBody");
  const spTitle = document.getElementById("spTitle");
  let sideExtended = false;

  function renderSidePanel() {
    const n = pinnedPresets.length;
    spTitle.textContent = `Compare (${n})`;
    sidePanel.classList.toggle("has-items", n > 0);
    sidePanel.classList.toggle("extended", sideExtended && n > 0);
    document.body.classList.toggle("side-has-items", n > 0);
    document.body.classList.toggle("side-extended", sideExtended && n > 0);
    spToggle.setAttribute("aria-expanded", sideExtended && n > 0 ? "true" : "false");
    spToggle.textContent = sideExtended ? "Show Condensed" : "View Full Comparison \u2192";
    spToggle.disabled = n < 2;
    if (!n) { spBody.innerHTML = ""; return; }

    const list = getPinnedList();
    let html = `<div class="sp-cards">${miniCardsHTML(list)}</div>`;
    if (sideExtended && n >= 2) {
      const attr = attrGridHTML(list);
      const tier = tierGridHTML(list);
      html += `
        <div class="ct-cell lbl" style="background:transparent;padding-left:0;margin:var(--space-4) 0 .3rem">Attributes</div>
        <div class="ct-grid vertical" style="grid-template-columns:120px repeat(${attr.cols},1fr)">${attr.html}</div>
        <div class="ct-cell lbl" style="background:transparent;padding-left:0;margin:var(--space-4) 0 .3rem">Badges Reached, by Tier</div>
        <div class="ct-grid vertical" style="grid-template-columns:120px repeat(${tier.cols},1fr)">${tier.html}</div>`;
    } else if (n === 1) {
      html += `<p class="sp-hint">Pin one more preset to compare them side by side.</p>`;
    }
    spBody.innerHTML = html;
  }

  spToggle.addEventListener("click", () => { sideExtended = !sideExtended; renderSidePanel(); });
  document.getElementById("spClear").addEventListener("click", clearAllPins);
  spBody.addEventListener("click", (e) => {
    const rm = e.target.closest("[data-unpin-type]");
    if (rm) togglePin(rm.dataset.unpinType, rm.dataset.unpinId);
  });

  function clearAllPins() {
    pinnedPresets = []; trayExpanded = false; sideExtended = false;
    renderCompareTray(); renderSidePanel(); renderLoadedBanner(); renderBlueprintGrid(); renderPlayerGrid();
  }

  // ---------- init ----------
  renderBlueprintGrid();
  renderPlayerGrid();
  (function applyDeepLink() {
    const fb = params.get("focus");
    if (fb && badges.some((b) => b.id === fb)) focusBadge = fb;
    const pr = params.get("preset");
    if (pr) {
      const [type, id] = pr.split(":");
      if (type === "blueprint") { const bp = blueprints.find((b) => b.id === id); if (bp) return loadBlueprint(bp, decodeOverrides(params.get("a"), bp)); }
      if (type === "player") {
        const pl = players.find((p) => String(p.playerId) === id);
        if (pl) { document.getElementById("tab-pl").click(); return loadPlayer(pl); }
      }
    }
    if (focusBadge) {  // a badge isn't a build: ask for a preset, then land on the badge
      const b = badges.find((x) => x.id === focusBadge);
      const note = document.createElement("p");
      note.className = "dl-notice"; note.id = "dlNotice";
      note.innerHTML = `Pick a Signature Blueprint or a real player to see where it stands on <b>${b.name}</b>.`;
      document.getElementById("loadedBanner").before(note);
    }
  })();
  renderCompareTray();
  renderSidePanel();
})();
