"""Pixel art for the "mislabel" format (lib/mislabel.js): a texture from the client jar -> rows of characters + a
block palette, written to lib/mislabel_art.json (the stunt reads it; no PNG or zip code needed in node).

    python3 scripts/mislabel_art.py block/tnt_side item/lava_bucket 'entity/creeper/creeper@8,8,8,8' ...
    python3 scripts/mislabel_art.py --sheet work/mislabel_arts.png      # preview every art in the file

A spec is a texture path under assets/minecraft/textures/ (no .png), optionally `@x,y,w,h` to crop (a mob's face
from its entity texture). Each pixel goes to the nearest block colour of a fixed palette (concretes, terracottas,
a few solid blocks: flat textures that read as one colour from far away); transparent pixels stay empty (air).
Animated strips use their first frame. Existing entries are kept unless named again.
"""
import io
import json
import pathlib
import sys
import zipfile

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "lib" / "mislabel_art.json"
VER = dict(l.split("=", 1) for l in (ROOT / "versions.env").read_text().splitlines() if "=" in l and not l.startswith("#"))["MC_VERSION"]
JAR = ROOT / "work" / "client" / f"{VER}.jar"
COLORS = ["white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray", "light_gray", "cyan", "purple",
          "blue", "brown", "green", "red", "black"]
# terracottas only where concrete has no near colour (skin, wood, dull greens); the pale ones (white, light grey)
# read as pink-beige and turned a bucket's steel or a creeper's face blotchy
TERRA = ["brown", "red", "green", "lime", "yellow"]
BLOCKS = ([f"{c}_concrete" for c in COLORS] + [f"{c}_terracotta" for c in TERRA] +
          ["gold_block", "diamond_block", "emerald_block", "lapis_block", "redstone_block", "snow_block",
           "quartz_block", "coal_block", "iron_block"])
CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"


def texture(jar, path):
    with jar.open(f"assets/minecraft/textures/{path}.png") as f:
        im = Image.open(io.BytesIO(f.read())).convert("RGBA")
    return im.crop((0, 0, im.width, im.width)) if im.height > im.width * 2 else im


def block_colors(jar):
    out = {}
    for b in BLOCKS:
        try:
            im = texture(jar, f"block/{b}")
        except KeyError:
            continue
        px = [p for p in (im.get_flattened_data() if hasattr(im, "get_flattened_data") else im.getdata()) if p[3] > 128]
        out[b] = tuple(sum(p[i] for p in px) / len(px) for i in range(3))
    return out


def nearest(rgb, pal):
    # "redmean" weighted RGB distance: close to perceived difference, no colour library needed
    def d(c):
        rm = (rgb[0] + c[0]) / 2
        dr, dg, db = rgb[0] - c[0], rgb[1] - c[1], rgb[2] - c[2]
        return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db
    return min(pal, key=lambda b: d(pal[b]))


def art(jar, spec, pal):
    path, _, crop = spec.partition("@")
    im = texture(jar, path)
    if crop:
        x, y, w, h = (int(v) for v in crop.split(","))
        im = im.crop((x, y, x + w, y + h))
    blocks, rows = {}, []
    for r in range(im.height):
        row = ""
        for c in range(im.width):
            p = im.getpixel((c, r))
            if p[3] < 128:
                row += "."
                continue
            b = nearest(p[:3], pal)
            if b not in blocks:
                blocks[b] = CHARS[len(blocks)]
            row += blocks[b]
        rows.append(row)
    return {"rows": rows, "palette": {ch: b for b, ch in blocks.items()}}


def sheet(data, out):
    with zipfile.ZipFile(JAR) as jar:
        pal = block_colors(jar)
    tiles = []
    for spec, a in data.items():
        h, w = len(a["rows"]), len(a["rows"][0])
        im = Image.new("RGB", (w, h), (135, 180, 235))
        for r, row in enumerate(a["rows"]):
            for c, ch in enumerate(row):
                if ch != ".":
                    im.putpixel((c, r), tuple(int(v) for v in pal[a["palette"][ch]]))
        tiles.append(im.resize((w * 160 // max(w, h), h * 160 // max(w, h)), Image.NEAREST))
    S = Image.new("RGB", (170 * len(tiles), 170), (20, 20, 20))
    for i, t in enumerate(tiles):
        S.paste(t, (170 * i + 5, 5))
    S.save(out)
    print("wrote", out)


def main():
    data = json.loads(OUT.read_text()) if OUT.exists() else {}
    if sys.argv[1:2] == ["--sheet"]:
        return sheet(data, sys.argv[2] if len(sys.argv) > 2 else "work/mislabel_arts.png")
    with zipfile.ZipFile(JAR) as jar:
        pal = block_colors(jar)
        for spec in sys.argv[1:]:
            data[spec] = art(jar, spec, pal)
            print(spec, len(data[spec]["rows"][0]), "x", len(data[spec]["rows"]), sorted(data[spec]["palette"].values()))
    OUT.write_text(json.dumps(data, indent=1) + "\n")
    print("wrote", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
