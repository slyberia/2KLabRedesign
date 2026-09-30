import os, sys, re
sys.path.insert(0,"/home/claude/site-wiring"); import shell
from playwright.sync_api import sync_playwright
SITE="/home/claude/site"; U=lambda f:f"file://{SITE}/{f}"
PAGES=["index.html","game-details.html","reference-table.html","builder.html","mycareer.html","shooting.html","builds.html"]
live_ok={shell.LIVE+p for p in shell.VERIFIED_LIVE}
with sync_playwright() as p:
    b=p.chromium.launch(args=["--no-sandbox"])
    # --- 1. link audit on the rendered DOM ---
    bad=[]; totals={"internal":0,"external":0,"inpage":0}
    ids_cache={}
    def ids_of(f):
        if f not in ids_cache:
            pg=b.new_page(); pg.goto(U(f)); pg.wait_for_timeout(500)
            ids_cache[f]=set(pg.evaluate("()=>[...document.querySelectorAll('[id]')].map(e=>e.id)")); pg.close()
        return ids_cache[f]
    TABHASH={"builder.html":{"my-builds"},"reference-table.html":{"badges","animations","takeovers","cap-breakers"},"mycareer.html":{"attributes","specializations","rebirth","workout"},"builds.html":{"blueprints","community"},
             "game-details.html":{"settings","controls","guides","vc-prices","face-creations","2ktv","rewards"}}
    errs={}
    for f in PAGES:
        pg=b.new_page(viewport={"width":1280,"height":900}); e=[]; pg.on("pageerror",lambda x,e=e:e.append(str(x)))
        pg.goto(U(f)); pg.wait_for_timeout(700); errs[f]=e
        links=pg.evaluate("()=>[...document.querySelectorAll('a[href]')].map(a=>({h:a.getAttribute('href'),t:a.target,sr:!!a.querySelector('.sh-sr'),txt:a.textContent.trim().slice(0,30)}))")
        for L in links:
            h=L["h"]
            if h in ("#",""): bad.append((f,h,L["txt"],"bare #")); continue
            if h.startswith("http"):
                totals["external"]+=1
                if h not in live_ok and not h.startswith("https://www.youtube"): bad.append((f,h,L["txt"],"unverified external"))
                elif h.startswith(shell.LIVE) and (L["t"]!="_blank" or not (L["sr"] or "face-card" in L["txt"] or True)): bad.append((f,h,L["txt"],"ext not new-tab"))
                continue
            if h.startswith("#"):
                totals["inpage"]+=1
                if h[1:] not in ids_of(f) and h[1:] not in TABHASH.get(f,set()): bad.append((f,h,L["txt"],"missing in-page target"))
                continue
            totals["internal"]+=1
            file,_,frag=h.partition("#"); file=file.split("?")[0]
            if not os.path.exists(f"{SITE}/{file}"): bad.append((f,h,L["txt"],"missing file")); continue
            if frag and frag not in TABHASH.get(file,set()) and frag not in ids_of(file): bad.append((f,h,L["txt"],"missing target"))
        pg.close()
    # sr-text coverage for live links
    srmiss=0
    for f in PAGES:
        pg=b.new_page(); pg.goto(U(f)); pg.wait_for_timeout(400)
        srmiss+=pg.evaluate(f"()=>[...document.querySelectorAll('a[href^=\"{shell.LIVE}\"]')].filter(a=>a.target!=='_blank'||a.getAttribute('aria-describedby')!=='sh-ext-desc').length + (document.querySelectorAll('#sh-ext-desc').length===1?0:1000)")
        pg.close()
    print("LINKS:",totals,"| problems:",len(bad)); [print("  ",x) for x in bad[:15]]
    print("live links missing new-tab/SR text:",srmiss)
    print("console errors:",{k:v for k,v in errs.items() if v} or "none")

    # --- 2. header geometry across widths ---
    for w in [1440,1280,1100,1080,375]:
        pg=b.new_page(viewport={"width":w,"height":800}); pg.goto(U("builder.html")); pg.wait_for_timeout(300)
        r=pg.evaluate("()=>({h:document.querySelector('.sh-bar').getBoundingClientRect().height,nav:getComputedStyle(document.querySelector('.sh-nav')).display,tog:getComputedStyle(document.querySelector('.sh-toggle')).display,hs:document.documentElement.scrollWidth>innerWidth+1,navOver:(()=>{const n=document.querySelector('.sh-nav'),a=document.querySelector('.sh-actions');return n.offsetParent&&a.offsetParent? n.getBoundingClientRect().right>a.getBoundingClientRect().left:false})()})")
        print(f"w={w}: {r}"); pg.close()

    # --- 3. drawer behavior (375) ---
    pg=b.new_page(viewport={"width":375,"height":800}); pg.goto(U("mycareer.html")); pg.wait_for_timeout(300)
    pg.click(".sh-toggle"); pg.wait_for_timeout(150)
    a=pg.evaluate("()=>({open:!document.getElementById('sh-drawer').hidden,focusIn:document.getElementById('sh-drawer').contains(document.activeElement),current:document.querySelector('.sh-dl[aria-current=page]')?.textContent})")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    a2=pg.evaluate("()=>({closed:document.getElementById('sh-drawer').hidden,focusBack:document.activeElement.classList.contains('sh-toggle')})")
    print("drawer:",a,a2); pg.screenshot(path="/home/claude/site-wiring/shot_before_drawer.png"); pg.close()

    # --- 4. header vs. extended compare panel ---
    pg=b.new_page(viewport={"width":1440,"height":900}); pg.goto(U("builder.html")); pg.wait_for_timeout(500)
    pg.click('[data-load="blueprint:certified-bucket"]'); pg.evaluate("()=>document.getElementById('pinCurrentBtn').click()")
    pg.click('[data-load="blueprint:launchpad"]'); pg.evaluate("()=>document.getElementById('pinCurrentBtn').click()")
    pg.click("#spToggle"); pg.wait_for_timeout(400)
    print("header w/ extended panel:",pg.evaluate("()=>{const r=document.querySelector('.sh-bar').getBoundingClientRect();return {width:Math.round(r.width),vw:innerWidth,height:r.height}}"))
    pg.screenshot(path="/home/claude/site-wiring/shot_builder_panel.png"); pg.close()

    # --- 5. hash links land on the right tab ---
    for f,tab,panel in [("game-details.html","settings","panel-set"),("game-details.html","rewards","panel-rewards"),("mycareer.html","blueprints","panel-blueprints")]:
        pg=b.new_page(); pg.goto(U(f)+"#"+tab); pg.wait_for_timeout(400)
        print(f"{f}#{tab} -> visible:",pg.evaluate(f"()=>!document.getElementById('{panel}').hidden")); pg.close()

    # --- 6. regression: each tool's core feature still works ---
    pg=b.new_page(); pg.goto(U("reference-table.html")); pg.wait_for_timeout(500)
    pg.click('.tile[data-badge="LimitlessRange"][data-tier="bronze"]'); pg.wait_for_timeout(150)
    print("regress reftable 866:", "866" in pg.evaluate("()=>document.getElementById('crossings-LimitlessRange').innerText")); pg.close()
    pg=b.new_page(); pg.goto(U("builder.html")); pg.wait_for_timeout(500)
    pg.click('[data-load="blueprint:certified-bucket"]'); pg.wait_for_timeout(200)
    print("regress builder Limitless@89:", pg.evaluate("()=>[...document.querySelectorAll('.badge-card')].find(c=>c.querySelector('.badge-name').textContent==='Limitless Range').querySelector('.reached-tag').textContent")); pg.close()
    # mobile overflow on every page
    over=[]
    for f in PAGES:
        pg=b.new_page(viewport={"width":375,"height":800}); pg.goto(U(f)); pg.wait_for_timeout(400)
        if pg.evaluate("()=>document.documentElement.scrollWidth>innerWidth+1"): over.append(f)
        pg.close()
    print("375px overflow:",over or "none")
    pg=b.new_page(viewport={"width":1440,"height":900}); pg.goto(U("index.html")); pg.wait_for_timeout(600)
    pg.screenshot(path="/home/claude/site-wiring/shot_home_header.png",clip={"x":0,"y":0,"width":1440,"height":220}); pg.close()
    b.close()
