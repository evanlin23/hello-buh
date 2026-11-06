"""QA a finished Short: find stuck/dead stretches, too-dark stretches and black patches.

Samples the game area (between the black bands) 10x a second at low resolution:
  stuck  - motion (mean abs frame difference) below MOTION for over STUCK_S seconds
  dark   - mean brightness below DARK for over 0.5 s
  black  - over BLACK_FRAC of the pixels near-black (lighting holes, missing faces)
Death screens and end holds are expected to be still, so a stretch is labelled with what the
timeline says is happening when a recording is given.

  python3 scripts/qa.py out/a.mp4 [out/b.mp4 ...] [--sheets work/qa]
"""
import argparse
import json
import pathlib
import subprocess

import numpy as np

W, H = 108, 101                 # game area 1080x1011 at 1/10
BAND, GAME_H = 455, 1011
MOTION, STUCK_S = 1.2, 1.5
DARK, BLACK_FRAC = 28, 0.22


def frames(path, fps=10):
    cmd = ["ffmpeg", "-v", "error", "-i", str(path), "-vf",
           f"fps={fps},crop=1080:{GAME_H}:0:{BAND},scale={W}:{H},format=gray", "-f", "rawvideo", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W).astype(np.float32)


def runs(mask, min_len):
    out, start = [], None
    for i, m in enumerate(list(mask) + [False]):
        if m and start is None:
            start = i
        if not m and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    return out


def qa(path, fps=10):
    f = frames(path, fps)
    # ignore the HUD strip at the bottom (it barely changes) when measuring motion
    g = f[:, : int(H * 0.86)]
    motion = np.concatenate([[99.0], np.abs(np.diff(g, axis=0)).mean(axis=(1, 2))])
    bright = f.mean(axis=(1, 2))
    black = (f < 10).mean(axis=(1, 2))
    issues = []
    for a, b in runs(motion < MOTION, int(STUCK_S * fps)):
        issues.append(("stuck", a / fps, b / fps))
    for a, b in runs(bright < DARK, int(0.5 * fps)):
        issues.append(("dark", a / fps, b / fps))
    for a, b in runs(black > BLACK_FRAC, 2):
        issues.append(("black", a / fps, b / fps))
    return {"file": str(path), "seconds": round(len(f) / fps, 2), "issues": issues,
            "mean_brightness": round(float(bright.mean()), 1)}


def sheet(path, t0, t1, out, dur):
    n = 6
    t1 = min(t1, dur - 0.15); t0 = min(t0, t1)
    ts = [t0 + (t1 - t0) * k / (n - 1) for k in range(n)]
    parts = []
    for k, t in enumerate(ts):
        p = out.parent / f"{out.stem}_{k}.png"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(path), "-frames:v", "1",
                        "-vf", f"crop=1080:{GAME_H}:0:{BAND},scale=240:-1", str(p)], check=True)
        parts.append(p)
    subprocess.run(["ffmpeg", "-v", "error", "-y", *sum([["-i", str(p)] for p in parts], []),
                    "-filter_complex", f"hstack={n}", str(out)], check=True)
    for p in parts:
        p.unlink()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("videos", nargs="+")
    ap.add_argument("--sheets", help="directory for a contact strip of each flagged stretch")
    args = ap.parse_args()
    report = []
    for v in args.videos:
        r = qa(v)
        report.append(r)
        name = pathlib.Path(v).parent.name if pathlib.Path(v).stem == "short" else pathlib.Path(v).stem
        flags = "; ".join(f"{k} {a:.1f}-{b:.1f}s" for k, a, b in r["issues"]) or "ok"
        print(f"{name:20s} {r['seconds']:5.1f}s  bright {r['mean_brightness']:5.1f}  {flags}")
        if args.sheets:
            d = pathlib.Path(args.sheets); d.mkdir(parents=True, exist_ok=True)
            for i, (k, a, b) in enumerate(r["issues"]):
                sheet(v, a, max(a + 0.1, b - 0.05), d / f"{name}_{i}_{k}.png", r["seconds"])
    if args.sheets:
        (pathlib.Path(args.sheets) / "report.json").write_text(json.dumps(report, indent=1))
