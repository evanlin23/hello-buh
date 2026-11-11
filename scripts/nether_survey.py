#!/usr/bin/env python3
"""Draw the Nether survey (stunts/_test_camera_world_nether.js -> work/nether_survey.json) as a top-down map: each
column coloured by its highest walkable floor under the roof (dark = low, light = high; lava lakes orange), the place's
footprint and origin, the nearest bastion remnant and fortress (/locate) as arrows if off the map. North up.

  python3 scripts/nether_survey.py [work/nether_survey.json] [--out docs/engine_proofs/camera_world/nether_survey.png]
                                   [--max-y 110] [--scale 4]
Also prints a short summary: floor heights round the origin, the lava level, the open ground at about y 80.
"""
import argparse
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('survey', nargs='?', default=os.path.join(ROOT, 'work', 'nether_survey.json'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'docs', 'engine_proofs', 'camera_world', 'nether_survey.png'))
    ap.add_argument('--max-y', type=int, default=110)
    ap.add_argument('--scale', type=int, default=4)
    a = ap.parse_args()
    S = json.load(open(a.survey))
    x0, z0, x1, z1 = S['area']
    cols = S['cols']
    k = a.scale
    W, H = (x1 - x0 + 1) * k, (z1 - z0 + 1) * k
    im = Image.new('RGB', (W, H + 40), (20, 10, 10))
    d = ImageDraw.Draw(im)
    lo, hi = 30, a.max_y
    hist = {}
    for zi, row in enumerate(cols):
        for xi, c in enumerate(row):
            fl = [f for f in c['floors'] if f[0] <= a.max_y]
            top = fl[0][0] if fl else None
            lava = c['lava'] if c['lava'] is not None and c['lava'] <= a.max_y else None
            if lava is not None and (top is None or lava >= top):
                col = (230, 110, 20)
            elif top is None:
                col = (40, 20, 20)
            else:
                u = max(0.0, min(1.0, (top - lo) / (hi - lo)))
                name = fl[0][1]
                base = (150, 60, 55) if 'netherrack' in name else (90, 85, 100) if ('blackstone' in name or 'basalt' in name) else (160, 140, 100) if 'soul' in name else (200, 160, 40) if 'gold' in name else (120, 70, 60)
                col = tuple(int(v * (0.35 + 0.75 * u)) for v in base)
                hist[top] = hist.get(top, 0) + 1
            d.rectangle([xi * k, zi * k, xi * k + k - 1, zi * k + k - 1], fill=col)
    P = S['at']
    fp = [-40, -140, 8, -96]
    try:
        fp = json.load(open(os.path.join(ROOT, 'lib', 'hb', 'test', 'fixtures', 'world_nether_map.json')))['places'][S['place']]['footprint']
    except Exception:
        pass
    d.rectangle([(fp[0] - x0) * k, (fp[1] - z0) * k, (fp[2] - x0 + 1) * k, (fp[3] - z0 + 1) * k], outline=(255, 255, 255), width=2)
    ox, oz = (P[0] - x0) * k + k // 2, (P[2] - z0) * k + k // 2
    d.ellipse([ox - 6, oz - 6, ox + 6, oz + 6], outline=(255, 255, 255), width=3)
    font = ImageFont.load_default()
    for what, loc, colr in (('bastion', S.get('bastion'), (255, 215, 0)), ('fortress', S.get('fortress'), (120, 200, 255))):
        if not loc:
            continue
        bx, bz = (loc[0] - x0) * k, (loc[1] - z0) * k
        cx, cz = max(8, min(W - 8, bx)), max(8, min(H - 8, bz))
        d.ellipse([cx - 7, cz - 7, cx + 7, cz + 7], fill=colr)
        d.text((cx + 9, cz - 6), f"{what} ({loc[0]}, {loc[1]}){'' if (cx, cz) == (bx, bz) else ' off map'}", fill=colr, font=font)
    d.text((6, H + 4), f"Nether ({x0},{z0})..({x1},{z1}), north up, 1 block = {k} px, biome at the origin {S.get('biome')}", fill=(230, 230, 230), font=font)
    d.text((6, H + 20), f"colour: highest floor <= y{a.max_y} (dark y{lo} .. light y{hi}); orange: lava; white: the claim, origin {tuple(P)}", fill=(230, 230, 230), font=font)
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    im.save(a.out)
    c = cols[P[2] - z0][P[0] - x0]
    lavas = [c['lava'] for row in cols for c in row if c['lava'] is not None]
    near = [f[0] for dz in range(-12, 13) for dx in range(-12, 13) for f in cols[P[2] - z0 + dz][P[0] - x0 + dx]['floors'][:1] if 0 <= P[2] - z0 + dz < len(cols)]
    print(f"origin {tuple(P)}: floors {c['floors']}, lava {c['lava']}")
    print(f"lava surface (most common): {max(set(lavas), key=lavas.count) if lavas else None}")
    if near:
        near.sort()
        print(f"top floors within 12 blocks of the origin: min {near[0]}, median {near[len(near) // 2]}, max {near[-1]}")
    print(f"biome at the origin {S.get('biome')}; bastion {S.get('bastion')}, fortress {S.get('fortress')} (/locate: [x, z, blocks away])")
    print(f"-> {os.path.relpath(a.out, ROOT)}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
