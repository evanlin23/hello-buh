"""Narrated story Shorts (docs/stories.md): the narration track and the big word-chunk captions, laid on the
recording's `line` marks. edit.py calls these when a stunt sets `edit.story`.

  narration_wav(story_dir, timeline, start, dur, out)   -> wav of every line at its mark (48 kHz mono)
  caption_concat(story_dir, timeline, start, dur, tmp)  -> ffconcat list of full-frame caption PNGs (60 fps steps)

Captions follow the owner's Roblox story channel (blocky-stories RULES.md "Captions"): a heavy grotesk
(Poppins Black, OFL, assets/fonts/; Schibsted Grotesk Black before 2026-11-10), 2 or 3 words at a time, white with the key words (CAPS in the
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
FONT = HERE / "assets" / "fonts" / "Poppins-Black.ttf"   # font A/B 2026-11-10 (docs/look.md): most ink per width at phone size
W, H, BAND, GAME_H = 1080, 1920, 455, 1011
CAP_PX = 96
TAG_PX = 54                              # the speaker's name tag, over a character's first caption (story.json "name_tags": false turns it off)
MAX_W = 840                              # x 120..960: clear of the Shorts like/comment column on the right (docs/look.md)
CY = BAND + int(GAME_H * 0.70)          # caption block centre: below the crosshair, above the hearts
INK = (14, 12, 18, 255)
FPS = 60
POP = [0.84, 0.93, 1.02, 1.06, 1.03, 1.0]   # entrance scale per 60 fps frame (blocky post.pop, 0.1 s)


def _lines(story_dir):
    story = json.loads((pathlib.Path(story_dir) / "story.json").read_text())
    voice = json.loads((pathlib.Path(story_dir) / "voice" / "voice.json").read_text())
    return story, voice


POSES = None   # the recording's poses (edit.py sets them): line starts snap to the camera cut


def _marks(timeline, start, ids=None, on_respawn=()):
    """[(seconds into the Short, line id)] for every `line` mark. A line is marked a tick or two after its cut
    lands (the stunt sees the new position late), so it starts on the cut itself: the first tick whose pose
    is over 4 blocks from the one before (render.js shows that pose from exactly that tick)."""
    out = []
    cuts = [e["t"] // 50 for e in timeline if e["event"] == "cut"]
    respawns = [e["t"] // 50 for e in timeline if e["event"] == "respawn"]
    for e in timeline:
        if e["event"] != "line" or (ids is not None and e["id"] not in ids):   # a line cut from story.json stays silent
            continue
        m = e["t"] // 50
        t = m
        if POSES:
            # after a `cut` mark any step over 0.6 block is the teleport (a short cut moved 1-2 blocks and the
            # caption came a tick late: frame review, story_respawn_tax f948)
            near = bool(out) and any(m - 12 <= c <= m for c in cuts)   # not line 1: the Short starts on its mark
            lim = 0.36 if near else 16
            fwd = None
            if e["id"] in on_respawn and any(m <= r <= m + 4 for r in respawns):   # story.json start_on_respawn: L06 talks over the death screen on purpose
                # a line that opens on a respawn starts on the respawn's camera jump, a few ticks after its mark
                # (its caption came 3 frames early over the death screen: frame review, story_respawn_tax f1557)
                fwd = next((i for i in range(m + 1, min(len(POSES), m + 7)) if ((POSES[i][1] - POSES[i - 1][1]) ** 2 + (POSES[i][2] - POSES[i - 1][2]) ** 2 + (POSES[i][3] - POSES[i - 1][3]) ** 2) > 0.36), None)   # (a respawn near the death spot moves only ~2 blocks)
            for i in ([] if fwd else range(m, max(0, m - (12 if near else 4)), -1)):
                if i < len(POSES) and ((POSES[i][1] - POSES[i - 1][1]) ** 2 + (POSES[i][2] - POSES[i - 1][2]) ** 2 + (POSES[i][3] - POSES[i - 1][3]) ** 2) > lim:
                    t = i
                    break
            if fwd:
                t = fwd
        out.append((t / 20 - start, e["id"]))
    return out


def narration_wav(story_dir, timeline, start, dur, out):
    story, voice = _lines(story_dir)
    sr = 48000
    track = np.zeros(int((dur + 1) * sr), np.float32)
    for t, lid in _marks(timeline, start, {l["id"] for l in story["lines"]}, story.get("start_on_respawn", ())):
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


def caption_image(text, key, base=(255, 255, 255, 255), speaker=False, tag=None):
    """base: the colour of the plain words (white; a v2 story's character lines use that speaker's cast colour).
    speaker: a character's line (docs/voices.md "Caption colours"): its key words stay in the speaker's colour,
    drawn brighter, with a bar under them in that colour, instead of the story's key colour, so the colour always
    says who is talking and a key word still pops. tag: a small name over the caption (the speaker's first line)."""
    f = ImageFont.truetype(str(FONT), CAP_PX)
    stroke = 8
    lines = _wrap(text.split(), f, MAX_W - 2 * stroke)
    sp, lh = f.getlength(" "), int(CAP_PX * 1.08)
    widths = [sum(f.getlength(w) for w in ln) + sp * (len(ln) - 1) for ln in lines]
    ft = ImageFont.truetype(str(FONT), TAG_PX) if tag else None
    top = int(TAG_PX * 1.25) if tag else 0
    bw = int(max(widths + ([ft.getlength(tag.upper()) + 2 * stroke] if tag else [])) + 2 * stroke + 24)
    bh = int(top + lh * len(lines) + 2 * stroke + 30)
    txt = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(txt)
    if tag:
        d.text(((bw - ft.getlength(tag.upper())) / 2, stroke), tag.upper(), font=ft, fill=base, stroke_width=6, stroke_fill=INK)
    hot = tuple(min(255, int(c + (255 - c) * 0.45)) for c in base[:3]) + (255,)   # the speaker's colour, lifted toward white
    asc = f.getmetrics()[0]
    for i, (ln, lw) in enumerate(zip(lines, widths)):
        x, y = (bw - lw) / 2, top + stroke + 8 + i * lh
        for w in ln:
            k = _is_key(w)
            if k and speaker:
                ww = f.getlength(w.rstrip(".,!?;:…"))
                d.rounded_rectangle((x - 2, y + asc + 4, x + ww + 2, y + asc + 17), 5, fill=base, outline=INK, width=4)
            d.text((x, y), w, font=f, fill=(hot if speaker else key) if k else base, stroke_width=stroke, stroke_fill=INK)
            x += f.getlength(w) + sp
    shadow = Image.new("RGBA", txt.size, (0, 0, 0, 0))
    shadow.putalpha(txt.split()[3].filter(ImageFilter.GaussianBlur(7)).point(lambda v: int(v * 0.55)))
    out = Image.new("RGBA", (bw, bh + 10), (0, 0, 0, 0))
    out.alpha_composite(shadow, (0, 8))
    out.alpha_composite(txt, (0, 0))
    out.info["tag_h"] = top   # the name tag's height: the words stay where an untagged caption's would be
    return out


def speakers(story):
    """{line id: (plain-word colour, is a character, name tag or None)} for a story. v1 stories and the narrator:
    white. A v2 character: its cast `color`, else its library character's `color` (voices/cast.json, via `ref`),
    else the first unused colour of the library palette; a name tag over every caption of its first line (one word at
    a time is too short to read a tag; story.json "name_tags": false turns them off)."""
    cast = story.get("cast") or {}
    lib = json.loads((HERE / "voices" / "cast.json").read_text())
    used = {c.get("color", "").upper() for c in cast.values()}
    spare = [v["color"] for k, v in lib.items() if not k.startswith("_") and k != "narrator" and v.get("color") and v["color"].upper() not in used]
    col = {}
    for cid, c in cast.items():
        if c.get("role") != "character":
            continue
        h = c.get("color") or (lib.get(c.get("ref") or "") or {}).get("color") or (spare.pop(0) if spare else "#FFFFFF")
        col[cid] = (_rgba(h), c.get("name") or (lib.get(c.get("ref") or "") or {}).get("name") or cid)
    key = _rgba(story.get("key_color", "#ffd640"))
    for cid, (c, name) in col.items():   # the narrator's key words must not look like a character talking
        if sum((a - b) ** 2 for a, b in zip(c[:3], key[:3])) ** 0.5 < 60:
            print(f"captions: {cid}'s colour is close to the story's key_color {story.get('key_color')}: the narrator's key "
                  f"words will read as {name} talking; pick a key colour apart from the cast (docs/voices.md)")
    out, seen = {}, set()
    for ln in story["lines"]:
        w = ln.get("who")
        if w in col:
            out[ln["id"]] = (col[w][0], True, col[w][1] if story.get("name_tags", True) and w not in seen else None)
            seen.add(w)
        else:
            out[ln["id"]] = ((255, 255, 255, 255), False, None)
    return out


def _rgba(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


def caption_events(story_dir, timeline, start, dur, who=False):
    """[(t0, t1, text)] in seconds of the Short: each chunk from its first word until the next chunk starts.
    A line's first chunk appears on its cut (the line's mark), and its last chunk holds until the next line's cut
    (0.3 s past its last word only when the next line is over 1.2 s away)."""
    story, voice = _lines(story_dir)
    marks = _marks(timeline, start, {l["id"] for l in story["lines"]}, story.get("start_on_respawn", ()))
    ev = []
    for n, (t, lid) in enumerate(marks):
        v = voice["lines"][lid]
        nxt = marks[n + 1][0] if n + 1 < len(marks) else dur
        for i, ((a, b), text) in enumerate(zip(v["chunks"], v["captions"])):
            t0 = t if i == 0 else t + a
            # the last chunk holds to the next line's cut (the caption changes on the cut frame; dropping it 0.3 s after
            # the word left 1-8 blank frames before most cuts: frame review); only a long gap clears it early
            t1 = t + v["chunks"][i + 1][0] if i + 1 < len(v["chunks"]) else (nxt if nxt - (t + b) <= 1.2 else t + b + 0.3)
            ev.append((max(0.0, t0), min(dur, t1), text, lid))
    # owner 2026-11-10: "do 1 at a time if the top do it 1 at a time" (Xenost and Ashyyy show one word per caption in
    # all 48 sampled frames): story.json "captions": "word" (the default) splits every chunk into single words,
    # timed by voice/words.json (Whisper word starts) when present, else by each word's share of the chunk's letters.
    # "captions": "chunk" keeps the 2-3 word chunks.
    if story.get("captions", "word") == "word":
        ev = _one_word(ev, story_dir, marks)
    # a chunk due just before a picture cut inside a line starts on the cut (the voice's word timing put
    # "He doesn't" 6-9 frames before the night/day cuts it belongs to: story_sheep_stares f222, f262)
    cuts = _cut_times(timeline, start)
    for k in range(1, len(ev)):
        t0 = ev[k][0]
        c = next((c for c in cuts if t0 < c <= t0 + CUT_SNAP and c < ev[k][1]), None)
        if c is not None and ev[k - 1][1] == t0:
            ev[k - 1] = (ev[k - 1][0], c, *ev[k - 1][2:])
            ev[k] = (c, *ev[k][1:])
    return [e if who else e[:3] for e in ev if e[1] > e[0]]


def _one_word(ev, story_dir, marks):
    """Split each (t0, t1, text, lid) chunk into one event per word."""
    import json as _json
    wf = pathlib.Path(story_dir) / "voice" / "words.json"
    words = _json.loads(wf.read_text()) if wf.exists() else {}
    line_t = {lid: t for t, lid in marks}
    used = {}
    out = []
    for t0, t1, text, lid in ev:
        toks = text.split()
        if len(toks) <= 1:
            out.append((t0, t1, text, lid))
            continue
        ww = words.get(lid) or []
        k = used.get(lid, 0)
        starts = None
        if ww and k + len(toks) <= len(ww):
            starts = [line_t[lid] + float(w[1]) for w in ww[k:k + len(toks)]]
            starts[0] = t0
            if any(b <= a for a, b in zip(starts, starts[1:])) or starts[-1] >= t1:
                starts = None
        used[lid] = k + len(toks)
        if starts is None:
            n = [max(1, len(w.strip(".,!?;:'\"").replace("'", ""))) + 1 for w in toks]
            tot, acc, starts = sum(n), 0, []
            for x in n:
                starts.append(t0 + (t1 - t0) * acc / tot)
                acc += x
        for i, w in enumerate(toks):
            out.append((starts[i], starts[i + 1] if i + 1 < len(toks) else t1, w, lid))
    return out


CUT_SNAP = 0.25   # s: how far ahead of a cut a chunk may start and still be moved onto it


def _cut_times(timeline, start):
    """Seconds into the Short at which the picture cuts: each `cut` mark's camera jump (the first tick
    from 2 before to 6 after the mark whose pose moved over 0.6 block), or the mark itself when it also
    changes the time of day (a day/night cut on the spot)."""
    out = []
    times = {e["t"] // 50 for e in timeline if e["event"] == "time"}
    for e in timeline:
        if e["event"] != "cut":
            continue
        m = e["t"] // 50
        jump = None
        if POSES:
            jump = next((i for i in range(max(1, m - 2), min(len(POSES), m + 7))
                         if sum((POSES[i][j] - POSES[i - 1][j]) ** 2 for j in (1, 2, 3)) > 0.36), None)
        if jump is None and m in times:
            jump = m
        if jump is not None:
            out.append(jump / 20 - start)
    return sorted(out)


def caption_concat(story_dir, timeline, start, dur, tmp):
    """Write the caption PNGs and an ffconcat list (durations in whole 60 fps frames) into tmp."""
    story, _ = _lines(story_dir)
    key = tuple(int(story.get("key_color", "#ffd640")[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    tmp = pathlib.Path(tmp)
    blank = tmp / "cap_blank.png"
    Image.new("RGBA", (W, H), (0, 0, 0, 0)).save(blank)
    runs, frame = [], 0                      # [(png, frames)]
    total = int(round(dur * FPS))
    # story.json v2: a character's lines in that speaker's colour (the narrator's, and v1 stories', white)
    spk = speakers(story)
    for k, (t0, t1, text, lid) in enumerate(caption_events(story_dir, timeline, start, dur, who=True)):
        f0, f1 = int(round(t0 * FPS)), int(round(t1 * FPS))
        if f0 > frame:
            runs.append((blank, f0 - frame))
        f0 = max(f0, frame)
        col, is_char, tag = spk.get(lid, ((255, 255, 255, 255), False, None))
        base = caption_image(text, key, col, is_char, tag)   # the tag over every word of a character's first line
        for j in range(f1 - f0):
            s = POP[j] if j < len(POP) else 1.0
            if j >= len(POP):
                runs[-1] = (runs[-1][0], runs[-1][1] + f1 - f0 - j)
                break
            im = base.resize((max(1, int(base.width * s)), max(1, int(base.height * s))), Image.BICUBIC) if s != 1.0 else base
            full = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            full.alpha_composite(im, (int(W / 2 - im.width / 2), int(CY - im.height / 2 - base.info.get("tag_h", 0) * s / 2)))
            p = tmp / f"cap{k}_{j}.png"
            full.save(p)
            runs.append((p, 1))
        frame = max(frame, f1)
    if frame < total:
        runs.append((blank, total - frame))
    lst = tmp / "captions.txt"
    lst.write_text("ffconcat version 1.0\n" + "".join(f"file '{p}'\nduration {n / FPS:.6f}\n" for p, n in runs) + f"file '{runs[-1][0]}'\n")
    return lst


def meter_image(label, value, key, s=1.0, hot=0.0):
    """The story's rule meter ("VILLAGERS 5"): top-left of the game view, the number in the key colour
    (red while it has just changed, `hot` 1 -> 0), scaled by s for its pop."""
    f = ImageFont.truetype(str(FONT), int(60 * s))
    lab = ImageFont.truetype(str(FONT), 44)
    num = str(value)
    red = (235, 50, 50, 255)
    col = tuple(int(key[i] + (red[i] - key[i]) * hot) for i in range(4))
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x, y = 44, BAND + 34
    d.text((x, y + 10), label, font=lab, fill=(255, 255, 255, 255), stroke_width=6, stroke_fill=INK)
    nx = x + lab.getlength(label) + 18
    d.text((nx, y + 30 - 30 * s), num, font=f, fill=col, stroke_width=7, stroke_fill=INK)
    return img


def meter_concat(story_dir, timeline, start, dur, tmp):
    """ffconcat of the meter (story.json "meter": {"label": ...}) following the stunt's `meter` marks, or None."""
    story, _ = _lines(story_dir)
    if not story.get("meter"):
        return None
    def _on_jump(t):   # a drop set on the respawn click lands on the respawn's camera jump just after it (it popped
        m = int(t * 20 + 1e-6)   # 3 frames early over the death screen: frame review, story_respawn_tax f342)
        for i in range(m, m + 6):
            if POSES and 0 < i < len(POSES) and sum((POSES[i][j] - POSES[i - 1][j]) ** 2 for j in (1, 2, 3)) > 16:
                return i / 20
        return t
    marks = [(_on_jump(e["t"] / 1000) - start, e["value"]) for e in timeline if e["event"] == "meter"]
    if not marks:
        return None
    key = tuple(int(story.get("key_color", "#ffd640")[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    label = story["meter"].get("label", "")
    tmp = pathlib.Path(tmp)
    total = int(round(dur * FPS))
    # value at frame 0 = the last mark at or before the start
    cur = None
    for t, v in marks:
        if t <= 0:
            cur = v
    changes = [(int(round(t * FPS)), v) for t, v in marks if t > 0]
    runs, frame, k = [], 0, 0
    def still(v):
        p = tmp / f"meter_{v}.png"
        if not p.exists():
            meter_image(label, v, key).save(p)
        return p
    blank = tmp / "meter_blank.png"
    Image.new("RGBA", (W, H), (0, 0, 0, 0)).save(blank)
    for f0, v in changes + [(total, None)]:
        f0 = min(f0, total)
        if f0 > frame:
            runs.append((still(cur) if cur is not None else blank, f0 - frame))
            frame = f0
        if v is None:
            break
        n = min(30, total - frame)               # 0.5 s: pop and a red flash fading back
        for j in range(n):
            u = j / 30
            s = 1.0 + 0.45 * max(0.0, 1 - u * 3) if j >= 2 else 1.0 + 0.45 * j / 2
            p = tmp / f"meter_{k}_{j}.png"
            meter_image(label, v, key, s, max(0.0, 1 - u)).save(p)
            runs.append((p, 1))
        frame += n
        k += 1
        cur = v
    if frame < total:
        runs.append((still(cur), total - frame))
    lst = tmp / "meter.txt"
    lst.write_text("ffconcat version 1.0\n" + "".join(f"file '{p}'\nduration {n / FPS:.6f}\n" for p, n in runs) + f"file '{runs[-1][0]}'\n")
    return lst


def loudness(path):
    """Integrated loudness (LUFS) of a file's audio, by ffmpeg's ebur128."""
    import re
    import subprocess
    err = subprocess.run(["ffmpeg", "-nostats", "-i", str(path), "-map", "0:a", "-af", "ebur128", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", err)[-1])


def master_gain(path, target=-14.0):
    """Correct a finished Short's audio to `target` LUFS (gain, then a -1.5 dBTP limiter), video copied."""
    import os
    import subprocess
    gain = target - loudness(path)
    if abs(gain) < 0.3:
        return
    tmp = str(path) + ".gain.mp4"
    for _ in range(4):   # the limiter eats some of the gain: re-measure and push again (from the original)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-map", "0:v", "-map", "0:a", "-c:v", "copy",
                        "-af", f"volume={gain:.2f}dB,alimiter=limit=0.84:level=false", "-c:a", "aac", "-b:a", "192k",
                        "-movflags", "+faststart", tmp], check=True)
        miss = target - loudness(tmp)
        if abs(miss) < 0.3:
            break
        gain += miss
    os.replace(tmp, path)


def flash_concat(timeline, start, dur, tmp):
    """White flashes over the game view on `flash` marks (a creeper's swell seen from inside): 55% white,
    fading over 0.1 s. An ffconcat list, or None without marks."""
    booms = {e["t"] for e in timeline if e["event"] == "boom"}
    # a flash on a `boom` mark is the blast itself: full white, held, a longer fade (drawn like the swell flashes it
    # read as "a 5th flash, then a cut": retention audit, story_runaway)
    big = {int(round((e["t"] / 1000 - start) * FPS)) for e in timeline if e["event"] == "flash" and e["t"] in booms}
    fl = sorted(int(round((e["t"] / 1000 - start) * FPS)) for e in timeline if e["event"] == "flash")
    fl = [f for f in fl if 0 <= f < dur * FPS]
    if not fl:
        return None
    tmp = pathlib.Path(tmp)
    blank = tmp / "flash_blank.png"
    Image.new("RGBA", (W, H), (0, 0, 0, 0)).save(blank)
    steps = [0.55, 0.42, 0.3, 0.18, 0.08]
    bsteps = [1.0, 1.0, 1.0, 0.95, 0.85, 0.75, 0.65, 0.55, 0.46, 0.38, 0.3, 0.23, 0.17, 0.12, 0.08, 0.05, 0.03]
    for j, a in enumerate(sorted(set(steps + bsteps))):
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        im.paste((255, 255, 255, int(255 * a)), (0, BAND, W, BAND + GAME_H))
        im.save(tmp / f"flash_a{int(a * 100):03d}.png")
    total = int(round(dur * FPS))
    # per frame: which fade step shows; a flash landing inside a fade restarts it (it was skipped, and the
    # blast's own flash 3 frames after the last swell never drew: retention audit, story_runaway)
    step = [None] * total
    for f0 in fl:
        st = bsteps if f0 in big else steps
        for j in range(min(len(st), total - f0)):
            step[f0 + j] = st[j]
    runs = []
    for v in step:
        p = blank if v is None else tmp / f"flash_a{int(v * 100):03d}.png"
        if runs and runs[-1][0] == p:
            runs[-1] = (p, runs[-1][1] + 1)
        else:
            runs.append((p, 1))
    lst = tmp / "flash.txt"
    lst.write_text("ffconcat version 1.0\n" + "".join(f"file '{p}'\nduration {n / FPS:.6f}\n" for p, n in runs) + f"file '{runs[-1][0]}'\n")
    return lst


def as_sequence(lst, name):
    """An ffconcat list (whole 60 fps frames) as one symlink per output frame, read as an exact image sequence
    (`-framerate 60 -i <pattern>`). Through ffconcat + fps the track landed a frame early at most change
    points, so captions switched a frame before their cut (worker 10, scripts/retention.py fx_concat)."""
    lst = pathlib.Path(lst)
    seq = lst.parent / f"{name}seq"
    seq.mkdir(exist_ok=True)
    entries, cur = [], None
    for ln in lst.read_text().splitlines():
        if ln.startswith("file "):
            cur = ln[5:].strip().strip("'")
        elif ln.startswith("duration ") and cur:
            entries.append((cur, int(round(float(ln.split()[1]) * FPS))))
            cur = None
    i = 0
    for p, n in entries:
        for _ in range(n):
            (seq / f"{name}{i:05d}.png").symlink_to(pathlib.Path(p).resolve())
            i += 1
    return str(seq / f"{name}%05d.png")


if __name__ == "__main__":     # preview: python3 scripts/story_track.py stories/<name> "SOME text" out.png
    import sys
    story, _ = _lines(sys.argv[1])
    key = tuple(int(story.get("key_color", "#ffd640")[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    caption_image(sys.argv[2], key).save(sys.argv[3])
