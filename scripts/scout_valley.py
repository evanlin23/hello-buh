"""Draw stunts/scout_valley.js's SCOUT_HM lines (work/scout.log or a record log): one PNG per village, the heightmap
shaded with the top blocks coloured (water blue, paths tan, buildings brown, leaves dark green), north up, a grid
every 16 blocks from the village centre, and relief numbers (the height spread, the north half over the south).
    python3 scripts/scout_valley.py work/record.log out_dir
"""
import json, re, sys, pathlib
import numpy as np
from PIL import Image, ImageDraw

log, out = sys.argv[1], pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
COL = {'water': (60, 90, 200), 'dirt_path': (190, 160, 100), 'sand': (220, 210, 150), 'gravel': (140, 140, 140)}
for line in open(log, errors='replace'):
    m = re.search(r'SCOUT_HM (\{.*\})', line)
    if not m: continue
    r = json.loads(m.group(1))
    if 'ys' not in r: print('skip', r); continue
    ys = np.array(r['ys'], float); nm = r['names']; n = ys.shape[0]
    v = ys[ys > 0]; lo, hi = np.percentile(v, 2), np.percentile(v, 98)
    img = np.zeros((n, n, 3), np.uint8)
    for i in range(n):
        for j in range(n):
            t = (ys[i, j] - lo) / max(1, hi - lo); g = int(60 + 170 * min(1, max(0, t)))
            name = nm[i][j]
            c = COL.get(name)
            if c is None:
                if 'leaves' in name: c = (20, int(g * 0.5), 20)
                elif any(k in name for k in ('plank', 'log', 'cobble', 'stairs', 'slab', 'glass', 'door', 'hay', 'wool', 'bed', 'terracotta')): c = (150, 80, 40)
                elif name in ('grass_block', 'dirt', 'podzol'): c = (int(g * 0.55), g, int(g * 0.45))
                elif 'snow' in name or 'ice' in name: c = (240, 240, 250)
                else: c = (g, g, g)
            img[i, j] = c
    im = Image.fromarray(img).resize((n * 5, n * 5), Image.NEAREST); d = ImageDraw.Draw(im)
    s = r['step']
    for k in range(-r['R'], r['R'] + 1, 16):
        p = (k + r['R']) // s * 5; d.line([(p, 0), (p, n * 5)], fill=(255, 255, 255) if k == 0 else (90, 90, 90)); d.line([(0, p), (n * 5, p)], fill=(255, 255, 255) if k == 0 else (90, 90, 90))
    c = n // 2; ctr = ys[c - 8:c + 8, c - 8:c + 8]; north = ys[c - 25:c - 8, c - 15:c + 15]; south = ys[c + 8:c + 25, c - 15:c + 15]
    txt = f"{r['found']} y{int(np.median(ctr))} spread {hi - lo:.0f}  N-ctr {np.median(north) - np.median(ctr):+.0f}  S-ctr {np.median(south) - np.median(ctr):+.0f}"
    d.rectangle([0, 0, n * 5, 18], fill=(0, 0, 0)); d.text((4, 3), txt, fill=(255, 255, 255))
    f = out / f"v_{r['found'][0]}_{r['found'][1]}.png"; im.save(f); print(f, txt)
