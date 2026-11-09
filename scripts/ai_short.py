"""Build a vertical AI-dilemma Short (docs/ai_dilemma.md) from a recorded stunt and its episode folder.

    python3 scripts/ai_short.py episodes/thin_ice            -> out/<stunt>.mp4  (1080x1920, 30 fps)
    python3 scripts/ai_short.py episodes/thin_ice --no-render (re-mix and re-caption over the frames already rendered)

episode.json: {"stunt": "ai_thin_ice", "names": {"GPT": ["ChatGPT", "#19c37d"], ...},
               "keywords": {"n1": ["BROTHER", "FROZEN LAKE"], ...}, "hero": "g1"}
The stunt marks every voiced line as `line` {who, text, dur, vox}; the clip is work/<ep>/vox/<vox>.wav (scripts/tts.py).
- Picture: render.js over the window start..end_scene, full frame (no letterbox: a phone is the frame).
- Captions (ASS, libass): the line's keywords pop one at a time, big Bebas Neue in the middle, timed by where each word
  falls in the line; while an AI talks its name sits at the top in its colour. No full subtitles: the voice carries it.
- Sound: the game's own sounds (audio.py), every voice on its mark, and a made score: a cold low pad and a heartbeat
  under the prompt and the four answers, a hit as the hero starts, then strings-like saw chords swelling (Dm Bb F C)
  to the end, ducked under the voices.
"""
import argparse
import json
import os
import pathlib
import subprocess
import sys

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE / "scripts"))
sys.path.insert(0, str(HERE))
import trailer as T   # noqa: E402  (the score kit: saw_stack, braam, drone, reverb, heartbeat, reverse_swell)
import sfx            # noqa: E402

SR = T.SR
W, H, FPS = 1080, 1920, 30


def mark_time(tl, spec):
    ev, _, off = spec.rpartition(":") if ":" in spec else (spec, "", "0")
    ts = [e["t"] / 1000 for e in tl if e["event"] == ev]
    if not ts:
        raise SystemExit(f"no '{ev}' mark")
    return ts[0] + float(off or 0)


def read_wav(p, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "2", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def place(mix, x, at, gain=1.0):
    i = int(at * SR)
    if i < 0:
        x, i = x[-i:], 0
    n = min(len(x), len(mix) - i)
    if n > 0:
        mix[i:i + n] += x[:n] * gain


def chord_swell(freqs, dur, level):
    """Strings-ish: detuned saws through a slowly opening low-pass, slow attack, long release."""
    t = np.arange(int(dur * SR)) / SR
    y = T.saw_stack(freqs, dur, lambda t: 500 + 1800 * np.clip(t / dur, 0, 1)) * level
    y *= np.minimum(1, t / 1.4) * np.minimum(1, (dur - t) / 0.8).clip(0)
    return T.st(y)


def organ(f, dur, level=0.2, attack=0.06, release=0.9, bright=1.0):
    """A pipe organ note: additive ranks (16' 8' 4' 2 2/3' 2' 1 3/5' 1'), a slow tremulant, wind noise in the attack."""
    n = int((dur + release) * SR); t = np.arange(n) / SR
    ranks = ((0.5, 0.55), (1, 1.0), (2, 0.6 * bright), (3, 0.28 * bright), (4, 0.32 * bright), (5, 0.12 * bright), (8, 0.14 * bright))
    y = sum(w * np.sin(2 * np.pi * f * r * t * (1 + 0.0009 * np.sin(2 * np.pi * 5.6 * t))) for r, w in ranks if f * r < 9000)
    env = np.minimum(1, t / attack) * np.where(t < dur, 1.0, np.exp(-(t - dur) / (release / 3)))
    y = y * env * (1 + 0.06 * np.sin(2 * np.pi * 5.6 * t))
    y += sfx.onepole(T.RNG.standard_normal(n), 2500) * np.exp(-t / 0.05) * 0.05
    return T.st(y / 3.0 * level)


def score(total, hero_at, lines, quiet=None):
    """quiet = (q0, q1): silence before the turn. The motif: an ostinato A4 E5 over D (Interstellar's clock, our notes)."""
    mix = np.zeros((int((total + 6) * SR), 2), np.float32)
    q0, q1 = quiet or (hero_at - 0.01, hero_at)
    beat = 0.46
    A4, E5, F5, D5, C5 = 440.0, 659.26, 698.46, 587.33, 523.25
    # 1. the clock: soft, high, under the prompt and the answers (the ostinato changes its top note every 8 beats)
    tops = [E5, E5, F5, E5, D5, E5, F5, C5]
    k, t = 0, 0.25
    while t < q0 - 0.1:
        lvl = 0.05 + 0.03 * min(1, t / max(1, q0))
        place(mix, organ(A4 if k % 2 == 0 else tops[(k // 8) % len(tops)], beat * 0.8, lvl, 0.02, 0.5, 0.4), t)
        k += 1; t += beat
    # a low D pedal and drone under it all, cut at the silence
    place(mix, organ(73.42, max(0.5, q0 - 0.6), 0.10, 2.5, 0.6, 0.5), 0.0)
    place(mix, T.drone(max(1, q0), (36.71, 55.0), 0.12), 0.0)
    # 2. the silence, then a reversed swell into the hit
    place(mix, T.reverse_swell(1.1, 0.55), hero_at - 1.1)
    place(mix, T.braam(3.4, 36.71), hero_at, 0.6)
    # 3. the full organ: Dm Bb F C (voiced low and wide), the ostinato back on top, louder each bar
    prog = [(73.42, 146.83, 220.0, 293.66, 349.23), (58.27, 116.54, 174.61, 293.66, 349.23),
            (87.31, 174.61, 261.63, 349.23, 440.0), (65.41, 130.81, 196.0, 329.63, 392.0)]
    rest = total - hero_at + 1.0
    bar = rest / len(prog)
    for i, ch in enumerate(prog):
        st = hero_at + 0.15 + i * bar
        for f in ch:
            place(mix, organ(f, bar + (1.6 if i == len(prog) - 1 else 0.1), 0.07 + 0.03 * i, 0.25, 2.5 if i == len(prog) - 1 else 0.5, 0.6 + 0.15 * i), st)
        t = st
        while t < st + bar - 0.05:
            place(mix, organ(A4 * (2 if i >= 2 else 1), beat * 0.8, 0.06 + 0.03 * i, 0.02, 0.4, 0.7), t)
            place(mix, organ(E5 * (2 if i >= 2 else 1), beat * 0.8, 0.05 + 0.03 * i, 0.02, 0.4, 0.7), t + beat / 2)
            t += beat
    mix = T.reverb(mix, 3.6, 0.42)[: len(mix)]
    # the silence is total (the reverb tail of the clock dies before the hit)
    i0, i1 = int(q0 * SR), int((hero_at - 1.1) * SR)
    if i1 > i0:
        fade = np.linspace(1, 0, min(int(0.35 * SR), i1 - i0))
        mix[i0:i0 + len(fade)] *= fade[:, None]; mix[i0 + len(fade):i1] = 0
    return mix


def ass_time(s):
    s = max(0, s)
    return f"{int(s // 3600)}:{int(s % 3600 // 60):02d}:{s % 60:05.2f}"


def bgr(col, a="00"):
    c = col.lstrip("#")
    return f"&H{a}{c[4:6]}{c[2:4]}{c[0:2]}"


def captions(lines, shots, names, keywords, end, path, hook=None):
    """Every word, two or three at a time, timed by where they fall in the line (by characters), the key words in the
    speaker's colour (white for the narrator: yellow keys). lines: [(t, who, text, dur, vox)] in output seconds."""
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Bebas Neue,150,&H00FFFFFF,&H00FFFFFF,&H00000000,&H78000000,0,0,0,0,100,100,3,0,1,8,5,5,70,70,0,1
Style: Hook,Bebas Neue,132,&H00FFFFFF,&H00FFFFFF,&H00000000,&H78000000,0,0,0,0,100,100,4,0,1,9,5,8,60,60,190,1
Style: Name,Bebas Neue,110,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,6,0,1,7,3,8,60,60,250,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    pop = r"\fscx82\fscy82\t(0,80,\fscx106\fscy106)\t(80,150,\fscx100\fscy100)"
    for t, who, text, dur, vox in lines:
        keycol = bgr(names[who][1]) if who in names and who != "Grok" else "&H0040D8FF"   # (Grok and the narrator: gold keys)
        keys = set()
        for k in keywords.get(vox, []):
            keys |= {w.strip("?!.,'").lower() for w in k.split()}
        words = text.split()
        chunks, cur = [], []
        for w in words:   # 2-3 words a chunk, a break after punctuation
            cur.append(w)
            if len(cur) == 3 or (len(cur) >= 2 and len(" ".join(cur)) > 13) or w[-1] in ".,?!":
                chunks.append(cur); cur = []
        if cur:
            chunks.append(cur)
        total_chars = sum(len(w) + 1 for w in words)
        lead, speech = 0.08, dur * 0.94
        c0 = 0
        for j, ch in enumerate(chunks):
            a_ = t + lead + speech * c0 / total_chars
            c0 += sum(len(w) + 1 for w in ch)
            b_ = t + lead + speech * c0 / total_chars if j + 1 < len(chunks) else t + dur + 0.25
            txt = " ".join((f"{{\\1c{keycol}}}{w.upper()}{{\\1c&H00FFFFFF&}}" if w.strip("?!.,'").lower() in keys else w.upper()) for w in ch)
            ev.append(f"Dialogue: 1,{ass_time(a_)},{ass_time(max(b_, a_ + 0.3))},Cap,,0,0,0,,{{\\pos({W // 2},{int(H * 0.71)}){pop}}}{txt}")
    # the hook: the question, big at the top, over the prompt (cenotshi opens on a single word; ours asks the question)
    if hook:
        first_ai = min([t for t, who, *_ in lines if who in names] + [end])
        ev.append(f"Dialogue: 2,{ass_time(0.0)},{ass_time(min(first_ai, 9.5) - 0.1)},Hook,,0,0,0,,{{\\fad(0,250)\\fscx90\\fscy90\\t(0,200,\\fscx100\\fscy100)}}{hook}")
    # the speaker's name card at the top while an AI talks (fades in on its line, out at the next cut)
    for t, who, text, dur, vox in lines:
        if who not in names:
            continue
        name, col = names[who]
        nxt = min([s for s, _ in shots if s > t + 0.2] + [end])
        ev.append(f"Dialogue: 0,{ass_time(t)},{ass_time(nxt - 0.05)},Name,,0,0,0,,{{\\fad(180,120)\\1c{bgr(col)}\\3c&H000000&}}{name.upper()}")
    pathlib.Path(path).write_text(head + "\n".join(ev) + "\n")


def sidebar(order, names, state, path):
    """The lineup down the left edge, cenotshi-style: a white strip with each AI's mark and name. The mark is
    assets/logos/<who>.png if the owner put one there (their call: real logos are trademarks), else our own screen
    glyph (scripts/make_skins.py). state: {who: 'idle' | 'on' | 'out' | 'hero'}: the speaker grows with a coloured
    ring, the ones that refused grey out with a red cross, the hero glows gold."""
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    import make_skins as MS
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    S, gap, x0, top = 104, 44, 30, int(H * 0.27)
    font = ImageFont.truetype(str(HERE / "fonts" / "BebasNeue_400Regular.ttf"), 30)
    sw = S + 2 * 18
    sh = len(order) * (S + gap) + 10
    strip = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    ImageDraw.Draw(strip).rounded_rectangle([0, 0, sw - 1, sh - 1], radius=28, fill=(250, 250, 252, 236))
    shadow = Image.new("RGBA", (sw + 40, sh + 40), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([20, 24, sw + 19, sh + 23], radius=28, fill=(0, 0, 0, 110))
    im.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(10)), (x0 - 20, top - 20))
    im.alpha_composite(strip, (x0, top))
    y = top + 14
    for who in order:
        skin = {"GPT": "ai_gpt", "DeepSeek": "ai_deep", "Claude": "ai_claude", "Gemini": "ai_gemini", "Grok": "ai_grok"}[who]
        c = MS.CHARS[skin]
        st = state.get(who, "idle")
        big = st in ("on", "hero")
        s = int(S * (1.14 if big else 1.0))
        logo = HERE / "assets" / "logos" / f"{who}.png"
        if logo.exists():
            tile = Image.open(logo).convert("RGBA").resize((s, s), Image.LANCZOS)
        else:
            tile = Image.new("RGBA", (s, s), (0, 0, 0, 0)); d = ImageDraw.Draw(tile)
            scr = (14, 14, 16) if who == "Grok" else (66, 133, 244) if c["screen"] == "grad" else MS.hexc(c["screen"])[:3]
            d.rounded_rectangle([0, 0, s - 1, s - 1], radius=s // 4, fill=scr + (255,))
            if c["screen"] == "grad":
                for yy in range(5, s - 5):
                    d.line([(7, yy), (s - 8, yy)], fill=MS.hexc(MS.GRAD[min(5, int(yy / s * 6))]))
            px = (s - 22) // 6
            for gy, row in enumerate(MS.GLYPHS[c["glyph"]]):
                for gx, ch in enumerate(row):
                    if ch == "#":
                        d.rectangle([11 + gx * px, 11 + gy * px, 11 + (gx + 1) * px - 1, 11 + (gy + 1) * px - 1], fill=MS.hexc(c["ink"]))
        if st == "out":
            g = tile.convert("LA").convert("RGBA"); g.putalpha(tile.getchannel("A").point(lambda v: int(v * 0.5))); tile = g
            d = ImageDraw.Draw(tile)
            d.line([(12, 12), (s - 13, s - 13)], fill=(225, 40, 40, 255), width=11); d.line([(s - 13, 12), (12, s - 13)], fill=(225, 40, 40, 255), width=11)
        cx = x0 + sw // 2
        if big:   # a ring in the speaker's colour (gold for the hero), and a glow
            col = (255, 196, 60) if st == "hero" else MS.hexc(names[who][1])[:3]
            glow = Image.new("RGBA", (s + 70, s + 70), (0, 0, 0, 0))
            ImageDraw.Draw(glow).rounded_rectangle([35, 35, s + 34, s + 34], radius=s // 4, fill=col + (210,))
            im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(14)), (cx - s // 2 - 35, y - 35))
            ring = Image.new("RGBA", (s + 14, s + 14), (0, 0, 0, 0))
            ImageDraw.Draw(ring).rounded_rectangle([0, 0, s + 13, s + 13], radius=s // 4 + 5, outline=col + (255,), width=6)
            im.alpha_composite(ring, (cx - s // 2 - 7, y - 7))
        im.alpha_composite(tile, (cx - s // 2, y))
        label = names[who][0].upper()
        d = ImageDraw.Draw(im)
        tw = d.textlength(label, font=font)
        d.text((cx - tw / 2, y + s + 2), label, font=font, fill=(120, 120, 128, 255) if st == "out" else (24, 24, 30, 255))
        y += s + gap - (s - S)
    im.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--no-render", action="store_true")
    o = ap.parse_args()
    ep = pathlib.Path(o.episode)
    cfg = json.loads((ep / "episode.json").read_text())
    stunt = cfg["stunt"]
    work = HERE / "work" / ep.name
    work.mkdir(parents=True, exist_ok=True)
    rec_path = HERE / "work" / f"{stunt}.rec.json"
    rec = json.loads(rec_path.read_text())
    tl = rec["timeline"]
    sys.path.insert(0, str(HERE / "stunts"))
    edit = json.loads(subprocess.run(["node", "-e", f"process.stdout.write(JSON.stringify(require('./stunts/{stunt}').edit||{{}}))"], cwd=HERE, capture_output=True, text=True, check=True).stdout)
    a = mark_time(tl, edit.get("startAt", "start:0"))
    b = mark_time(tl, edit.get("endAfter", "end_scene:0"))
    # slow motion (stunt.edit.slowmo: [[mark, from, to, factor]]): that window is rendered at FPS * factor and played at FPS
    slows = [(mark_time(tl, f"{m}:{x0}"), mark_time(tl, f"{m}:{x1}"), k) for m, x0, x1, k in edit.get("slowmo", [])]
    def omap(tr):   # recording seconds -> output seconds
        o, prev = tr - a, a
        for s0, s1, k in slows:
            if tr > s0:
                o += (min(tr, s1) - s0) * (k - 1)
        return o
    total = omap(b)
    fdir, sdir = work / "frames", work / "frames_slow"
    f0, f1 = int(round(a * FPS)), int(round(b * FPS))
    if not o.no_render:
        subprocess.run(["rm", "-rf", str(fdir), str(sdir)], check=True)
        env = {**os.environ, "FRAMES": ",".join(map(str, range(f0, f1 + 1))), "NO_BARS": "1"}
        subprocess.run(["node", "render.js", str(rec_path), str(fdir), str(FPS), str(W), str(H)], cwd=HERE, env=env, check=True)
    for i, (s0, s1, k) in enumerate(slows):
        d = sdir / str(i)
        if not d.exists():
            sf = FPS * k
            env = {**os.environ, "FRAMES": ",".join(map(str, range(int(s0 * sf), int(s1 * sf) + 1))), "NO_BARS": "1"}
            subprocess.run(["node", "render.js", str(rec_path), str(d), str(sf), str(W), str(H)], cwd=HERE, env=env, check=True)
    # the picture: a frame list (normal frames, the slow windows' frames in their place)
    seq, f = [], f0
    while f <= f1:
        tr = f / FPS
        sw = next(((i, s0, s1, k) for i, (s0, s1, k) in enumerate(slows) if s0 <= tr < s1), None)
        if sw:
            i, s0, s1, k = sw
            sf = FPS * k
            seq += [sdir / str(i) / f"f{j:05d}.png" for j in range(int(s0 * sf), int(s1 * sf))]
            f = int(round(s1 * FPS)); continue
        seq.append(fdir / f"f{f:05d}.png"); f += 1
    lst = work / "frames.txt"
    lst.write_text("".join(f"file '{q}'\nduration {1 / FPS:.6f}\n" for q in seq if q.exists()))
    vid = work / "video.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-r", str(FPS),
                    "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", str(vid)], check=True)
    # sound: the game's, stretched (and pitched down) inside the slow windows
    game = HERE / "work" / f"{stunt}.wav"
    if not game.exists() or game.stat().st_mtime < rec_path.stat().st_mtime:
        subprocess.run(["python3", "audio.py", str(rec_path), str(game)], cwd=HERE, check=True)
    graw = read_wav(game)
    parts, cur = [], a
    for s0, s1, k in slows:
        parts.append(graw[int(cur * SR):int(s0 * SR)])
        seg = graw[int(s0 * SR):int(s1 * SR)]
        idx = np.linspace(0, len(seg) - 1, int(len(seg) * k))
        parts.append(np.stack([np.interp(idx, np.arange(len(seg)), seg[:, c]) for c in (0, 1)], 1).astype(np.float32))
        cur = s1
    parts.append(graw[int(cur * SR):])
    g = np.concatenate(parts)
    lines = [(omap(e["t"] / 1000), e["who"], e["text"], e.get("dur", 2.0), e.get("vox")) for e in tl if e["event"] == "line"]
    shots = [(omap(e["t"] / 1000), e["name"]) for e in tl if e["event"] == "shot"]
    vox_mix = np.zeros((int((total + 6) * SR), 2), np.float32)
    env = np.zeros(len(vox_mix), np.float32)
    for t, who, text, dur, vox in lines:
        x = read_wav(work / "vox" / f"{vox}.wav")
        x = sfx.norm(x, 0.85)
        x = T.reverb(x, 0.45, 0.08, damp=3800)[: len(x) + int(0.3 * SR)]
        if who == cfg.get("hero_voice", "Grok"):
            x = T.reverb(x, 1.6, 0.18, damp=3000)[: len(x) + int(0.8 * SR)]   # the hero a little bigger: a hall
        place(vox_mix, x, t, 1.0)
        i = int(t * SR); env[i:i + len(x)] = 1
    hero_at = next((t for t, who, _, _, v in lines if v == cfg.get("hero")), total * 0.6)
    before = [t + d for t, w, _, d, v in lines if t < hero_at]
    quiet = (max(before) + 0.15, hero_at) if before else None
    import orchestra
    music = orchestra.epic_real(total, hero_at, quiet)[: len(vox_mix)]   # (score() above: the first, plainer organ score)
    # duck the music and the game under the voices (a 120 ms smoothed gate)
    k = int(0.12 * SR)
    duck = np.convolve(env, np.ones(k) / k, mode="same")
    music /= max(1e-6, np.abs(music).max()) / 0.9
    music *= (1 - 0.5 * duck)[:, None]
    gm = np.zeros_like(vox_mix); gm[: min(len(g), len(gm))] = g[: len(gm)]
    if quiet:   # the game hushes in the silence too (snow and wind only)
        gm[int(quiet[0] * SR):int(quiet[1] * SR)] *= 0.35
    gm *= (1 - 0.35 * duck)[:, None]
    mix = vox_mix * 1.0 + music * 0.55 + gm * 0.7
    mix = mix[: int((total + 0.05) * SR)]
    mix /= max(1e-6, np.abs(mix).max()) / 0.95
    wav = work / "mix.wav"
    T.write_wav(wav, mix)
    ass = work / "captions.ass"
    captions(lines, shots, cfg.get("names", {}), cfg.get("keywords", {}), total, ass, cfg.get("hook"))
    # the sidebar: a state per stretch (all lit for the prompt; the speaker big; who said no greyed with a cross)
    order = [w for w in ("GPT", "DeepSeek", "Claude", "Gemini", "Grok") if w in cfg.get("names", {})]
    states, done = [], []
    for t, who, _, _, _ in lines:
        if who in order and (not states or states[-1][1].get(who) not in ("on", "hero")):
            st = {w: ("out" if w in done else "idle") for w in order}
            st[who] = "hero" if who == "Grok" else "on"
            states.append((t, st))
            if who != "Grok":
                done.append(who)
    if not states or states[0][0] > 0:
        states.insert(0, (0.0, {w: "idle" for w in order}))
    pngs = []
    for i, (t, st) in enumerate(states):
        q = work / f"sidebar_{i}.png"
        sidebar(order, cfg.get("names", {}), st, q)
        pngs.append((t, states[i + 1][0] if i + 1 < len(states) else total + 1, q))
    inputs, chain, last = [], [], "0:v"
    for i, (t0, t1, q) in enumerate(pngs):
        inputs += ["-i", str(q)]
        chain.append(f"[{last}][{i + 2}:v]overlay=0:0:enable='between(t,{t0:.3f},{t1 - 0.001:.3f})'[s{i}]")
        last = f"s{i}"
    chain.append(f"[{last}]ass={ass}:fontsdir={HERE / 'fonts'}[v]")
    out = HERE / "out" / f"{stunt}.mp4"
    out.parent.mkdir(exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(vid), "-i", str(wav), *inputs, "-filter_complex", ";".join(chain),
                    "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-shortest", str(out)], check=True)
    print("wrote", out, f"({total:.1f} s)")


if __name__ == "__main__":
    main()
