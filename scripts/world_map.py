"""Draw the HelloBuh shared world as a top-down map with every canonical place labelled (like ./hb map, for the
whole world): terrain colours from the surveyed top blocks, hill shading, water by depth, the places of
docs/world/map.json (footprint, name, the stories set there) and the vanilla structures the seed generated.

    python3 scripts/world_survey.py            # once after a survey run (reads the region files in the world cache)
    python3 scripts/world_map.py [--out out/world/world_map.png] [--area x0,z0,x1,z1] [--scale 1] [--title ...]

North is up, east is right; coordinates every 100 blocks.
"""
import argparse
import json
import os
import pathlib

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent

COL = {
    "grass_block": (98, 150, 62), "short_grass": (98, 150, 62), "tall_grass": (98, 150, 62), "dirt": (134, 96, 67),
    "coarse_dirt": (119, 85, 59), "podzol": (91, 63, 24), "rooted_dirt": (144, 103, 76), "mud": (60, 57, 60),
    "sand": (219, 207, 163), "red_sand": (190, 102, 33), "sandstone": (216, 203, 155), "gravel": (131, 127, 126),
    "stone": (125, 125, 125), "andesite": (136, 136, 137), "diorite": (188, 188, 188), "granite": (149, 103, 85),
    "tuff": (108, 109, 102), "calcite": (223, 224, 220), "deepslate": (80, 80, 82), "snow": (243, 248, 250),
    "snow_block": (243, 248, 250), "powder_snow": (248, 253, 253), "ice": (145, 183, 253), "packed_ice": (141, 180, 250),
    "blue_ice": (116, 167, 253), "water": (52, 92, 196), "lava": (207, 92, 20), "clay": (160, 166, 179),
    "moss_block": (89, 109, 45), "mycelium": (111, 99, 105), "terracotta": (152, 94, 67), "dirt_path": (148, 122, 65),
    "farmland": (110, 75, 46), "obsidian": (20, 18, 30), "bedrock": (60, 60, 60),
}
LEAF = (54, 92, 38)


def color(name):
    if name in COL:
        return COL[name]
    if name.endswith("_leaves"):
        return (40, 72, 28) if "spruce" in name or "dark_oak" in name else LEAF
    if name.endswith("_log") or name.endswith("_wood"):
        return (92, 70, 40)
    if "terracotta" in name:
        return (160, 90, 60)
    if name.endswith("_planks") or "door" in name or "fence" in name or "stairs" in name or "slab" in name:
        return (162, 130, 78)   # buildings
    if "cobble" in name or "brick" in name:
        return (118, 118, 118)
    if "flower" in name or name in ("poppy", "dandelion", "cornflower", "oxeye_daisy", "azure_bluet", "allium") or "tulip" in name:
        return (110, 160, 60)
    if name in ("air", "unknown"):
        return (24, 24, 28)
    return (120, 140, 90)


def font(n):
    for f in (HERE / "assets" / "fonts" / "Poppins-Black.ttf", HERE / "assets" / "fonts" / "SchibstedGrotesk-Black.ttf",
              pathlib.Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")):
        try:
            return ImageFont.truetype(str(f), n)
        except OSError:
            pass
    return ImageFont.load_default()


def render(grid, area, scale):
    x0, z0 = [int(v) for v in grid["origin"]]
    ax0, az0, ax1, az1 = area
    sl = (slice(az0 - z0, az1 - z0), slice(ax0 - x0, ax1 - x0))
    top, ground, block = grid["top"][sl], grid["ground"][sl], grid["block"][sl]
    names = [str(n) for n in grid["names"]]
    lut = np.array([color(n) for n in names], np.float32)
    rgb = lut[block]
    known = top > -9999
    wid = names.index("water") if "water" in names else -1
    water = block == wid
    depth = np.clip((top - ground).astype(np.float32), 0, 30)
    # water: lighter in the shallows, darker in the deep
    shallow = np.array([90, 150, 225], np.float32); deep = np.array([28, 54, 130], np.float32)
    t = (depth / 18.0)[..., None]
    rgb = np.where(water[..., None], shallow * (1 - np.clip(t, 0, 1)) + deep * np.clip(t, 0, 1), rgb)
    # hill shade on the ground height (light from the north-west), plus a little height tint
    h = np.where(known, ground, 62).astype(np.float32)
    gy, gx = np.gradient(h)
    shade = np.clip(1.0 + (-gx - gy) * 0.12, 0.55, 1.35)
    lift = np.clip((h - 64) / 120.0, -0.15, 0.35)
    land = ~water
    rgb = np.where(land[..., None], rgb * shade[..., None] * (1 + lift[..., None]), rgb)
    # contour every 16 blocks on land
    band = (h // 16).astype(np.int32)
    edge = np.zeros_like(band, bool)
    edge[1:, :] |= band[1:, :] != band[:-1, :]
    edge[:, 1:] |= band[:, 1:] != band[:, :-1]
    rgb = np.where((edge & land)[..., None], rgb * 0.82, rgb)
    rgb = np.where(known[..., None], rgb, np.array([24, 24, 28], np.float32))
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    if scale != 1:
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.NEAREST if scale > 1 else Image.LANCZOS)
    return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=os.path.expanduser(os.environ.get("HB_WORLD_CACHE", "~/.cache/hellobuh/world")) + "/survey")
    ap.add_argument("--map", default=str(HERE / "docs" / "world" / "map.json"))
    ap.add_argument("--out", default=str(HERE / "out" / "world" / "world_map.png"))
    ap.add_argument("--area", help="x0,z0,x1,z1 (default: the map's `view.area`, else the survey's)")
    ap.add_argument("--scale", type=float, help="pixels per block (default: the map's `view.scale`, else 1)")
    ap.add_argument("--title", default=None)
    ap.add_argument("--view", default="view", help="which view block of map.json to use (view, hub...)")
    ap.add_argument("--structures", type=int, default=1)
    a = ap.parse_args()
    grid = np.load(pathlib.Path(a.cache) / "grid.npz")
    M = json.loads(pathlib.Path(a.map).read_text())
    V = M.get(a.view, {}) if a.view else {}
    area = [int(v) for v in (a.area.split(",") if a.area else V.get("area") or M["survey"]["area"])]
    S = a.scale or V.get("scale", 1)
    terrain = render(grid, area, S)
    L, T, B = 70, 96, 40
    W, H = terrain.width + L + 30, terrain.height + T + B
    im = Image.new("RGB", (W, H), (18, 18, 22))
    im.paste(terrain, (L, T))
    d = ImageDraw.Draw(im)
    ax0, az0, ax1, az1 = area
    P = lambda x, z: (L + (x - ax0) * S, T + (z - az0) * S)
    f_title, f_lab, f_small, f_tiny = font(40), font(max(15, int(12 + 4 * S))), font(max(12, int(10 + 2 * S))), font(12)
    d.text((L, 22), a.title or V.get("title") or f"The HelloBuh world (seed \"{M['seed']}\")", fill=(255, 255, 255), font=f_title)
    d.text((L, 68), "north is up - coordinates in blocks - labelled places from docs/world/map.json", fill=(170, 170, 170), font=f_tiny)
    step = 100 if (ax1 - ax0) <= 1600 else 200
    for x in range((ax0 // step + 1) * step, ax1, step):
        px, _ = P(x, az0)
        d.line([px, T - 6, px, T], fill=(200, 200, 200)); d.text((px, T - 8), str(x), fill=(200, 200, 200), font=f_tiny, anchor="mb")
        d.line([px, T, px, T + terrain.height], fill=(255, 255, 255, 40), width=1) if False else None
    for z in range((az0 // step + 1) * step, az1, step):
        _, pz = P(ax0, z)
        d.line([L - 6, pz, L, pz], fill=(200, 200, 200)); d.text((L - 9, pz), str(z), fill=(200, 200, 200), font=f_tiny, anchor="rm")
    # faint grid
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    for x in range((ax0 // step + 1) * step, ax1, step):
        px, _ = P(x, az0); od.line([px, T, px, T + terrain.height], fill=(255, 255, 255, 28))
    for z in range((az0 // step + 1) * step, az1, step):
        _, pz = P(ax0, z); od.line([L, pz, L + terrain.width, pz], fill=(255, 255, 255, 28))
    im.paste(Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB"))
    d = ImageDraw.Draw(im)
    inside = lambda x, z: ax0 <= x < ax1 and az0 <= z < az1
    # vanilla structures (small markers)
    if a.structures:
        sv = json.loads((HERE / "docs" / "world" / "survey.json").read_text()).get("structures", []) if (HERE / "docs" / "world" / "survey.json").exists() else []
        SYM = {"village_plains": (255, 230, 120), "village_taiga": (255, 210, 140), "village_savanna": (255, 190, 110), "village_snowy": (230, 240, 255), "village_desert": (255, 220, 160), "pillager_outpost": (230, 80, 80)}
        for s in sv:
            if not inside(s["x"], s["z"]) or s["id"] not in SYM and not s["id"].startswith(("ruined_portal", "shipwreck", "igloo", "swamp_hut", "desert_pyramid", "jungle_pyramid", "trail_ruins", "mansion", "ocean_ruin", "monument")):
                continue
            px, pz = P(s["x"], s["z"])
            c = SYM.get(s["id"], (200, 200, 200))
            r = 4 if s["id"].startswith("village") or s["id"] == "pillager_outpost" else 3
            d.rectangle([px - r, pz - r, px + r, pz + r], outline=(0, 0, 0), fill=c)
    # places
    labels = []
    skip = V.get("detail_in")   # an area drawn in its own map: dots only here, the labels live there
    for key, p in M.get("places", {}).items():
        x, z = p["at"][0], p["at"][-1]
        if not inside(x, z):
            continue
        if skip and p.get("kind") != "region" and skip[0] <= x <= skip[2] and skip[1] <= z <= skip[3]:
            px, pz = P(x, z)
            d.ellipse([px - 4, pz - 4, px + 4, pz + 4], fill=(255, 70, 60), outline=(0, 0, 0), width=1)
            continue
        fp = p.get("footprint")
        if fp:
            a0, b0 = P(fp[0], fp[1]); a1, b1 = P(fp[2], fp[3])
            d.rectangle([a0, b0, a1, b1], outline=(255, 240, 120) if p.get("kind") != "region" else (255, 255, 255), width=2)
        px, pz = P(x, z)
        d.ellipse([px - 5, pz - 5, px + 5, pz + 5], fill=(255, 70, 60), outline=(0, 0, 0), width=2)
        name = p.get("name", key)
        stories = ", ".join(p.get("stories", [])[:4])
        labels.append((px, pz, name, stories, p.get("label_dir", "e")))
    for px, pz, name, stories, dr in labels:
        ox, anchor = (10, "lm") if dr == "e" else (-10, "rm") if dr == "w" else (0, "mb") if dr == "n" else (0, "mt")
        oy = -10 if dr == "n" else 10 if dr == "s" else 0
        for txt, f, dy, col in ((name, f_lab, 0, (255, 255, 255)), (stories, f_small, f_lab.size + 2, (255, 225, 140))):
            if not txt:
                continue
            tx, ty = px + ox, pz + oy + (dy if dr != "n" else -dy)
            d.text((tx, ty), txt, fill=col, font=f, anchor=anchor, stroke_width=3, stroke_fill=(0, 0, 0))
    if skip:
        a0, b0 = P(skip[0], skip[1]); a1, b1 = P(skip[2], skip[3])
        d.rectangle([a0, b0, a1, b1], outline=(255, 225, 140), width=3)
        d.text((a0 + 6, b1 - 6), V.get("detail_label", "detail: world_map_hub.png"), fill=(255, 225, 140), font=f_small, anchor="lb", stroke_width=3, stroke_fill=(0, 0, 0))
    # legend
    lx = L
    for txt, c in (("place (canonical spot)", (255, 70, 60)), ("village (generated)", (255, 230, 120)), ("pillager outpost", (230, 80, 80)), ("other structure", (200, 200, 200))):
        d.rectangle([lx, H - 28, lx + 12, H - 16], fill=c, outline=(0, 0, 0)); d.text((lx + 18, H - 22), txt, fill=(220, 220, 220), font=f_tiny, anchor="lm"); lx += 30 + int(d.textlength(txt, font=f_tiny))
    pathlib.Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    im.save(a.out)
    print(f"{a.out} ({im.width}x{im.height})")


if __name__ == "__main__":
    main()
