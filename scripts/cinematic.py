"""A cinematic scene re-shot from an existing recording (docs/cinematic.md): no server, no re-record.

    python3 scripts/cinematic.py episodes/keep/scene.json --sheet [--at 0.1,0.5,0.9] [--w 960]   stills per clip
    python3 scripts/cinematic.py episodes/keep/scene.json --chunk 3/12 [--portrait]               one slice of frames
    python3 scripts/cinematic.py episodes/keep/scene.json --assemble segs/ [--portrait]           join, score, title
    python3 scripts/cinematic.py episodes/keep/scene.json                                         everything locally

The scene is a list of clips. A clip is a window of the recording (`t0` seconds, played at `rate` recording seconds per
screen second: 0.05 is near-frozen slow motion, 10 a time-lapse) shot by one render.js camera spec (`shot`; its `path`
and `lookPath` keys are in SCREEN seconds, converted here), at its own hour (`day`: a dayTime, or [[sec, dayTime], ...]
turned into a time mark every frame, so the sun and the sky move through the shot), with its own look and fog sea
(merged over the stunt module's look, through CINE_CLIP). Each clip is rendered from a copy of the recording with
every other camera/F1/HUD mark stripped and `drop` block changes removed, and the player parked out of sight.
Frames are numbered by the render's own frame index, so a clip renders in any number of slices.
"""
import argparse
import gzip
import json
import math
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "scripts"))
FPS, SR = 30, 48000
FONT = HERE / "fonts"


def load(spec_path):
    sp = json.loads(pathlib.Path(spec_path).read_text())
    t = 0.0
    for c in sp["clips"]:
        c["start"] = t                                  # screen time the clip starts (before overlaps)
        c["n"] = int(round(c["dur"] * FPS))
        t += c["dur"] - c.get("xfade", 0)
    sp["total"] = t
    return sp


def work_dir(sp, portrait):
    return HERE / "work" / "cine" / (sp["name"] + ("_v" if portrait else ""))


_REC = {}


def base_rec(sp):
    """The recording, cleaned once: the player parked under the world, HUD/camera marks out, `drop` builds removed."""
    if "rec" in _REC:
        return _REC["rec"]
    p = HERE / sp["rec"]
    rec = json.loads(gzip.open(p).read() if p.suffix == ".gz" else p.read_text())
    rec["stunt"] = sp["stunt"]
    keep = {"time", "weather", "block_action", "block_entity", "slide_blocks"}
    rec["timeline"] = [e for e in rec["timeline"] if e["event"] in keep]
    S = rec["set"]
    for d in sp.get("drop", []):   # {ticks: [a, b], near: [dx, dz], r}: block changes from a build we don't want
        a, b = d["ticks"]; cx, cz = S["x"] + d["near"][0], S["z"] + d["near"][1]
        rec["blocks"] = [x for x in rec["blocks"] if not (a <= x[0] < b and abs(x[1] - cx) <= d["r"] and abs(x[3] - cz) <= d["r"])]
    if sp.get("hide_player", True):   # the recording bot flew round the build: park it under the world, out of every shot
        rec["poses"] = [[q[0], S["x"] + 0.5, -40.0, S["z"] + 0.5, q[4], q[5], *q[6:]] for q in rec["poses"]]
    _REC["rec"] = rec
    return rec


def clip_frames(c):
    """(render fps, first render frame) for a clip: screen frame k is render frame f0 + k."""
    fr = FPS / c["rate"]
    return fr, int(round(c["t0"] * fr))


def keyed_day(day, u):
    if not isinstance(day, list):
        return day
    if u <= day[0][0]:
        return day[0][1]
    for (a, va), (b, vb) in zip(day, day[1:]):
        if u <= b:
            x = (u - a) / max(1e-6, b - a); x = x * x * (3 - 2 * x)
            return va + (vb - va) * x
    return day[-1][1]


def clip_rec(sp, c, portrait):
    rec = json.loads(json.dumps(base_rec(sp)))
    fr, f0 = clip_frames(c)
    t_ms = lambda k: (f0 + k) / fr * 1000
    rec["timeline"] = [e for e in rec["timeline"] if e["event"] != "time"]
    day = c.get("day", sp.get("day", 6000))
    rec["time"] = int(keyed_day(day, 0)) % 24000
    if isinstance(day, list):   # a time mark on every frame (the step lookup in render.js then moves smoothly)
        for k in range(c["n"]):
            rec["timeline"].append({"t": t_ms(k) - 0.5, "event": "time", "time": int(round(keyed_day(day, k / FPS))) % 24000})
    rec["timeline"].append({"t": t_ms(0) - 1, "event": "shot", "name": "cine"})
    rec["timeline"].sort(key=lambda e: e["t"])
    shot = dict(c["shot"])
    for key in ("path", "lookPath"):
        if key in shot:
            shot[key] = [[k[0] * c["rate"], *k[1:]] for k in shot[key]]
    if "degPerSec" in shot:
        shot["degPerSec"] = shot["degPerSec"] / c["rate"]
    if portrait:
        shot["fov"] = c.get("vfov", shot.get("fov", 70) * 1.55)
    look = dict(c.get("look", {}))
    if portrait:
        look["letterbox"] = 0
    return rec, shot, {"look": look, "fogSea": c.get("fogSea", sp.get("fogSea"))}


def render(sp, c, ks, out, w, h, portrait=False):
    """Render screen frames ks of clip c into out/f<render frame>.png. Returns the paths in order."""
    fr, f0 = clip_frames(c)
    out.mkdir(parents=True, exist_ok=True)
    want = [f0 + k for k in ks]
    paths = [out / f"f{f:05d}.png" for f in want]
    missing = [f for f, p in zip(want, paths) if not p.exists()]
    if missing:
        rec, shot, cl = clip_rec(sp, c, portrait)
        tmp = out / "clip.rec.json"
        tmp.write_text(json.dumps(rec))
        env = {**os.environ, "SHOTS_JSON": json.dumps({"cine": shot}), "CINE_CLIP": json.dumps(cl), "FRAMES": ",".join(map(str, missing)), "DAY_LIGHT_STEP": os.environ.get("DAY_LIGHT_STEP", "0.025")}
        print(f"render {c['id']}: {len(missing)} frames at {fr:g} fps, {w}x{h}", flush=True)
        r = subprocess.run(["node", "render.js", str(tmp), str(out), str(fr), str(w), str(h)], cwd=HERE, env=env, capture_output=True, text=True)
        tmp.unlink(missing_ok=True)
        if r.returncode:
            print(r.stdout[-3000:], r.stderr[-3000:]); sys.exit(f"render failed: {c['id']}")
        for line in r.stdout.splitlines():
            if "rendered" in line or "meshed" in line:
                print("  " + line)
    return paths


def size(portrait, scale=1.0):
    w, h = (1080, 1920) if portrait else (1920, 1080)
    return int(w * scale) // 2 * 2, int(h * scale) // 2 * 2


# ---------------------------------------------------------------- slices (Actions) and local renders
def plan(sp):
    """Every screen frame of the scene as (clip index, k)."""
    return [(i, k) for i, c in enumerate(sp["clips"]) for k in range(c["n"])]


def chunk(sp, i, n, portrait, segdir):
    P = plan(sp)
    a, b = len(P) * i // n, len(P) * (i + 1) // n
    mine = P[a:b]
    w, h = size(portrait)
    segdir.mkdir(parents=True, exist_ok=True)
    for ci, c in enumerate(sp["clips"]):
        ks = [k for (cj, k) in mine if cj == ci]
        if not ks:
            continue
        d = work_dir(sp, portrait) / "frames" / c["id"]
        paths = render(sp, c, ks, d, w, h, portrait)
        lst = d / f"list_{ks[0]:05d}.txt"
        lst.write_text("".join(f"file '{p}'\nduration {1 / FPS:.6f}\n" for p in paths))
        seg = segdir / f"seg_{ci:02d}_{ks[0]:05d}.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-frames:v", str(len(paths)),
                        "-c:v", "libx264", "-crf", "12", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", str(FPS), str(seg)], check=True)
        for p in paths:
            p.unlink(missing_ok=True)
        lst.unlink(missing_ok=True)
        print(f"  -> {seg.name}", flush=True)


def sheet(sp, at, scale, portrait, only=None):
    w, h = size(portrait, scale)
    tiles = []
    for c in sp["clips"]:
        if only and c["id"] not in only:
            continue
        ks = sorted({min(c["n"] - 1, int(round(x * (c["n"] - 1)))) for x in at})
        d = work_dir(sp, portrait) / "sheet" / f"{c['id']}_{w}"
        for p in render(sp, c, ks, d, w, h, portrait):
            im = Image.open(p).convert("RGB")
            ImageDraw.Draw(im).text((8, 6), f"{c['id']} {p.stem}", fill=(255, 255, 0))
            tiles.append(im)
    cols = len(at)
    rows = math.ceil(len(tiles) / cols)
    out = Image.new("RGB", (cols * w, rows * h))
    for i, im in enumerate(tiles):
        out.paste(im, ((i % cols) * w, (i // cols) * h))
    dst = work_dir(sp, portrait) / "sheet.jpg"
    out.save(dst, quality=85)
    print(dst)


# ---------------------------------------------------------------- titles
def tracked(draw, xy, text, font, spacing, fill):
    widths = [draw.textlength(ch, font=font) for ch in text]
    x = xy[0] - (sum(widths) + spacing * (len(text) - 1)) / 2
    for ch, cw in zip(text, widths):
        draw.text((x, xy[1]), ch, font=font, fill=fill, anchor="lm")
        x += cw + spacing


def title_png(t, w, h, path):
    """The title card: a small line over the big Cinzel title with a warm glow, transparent around."""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    k = w / 1920 if w > h else w / 1080 * 0.82
    cy = h * t.get("y", 0.5)
    big = ImageFont.truetype(str(FONT / "Cinzel_900Black.ttf"), int(150 * k))
    small = ImageFont.truetype(str(FONT / "Cinzel_400Regular.ttf") if (FONT / "Cinzel_400Regular.ttf").exists() else str(FONT / "Cinzel_900Black.ttf"), int(34 * k))
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    tracked(ImageDraw.Draw(glow), (w / 2, cy), t["title"], big, int(30 * k), (255, 214, 150, 255))
    im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(int(22 * k))))
    d = ImageDraw.Draw(im)
    tracked(d, (w / 2, cy), t["title"], big, int(30 * k), (255, 246, 228, 255))
    if t.get("over"):
        tracked(d, (w / 2, cy - 120 * k), t["over"], small, int(12 * k), (235, 225, 210, 230))
    if t.get("under"):
        tracked(d, (w / 2, cy + 112 * k), t["under"], small, int(12 * k), (235, 225, 210, 230))
    im.save(path)


# ---------------------------------------------------------------- sound
def score(sp):
    """The score (made, not licensed): real orchestra samples (VSCO-2 CE, CC0, scripts/get_samples.sh) when they're in
    work/samples/x, else scripts/orchestra.py's synthesised section. Cues from the scene's `cues`."""
    import orchestra as O
    import trailer as T
    import sfx
    total = sp["total"]
    cue = sp["cues"]
    N = int((total + 6) * SR)
    mix = np.zeros((N, 2), np.float32)
    real = (HERE / "work" / "samples" / "x" / "CelloEnsSusVib").exists()
    if real:
        import sampler as S
        M = S.midi

        def nt(inst, m, dur, vel, rel=0.8, att=0.0, rr=0):
            return S.note(inst, O._fit(inst, M(m)), dur, vel, rel, att, rr)

        def chord(inst, ms, dur, vel, rel=1.2, att=0.0):
            return S.chord(inst, [O._fit(inst, M(m)) for m in ms], dur, vel, rel, att)
    # D major-ish modal: Dawn (D - A pedal), the rise (Bm - G - D - A), gold (G - D/F# - Em - D), night (Bm - G ... D)
    dawn, rise, gold, night, end = cue["dawn"], cue["rise"], cue["gold"], cue["night"], cue["title"]
    if real:
        O.place(mix, nt("ContrabassSusVB-Quiet", "D2", rise - dawn + 1.0, 50, 1.5, 3.0), dawn, 0.8)
        O.place(mix, chord("CelloEnsSusVib-Quiet", ["D3", "A3"], rise - dawn + 0.8, 52, 1.5, 3.5), dawn, 0.7)
        O.place(mix, nt("ViolinEnsSusVib-Quiet", "A5", rise - dawn - 0.5, 42, 1.5, 4.0), dawn + 1.2, 0.35)
        O.place(mix, nt("Harp", "D5", 3.0, 60, 2.0), dawn + 0.4, 0.5)
        O.place(mix, nt("Harp", "A5", 3.0, 55, 2.0), dawn + 1.3, 0.45)
        O.place(mix, nt("Harp", "F#5", 3.0, 55, 2.0), dawn + 2.2, 0.45)
        # the rise: a pulse of low strings in eighths, chords climbing, timpani on each bar
        prog = [["B2", "F#3", "B3", "D4"], ["G2", "D3", "G3", "B3"], ["D3", "A3", "D4", "F#4"], ["A2", "E3", "A3", "C#4"]]
        bar = (gold - rise) / len(prog)
        for i, ch in enumerate(prog):
            st = rise + i * bar
            O.place(mix, chord("ViolaEnsSusVib", ch[1:], bar + 0.3, 70 + 8 * i, 0.6, 0.15), st, 0.55)
            O.place(mix, chord("ViolinEnsSusVib", [ch[2], ch[3]], bar + 0.3, 62 + 10 * i, 0.6, 0.3), st, 0.45 + 0.1 * i)
            O.place(mix, nt("ContrabassSusVB", ch[0], bar + 0.2, 80, 0.5), st, 0.7)
            O.place(mix, nt("Timpani", ch[0], 1.2, 70 + 12 * i, 1.0, rr=i), st, 0.7)
            e = 0
            while e < bar - 0.05:
                O.place(mix, nt("CelloEnsSusVib", ch[0], 0.18, 75 + 6 * i, 0.12, rr=int(e * 10)), st + e, 0.5)
                e += bar / 8
            if i == len(prog) - 1:
                O.place(mix, nt("TimpaniRolls", "A2", bar, 90, 0.4), st, 0.6)
        # gold: the swell lands. Horns carry the theme over full strings
        O.place(mix, nt("Timpani", "D2", 2.5, 120, 2.0), gold, 1.2)
        O.place(mix, nt("TubaSus", "D2", night - gold + 0.6, 95, 1.6, 0.05), gold, 0.6)
        O.place(mix, chord("TromboneSus", ["D3", "A3"], 2.4, 100, 1.4), gold, 0.55)
        theme = [("F#4", 0.0, 1.0), ("A4", 1.0, 0.6), ("D5", 1.6, 1.4), ("C#5", 3.0, 0.7), ("A4", 3.7, 1.6)]
        sc = (night - gold) / 5.3
        for j, (n, at, du) in enumerate(theme):
            O.place(mix, nt("FHornSus", n, du * sc + 0.2, 105, 1.0, 0.05, rr=j), gold + at * sc, 0.75)
        chords = [["D3", "A3", "D4", "F#4"], ["F#2", "A3", "D4", "A4"], ["E3", "G3", "B3", "E4"], ["D3", "A3", "D4", "F#4"]]
        cb = (night - gold) / len(chords)
        for i, ch in enumerate(chords):
            O.place(mix, chord("ViolinEnsSusVib", ch[1:], cb + 0.5, 92, 1.0, 0.1), gold + i * cb, 0.6)
            O.place(mix, chord("CelloEnsSusVib", ch[:2], cb + 0.5, 92, 1.0, 0.1), gold + i * cb, 0.6)
            O.place(mix, nt("ContrabassSusVB", ch[0], cb + 0.4, 95, 0.8), gold + i * cb, 0.7)
        O.place(mix, chord("OrganLoud", ["D3", "A3", "D4"], night - gold + 0.5, 70, 2.0, 0.3), gold, 0.18)
        # night: the strings fall away to a cello line, celesta-like harp, bells
        O.place(mix, chord("CelloEnsSusVib-Quiet", ["B2", "F#3"], end - night + 0.5, 55, 2.0, 1.0), night, 0.7)
        O.place(mix, nt("ContrabassSusVB-Quiet", "B1", end - night + 0.5, 55, 2.0, 1.0), night, 0.6)
        O.place(mix, chord("ViolinEnsSusVib-Quiet", ["D5", "F#5"], end - night, 45, 2.5, 2.0), night + 0.8, 0.35)
        for j, (n, at) in enumerate([("F#5", 0.4), ("D5", 1.4), ("B4", 2.4), ("A4", 3.6)]):
            if night + at < end - 0.4:
                O.place(mix, nt("Harp", n, 2.5, 55, 2.0, rr=j), night + at, 0.45)
        # the title: the last chord, D major, everything, ringing out with a bell
        fin = ["D3", "A3", "D4", "F#4", "A4"]
        O.place(mix, nt("Timpani", "D2", 3.0, 110, 2.5), end, 1.0)
        O.place(mix, chord("ViolinEnsSusVib", fin[2:], 4.5, 90, 3.5, 0.2), end, 0.6)
        O.place(mix, chord("CelloEnsSusVib", fin[:3], 4.5, 90, 3.5, 0.2), end, 0.6)
        O.place(mix, chord("FHornSus", ["D4", "F#4", "A4"], 3.6, 95, 3.0, 0.15), end, 0.5)
        O.place(mix, nt("ContrabassSusVB", "D2", 4.5, 90, 3.0), end, 0.7)
        O.place(mix, nt("TubularBells", "D5", 4.0, 85, 3.5), end, 0.45)
    else:
        N3 = O.NOTE
        O.place(mix, O.strings([N3["D2"], N3["A2"]], rise - dawn + 1, 0.16, 3.0, 1.5, 0.25), dawn)
        for j, (p, at) in enumerate([(O.HARP("D5"), 0.4), (O.HARP("A5"), 1.3), (O.HARP("F4") * 2 ** (1 / 12) * 2, 2.2)]):
            O.place(mix, O.harp(min(2.0, p), 0.35), dawn + at)
        prog = [[123.47, 185.0, 246.94, 293.66], [98.0, 146.83, 196.0, 246.94], [146.83, 220.0, 293.66, 369.99], [110.0, 164.81, 220.0, 277.18]]
        bar = (gold - rise) / len(prog)
        for i, ch in enumerate(prog):
            O.place(mix, O.strings(ch, bar + 0.3, 0.16 + 0.04 * i, 0.3, 0.5, 0.4 + 0.15 * i), rise + i * bar)
            O.place(mix, O.timpani(ch[0] / 2, 0.5 + 0.1 * i), rise + i * bar)
        O.place(mix, O.timpani(73.42 * 0.75, 1.0), gold)
        O.place(mix, T.braam(3.0, 36.71), gold, 0.4)
        O.place(mix, O.strings([146.83, 220.0, 293.66, 369.99], night - gold + 0.5, 0.32, 0.3, 1.5, 0.85), gold)
        O.place(mix, O.choir([293.66, 369.99, 440.0], night - gold + 0.5, 0.12, 0.6, 1.5, "ah"), gold)
        O.place(mix, O.strings([123.47, 185.0], end - night + 0.5, 0.18, 1.0, 2.0, 0.3), night)
        fin = [146.83, 220.0, 293.66, 369.99]
        O.place(mix, O.strings(fin, 4.5, 0.32, 0.2, 3.5, 0.85), end)
        O.place(mix, O.timpani(73.42 * 0.75, 1.0), end)
    mix = T.reverb(mix, 3.2, 0.32)[: len(mix)]
    # sound design under the music: wind across the whole scene, a riser into gold, a deep boom at the title
    wind = sfx.stereo(sfx.synth_wind(total + 2)) if sfx.synth_wind(1.0).ndim == 1 else sfx.synth_wind(total + 2)
    O.place(mix, wind.astype(np.float32), 0.0, 0.18)
    O.place(mix, T.reverse_swell(1.6, 0.5), gold - 1.6)
    O.place(mix, T.reverse_swell(1.4, 0.4), end - 1.4)
    return mix[: int(total * SR)], real


def ambience(sp):
    """Game sounds placed by the scene's `sfx` list: [[sec, sound event, volume, pitch], ...] (scripts/audio.py)."""
    import audio as mc
    import trailer as T
    N = int(sp["total"] * SR)
    mix = np.zeros((N, 2), np.float32)
    for at, name, vol, pitch in sp.get("sfx", []):
        try:
            x = T.st(T.note(name, pitch, vol))
        except Exception as e:   # (a missing sound is not worth failing the render)
            print("no sound", name, e); continue
        i = int(at * SR); n = min(len(x), N - i)
        if n > 0:
            mix[i:i + n] += x[:n]
    return mix


def assemble(sp, segdir, portrait, out):
    wd = work_dir(sp, portrait)
    wd.mkdir(parents=True, exist_ok=True)
    w, h = size(portrait)
    segs = sorted(pathlib.Path(segdir).glob("seg_*.mp4"))
    clips = []
    for ci, c in enumerate(sp["clips"]):
        mine = [s for s in segs if s.name.startswith(f"seg_{ci:02d}_")]
        lst = wd / f"clip_{ci:02d}.txt"
        lst.write_text("".join(f"file '{s.resolve()}'\n" for s in mine))
        cm = wd / f"clip_{ci:02d}.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(cm)], check=True)
        clips.append(cm)
    # dissolves between clips (`xfade` on the incoming clip), a fade in from black and out to black
    inputs, fl, prev, acc = [], [], "[0:v]", sp["clips"][0]["dur"]
    for i, cm in enumerate(clips):
        inputs += ["-i", str(cm)]
    for i in range(1, len(clips)):
        x = sp["clips"][i].get("xfade", 0)
        lbl = f"[x{i}]"
        if x > 0:
            fl.append(f"{prev}[{i}:v]xfade=transition=fade:duration={x}:offset={acc - x:.4f}{lbl}")
        else:
            fl.append(f"{prev}[{i}:v]concat=n=2:v=1:a=0{lbl}")
        acc += sp["clips"][i]["dur"] - x
        prev = lbl
    total = sp["total"]
    t = sp["title"]
    tp = wd / "title.png"
    title_png(t, w, h, tp)
    inputs += ["-loop", "1", "-t", f"{total}", "-i", str(tp)]
    ti = len(clips)
    fl.append(f"[{ti}:v]format=rgba,fade=in:st={t['at']}:d={t.get('fade', 1.2)}:alpha=1[tt]")
    fl.append(f"{prev}[tt]overlay=0:0:format=auto,fade=in:st=0:d={sp.get('fade_in', 1.0)},fade=out:st={total - sp.get('fade_out', 1.5):.3f}:d={sp.get('fade_out', 1.5)},format=yuv420p[v]")
    # sound
    music, real = score(sp)
    amb = ambience(sp)
    n = min(len(music), len(amb))
    mixd = music[:n] * sp.get("music_gain", 1.0) + amb[:n]
    fo = int(sp.get("fade_out", 1.5) * SR * 1.2)
    mixd[-fo:] *= np.linspace(1, 0, fo)[:, None]
    mixd /= max(1e-6, float(np.abs(mixd).max())) / 0.9   # (loudnorm sets the level; keep the wav from clipping)
    wav = wd / "mix.wav"
    import trailer as T
    T.write_wav(wav, mixd)
    print("score:", "VSCO-2 samples" if real else "synthesised")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-i", str(wav), "-filter_complex", ";".join(fl), "-map", "[v]", "-map", f"{ti + 1}:a",
                    "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", "-r", str(FPS), "-movflags", "+faststart",
                    "-c:a", "aac", "-b:a", "256k", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-t", f"{total:.3f}", str(out)], check=True)
    print("wrote", out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene")
    ap.add_argument("--sheet", action="store_true")
    ap.add_argument("--at", default="0.05,0.5,0.95")
    ap.add_argument("--scale", type=float, default=0.5)
    ap.add_argument("--only", default="")
    ap.add_argument("--chunk", default="")
    ap.add_argument("--assemble", default="")
    ap.add_argument("--portrait", action="store_true")
    ap.add_argument("--out", default="")
    a = ap.parse_args()
    sp = load(a.scene)
    print(f"{sp['name']}: {len(sp['clips'])} clips, {sp['total']:.2f} s, {len(plan(sp))} frames")
    if a.sheet:
        return sheet(sp, [float(x) for x in a.at.split(",")], a.scale, a.portrait, a.only.split(",") if a.only else None)
    if a.chunk:
        i, n = map(int, a.chunk.split("/"))
        return chunk(sp, i, n, a.portrait, work_dir(sp, a.portrait) / "segs")
    out = pathlib.Path(a.out) if a.out else HERE / "out" / f"{sp['name']}{'_vertical' if a.portrait else ''}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    if a.assemble:
        return assemble(sp, a.assemble, a.portrait, out)
    chunk(sp, 0, 1, a.portrait, work_dir(sp, a.portrait) / "segs")
    assemble(sp, work_dir(sp, a.portrait) / "segs", a.portrait, out)


if __name__ == "__main__":
    main()
