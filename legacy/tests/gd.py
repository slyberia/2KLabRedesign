from playwright.sync_api import sync_playwright
S="file:///home/claude/site/game-details.html"
with sync_playwright() as p:
    b=p.chromium.launch(args=["--no-sandbox"]); errs=[]
    pg=b.new_page(viewport={"width":1280,"height":900}); pg.on("pageerror",lambda e:errs.append(str(e))); E=lambda js: pg.evaluate(js)
    pg.goto(S+"#controls"); pg.wait_for_timeout(600)
    pg.click('[data-od="def"]'); pg.wait_for_timeout(100)
    print("1 defense labels:",E("()=>[...document.querySelectorAll('.controller .cm')].map(t=>t.textContent)"))
    print("  callouts inside the diagram:",E("()=>{const s=document.querySelector('.controller').getBoundingClientRect();return [...document.querySelectorAll('.controller .cm')].every(t=>{const r=t.getBoundingClientRect();return r.left>=s.left-1&&r.right<=s.right+1})}"))
    pg.locator('.ctrl-wrap').screenshot(path="shot_ctrl.png")
    pg.goto(S+"#guides"); pg.wait_for_timeout(400); pg.click('#ht-t-post'); pg.wait_for_timeout(100)
    print("2 post rows:",E("()=>document.querySelectorAll('#ht-p-post tbody tr').length"),"| dribble chips:",E("()=>document.querySelectorAll('#ht-p-dribble .move-chips li').length"))
    pg.click('#ht-t-shoot'); pg.click('#ht-p-shoot a.il-strong'); pg.wait_for_timeout(500); print("  shoot -> ",E("()=>location.pathname.split('/').pop()"))
    pg.goto(S+"#settings"); pg.wait_for_timeout(400); pg.locator('#panel-set').screenshot(path="shot_settings.png")
    print("3 settings rows:",E("()=>document.querySelectorAll('.set-row:not(.set-head)').length"),"| modes:",E("()=>document.querySelectorAll('.cam-modes li').length"))
    pg.goto(S+"#2ktv"); pg.wait_for_timeout(400); print("4 2ktv:",E("()=>document.querySelector('.qa-head .eyebrow').textContent"),"| pairs",E("()=>document.querySelectorAll('.qa').length"))
    over=[]
    for h in ["settings","controls","guides","2ktv","vc-prices","face-creations","rewards"]:
        m=b.new_page(viewport={"width":375,"height":800}); m.goto(S+"#"+h); m.wait_for_timeout(350)
        if m.evaluate("()=>document.documentElement.scrollWidth>innerWidth+1"): over.append(h)
        m.close()
    print("5 375px overflow:",over or "none"); print("PAGE ERRORS:",errs or "none"); b.close()
