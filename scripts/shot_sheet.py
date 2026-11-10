"""One labelled frame from the middle of every shot of a movie scene (docs/movie_engine.md), in about a minute:
check the cameras before a full render.

    python3 scripts/shot_sheet.py work/movie_reel.rec.json [out.jpg] [--at 0.5]

--at: where in each shot to sample (0 = its first tick, 1 = its last; default 0.5). The frames are rendered at
640x360 through render.js FRAMES= (fps 10), so the camera director, actors and fog are exactly the render's.
"""
import argparse
import json
import os
import pathlib
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("rec")
    ap.add_argument("out", nargs="?")
    ap.add_argument("--at", type=float, default=0.5)
    a = ap.parse_args()
    rec = json.loads(pathlib.Path(a.rec).read_text())
    tl = rec["timeline"]
    end = max(e["t"] for e in tl) / 1000
    st = next((e["t"] / 1000 for e in tl if e["event"] == "start"), 0.0)
    shots = [(e["t"] / 1000, e["name"]) for e in tl if e["event"] == "shot"]
    if not shots:
        sys.exit("no shot marks in this recording")
    picks = []
    for k, (t0, name) in enumerate(shots):
        t1 = shots[k + 1][0] if k + 1 < len(shots) else end
        picks.append((t0 + (t1 - t0) * a.at, name, t0 - st, t1 - t0))
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="hb-shots-"))
    frames = [int(round(t * 10)) for t, *_ in picks]
    env = {**os.environ, "FRAMES": ",".join(map(str, frames))}
    subprocess.run(["node", "render.js", a.rec, str(tmp), "10", "640", "360"], cwd=HERE, env=env, check=True,
                   stdout=subprocess.DEVNULL)
    cols = 4
    rows = (len(picks) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 640, rows * 390), (20, 20, 20))
    d = ImageDraw.Draw(sheet)
    for k, ((t, name, t_rel, dur), f) in enumerate(zip(picks, frames)):
        x, y = (k % cols) * 640, (k // cols) * 390
        im = Image.open(tmp / f"f{f:05d}.png").convert("RGB")
        sheet.paste(im, (x, y + 30))
        d.text((x + 6, y + 5), f"{k + 1}. {name}  at {t_rel:.1f}s  ({dur:.1f}s long)", fill=(255, 230, 0), font=FONT)
    out = pathlib.Path(a.out or pathlib.Path(a.rec).with_suffix(".shots.jpg"))
    sheet.save(out, quality=88)
    print(f"{len(picks)} shots -> {out}")


if __name__ == "__main__":
    main()
