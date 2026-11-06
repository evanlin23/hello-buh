"""Narrated story Shorts (docs/stories.md): the narration track and the big word-chunk captions, laid on the
recording's `line` marks. edit.py calls these when a stunt sets `edit.story`.

  narration_wav(story_dir, timeline, start, dur, out)   -> wav of every line at its mark (48 kHz mono)
  caption_concat(story_dir, timeline, start, dur, tmp)  -> ffconcat list of full-frame caption PNGs (60 fps steps)

Captions follow the owner's Roblox story channel (blocky-stories RULES.md "Captions"): a heavy grotesk
(Schibsted Grotesk Black, OFL, assets/fonts/), 2 or 3 words at a time, white with the key words (CAPS in the
script) in the story's key colour, a dark outline and a soft shadow, each chunk appearing on its own first word
with a quick pop. They sit in the lower middle of the game view: clear of the crosshair, above the hearts.
"""
import json
import math
import pathlib
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent
FONT = HERE / "assets" / "fonts" / "SchibstedGrotesk-Black.ttf"
W, H, BAND, GAME_H = 1080, 1920, 455, 1011
CAP_PX = 96
MAX_W = 900
CY = BAND + int(GAME_H * 0.70)          # caption block centre: below the crosshair, above the hearts
INK = (14, 12, 18, 255)
FPS = 60
POP = [0.84, 0.93, 1.02, 1.06, 1.03, 1.0]   # entrance scale per 60 fps frame (blocky post.pop, 0.1 s)


def _lines(story_dir):
    story = json.loads((pathlib.Path(story_dir) / "story.json").read_text())
    voice = json.loads((pathlib.Path(story_dir) / "voice" / "voice.json").read_text())
    return story, voice


def _marks(timeline, start):
    """[(seconds into the Short, line id)] for every `line` mark."""
    return [(e["t"] / 1000 - start, e["id"]) for e in timeline if e["event"] == "line"]


def narration_wav(story_dir, timeline, start, dur, out):
    story, voice = _lines(story_dir)
    sr = 48000
    track = np.zeros(int((dur + 1) * sr), np.float32)
    for t, lid in _marks(timeline, start):
        with wave.open(str(pathlib.Path(story_dir) / "voice" / f"{lid}.wav")) as w:
            x = np.frombuffer(w.readframes(w.getnframes()), np.int16 if w.getsampwidth() == 2 else np.int32).astype(np.float32)
            x /= 32768.0 if w.getsampwidth() == 2 else 2 ** 31
            src_sr = w.getframerate()
        y = np.interp(np.arange(int(len(x) * sr / src_sr)) * src_sr / sr, np.arange(len(x)), x).astype(np.float32)
        i = int(round(t * sr))
        if i < 0:
            y, i = y[-i:], 0
        n = min(len(y), len(track) - i)
        if n > 0:
            track[i:i + n] += y[:n]
    track = track[: int(dur * sr)]
    pcm = (np.clip(track, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
    return out


def _is_key(word):
    core = "".join(ch for ch in word if ch.isalnum())
    return len(core) > 1 and core.isupper() or core.isdigit()


def _wrap(words, f, max_w):
    sp = f.getlength(" ")
    width = lambda ws: sum(f.getlength(w) for w in ws) + sp * (len(ws) - 1)
    if width(words) <= max_w or len(words) == 1:
        return [words]
    best = min(range(1, len(words)), key=lambda k: max(width(words[:k]), width(words[k:])))
    return [words[:best], words[best:]]


def caption_image(text, key):
    f = ImageFont.truetype(str(FONT), CAP_PX)
    stroke = 8
    lines = _wrap(text.split(), f, MAX_W - 2 * stroke)
    sp, lh = f.getlength(" "), int(CAP_PX * 1.08)
    widths = [sum(f.getlength(w) for w in ln) + sp * (len(ln) - 1) for ln in lines]
    bw, bh = int(max(widths) + 2 * stroke + 24), int(lh * len(lines) + 2 * stroke + 30)
    txt = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(txt)
    for i, (ln, lw) in enumerate(zip(lines, widths)):
        x, y = (bw - lw) / 2, stroke + 8 + i * lh
        for w in ln:
            d.text((x, y), w, font=f, fill=key if _is_key(w) else (255, 255, 255, 255), stroke_width=stroke, stroke_fill=INK)
            x += f.getlength(w) + sp
    shadow = Image.new("RGBA", txt.size, (0, 0, 0, 0))
    shadow.putalpha(txt.split()[3].filter(ImageFilter.GaussianBlur(7)).point(lambda v: int(v * 0.55)))
    out = Image.new("RGBA", (bw, bh + 10), (0, 0, 0, 0))
    out.alpha_composite(shadow, (0, 8))
    out.alpha_composite(txt, (0, 0))
    return out


def caption_events(story_dir, timeline, start, dur):
    """[(t0, t1, text)] in seconds of the Short: each chunk from its first word until the next chunk starts
    (the last chunk of a line holds until the next line's first word, at most 0.5 s past its last word)."""
    story, voice = _lines(story_dir)
    marks = _marks(timeline, start)
    ev = []
    for n, (t, lid) in enumerate(marks):
        v = voice["lines"][lid]
        nxt = marks[n + 1][0] + voice["lines"][marks[n + 1][1]]["onset"] if n + 1 < len(marks) else dur
        for i, ((a, b), text) in enumerate(zip(v["chunks"], v["captions"])):
            t0 = t + a
            t1 = t + v["chunks"][i + 1][0] if i + 1 < len(v["chunks"]) else min(nxt, t + b + 0.5)
            ev.append((max(0.0, t0), min(dur, t1), text))
    return [e for e in ev if e[1] > e[0]]


def caption_concat(story_dir, timeline, start, dur, tmp):
    """Write the caption PNGs and an ffconcat list (durations in whole 60 fps frames) into tmp."""
    story, _ = _lines(story_dir)
    key = tuple(int(story.get("key_color", "#ffd640")[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    tmp = pathlib.Path(tmp)
    blank = tmp / "cap_blank.png"
    Image.new("RGBA", (W, H), (0, 0, 0, 0)).save(blank)
    runs, frame = [], 0                      # [(png, frames)]
    total = int(round(dur * FPS))
    for k, (t0, t1, text) in enumerate(caption_events(story_dir, timeline, start, dur)):
        f0, f1 = int(round(t0 * FPS)), int(round(t1 * FPS))
        if f0 > frame:
            runs.append((blank, f0 - frame))
        f0 = max(f0, frame)
        base = caption_image(text, key)
        for j in range(f1 - f0):
            s = POP[j] if j < len(POP) else 1.0
            if j >= len(POP):
                runs[-1] = (runs[-1][0], runs[-1][1] + f1 - f0 - j)
                break
            im = base.resize((max(1, int(base.width * s)), max(1, int(base.height * s))), Image.BICUBIC) if s != 1.0 else base
            full = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            full.alpha_composite(im, (int(W / 2 - im.width / 2), int(CY - im.height / 2)))
            p = tmp / f"cap{k}_{j}.png"
            full.save(p)
            runs.append((p, 1))
        frame = max(frame, f1)
    if frame < total:
        runs.append((blank, total - frame))
    lst = tmp / "captions.txt"
    lst.write_text("ffconcat version 1.0\n" + "".join(f"file '{p}'\nduration {n / FPS:.6f}\n" for p, n in runs) + f"file '{runs[-1][0]}'\n")
    return lst


if __name__ == "__main__":     # preview: python3 scripts/story_track.py stories/<name> "SOME text" out.png
    import sys
    story, _ = _lines(sys.argv[1])
    key = tuple(int(story.get("key_color", "#ffd640")[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    caption_image(sys.argv[2], key).save(sys.argv[3])
