from playwright.sync_api import sync_playwright
S="file:///home/claude/site/game-details.html"
with sync_playwright() as p:
    b=p.chromium.launch(args=["--no-sandbox"]); errs=[]
    pg=b.new_page(viewport={"width":1280,"height":900}); pg.on("pageerror",lambda e:errs.append(str(e)))
    E=lambda js: pg.evaluate(js)
    pg.goto(S+"?track=rep#rewards"); pg.wait_for_timeout(700)
    print("1 deep link ?track=rep: rewards panel",E("()=>!document.getElementById('panel-rewards').hidden"),"| REP tab",E("()=>!document.getElementById('rw-p-rep').hidden"),
          "| nodes",E("()=>document.querySelectorAll('#rw-p-rep .rm-node').length"),"(expect 39) | tab stops in roadmap",E("()=>document.querySelectorAll('#rw-p-rep .rm-node[tabindex=\"0\"]').length"))
    pg.click('#rw-p-rep .rm-node[data-i="18"]'); pg.wait_for_timeout(100)
    print("2 click Veteran IV ->",E("()=>document.getElementById('repStatus').textContent"),"| reached",E("()=>document.querySelectorAll('#rw-p-rep .rm-node.reached').length"),"(expect 19)")
    pg.keyboard.press("ArrowRight"); pg.keyboard.press("ArrowLeft"); pg.wait_for_timeout(50)
    print("  arrows R,L -> still",E("()=>document.getElementById('repStatus').textContent"),"| focus on checked:",E("()=>document.activeElement.getAttribute('aria-checked')"))
    pg.click('#rw-t-lifetime'); pg.click('#rw-p-lifetime .rm-node >> text=250'); pg.wait_for_timeout(50)
    print("3 lifetime 250 ->",E("()=>document.getElementById('lifeStatus').textContent"),"| pending nodes",E("()=>document.querySelectorAll('#rw-p-lifetime .rm-node.pending').length"),
          "| sections",E("()=>document.querySelectorAll('.rw-sections li').length"),E("()=>document.querySelector('#rw-p-lifetime .rw-sub').textContent"))
    pg.click('#rw-t-crew'); pg.click('#rw-p-crew .rm-node[data-i="29"]'); pg.wait_for_timeout(50)
    print("4 crew ->",E("()=>document.getElementById('crewStatus').textContent"))
    pg.click('#rw-t-capb'); pg.wait_for_timeout(50)
    pg.click('[data-spec]'); pg.click('[data-season="1"]'); pg.click('[data-season="1"]'); pg.click('[data-season="1"]'); pg.wait_for_timeout(50)
    print("5 cap breakers ->",E("()=>document.getElementById('cbStatus').textContent"),"|",E("()=>document.querySelector('.cb-sum p').textContent.slice(-40)"))
    print("  per source:",E("()=>[...document.querySelectorAll('.cb-src')].map(s=>s.querySelector('h4').textContent+' '+s.querySelector('.n').textContent)"))
    pg.click('.cb-src [data-go="rep"]'); pg.wait_for_timeout(50)
    print("  'Change' link -> REP tab visible:",E("()=>!document.getElementById('rw-p-rep').hidden"),"| url:",E("()=>location.search"))
    pg.click('#rw-t-starter'); pg.click('.task >> nth=0'); pg.click('.task >> nth=1'); pg.wait_for_timeout(50)
    print("6 starter ->",E("()=>document.getElementById('starterStatus').textContent"),"| pressed:",E("()=>document.querySelectorAll('.task[aria-pressed=true]').length"))
    pg.click('#rw-t-season'); pg.click('[data-st="1"]'); pg.wait_for_timeout(50)
    print("7 season MyCareer L40:",E("()=>[...document.querySelectorAll('.slist li')].pop().textContent"))
    pg.click('#rw-t-rep'); pg.wait_for_timeout(100); pg.screenshot(path="shot_rw_rep.png")
    pg.click('#rw-t-capb'); pg.wait_for_timeout(100); pg.screenshot(path="shot_rw_capb.png")
    pg.click('#rw-t-lifetime'); pg.wait_for_timeout(100); pg.screenshot(path="shot_rw_life.png")
    # mobile overflow on every rewards tab
    m=b.new_page(viewport={"width":375,"height":800}); m.goto(S+"?track=rep#rewards"); m.wait_for_timeout(500); over=[]
    for k in ["rep","lifetime","capb","crew","season","starter"]:
        m.click(f"#rw-t-{k}"); m.wait_for_timeout(80)
        if m.evaluate("()=>document.documentElement.scrollWidth>innerWidth+1"): over.append(k)
    print("8 375px overflow:",over or "none"); m.screenshot(path="shot_rw_mobile.png")
    # Requirements page after removal
    r=b.new_page(); r.goto("file:///home/claude/site/reference-table.html#takeovers"); r.wait_for_timeout(500)
    print("9 requirements tabs:",r.evaluate("()=>[...document.querySelectorAll('.pagehead [role=tab]')].map(t=>t.textContent)"))
    print("PAGE ERRORS:",errs or "none")
    b.close()
