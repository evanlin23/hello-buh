"""The steps of .github/workflows/render-slices.yml (a recording rendered in N parallel slices on Actions).

  python3 scripts/render_slices.py plan                 GITHUB_OUTPUT lines: name, stunt, fps, frames, n, matrix
                                                        (from renders/slices.json; IN_NAME/IN_STUNT/IN_SLICES override)
  python3 scripts/render_slices.py slice <i> <n> <frames>   render frames [i*frames/n, (i+1)*frames/n) of
                                                        work/$NAME.rec.json with render.js FRAMES=, and encode them
                                                        to work/segs/seg_<first>.mkv (lossless RGB)
  python3 scripts/render_slices.py join <frames>        decode work/segs/seg_*.mkv back to work/$NAME.frames/f%05d.png
                                                        under their real numbers, and check none is missing
  python3 scripts/render_slices.py result <status> <url>   write renders/result.json (done | failed)

render.js FRAMES= renders just those frames under their real numbers (f01234.png stays frame 1234), building the
world up to each one, so the slices join into exactly the frames a one-container render makes.
"""
import gzip
import json
import os
import pathlib
import subprocess
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent.parent
JOB = HERE / "renders" / "slices.json"
W, H = 1080, 1011   # run.sh's game view


def job():
    j = json.loads(JOB.read_text()) if JOB.exists() else {}
    name = os.environ.get("IN_NAME") or j.get("name")
    if not name:
        sys.exit("no job: renders/slices.json is missing and no name was given")
    return {
        "name": name,
        "stunt": os.environ.get("IN_STUNT") or j.get("stunt") or name,
        "slices": int(os.environ.get("IN_SLICES") or j.get("slices") or 12),
        "fps": int(j.get("fps") or 60),
        "queued": j.get("queued"),
        "source": j.get("source"),
    }


def frame_count(rec, fps):
    """render.js: frames = floor((poses - 1) / 20 * FPS), numbered from 0."""
    return int((len(rec["poses"]) - 1) / 20 * fps)


def bounds(i, n, frames):
    return i * frames // n, (i + 1) * frames // n


def plan():
    j = job()
    gz = HERE / "renders" / "slices" / f"{j['name']}.rec.json.gz"
    if not gz.exists():
        sys.exit(f"no {gz.relative_to(HERE)}: queue it with scripts/render_on_actions.sh {j['name']}")
    with gzip.open(gz, "rt") as f:
        rec = json.load(f)
    frames = frame_count(rec, j["fps"])
    n = max(1, min(j["slices"], 32, frames // 30 or 1))   # no slice under ~30 frames (each runner's setup costs ~3 min)
    print(f"name={j['name']}")
    print(f"stunt={j['stunt']}")
    print(f"fps={j['fps']}")
    print(f"frames={frames}")
    print(f"n={n}")
    print(f"matrix={json.dumps(list(range(n)))}")
    print(f"{j['name']}: {frames} frames at {j['fps']} fps in {n} slices", file=sys.stderr)


def slice_(i, n, frames):
    name, fps = os.environ["NAME"], os.environ.get("FPS", "60")
    a, b = bounds(i, n, frames)
    if b <= a:
        sys.exit(f"slice {i}/{n} is empty")
    out = HERE / "work" / f"{name}.frames"
    segs = HERE / "work" / "segs"
    segs.mkdir(parents=True, exist_ok=True)
    env = {**os.environ, "FRAMES": ",".join(map(str, range(a, b)))}
    t0 = time.time()
    subprocess.run(["node", "render.js", f"work/{name}.rec.json", str(out), str(fps), str(W), str(H)], cwd=HERE, env=env, check=True)
    missing = [f for f in range(a, b) if not (out / f"f{f:05d}.png").exists()]
    if missing:
        sys.exit(f"slice {i}: {len(missing)} frames missing, first {missing[0]}")
    # libx264rgb at qp 0: lossless RGB (no YUV round trip), and smaller than the PNGs (inter-frame)
    seg = segs / f"seg_{a:05d}.mkv"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(fps), "-start_number", str(a), "-i", str(out / "f%05d.png"),
                    "-frames:v", str(b - a), "-c:v", "libx264rgb", "-preset", "fast", "-qp", "0", str(seg)], check=True)
    print(f"slice {i}/{n}: frames {a}-{b - 1} in {time.time() - t0:.0f} s -> {seg.name} ({seg.stat().st_size / 1e6:.0f} MB)")


def join(frames):
    name = os.environ["NAME"]
    out = HERE / "work" / f"{name}.frames"
    out.mkdir(parents=True, exist_ok=True)
    segs = sorted((HERE / "work" / "segs").glob("seg_*.mkv"))
    if not segs:
        sys.exit("no slices downloaded")
    for s in segs:
        a = int(s.stem.split("_")[1])
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(s), "-start_number", str(a), "-pix_fmt", "rgb24", str(out / "f%05d.png")], check=True)
    missing = [f for f in range(frames) if not (out / f"f{f:05d}.png").exists()]
    if missing:
        sys.exit(f"{len(missing)} of {frames} frames missing after the join, first {missing[0]}")
    print(f"joined {len(segs)} slices: {frames} frames")


def result(status, url):
    j = job()
    r = {"name": j["name"], "stunt": j["stunt"], "status": status, "run": url, "source": j.get("source"), "queued": j.get("queued"),
         "finished": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    if status == "done":
        r["mp4"] = f"renders/out/{j['name']}.mp4"
    (HERE / "renders" / "result.json").write_text(json.dumps(r, indent=1) + "\n")
    print(json.dumps(r))


if __name__ == "__main__":
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == "plan":
        plan()
    elif cmd == "slice":
        slice_(int(args[0]), int(args[1]), int(args[2]))
    elif cmd == "join":
        join(int(args[0]))
    elif cmd == "result":
        result(args[0], args[1])
    else:
        sys.exit(__doc__)
