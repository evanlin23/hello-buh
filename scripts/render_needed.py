"""Render only the frames a time-lapse edit uses.

  python3 scripts/render_needed.py <stunt> work/<name>.rec.json work/<name>.frames [FPS]

A stunt with `edit.speed` spans (scripts/timewarp.py) keeps 1 frame in FACTOR inside a sped-up span
and none inside a cut, and nothing before `startAt` or after `endAfter`, so most of a 3x
time-lapse never reaches the Short. This renders just the frames the edit picks (render.js ONLY=)
and hardlinks every skipped frame number to the nearest rendered one, so the folder looks like a
full render to edit.py and publish.js. A 50 s recording with a 27 s 3x span: ~1400 frames, not 3100.
"""
import json
import os
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from timewarp import Warp  # noqa: E402


def main(stunt, rec_path, out_dir, fps=60):
    edit = json.loads(subprocess.run(["node", "-e", f"console.log(JSON.stringify(require('./stunts/{stunt}').edit||{{}}))"],
                                     cwd=HERE.parent, capture_output=True, text=True, check=True).stdout)
    rec = json.loads(pathlib.Path(rec_path).read_text())
    tl = rec["timeline"]
    n = int((len(rec["poses"]) - 1) / 20 * fps)
    warp = Warp(edit.get("speed") or [], tl)
    ev = {}
    for e in warp.timeline(tl):
        ev.setdefault(e["event"], e["t"] / 1000)
    start, end = 0.0, warp.out(n / fps)
    if edit.get("startAt"):
        k, off = edit["startAt"].rsplit(":", 1)
        if k in ev:
            start = max(0.0, ev[k] + float(off))
    if edit.get("endAfter"):
        k, secs = edit["endAfter"].rsplit(":", 1)
        if k in ev:
            end = min(end, ev[k] + float(secs))
    # the source frames edit.py will pick (same rounding as edit.py's apply_speed), with a little margin
    need = set()
    k = 0
    while True:
        i = int(round(warp.src(k / fps) * fps))
        if i >= n:
            break
        if start - 0.5 <= k / fps <= end + 0.5:
            need.add(i)
        k += 1
    need = sorted(need)
    print(f"rendering {len(need)} of {n} frames")
    out = pathlib.Path(out_dir)
    tmp = out.with_name(out.name + ".sparse")
    subprocess.run(["rm", "-rf", str(out), str(tmp)], check=True)
    env = {**os.environ, "ONLY": ",".join(f"{f * 20 / fps:.6f}" for f in need)}
    subprocess.run(["node", "render.js", rec_path, str(tmp), str(fps), "1080", "1011"], cwd=HERE.parent, env=env, check=True)
    out.mkdir(parents=True)
    for j, f in enumerate(need):
        os.replace(tmp / f"f{j:05d}.png", out / f"f{f:05d}.png")
    tmp.rmdir()
    rendered, have = set(need), need[0]
    for f in range(n):
        if f in rendered:
            have = f
        else:
            os.link(out / f"f{have:05d}.png", out / f"f{f:05d}.png")
    print(f"{n} frame names, {len(need)} rendered")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 60)
