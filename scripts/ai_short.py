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


def score(total, hero_at, lines):
    mix = np.zeros((int((total + 4) * SR), 2), np.float32)
    D2, A2 = 73.42, 110.0
    # the cold: a low D drone from the start to the hero, and a slow heartbeat under the four answers
    place(mix, T.drone(hero_at + 1.5, (D2 / 2, A2 / 2), 0.22), 0.0)
    first_ai = min([t for t, who, _ in lines if who not in ("Narrator", "Grok")] or [hero_at])
    t = first_ai
    while t < hero_at - 0.8:
        place(mix, T.heartbeat(0.5), t); t += 1.25
    # the turn: a swell into a hit as the hero starts, then the chords rise to the end
    place(mix, T.reverse_swell(1.4, 0.5), hero_at - 1.4)
    place(mix, T.braam(3.2, 36.71), hero_at, 0.55)
    prog = [(146.83, 174.61, 220.0), (116.54, 146.83, 174.61), (174.61, 220.0, 261.63), (130.81, 196.0, 164.81)]   # Dm Bb F C
    rest = total - hero_at + 2.5
    step = rest / len(prog)
    for k, ch in enumerate(prog):
        place(mix, chord_swell([f for f in ch], step + 1.2, 0.16 + 0.05 * k), hero_at + 0.2 + k * step)
        place(mix, chord_swell([f * 2 for f in ch], step + 1.2, 0.05 + 0.03 * k), hero_at + 0.2 + k * step)
    return T.reverb(mix, 2.8, 0.35)[: len(mix)]


def ass_time(s):
    s = max(0, s)
    return f"{int(s // 3600)}:{int(s % 3600 // 60):02d}:{s % 60:05.2f}"


def captions(lines, shots, names, keywords, end, path):
    """lines: [(t, who, text, dur, vox)] in output seconds; shots: [(t, name)]."""
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Key,Bebas Neue,190,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,4,0,1,9,4,5,60,60,0,1
Style: Name,Bebas Neue,120,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,6,0,1,7,3,8,60,60,250,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    pop = r"{\fscx70\fscy70\t(0,90,\fscx112\fscy112)\t(90,170,\fscx100\fscy100)}"
    for t, who, text, dur, vox in lines:
        ks = keywords.get(vox, [])
        low = text.lower()
        times = []
        for k in ks:
            i = low.find(k.lower().rstrip("?!."))
            times.append(t + dur * (max(0, i) / max(1, len(text))) * 0.92)
        for j, (k, a) in enumerate(zip(ks, times)):
            b = times[j + 1] if j + 1 < len(times) else min(a + 1.1, t + dur + 0.3)
            b = max(b, a + 0.45)
            ev.append(f"Dialogue: 1,{ass_time(a)},{ass_time(b)},Key,,0,0,0,,{{\\pos({W // 2},{int(H * 0.60)})}}{pop}{k.upper()}")
    # the speaker's name card at the top while an AI talks (fades in on its line, out at the next cut)
    for t, who, text, dur, vox in lines:
        if who not in names:
            continue
        name, col = names[who]
        nxt = min([s for s, _ in shots if s > t + 0.2] + [end])
        c = col.lstrip("#"); bgr = f"&H00{c[4:6]}{c[2:4]}{c[0:2]}"
        ev.append(f"Dialogue: 0,{ass_time(t)},{ass_time(nxt - 0.05)},Name,,0,0,0,,{{\\fad(180,120)\\1c{bgr}\\3c&H000000&}}{name.upper()}")
    pathlib.Path(path).write_text(head + "\n".join(ev) + "\n")


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
    total = b - a
    fdir = work / "frames"
    f0, f1 = int(round(a * FPS)), int(round(b * FPS))
    if not o.no_render:
        subprocess.run(["rm", "-rf", str(fdir)], check=True)
        env = {**os.environ, "FRAMES": f"{f0}-{f1}" if os.environ.get("FRAMES_RANGE") else ",".join(map(str, range(f0, f1 + 1))), "NO_BARS": "1"}
        subprocess.run(["node", "render.js", str(rec_path), str(fdir), str(FPS), str(W), str(H)], cwd=HERE, env=env, check=True)
    # the picture, from frame f0
    vid = work / "video.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-start_number", str(f0), "-i", str(fdir / "f%05d.png"),
                    "-frames:v", str(f1 - f0 + 1), "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", str(vid)], check=True)
    # sound
    game = HERE / "work" / f"{stunt}.wav"
    if not game.exists() or game.stat().st_mtime < rec_path.stat().st_mtime:
        subprocess.run(["python3", "audio.py", str(rec_path), str(game)], cwd=HERE, check=True)
    g = read_wav(game)[int(a * SR):]
    lines = [((e["t"] / 1000) - a, e["who"], e["text"], e.get("dur", 2.0), e.get("vox")) for e in tl if e["event"] == "line"]
    shots = [((e["t"] / 1000) - a, e["name"]) for e in tl if e["event"] == "shot"]
    vox_mix = np.zeros((int((total + 4) * SR), 2), np.float32)
    env = np.zeros(len(vox_mix), np.float32)
    for t, who, text, dur, vox in lines:
        x = read_wav(work / "vox" / f"{vox}.wav")
        x = sfx.norm(x, 0.85) if hasattr(sfx, "norm") else x
        x = T.reverb(x, 0.45, 0.08, damp=3800)[: len(x) + int(0.3 * SR)]
        place(vox_mix, x, t, 1.0)
        i = int(t * SR); env[i:i + len(x)] = 1
    hero_at = next((t for t, who, _, _, v in lines if v == cfg.get("hero")), total * 0.6)
    music = score(total, hero_at, [(t, w, v) for t, w, _, _, v in lines])[: len(vox_mix)]
    # duck the music and the game under the voices (a 120 ms smoothed gate)
    k = int(0.12 * SR)
    duck = np.convolve(env, np.ones(k) / k, mode="same")
    music *= (1 - 0.55 * duck)[:, None]
    gm = np.zeros_like(vox_mix); gm[: min(len(g), len(gm))] = g[: len(gm)]
    gm *= (1 - 0.35 * duck)[:, None]
    mix = vox_mix * 1.0 + music * 0.55 + gm * 0.7
    mix = mix[: int((total + 0.05) * SR)]
    mix /= max(1e-6, np.abs(mix).max()) / 0.95
    wav = work / "mix.wav"
    T.write_wav(wav, mix)
    ass = work / "captions.ass"
    captions(lines, shots, cfg.get("names", {}), cfg.get("keywords", {}), total, ass)
    out = HERE / "out" / f"{stunt}.mp4"
    out.parent.mkdir(exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(vid), "-i", str(wav), "-vf", f"ass={ass}:fontsdir={HERE / 'fonts'}",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-shortest", str(out)], check=True)
    print("wrote", out, f"({total:.1f} s)")


if __name__ == "__main__":
    main()
