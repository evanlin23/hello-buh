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

SKIP = {"sound", "particles", "hotbar", "start", "end", "face_on", "face_off", "line", "cut"}


def edit_config(name, stunt_file=None):
    """The stunt's edit block, with EDIT_EXTRA merged over it (the same override as edit_args.js). stunt_file: a
    module elsewhere, e.g. a videos-branch package's source/<name>.js: whatever it requires that doesn't resolve
    next to it ('../lib/story') resolves from stunts/ here."""
    f = pathlib.Path(stunt_file).resolve() if stunt_file else HERE / "stunts" / f"{name}.js"
    js = r"""
const Module = require('module'), path = require('path')
const repo = process.argv[1], file = process.argv[2]
const orig = Module._resolveFilename
const alt = path.join(repo, 'stunts', '_edit_config.js'), fake = new Module(alt)
fake.filename = alt; fake.paths = Module._nodeModulePaths(path.dirname(alt))
Module._resolveFilename = function (req, parent, ...r) { try { return orig.call(this, req, parent, ...r) } catch (e) { return orig.call(this, req, fake, ...r) } }
process.chdir(repo)
const m = require(file)
process.stdout.write(JSON.stringify({ ...(m.edit || {}), ...JSON.parse(process.env.EDIT_EXTRA || '{}') }))
"""
    out = subprocess.run(["node", "-e", js, str(HERE), str(f)], capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(f"could not load the edit block of {f}: {(out.stderr.strip().splitlines() or [out.returncode])[-1]}")
    return json.loads(out.stdout or "{}")


def load_rec(path):
    """A recording: work/<name>.rec.json, or a videos-branch package's recording.json.gz."""
    import gzip
    path = pathlib.Path(path)
    return json.loads(gzip.decompress(path.read_bytes())) if path.suffix == ".gz" else json.loads(path.read_text())


def trim_start(ed, first):
    """Where the Short starts in the (output-time) recording, as edit.py trims it. first: event -> first time (s)."""
    start = float(ed.get("start", 0) or 0)
    if ed.get("startAt"):
        ev, off = ed["startAt"].rsplit(":", 1)
        if ev in first:
            start = max(0.0, first[ev] + float(off))
    elif ed.get("start") is None and "start" in first:
        # the same origin as edit.py: edit_args.js passes --start_at start:0 when a stunt sets none
        # (every mark and the tail were off by the pre-roll: worker 2, speed_build)
        start = first["start"]
    return start


def payoff_report(ed, first, start, dur, payoff=None, text_payoff=False):
    """The ending: (report lines, tail seconds or None, ok). The video ends <= 1.0 s after the payoff mark
    (payoff: default the edit's endAfter event); a text payoff (a death message, a card) gets up to 1.8 s.
    first: event -> first output time (s); start: the trim; dur: the Short's length without a hook preview."""
    pay = payoff or (ed.get("endAfter", "").rsplit(":", 1)[0] if ed.get("endAfter") else None)
    if not (pay and pay in first):
        return ["payoff: no mark given (--payoff EVENT); judge the tail from the frames"], None, True
    lim = (1.8 if text_payoff else 1.0) + 0.02   # (+ a frame of rounding: 'boom7:1.0' ends 1.0000001 s after)
    out = []
    pt = first[pay] - start
    tail = dur - pt
    verdict = "OK" if tail <= lim else "LONG: end sooner after the payoff"
    rp = ed.get("replay")
    ok = tail <= lim
    if rp:   # an instant replay after the payoff: the replay's own payoff is the end that counts
        rlen = (float(rp.get("before", 1.5)) + float(rp.get("after", 0.5))) / float(rp.get("speed", 0.5))
        rtail = float(rp.get("after", 0.5)) / float(rp.get("speed", 0.5))
        out.append(f"payoff '{pay}' at {pt:.2f}s, then a {rlen:.2f}s replay from {dur - rlen:.2f}s (its payoff at {dur - rtail:.2f}s)")
        tail, verdict = rtail, ("OK" if rtail <= lim else "LONG: shorten the replay's `after`")
        pre = dur - rlen - pt
        out.append(f"  before the replay: {pre:.2f}s after the payoff -> {'OK' if pre <= lim else 'LONG: end sooner after the payoff'}")
        ok = rtail <= lim and pre <= lim
    out.append(f"payoff '{pay}' at {pt:.2f}s; the video ends {tail:.2f}s after {'the replay payoff' if rp else 'it'} -> {verdict}"
               + (" (text payoff: up to 1.8 s)" if text_payoff else ""))
    return out, tail, ok


def camera_turns(poses, cuts):
    """[(tick, degrees, out_and_back)] for big look swings in the recording (pose: [tick, x, y, z, yaw, pitch, ...])."""
    import math
    if len(poses) < 3:
        return []
    # pose i is recording time i / 20 (as render.js uses it); p[0] is the bot's own tick counter,
    # which needn't start at 0 (guess_sound: turns listed ~0.9 s early, worker 13)
    ticks = list(range(len(poses)))
    yaw = [math.degrees(p[4]) for p in poses]
    for i in range(1, len(yaw)):   # unwrap
        while yaw[i] - yaw[i - 1] > 180: yaw[i] -= 360
        while yaw[i] - yaw[i - 1] < -180: yaw[i] += 360
    near_cut = lambda t: any(abs(t - c) <= 3 for c in cuts)
    out, last = [], -99
    for i in range(len(yaw)):
        if ticks[i] - last < 30 or near_cut(ticks[i]):
            continue
        j1 = next((j for j in range(i, len(yaw)) if ticks[j] - ticks[i] > 20), len(yaw) - 1)
        seg = yaw[i:j1 + 1]
        k = max(range(len(seg)), key=lambda k: abs(seg[k] - yaw[i]))
        d = seg[k] - yaw[i]
        if any(near_cut(ticks[i + m]) for m in range(len(seg))):
            continue
        if abs(d) >= 70:
            out.append((ticks[i], d, False)); last = ticks[i]; continue
        j2 = next((j for j in range(i, len(yaw)) if ticks[j] - ticks[i] > 30), len(yaw) - 1)
        seg2 = yaw[i:j2 + 1]
        k2 = max(range(len(seg2)), key=lambda k: abs(seg2[k] - yaw[i]))
        if abs(seg2[k2] - yaw[i]) >= 40 and abs(seg2[-1] - yaw[i]) < 15:
            out.append((ticks[i], seg2[k2] - yaw[i], True)); last = ticks[i]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--payoff", help="timeline event that is the payoff (default: the edit's endAfter event)")
    ap.add_argument("--video")
    ap.add_argument("--stunt-file", help="the stunt module (default stunts/<name>.js; e.g. a package's source/<name>.js)")
    ap.add_argument("--rec", help="recording (default work/<name>.rec.json; .gz works, e.g. a videos-branch package)")
    a = ap.parse_args()
    video = pathlib.Path(a.video or HERE / "out" / f"{a.name}.mp4")
    ed = edit_config(a.name, a.stunt_file)
    rec_p = HERE / "work" / f"{a.name}.rec.json"
    if a.rec:
        rec_p = pathlib.Path(a.rec)
    rec = load_rec(rec_p) if rec_p.exists() else {}
    tl = rec.get("timeline", [])
    # camera turns: the look swinging 40+ degrees and back within 1.5 s, or 70+ degrees one way within
    # 1 s, outside a cut. The pixel-art Shorts all had a scripted mid-build glance to the left that
    # every review passed as planned; the owner read it as an inexplicable turn. Each one is listed
    # with its video time, and the reviewer has to name what on screen motivates it.
    turns = camera_turns(rec.get("poses", []), [e["t"] / 50 for e in tl if e["event"] in ("cut", "respawn", "teleported")])
    tl = tl + [{"t": t * 50, "event": f"TURN {d:+.0f}deg{' and back' if back else ''}"} for t, d, back in turns]
    tl.sort(key=lambda e: e["t"])
    if tl:   # time-lapse spans, cuts and slow-mo: marks in output time, as edit.py places them
        from timewarp import edit_timeline
        tl = edit_timeline(ed, tl)
    first = {}
    for e in tl:
        first.setdefault(e["event"], e["t"] / 1000)
    start = trim_start(ed, first)
    fps, dur = probe(video)
    from retention import hook_len
    if hook_len(ed):   # the hook preview plays first: every mark is that much later in the video
        start -= hook_len(ed)
        print(f"hook preview: the first {hook_len(ed):.2f}s are the finale flash (marks shifted)")

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
    tn = [(vt, ev) for vt, ev in marks if ev.startswith("TURN")]
    print("\ncamera turns (each needs an on-screen reason; an unmotivated turn reads as weird):")
    print("\n".join(f"  {vt:6.2f}s  {ev}" for vt, ev in tn) if tn else "  none")

    print()
    print("\n".join(payoff_report(ed, first, start, dur, a.payoff)[0]))

if __name__ == "__main__":
    main()
