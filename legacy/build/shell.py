LIVE = "https://www.nba2klab.com"

# Built pages (relative) -- everything else goes to a verified-200 live URL.
BUILT = {
    "/": "index.html",
    "/myplayer-builder": "builder.html",
    "/badge-requirements": "reference-table.html",
    "/animation-requirements": "reference-table.html",
    "/badge-tier-unlocks": "reference-table.html",
    "/badge-descriptions": "reference-table.html",
    "/signature-blueprints": "builds.html#blueprints",
    "/nba2k-builds": "builds.html",
    "/nba2k-best-settings": "game-details.html#settings",
    "/how-to-shoot": "shooting.html",
    "/takeover-requirements": "reference-table.html#takeovers",
    "/nba2k-cap-breakers": "game-details.html?track=cap-breakers#rewards",
    "/rep-rewards": "game-details.html?track=rep#rewards",
    "/lifetime-challenges": "game-details.html?track=lifetime#rewards",
    "/nba2k-crew-rewards": "game-details.html?track=crew#rewards",
    "/nba2k-season-rewards": "game-details.html?track=season#rewards",
    "/starter-challenges": "game-details.html?track=starter#rewards",
}
FIXED = {"/terms": "/terms-and-conditions"}  # live /terms is a 404
VERIFIED_LIVE = set("""/nba2k-builds /how-to-shoot /jumpshot-recommender /takeover-requirements /nba2k-cap-breakers
/motion-styles /login /nba2k-patch-notes /terms-and-conditions /teams /nba2k-player-ratings /contact
/badge-token-calculator /nba2k-face-creations /nba2k-how-to-dribble /nba2k-how-to-dunk /nba2k-how-to-pass
/nba2k-layup-controls /nba2k-post-controls /nba2k-crew-rewards /rep-rewards /nba2k-season-rewards /privacy-policy
/lifetime-challenges /starter-challenges
/shooting-ratings-test /shot-meter-test /takeover-test /release-speed-test /shooting-boost-test /hot-zone-test
/nba2k-best-settings /nba2k-controls /2ktv-answers /nba2k-submit-a-build /badges/arc-cadence /badges/limitless-range /badges/quick-trigger /badges/set-and-fire /badges/static-middy""".split())

NAV = [  # (label, root path, page key)
    ("Builds", None, "builds"),
    ("Builder", "/myplayer-builder", "builder"),
    ("Requirements", "/badge-requirements", "requirements"),
    ("MyCareer", None, "mycareer"),
    ("Shooting", None, "shooting"),
    ("Game Details", None, "gamedetails"),
]
PAGE_FILE = {"builds": "builds.html", "shooting": "shooting.html", "builder": "builder.html", "requirements": "reference-table.html", "mycareer": "mycareer.html", "gamedetails": "game-details.html"}
SR = ""  # replaced by one shared description, referenced via aria-describedby
EXT_DESC_ID = "sh-ext-desc"

def resolve(path):
    """root path -> (href, is_external). Raises if a path has no verified destination."""
    path = FIXED.get(path, path)
    if path in BUILT: return BUILT[path], False
    if path in VERIFIED_LIVE: return LIVE + path, True
    raise KeyError(f"unverified destination: {path}")

def link(label, href, ext, cls, current=False):
    if ext:
        return f'<a class="{cls} ext" href="{href}" target="_blank" rel="noopener" aria-describedby="{EXT_DESC_ID}">{label}</a>'
    cur = ' aria-current="page"' if current else ""
    return f'<a class="{cls}" href="{href}"{cur}>{label}</a>'

def nav_links(current, cls):
    out = []
    for label, path, key in NAV:
        if key: href, ext = PAGE_FILE[key], False
        else: href, ext = resolve(path)
        out.append(link(label, href, ext, cls, current == key))
    return "".join(out)

def header(current):
    login, _ = resolve("/login")
    return f'''<header class="sh-bar"><div class="sh-wrap">
  <a class="sh-logo" href="index.html"{' aria-current="page"' if current == "home" else ""}>NBA2K<em>LAB</em></a>
  <nav class="sh-nav" aria-label="Primary">{nav_links(current, "sh-link")}</nav>
  <div class="sh-actions"><span class="sh-acct" data-acct><button type="button" class="sh-btn sh-ghost" data-acct-open>Log In</button></span><a class="sh-btn sh-primary" href="index.html#premium">Go Premium</a></div>
  <button class="sh-toggle" type="button" aria-expanded="false" aria-controls="sh-drawer" aria-label="Open menu"><span></span><span></span><span></span></button>
</div></header>
<div class="sh-drawer" id="sh-drawer" hidden><div class="sh-wrap">
  {nav_links(current, "sh-dl")}
  <div class="sh-drawer-actions"><span class="sh-acct" data-acct><button type="button" class="sh-btn sh-ghost" data-acct-open>Log In</button></span><a class="sh-btn sh-primary" href="index.html#premium">Go Premium</a></div>
</div></div>'''

def footer():
    def fl(label, path=None, href=None):
        if href: return f'<a class="sh-fl" href="{href}">{label}</a>'
        h, ext = resolve(path)
        return link(label, h, ext, "sh-fl")
    cols = [
        ("Tools", [fl("Builds", href="builds.html"), fl("MyPlayer Builder", href="builder.html"), fl("Requirements", href="reference-table.html"),
                   fl("MyCareer Progression", href="mycareer.html"), fl("Shooting Guide", href="shooting.html"), fl("Game Details", href="game-details.html")]),
        ("Reference", [fl("Signature Blueprints", href="builds.html#blueprints"), fl("Build Specializations", href="mycareer.html#specializations"),
                       fl("REP &amp; Lifetime Rewards", href="game-details.html?track=rep#rewards"), fl("Rebirth Rewards", href="mycareer.html#rebirth"), fl("Takeover Requirements", href="reference-table.html#takeovers"),
                       fl("Cap Breakers", href="game-details.html?track=cap-breakers#rewards"), fl("Best Settings", href="game-details.html#settings"),
                       fl("Controls", href="game-details.html#controls")]),
        ("Support", [fl("Go Premium", href="index.html#premium"), fl("Jumpshot Lab", "/jumpshot-recommender"), fl("Contact", "/contact"), fl("Terms", "/terms-and-conditions"), fl("Privacy", "/privacy-policy")]),
    ]
    colhtml = "".join(f'<nav class="sh-fcol" aria-labelledby="sh-fh-{i}"><h2 class="sh-fh" id="sh-fh-{i}">{t}</h2>{"".join(ls)}</nav>' for i, (t, ls) in enumerate(cols))
    return f'''<footer class="sh-foot"><div class="sh-wrap">
  <div class="sh-cols"><div class="sh-brand"><a class="sh-logo" href="index.html">NBA2K<em>LAB</em></a><p>Data-tested jumpers, badges and builds for NBA 2K27, backed by 10 years of large-sample testing.</p></div>{colhtml}</div>
  <div class="sh-fine"><p>&copy; 2026 NBA2KLab. Not associated with NBA 2K, Take-Two Interactive, or the NBA.</p><p class="sh-extnote"><span aria-hidden="true">&#8599;</span> Opens the current NBA2KLab site in a new tab</p></div>
  <span id="{EXT_DESC_ID}" hidden>Opens the current NBA2KLab site in a new tab</span>
  <dialog class="sh-dialog" id="sh-signin" aria-labelledby="sh-signin-h">
    <form method="dialog" class="sh-signin-form" novalidate>
      <h2 id="sh-signin-h">Sign in (demo)</h2>
      <p class="sh-demo-note">This redesign can&rsquo;t reach real 2KLab accounts, so sign-in here is a <b>demo</b>. There&rsquo;s no password: anyone who uses the same name gets the same account. Don&rsquo;t use your real name or anything personal.</p>
      <label class="sh-field">Display name<input name="name" autocomplete="off" maxlength="20" required aria-describedby="sh-name-hint"></label>
      <span class="sh-hint" id="sh-name-hint">2&ndash;20 letters, numbers, spaces, - or _</span>
      <label class="sh-check"><input type="checkbox" name="premium"> Make it a demo Premium account <span class="sh-hint">(Premium can rate community builds, as on the live site. Set when the account is created.)</span></label>
      <p class="sh-err" role="alert" hidden></p>
      <div class="sh-dialog-actions"><button type="button" class="sh-btn sh-ghost" data-close>Cancel</button><button type="submit" class="sh-btn sh-primary">Sign in</button></div>
    </form>
  </dialog>
</div></footer>'''
