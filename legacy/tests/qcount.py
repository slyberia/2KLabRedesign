from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(args=["--no-sandbox"]); pg=b.new_page()
    pg.goto("file:///home/claude/site/mycareer.html"); pg.wait_for_timeout(400)
    links=pg.evaluate("()=>[...document.querySelectorAll('.attr-row')].map(r=>({a:r.querySelector('.attr-name').textContent,pill:(r.querySelector('a.meta-pill')||{}).textContent||'',href:(r.querySelector('a.meta-pill')||{}).href}))")
    bad=[]
    for L in links:
        if not L["href"]: continue
        pg.goto(L["href"]); pg.wait_for_timeout(250)
        shown=pg.evaluate("()=>parseInt(document.getElementById('badgeCount').textContent)")
        want=int(L["pill"].split()[1])
        if shown!=want: bad.append((L["a"],want,shown))
    print("attributes checked:",len([l for l in links if l['href']]),"| mismatches (attr, pill, shown):",bad or "none")
    b.close()
