import re, shutil, sys
sys.path.insert(0, ".")
import shell
OUT = "src"; SITE = "/home/claude/site"  # inputs live in src/, never in the delivery folder
PAGES = [  # (source, dest, page key)
    ("homepage-v5.html", "index.html", "home"),
    ("game-details.html", "game-details.html", "gamedetails"),
    ("reference-table.html", "reference-table.html", "requirements"),
    ("builder.html", "builder.html", "builder"),
    ("mycareer.html", "mycareer.html", "mycareer"),
    ("shooting.html", "shooting.html", "shooting"),
    ("builds.html", "builds.html", "builds"),
]
GUIDES = {"How to Dribble": "/nba2k-how-to-dribble", "How to Dunk": "/nba2k-how-to-dunk", "How to Pass": "/nba2k-how-to-pass",
          "How to Shoot": "/how-to-shoot", "How to Layups": "/nba2k-layup-controls", "How to Post": "/nba2k-post-controls"}
TRACKS = {"Crew Rewards": "/nba2k-crew-rewards", "Rep Rewards": "/rep-rewards", "Season Rewards": "/nba2k-season-rewards",
          "Lifetime Rewards": "/lifetime-challenges", "Starter Rewards": "/starter-challenges"}

def one(pattern, s, repl, label):
    n = len(re.findall(pattern, s, re.S))
    assert n == 1, f"{label}: expected 1 match, got {n}"
    return re.sub(pattern, lambda m: repl, s, flags=re.S)

def normalize(s):
    """Strip any previously applied shell so the build is idempotent (safe on already-wired pages)."""
    s = re.sub(r'<header class="sh-bar">.*?</header>', '<header class="topbar"></header>', s, flags=re.S)
    s = re.sub(r'\n?<div class="sh-drawer" id="sh-drawer" hidden>.*?<div class="sh-drawer-actions">.*?</div>\s*</div></div>', '', s, flags=re.S)
    s = re.sub(r'<footer class="sh-foot">.*?</footer>\n?', '', s, flags=re.S)
    s = s.replace('<link rel="stylesheet" href="site-shell.css">\n', '').replace('<script src="site-shell.js" defer></script>\n', '')
    s = re.sub(r'<style id="site-shell">.*?</style>\n?', '', s, flags=re.S)
    s = re.sub(r'<script id="site-shell-js">.*?</script>\n?', '', s, flags=re.S)
    s = re.sub(r'<script id="site-store-js">.*?</script>\n?', '', s, flags=re.S)
    s = re.sub(r'<script>\n/\* tab <-> URL hash.*?</script>\n?', '', s, flags=re.S)
    s = re.sub(r"\n/\* 7 tabs don't fit a phone: scroll the tab bar itself, never the page \*/\n\.tabs\{[^}]*\}\n\.tabs > \[role=tab\]\{[^}]*\}", '', s)
    s = s.replace('<style>.tabs{max-width:100%;overflow-x:auto;scrollbar-width:thin}.tabs > [role=tab]{flex:none;white-space:nowrap}</style>\n', '')
    s = re.sub(r'<span class="sh-sr">[^<]*</span>', '', s)
    return s


SHELL_SELECTOR_OK = ("a.ext", "body.side-", ":where(.sh-", "from", "to")

def guard_shell_block(s, label):
    """Fail the build if anything besides the shell's own CSS sits in its <style> block,
    or if the page carries more than one shell block. (Page CSS inside it gets stripped on rebuild.)"""
    blocks = re.findall(r'<style id="site-shell">(.*?)</style>', s, re.S)
    assert len(blocks) <= 1, f"{label}: {len(blocks)} shell style blocks"
    if not blocks: return
    if label.startswith("src/"):
        # inputs may carry an older shell version: check that every rule in the block is a shell rule
        css = re.sub(r"/\*.*?\*/", "", blocks[0], flags=re.S)
        sels = [x.strip() for x in re.findall(r"([^{}@]+)\{[^{}]*\}", css)]
        foreign = [x for x in sels if "sh-" not in x and not x.startswith(SHELL_SELECTOR_OK)]
        assert not foreign, f"{label}: page CSS inside the shell style block: {foreign[:3]}"
    else:
        assert blocks[0].strip() == open("site-shell.css").read().strip(), f"{label}: shell style block has foreign CSS"

def make_ext(attrs):
    attrs = re.sub(r'class="([^"]*)"', r'class="\1 ext"', attrs) if 'class="' in attrs else attrs + ' class="ext"'
    return attrs + f' target="_blank" rel="noopener" aria-describedby="{shell.EXT_DESC_ID}"'

def rewrite_anchor(m):
    attrs, inner = m.group(1), m.group(2)
    hm = re.search(r'href="(/[^"]*)"', attrs)
    if not hm or hm.group(1).startswith("//"): return m.group(0)
    href, ext = shell.resolve(hm.group(1))
    attrs = attrs.replace(hm.group(0), f'href="{href}"')
    if ext: attrs = make_ext(attrs)
    return f"<a{attrs}>{inner}</a>"

GD_HASH = """<script>
/* tab <-> URL hash, so game-details.html#settings etc. are linkable (same as MyCareer) */
(function(){var map={settings:'tab-set',controls:'tab-ctrl',guides:'tab-howto','vc-prices':'tab-vc','face-creations':'tab-face','2ktv':'tab-tv',rewards:'tab-rewards'};
var rev={};for(var k in map)rev[map[k]]=k;
[].slice.call(document.querySelectorAll('.tabs > [role=tab]')).forEach(function(t){
  function sync(){if(rev[t.id]&&t.getAttribute('aria-selected')==='true')history.replaceState(null,'','#'+rev[t.id]);}
  t.addEventListener('click',sync);t.addEventListener('focus',function(){setTimeout(sync,0);});});
function fromHash(scroll){var id=map[location.hash.slice(1)];if(!id)return;var el=document.getElementById(id);if(!el)return;el.click();if(scroll)el.closest('.tabs').scrollIntoView({block:'start'});}
fromHash(false);window.addEventListener('hashchange',function(){fromHash(true);});})();
</script>"""

report = {}
for src, dest, key in PAGES:
    raw = open(f"{OUT}/{src}", encoding="utf-8").read()
    guard_shell_block(raw, f"src/{src}")
    s = normalize(raw)
    s = one(r'<header class="topbar">.*?</header>', s, shell.header(key), f"{src} header")
    if key == "home":
        s = one(r'<div class="drawer" id="mobilenav".*?<div class="draweractions">.*?</div>\s*</div></div>', s, "", "home drawer")
        s = one(r'<footer>.*?</footer>', s, shell.footer(), "home footer")
    else:
        s = s.replace("</body>", shell.footer() + "\n</body>", 1)
    SHELL_CSS = open("site-shell.css").read(); SHELL_JS = open("site-shell.js").read()
    # inlined (not linked) so every page still works when opened on its own
    s = s.replace("</head>", f'<style id="site-shell">{SHELL_CSS}</style>\n</head>', 1)
    s = s.replace("</body>", f'<script id="site-shell-js">{SHELL_JS}</script>\n</body>', 1)

    if key == "gamedetails":
        faces, _ = shell.resolve("/nba2k-face-creations")
        s, nf = re.subn(r'<a class="face-card" href="#"', f'<a class="face-card ext" href="{faces}" target="_blank" rel="noopener" aria-describedby="{shell.EXT_DESC_ID}"', s)
        report["gd face cards -> live"] = nf
        # vp-more links: resolve by the section heading they belong to
        parts, last, removed, mapped = [], 0, 0, 0
        for m in re.finditer(r'<a class="vp-more" href="#">(.*?)</a>', s, re.S):
            heads = re.findall(r'<h[2-4][^>]*>(.*?)</h[2-4]>', s[:m.start()], re.S)
            topic = re.sub(r"<[^>]+>", "", heads[-1]).strip()
            path = GUIDES.get(topic, TRACKS.get(topic, "MISSING"))
            assert path != "MISSING", topic
            parts.append(s[last:m.start()])
            if path is None: removed += 1
            else:
                href, _ = shell.resolve(path); mapped += 1
                parts.append(f'<a class="vp-more ext" href="{href}" target="_blank" rel="noopener" aria-describedby="{shell.EXT_DESC_ID}">{m.group(1)}</a>')
            last = m.end()
        s = "".join(parts) + s[last:]
        report["gd guide/track links mapped"] = mapped; report["gd dead track links removed"] = removed
        # restore any track heading that lost its link in an earlier build (Lifetime/Starter were removed on a bad slug guess)
        restored = 0
        for title, path in TRACKS.items():
            pat = f'<div class="vp-head"><h3>{title}</h3></div>'
            if path and pat in s:
                href, _ = shell.resolve(path)
                s = s.replace(pat, f'<div class="vp-head"><h3>{title}</h3><a class="vp-more ext" href="{href}" target="_blank" rel="noopener" aria-describedby="{shell.EXT_DESC_ID}">Full track &rarr;</a></div>'); restored += 1
        report["gd track links restored"] = restored
        s = s.replace("</body>", GD_HASH + "\n</body>", 1)
        # 7 tabs don't fit a phone: scroll the tab bar itself, never the page (pre-existing bug)
        s = s.replace("</head>", "<style>.tabs{max-width:100%;overflow-x:auto;scrollbar-width:thin}.tabs > [role=tab]{flex:none;white-space:nowrap}</style>\n</head>", 1)

    # every remaining root-relative anchor through the verified map (sh- shell links are already resolved)
    s = re.sub(r"<a\b([^>]*)>(.*?)</a>", rewrite_anchor, s, flags=re.S)
    s = re.sub(r'<a\b(?![^>]*aria-describedby)([^>]*href="https://www\.nba2klab\.com[^"]*"[^>]*)>', lambda m: f'<a{m.group(1)} aria-describedby="{shell.EXT_DESC_ID}">', s)
    guard_shell_block(s, dest)
    open(f"{SITE}/{dest}", "w", encoding="utf-8").write(s)

import os
for old in ["site-shell.css", "site-shell.js"]:
    if os.path.exists(f"{SITE}/{old}"): os.remove(f"{SITE}/{old}")  # now inlined; no stale copies
for js in ["reference-table-app.js", "builder-app.js", "mycareer-app.js"]:
    shutil.copy(f"src/{js}", f"{SITE}/{js}")
print(report)
