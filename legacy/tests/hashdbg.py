from playwright.sync_api import sync_playwright
S="file:///home/claude/site/"
with sync_playwright() as p:
    b=p.chromium.launch(args=["--no-sandbox"])
    for page,start,link,panel in [("reference-table.html","#badges",'.sh-foot a[href="reference-table.html#takeovers"]',"panel-takeovers"),
                                  ("mycareer.html","#attributes",'.sh-foot a[href="mycareer.html#rebirth"]',"panel-rebirth"),
                                  ("game-details.html","#controls",'.sh-foot a[href="game-details.html#settings"]',"panel-set")]:
        pg=b.new_page(viewport={"width":1280,"height":900}); pg.goto(S+page+start); pg.wait_for_timeout(500)
        pg.click(link); pg.wait_for_timeout(300)
        print(f"{page}: footer link -> hash {pg.evaluate('()=>location.hash')} | target panel visible: {pg.evaluate(f'()=>!document.getElementById(\"{panel}\").hidden')}")
        pg.close()
    b.close()
