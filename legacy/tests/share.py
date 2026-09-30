from playwright.sync_api import sync_playwright
import json
S="file:///home/claude/site/builder.html"
SNAP="""()=>({sliders:Object.fromEntries([...document.querySelectorAll('#attrGroups input[type=range]')].map(i=>[i.getAttribute('aria-label').split(',')[0].split(':')[0],i.value])),
 badges:[...document.querySelectorAll('.badge-card')].map(c=>c.querySelector('.badge-name').textContent+'='+c.querySelector('.reached-tag').textContent),
 anims:document.getElementById('animSummary').innerText, specs:document.getElementById('specSummary').innerText, tks:document.getElementById('tkSummary').innerText})"""
def setv(pg,attr,v): pg.evaluate(f"""()=>{{const s=document.querySelector('input[data-attr="{attr}"]');s.value={v};s.dispatchEvent(new Event('input',{{bubbles:true}}))}}""")
with sync_playwright() as p:
    b=p.chromium.launch(args=["--no-sandbox"]); errs=[]
    ctx=b.new_context(viewport={"width":1280,"height":900}); ctx.grant_permissions(["clipboard-read","clipboard-write"])
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(S+"?preset=blueprint:certified-bucket"); pg.wait_for_timeout(600)
    # count history rewrites to prove batching
    pg.evaluate("()=>{window.__rs=0;const o=history.replaceState.bind(history);history.replaceState=(...a)=>{window.__rs++;return o(...a)}}")
    for v in range(89,94): setv(pg,"Three-Point Shot",v)          # 5 rapid moves
    setv(pg,"Mid-Range Shot",95); setv(pg,"Ball Handle",92); setv(pg,"Speed",90)
    pg.wait_for_timeout(400)
    print("1 history rewrites for 8 rapid slider moves:",pg.evaluate("()=>window.__rs"),"| url:",pg.evaluate("()=>location.search"))
    print("  state line:",pg.evaluate("()=>document.getElementById('customState').textContent"),"| Limitless:",pg.evaluate("()=>document.querySelector('#bcard-LimitlessRange .reached-tag').textContent"))
    before=pg.evaluate(SNAP); url=pg.evaluate("()=>location.href")
    # Copy link
    pg.click("#copyLinkBtn"); pg.wait_for_timeout(200)
    print("2 copy:",pg.evaluate("()=>document.getElementById('copyMsg').textContent"),"| clipboard == url:",pg.evaluate("()=>navigator.clipboard.readText()")==url)
    # ROUND TRIP in a fresh page
    p2=ctx.new_page(); p2.goto(url); p2.wait_for_timeout(700); after=p2.evaluate(SNAP)
    diffs=[k for k in before if before[k]!=after[k]]
    print("3 round trip: sliders",len(after['sliders']),"| badges",len(after['badges']),"| differing sections:",diffs or "none")
    # Reset
    p2.click("#resetBuildBtn"); p2.wait_for_timeout(100)
    print("4 reset -> url:",p2.evaluate("()=>location.search"),"| state:",p2.evaluate("()=>document.getElementById('customState').textContent"),"| reset disabled:",p2.evaluate("()=>document.getElementById('resetBuildBtn').disabled"))
    # clamp + junk
    p3=ctx.new_page(); p3.goto(S+"?preset=blueprint:certified-bucket&a=tpt99.mid10.zz50.bh.9x.swb07"); p3.wait_for_timeout(600)
    print("5 clamp note:",p3.evaluate("()=>document.querySelector('.clamp-note')?.textContent"))
    print("  3PT slider:",p3.evaluate("()=>document.querySelector('input[data-attr=\"Three-Point Shot\"]').value"),"| mid:",p3.evaluate("()=>document.querySelector('input[data-attr=\"Mid-Range Shot\"]').value"),"| url normalized to:",p3.evaluate("()=>location.search"))
    # fixed presets ignore a=
    p4=ctx.new_page(); p4.goto(S+"?preset=blueprint:launchpad&a=tpt99"); p4.wait_for_timeout(600)
    print("6 floor-only + a=: note",p4.evaluate("()=>!!document.querySelector('.clamp-note')"),"| reset btn",p4.evaluate("()=>!!document.getElementById('resetBuildBtn')"),"| url",p4.evaluate("()=>location.search"))
    # clipboard unavailable -> fallback field
    ctx2=b.new_context(); p5=ctx2.new_page(); p5.goto(S+"?preset=blueprint:certified-bucket&a=tpt93")
    p5.wait_for_timeout(500); p5.evaluate("()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('denied'))}})}")
    p5.click("#copyLinkBtn"); p5.wait_for_timeout(200)
    print("7 blocked clipboard -> field shows url:",p5.evaluate("()=>document.querySelector('.copy-field')?.value.endsWith('a=tpt93')"),"| selected:",p5.evaluate("()=>document.activeElement.classList.contains('copy-field')"))
    print("PAGE ERRORS:",errs or "none"); b.close()
