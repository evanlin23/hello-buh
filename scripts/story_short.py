"""Build a vertical cinematic STORY Short (docs/stories.md, docs/story_craft.md) from a movie-engine recording and its
story folder: the voiced cast on their `line` marks, the story's own caption chunks, the game's chat lines, a quiet score.

    python3 scripts/story_short.py stories/dog_hill              -> out/<stunt>.mp4  (1080x1920, 30 fps)
    python3 scripts/story_short.py stories/dog_hill --no-render  (re-mix and re-caption over the frames already rendered)
    python3 scripts/story_short.py stories/dog_hill --chunk 3/12 (Actions: one slice of the picture)
    python3 scripts/story_short.py stories/dog_hill --segments segs

story.json (v2): `stunt`, `caption` (the hook at the top for the first seconds), `key_color`, `cast.<who>.color`,
`lines[].id/who/text` (` / ` = caption chunks, CAPS = key words). The stunt marks every voiced line as
`line` {who, vox: <line id>, dur} and every chat message as `chat` {text, color}. Voices: stories/<name>/vox/<id>.wav
(cut Gemini takes). Optional `score`: {"notes": [...]} is not needed; the score is made here (note-block harp motif in a
hall, a soft pad, silence on `hush` marks, a swell on `swell` marks).
The picture is rendered exactly as ai_short.py does it (same slices, same FRAMES env), so the same Actions split works.
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
import trailer as T   # noqa: E402
import sfx            # noqa: E402
from ai_short import mark_time, read_wav, place, ass_time, bgr   # noqa: E402

SR = T.SR
W, H, FPS = 1080, 1920, 30


def harp(semis, level=0.5):
    """A note-block harp note (the game's own sample), semis from F#3 (0) to F#5 (24)."""
    return T.st(T.note("block.note_block.harp", T.NB(semis), level))


def score(total, lines, hushes, swells):
    """A slow note-block lullaby in D (original), a soft low pad, silence over each `hush` span, a swell into each `swell`."""
    mix = np.zeros((int((total + 6) * SR), 2), np.float32)
    # the motif (semitones from F#3): D4 F#4 A4 F#4 | E4 A4 G4 F#4 | D4 F#4 A4 D5 | C#5 A4 E4 _
    D4, E4, Fs4, G4, A4, B4, Cs5, D5 = 8, 10, 12, 13, 15, 17, 19, 20
    phrase = [D4, Fs4, A4, Fs4, E4, A4, G4, Fs4, D4, Fs4, A4, D5, Cs5, A4, E4, None,
              B4 - 12 + 12, Fs4, D4, Fs4, G4, B4, A4, Fs4, E4, Fs4, G4, A4, Fs4, E4, D4, None]
    beat = 0.62
    t, k = 0.15, 0
    def hushed(t):
        return any(a - 0.3 <= t < b for a, b in hushes)
    while t < total - 0.2:
        n = phrase[k % len(phrase)]
        if n is not None and not hushed(t):
            lvl = 0.16 + 0.05 * min(1, t / 20)
            place(mix, harp(n, lvl), t)
            if k % 4 == 0:
                place(mix, harp(n - 12 if n >= 12 else n, lvl * 0.55), t)
        k += 1; t += beat
    # pad: D major / B minor / G / A, two bars each, under everything but the hushes
    chords = [(73.42, 146.83, 220.0, 293.66), (61.74, 123.47, 185.0, 293.66), (49.0, 98.0, 196.0, 246.94), (55.0, 110.0, 164.81, 277.18)]
    bar = beat * 8
    t, i = 0.0, 0
    while t < total:
        place(mix, T.pad(list(chords[i % 4]), bar + 1.2, 0.07), t)
        t += bar; i += 1
    for a, b in hushes:
        i0, i1 = int(a * SR), int(b * SR)
        f = np.linspace(1, 0, int(0.4 * SR))
        mix[i0:i0 + len(f)] *= f[:, None]; mix[i0 + len(f):i1] = 0
        g = np.linspace(0, 1, int(0.8 * SR)); mix[i1:i1 + len(g)] *= g[:, None]
    mix = T.reverb(mix, 3.2, 0.4)[: len(mix)]
    for s in swells:
        place(mix, T.reverse_swell(1.0, 0.25), s - 1.0)
    return mix


def captions(story, lines, chats, end, path):
    """Each line's own chunks (` / `), timed by characters across the voice, CAPS words in the key colour (the
    speaker's colour for characters); the chat lines as the game draws them (bottom-left, yellow), scaled for a phone;
    the hook (story.caption) at the top for the opening seconds."""
    cast = story.get("cast", {})
    key = story.get("key_color", "#FFD84A")
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Schibsted Grotesk Black,92,&H00FFFFFF,&H00FFFFFF,&H00101010,&H8C000000,0,0,0,0,100,100,1,0,1,7,4,5,70,70,0,1
Style: Hook,Schibsted Grotesk Black,70,&H00FFFFFF,&H00FFFFFF,&H00101010,&H8C000000,0,0,0,0,100,100,1,0,1,6,3,8,70,70,170,1
Style: Who,Schibsted Grotesk Black,46,&H00FFFFFF,&H00FFFFFF,&H00101010,&H8C000000,0,0,0,0,100,100,3,0,1,4,2,5,70,70,0,1
Style: Chat,DejaVu Sans Mono,50,&H0055FFFF,&H0055FFFF,&H00202020,&H90000000,1,0,0,0,100,100,0,0,3,10,0,1,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    pop = r"\fscx84\fscy84\t(0,80,\fscx105\fscy105)\t(80,150,\fscx100\fscy100)"
    byid = {l["id"]: l for l in story["lines"]}
    for t, who, vox, dur in lines:
        ln = byid[vox]
        c = cast.get(ln.get("who", "N"), {})
        is_char = c.get("role") == "character"
        col = c.get("color", "#FFFFFF")
        base = bgr(col) if is_char else "&H00FFFFFF"
        kc = bgr(key) if not is_char else bgr(col)
        chunks = [ch.strip() for ch in ln["text"].split(" / ")]
        total_chars = sum(len(ch) + 1 for ch in chunks)
        lead, speech = 0.06, dur * 0.95
        c0 = 0
        for j, ch in enumerate(chunks):
            a_ = t + lead + speech * c0 / total_chars
            c0 += len(ch) + 1
            b_ = t + lead + speech * c0 / total_chars if j + 1 < len(chunks) else t + dur + 0.2
            words = []
            for w in ch.split():
                core = w.strip("?!.,'\"")
                hot = core.isupper() and len(core) > 1 or core in ("I",) and False
                words.append(f"{{\\1c{kc}}}{w.upper()}{{\\1c{base}}}" if hot else w.upper())
            txt = f"{{\\1c{base}}}" + " ".join(words)
            ev.append(f"Dialogue: 1,{ass_time(a_)},{ass_time(max(b_, a_ + 0.3))},Cap,,0,0,0,,{{\\pos({W // 2},{int(H * 0.70)}){pop}}}{txt}")
        if is_char:   # who's talking, small, over the caption
            ev.append(f"Dialogue: 1,{ass_time(t)},{ass_time(t + dur + 0.2)},Who,,0,0,0,,{{\\pos({W // 2},{int(H * 0.70) - 92})\\1c{bgr(col)}\\fad(120,120)}}{c.get('name', who).split(' (')[0].upper()}")
    for t, text, hold in chats:   # the game's chat line: yellow, a dark box, bottom-left over the hotbar area
        ev.append(f"Dialogue: 2,{ass_time(t)},{ass_time(t + hold)},Chat,,0,0,0,,{{\\pos(60,{int(H * 0.86)})\\an1\\fad(0,300)}}{text}")
    hook = story.get("hook")
    if hook:
        first = min([t for t, *_ in lines] + [end])
        ev.append(f"Dialogue: 2,{ass_time(0.0)},{ass_time(max(first + 2.6, 2.8))},Hook,,0,0,0,,{{\\fad(0,250)}}{hook}")
    pathlib.Path(path).write_text(head + "\n".join(ev) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("story")
    ap.add_argument("--no-render", action="store_true")
    ap.add_argument("--chunk", help="i/N: render only slice i of N of the picture and encode it (Actions)")
    ap.add_argument("--segments", help="a folder of seg_*.mp4 slices: build the Short from them instead of frames")
    o = ap.parse_args()
    sd = pathlib.Path(o.story)
    story = json.loads((sd / "story.json").read_text())
    stunt = story["stunt"]
    work = HERE / "work" / sd.name
    work.mkdir(parents=True, exist_ok=True)
    rec_path = HERE / "work" / f"{stunt}.rec.json"
    tl = json.loads(rec_path.read_text())["timeline"]
    edit = json.loads(subprocess.run(["node", "-e", f"process.stdout.write(JSON.stringify(require('./stunts/{stunt}').edit||{{}}))"], cwd=HERE, capture_output=True, text=True, check=True).stdout)
    a = mark_time(tl, edit.get("startAt", "start:0"))
    b = mark_time(tl, edit.get("endAfter", "end_scene:0"))
    slows = [(mark_time(tl, f"{m}:{x0}"), mark_time(tl, f"{m}:{x1}"), k) for m, x0, x1, k in edit.get("slowmo", [])]

    def omap(tr):
        o_ = tr - a
        for s0, s1, k in slows:
            if tr > s0:
                o_ += (min(tr, s1) - s0) * (k - 1)
        return o_
    total = omap(b)
    fdir, sdir = work / "frames", work / "frames_slow"
    f0, f1 = int(round(a * FPS)), int(round(b * FPS))
    seq, f = [], f0
    while f <= f1:
        tr = f / FPS
        sw = next(((i, s0, s1, k) for i, (s0, s1, k) in enumerate(slows) if s0 <= tr < s1), None)
        if sw:
            i, s0, s1, k = sw
            sf = FPS * k
            seq += [(sf, j, sdir / str(i) / f"f{j:05d}.png") for j in range(int(s0 * sf), int(s1 * sf))]
            f = int(round(s1 * FPS)); continue
        seq.append((FPS, f, fdir / f"f{f:05d}.png")); f += 1

    def render(items):
        groups = {}
        for fps_, j, q in items:
            groups.setdefault((fps_, q.parent), []).append(j)
        for (fps_, d), js in groups.items():
            env = {**os.environ, "FRAMES": ",".join(map(str, js)), "NO_BARS": "1"}
            subprocess.run(["node", "render.js", str(rec_path), str(d), str(fps_), str(W), str(H)], cwd=HERE, env=env, check=True)

    def encode(items, out_mp4, crf):
        lst = out_mp4.with_suffix(".txt")
        lst.write_text("".join(f"file '{q}'\nduration {1 / FPS:.6f}\n" for _, _, q in items if q.exists()))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-r", str(FPS),
                        "-c:v", "libx264", "-preset", "medium", "-crf", str(crf), "-pix_fmt", "yuv420p", str(out_mp4)], check=True)

    vid = work / "video.mp4"
    if o.chunk:
        i, n = map(int, o.chunk.split("/"))
        per = -(-len(seq) // n)
        part = seq[i * per:(i + 1) * per]
        render(part)
        segs = work / "segs"; segs.mkdir(exist_ok=True)
        encode(part, segs / f"seg_{i:02d}.mp4", 12)
        print(f"chunk {i}/{n}: {len(part)} frames")
        return
    if o.segments:
        segs = sorted(pathlib.Path(o.segments).glob("seg_*.mp4"))
        lst = work / "segs.txt"
        lst.write_text("".join(f"file '{q.resolve()}'\n" for q in segs))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(vid)], check=True)
    else:
        if not o.no_render:
            subprocess.run(["rm", "-rf", str(fdir), str(sdir)], check=True)
            render(seq)
        encode(seq, vid, 17)
    # the game's sound
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
    lines = [(omap(e["t"] / 1000), e["who"], e["vox"], e.get("dur", 2.0)) for e in tl if e["event"] == "line"]
    chats = [(omap(e["t"] / 1000), e["text"], e.get("hold", 2.4)) for e in tl if e["event"] == "chat"]
    hush = [omap(e["t"] / 1000) for e in tl if e["event"] == "hush"]
    hush_end = [omap(e["t"] / 1000) for e in tl if e["event"] == "hush_end"]
    hushes = list(zip(hush, hush_end))
    swells = [omap(e["t"] / 1000) for e in tl if e["event"] == "swell"]
    vox_mix = np.zeros((int((total + 6) * SR), 2), np.float32)
    env = np.zeros(len(vox_mix), np.float32)
    for t, who, vox, dur in lines:
        x = read_wav(sd / "vox" / f"{vox}.wav", af="deesser=i=0.5:m=0.5:f=0.5,highpass=f=70")
        x = sfx.norm(x, 0.85)
        x = T.reverb(x, 0.5, 0.07, damp=3800)[: len(x) + int(0.3 * SR)]
        place(vox_mix, x, t, 1.0)
        i = int(t * SR); env[i:i + len(x)] = 1
    music = score(total, lines, hushes, swells)[: len(vox_mix)]
    k = int(0.15 * SR)
    duck = np.convolve(env, np.ones(k) / k, mode="same")
    music /= max(1e-6, np.abs(music).max()) / 0.9
    music *= (1 - 0.45 * duck)[:, None]
    gm = np.zeros_like(vox_mix); gm[: min(len(g), len(gm))] = g[: len(gm)]
    gm *= (1 - 0.4 * duck)[:, None]
    mix = vox_mix * 1.0 + music * 0.32 + gm * 0.6
    mix = mix[: int((total + 0.05) * SR)]
    mix /= max(1e-6, np.abs(mix).max()) / 0.95
    nf = int(0.25 * SR); mix[-nf:] *= np.linspace(1, 0, nf)[:, None]
    wav = work / "mix.wav"
    T.write_wav(wav, mix)
    ass = work / "captions.ass"
    captions(story, lines, chats, total, ass)
    out = HERE / "out" / f"{stunt}.mp4"
    out.parent.mkdir(exist_ok=True)
    fonts = work / "fonts"; fonts.mkdir(exist_ok=True)
    for p in list((HERE / "assets" / "fonts").glob("*.ttf")) + list((HERE / "fonts").glob("*.ttf")):
        (fonts / p.name).write_bytes(p.read_bytes())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(vid), "-i", str(wav), "-filter_complex",
                    f"[0:v]unsharp=5:5:0.45:5:5:0.0[sh];[sh]ass={ass}:fontsdir={fonts}[v]",
                    "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-maxrate", "12M", "-bufsize", "24M", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-shortest", str(out)], check=True)
    print("wrote", out, f"({total:.1f} s)")


if __name__ == "__main__":
    main()
