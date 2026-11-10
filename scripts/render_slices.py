"""The steps of .github/workflows/render-slices.yml (a recording rendered in N parallel slices on Actions).

  python3 scripts/render_slices.py plan                 GITHUB_OUTPUT lines: name, stunt, fps, frames, n, matrix, reuse
                                                        (reuse: renders/slices.json reuse_run, when that run's seg-*
                                                        artifacts are still there: the slices are skipped)
                                                        (from renders/slices.json; IN_NAME/IN_STUNT/IN_SLICES override)
                                                        matrix = {"include": [{"i", "a", "b"}, ...]}: n contiguous
                                                        frame ranges of about equal render TIME (scripts/render_cost.py:
                                                        relights, whole-world re-meshes at sky-light changes, start-up),
                                                        not equal length
  python3 scripts/render_slices.py slice <a> <b>        render frames [a, b) of work/$NAME.rec.json with render.js
                                                        FRAMES=, and encode them to work/segs/seg_<a>.mkv (lossless RGB)
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
        "slices": int(os.environ.get("IN_SLICES") or j.get("slices") or 16),
        "fps": int(j.get("fps") or 60),
        "queued": j.get("queued"),
        "source": j.get("source"),
        "reuse_run": j.get("reuse_run"),
        "picture_key": j.get("picture_key"),
    }


def frame_count(rec, fps):
    """render.js: frames = floor((poses - 1) / 20 * FPS), numbered from 0."""
    return int((len(rec["poses"]) - 1) / 20 * fps)


def plan():
    j = job()
    gz = HERE / "renders" / "slices" / f"{j['name']}.rec.json.gz"
    if not gz.exists():
        sys.exit(f"no {gz.relative_to(HERE)}: queue it with scripts/render_on_actions.sh {j['name']}")
    with gzip.open(gz, "rt") as f:
        rec = json.load(f)
    frames = frame_count(rec, j["fps"])
    sys.path.insert(0, str(HERE / "scripts"))
    import render_cost
    # equal frame counts left story_nitwit's sunset slice at 12 min while the others took 2.5-7: split by the
    # estimated render time instead (a heavy stretch gets short slices). At most 32 runners; a slice can be
    # short (a few frames of whole-world re-meshes) but never empty.
    ranges, est, total = render_cost.slice_plan(rec, min(j["slices"], 32), j["fps"], W, H, min_frames=10)
    assert ranges[0][0] == 0 and ranges[-1][1] == frames and all(a < b for a, b in ranges)
    n = len(ranges)
    reuse = reusable(j.get("reuse_run"))
    print(f"reuse={reuse}")
    print(f"name={j['name']}")
    print(f"stunt={j['stunt']}")
    print(f"fps={j['fps']}")
    print(f"frames={frames}")
    print(f"n={n}")
    print(f"matrix={json.dumps({'include': [{'i': i, 'a': a, 'b': b} for i, (a, b) in enumerate(ranges)]})}")
    print(f"{j['name']}: {frames} frames at {j['fps']} fps in {n} slices; estimated {total / 60:.0f} min of render in one process, "
          f"slowest slice ~{max(est) / 60:.1f} min", file=sys.stderr)
    for i, ((a, b), e) in enumerate(zip(ranges, est)):
        print(f"  slice {i}: frames {a}-{b - 1} ({b - a}), ~{e / 60:.1f} min", file=sys.stderr)


def reusable(run):
    """The run id whose seg-* artifacts this job reuses (hb render --reuse: the same recording and picture code, only
    the edit changed), or "" to render every slice: no reuse asked, the artifacts expired or gone, or the API can't
    be asked (no token). Never fails the plan: a full render is always the fallback."""
    if not run:
        return ""
    import urllib.request
    repo, tok = os.environ.get("GITHUB_REPOSITORY"), os.environ.get("GITHUB_TOKEN")
    if not (repo and tok):
        print(f"reuse {run}: no GITHUB_REPOSITORY/GITHUB_TOKEN: rendering every slice", file=sys.stderr)
        return ""
    try:
        req = urllib.request.Request(f"https://api.github.com/repos/{repo}/actions/runs/{run}/artifacts?per_page=100",
                                     headers={"Authorization": f"Bearer {tok}", "Accept": "application/vnd.github+json"})
        arts = json.load(urllib.request.urlopen(req, timeout=30)).get("artifacts", [])
    except Exception as e:  # noqa: BLE001
        print(f"reuse {run}: could not list its artifacts ({e}): rendering every slice", file=sys.stderr)
        return ""
    segs = [a for a in arts if a.get("name", "").startswith("seg-") and not a.get("expired")]
    if not segs:
        print(f"reuse {run}: its frames are gone (no live seg-* artifacts): rendering every slice", file=sys.stderr)
        return ""
    print(f"reuse {run}: {len(segs)} slices of frames: only the edit runs", file=sys.stderr)
    return str(run)


def slice_(a, b):
    name, fps = os.environ["NAME"], os.environ.get("FPS", "60")
    if b <= a:
        sys.exit(f"slice {a}-{b} is empty")
    out = HERE / "work" / f"{name}.frames"
    segs = HERE / "work" / "segs"
    segs.mkdir(parents=True, exist_ok=True)
    env = {**os.environ, "FRAMES": ",".join(map(str, range(a, b)))}
    t0 = time.time()
    subprocess.run(["node", "render.js", f"work/{name}.rec.json", str(out), str(fps), str(W), str(H)], cwd=HERE, env=env, check=True)
    missing = [f for f in range(a, b) if not (out / f"f{f:05d}.png").exists()]
    if missing:
        sys.exit(f"slice {a}-{b}: {len(missing)} frames missing, first {missing[0]}")
    # libx264rgb at qp 0: lossless RGB (no YUV round trip), and smaller than the PNGs (inter-frame)
    seg = segs / f"seg_{a:05d}.mkv"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(fps), "-start_number", str(a), "-i", str(out / "f%05d.png"),
                    "-frames:v", str(b - a), "-c:v", "libx264rgb", "-preset", "fast", "-qp", "0", str(seg)], check=True)
    print(f"slice: frames {a}-{b - 1} in {time.time() - t0:.0f} s -> {seg.name} ({seg.stat().st_size / 1e6:.0f} MB)")


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
        slice_(int(args[0]), int(args[1]))
    elif cmd == "join":
        join(int(args[0]))
    elif cmd == "result":
        result(args[0], args[1])
    else:
        sys.exit(__doc__)
