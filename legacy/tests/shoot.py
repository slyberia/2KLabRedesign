from playwright.sync_api import sync_playwright
S="file:///home/claude/site/"
with sync_playwright() as p:
    b=p.chromium.launch(args=["--no-sandbox"]); errs=[]
    pg=b.new_page(viewport={"width":1280,"height":900}); pg.on("pageerror",lambda e:errs.append(str(e))); E=lambda js: pg.evaluate(js)
    pg.goto(S+"shooting.html"); pg.wait_for_timeout(600)
    print("1 nav current:",E("()=>document.querySelector('.sh-link[aria-current=page]')?.textContent"),"| sections:",E("()=>document.querySelectorAll('section.sec').length"),"| badges:",E("()=>document.querySelectorAll('.bdg').length"))
    print("  Limitless tiles:",E("()=>[...[...document.querySelectorAll('.bdg')].find(d=>d.querySelector('.nm').textContent==='Limitless Range').querySelectorAll('.tile')].map(t=>t.textContent)"),"(expect 83 89 93 99)")
    print("  test links:",E("()=>document.querySelectorAll('.bdg .xl').length"),"results +",E("()=>document.querySelectorAll('.bdg .pend').length"),"pending (expect 5+4)")
    pg.click('.toc a[href="#release-speed"]'); pg.wait_for_timeout(300)
    print("2 TOC -> #release-speed top:",E("()=>Math.round(document.getElementById('release-speed').getBoundingClientRect().top)"),"(below 60px header)")
    pg.click('.bdg:has(.nm:text-is("Static Middy")) a.il'); pg.wait_for_timeout(700)
    print("3 badge -> Requirements:",E("()=>location.search+location.hash"),"| focused:",E("()=>document.querySelector('.badge-card.is-focus .badge-name')?.textContent"))
    pg.goto(S+"index.html"); pg.wait_for_timeout(400)
    print("4 homepage /how-to-shoot links now ->",E("()=>[...new Set([...document.querySelectorAll('a')].map(a=>a.getAttribute('href')).filter(h=>/shoot/.test(h)))]"))
    # coins
    pg.goto(S+"game-details.html#vc-prices"); pg.wait_for_timeout(600)
    print("5 coins: svgs",E("()=>document.querySelectorAll('svg.coinart').length"),"| gradient defs",E("()=>document.querySelectorAll('#coinFace').length"),"/",E("()=>document.querySelectorAll('#coinEdge').length"),
          "| a coin face resolves to gradient:",E("()=>{const e=document.querySelector('svg.coinart ellipse[fill=\"url(#coinFace)\"]');return !!e && getComputedStyle(e).fill.includes('url')}"))
    pg.locator("#panel-vc").screenshot(path="shot_coins.png")
    # mobile
    over=[]
    for f in ["shooting.html","game-details.html#vc-prices"]:
        m=b.new_page(viewport={"width":375,"height":800}); m.goto(S+f); m.wait_for_timeout(500)
        if m.evaluate("()=>document.documentElement.scrollWidth>innerWidth+1"): over.append(f)
    print("6 375px overflow:",over or "none")
    pg=b.new_page(viewport={"width":1280,"height":900}); pg.goto(S+"shooting.html#release-speed"); pg.wait_for_timeout(600); pg.screenshot(path="shot_shooting.png")
    print("PAGE ERRORS:",errs or "none"); b.close()
