"""Try a grade on an ungraded still in about a second, instead of a render (docs/look.md).

    LOOK=0 ./hb still <stunt> 12.5 --size 1080x1011 --out /tmp/raw      # the ungraded frame, once
    python3 scripts/grade_preview.py /tmp/raw/01_*.png out.png --look golden_hour
    python3 scripts/grade_preview.py raw.png out.png --look '{"mood": "eerie_night", "grade": {"exposure": 1.5}}'

It is renderer/page.js's finishing pass (exposure, lift/gamma/gain, saturation, the clamp, the S-curve, the vignette)
in numpy, on the same 8-bit values (the renderer writes linear passthrough), so it matches a render of the same look
with bloom 0 and grain 0 to within a level or two (look.rolloff, the highlight shoulder, included). Bloom, god rays, haze, depth of field and grain are not modelled:
the moods (renderer/looks.js) don't set them. --side writes before|after side by side.
"""
import argparse
import json
import pathlib
import subprocess

import numpy as np
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent.parent
NEUTRAL = {"lift": [0, 0, 0], "gamma": [1, 1, 1], "gain": [1, 1, 1], "sat": 1.04, "contrast": 0.08, "exposure": 1}


def resolve(look):
    """the look as render.js sees it (renderer/looks.js resolveLook), via node so there is one source of truth"""
    arg = look if look.strip().startswith(("{", '"')) else json.dumps(look)
    out = subprocess.run(["node", "-e", "process.stdout.write(JSON.stringify(require('./renderer/looks').resolveLook(JSON.parse(process.argv[1]))))", arg],
                         cwd=HERE, capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def grade(img, look):
    g = look.get("grade") or {}
    if isinstance(g, str):
        raise SystemExit("named page.js grades ('night', 'dawn') aren't mirrored here: pass a mood or a grade object")
    g = {**NEUTRAL, **g}
    c = np.asarray(img.convert("RGB"), dtype=np.float32) / 255
    c = c * g.get("exposure", 1)
    lift, gam, gain = (np.array(g[k], dtype=np.float32) for k in ("lift", "gamma", "gain"))
    c = np.power(np.maximum(0, c * gain + lift * (1 - c)), 1 / gam)
    k = look.get("rolloff") or 0
    if 0 < k < 1:   # look.rolloff: the highlight shoulder (page.js), hue kept: the brightest channel eases into 1
        m = c.max(axis=-1, keepdims=True)
        r = np.where(m > k, k + (1 - k) * (1 - np.exp(-(m - k) / (1 - k))), m)
        c = c * r / np.maximum(m, 1e-6)
    lum = c @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    c = lum[..., None] + (c - lum[..., None]) * g["sat"]
    c = np.clip(c, 0, 1)
    c = c + (c * c * (3 - 2 * c) - c) * g["contrast"]
    h, w = c.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    qx, qy = ((xx + 0.5) / w - 0.5) * (w / h), (1 - (yy + 0.5) / h) - 0.5
    d = np.sqrt(qx * qx + qy * qy)
    t = np.clip((d - 0.95) / (0.25 - 0.95), 0, 1)
    vig = 1 + (t * t * (3 - 2 * t) - 1) * look.get("vignette", 0.35)
    c = np.clip(c * vig[..., None], 0, 1)
    return Image.fromarray((c * 255 + 0.5).astype(np.uint8))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--look", required=True, help="a mood name or a look JSON")
    ap.add_argument("--side", action="store_true", help="before | after side by side")
    a = ap.parse_args()
    src = Image.open(a.src).convert("RGB")
    out = grade(src, resolve(a.look))
    if a.side:
        s = Image.new("RGB", (src.width * 2 + 8, src.height), (0, 0, 0))
        s.paste(src, (0, 0))
        s.paste(out, (src.width + 8, 0))
        out = s
    out.save(a.out)
    print(a.out)


if __name__ == "__main__":
    main()
