"""Download the vanilla server jar, and from the client side only what the edit needs: the client
jar (HUD sprites) and the asset index (sound files are fetched lazily by audio.py). All from
Mojang's public endpoints, sha1-checked, cached under work/. No Minecraft account involved.

usage: python3 scripts/fetch.py
"""
import hashlib
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
ENV = dict(l.split("=", 1) for l in (ROOT / "versions.env").read_text().splitlines() if "=" in l and not l.startswith("#"))
WORK = ROOT / "work"


def fetch(url, dest, sha1=None):
    dest = pathlib.Path(dest)
    if dest.exists() and (sha1 is None or hashlib.sha1(dest.read_bytes()).hexdigest() == sha1):
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    data = urllib.request.urlopen(url, timeout=120).read()
    if sha1 and hashlib.sha1(data).hexdigest() != sha1:
        raise RuntimeError(f"sha1 mismatch: {url}")
    dest.write_bytes(data)
    return dest


def main():
    mc = ENV["MC_VERSION"]
    fetch(ENV["SERVER_URL"], WORK / "server" / "server.jar", ENV["SERVER_SHA1"])
    manifest = json.load(urllib.request.urlopen("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json", timeout=60))
    entry = next(v for v in manifest["versions"] if v["id"] == mc)
    vj = json.loads(fetch(entry["url"], WORK / "client" / f"{mc}.json", entry["sha1"]).read_text())
    fetch(vj["downloads"]["client"]["url"], WORK / "client" / f"{mc}.jar", vj["downloads"]["client"]["sha1"])
    ai = vj["assetIndex"]
    fetch(ai["url"], WORK / "client" / "assets.json", ai["sha1"])
    print("fetched server, client jar and asset index for", mc)


if __name__ == "__main__":
    main()
