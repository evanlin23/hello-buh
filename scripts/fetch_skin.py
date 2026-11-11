"""A real player's skin for the renderer: work/skins/<username>.png (+ <username>.json: uuid, model, url, fetched).

The owner's own skin (56e, owner 2026-11-11) lives in the PRIVATE assets repo (evanlin23/hello-buh-assets,
work/skins/56e.png; scripts/assets_restore.sh puts it here). That copy is the primary source: a skin already in
work/skins/ is kept as is, and one in ../hello-buh-assets (HB_ASSETS) not yet restored is copied in. This fetcher is the fallback when it is missing (no private-repo access, e.g. on
Actions): Mojang's public API, no account involved:

    api.mojang.com/users/profiles/minecraft/<name>            -> uuid
    sessionserver.mojang.com/session/minecraft/profile/<uuid> -> textures property (base64 JSON): SKIN url, model
    textures.minecraft.net/texture/<hash>                     -> the PNG (64x64, or legacy 64x32: converted)

Only names in lib/real_skins.json are fetched (the owner's accounts: never a stranger's skin for a story
character who happens to share a username). The PNG is never committed to hello-buh (public); its URL is logged
in the JSON. A failed fetch prints a warning and exits 0: the renderer then draws the jar's default skin.

usage: python3 scripts/fetch_skin.py [--refresh] <username> [...]
"""
import base64
import datetime
import io
import json
import os
import pathlib
import shutil
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKINS = ROOT / "work" / "skins"
PRIVATE = pathlib.Path(os.environ.get("HB_ASSETS") or ROOT.parent / "hello-buh-assets")   # as scripts/assets_restore.sh
ALLOWED = json.loads((ROOT / "lib" / "real_skins.json").read_text())["names"]
UA = {"User-Agent": "hello-buh-renderer"}


def get(url, timeout=30):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()


def parse_profile(profile):
    """Session profile JSON -> (skin url (https), model 'wide' | 'slim'); None without a skin."""
    prop = next((p for p in profile.get("properties", []) if p.get("name") == "textures"), None)
    if not prop:
        return None
    tex = json.loads(base64.b64decode(prop["value"]))
    skin = (tex.get("textures") or {}).get("SKIN")
    if not skin or not skin.get("url"):
        return None
    url = skin["url"].replace("http://", "https://", 1)
    return url, ("slim" if (skin.get("metadata") or {}).get("model") == "slim" else "wide")


def normalize(png_bytes):
    """Validate a skin PNG and return a 64x64 RGBA image the way the game reads it (PlayerSkin/SkinTextureDownloader
    processLegacySkin): a legacy 64x32 skin gets its left arm and leg mirrored from the right ones and the hat's
    all-opaque fill cleared (the Notch transparency hack); the base layer is made opaque everywhere (setNoAlpha),
    so only the overlay (hat, jacket, sleeves, pants) is cut out by alpha."""
    from PIL import Image
    im = Image.open(io.BytesIO(png_bytes))
    if im.format != "PNG":
        raise ValueError(f"not a PNG ({im.format})")
    if im.size not in ((64, 64), (64, 32)):
        raise ValueError(f"not a skin: {im.size[0]}x{im.size[1]} (want 64x64 or legacy 64x32)")
    im = im.convert("RGBA")
    legacy = im.size == (64, 32)
    if legacy:
        new = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        new.paste(im, (0, 0))
        T = Image.Transpose.FLIP_LEFT_RIGHT
        # (x, y, w, h source) -> (dx, dy): SkinTextureDownloader.processLegacySkin's copyRect calls, mirrored
        for sx, sy, dx, dy, w, h in [(4, 16, 16, 32, 4, 4), (8, 16, 16, 32, 4, 4), (0, 20, 24, 32, 4, 12), (4, 20, 16, 32, 4, 12),
                                     (8, 20, 8, 32, 4, 12), (12, 20, 16, 32, 4, 12), (44, 16, -8, 32, 4, 4), (48, 16, -8, 32, 4, 4),
                                     (40, 20, 0, 32, 4, 12), (44, 20, -8, 32, 4, 12), (48, 20, -16, 32, 4, 12), (52, 20, -8, 32, 4, 12)]:
            new.paste(im.crop((sx, sy, sx + w, sy + h)).transpose(T), (sx + dx, sy + dy))
        im = new
    px = im.load()
    if legacy and all(px[x, y][3] >= 128 for y in range(0, 32) for x in range(32, 64)):   # doNotchTransparencyHack
        for y in range(0, 32):
            for x in range(32, 64):
                px[x, y] = px[x, y][:3] + (0,)
    for x0, y0, x1, y1 in [(0, 0, 32, 16), (0, 16, 64, 32), (16, 48, 48, 64)]:
        for y in range(y0, y1):
            for x in range(x0, x1):
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 255)
    return im, legacy


def fetch(name, refresh=False):
    png, meta = SKINS / f"{name}.png", SKINS / f"{name}.json"
    if name not in ALLOWED:
        print(f"fetch_skin: {name} is not in lib/real_skins.json (the owner's accounts); not fetched", file=sys.stderr)
        return False
    if png.exists() and meta.exists() and not refresh:
        return True   # the private-assets copy (or an earlier fetch): kept as is
    priv = PRIVATE / "work" / "skins"
    if not refresh and (priv / f"{name}.png").exists():   # the private assets checked out but not restored yet
        SKINS.mkdir(parents=True, exist_ok=True)
        for f in (f"{name}.png", f"{name}.json"):
            if (priv / f).exists():
                shutil.copyfile(priv / f, SKINS / f)
        print(f"fetch_skin: {name} from the private assets ({priv})")
        return True
    try:
        uuid = json.loads(get(f"https://api.mojang.com/users/profiles/minecraft/{name}"))["id"]
        parsed = parse_profile(json.loads(get(f"https://sessionserver.mojang.com/session/minecraft/profile/{uuid}")))
        if not parsed:
            raise ValueError("the profile has no skin")
        url, model = parsed
        im, legacy = normalize(get(url))
    except Exception as e:   # noqa: BLE001 (any failure: fall back, never fail the render)
        print(f"WARNING fetch_skin: {name}: {e}; the render uses the default skin", file=sys.stderr)
        return png.exists()
    SKINS.mkdir(parents=True, exist_ok=True)
    tmp = png.with_suffix(".tmp.png")
    im.save(tmp)
    tmp.replace(png)
    meta.write_text(json.dumps({"username": name, "uuid": uuid, "model": model, "url": url, "legacy": legacy,
                                "fetched": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
                                "note": "fetched from Mojang (fallback: the primary copy is in evanlin23/hello-buh-assets)"}) + "\n")
    print(f"fetch_skin: {name} ({model}) <- {url}")
    return True


def main(argv):
    refresh = "--refresh" in argv
    for n in [a for a in argv if not a.startswith("--")]:
        fetch(n, refresh)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
