import json, urllib.request, http.cookiejar, concurrent.futures as cf
B="http://localhost:4321"
def client():
    cj=http.cookiejar.CookieJar(); op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    def call(method,path,data=None,headers=None):
        h={"content-type":"application/json",**(headers or {})}
        req=urllib.request.Request(B+path,method=method,data=None if data is None else json.dumps(data).encode(),headers=h)
        try:
            with op.open(req) as r: return r.status, json.loads(r.read() or b"{}")
        except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b"{}")
    call.jar=cj; return call
ok=lambda c,msg: print(("PASS " if c else "FAIL ")+msg)
A=client(); P=client()
s,r=A("POST","/api/session",{"name":"Test User","premium":False}); ok(s==200 and r["user"]["id"]=="test-user" and not r["user"]["premium"],"sign in creates free account")
s,r=A("GET","/api/session"); ok(r["user"]["name"]=="Test User","session cookie identifies the account")
s,r=client()("POST","/api/session",{"name":"test user","premium":True}); ok(r["user"]["premium"] is False,"same name later can't upgrade itself to Premium")
s,r=A("POST","/api/session",{"name":"<script>"}); ok(s==400,"invalid name refused")
# progress
s,r=A("PUT","/api/progress",{"progress":{"rep":{"v":18,"at":1000},"seasons":{"v":3,"at":1000}}}); ok(s==200 and r["progress"]["rep"]["v"]==18,"progress saved")
s,r=A("PUT","/api/progress",{"progress":{"rep":{"v":5,"at":500}}}); ok(r["progress"]["rep"]["v"]==18,"older value does not overwrite newer (merge)")
s,r=A("PUT","/api/progress",{"progress":{"rep":{"v":20,"at":2000}}}); ok(r["progress"]["rep"]["v"]==20,"newer value wins")
for bad,label in [({"rep":{"v":99,"at":1}},"out-of-range REP"),({"hax":{"v":1,"at":1}},"unknown key"),({"starter":{"v":{"9.1":True},"at":1}},"bad starter task id")]:
    s,r=A("PUT","/api/progress",{"progress":bad}); ok(s==400,f"rejects {label}")
s,r=client()("GET","/api/progress"); ok(s==401,"progress requires sign-in")
# builds
s,r=A("POST","/api/builds",{"name":"Sniper","preset":"blueprint:certified-bucket","a":"tpt99.mid10.zz5.bh92"}); ok(s==201 and r["build"]["a"]=="tpt95.bh92","build re-validated server-side (Builder's canonical order): 99->95 clamped, 10->floor dropped, junk dropped (got %r)"%r["build"].get("a"))
bid=r["build"]["id"]
s,r=A("POST","/api/builds",{"name":"Fixed","preset":"blueprint:launchpad","a":"tpt99"}); ok(r["build"]["a"]=="","floor-only archetype ignores edits")
s,r=A("POST","/api/builds",{"name":"x","preset":"blueprint:nope"}); ok(s==400,"unknown blueprint refused")
s,r=A("GET","/api/builds"); ok(len(r["builds"])==2,"list saved builds")
# community
s,r=A("POST","/api/community",{"action":"publish","buildId":bid}); ok(s==201 and r["builds"][0]["mine"],"publish saved build")
cid=r["builds"][0]["id"]
s,r=A("POST","/api/community",{"action":"publish","buildId":bid}); ok(s==409,"can't publish the same build twice")
s,r=A("POST","/api/community",{"action":"rate","id":cid,"stars":5}); ok(s==403,"free account can't rate (Premium only)")
s,r=P("POST","/api/session",{"name":"Pro Member","premium":True}); ok(r["user"]["premium"],"premium demo account")
s,r=P("POST","/api/community",{"action":"rate","id":cid,"stars":4}); ok(s==200 and r["builds"][0]["rating"]==4,"premium rates a build")
s,r=P("POST","/api/community",{"action":"rate","id":cid,"stars":9}); ok(s==400,"stars must be 1-5")
# concurrency: 12 premium accounts rate at once; every vote must survive (conditional writes + retry)
voters=[]
for i in range(12):
    c=client(); c("POST","/api/session",{"name":f"Voter {i}","premium":True}); voters.append(c)
with cf.ThreadPoolExecutor(12) as ex: res=list(ex.map(lambda c: c("POST","/api/community",{"action":"rate","id":cid,"stars":3}), voters))
print("   statuses:",sorted(x[0] for x in res)); s,r=client()("GET","/api/community"); cnt=r["builds"][0]["ratingCount"]
ok(cnt==13,f"12 simultaneous ratings all recorded (count {cnt}, expect 13 incl. Pro Member)")
s,r=P("DELETE",f"/api/community?id={cid}"); ok(s==403,"can't delete someone else's shared build")
# security edges
s,r=A("POST","/api/builds",{"name":"x","preset":"blueprint:certified-bucket"},{"origin":"https://evil.example"}); ok(s==403,"cross-origin write refused")
s,r=A("PUT","/api/progress",{"progress":{"rep":{"v":1,"at":1}},"pad":"x"*20000}); ok(s==413,"oversized request refused")
T=client(); T.jar.set_cookie(http.cookiejar.Cookie(0,"nba2klab_demo","eyJpZCI6InRlc3QtdXNlciJ9.forged",None,False,"localhost.local",True,False,"/",True,False,None,False,None,None,{}))
s,r=T("GET","/api/progress"); ok(s==401,"forged session cookie rejected")
s,r=A("DELETE",f"/api/builds?id={bid}"); ok(s==200,"delete saved build")
s,r=A("DELETE","/api/session"); s,r=A("GET","/api/session"); ok(r["user"] is None,"sign out clears the session")
