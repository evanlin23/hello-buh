"""Render the instant-replay frames for a stunt's `edit.replay` (a second, third-person pass).

  edit.replay = {at: 'splash5', before: 1.6, after: 0.5, cam: 'back:6', speed: 0.5, label: 'REPLAY'}
    at/before/after  the window around the payoff mark (recording seconds)
    cam              render.js CAM: 'back[:dist]', 'front[:dist]' (vanilla F5 views that follow the
                     player, worker 11) or 'dx,dy,dz,yawDeg,pitchDeg' (a fixed camera from the set origin)
    speed            playback speed of the replay (0.5 = slow motion). It is rendered at 60/speed
                     fps, so slow motion gets real in-between frames, not blends.
    skin             optional SKIN= for render.js

  python3 scripts/render_replay.py <name>      -> work/<name>.replay/ (frames) + replay.json
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


def main(name, stunt=None):
    stunt = stunt or name
    edit = json.loads(subprocess.run(["node", "-e", f"console.log(JSON.stringify(require('./stunts/{stunt}').edit||{{}}))"],
                                     cwd=HERE, capture_output=True, text=True, check=True).stdout)
    edit.update(json.loads(os.environ.get("EDIT_EXTRA") or "{}"))
    spec = edit.get("replay")
    if not spec:
        print("no edit.replay"); return
    rec_path = HERE / "work" / f"{name}.rec.json"
    rec = json.loads(rec_path.read_text())
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
