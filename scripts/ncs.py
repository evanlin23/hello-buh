"""NCS (NoCopyrightSounds) Brazilian phonk: refresh the catalog and download the tracks.

NCS lets independent creators use and monetize its music on YouTube, provided the video
description carries the track's credit exactly as NCS gives it (https://ncs.io/usage-policy).
This script copies that credit block verbatim from each track's own ncs.io page, so we
never write a credit by hand.

  python3 scripts/ncs.py            # music/ncs.json (committed) + songs/ncs/*.mp3 (gitignored)
  python3 scripts/ncs.py --download # only download the mp3s listed in music/ncs.json
"""
import html
import json
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CAT = ROOT / "music" / "ncs.json"
DIR = ROOT / "songs" / "ncs"
UA = {"User-Agent": "hellobuh-pipeline/1.0"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()


def catalog(genre=26):   # 26 = Brazilian Phonk
    h = get(f"https://ncs.io/music-search?genre={genre}").decode()
    items = re.findall(r'data-url="([^"]+\.mp3)"\s+data-artist="[^"]*"\s+data-artistraw="([^"]*)"\s+data-track="([^"]*)".*?data-versions="([^"]*)"\s+data-genre="([^"]*)"', h, re.S)
    slugs = []
    for s in re.findall(r'href="/([A-Za-z0-9]+)"', h):
        if s not in ("about", "artists", "contact", "privacy") and s not in slugs:
            slugs.append(s)
    out = []
    for url, artist, track, _, g in items:
        track, artist = html.unescape(track), html.unescape(artist)
        for slug in slugs:   # the track's own page has the official credit block
            page = get(f"https://ncs.io/{slug}").decode()
            m = re.search(r'id="panel-copy2">(.*?)</p>', page, re.S)
            if not m:
                continue
            credit = html.unescape(re.sub(r"<br ?/?>", "\n", m.group(1)))
            credit = "\n".join(l.strip() for l in credit.strip().splitlines() if l.strip())
            if url.split("/")[-1] in page or track.lower() in credit.splitlines()[0].lower():
                file = re.sub(r"[^a-z0-9]+", "_", track.lower()).strip("_") + ".mp3"
                out.append({"file": file, "title": track, "artist": artist, "genre": g, "slug": slug, "mp3": url, "credit": credit})
                slugs.remove(slug)
                break
        else:
            print("no credit found, skipped:", track, file=sys.stderr)
    return out


def download(cat):
    DIR.mkdir(parents=True, exist_ok=True)
    for t in cat:
        f = DIR / t["file"]
        if not f.exists():
            f.write_bytes(get(t["mp3"]))
            print("downloaded", f.name)


if __name__ == "__main__":
    if "--download" not in sys.argv:
        CAT.parent.mkdir(exist_ok=True)
        cat = catalog()
        CAT.write_text(json.dumps(cat, indent=2, ensure_ascii=False) + "\n")
        print(len(cat), "tracks ->", CAT)
    download(json.loads(CAT.read_text()))
