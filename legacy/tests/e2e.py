import json, urllib.request
from playwright.sync_api import sync_playwright
B="http://localhost:4321/"
def server_account(slug):
    try: return json.load(open(f"/home/claude/deploy-test/store/accounts__{slug}.json"))
    except FileNotFoundError: return None
with sync_playwright() as p:
    br=p.chromium.launch(args=["--no-sandbox"]); errs=[]
    ctx=br.new_context(viewport={"width":1280,"height":900}); pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
    E=lambda js: pg.evaluate(js)
    # 1. signed out: progress kept in the browser
    pg.goto(B+"game-details.html?track=rep#rewards"); pg.wait_for_timeout(800)
    print("1 signed-out status:",E("()=>document.getElementById('rwSave').textContent"))
    pg.click('#rw-p-rep .rm-node[data-i="18"]'); pg.wait_for_timeout(200); pg.reload(); pg.wait_for_timeout(800)
    print("  after reload, REP:",E("()=>document.getElementById('repStatus').textContent"))
    # 2. sign in from the header -> merge into the new account
    pg.click('.sh-actions [data-acct-open]'); pg.fill('#sh-signin input[name=name]','Tester One'); pg.click('#sh-signin button[type=submit]'); pg.wait_for_timeout(900)
    print("2 header:",E("()=>document.querySelector('.sh-actions .sh-acct-btn')?.textContent"),"| status:",E("()=>document.getElementById('rwSave').textContent"))
    print("  server has rep:",(server_account("tester-one") or {}).get("progress",{}).get("rep"))
    # 3. change while signed in -> saved
    pg.click('#rw-t-lifetime'); pg.click('#rw-p-lifetime .rm-node >> text=250'); pg.wait_for_timeout(900)
    print("3 server lifetime:",(server_account("tester-one") or {}).get("progress",{}).get("lifetime",{}).get("v"),"(expect 15 = index of 250)")
    # 4. wipe the browser copy; the account restores it
    E("()=>localStorage.clear()"); pg.reload(); pg.wait_for_timeout(1000)
    print("4 after clearing browser storage:",E("()=>document.getElementById('repStatus').textContent"),"|",E("()=>document.getElementById('lifeStatus').textContent"))
    # 5. Builder: save, list, share
    pg.goto(B+"builder.html?preset=blueprint:certified-bucket&a=tpt93"); pg.wait_for_timeout(900)
    pg.click('#saveBuildBtn'); pg.fill('#saveName','Deep Threat'); pg.click('.save-form button[type=submit]'); pg.wait_for_timeout(700)
    print("5 save msg:",E("()=>document.getElementById('copyMsg').textContent"))
    pg.click('#tab-my'); pg.wait_for_timeout(400)
    print("  My Builds:",E("()=>[...document.querySelectorAll('.my-card h3')].map(h=>h.textContent)"),"| meta:",E("()=>document.querySelector('.my-card .my-meta')?.textContent"))
    pg.click('.my-card [data-share]'); pg.wait_for_timeout(600); print("  share:",E("()=>document.getElementById('myMsg')?.textContent"))
    pg.goto(B+"builder.html"); pg.wait_for_timeout(700); pg.click('#tab-my'); pg.wait_for_timeout(500); pg.click('.my-card [data-open]'); pg.wait_for_timeout(500)
    print("  open saved -> 3PT slider:",E("()=>document.querySelector('input[data-attr=\"Three-Point Shot\"]').value"),"| Limitless:",E("()=>document.querySelector('#bcard-LimitlessRange .reached-tag').textContent"))
    # 6. community: owner view
    pg.goto(B+"builds.html#community"); pg.wait_for_timeout(900)
    print("6 owner sees:",E("()=>document.querySelector('.c-card h3')?.textContent"),"|",E("()=>document.querySelector('.c-card .c-note')?.textContent"))
    # 7. a different Premium account rates it; a free account cannot
    c2=br.new_context(viewport={"width":1280,"height":900}); q=c2.new_page(); q.on("pageerror",lambda e:errs.append(str(e)))
    q.goto(B+"builds.html#community"); q.wait_for_timeout(800)
    print("7 signed-out prompt:",q.evaluate("()=>document.querySelector('.c-card .c-note')?.textContent"))
    q.click('.sh-actions [data-acct-open]'); q.fill('#sh-signin input[name=name]','Pro Rater'); q.check('#sh-signin input[name=premium]'); q.click('#sh-signin button[type=submit]'); q.wait_for_timeout(900)
    q.click('[data-rate][data-stars="4"]'); q.wait_for_timeout(700)
    print("  premium rated:",q.evaluate("()=>document.querySelector('.c-rating').textContent"),"|",q.evaluate("()=>document.getElementById('cMsg').textContent"))
    c3=br.new_context(); r=c3.new_page(); r.goto(B+"builds.html#community"); r.wait_for_timeout(700)
    r.click('.sh-actions [data-acct-open]'); r.fill('#sh-signin input[name=name]','Free Fan'); r.click('#sh-signin button[type=submit]'); r.wait_for_timeout(900)
    print("  free account:",r.evaluate("()=>document.querySelector('.c-card .c-note')?.textContent"))
    # 8. menu + sign out
    q.click('.sh-actions [data-acct-menu]'); q.wait_for_timeout(100)
    print("8 menu:",q.evaluate("()=>[...document.querySelectorAll('.sh-actions .sh-menu a, .sh-actions .sh-menu button')].map(x=>x.textContent)"))
    q.click('.sh-actions [data-acct-out]'); q.wait_for_timeout(500); print("  after sign out:",q.evaluate("()=>document.querySelector('.sh-actions [data-acct-open]')?.textContent"))
    # 9. dialog at 375 + bad name
    m=br.new_context(viewport={"width":375,"height":740},has_touch=True,is_mobile=True).new_page(); m.goto(B+"index.html"); m.wait_for_timeout(700)
    m.click('.sh-toggle'); m.click('#sh-drawer [data-acct-open]'); m.wait_for_timeout(200)
    m.fill('#sh-signin input[name=name]','<x>'); m.click('#sh-signin button[type=submit]'); m.wait_for_timeout(500)
    print("9 375 dialog error:",m.evaluate("()=>document.querySelector('#sh-signin .sh-err').textContent"),"| fits:",m.evaluate("()=>{const r=document.getElementById('sh-signin').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}"))
    m.screenshot(path="e2e_dialog_375.png")
    print("PAGE ERRORS:",errs or "none"); br.close()
