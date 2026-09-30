/* NBA2KLab site shell -- mobile drawer. Same behavior the homepage v5 drawer
   was verified with: focus moves into the drawer, Tab is trapped, Escape
   closes and returns focus to the toggle, resizing to desktop closes it. */
(function () {
  "use strict";
  var toggle = document.querySelector(".sh-toggle");
  var drawer = document.getElementById("sh-drawer");
  if (!toggle || !drawer) return;
  function focusables() { return drawer.querySelectorAll("a,button"); }
  function open() {
    drawer.hidden = false; toggle.setAttribute("aria-expanded", "true"); toggle.setAttribute("aria-label", "Close menu");
    var f = focusables(); if (f.length) f[0].focus();
    document.addEventListener("keydown", onKey);
  }
  function close(returnFocus) {
    drawer.hidden = true; toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "Open menu");
    document.removeEventListener("keydown", onKey);
    if (returnFocus !== false) toggle.focus();
  }
  function onKey(e) {
    if (e.key === "Escape") return close();
    if (e.key !== "Tab" || drawer.hidden) return;
    var f = focusables(); if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  toggle.addEventListener("click", function () { drawer.hidden ? open() : close(); });
  drawer.addEventListener("click", function (e) { if (e.target.closest("a")) close(false); });
  window.addEventListener("resize", function () { if (window.innerWidth > 1080 && !drawer.hidden) close(false); });
})();
/* ---- demo accounts (shared by every page) ----
   window.NBA2KLab.account: { user, ready, onChange(fn), api(path, opts), signIn() }.
   Talks to /api/session. Where there is no API (a page opened from disk), sign-in says so instead of failing silently. */
(function () {
  "use strict";
  var subs = [], state = { user: null, available: null };
  function emit() { subs.forEach(function (f) { try { f(state.user); } catch (e) { console.error(e); } }); render(); }
  function api(path, opts) {
    opts = opts || {};
    return fetch(path, { method: opts.method || "GET", credentials: "same-origin", headers: opts.body ? { "content-type": "application/json" } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || ("HTTP " + r.status)); e.status = r.status; throw e; } return d; });
    });
  }
  var dlg = document.getElementById("sh-signin"), pending = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function render() {
    document.querySelectorAll("[data-acct]").forEach(function (slot, i) {
      if (!state.user) { slot.innerHTML = '<button type="button" class="sh-btn sh-ghost" data-acct-open>Log In</button>'; return; }
      var u = state.user, id = "sh-menu-" + i;
      slot.innerHTML = '<button type="button" class="sh-btn sh-ghost sh-acct-btn" aria-haspopup="true" aria-expanded="false" aria-controls="' + id + '" data-acct-menu>' + esc(u.name) +
        (u.premium ? ' <span class="sh-prem">Premium</span>' : "") + '</button><div class="sh-menu" id="' + id + '" hidden><span class="sh-menu-note">Demo account</span>' +
        '<a href="builder.html#my-builds">My builds</a><a href="game-details.html?track=rep#rewards">My progress</a><button type="button" data-acct-out>Sign out</button></div>';
    });
  }
  function openDialog(then) {
    pending = then || null;
    if (state.available === false) { alert("Sign-in works on the deployed site. This copy of the page has no server behind it."); return; }
    var f = dlg.querySelector("form"); f.reset(); dlg.querySelector(".sh-err").hidden = true;
    dlg.showModal(); f.elements.name.focus();
  }
  if (dlg) {
    dlg.querySelector("[data-close]").addEventListener("click", function () { dlg.close(); });
    dlg.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault(); var f = e.target, err = dlg.querySelector(".sh-err");
      api("/api/session", { method: "POST", body: { name: f.elements.name.value, premium: f.elements.premium.checked } }).then(function (d) {
        state.user = d.user; dlg.close(); emit(); if (pending) { var p = pending; pending = null; p(d.user); }
      }).catch(function (x) { err.textContent = x.message; err.hidden = false; });
    });
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-acct-open]")) { openDialog(); return; }
    var m = e.target.closest("[data-acct-menu]");
    if (m) { var menu = document.getElementById(m.getAttribute("aria-controls")), open = menu.hidden; menu.hidden = !open; m.setAttribute("aria-expanded", String(open)); return; }
    if (e.target.closest("[data-acct-out]")) { api("/api/session", { method: "DELETE" }).then(function () { state.user = null; emit(); }); return; }
    document.querySelectorAll(".sh-menu:not([hidden])").forEach(function (x) { if (!x.parentElement.contains(e.target)) { x.hidden = true; var b = x.parentElement.querySelector("[data-acct-menu]"); if (b) b.setAttribute("aria-expanded", "false"); } });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") document.querySelectorAll(".sh-menu:not([hidden])").forEach(function (x) { x.hidden = true; }); });
  var ready = (location.protocol === "file:" ? Promise.reject(new Error("no server")) : api("/api/session"))
    .then(function (d) { state.available = true; state.user = d.user; }, function () { state.available = false; })
    .then(function () { emit(); return state.user; });
  window.NBA2KLab = window.NBA2KLab || {};
  window.NBA2KLab.account = {
    get user() { return state.user; }, get available() { return state.available; }, ready: ready, api: api,
    onChange: function (f) { subs.push(f); }, signIn: function (then) { openDialog(then); },
  };
})();
