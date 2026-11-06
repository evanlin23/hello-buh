"""Build the renderer's block assets from the real client jar (the version we play on).

Extracts assets/minecraft/{blockstates,models/block,textures/block} and the few environment
textures (clouds, sun) from work/client/<ver>.jar, packs every block texture into one atlas
(first frame of animated ones), and writes work/assets/<ver>/:
  atlas.png, atlas.json   {size, textures: {name: {u, v, su, sv}}}
  blockstates.json        {block: <blockstate json>}
  models.json             {model: <model json>}
  env/                    clouds.png, sun.png, steve skin, item textures used by the HUD/hand
Then renderer/prepare.js resolves models into the format the mesher wants.

usage: python3 renderer/build_assets.py 1.21.11
"""
import io
import json
import math
import pathlib
import sys
import zipfile

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
TILE = 16


def main(ver):
    jar = zipfile.ZipFile(ROOT / "work" / "client" / f"{ver}.jar")
    out = ROOT / "work" / "assets" / ver
    (out / "env").mkdir(parents=True, exist_ok=True)
    names = jar.namelist()

    def load_json(prefix):
        d = {}
        for n in names:
            if n.startswith(prefix) and n.endswith(".json"):
                d[n[len(prefix):-5]] = json.loads(jar.read(n))
        return d

    blockstates = load_json("assets/minecraft/blockstates/")
    models = load_json("assets/minecraft/models/block/")
    tex_names = sorted(n for n in names if n.startswith("assets/minecraft/textures/block/") and n.endswith(".png")
                       and n.count("/") == 4)
    textures = {}
    for n in tex_names:
        im = Image.open(io.BytesIO(jar.read(n))).convert("RGBA")
        w = im.width
        if w != TILE:  # a few non-16 textures: scale to the tile
            im = im.resize((TILE, TILE * im.height // w), Image.NEAREST)
        textures[n.rsplit("/", 1)[1][:-4]] = im.crop((0, 0, TILE, TILE))  # first animation frame

    # missing texture: magenta/black checker, like the game
    miss = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 255))
    for y in range(TILE):
        for x in range(TILE):
            if (x < 8) ^ (y < 8):
                miss.putpixel((x, y), (248, 0, 248, 255))
    textures = {"missing_texture": miss, **textures}

    grid = 2 ** math.ceil(math.log2(math.ceil(math.sqrt(len(textures)))))
    size = grid * TILE
    atlas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    index = {}
    for i, (name, im) in enumerate(textures.items()):
        x, y = (i % grid) * TILE, (i // grid) * TILE
        atlas.paste(im, (x, y))
        index[name] = {"u": x / size, "v": y / size, "su": TILE / size, "sv": TILE / size}
    atlas.save(out / "atlas.png")
    (out / "atlas.json").write_text(json.dumps({"size": TILE / size, "textures": index}))
    (out / "blockstates.json").write_text(json.dumps(blockstates))
    (out / "models.json").write_text(json.dumps(models))

    for src, dst in [("environment/clouds.png", "clouds.png"), ("environment/celestial/sun.png", "sun.png"),
                     ("environment/sun.png", "sun.png"), ("entity/player/wide/steve.png", "steve.png"),
                     ("environment/weather/rain.png", "rain.png"), ("environment/rain.png", "rain.png")]:
        p = f"assets/minecraft/textures/{src}"
        if p in names and not (out / "env" / dst).exists():
            (out / "env" / dst).write_bytes(jar.read(p))
    for n in names:  # item textures for the held item
        if n.startswith("assets/minecraft/textures/item/") and n.endswith(".png") and n.count("/") == 4:
            (out / "env" / "item").mkdir(exist_ok=True)
            (out / "env" / "item" / n.rsplit("/", 1)[1]).write_bytes(jar.read(n))
    print(f"{len(textures)} textures -> {size}x{size} atlas, {len(blockstates)} blockstates, {len(models)} models;",
          "env:", sorted(p.name for p in (out / "env").iterdir()))


if __name__ == "__main__":
    main(sys.argv[1])
