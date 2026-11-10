"""A vertical Short from a movie scene (docs/movie_engine.md, roadmap 6.2): the same recording re-rendered in the
Shorts layout (1080x1920, the game view 1080x1011 at 60 fps), with the scene's own cameras, actors and look but no
letterbox, cut to a window between two marks, captioned like every Short, its lines as the green subtitles.

    python3 scripts/scene_short.py movie_reel --from fall:-1.0 --to fog:0.6 --caption "POV: the bell rings twice 💀"
    -> out/<stunt>_short.mp4  (work/<stunt>.rec.json from scripts/record.sh)

Re-rendering (not cropping the 16:9 cut) keeps every shot framed on its subject. Only the window is rendered.
"""
import argparse
import json
import os
import pathlib
import subprocess

HERE = pathlib.Path(__file__).resolve().parent.parent


def at(timeline, spec):
    ev, _, off = spec.rpartition(":") if ":" in spec else (spec, "", "0")
    ts = [e["t"] / 1000 for e in timeline if e["event"] == ev]
    if not ts:
        raise SystemExit(f"no '{ev}' mark in the recording")
    return ts[0] + float(off or 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("stunt")
    ap.add_argument("--from", dest="a", required=True)
    ap.add_argument("--to", dest="b", required=True)
    ap.add_argument("--caption", required=True)
    ap.add_argument("--red")
    ap.add_argument("--fps", type=int, default=60)
    o = ap.parse_args()
    rec_path = HERE / "work" / f"{o.stunt}.rec.json"
    rec = json.loads(rec_path.read_text())
    tl = rec["timeline"]
    a, b = at(tl, o.a), at(tl, o.b)
    n = int((len(rec["poses"]) - 1) / 20 * o.fps)
    need = [f for f in range(n) if a - 0.2 <= f / o.fps <= b + 0.2]
    fdir = HERE / "work" / f"{o.stunt}.short_frames"
    subprocess.run(["rm", "-rf", str(fdir)], check=True)
    env = {**os.environ, "FRAMES": ",".join(map(str, need)), "NO_BARS": "1"}
    subprocess.run(["node", "render.js", str(rec_path), str(fdir), str(o.fps), "1080", "1011"], cwd=HERE, env=env, check=True)
    for f in range(n):   # every frame name exists (edit.py reads a continuous sequence), fillers are hardlinks
        q = fdir / f"f{f:05d}.png"
        if not q.exists():
            src = fdir / f"f{min(max(f, need[0]), need[-1]):05d}.png"
            os.link(src, q)
    wav = HERE / "work" / f"{o.stunt}.wav"
    if not wav.exists():
        subprocess.run(["python3", "audio.py", str(rec_path), str(wav)], cwd=HERE, check=True)
    lines = [[e["event"], e.get("text", ""), 2.2, k] for k, e in enumerate([x for x in tl if x["event"] == "line"])]
    subs = [["line", t, d, k] for _, t, d, k in lines if t]
    args = ["python3", "edit.py", "--frames", str(fdir / "f%05d.png"), "--fps", str(o.fps), "--out_fps", str(o.fps),
            "--timeline", str(rec_path), "--audio", str(wav), "--caption", o.caption, "--start", f"{a:.3f}",
            "--end_after", o.b if ":" in o.b else f"{o.b}:0",
            "--out", str(HERE / "out" / f"{o.stunt}_short.mp4")]
    if o.red:
        args += ["--red", o.red]
    if subs:
        args += ["--subs", json.dumps(subs)]
    subprocess.run(args, cwd=HERE, check=True)


if __name__ == "__main__":
    main()
