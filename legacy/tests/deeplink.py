from playwright.sync_api import sync_playwright
S="file:///home/claude/site/"
with sync_playwright() as p:
    b=p.chromium.launch(args=["--no-sandbox"])
    errs=[]
    def page(w=1280):
        pg=b.new_page(viewport={"width":w,"height":900}); pg.on("pageerror",lambda e:errs.append(str(e))); return pg
    E=lambda pg,js: pg.evaluate(js)

    # 1. Builder deep link: preset + focus
    pg=page(); pg.goto(S+"builder.html?preset=blueprint:certified-bucket&focus=LimitlessRange"); pg.wait_for_timeout(700)
    print("1 builder loaded:",E(pg,"()=>document.querySelector('.lname')?.textContent"),
          "| focus card:",E(pg,"()=>document.querySelector('.badge-card.is-focus .badge-name')?.textContent"),
          "| in view:",E(pg,"()=>{const r=document.getElementById('bcard-LimitlessRange').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}"),
          "| url:",E(pg,"()=>location.search"))
    print("  specializations qualified:",E(pg,"()=>[...document.querySelectorAll('.spec-chip.ok')].map(a=>a.textContent.replace(/\\s*\\(qualifies\\)/,'').trim())"))
    # focus survives a slider move (panel re-renders)
    E(pg,"()=>{const s=document.querySelector('input[data-attr=\"Three-Point Shot\"]');s.value=93;s.dispatchEvent(new Event('input',{bubbles:true}))}")
    print("  after slider->93: focus kept:",E(pg,"()=>!!document.querySelector('#bcard-LimitlessRange.is-focus')"),
          "| tier now:",E(pg,"()=>document.querySelector('#bcard-LimitlessRange .reached-tag').textContent"),
          "| link tier:",E(pg,"()=>new URL(document.querySelector('#bcard-LimitlessRange .card-link').href).searchParams.get('tier')"))
    E(pg,"()=>{const s=document.querySelector('input[data-attr=\"Three-Point Shot\"]');s.value=89;s.dispatchEvent(new Event('input',{bubbles:true}))}")

    # 2. ROUND TRIP: click Builder's Requirements link -> Reference Table state
    pg.click("#bcard-LimitlessRange .card-link"); pg.wait_for_timeout(800)
    print("2 landed:",E(pg,"()=>location.pathname.split('/').pop()+location.search+location.hash"))
    print("  height select:",E(pg,"()=>document.getElementById('heightSelect').value"),
          "| focused:",E(pg,"()=>document.querySelector('.badge-card.is-focus .badge-name')?.textContent"),
          "| desc open:",E(pg,"()=>!document.getElementById('desc-LimitlessRange').hidden"),
          "| crossings:",E(pg,"()=>(document.getElementById('crossings-LimitlessRange').innerText.match(/\\((\\d+) total\\)/)||[])[1]"),"(expect 474)")
    pg.screenshot(path="shot_dl_reftable.png")

    # 3. ROUND TRIP: Reference Table 'Builder ->' -> Builder asks for a preset, then lands on the badge
    pg.click("#bcard-LimitlessRange .card-link"); pg.wait_for_timeout(700)
    print("3 notice:",E(pg,"()=>document.getElementById('dlNotice')?.textContent"))
    pg.click('[data-load="blueprint:backcourt-bully"]'); pg.wait_for_timeout(300)
    print("  after picking: notice gone:",E(pg,"()=>!document.getElementById('dlNotice')"),"| focus:",E(pg,"()=>document.querySelector('.badge-card.is-focus .badge-name')?.textContent"),"| url:",E(pg,"()=>location.search"))

    # 4. ROUND TRIP: spec chip -> MyCareer Specializations
    pg.click('.spec-chip[href*="spec=defense"]'); pg.wait_for_timeout(600)
    print("4 mycareer:",E(pg,"()=>location.search+location.hash"),"| spec selected:",E(pg,"()=>document.querySelector('.spec-tab[aria-selected=true]')?.textContent.trim()"),"| panel visible:",E(pg,"()=>!document.getElementById('panel-specializations').hidden"))
    # switching away drops ?spec
    pg.click('#tab-rebirth'); pg.wait_for_timeout(100)
    print("  switch to Rebirth -> url:",E(pg,"()=>location.search+location.hash"))

    # 5. MyCareer -> Builder (blueprint) and -> Requirements (attribute search)
    pg.goto(S+"builds.html#blueprints"); pg.wait_for_timeout(400); pg.click('.bp-card:has(.bp-name:text-is("Clamps")) .bp-link'); pg.wait_for_timeout(700)
    print("5 blueprint link ->",E(pg,"()=>document.querySelector('.lname')?.textContent"))
    pg.goto(S+"mycareer.html"); pg.wait_for_timeout(400)
    pg.click('.attr-row:has(.attr-name:text-is("Three-Point Shot")) a.meta-pill'); pg.wait_for_timeout(700)
    print("  'Keys 6 badges' ->",E(pg,"()=>document.getElementById('badgeCount').textContent"),"| search box:",E(pg,"()=>document.getElementById('badgeSearch').value"))

    # 6. out-of-range badge for the linked height
    pg=page(); pg.goto(S+"reference-table.html?badge=MiniMarksman&height=6-11#badges"); pg.wait_for_timeout(700)
    print("6 notice:",E(pg,"()=>document.querySelector('.dl-notice')?.innerText"))
    pg.click("#dlClearH"); pg.wait_for_timeout(300)
    print("  after 'Show all heights': card visible:",E(pg,"()=>!!document.getElementById('bcard-MiniMarksman')"),"| url:",E(pg,"()=>location.search+location.hash"))

    # 7. player preset + animations hash
    pg=page(); pg.goto(S+"builder.html?preset=player:"+str(E(page(),"()=>0") or "")); pg.close()
    pg=page(); pg.goto(S+"builder.html"); pg.wait_for_timeout(400)
    pid=E(pg,"()=>JSON.parse(document.getElementById('data-players').textContent)[0].playerId")
    pg.goto(S+f"builder.html?preset=player:{pid}"); pg.wait_for_timeout(600)
    print("7 player preset:",E(pg,"()=>document.querySelector('.lname')?.textContent"),"| players tab active:",E(pg,"()=>document.getElementById('tab-pl').getAttribute('aria-selected')"))
    pg.goto(S+"reference-table.html#animations"); pg.wait_for_timeout(500)
    print("  #animations tab:",E(pg,"()=>!document.getElementById('panel-anims').hidden"))

    # 8. junk parameters must degrade quietly
    for u in ["builder.html?preset=blueprint:nope&focus=Nope","builder.html?preset=player:999999999","reference-table.html?badge=Nope&tier=gold&height=9-9","mycareer.html?spec=nope#nope"]:
        pg=page(); pg.goto(S+u); pg.wait_for_timeout(500)
        print("8 junk",u.split('.html')[0],"-> errors so far:",len(errs),"| notice shown:",E(pg,"()=>!!document.querySelector('.dl-notice')")); pg.close()
    print("PAGE ERRORS:",errs or "none")
    b.close()
