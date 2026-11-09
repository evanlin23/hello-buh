"""A cinematic trailer from movie-scene recordings (docs/movie_engine.md, "Trailers"):

    python3 scripts/trailer.py episodes/trailer/edl.json            render the clips (cached), cards, score; build both cuts
    python3 scripts/trailer.py episodes/trailer/edl.json --sheet    one frame from the middle of every clip (check cameras)

The edit list (edl.json) is a sequence of segments, each a clip rendered from a recording with its own camera (render.js
shot spec, or the name of one of the stunt's shots; `slow` renders it at 30 x slow fps for real slow motion) or a black
beat. Cards (Cinzel), voice lines (scripts/tts.py takes in work/trailer/vox) and the no-voice cut's quoted lines are
placed by [segment id, seconds into it]. The score and sound design are made here (score()): the four-note song on a
note block, low drones, bass hits, risers, heartbeats, the bell, silences, all synthesised or from the game's own sounds.

Outputs: out/<name>.mp4 (with voices) and out/<name>_novox.mp4 (the lines as on-screen quotes), 1920x1080, 30 fps,
2.39:1 bars, -14 LUFS.
"""
import argparse
import hashlib
import json
import math
import os
import pathlib
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "scripts"))
import audio as mc   # noqa: E402  (Minecraft sounds: mc.asset, mc.decode)
import sfx           # noqa: E402  (synth_boom, synth_riser, synth_wind, library)

W, H, FPS, SR = 1920, 1080, 30, 48000
WORK = HERE / "work" / "trailer"
FONT = HERE / "fonts"
BAR = int(round((H - W / 2.39) / 2))   # 2.39:1 letterbox


# ---------------------------------------------------------------- picture
def seg_times(edl):
    t, out = 0.0, {}
    for s in edl["seq"]:
        out[s["id"]] = (t, s.get("dur", s.get("black", 0)))
        t += out[s["id"]][1]
    return out, t


def at(T, ref):
    return T[ref[0]][0] + ref[1]


def render_clip(edl, s, w=W, h=H, frames=None):
    """PNG frames for one clip; cached by its spec. Returns (dir, first frame index, count, fps)."""
    rec_path = HERE / edl["recs"][s["rec"]]
    slow = s.get("slow", 1)
    fps = FPS * slow
    f0 = int(round(s["t0"] * fps))
    n = int(round(s["dur"] * FPS))
    want = frames if frames is not None else list(range(f0, f0 + n))
    key = hashlib.sha1(json.dumps([s, w, h, want, rec_path.stat().st_mtime, (HERE / "render.js").stat().st_mtime,
                                    (HERE / "renderer" / "page.js").stat().st_mtime]).encode()).hexdigest()[:12]
    out = WORK / "clips" / f"{s['id']}_{key}"
    missing = [f for f in want if not (out / f"f{f:05d}.png").exists()]
    if not missing:
        return out, f0, n, fps
    out.mkdir(parents=True, exist_ok=True)
    (out / "clip.mp4").unlink(missing_ok=True)
    rec = json.loads(rec_path.read_text())
    # only this clip's camera: every shot and F1 mark out, one shot mark at t0
    rec["timeline"] = [e for e in rec["timeline"] if e["event"] not in ("shot", "f1_on", "f1_off")]
    # (at the first frame's own time: at t0 itself, a first frame rounded down to before the mark flashed one frame of POV)
    rec["timeline"].append({"t": min(want) / fps * 1000 - 1, "event": "shot", "name": "trl"})
    rec["timeline"].sort(key=lambda e: e["t"])
    stunt = rec.get("stunt")
    spec = s["shot"]
    if isinstance(spec, str):   # one of the stunt's own shots
        spec = json.loads(subprocess.run(["node", "-e", f"process.stdout.write(JSON.stringify(require('./stunts/{stunt}').shots['{spec}']))"], cwd=HERE, capture_output=True, text=True, check=True).stdout)
    tmp = out / "clip.rec.json"
    tmp.write_text(json.dumps(rec))
    env = {**os.environ, "SHOTS_JSON": json.dumps({"trl": spec}), "FRAMES": ",".join(map(str, missing))}
    print(f"render {s['id']}: {len(missing)} frames at {fps} fps")
    subprocess.run(["node", "render.js", str(tmp), str(out), str(fps), str(w), str(h)], cwd=HERE, env=env, check=True, stdout=subprocess.DEVNULL)
    tmp.unlink()
    return out, f0, n, fps


def encode_clip(edl, s):
    d, f0, n, fps = render_clip(edl, s)
    mp4 = d / "clip.mp4"
    if not mp4.exists():
        vf = []
        if s.get("fade_in"):
            vf.append(f"fade=in:st=0:d={s['fade_in']}")
        if s.get("fade_out"):
            vf.append(f"fade=out:st={s['dur'] - s['fade_out']}:d={s['fade_out']}")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-start_number", str(f0), "-i", str(d / "f%05d.png"),
                        "-frames:v", str(n), *(["-vf", ",".join(vf)] if vf else []), "-c:v", "libx264", "-crf", "15", "-preset", "medium",
                        "-pix_fmt", "yuv420p", "-r", str(FPS), str(mp4)], check=True)
    return mp4


def black_clip(dur):
    p = WORK / f"black_{dur:.2f}.mp4"
    if not p.exists():
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=c=black:s={W}x{H}:r={FPS}:d={dur}",
                        "-c:v", "libx264", "-crf", "15", "-pix_fmt", "yuv420p", str(p)], check=True)
    return p


def tracked(draw, xy, text, font, spacing, fill, anchor_center=True):
    """Letter-spaced text centred on xy."""
    widths = [draw.textlength(c, font=font) for c in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x = xy[0] - total / 2 if anchor_center else xy[0]
    for c, cw in zip(text, widths):
        draw.text((x, xy[1]), c, font=font, fill=fill, anchor="lm")
        x += cw + spacing


def card_png(c, path):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if "title" in c:
        f = ImageFont.truetype(str(FONT / "Cinzel_900Black.ttf"), 176)
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        # (high in the frame: the tower's lit deck fills the lower middle, and the lines under the title sat on it)
        tracked(ImageDraw.Draw(glow), (W / 2, H / 2 - 170), c["title"], f, 26, (255, 236, 200, 255))
        im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(18)))
        d = ImageDraw.Draw(im)
        tracked(d, (W / 2, H / 2 - 170), c["title"], f, 26, (255, 255, 255, 255))
    elif "under" in c or "under2" in c:
        f = ImageFont.truetype(str(FONT / "Cinzel_700Bold.ttf"), 44 if "under" in c else 38)
        y = H / 2 - 62 if "under" in c else H / 2 - 8
        shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        tracked(ImageDraw.Draw(shadow), (W / 2, y), c.get("under") or c.get("under2"), f, 14, (0, 0, 0, 230))
        im = Image.alpha_composite(im, shadow.filter(ImageFilter.GaussianBlur(6)))
        d = ImageDraw.Draw(im)
        tracked(d, (W / 2, y), c.get("under") or c.get("under2"), f, 14, (230, 230, 230, 255))
    elif "quote" in c:
        f = ImageFont.truetype(str(FONT / "Cinzel_700Bold.ttf"), 46)
        tracked(d, (W / 2, H - BAR - 70), c["quote"], f, 4, (255, 255, 255, 255))
    else:
        fs = ImageFont.truetype(str(FONT / "Cinzel_700Bold.ttf"), 56)
        fb = ImageFont.truetype(str(FONT / "Cinzel_700Bold.ttf"), 100)
        tracked(d, (W / 2, H / 2 - 66), c["small"], fs, 14, (215, 215, 215, 255))   # (44/86 px read as fine print at phone size)
        tracked(d, (W / 2, H / 2 + 40), c["big"], fb, 12, (255, 255, 255, 255))
    im.save(path)


def assemble(edl, T, total, vox, out):
    segs = []
    for s in edl["seq"]:
        segs.append(black_clip(s["black"]) if "black" in s else encode_clip(edl, s))
    lst = WORK / "concat.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in segs))
    base = WORK / "base.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(base)], check=True)
    cards = list(edl["cards"]) + ([] if vox else [{"at": q["at"], "dur": q["dur"], "quote": q["text"]} for q in edl["quotes"]])
    inputs, chains, prev = ["-i", str(base)], [f"[0:v]drawbox=x=0:y=0:w={W}:h={BAR}:color=black:t=fill,drawbox=x=0:y={H - BAR}:w={W}:h={BAR}:color=black:t=fill[v0]"], "v0"
    for k, c in enumerate(cards):
        png = WORK / f"card_{k}_{'v' if vox else 'q'}.png"
        card_png(c, png)
        st, du = at(T, c["at"]), c["dur"]
        fi = min(0.5, du / 4) if "title" not in c else 0.9
        inputs += ["-loop", "1", "-t", f"{du:.3f}", "-i", str(png)]
        chains.append(f"[{k + 1}:v]format=rgba,fade=in:st=0:d={fi}:alpha=1,fade=out:st={du - 0.45:.3f}:d=0.45:alpha=1,setpts=PTS+{st:.3f}/TB[c{k}]")
        chains.append(f"[{prev}][c{k}]overlay=enable='between(t,{st:.3f},{st + du:.3f})'[v{k + 1}]")
        prev = f"v{k + 1}"
    wav = WORK / f"mix_{'v' if vox else 'q'}.wav"
    write_wav(wav, score(edl, T, total, vox))
    inputs += ["-i", str(wav)]
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(chains), "-map", f"[{prev}]",
                    "-map", f"{len(cards) + 1}:a", "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "256k", "-af", "loudnorm=I=-14:TP=-1.2:LRA=14", "-ar", str(SR), "-t", f"{total:.3f}", str(out)], check=True)
    print("wrote", out)


# ---------------------------------------------------------------- sound
RNG = np.random.default_rng(11)


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", str(path)], input=x.astype(np.float32).tobytes(), check=True)


def st(m):
    return np.stack([m, m], 1).astype(np.float32)


def reverb(x, secs=3.0, wet=0.45, damp=4500):
    """A hall: x (stereo) convolved with decaying, low-passed noise, different per channel."""
    n = int(secs * SR)
    t = np.arange(n) / SR
    out = np.zeros((len(x) + n, 2), np.float32)
    for ch in range(2):
        ir = RNG.standard_normal(n) * np.exp(-t * 6.9 / secs)
        ir = sfx.onepole(ir, damp)
        ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        ir /= np.sqrt((ir ** 2).sum()) + 1e-9
        L = 1 << int(math.ceil(math.log2(len(x) + n)))
        y = np.fft.irfft(np.fft.rfft(x[:, ch], L) * np.fft.rfft(ir, L), L)[: len(x) + n]
        out[:, ch] = y
    dry = np.zeros_like(out); dry[: len(x)] = x
    return dry * (1 - wet) + out * wet * 2.2


def note(name, pitch, vol=1.0):
    """A Minecraft sound event's first variant, as mono at SR."""
    defs = json.loads(mc.asset("minecraft/sounds.json").read_text())
    v = defs[name]["sounds"][0]
    v = {"name": v} if isinstance(v, str) else v
    return mc.decode(mc.asset(f"minecraft/sounds/{v['name']}.ogg"), pitch) * vol


NB = lambda semis: 2 ** ((semis - 12) / 12)   # note block pitch: 0 = F#3 ... 24 = F#5


def saw_stack(freqs, dur, cutoff):
    """Detuned saws with a moving low-pass (cutoff(t) in Hz), built from harmonics; mono."""
    n = int(dur * SR); t = np.arange(n) / SR; y = np.zeros(n)
    c = cutoff(t)
    for f0 in freqs:
        for det in (-0.12, 0.0, 0.11):
            f = f0 * 2 ** (det / 12)
            ph = RNG.uniform(0, 2 * np.pi)
            for k in range(1, int(5000 / f)):
                g = 1 / (1 + np.exp((k * f - c) / (0.25 * c + 40)))
                y += np.sin(2 * np.pi * k * f * t + ph * k) * g / k
    return y / (len(freqs) * 3)


def braam(dur=2.6, root=36.71):
    """The trailer hit: low brass-like saws on D1/D2/A2 opening fast and closing slow, distorted, with a sub."""
    t = np.arange(int(dur * SR)) / SR
    env = np.minimum(1, t / 0.03) * np.exp(-t / (dur * 0.42))
    y = saw_stack([root, root * 2, root * 3], dur, lambda t: 180 + 2600 * np.exp(-t / 0.5)) * env
    y = np.tanh(y * 3.2) * 0.7
    y += np.sin(2 * np.pi * root * t) * env * 0.8
    n = RNG.standard_normal(len(t)) * np.exp(-t / 0.08) * 0.25
    y += sfx.onepole(n, 900)
    return st(sfx.norm(y, 0.95))


def drone(dur, freqs=(73.42, 110.0), level=0.3):
    t = np.arange(int(dur * SR)) / SR
    y = saw_stack(list(freqs), dur, lambda t: 300 + 120 * np.sin(2 * np.pi * 0.07 * t)) * level
    y *= np.minimum(1, t / 2.0) * np.minimum(1, (dur - t) / 1.5).clip(0)
    l = y * (1 + 0.15 * np.sin(2 * np.pi * 0.11 * t)); r = y * (1 - 0.15 * np.sin(2 * np.pi * 0.11 * t))
    return np.stack([l, r], 1).astype(np.float32)


def thump(f=48, dur=0.35, level=1.0):
    t = np.arange(int(dur * SR)) / SR
    return st(np.sin(2 * np.pi * f * t * (1 + 0.6 * np.exp(-t / 0.03))) * np.exp(-t / 0.09) * level)


def heartbeat(level=0.8):
    a = thump(52, 0.3, level); b = thump(46, 0.3, level * 0.7)
    out = np.zeros((int(0.6 * SR), 2), np.float32)
    out[: len(a)] += a; out[int(0.16 * SR): int(0.16 * SR) + len(b)] += b
    return out


def tick(level=0.25):
    t = np.arange(int(0.025 * SR)) / SR
    n = RNG.standard_normal(len(t)) * np.exp(-t / 0.004)
    return st(sfx.band(n, 1800, 5200) * level * 3)


def pad(freqs, dur, level=0.25):
    t = np.arange(int(dur * SR)) / SR
    y = saw_stack(freqs, dur, lambda t: 900 + 0 * t) * level
    y *= np.minimum(1, t / 1.2) * np.minimum(1, (dur - t) / 1.0).clip(0)
    return st(y)


def bell(pitch=0.6, level=1.0, far=False):
    x = note("block.bell.use", pitch, level)
    t = np.arange(int(4.5 * SR)) / SR
    f = 146.8 * pitch / 0.6   # a sine body under it (partials of a bell), so it lands as a toll, not a ding
    body = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) for a, r, d in ((0.5, 0.5, 2.5), (0.35, 1.0, 1.8), (0.2, 2.4, 1.1), (0.12, 3.0, 0.7)))
    m = np.zeros(len(t)); m[: len(x)] += x[: len(t)]
    m += body * level * 0.35
    s = st(m)
    if far:
        s = st(sfx.onepole(m, 1200)) * 0.35
    return reverb(s, 4.0, 0.55 if not far else 0.8)


def whoosh(level=1.0, rev=False):
    x = sfx.library("whoosh") * level
    return x[::-1].copy() if rev else x


def reverse_swell(dur=1.2, level=0.6):
    """Noise into a hit: a reversed reverb tail."""
    n = RNG.standard_normal(int(0.08 * SR)) * 0.6
    tail = reverb(st(n), dur, 1.0)[: int(dur * SR)]
    return tail[::-1].copy() * level


def load_vox(i, far=False):
    """A line placed in the world, not on the listener's ears: a stone-room reverb on every voice (a review heard them
    dry on top of the mix), a longer hall on a far one, and a de-essing low-pass on whispers (Fen's 's' bit at 5-7 kHz)."""
    p = WORK / "vox" / f"{i}.wav"
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    m = np.frombuffer(raw, np.float32).copy()
    m = sfx.norm(m, 0.9)
    if far:
        m = sfx.onepole(m, 4800)
    s = st(m)
    return reverb(s, 2.6 if far else 0.9, 0.5 if far else 0.3, damp=3800)


def score(edl, T, total, vox):
    mix = np.zeros((int((total + 6) * SR), 2), np.float32)

    def put(x, t, g=1.0):
        i = int(round(t * SR))
        a, b = max(0, i), min(len(mix), i + len(x))
        if b > a:
            mix[a:b] += x[a - i: b - i] * g

    S = lambda k, off=0.0: T[k][0] + off
    # the four-note song on a note block (low, low, high, low: D, D, A, D), in a big hall, out of silence
    song = [(0.0, 8), (0.55, 8), (1.1, 15), (1.9, 8)]
    room = RNG.standard_normal(int(4.2 * SR)) * 0.004
    put(st(sfx.onepole(room, 2500)), 0.0, 1.0)   # room tone: the silence is a place
    for dt, semi in song:
        tone = note("block.note_block.harp", NB(semi), 0.9)
        shadow = note("block.note_block.harp", NB(semi) * 2 ** (9 / 1200), 0.35)   # +9 cents: a little wow
        n = max(len(tone), len(shadow)); m = np.zeros(n); m[: len(tone)] += tone; m[: len(shadow)] += shadow
        click = sfx.band(RNG.standard_normal(int(0.006 * SR)), 2500, 6500) * 0.08
        put(st(click), S("open", 0.45) + dt - 0.012, 0.6)
        put(reverb(st(m), 3.8, 0.6), S("open", 0.45) + dt, 0.55)
    put(drone(S("cardB") - S("open", 1.0) + 1.0), S("open", 1.0), 0.55)
    # the tower: wind, a slow rise
    put(sfx.synth_air(S("hk1") - S("tower") + 0.6), S("tower"), 0.35)
    put(whoosh(0.6), S("tower", 0.1), 0.5)
    put(reverse_swell(1.4, 0.5), S("hk1") - 1.4, 0.6)
    # the plank: a clock ticks under the questions
    for k in range(int((S("cardB") - S("hk1")) / 0.72)):
        put(tick(0.18), S("hk1") + k * 0.72)
    # BOOM: the rule
    put(braam(2.6), S("cardB"), 0.9)
    put(drone(S("fen") - S("cardB") + 1.5, (55.0, 82.4), 0.35), S("cardB", 0.4), 0.6)
    # the edge: a heartbeat speeding up
    t, gap = S("edge"), 0.9
    while t < S("povfall") - 0.2:
        put(heartbeat(0.7), t); t += gap; gap = max(0.42, gap * 0.85)
    put(reverse_swell(1.0, 0.7), S("povfall") - 1.0, 0.7)
    # he steps off: the toll
    put(bell(0.6, 1.0), S("povfall", 0.08), 0.9)
    put(sfx.synth_wind(1.8), S("povfall"), 0.55)
    put(braam(2.4, 32.7), S("cardC"), 0.85)
    put(whoosh(0.9), S("fogin", 0.2), 0.7)
    put(sfx.synth_riser(0.9) * 0.6, S("fogin"), 0.5)
    # black. Fen. A far bell.
    put(bell(0.6, 0.8, far=True), S("fen", 0.05), 0.7)
    # the montage: a riser, ticks doubling, a hit on every cut
    rz = sfx.synth_riser(S("hush") - S("m1"))
    rz = rz - np.stack([sfx.band(rz[:, 0], 1800, 3400)] * 2, 1) * 0.6   # a notch where the ticks and the whisper live
    put(rz, S("m1"), 0.55)
    t, gap = S("m1"), 0.25
    while t < S("hush"):
        put(tick(0.22), t); t += gap; gap = max(0.07, gap * 0.9)
    for k in ("m1", "m2", "m3", "m4", "m5", "m6"):
        put(thump(60, 0.3, 0.9), S(k), 0.8)
    # silence (hush), then the reveal, in slow motion: DONG ... DONG, and the floor drops away
    put(bell(0.55, 1.0), S("slidepov", 0.1), 1.0)
    put(reverse_swell(1.6, 0.8), S("slidepov", 1.9) - 1.6, 0.8)
    put(bell(0.5, 1.0), S("slidepov", 1.9), 1.0)
    put(braam(2.4, 29.1) * 0.8, S("slidepov", 1.9), 0.8)
    put(drone(S("cardD") - S("slidepov", 1.9) - 0.4, (36.7, 55.0), 0.5), S("slidepov", 1.9), 0.4)   # (shorter: the sub lingered into the warm chord)
    put(whoosh(0.8, rev=True), S("slideext", 1.0), 0.6)
    put(whoosh(1.0), S("slideext", 1.5), 0.8)
    # IT WAS NEVER AN ACCIDENT
    put(braam(3.0), S("cardD"), 1.0)
    # the fog, and a glimpse of something green: the score opens for the first time
    put(sfx.synth_air(S("ashvox") - S("ladder") + 0.3), S("ladder"), 0.4)
    put(sfx.synth_riser(S("ladder", 1.25) - S("ladder", 0.0)) * 0.5, S("ladder"), 0.5)
    put(pad([146.8, 185.0, 220.0, 293.7], 3.6, 0.25), S("ladder", 1.2), 0.5)   # D major, the first warm chord
    put(reverb(st(note("block.note_block.chime", NB(15), 0.7)), 3.0, 0.6), S("ladder", 1.25), 0.4)
    # the title: the song as four hits, then once more on the note block, far away
    for dt, semi in song:
        put(braam(1.6 if dt < 1.9 else 3.0, 36.71 * 2 ** ((semi - 8) / 12)), S("title", 0.6) + dt, 0.9)
    put(drone(S("pre_sting") - S("title", 0.6) + 1.0, (36.7, 73.4, 110.0), 0.45), S("title", 0.6), 0.5)
    for dt, semi in song:
        x = note("block.note_block.harp", NB(semi + 12), 0.6)
        x[: int(0.035 * SR)] *= np.linspace(0, 1, int(0.035 * SR))   # (a softer attack: it jumped out after the hits)
        put(reverb(st(x), 3.4, 0.75), S("title", 3.4) + dt * 0.9, 0.3)
    # after the title: two bells, very far away
    put(bell(0.6, 0.7, far=True), S("sting", 0.3), 0.8)
    put(bell(0.6, 0.7, far=True), S("sting", 1.3), 0.8)
    # the voices
    if vox:
        for v in edl["vox"]:
            x = load_vox(v["id"], v.get("far"))
            if v.get("room"):   # more of the room on this one (Ash's last line read close-miked next to the others)
                x = reverb(x, 1.4, v["room"], damp=3200)
            put(x, at(T, v["at"]), 0.85)
    mix = mix[: int(total * SR)]
    # hard cut to silence at the hush and the very end (trailer silences are part of the score)
    for k in ("hush",):
        a, b = int(S(k) * SR), int((S(k) + T[k][1]) * SR)
        ramp = np.linspace(1, 0, 240)
        mix[a: a + 240] *= ramp[:, None]; mix[a + 240: b] = 0
    peak = np.abs(mix).max()
    return mix * (0.95 / peak) if peak > 0.95 else mix


# ---------------------------------------------------------------- main
def sheet(edl, T):
    tiles = []
    for s in edl["seq"]:
        if "black" in s:
            continue
        mid = int(round(s["t0"] * FPS * s.get("slow", 1) + s["dur"] * FPS / 2))
        d, *_ = render_clip(edl, s, 640, 360, frames=[mid])
        tiles.append((s["id"], Image.open(d / f"f{mid:05d}.png").convert("RGB")))
    cols = 4; rows = (len(tiles) + cols - 1) // cols
    im = Image.new("RGB", (cols * 640, rows * 390), (20, 20, 20)); dr = ImageDraw.Draw(im)
    for k, (i, t) in enumerate(tiles):
        x, y = (k % cols) * 640, (k // cols) * 390
        im.paste(t, (x, y + 30)); dr.text((x + 6, y + 6), i, fill=(255, 230, 0))
    p = WORK / "sheet.jpg"; im.save(p, quality=88); print(p)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("edl")
    ap.add_argument("--sheet", action="store_true")
    ap.add_argument("--only", choices=["vox", "novox"])
    ap.add_argument("--audio", action="store_true", help="re-make only the mix and re-mux it into the existing cuts")
    a = ap.parse_args()
    edl = json.loads(pathlib.Path(a.edl).read_text())
    WORK.mkdir(parents=True, exist_ok=True)
    T, total = seg_times(edl)
    if a.sheet:
        return sheet(edl, T)
    print(f"{edl['name']}: {total:.1f} s, {len(edl['seq'])} segments")
    if a.audio:
        for vox, suffix in ((True, ""), (False, "_novox")):
            out = HERE / "out" / f"{edl['name']}{suffix}.mp4"
            wav = WORK / f"mix_{'v' if vox else 'q'}.wav"
            write_wav(wav, score(edl, T, total, vox))
            tmp = out.with_suffix(".tmp.mp4")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(out), "-i", str(wav), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                            "-c:a", "aac", "-b:a", "256k", "-af", "loudnorm=I=-14:TP=-1.2:LRA=14", "-ar", str(SR), "-t", f"{total:.3f}", str(tmp)], check=True)
            tmp.replace(out); print("re-muxed", out)
        return
    (HERE / "out").mkdir(exist_ok=True)
    if a.only != "novox":
        assemble(edl, T, total, True, HERE / "out" / f"{edl['name']}.mp4")
    if a.only != "vox":
        assemble(edl, T, total, False, HERE / "out" / f"{edl['name']}_novox.mp4")


if __name__ == "__main__":
    main()
