"""Render one still from a recording with any camera, look and time of day, at any size: channel art, thumbnails,
key art (docs/movie_engine.md). The camera is a render.js shot spec (the camera director: at / look / fov, path,
follow, orbit, or the auto-framed two / single / ots), dropped in at --at seconds of the recording.

    python3 scripts/still.py work/brand_art.rec.json out.png --at 3.0 --size 800x800 \\
        --shot '{"at": [-23, 2.2, 0.6], "look": [-19.5, 1.7, 0.6], "fov": 40}' \\
        [--look '{"grade": "dawn", "bloom": 0.6, ...}'] [--time 12300] [--ss 2]

--ss renders at N x the size and downsamples (cleaner edges and bloom at small sizes). Positions in the spec are
offsets from the set origin (rec.set), as in stunt.shots. --look replaces the stunt's look (LOOK_JSON).
"""
import argparse
import json
import os
import pathlib
import subprocess
import tempfile

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent.parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("rec")
    ap.add_argument("out")
    ap.add_argument("--at", type=float, required=True, help="recording seconds")
    ap.add_argument("--shot", required=True, help="a render.js shot spec (JSON)")
    ap.add_argument("--size", default="1920x1080")
    ap.add_argument("--look", help="JSON look (replaces the stunt's)")
    ap.add_argument("--time", type=int, help="time of day (DAY_TIME)")
    ap.add_argument("--ss", type=float, default=1.0, help="supersample factor")
    a = ap.parse_args()
    w, h = map(int, a.size.lower().split("x"))
    rw, rh = int(w * a.ss), int(h * a.ss)
    rec = json.loads(pathlib.Path(a.rec).read_text())
    tick = int(round(a.at * 20))
    rec["timeline"] = [e for e in rec["timeline"] if e["event"] not in ("shot", "f1_on", "f1_off")]
    rec["timeline"] += [{"t": tick * 50 - 1, "event": "shot", "name": "still"}, {"t": tick * 50 - 1, "event": "f1_on"}]
    rec["timeline"].sort(key=lambda e: e["t"])
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="hb-still-"))
    recp = tmp / "still.rec.json"
    recp.write_text(json.dumps(rec))
    env = {**os.environ, "SHOTS_JSON": json.dumps({"still": json.loads(a.shot)}), "FRAMES": str(tick), "NO_BARS": "1"}
    if a.look:
        env["LOOK_JSON"] = a.look
    if a.time is not None:
        env["DAY_TIME"] = str(a.time)
    subprocess.run(["node", "render.js", str(recp), str(tmp), "20", str(rw), str(rh)], cwd=HERE, env=env, check=True, stdout=subprocess.DEVNULL)
    im = Image.open(tmp / f"f{tick:05d}.png").convert("RGB")
    if (rw, rh) != (w, h):
        im = im.resize((w, h), Image.LANCZOS)
    im.save(a.out)
    print(a.out)


if __name__ == "__main__":
    main()
