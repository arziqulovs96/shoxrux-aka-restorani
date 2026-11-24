"""Menyu rasmlari uchun nomzodlarni qidiradi (Openverse + Wikimedia Commons, kalitsiz API).
GitHub Actions'da ishlaydi; natija: nomzodlar/<id>/<n>.jpg + nomzodlar.json + kontakt varaqlari."""
import io, json, os, sys, time, urllib.parse, urllib.request
from PIL import Image, ImageDraw, ImageOps

Q = json.load(open("scripts/rasm_sorovlar.json", encoding="utf-8"))
OUT = "nomzodlar"
UA = {"User-Agent": "DostlikKassa/1.2 (menu image search; github.com/arziqulovs96/shoxrux-aka-restorani)"}
os.makedirs(OUT, exist_ok=True)

def get(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def openverse(q, n=5):
    u = "https://api.openverse.org/v1/images/?" + urllib.parse.urlencode({"q": q, "page_size": n, "license_type": "commercial", "mature": "false"})
    try:
        js = json.loads(get(u))
    except Exception as e:
        print("openverse xato", q, e); return []
    res = []
    for x in js.get("results", []):
        res.append({"src": "openverse:" + (x.get("source") or ""), "img": x.get("thumbnail") or x.get("url"), "page": x.get("foreign_landing_url"),
                    "license": f'{x.get("license")} {x.get("license_version") or ""}'.strip(), "creator": x.get("creator") or ""})
    return res

def commons(q, n=5, tries=3):
    u = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
        "action": "query", "format": "json", "generator": "search", "gsrsearch": f"{q} filetype:bitmap", "gsrnamespace": 6,
        "gsrlimit": n, "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": 640})
    js = None
    for t in range(tries):
        try:
            js = json.loads(get(u)); break
        except Exception as e:
            print("commons xato", q, e); time.sleep(5 * (t + 1))
    if js is None:
        return []
    pages = sorted(js.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0))
    res = []
    for p in pages:
        ii = (p.get("imageinfo") or [{}])[0]
        md = ii.get("extmetadata", {})
        res.append({"src": "wikimedia", "img": ii.get("thumburl") or ii.get("url"), "page": ii.get("descriptionurl"),
                    "license": md.get("LicenseShortName", {}).get("value", ""), "creator": md.get("Artist", {}).get("value", "")})
    return res

allc = {}
for cat, items in Q.items():
    sheet_rows = []
    for item in items:
        iid, name, queries = item["id"], item["name"], item["q"]
        cands = []
        for q in queries:
            cands += openverse(q, 4) + commons(q, 3)
            time.sleep(1.5)
        seen, uniq = set(), []
        for c in cands:
            if c["img"] and c["img"] not in seen:
                seen.add(c["img"]); uniq.append(c)
        uniq = uniq[:8]
        os.makedirs(f"{OUT}/{iid}", exist_ok=True)
        thumbs = []
        for i, c in enumerate(uniq):
            try:
                im = Image.open(io.BytesIO(get(c["img"]))).convert("RGB")
                im.thumbnail((720, 720))
                im.save(f"{OUT}/{iid}/{i}.jpg", quality=82)
                c["file"] = f"{iid}/{i}.jpg"; c["size"] = im.size
                thumbs.append((i, ImageOps.fit(im, (200, 150))))
            except Exception as e:
                c["error"] = str(e)
        allc[iid] = {"name": name, "cat": cat, "cands": uniq}
        sheet_rows.append((iid, name, thumbs))
        print(cat, iid, len(thumbs), flush=True)
    # kontakt varag'i (har kategoriya uchun)
    W, H = 220 + 8 * 205, 170 * max(1, len(sheet_rows))
    sh = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(sh)
    for r, (iid, name, thumbs) in enumerate(sheet_rows):
        y = r * 170
        d.text((6, y + 60), f"{iid}\n{name}", fill="black")
        for i, t in thumbs:
            x = 220 + i * 205
            sh.paste(t, (x, y + 10)); d.rectangle((x, y + 10, x + 22, y + 26), fill="black"); d.text((x + 6, y + 12), str(i), fill="white")
    sh.save(f"{OUT}/varaq-{cat}.jpg", quality=80)
json.dump(allc, open(f"{OUT}/nomzodlar.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
