"""Long-form (16:9) HelloBuh episodes, built from the bot recordings the Shorts already have (docs/longform.md).

    python3 scripts/longform.py render episodes/<ep> [--only SEG,SEG]   # each segment -> work/lf/<seg>.mp4
    python3 scripts/longform.py plan episodes/<ep>                       # each segment's marks, in segment time
    ~/.hb-tts/bin/python scripts/voice.py episodes/<ep>                  # the narration (episodes/<ep>/story.json)
    python3 scripts/longform.py build episodes/<ep>                      # -> out/<name>.mp4 + .json (chapters,
                                                                         #    description, thumbnail)

A segment is one recording from the `videos` branch (shorts/<seg>/recording.json.gz) re-rendered at 1920x1080
with the edit that Short was published with (metadata.json `edit.args`): its cuts, slow-mo, subtitles, cards,
counters, death screens and replay, laid out at 16:9 by scripts/landscape_edit.py. No server and no bot: the
recording is the whole world, so re-rendering a Short at another size or length costs only render time.
The renderer only draws the frames the edit keeps (like scripts/render_needed.py), plus real in-between
frames for slow-mo and the third-person replay pass (like scripts/render_replay.py), at the episode's fps.
"""
from __future__ import annotations

import argparse
import gzip
import json
import math
import os
import pathlib
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE / "scripts"))
from timewarp import Warp, edit_spans  # noqa: E402

LF = HERE / "work" / "lf"
W, H = 1920, 1080


def run(cmd, **kw):
    print("+", " ".join(str(c) for c in cmd)[:240], flush=True)
    return subprocess.run([str(c) for c in cmd], check=True, **kw)


def load_episode(ep_dir):
    ep_dir = pathlib.Path(ep_dir)
    return ep_dir, json.loads((ep_dir / "episode.json").read_text())


# ------------------------------------------------------------------ segment sources
def fetch_segment(seg, cfg=None):
    """work/lf/<seg>.rec.json and .meta.json, from the videos branch (git show reads just those blobs).
    A `local` segment (a movie scene recorded here with scripts/record.sh) uses work/<seg>.rec.json and the
    edit its stunt module asks for (scripts/edit_args.js), so it needs no package on the videos branch."""
    LF.mkdir(parents=True, exist_ok=True)
    if cfg and cfg.get("local"):
        rec = HERE / "work" / f"{cfg.get('rec', seg)}.rec.json"
        stunt = json.loads(rec.read_text()).get("stunt") or seg
        args = subprocess.run(["node", "scripts/edit_args.js", stunt], cwd=HERE, capture_output=True, text=True, check=True).stdout.split("\n")
        return rec, {"edit": {"args": [a for a in args if a != ""]}}
    rec, meta = LF / f"{seg}.rec.json", LF / f"{seg}.meta.json"
    if not meta.exists():
        meta.write_bytes(subprocess.run(["git", "show", f"origin/videos:shorts/{seg}/metadata.json"], cwd=HERE,
                                        capture_output=True, check=True).stdout)
    if not rec.exists():
        gz = subprocess.run(["git", "show", f"origin/videos:shorts/{seg}/recording.json.gz"], cwd=HERE,
                            capture_output=True, check=True).stdout
        rec.write_bytes(gzip.decompress(gz))
    return rec, json.loads(meta.read_text())


def seg_args(meta, cfg):
    """The published edit.py arguments, with the episode's overrides (start_at, end_after, no replay...)."""
    args = list(meta["edit"]["args"])
    over = {"--start_at": cfg.get("start_at"), "--end_after": cfg.get("end_after")}
    if cfg.get("replay") is False:
        over["--replay"] = False
    for flag, val in over.items():
        if val is None:
            continue
        if flag in args:
            i = args.index(flag)
            del args[i:i + 2]
        if val is not False:
            args += [flag, str(val)]
    if cfg.get("sfx_extra"):   # more sound effects on top of the published ones (e.g. wind on falls: vanilla falls are silent)
        old = json.loads(opt(args, "--sfx")) if opt(args, "--sfx") else []
        if "--sfx" in args:
            i = args.index("--sfx")
            del args[i:i + 2]
        args += ["--sfx", json.dumps(old + cfg["sfx_extra"])]
    for flag, val in (cfg.get("extra") or {}).items():   # e.g. {"--subs_y": "0.3"}
        if flag in args:
            i = args.index(flag)
            del args[i:i + 2]
        args += [flag, val if isinstance(val, str) else json.dumps(val)]
    return args


def opt(args, flag):
    return args[args.index(flag) + 1] if flag in args else None


def seg_clock(rec, args, fps):
    """(warp, start, end, marks) for a segment: the same time map edit.py builds (speed + slow-mo + freeze
    spans), its frame-aligned start, the end (--end_after) and every mark in segment time."""
    tl = rec["timeline"]
    warp = Warp(edit_spans(opt(args, "--speed"), opt(args, "--slowmo"), opt(args, "--freeze")), tl)
    wtl = warp.timeline(tl) if warp else tl
    ev = {}
    for e in wtl:
        ev.setdefault(e["event"], e["t"] / 1000)
    n = int((len(rec["poses"]) - 1) / 20 * fps)
    start, end = 0.0, warp.out(n / fps)
    if opt(args, "--start") is not None:
        start = float(opt(args, "--start"))
    if opt(args, "--start_at"):
        k, off = opt(args, "--start_at").rsplit(":", 1)
        if k in ev:
            start = max(0.0, ev[k] + float(off))
    start = math.floor(start * fps + 1e-6) / fps
    if opt(args, "--end_after"):
        k, secs = opt(args, "--end_after").rsplit(":", 1)
        if k in ev:
            end = min(end, ev[k] + float(secs))
    marks = [(e["t"] / 1000 - start, e["event"]) for e in wtl]
    return warp, start, end, marks, n


# ------------------------------------------------------------------ render
def render_frames(rec_path, out_dir, fps, frames, env_extra=None, tag=""):
    """render.js for just `frames` (numbered at `fps`), kept across runs: a finished pass writes done.json."""
    out_dir = pathlib.Path(out_dir)
    done = out_dir / "done.json"
    if done.exists() and json.loads(done.read_text()) == {"fps": fps, "frames": frames, "size": [W, H]}:
        print(f"{tag}: {len(frames)} frames already rendered")
        return
    shutil.rmtree(out_dir, ignore_errors=True)
    env = {k: v for k, v in os.environ.items() if k not in ("CAM", "SHOW_PLAYER", "FRAMES")}
    env.update(env_extra or {})
    env["FRAMES"] = ",".join(map(str, frames))
    print(f"{tag}: rendering {len(frames)} frames at {fps} fps, {W}x{H}", flush=True)
    run(["node", "render.js", rec_path, out_dir, fps, W, H], cwd=HERE, env=env)
    done.write_text(json.dumps({"fps": fps, "frames": frames, "size": [W, H]}))


def render_segment(seg, cfg, fps):
    rec_path, meta = fetch_segment(seg, cfg)
    rec = json.loads(rec_path.read_text())
    args = seg_args(meta, cfg)
    warp, start, end, _, n = seg_clock(rec, args, fps)
    # 1. the first-person frames the edit keeps (+0.5 s margin), every other frame name a hardlink filler
    need, k = set(), 0
    while True:
        i = warp.frame(k, fps)
        if i >= n:
            break
        if start - 0.5 <= k / fps <= end + 0.5:
            need.add(i)
        k += 1
    need = sorted(need)
    fdir = LF / f"{seg}.frames"
    render_frames(rec_path, fdir, fps, need, tag=seg)
    have, needset = need[0], set(need)
    for f in range(n):
        q = fdir / f"f{f:05d}.png"
        if f in needset:
            have = f
        elif not q.exists():
            os.link(fdir / f"f{have:05d}.png", q)
    # 2. real in-between frames for the slow-mo spans (edit.py reads <frames>.slowmo/ + slowmo.json)
    slow = [f for a, b, f in warp.spans if f < 1]
    sdir = LF / f"{seg}.slowmo"
    if slow:
        sfps = int(round(fps / min(slow)))
        sneed, k = set(), 0
        while True:
            t = warp.src(k / fps)
            if t * fps >= n:
                break
            if warp.factor_at(k / fps) < 1:
                sneed.add(int(round(t * sfps)))
            k += 1
        render_frames(rec_path, sdir, sfps, sorted(sneed), tag=f"{seg} slow-mo")
        (sdir / "slowmo.json").write_text(json.dumps({"fps": sfps}))
    else:
        shutil.rmtree(sdir, ignore_errors=True)
    # 3. the third-person instant replay (edit.py appends <frames>.replay/ after the payoff)
    rdir = LF / f"{seg}.replay"
    spec = json.loads(opt(args, "--replay")) if opt(args, "--replay") else None
    if spec:
        ts = [e["t"] / 1000 for e in rec["timeline"] if e["event"] == spec["at"]]
        if ts:
            t = ts[int(spec.get("nth", 0))]
            a, b = t - float(spec.get("before", 1.5)), t + float(spec.get("after", 0.5))
            rfps = round(fps / float(spec.get("speed", 0.5)))
            frames = list(range(max(0, int(a * rfps)), int(b * rfps) + 1))
            env = {"CAM": str(spec.get("cam", "back:6"))}
            if spec.get("skin"):
                env["SKIN"] = spec["skin"]
            render_frames(rec_path, rdir, rfps, frames, env_extra=env, tag=f"{seg} replay")
            (rdir / "replay.json").write_text(json.dumps({"spec": spec, "src": [a, b], "payoff": t, "fps": rfps, "first": frames[0]}))
    else:
        shutil.rmtree(rdir, ignore_errors=True)
    # 4. game audio rebuilt from the recording, then the 16:9 edit
    # (`mute_sounds`: vanilla sound events audio.py must not play here. Recordings older than the harness's sound log
    # get audio.py's water-clutch rebuild, which put a bucket and a splash on boat_clutch's last boat landing)
    wav, wkey = LF / f"{seg}.wav", LF / f"{seg}.wav.key"
    mute = sorted(cfg.get("mute_sounds") or [])
    if not (wav.exists() and wkey.exists() and wkey.read_text() == json.dumps(mute)):
        code = ("import sys, json, audio\n"
                "mute, play = set(json.loads(sys.argv[1])), audio.Mixer.play\n"
                "audio.Mixer.play = lambda self, ev, *a, **k: None if ev in mute else play(self, ev, *a, **k)\n"
                "audio.main(sys.argv[2], sys.argv[3])")
        run(["python3", "-c", code, json.dumps(mute), rec_path, wav], cwd=HERE)
        wkey.write_text(json.dumps(mute))
    out = LF / f"{seg}.mp4"
    run(["python3", "scripts/landscape_edit.py", "--frames", fdir / "f%05d.png", "--fps", fps, "--out_fps", fps,
         "--timeline", rec_path, "--audio", wav, *args, "--out", out], cwd=HERE)
    return out


def cmd_render(ep_dir, only=None):
    ep_dir, ep = load_episode(ep_dir)
    for seg, cfg in ep["segments"].items():
        if only and seg not in only:
            continue
        render_segment(seg, cfg, ep.get("fps", 30))


def cmd_plan(ep_dir):
    ep_dir, ep = load_episode(ep_dir)
    fps = ep.get("fps", 30)
    for seg, cfg in ep["segments"].items():
        rec_path, meta = fetch_segment(seg, cfg)
        rec = json.loads(rec_path.read_text())
        args = seg_args(meta, cfg)
        warp, start, end, marks, _ = seg_clock(rec, args, fps)
        skip = {"swing", "place", "tick", "look", "pose", "sound", "block"}
        print(f"\n== {seg}: {end - start:.2f}s (+replay)" if opt(args, "--replay") else f"\n== {seg}: {end - start:.2f}s")
        seen = {}
        for t, e in marks:
            if e in skip or t < -0.01 or t > end - start + 0.01:
                continue
            seen[e] = seen.get(e, -1) + 1
            print(f"  {t:7.2f}  {e}#{seen[e]}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["render", "plan", "build"])
    ap.add_argument("episode")
    ap.add_argument("--only")
    a = ap.parse_args()
    if a.cmd == "render":
        cmd_render(a.episode, set(a.only.split(",")) if a.only else None)
    elif a.cmd == "plan":
        cmd_plan(a.episode)
    else:
        import longform_build
        longform_build.build(*load_episode(a.episode))
