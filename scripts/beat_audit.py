"""Beat audit: the numbers behind the retention audit (.claude/skills/retention-audit).

For a finished Short it prints:
  - every stunt mark (hired, drop, splash, complete, ...) at its time in the VIDEO, so the hook,
    the beats and the payoff can be named by timestamp;
  - the gaps between marks (a gap over ~3 s with no new beat is a buildup that sags);
  - motion per 0.25 s of the game view, and every still stretch: STILL (>= 1.0 s frozen),
    PAUSE (0.5-1.0 s frozen: a hitch the viewer feels) and LOW (>= 1.0 s of only small change:
    idle sway, a held reveal; the shot moves but nothing happens);
  - the tail: seconds from the payoff mark (--payoff, default the edit's endAfter event) to the
    last frame. The owner's rule: end as soon as the payoff lands (<= 1.0 s).

  python3 scripts/beat_audit.py <name> [--payoff EVENT] [--video out/<name>.mp4]
"""
import argparse
import json
import pathlib
import subprocess
import sys

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE / "scripts"))
from qa_frames import gray_frames, probe, runs  # noqa: E402

SKIP = {"sound", "particles", "hotbar", "start", "end", "face_on", "face_off", "line"}


def edit_config(name):
    js = f"const s=require('./stunts/{name}.js');console.log(JSON.stringify(s.edit||{{}}))"
    out = subprocess.run(["node", "-e", js], cwd=HERE, capture_output=True, text=True)
    return json.loads(out.stdout or "{}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--payoff", help="timeline event that is the payoff (default: the edit's endAfter event)")
    ap.add_argument("--video")
    a = ap.parse_args()
    video = pathlib.Path(a.video or HERE / "out" / f"{a.name}.mp4")
    ed = edit_config(a.name)
    rec_p = HERE / "work" / f"{a.name}.rec.json"
    tl = json.loads(rec_p.read_text())["timeline"] if rec_p.exists() else []
    first = {}
    for e in tl:
        first.setdefault(e["event"], e["t"] / 1000)
    start = float(ed.get("start", 0) or 0)
    if ed.get("startAt"):
        ev, off = ed["startAt"].rsplit(":", 1)
        if ev in first:
            start = max(0.0, first[ev] + float(off))
    fps, dur = probe(video)
    if ed.get("speed"):
        print("note: this Short is time-warped (speed); mark times below are approximate")

    print(f"{a.name}: {dur:.2f}s video, recording trimmed from {start:.2f}s")
    marks = []
    seen = set()
    for e in tl:
        if e["event"] in SKIP:
            continue
        vt = e["t"] / 1000 - start
        if -0.05 <= vt <= dur + 0.05:
            key = (e["event"], round(vt, 1))
            if key not in seen:
                seen.add(key)
                marks.append((vt, e["event"]))
    print("\nmarks (video time):")
    prev = 0.0
    for vt, ev in marks:
        gap = vt - prev
        print(f"  {vt:6.2f}s  {ev:<18} {'  <- ' + f'{gap:.1f}s since the last beat' if gap > 3 else ''}")
        prev = vt
    if dur - prev > 3:
        print(f"  {dur:6.2f}s  (end)               <- {dur - prev:.1f}s since the last beat")

    g = gray_frames(video)
    diff = np.concatenate([[99], np.abs(np.diff(g, axis=0)).mean(axis=(1, 2))])
    q = max(1, int(fps / 4))
    print("\nmotion per 0.25 s (mean abs change per frame, game view):")
    row = []
    for i in range(0, len(diff), q):
        m = float(np.median(diff[i:i + q]))
        row.append(f"{i / fps:5.2f}:{m:4.1f}")
        if len(row) == 8:
            print("  " + "  ".join(row)); row = []
    if row:
        print("  " + "  ".join(row))

    print("\nstill stretches:")
    found = False
    frozen = runs(diff < 0.6, int(0.5 * fps))
    for kind, thr, secs in (("STILL", 0.6, 1.0), ("PAUSE", 0.6, 0.5), ("LOW", 1.5, 1.0)):
        for s_, e_ in runs(diff < thr, int(secs * fps)):
            if kind == "PAUSE" and (e_ - s_) >= fps:
                continue
            if kind == "LOW" and any(s2 <= s_ and e_ <= e2 for s2, e2 in frozen):
                continue
            found = True
            print(f"  {kind:<5} {s_ / fps:5.2f}s - {e_ / fps:5.2f}s ({(e_ - s_) / fps:.1f}s)")
    if not found:
        print("  none")

    pay = a.payoff or (ed.get("endAfter", "").rsplit(":", 1)[0] if ed.get("endAfter") else None)
    print()
    if pay and pay in first:
        pt = first[pay] - start
        tail = dur - pt
        verdict = "OK" if tail <= 1.0 else "LONG: end sooner after the payoff"
        print(f"payoff '{pay}' at {pt:.2f}s; the video ends {tail:.2f}s after it -> {verdict}")
    else:
        print("payoff: no mark given (--payoff EVENT); judge the tail from the frames")


if __name__ == "__main__":
    main()
