"""Try camera framings on an existing recording in about 30 s, without re-recording or editing the stunt
(docs/movie_engine.md, "Shots an agent can trust"):

    python3 scripts/try_shots.py work/movie_reel.rec.json --at 18.6 \\
        '{"a": {"at": [16.5, 206.5, 3.5], "look": [11, 199, 0.5], "fov": 60}, "b": {"ots": "self", "over": "actor:Highkeeper"}}'

--at: recording seconds (rec.timeline t / 1000) where every candidate is shown; candidates are dropped on the
following ticks, one each, so all of them see (nearly) the same moment. Prints the sheet's path and the lint's
verdict for each candidate. Specs are render.js shot specs (camera director): auto-framed (two / ots / single) or
hand-placed (at / path / follow / orbit).
"""
import argparse
import json
import os
import pathlib
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("rec")
    ap.add_argument("shots", help="JSON: {name: spec, ...}")
    ap.add_argument("--at", type=float, required=True, help="recording seconds")
    ap.add_argument("--out")
    a = ap.parse_args()
    shots = json.loads(a.shots)
    rec = json.loads(pathlib.Path(a.rec).read_text())
    tick = int(round(a.at * 20))
    names = list(shots)
    for k, n in enumerate(names):
        rec["timeline"].append({"t": (tick + k) * 50 - 1, "event": "shot", "name": f"try_{n}"})
        rec["timeline"].append({"t": (tick + k) * 50 - 1, "event": "f1_on"})
    rec["timeline"].sort(key=lambda e: e["t"])
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="hb-try-"))
    recp = tmp / "try.rec.json"
    recp.write_text(json.dumps(rec))
    env = {**os.environ, "SHOTS_JSON": json.dumps({f"try_{n}": s for n, s in shots.items()}), "FRAMES": ",".join(str(tick + k) for k in range(len(names)))}
    subprocess.run(["node", "render.js", str(recp), str(tmp), "20", "640", "360"], cwd=HERE, env=env, check=True, stdout=subprocess.DEVNULL)
    cols = min(3, len(names))
    rows = (len(names) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 640, rows * 390), (20, 20, 20))
    d = ImageDraw.Draw(sheet)
    for k, n in enumerate(names):
        im = Image.open(tmp / f"f{tick + k:05d}.png").convert("RGB")
        x, y = (k % cols) * 640, (k // cols) * 390
        sheet.paste(im, (x, y + 30))
        d.text((x + 6, y + 5), n, fill=(255, 230, 0), font=FONT)
    out = pathlib.Path(a.out or HERE / "work" / f"try_{pathlib.Path(a.rec).stem}.jpg")
    sheet.save(out, quality=88)
    print(out)


if __name__ == "__main__":
    main()
