"""Render the instant-replay frames for a stunt's `edit.replay` (a second, third-person pass).

  edit.replay = {at: 'splash5', before: 1.6, after: 0.5, cam: 'back:6', speed: 0.5, label: 'REPLAY'}
    at/before/after  the window around the payoff mark (recording seconds)
    cam              render.js CAM: 'back[:dist]', 'front[:dist]' (vanilla F5 views that follow the
                     player, worker 11) or 'dx,dy,dz,yawDeg,pitchDeg' (a fixed camera from the set origin)
    speed            playback speed of the replay (0.5 = slow motion). It is rendered at 60/speed
                     fps, so slow motion gets real in-between frames, not blends.
    skin             optional SKIN= for render.js

  python3 scripts/render_replay.py <name>      -> work/<name>.replay/ (frames) + replay.json, and
                                                  work/<name>.slowmo/ (real slow-mo frames for edit.slowmo)
run.sh calls this after the main render when the stunt has `edit.replay`; edit.py then appends the
replay after the payoff (scripts/retention.py replay_append).
"""
import json
import os
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent


def window(spec, timeline):
    ts = [e["t"] / 1000 for e in timeline if e["event"] == spec["at"]]
    if not ts:
        return None
    t = ts[int(spec.get("nth", 0))]
    return t - float(spec.get("before", 1.5)), t + float(spec.get("after", 0.5)), t


def slowmo_pass(name, edit, rec_path, rec):
    """Real in-between frames for the slow-motion spans (edit.slowmo, edit.freeze): the first-person
    view rendered at 60/factor fps for just those source times -> work/<name>.slowmo/f%05d.png."""
    sys.path.insert(0, str(HERE / "scripts"))
    from timewarp import Warp, edit_spans
    warp = Warp(edit_spans(edit.get("speed"), edit.get("slowmo")), rec["timeline"])
    slow = [f for a, b, f in warp.spans if f < 1]
    if not slow:
        return
    fps = int(round(60 / min(slow)))
    need, k = set(), 0
    n = int((len(rec["poses"]) - 1) / 20 * 60)
    while True:
        t = warp.src(k / 60)
        if t * 60 >= n:
            break
        if warp.factor_at(k / 60) < 1:
            need.add(int(round(t * fps)))
        k += 1
    out = HERE / "work" / f"{name}.slowmo"
    subprocess.run(["rm", "-rf", str(out)], check=True)
    env = {k_: v for k_, v in os.environ.items() if k_ not in ("CAM", "SHOW_PLAYER")}
    env["FRAMES"] = ",".join(map(str, sorted(need)))
    print(f"slow-mo: {len(need)} frames at {fps} fps")
    subprocess.run(["node", "render.js", str(rec_path), str(out), str(fps), "1080", "1011"], cwd=HERE, env=env, check=True)
    (out / "slowmo.json").write_text(json.dumps({"fps": fps}))


def main(name, stunt=None):
    stunt = stunt or name
    edit = json.loads(subprocess.run(["node", "-e", f"console.log(JSON.stringify(require('./stunts/{stunt}').edit||{{}}))"],
                                     cwd=HERE, capture_output=True, text=True, check=True).stdout)
    edit.update(json.loads(os.environ.get("EDIT_EXTRA") or "{}"))
    rec_path = HERE / "work" / f"{name}.rec.json"
    rec = json.loads(rec_path.read_text())
    slowmo_pass(name, edit, rec_path, rec)
    spec = edit.get("replay")
    if not spec:
        return
    w = window(spec, rec["timeline"])
    if not w:
        print(f"replay: no '{spec['at']}' mark"); return
    a, b, t = w
    fps = round(60 / float(spec.get("speed", 0.5)))
    frames = list(range(max(0, int(a * fps)), int(b * fps) + 1))
    out = HERE / "work" / f"{name}.replay"
    subprocess.run(["rm", "-rf", str(out)], check=True)
    env = {**os.environ, "CAM": str(spec.get("cam", "back:6")), "FRAMES": ",".join(map(str, frames))}
    if spec.get("skin"):
        env["SKIN"] = spec["skin"]
    print(f"replay: {len(frames)} frames at {fps} fps, {a:.2f}-{b:.2f}s, CAM={env['CAM']}")
    subprocess.run(["node", "render.js", str(rec_path), str(out), str(fps), "1080", "1011"], cwd=HERE, env=env, check=True)
    (out / "replay.json").write_text(json.dumps({"spec": spec, "src": [a, b], "payoff": t, "fps": fps, "first": frames[0]}))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
