"""Which sounds/songs do the top Minecraft Shorts use? Reads the "sound" attribution on each
Short's page (what YouTube shows at the bottom of a Short) for the top Shorts per query in
research/survey.json. Writes research/sounds.json and prints the most used sounds.

  python3 research/sounds_survey.py [per_query=4]
"""
import collections
import json
import pathlib
import re
import sys
import time
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"}


def sound_of(video_id):
    html = urllib.request.urlopen(urllib.request.Request(f"https://www.youtube.com/shorts/{video_id}", headers=UA), timeout=30).read().decode("utf-8", "replace")
    html = re.sub(r"\\x([0-9a-f]{2})", lambda m: chr(int(m.group(1), 16)), html)
    m = re.search(r'"soundAttributionTitle":\{"content":"([^"]*)"', html)
    return m.group(1) if m else None


def main(per_query=4):
    survey = json.loads((HERE / "survey.json").read_text())["results"]
    out = []
    for q, items in survey.items():
        if q == "@HelloBuh" or not isinstance(items, list):
            continue
        for it in sorted(items, key=lambda i: -(i["views"] or 0))[:per_query]:
            try:
                s = sound_of(it["id"])
            except Exception as e:
                s = f"error: {e}"
            out.append({"query": q, "id": it["id"], "title": it["title"], "views": it["views"], "sound": s})
            time.sleep(1.0)
    (HERE / "sounds.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
    c = collections.Counter(o["sound"] for o in out if o["sound"])
    views = collections.defaultdict(int)
    for o in out:
        views[o["sound"]] += o["views"] or 0
    print(f"{len(out)} Shorts checked")
    for s, n in c.most_common(30):
        print(f"{n:>3}  {views[s]:>14,}  {s}")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 4)
