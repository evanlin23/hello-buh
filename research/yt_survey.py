"""Survey what Minecraft Shorts get views, from YouTube's public search pages (no API key).

For each query it reads the Shorts on the first results page (title + view count), plus the
channel's own Shorts tab, and writes research/survey.json and a ranked summary to stdout.
View counts on search are rounded ("704 thousand views"). This is a snapshot, not analytics:
search ranking favours popular videos, so read it as "what CAN work", not base rates.

  python3 research/yt_survey.py
"""
import json
import pathlib
import re
import statistics
import time
import urllib.parse
import urllib.request

OUT = pathlib.Path(__file__).resolve().parent / "survey.json"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"}

# Stunts and gags a scripted bot on a private server could plausibly stage.
QUERIES = [
    "minecraft water bucket clutch", "minecraft mlg water", "minecraft boat clutch", "minecraft ladder clutch",
    "minecraft slime block clutch", "minecraft cobweb clutch", "minecraft hay bale clutch",
    "minecraft ender pearl clutch", "minecraft scaffolding clutch", "minecraft powder snow clutch",
    "minecraft wind charge clutch", "minecraft mace", "minecraft firework save", "minecraft elytra clutch",
    "minecraft lava bucket trick", "minecraft tnt launch", "minecraft trident riptide", "minecraft parkour pov",
    "minecraft clutch fail", "minecraft 1 in a million", "minecraft impossible clutch",
    "minecraft satisfying", "minecraft physics", "minecraft villager meme", "minecraft creeper jumpscare",
    "minecraft enderman meme", "minecraft end portal meme", "minecraft xray meme", "minecraft logic",
    "minecraft do not check the sound", "minecraft pov meme", "minecraft speedrun clutch",
]
CHANNEL = "https://www.youtube.com/@HelloBuh/shorts"

UNITS = {"thousand": 1e3, "K": 1e3, "million": 1e6, "M": 1e6, "billion": 1e9, "B": 1e9}


def views(text):
    m = re.search(r"([\d.,]+)\s*(thousand|million|billion|K|M|B)?\s+views", text)
    if not m:
        return None
    n = float(m.group(1).replace(",", ""))
    return int(n * UNITS.get(m.group(2), 1))


def initial_data(url):
    req = urllib.request.Request(url, headers=UA)
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    m = re.search(r"var ytInitialData = (\{.*?\});</script>", html)
    return json.loads(m.group(1)) if m else {}


def find(o, key, out):
    if isinstance(o, dict):
        for k, v in o.items():
            if k == key:
                out.append(v)
            find(v, key, out)
    elif isinstance(o, list):
        for v in o:
            find(v, key, out)
    return out


def shorts(data):
    out, seen = [], set()
    for s in find(data, "shortsLockupViewModel", []):
        acc = s.get("accessibilityText", "")
        vid = re.search(r"/shorts/([\w-]{11})", json.dumps(s.get("onTap", {})))
        if not vid or vid.group(1) in seen:
            continue
        seen.add(vid.group(1))
        title = acc.rsplit(",", 1)[0] if " views" in acc else acc
        out.append({"id": vid.group(1), "title": title.strip(), "views": views(acc)})
    return out


def main():
    results = {}
    for q in QUERIES:
        url = "https://www.youtube.com/results?" + urllib.parse.urlencode({"search_query": q})
        try:
            results[q] = shorts(initial_data(url))
        except Exception as e:  # keep going; note the failure
            results[q] = {"error": str(e)}
        time.sleep(1.5)
    try:
        results["@HelloBuh"] = shorts(initial_data(CHANNEL))
    except Exception as e:
        results["@HelloBuh"] = {"error": str(e)}
    OUT.write_text(json.dumps({"date": time.strftime("%Y-%m-%d"), "results": results}, indent=1, ensure_ascii=False))

    rows = []
    for q, items in results.items():
        if isinstance(items, dict) or not items:
            continue
        v = sorted([i["views"] for i in items if i["views"]], reverse=True)
        if v:
            rows.append((q, len(v), statistics.median(v), v[0], max(items, key=lambda i: i["views"] or 0)["title"][:70]))
    rows.sort(key=lambda r: -r[2])
    print(f"{'query':40} {'n':>3} {'median':>11} {'top':>12}  top title")
    for q, n, med, top, t in rows:
        print(f"{q:40} {n:>3} {int(med):>11,} {top:>12,}  {t}")


if __name__ == "__main__":
    main()
