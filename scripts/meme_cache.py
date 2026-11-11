"""A meme picture for the edit (edit.still, format cooked: owner r:r12cb71): fetched at render from the URL logged in
lib/memes.json into work/cache/memes/<key>.<ext>, never committed. A sha256 in the registry pins the file (a changed
download fails); without one the fetch prints it, so it can be logged once the picture has been looked at.

  python3 scripts/meme_cache.py war_soldier        -> the cached file's path (fetches it if missing)

HB_MEME_<KEY> (e.g. HB_MEME_WAR_SOLDIER=/path/pic.jpg) uses a local file instead (tests, a preview on a box that can't
reach the host)."""
import hashlib
import json
import os
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
REG = ROOT / "lib" / "memes.json"
CACHE = ROOT / "work" / "cache" / "memes"


def entry(key):
    reg = json.loads(REG.read_text())
    if key not in reg or key.startswith("_"):
        raise SystemExit(f"meme_cache: no '{key}' in lib/memes.json (have: {', '.join(k for k in reg if not k.startswith('_'))})")
    return reg[key]


def sha(p):
    return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()


def path(key):
    env = os.environ.get("HB_MEME_" + key.upper())
    if env:
        return pathlib.Path(env)
    e = entry(key)
    urls = e.get("urls") or ([e["url"]] if e.get("url") else [])
    if not urls:
        raise SystemExit(f"meme_cache: lib/memes.json '{key}' has no url yet: log the picture's URL there (or HB_MEME_{key.upper()}=FILE)")
    for c in sorted(CACHE.glob(f"{key}.*")) if CACHE.exists() else []:
        if not c.name.endswith(".part") and (not e.get("sha256") or sha(c) == e["sha256"]):
            return c
    CACHE.mkdir(parents=True, exist_ok=True)
    errs = []
    for url in urls:
        ext = pathlib.PurePosixPath(url.split("?")[0]).suffix.lower()
        ext = ext if ext in (".jpg", ".jpeg", ".png", ".webp") else ".img"
        out = CACHE / f"{key}{ext}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "meme-cache/1.0 (python-urllib)"})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
        except Exception as ex:   # the next logged URL
            errs.append(f"{url}: {ex}")
            continue
        got = hashlib.sha256(data).hexdigest()
        if e.get("sha256") and got != e["sha256"]:
            errs.append(f"{url}: changed (sha256 {got}, lib/memes.json pins {e['sha256']})")
            continue
        tmp = out.with_suffix(out.suffix + ".part")
        tmp.write_bytes(data)
        tmp.replace(out)
        print(f"meme_cache: {key} <- {url} ({len(data)} bytes, sha256 {got})", file=sys.stderr)
        return out
    raise SystemExit(f"meme_cache: could not fetch '{key}': " + "; ".join(errs))


if __name__ == "__main__":
    for k in sys.argv[1:]:
        print(path(k))
