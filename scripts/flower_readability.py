#!/usr/bin/env python3
"""Flower readability from straight above (camera_world piece; docs/engine_features.md "Flying-mob POV, the crane,
the Nether"). Reads a top-down still of stunts/_test_camera_world.js's meadow (its `flowers` patches on grass) and
ranks each flower by how far its patch's colour stands off the bare grass right round it (the lanes), on the full frame and on a 300 px-wide
thumbnail (what a scroller sees).

  python3 scripts/flower_readability.py STILL.png --set X,Y,Z [--cam DX,DY,DZ] [--fov 70] [--out DIR]

STILL: a frame from the crane's top (yaw 0, pitch -90: north up). --set: the recording's set origin (rec.set),
--cam: the crane's `to` (set-relative). Writes DIR/readability.md (the table) and DIR/readability.png (the patches
outlined and labelled). A patch "reads" when its mean colour is >= 20 (CIE76 delta E) off the grass on the
thumbnail; "covers" is the share of its pixels >= 15 off the grass at full size (sprites seen edge-on leave grass
showing between them).
"""
import argparse
import json
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def lab(rgb):
    """sRGB (0..255, ... x 3) -> CIE Lab (D65)."""
    c = np.asarray(rgb, float) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def flowers():
    js = "const s=require('./stunts/_test_camera_world.js');process.stdout.write(JSON.stringify({f:s.flowers,c:s.shots.crane.crane}))"
    return json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('still')
    ap.add_argument('--set', required=True)
    ap.add_argument('--cam', default=None)
    ap.add_argument('--fov', type=float, default=None)
    ap.add_argument('--out', default='.')
    a = ap.parse_args()
    S = [float(v) for v in a.set.split(',')]
    spec = flowers()
    cam = [float(v) for v in a.cam.split(',')] if a.cam else spec['c']['to']
    fov = a.fov or spec['c'].get('fov', 70)
    img = Image.open(a.still).convert('RGB')
    W, H = img.size
    px = np.asarray(img, float)
    tv = math.tan(math.radians(fov) / 2)
    ground = 1.0   # the top of the grass block (set y + 1)
    d = cam[1] - ground

    def to_px(x, z):   # set-relative block coords -> pixels (north up, east right)
        return (W / 2 + (x - cam[0]) / (d * tv * W / H) * W / 2, H / 2 + (z - cam[2]) / (d * tv) * H / 2)

    def box(x0, z0, x1, z1, inset=0.5):
        a0 = to_px(x0 + inset, z0 + inset)
        a1 = to_px(x1 + 1 - inset, z1 + 1 - inset)
        return [int(round(a0[0])), int(round(a0[1])), int(round(a1[0])), int(round(a1[1]))]

    # the grass: the 2-block lanes between patches, sampled as the ring round the whole grid
    fl = spec['f']
    gx0 = min(f['x0'] for f in fl); gz0 = min(f['z0'] for f in fl); gx1 = max(f['x1'] for f in fl); gz1 = max(f['z1'] for f in fl)
    outer = box(gx0 - 6, gz0 - 6, gx1 + 6, gz1 + 6, 0)
    inner = box(gx0 - 1, gz0 - 1, gx1 + 1, gz1 + 1, 0)
    mask = np.zeros((H, W), bool)
    mask[max(0, outer[1]):outer[3], max(0, outer[0]):outer[2]] = True
    mask[max(0, inner[1]):inner[3], max(0, inner[0]):inner[2]] = False
    grass = px[mask].mean(0)
    gl = lab(grass)
    tw = 300
    th = round(H * tw / W)
    thumb = np.asarray(img.resize((tw, th), Image.LANCZOS), float)
    sc = tw / W
    L = lab(px)
    rows = []
    for f in fl:
        b = box(f['x0'], f['z0'], f['x1'], f['z1'])
        patch = px[b[1]:b[3], b[0]:b[2]]
        if patch.size == 0:
            continue
        # the grass right round it (the lanes between patches: the biome's tint changes across a field)
        ob = box(f['x0'] - 1, f['z0'] - 1, f['x1'] + 1, f['z1'] + 1, 0.2)
        ib = box(f['x0'], f['z0'], f['x1'], f['z1'], 0)
        rm = np.zeros((H, W), bool)
        rm[max(0, ob[1]):ob[3], max(0, ob[0]):ob[2]] = True
        rm[max(0, ib[1]):ib[3], max(0, ib[0]):ib[2]] = False
        gl = lab(px[rm].mean(0)) if rm.any() else lab(grass)
        mean = patch.reshape(-1, 3).mean(0)
        de = float(np.linalg.norm(lab(mean) - gl))
        cover = float((np.linalg.norm(L[b[1]:b[3], b[0]:b[2]] - gl, axis=-1) >= 15).mean())
        tb = [int(b[0] * sc), int(b[1] * sc), max(int(b[0] * sc) + 1, int(b[2] * sc)), max(int(b[1] * sc) + 1, int(b[3] * sc))]
        tmean = thumb[tb[1]:tb[3], tb[0]:tb[2]].reshape(-1, 3).mean(0)
        tde = float(np.linalg.norm(lab(tmean) - gl))
        rows.append({'block': f['block'].split('[')[0], 'mean': [round(v) for v in mean], 'dE': round(de, 1), 'thumb_dE': round(tde, 1), 'cover': round(cover, 2), 'px': b[2] - b[0], 'box': b, 'reads': tde >= 20})
    rows.sort(key=lambda r: -r['thumb_dE'])
    os.makedirs(a.out, exist_ok=True)
    md = ['| rank | flower | mean RGB | dE full | dE 300 px | covers | patch px | reads |', '|---|---|---|---|---|---|---|---|']
    for i, r in enumerate(rows):
        md.append(f"| {i + 1} | {r['block']} | {tuple(r['mean'])} | {r['dE']} | {r['thumb_dE']} | {round(r['cover'] * 100)} % | {r['px']} | {'yes' if r['reads'] else 'no'} |")
    md.append(f"\ndE: CIE76 between the patch mean and the grass in the 1-block lane round it; field grass mean RGB {tuple(round(v) for v in grass)}; camera {cam} (set-relative), fov {fov}, frame {W}x{H}; 7x7-block patches")
    open(os.path.join(a.out, 'readability.md'), 'w').write('\n'.join(md) + '\n')
    im = img.copy()
    dr = ImageDraw.Draw(im)
    try:
        font = ImageFont.truetype(os.path.join(ROOT, 'fonts', os.listdir(os.path.join(ROOT, 'fonts'))[0]), 22)
    except Exception:
        font = ImageFont.load_default()
    for r in rows:
        b = r['box']
        dr.rectangle(b, outline=(255, 255, 255) if r['reads'] else (255, 60, 60), width=2)
        dr.text((b[0] + 2, b[3] + 2), f"{r['block'][:12]} {r['thumb_dE']:.0f}", fill=(255, 255, 255), font=font)
    im.save(os.path.join(a.out, 'readability.png'))
    print('\n'.join(md))
    return 0


if __name__ == '__main__':
    sys.exit(main())
