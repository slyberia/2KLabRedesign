import shutil, os
from playwright.sync_api import sync_playwright
PAGES=["index.html","game-details.html","reference-table.html","builder.html","mycareer.html","shooting.html","builds.html"]
with sync_playwright() as p:
    b=p.chromium.launch(args=["--no-sandbox"])
    for f in PAGES:
        d=f"/tmp/alone-{f}"; shutil.rmtree(d,ignore_errors=True); os.makedirs(d)
        shutil.copy(f"/home/claude/site/{f}", d)          # the page ONLY -- no css/js siblings
        pg=b.new_page(viewport={"width":1280,"height":900}); pg.goto(f"file://{d}/{f}"); pg.wait_for_timeout(400)
        r=pg.evaluate("""()=>({hdr:document.querySelector('.sh-bar').getBoundingClientRect().height,
          footGrid:getComputedStyle(document.querySelector('.sh-cols')).display,
          srVisible:[...document.querySelectorAll('.sh-foot a')].some(a=>a.innerText.includes('opens the current')),
          ids:new Set([...document.querySelectorAll('[id]')].map(e=>e.id)).size===document.querySelectorAll('[id]').length})""")
        m=b.new_page(viewport={"width":375,"height":800}); m.goto(f"file://{d}/{f}"); m.wait_for_timeout(300)
        m.click(".sh-toggle"); m.wait_for_timeout(100)
        r["drawerWorksAlone"]=m.evaluate("()=>!document.getElementById('sh-drawer').hidden")
        print(f"{f:22} {r}")
        pg.close(); m.close()
    # footer screenshots at three widths
    for w,name in [(1440,"desk"),(800,"tab"),(375,"mob")]:
        pg=b.new_page(viewport={"width":w,"height":900},device_scale_factor=1.5); pg.goto("file:///tmp/alone-mycareer.html/mycareer.html"); pg.wait_for_timeout(500)
        pg.locator(".sh-foot").screenshot(path=f"shot_footer_{name}.png"); pg.close()
    b.close()
