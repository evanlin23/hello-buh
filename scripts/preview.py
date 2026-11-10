"""Fast staging preview of an edited Short: low resolution, low frame rate, the real edit.

  python3 scripts/preview.py <stunt> [rec.json]        (scripts/preview.sh is the same)
    -> work/preview_<name>/preview.mp4     360x640 at PREVIEW_FPS, captions/cards/HUD/speed/cuts/hook/replay
                                           applied by edit.py itself, so every time matches the final
       work/preview_<name>/sheets/*.jpg    the frames that matter, labelled with output time + nearest mark:
                                           3 frames either side of every cut, every subs/cards/story-line
                                           mark, the hook, the payoff and the last second
       work/preview_<name>/frames.txt      what each sheet frame is

How: the Short's frame list is worked out the way edit.py builds it (timewarp spans, start/end trims, hook,
replay), and render.js renders only the source frames that the preview frames and the sheet frames show, at
preview size (FRAMES=..., default 360x337). Every other frame number is hardlinked to the nearest rendered
one before it, so edit.py sees a normal 60 fps frame folder and runs unchanged (--fps 60 --out_fps 60);
edit.py's `--preview` only makes its encodes fast. The 60 fps edit is then cut down to PREVIEW_FPS: every
frame the preview keeps, and every sheet frame, is a real render of the right source frame.

Env: PREVIEW_FPS (12; divides 60), PREVIEW_W (360 -> game view 360x337), NAME (stunt), RELIGHT_TICKS (20:
small block changes relight once a second instead of every 4 ticks), RENDER_DISTANCE, EDIT_EXTRA (as
reedit.sh), KEEP=1 (keep the frames and the 60 fps edit). Not in a preview: real slow-mo in-between frames
(edit.py blends the two neighbours, as without render_replay.py).
"""
import argparse
import json
import math
import os
import pathlib
import shutil
import subprocess
import sys
import time

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE / "scripts"))
from timewarp import Warp, edit_spans  # noqa: E402

FPS = 60
# timeline events too frequent or too dull to name a frame after
NOISE = {"sound", "vel", "aim", "hotbar", "slot", "particles", "swing", "health", "effect", "effect_end", "hurt_dir",
         "time", "weather", "block_action", "block_entity", "collect", "death_message", "line_end"}


def edit_parse(argv):
    """The edit.py arguments that decide the frame map (the rest pass through untouched)."""
    ap = argparse.ArgumentParser(add_help=False)
    for k in ("start_at", "end_after", "hook", "speed", "slowmo", "freeze", "subs", "cards", "story", "replay", "song_drop_at", "loop"):
        ap.add_argument("--" + k)
    ap.add_argument("--start", type=float, default=0.0)
    return ap.parse_known_args(argv)[0]


def run(cmd, **kw):
    print("+", " ".join(str(c) if len(str(c)) < 200 else str(c)[:80] + "..." for c in cmd), flush=True)
    return subprocess.run(cmd, cwd=HERE, check=True, **kw)


class Plan:
    """Output frame F (60 fps, of the finished Short) -> what it shows: ('hook'|'body'|'replay', source index)."""

    def __init__(self, stunt, rec, ea, edit):
        self.rec, self.ea, self.edit = rec, ea, edit
        tl = rec["timeline"]
        self.n_src = int((len(rec["poses"]) - 1) / 20 * FPS)        # render.js: floor(ticks / 20 * fps)
        self.warp = Warp(edit_spans(ea.speed, ea.slowmo, ea.freeze), tl) if (ea.speed or ea.slowmo or ea.freeze) else None
        self.tl = self.warp.timeline(tl) if self.warp else tl        # output-time timeline (edit.py's, before the trims)
        ev = {}
        for e in self.tl:
            ev.setdefault(e["event"], e["t"] / 1000)
        self.ev = ev
        # warped frame count (edit.py apply_speed: k until warp.frame(k) runs off the recording)
        if self.warp:
            k = 0
            while self.warp.frame(k, FPS) < self.n_src:
                k += 1
            self.n_warp = k
        else:
            self.n_warp = self.n_src
        start = ea.start
        if ea.start_at:
            e_, off = ea.start_at.rsplit(":", 1)
            if e_ in ev:
                start = max(0.0, ev[e_] + float(off))
        self.start = math.floor(start * FPS + 1e-6) / FPS
        self.start_idx = int(self.start * FPS + 1e-6)
        dur = self.n_warp / FPS - self.start
        if ea.end_after:
            e_, secs = ea.end_after.rsplit(":", 1)
            if e_ in ev:
                dur = min(dur, ev[e_] + float(secs) - self.start)
        self.dur = dur
        self.n_body = int(math.ceil(dur * FPS - 1e-6))
        # hook (retention.hook_prepend): n frames of the warped sequence from a, in front
        self.n_hook, self.hook_a = 0, 0
        h = json.loads(ea.hook) if ea.hook else None
        if h and h.get("at") in ev:
            tv = ev[h["at"]] - self.start
            a, b = max(0.0, tv - float(h.get("before", 1.5))), tv + float(h.get("after", 0.0))
            self.n_hook, self.hook_a, self.hook = int(round((b - a) * FPS)), self.start_idx + int(round(a * FPS)), h
        else:
            self.hook = None
        # replay (render_replay.py window, appended after the body; one replay frame per output frame)
        self.replay = None
        if ea.replay:
            import render_replay
            spec = json.loads(ea.replay)
            w = render_replay.window(spec, tl)
            if w:
                rfps = round(FPS / float(spec.get("speed", 0.5)))
                frames = list(range(max(0, int(w[0] * rfps)), int(w[1] * rfps) + 1))
                self.replay = {"spec": spec, "win": w, "fps": rfps, "frames": frames}
        self.n_replay = len(self.replay["frames"]) if self.replay else 0
        self.total = self.n_hook + self.n_body + self.n_replay

    def src_of_warped(self, K):
        """Source frames warped frame K needs (two when edit.py blends a slow-mo in-between)."""
        if not self.warp:
            return [min(K, self.n_src - 1)]
        x = self.warp.src(K / FPS) * FPS
        i = self.warp.frame(K, FPS)
        step = self.warp.src((K + 1) / FPS) * FPS - x
        frac = x - math.floor(x)
        if step < 0.99 and 0.2 < frac < 0.8 and math.floor(x) + 1 < self.n_src:
            return [math.floor(x), math.floor(x) + 1]
        return [i]

    def what(self, F):
        if F < self.n_hook:
            return "hook", self.hook_a + F
        F -= self.n_hook
        if F < self.n_body:
            return "body", self.start_idx + F
        F -= self.n_body
        if self.replay and F < self.n_replay:
            return "replay", self.replay["frames"][F]
        return None, None

    def body_F(self, t_out):
        """Finished-video frame for an output-timeline time (warped seconds), or None outside the body."""
        j = int(math.ceil((t_out - self.start) * FPS - 1e-6))
        return self.n_hook + j if 0 <= j < self.n_body else None


def marks_for(plan):
    """[(group label, [F...])] for the contact sheets."""
    ea, edit, tl, groups = plan.ea, plan.edit, plan.tl, []

    def times(name, nth=0):
        ts = [e["t"] / 1000 for e in tl if e["event"] == name]
        if not ts:
            k, _, off = str(name).rpartition(":")
            try:
                ts = [e["t"] / 1000 + float(off) for e in tl if e["event"] == k]
            except ValueError:
                ts = []
        return ts[nth:nth + 1]

    def clip(fs):
        return sorted({f for f in fs if f is not None and 0 <= f < plan.total})

    # the hook: the first frames the viewer sees
    if plan.n_hook:
        groups.append(("HOOK clip", clip([0, plan.n_hook // 3, 2 * plan.n_hook // 3, plan.n_hook - 1])))
    groups.append(("OPENING (first second)", clip([plan.n_hook + k for k in (0, 10, 20, 30, 45, 59)])))
    # cuts: edit cut spans, recorded teleport cuts, hook -> body, body -> replay
    cuts = []
    if plan.warp:
        for a, b, f in plan.warp.spans:
            if f == math.inf:
                cuts.append((plan.warp.out(a), "edit cut"))
    for e in tl:
        if e["event"] in ("cut", "respawn"):
            cuts.append((e["t"] / 1000, e["event"]))
    cutF = {}
    for t, why in sorted(cuts):
        F = plan.body_F(t)
        if F is not None and F - plan.n_hook >= 3 and not any(abs(F - g) <= 2 for g in cutF):
            cutF[F] = why
    if plan.n_hook:
        cutF[plan.n_hook] = "hook -> start"
    if plan.n_replay:
        cutF[plan.n_hook + plan.n_body] = "-> replay"
    for F, why in sorted(cutF.items()):
        groups.append((f"CUT ({why})", clip(range(F - 3, F + 3))))
    # marks: subs, cards, story lines
    ms = []
    for s in json.loads(ea.subs or "[]"):
        ms += [(t, f"sub '{s[1]}'") for t in times(s[0], int(s[3]) if len(s) > 3 and s[3] else 0)]
    for c in json.loads(ea.cards or "[]"):
        ms += [(t, f"card '{c[1]}'") for t in times(c[0], int(c[4]) if len(c) > 4 and c[4] else 0)]
    if ea.story:
        ms += [(e["t"] / 1000, f"line {e.get('id', '')}".strip()) for e in tl if e["event"] == "line"]
    for t, what in sorted(ms):
        F = plan.body_F(t)
        if F is not None:
            groups.append((f"MARK {what}", clip([F, F + 6, F + 24])))
    # the payoff: the song's drop mark, else the hook's, else the end mark
    pay = edit.get("dropAt") or (plan.hook or {}).get("at") or (ea.end_after or "").rsplit(":", 1)[0]
    if pay and times(pay):
        F = plan.body_F(times(pay)[0])
        if F is not None:
            groups.append((f"PAYOFF {pay}", clip([F - 12, F - 3, F, F + 3, F + 12, F + 30])))
    groups.append(("LAST SECOND", clip([plan.total - 60, plan.total - 48, plan.total - 36, plan.total - 24, plan.total - 12, plan.total - 1])))
    return [(g, fs) for g, fs in groups if fs]


def nearest_mark(plan, F):
    kind, K = plan.what(F)
    if kind == "replay":
        return "replay"
    t = K / FPS if kind else None
    if t is None:
        return ""
    best = None
    for e in plan.tl:
        if e["event"] in NOISE:
            continue
        d = t - e["t"] / 1000
        if best is None or abs(d) < abs(best[0]) - 1e-9:
            best = (d, e["event"] + (f" {e['id']}" if e.get("id") else ""))
    return f"{best[1]}{best[0]:+.2f}s" + (" (hook)" if kind == "hook" else "") if best else kind


def fill(out, names, rendered):
    """Hardlink every missing frame name to the nearest rendered frame before it (render_needed.py)."""
    have = None
    for f in names:
        if f in rendered:
            have = f
        elif not (out / f"f{f:05d}.png").exists():
            src = have if have is not None else min(rendered)
            os.link(out / f"f{src:05d}.png", out / f"f{f:05d}.png")


def sheets(plan, groups, video, outdir, scale_w):
    want = sorted({F for _, fs in groups for F in fs})
    tmp = outdir / "sheet_frames"
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    sel = "+".join(f"eq(n\\,{F})" for F in want)
    (tmp / "select.txt").write_text(f"select='{sel}',scale={scale_w}:-2")
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(video), "-filter_script:v", str(tmp / "select.txt"),
         "-fps_mode", "passthrough", str(tmp / "s%05d.png")])
    got = sorted(tmp.glob("s*.png"))
    img = {F: p for F, p in zip(want, got)}
    if len(got) != len(want):
        print(f"WARNING: {len(want)} sheet frames asked, {len(got)} decoded")
    try:
        font = ImageFont.truetype(str(HERE / "assets" / "fonts" / "SchibstedGrotesk-Black.ttf"), 15)
    except OSError:
        font = ImageFont.load_default()
    tw = scale_w
    th = int(round(scale_w * 1920 / 1080))
    lab = 38
    cols, rows_per = 6, 4
    shdir = outdir / "sheets"
    shutil.rmtree(shdir, ignore_errors=True)
    shdir.mkdir()
    lines = []
    for si in range(0, len(groups), rows_per):
        chunk = groups[si:si + rows_per]
        sheet = Image.new("RGB", (cols * tw, len(chunk) * (th + lab + 22)), (24, 24, 24))
        d = ImageDraw.Draw(sheet)
        for r, (g, fs) in enumerate(chunk):
            y0 = r * (th + lab + 22)
            d.text((6, y0 + 3), g, fill=(255, 220, 80), font=font)
            for c, F in enumerate(fs[:cols]):
                x0 = c * tw
                if F in img:
                    sheet.paste(Image.open(img[F]).convert("RGB"), (x0, y0 + 22))
                m = nearest_mark(plan, F)
                d.text((x0 + 4, y0 + 22 + th + 2), f"{F / FPS:6.3f}s  f{F}", fill=(255, 255, 255), font=font)
                d.text((x0 + 4, y0 + 22 + th + 19), m[:34], fill=(170, 220, 255), font=font)
                lines.append(f"sheet_{si // rows_per + 1:02d}  {F / FPS:7.3f}s  f{F:5d}  {g:40s}  {m}")
        sheet.save(shdir / f"sheet_{si // rows_per + 1:02d}.jpg", quality=88)
    (outdir / "frames.txt").write_text("\n".join(lines) + "\n")
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"sheets: {len(groups)} groups, {len(want)} frames -> {shdir}")


def main():
    stunt = sys.argv[1]
    name = os.environ.get("NAME", stunt)
    rec_path = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else HERE / "work" / f"{name}.rec.json").resolve()
    P = int(os.environ.get("PREVIEW_FPS", 12))
    if FPS % P:
        sys.exit("PREVIEW_FPS must divide 60 (10, 12, 15, 20, 30)")
    stride = FPS // P
    pw = int(os.environ.get("PREVIEW_W", 360)) // 2 * 2
    gw, gh = pw, int(round(pw * 1011 / 1080))
    outdir = HERE / "work" / f"preview_{name}"
    outdir.mkdir(parents=True, exist_ok=True)
    T0 = time.time()
    rec = json.loads(rec_path.read_text())
    eargs = subprocess.run(["node", "scripts/edit_args.js", stunt], cwd=HERE, capture_output=True, text=True, check=True).stdout.rstrip("\n").split("\n")
    edit = json.loads(subprocess.run(["node", "-e", f"console.log(JSON.stringify({{...(require('./stunts/{stunt}').edit||{{}}), ...JSON.parse(process.env.EDIT_EXTRA||'{{}}')}}))"],
                                     cwd=HERE, capture_output=True, text=True, check=True).stdout)
    plan = Plan(stunt, rec, edit_parse(eargs), edit)
    groups = marks_for(plan)
    sheetF = {F for _, fs in groups for F in fs}
    print(f"plan: {plan.total} output frames ({plan.total / FPS:.2f}s: hook {plan.n_hook}, body {plan.n_body}, replay {plan.n_replay}), "
          f"start {plan.start:.3f}s, {len(groups)} sheet groups")

    # the source frames to render: every stride-th output frame + every sheet frame
    need, need_hook_body, need_replay = set(), set(), set()
    for F in range(plan.total):
        if F % stride and F not in sheetF:
            continue
        kind, K = plan.what(F)
        if kind == "replay":
            need_replay.add(K)
        elif kind:
            need_hook_body.update(plan.src_of_warped(K))
    need = sorted(i for i in need_hook_body if 0 <= i < plan.n_src)
    frames = outdir / "frames"
    shutil.rmtree(frames, ignore_errors=True)
    env = {**os.environ, "FRAMES": ",".join(map(str, need)), "RELIGHT_TICKS": os.environ.get("RELIGHT_TICKS", "20")}
    env.pop("CAM", None)
    t = time.time()
    print(f"render: {len(need)} of {plan.n_src} source frames at {gw}x{gh}")
    run(["node", "render.js", str(rec_path), str(frames), str(FPS), str(gw), str(gh)], env=env)
    t_render = time.time() - t
    fill(frames, range(plan.n_src), set(need))
    t_replay = 0.0
    if plan.replay and need_replay:
        r = plan.replay
        rdir = outdir / "frames.replay"     # edit.py looks for <frames dir>.replay
        shutil.rmtree(rdir, ignore_errors=True)
        renv = {**env, "CAM": str(r["spec"].get("cam", "back:6")), "FRAMES": ",".join(map(str, sorted(need_replay)))}
        if r["spec"].get("skin"):
            renv["SKIN"] = r["spec"]["skin"]
        t = time.time()
        run(["node", "render.js", str(rec_path), str(rdir), str(r["fps"]), str(gw), str(gh)], env=renv)
        t_replay = time.time() - t
        fill(rdir, r["frames"], need_replay)
        a, b, tp = r["win"]
        (rdir / "replay.json").write_text(json.dumps({"spec": r["spec"], "src": [a, b], "payoff": tp, "fps": r["fps"], "first": r["frames"][0]}))

    audio = HERE / "work" / f"{name}.wav"
    if not audio.exists() or audio.stat().st_mtime < rec_path.stat().st_mtime:
        audio = outdir / "game.wav"
        if not audio.exists() or audio.stat().st_mtime < rec_path.stat().st_mtime:
            run(["python3", "audio.py", str(rec_path), str(audio)])
    edit60 = outdir / "edit60.mp4"
    t = time.time()
    run(["python3", "edit.py", "--frames", str(frames / "f%05d.png"), "--fps", str(FPS), "--out_fps", str(FPS),
         "--timeline", str(rec_path), "--audio", str(audio), *eargs, "--out", str(edit60)])
    t_edit = time.time() - t
    got = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(edit60)],
                               capture_output=True, text=True).stdout)
    if abs(got - plan.total / FPS) > 1.5 / FPS:
        print(f"WARNING: the edit is {got:.3f}s but the plan says {plan.total / FPS:.3f}s: sheet frames may be off")
    out = outdir / "preview.mp4"
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(edit60), "-vf", f"fps={P},scale={pw}:-2", "-c:v", "libx264", "-preset", "veryfast",
         "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(out)])
    sheets(plan, groups, edit60, outdir, pw * 3 // 4 // 2 * 2)
    if not os.environ.get("KEEP"):
        shutil.rmtree(frames, ignore_errors=True)
        shutil.rmtree(outdir / "frames.replay", ignore_errors=True)
        edit60.unlink()
    print(f"preview: {out} ({got:.2f}s, {P} fps, {pw}x{pw * 16 // 9})  render {t_render:.0f}s"
          + (f" + replay {t_replay:.0f}s" if t_replay else "") + f", edit {t_edit:.0f}s, total {time.time() - T0:.0f}s")


if __name__ == "__main__":
    main()
