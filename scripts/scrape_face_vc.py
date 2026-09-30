#!/usr/bin/env python3
"""Rebuild data/face-creations.json and data/vc-prices.json from the live, public nba2klab.com pages.

Face Creations: the page ships its full player list in the Next.js page data (__NEXT_DATA__).
VC Prices: the tiers and bundles are in the rendered page markup.
Values are kept exactly as published (including any "⚠️" marks, which 2KLab shows but doesn't
explain). Run from the repo root: python3 scripts/scrape_face_vc.py
"""
import datetime, html, json, re, urllib.request

BASE = "https://www.nba2klab.com"
TODAY = datetime.date.today().isoformat()


def fetch(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "nba2klab-redesign data refresh"})
    return urllib.request.urlopen(req, timeout=60).read().decode("utf-8")


def next_data(page):
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', page, re.S)
    return json.loads(m.group(1))["props"]["pageProps"]


# Section order and labels exactly as the live page shows them. "preset" is the value shown next to
# the section title (the creator's numbered preset); "fields" are the sliders below it, in order.
SECTIONS = [
    ("head", "Head Selection", "headNumber", []),
    ("hair", "Hair", "hairName", [("hairColor", "Hair Color"), ("hairPattern", "Hair Pattern"), ("hairFade", "Hair Fade"), ("hairCorner", "Hair Corner")]),
    ("skull", "Skull", "skullName", [("headWidth", "Head Width"), ("skullWidth", "Skull Width"), ("skullHeight", "Skull Height")]),
    ("brow", "Brow", "browName", [("browProminence", "Brow Prominence"), ("templeWidth", "Temple Width"), ("eyebrowDistance", "Eyebrow Distance"), ("browPosition", "Brow Position")]),
    ("eyebrows", "Eyebrows", "eyebrowName", [("eyebrowColor", "Eyebrow Color"), ("eyebrowCutout", "Eyebrow Cutout")]),
    ("ears", "Ears", "earName", [("earLowerAngle", "Ear Lower Angle"), ("earUpperAngle", "Ear Upper Angle"), ("earRotation", "Ear Rotation"), ("earScale", "Ear Scale")]),
    ("eyes", "Eyes", "eyeName", [("eyeColor", "Eye Color"), ("eyeSize", "Eye Size"), ("eyeDistance", "Eye Distance"), ("eyeAngle", "Eye Angle"), ("eyeCircles", "Eye Circles"),
                                 ("upperEyelidPosition", "Upper Eyelid Position"), ("upperEyelidCreasePosition", "Upper Eyelid Crease Position"), ("lowerEyelidPosition", "Lower Eyelid Position")]),
    ("nose", "Nose", "noseName", [("upperNoseWidth", "Upper Nose Width"), ("lowerNoseWidth", "Lower Nose Width"), ("nosePosition", "Nose Position"),
                                  ("upperNoseProminence", "Upper Nose Prominence"), ("middleNoseProminence", "Middle Nose Prominence"), ("lowerNoseProminence", "Lower Nose Prominence")]),
    ("cheeks", "Cheeks", "cheekName", [("upperCheekWidth", "Upper Cheek Width"), ("middleCheekWidth", "Middle Cheek Width"), ("wrinkles", "Wrinkles"), ("moles", "Moles")]),
    ("mouth", "Mouth", "mouthName", [("lipColor", "Lip Color"), ("mouthWidth", "Mouth Width"), ("upperLipThickness", "Upper Lip Thickness"), ("upperLipProminence", "Upper Lip Prominence"),
                                     ("upperLipDentPosition", "Upper Lip Dent Position"), ("lowerLipThickness", "Lower Lip Thickness"), ("lowerLipProminence", "Lower Lip Prominence")]),
    ("facialHair", "Facial Hair", "facialHairName", [("facialHairColor", "Facial Hair Color"), ("stubble", "Stubble")]),
    ("chin", "Chin", "chinName", [("chinDimple", "Chin Dimple"), ("chinProminence", "Chin Prominence"), ("frontChinWidth", "Front Chin Width"), ("rearChinWidth", "Rear Chin Width"), ("chinPosition", "Chin Position")]),
    ("skin", "Skin", "skinName", [("blemishes", "Blemishes"), ("freckles", "Freckles"), ("pockMarks", "Pock Marks")]),
]


def face_creations():
    page = fetch("/nba2k-face-creations")
    players = next_data(page)["players"]
    credit = dict((name.lower(), url) for url, name in re.findall(r'href="([^"]+)"[^>]*>(?:<[^>]+>)*\s*(TikTok|YouTube)', page[page.find("2KFace"):][:3000]))
    out = []
    for p in players:
        sections = {}
        for key, _, preset, fields in SECTIONS:
            src = p.get(key) or {}
            # a field the source leaves out is left out here too (never filled in)
            sections[key] = {"preset": src.get(preset), **{f: src[f] for f, _ in fields if f in src}}
        out.append({
            "id": p["id"], "name": p["playerName"], "team": p["team"], "years": p["yearsPlayed"],
            "category": p["category"], "image": p.get("finishedImageUrl"), "sections": sections,
        })
    return {
        "source": BASE + "/nba2k-face-creations", "captured": TODAY,
        "credit": {"name": "2KFace", "tiktok": credit.get("tiktok"), "youtube": credit.get("youtube")},
        "note": "Values as published, as strings. Some carry a ⚠️ mark, which 2KLab shows without explanation. Images are 2KLab's, hotlinked from its CDN.",
        "sections": [{"key": k, "title": t, "fields": [{"key": f, "label": l} for f, l in fs]} for k, t, _, fs in SECTIONS],
        "players": out,
    }


def vc_prices():
    page = fetch("/nba2k-vc-prices")
    strip = lambda x: html.unescape(re.sub(r"<!--.*?-->|<[^>]+>", "", x)).strip()
    num = lambda x: int(re.sub(r"[^\d]", "", x))
    tiers = [
        {"vc": num(a), "price": float(strip(p)[1:]), "vcPerDollar": num(strip(r).split("VC")[0])}
        for a, p, r in re.findall(r'class="vc-amount">(.*?)</h2><h3 class="vc-price">(.*?)</h3><p class="vc-rate">(.*?)</p>', page, re.S)
    ]
    bundles = [
        {"name": f"Season 1 {strip(mode)}", "price": float(strip(price)[1:]), "contents": [strip(li) for li in re.findall(r"<li>(.*?)</li>", items, re.S)]}
        for mode, price, items in re.findall(
            r'class="vc-season-mode">(.*?)</h3><span class="vc-season-price">(.*?)</span></div><ul class="vc-season-contents">(.*?)</ul>', page, re.S)
    ]
    text = strip(page)
    to85 = re.search(r"maxing a player to 85, it will cost around ([\d,]+) VC", text)
    to99 = re.search(r"maxing a player to 99 anticipate spending closer to ([\d,]+) VC", text)
    assert tiers and bundles and to85 and to99, "VC page layout changed; update the parser"
    return {
        "source": BASE + "/nba2k-vc-prices", "captured": TODAY,
        "note": "Standard tiers with 2KLab's stated VC per $1, and the Season 1 bundles. None of the VC is a bonus: bigger tiers only cost less per VC.",
        "tiers": tiers,
        "season1Bundles": bundles,
        "maxBuild": {"to85": num(to85.group(1)), "to99": num(to99.group(1)),
                     "note": "Approximate attribute costs as 2KLab states them: around 200,000 VC to reach 85, closer to 360,000 to reach 99."},
    }


if __name__ == "__main__":
    for name, build in (("face-creations", face_creations), ("vc-prices", vc_prices)):
        data = build()
        with open(f"data/{name}.json", "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
            f.write("\n")
        print(name, "ok")
