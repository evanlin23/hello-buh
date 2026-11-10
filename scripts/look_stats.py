"""Exposure numbers for a game-view still (docs/look.md, the cinematic-style skill "Standards"): does a frame meet the
HelloBuh look on a phone? Luma is Rec.709 on the sRGB values (0-1), as a colourist's waveform shows it.

    python3 scripts/look_stats.py still.png [more.png ...] [--box x0,y0,x1,y1] [--night] [--json]

--box is the subject (fractions of the frame, default the middle third: 0.33,0.2,0.67,0.75, where the cast stands).
Checks (WARN lines, exit 1 if any):
  subject luma   day 0.35-0.70, night >= 0.25    (a face reads on a phone; Minecraft's lit skins and robes sit 0.35-0.55)
  black point    p1 luma >= 0.015                  (crushed shadows band in YouTube's encode)
  clipping       < 2% of pixels at 0.99+, sky aside (bloom on lights only)
  contrast       p95 - p5 >= 0.45 by day, >= 0.30 at night (a flat frame looks washed out on a phone)
  saturation     mean HSV saturation 0.20-0.60     (vanilla measures 0.48-0.57 ungraded; muddy below, neon above)
  separation     (reported, not a warning) subject vs surround luma and saturation: the casting guide's contrast
"""
import argparse
import json
import sys

import numpy as np
from PIL import Image


def stats(path, box):
    a = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32) / 255
    h, w = a.shape[:2]
    luma = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    mx, mn = a.max(2), a.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    x0, y0, x1, y1 = int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)
    sub = np.zeros_like(luma, dtype=bool)
    sub[y0:y1, x0:x1] = True
    ring = np.zeros_like(sub)
    pad = int(0.08 * w)
    ring[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad] = True
    ring &= ~sub
    sky = (a[:, :, 2] > a[:, :, 0] + 0.08) & (luma > 0.45)   # blue sky: ignored for clipping
    return {
        "file": str(path),
        "mean": round(float(luma.mean()), 3),
        "subject": round(float(luma[sub].mean()), 3),
        "surround": round(float(luma[ring].mean()), 3),
        "p1": round(float(np.percentile(luma, 1)), 3),
        "p5": round(float(np.percentile(luma, 5)), 3),
        "p95": round(float(np.percentile(luma, 95)), 3),
        "clip": round(float(((luma >= 0.99) & ~sky).mean()), 4),
        "sat": round(float(sat.mean()), 3),
        "sat_subject": round(float(sat[sub].mean()), 3),
        "sat_surround": round(float(sat[ring].mean()), 3),
        "rb": round(float(a[:, :, 0].mean() - a[:, :, 2].mean()), 3),   # + warm, - cool
    }


def warnings(s, night):
    out = []
    if night:
        if s["subject"] < 0.25:
            out.append(f"subject luma {s['subject']} < 0.25 at night: light the face (a lantern within 4 blocks) or raise exposure")
    elif not 0.35 <= s["subject"] <= 0.70:
        out.append(f"subject luma {s['subject']} outside 0.35-0.70 by day")
    if s["p1"] < 0.015:
        out.append(f"black point p1 {s['p1']} < 0.015: shadows crushed (raise lift)")
    if s["clip"] > 0.02:
        out.append(f"{s['clip'] * 100:.1f}% clipped (not sky): lower exposure or bloom")
    span = s["p95"] - s["p5"]
    if span < (0.30 if night else 0.45):
        out.append(f"contrast p95-p5 {span:.2f} is flat")
    if not 0.20 <= s["sat"] <= 0.60:
        out.append(f"mean saturation {s['sat']} outside 0.20-0.60")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--box", default="0.33,0.2,0.67,0.75")
    ap.add_argument("--night", action="store_true")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    box = [float(v) for v in a.box.split(",")]
    res, bad = [], False
    for f in a.files:
        s = stats(f, box)
        s["warn"] = warnings(s, a.night)
        bad |= bool(s["warn"])
        res.append(s)
    if a.json:
        print(json.dumps(res, indent=1))
    else:
        for s in res:
            print(f"{s['file']}: subject {s['subject']} surround {s['surround']} mean {s['mean']} p1 {s['p1']} p5-p95 {s['p5']}-{s['p95']} "
                  f"clip {s['clip']} sat {s['sat']} warm {s['rb']:+}")
            for w in s["warn"]:
                print("  WARN", w)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
