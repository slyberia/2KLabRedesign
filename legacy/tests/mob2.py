from playwright.sync_api import sync_playwright
U="file:///home/claude/site/builder.html?preset=blueprint:certified-bucket"
COUNT="()=>{const c={};document.querySelectorAll('.badge-card .reached-tag').forEach(t=>{const k=t.textContent.trim();c[k]=(c[k]||0)+1});return c}"
BAR="()=>[...document.querySelectorAll('#resultsBar .rb-t')].map(e=>e.textContent.trim())"
def setv(pg,a,v): pg.evaluate(f"""()=>{{const s=document.querySelector('input[data-attr="{a}"]');s.value={v};s.dispatchEvent(new Event('input',{{bubbles:true}}))}}""")
with sync_playwright() as p:
    b=p.chromium.launch(args=["--no-sandbox"]); errs=[]
    pg=b.new_page(viewport={"width":375,"height":820},device_scale_factor=2,has_touch=True,is_mobile=True); pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(U); pg.wait_for_timeout(700); E=lambda js: pg.evaluate(js)
    print("1 bar visible:",E("()=>getComputedStyle(document.getElementById('resultsBar')).display"),"| bar:",E(BAR),"| list:",E(COUNT))
    print("  categories open at 375:",E("()=>[...document.querySelectorAll('details.cat-group')].filter(d=>d.open).length"),"of",E("()=>document.querySelectorAll('details.cat-group').length"))
    E("()=>document.querySelector('details[data-cat=shooting]').open=true"); pg.wait_for_timeout(50)
    setv(pg,"Three-Point Shot",93); pg.wait_for_timeout(100)
    print("2 after 3PT->93: bar:",E(BAR),"| pulsed:",E("()=>document.getElementById('resultsBar').classList.contains('pulse')"),"| shooting still open:",E("()=>document.querySelector('details[data-cat=shooting]').open"),"| others still closed:",E("()=>[...document.querySelectorAll('details.cat-group:not([data-cat=shooting])')].every(d=>!d.open)"))
    print("  list now:",E(COUNT))
    th=E("()=>{const s=document.querySelector('#attrGroups input[type=range]');return Math.round(s.getBoundingClientRect().height)}"); print("3 slider row height (touch):",th)
    pg.click("#rbJump"); pg.wait_for_timeout(200); print("4 jump -> 'What This Unlocks' top:",E("()=>Math.round(document.querySelector('.dp-head').getBoundingClientRect().top)"))
    H=E("()=>document.documentElement.scrollHeight"); print("5 page height 375:",H,f"({round(H/820,1)} screens, was 13.7)")
    E("()=>document.getElementById('pinCurrentBtn').click()"); pg.wait_for_timeout(300)
    print("6 with compare tray: bar bottom:",E("()=>getComputedStyle(document.getElementById('resultsBar')).bottom"),"| tray top vs bar bottom overlap:",E("()=>{const a=document.getElementById('resultsBar').getBoundingClientRect(),t=document.getElementById('compareTray').getBoundingClientRect();return a.bottom>t.top+1}"))
    print("  375 overflow:",E("()=>document.documentElement.scrollWidth>innerWidth+1"))
    pg.screenshot(path="mob2_375.png")
    # tablet with side panel
    t=b.new_page(viewport={"width":900,"height":900}); t.goto(U); t.wait_for_timeout(600)
    t.evaluate("()=>document.getElementById('pinCurrentBtn').click()"); t.wait_for_timeout(300)
    print("7 900px: bar right edge vs panel left:",t.evaluate("()=>[Math.round(document.getElementById('resultsBar').getBoundingClientRect().right),Math.round(document.getElementById('sidePanel').getBoundingClientRect().left)]"),"| overflow:",t.evaluate("()=>document.documentElement.scrollWidth>innerWidth+1"))
    # desktop unchanged
    d=b.new_page(viewport={"width":1280,"height":900}); d.goto(U); d.wait_for_timeout(600)
    print("8 1280: bar display",d.evaluate("()=>getComputedStyle(document.getElementById('resultsBar')).display"),"| categories open",d.evaluate("()=>[...document.querySelectorAll('details.cat-group')].filter(x=>x.open).length"),"| slider h",d.evaluate("()=>Math.round(document.querySelector('#attrGroups input[type=range]').getBoundingClientRect().height)"))
    print("PAGE ERRORS:",errs or "none"); b.close()
