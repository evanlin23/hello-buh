"""Retention toolkit for edit.py: payoff emphasis, beat counters, impact cards and the hook preview.

Every feature is optional and comes from the stunt's `edit` block (scripts/edit_args.js):

  punch:   [EVENT | [EVENT, NTH, SCALE]]          zoom punch on the game view: 1.0 -> 1.12 -> 1.0
                                                   in ~0.4 s (the HUD and caption don't zoom, like
                                                   a FOV kick)
  slowmo:  [[EVENT, BEFORE_S, AFTER_S, FACTOR]]    slow motion around a mark (scripts/timewarp.py;
                                                   FACTOR defaults to 0.5). Keep it short (~0.5 s
                                                   of footage) so it never reads as dead space.
  counter: {"at": [EVENT, ...], "total": N}        "3/5" beat counter in the top-left of the game
           or [EVENT, ...]                         view, popping up on each mark
  cards:   [[EVENT, TEXT, SECONDS?, COLOR?, NTH?]]  big impact text popping on a mark ("10/10",
                                                   "NO WAY"); COLOR: white|red|green|yellow|blue|gold
  hook:    {"at": EVENT, "before": 0.5, "after": 0.0, "text": "wait for the last one"}
                                                   a flash of the finale before beat 1: the clip
                                                   [at-before, at+after] of the finished Short
                                                   plays first with the text over it, then the
                                                   Short runs from its start. Default: cut BEFORE
                                                   the payoff lands, so it teases and doesn't spoil.

Times: events are looked up in the (speed/slowmo-warped) timeline, so everything lands on the
same frame as the subtitles and the HUD.
"""
import json
import math
import pathlib
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
W, H, BAND, GAME_H = 1080, 1920, 455, 1011
FONT = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
COLORS = {"white": (255, 255, 255), "red": (255, 60, 50), "green": (90, 255, 90), "yellow": (255, 225, 40),
          "blue": (90, 175, 255), "gold": (255, 190, 30), "orange": (255, 140, 30)}


def _load(x):
    return (json.loads(x) if isinstance(x, str) else x) or []


def event_times(timeline, name):
    return [e["t"] / 1000 for e in timeline if e["event"] == name]


def hook_len(edit):
    """Seconds the hook preview adds in front of the Short (0 without one)."""
    h = _load(edit.get("hook")) if edit else None
    if not h:
        return 0.0
    return float(h.get("before", 0.5)) + float(h.get("after", 0.0))


# ---------------------------------------------------------------- text
def rich_text(text, size, fill, stroke=None, stroke_w=None):
    """Caption-style text (Inter ExtraBold, black stroke) with Twemoji emoji, on a tight RGBA image."""
    from edit import emoji_png, split_emoji
    font = ImageFont.truetype(FONT, size)
    sw = stroke_w if stroke_w is not None else max(4, size // 12)
    toks = [t for tok in text.split(" ") for t in split_emoji(tok)]
    is_e = [any(ord(c) > 0x2500 for c in t) for t in toks]
    d = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    space = d.textlength(" ", font=font)
    widths = [size * 1.05 if e else d.textlength(t, font=font) for t, e in zip(toks, is_e)]
    tw = int(sum(widths) + space * (len(toks) - 1)) + 2 * sw + 4
    asc, desc = font.getmetrics()
    th = asc + desc + 2 * sw + 4
    img = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x = sw + 2
    for t, e, w in zip(toks, is_e, widths):
        if e:
            em = emoji_png(t).resize((size, size), Image.LANCZOS)
            img.alpha_composite(em, (int(x), int(sw + 2 + (asc - size) * 0.6 + size * 0.02)))
        else:
            d.text((x, sw + 2), t, font=font, fill=tuple(fill) + (255,) if len(fill) == 3 else fill,
                   stroke_width=sw, stroke_fill=stroke or (0, 0, 0, 255))
        x += w + space
    return img


def wrap_lines(text, size, max_w):
    font = ImageFont.truetype(FONT, size)
    d = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if cur and d.textlength(t, font=font) > max_w:
            lines.append(cur); cur = w
        else:
            cur = t
    return lines + [cur]


def block_text(text, size, fill, max_w=W * 0.86):
    """Several centred lines of rich_text stacked into one image."""
    ims = [rich_text(ln, size, fill) for ln in wrap_lines(text, size, max_w)]
    gap = -int(size * 0.12)
    out = Image.new("RGBA", (max(i.width for i in ims), sum(i.height for i in ims) + gap * (len(ims) - 1)), (0, 0, 0, 0))
    y = 0
    for i in ims:
        out.alpha_composite(i, ((out.width - i.width) // 2, y)); y += i.height + gap
    return out


# ---------------------------------------------------------------- zoom punch
def punch_curve(dt, peak=0.12, attack=0.07, decay=0.33):
    """Zoom factor dt seconds after the mark: a fast ease-out to 1+peak, an ease-in-out back."""
    if dt < 0 or dt > attack + decay:
        return 1.0
    if dt < attack:
        k = dt / attack
        return 1 + peak * (1 - (1 - k) ** 3)
    k = (dt - attack) / decay
    return 1 + peak * (1 - (3 * k * k - 2 * k * k * k))


def apply_punch(args, spec, timeline):
    """Rewrite the frame sequence with the game view zoomed on each punch mark (symlinks for the
    rest). Runs after the speed/slowmo map, so `timeline` is in output time and frame i is t=i/fps."""
    marks = []
    for p in _load(spec):
        p = [p] if isinstance(p, str) else list(p)
        ts = event_times(timeline, p[0])
        nth = int(p[1]) if len(p) > 1 else 0
        if len(ts) > nth:
            marks.append((ts[nth], float(p[2]) if len(p) > 2 else 0.12))
    if not marks:
        return
    src = pathlib.Path(args.frames)
    files = sorted(src.parent.glob("*" + src.suffix))
    wd = pathlib.Path(tempfile.mkdtemp(prefix="hb-punch-"))
    n = 0
    for f in files:
        try:
            i = int(f.stem.lstrip("f"))
        except ValueError:
            continue
        t = i / args.fps
        z = max(punch_curve(t - m, peak) for m, peak in marks)
        out = wd / f.name
        if z > 1.0005:
            im = Image.open(f.resolve()).convert("RGB")
            cw, ch = im.width / z, im.height / z
            x0, y0 = (im.width - cw) / 2, (im.height - ch) / 2
            im.resize(im.size, Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch)).save(out, compress_level=1)
            n += 1
        else:
            out.symlink_to(f.resolve())
    print(f"punch: {n} frames zoomed on {len(marks)} marks")
    args.frames = str(wd / src.name)


# ---------------------------------------------------------------- counter + cards track
def _pop(dt, dur=0.18, over=0.75):
    """Scale for a pop-in: from 1+over down past 1 (a small undershoot) and back to 1."""
    if dt >= dur:
        return 1.0
    k = dt / dur
    return 1 + over * (1 - k) ** 2 * math.cos(k * math.pi * 1.2)


def fx_concat(counter, cards, timeline, start, dur, outdir, fps=60):
    """One overlay track (ffconcat of cached PNGs) with the beat counter and the impact cards."""
    marks = []                                       # counter marks: (video time, index)
    c = _load(counter)
    if c:
        at = c["at"] if isinstance(c, dict) else c
        total = int(c.get("total", len(at))) if isinstance(c, dict) else len(at)
        prefix = c.get("label", "") if isinstance(c, dict) else ""
        for k, ev in enumerate(at):
            ts = event_times(timeline, ev[0] if isinstance(ev, list) else ev)
            nth = ev[1] if isinstance(ev, list) else 0
            if len(ts) > nth:
                marks.append((ts[nth] - start, k + 1))
        marks.sort()
    cds = []                                         # cards: (t0, t1, text, color, tilt)
    for j, cd in enumerate(_load(cards)):
        ts = event_times(timeline, cd[0])
        nth = int(cd[4]) if len(cd) > 4 else 0
        if len(ts) > nth:
            t0 = ts[nth] - start
            cds.append((t0, t0 + (float(cd[2]) if len(cd) > 2 and cd[2] else 1.0), cd[1],
                        COLORS.get((cd[3] if len(cd) > 3 else "yellow") or "yellow", COLORS["yellow"]), -5 if j % 2 == 0 else 4))
    if not marks and not cds:
        return None
    cache, runs, imgs = {}, [], {}
    n = int(math.ceil(dur * fps)) + 1
    for i in range(n):
        t = i / fps
        ck = None
        cur = [m for m in marks if m[0] <= t + 1e-6]
        if cur:
            m0, k = cur[-1]
            ck = (k, round(_pop(t - m0, 0.22, 0.6), 2))
        cc = None
        on = [cd for cd in cds if cd[0] <= t + 1e-6 < cd[1]]
        if on:
            t0, t1, text, color, tilt = on[-1]
            fade = min(1.0, (t1 - t) / 0.12)
            cc = (text, color, tilt, round(_pop(t - t0), 2), round(fade, 1))
        key = (ck, cc)
        if key not in cache:
            img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            if ck:
                k, s = ck
                if ("c", k) not in imgs:
                    num = rich_text(f"{prefix}{k}", 96, COLORS["yellow"])
                    den = rich_text(f"/{total}", 64, COLORS["white"])
                    im = Image.new("RGBA", (num.width + den.width - 8, num.height), (0, 0, 0, 0))
                    im.alpha_composite(num, (0, 0)); im.alpha_composite(den, (num.width - 8, num.height - den.height - 6))
                    imgs[("c", k)] = im
                im = imgs[("c", k)]
                if s != 1.0:
                    im = im.resize((int(im.width * s), int(im.height * s)), Image.BICUBIC)
                cx, cy = 40 + imgs[("c", k)].width // 2, BAND + 26 + imgs[("c", k)].height // 2
                img.alpha_composite(im, (cx - im.width // 2, cy - im.height // 2))
            if cc:
                text, color, tilt, s, fade = cc
                if ("t", text, color) not in imgs:
                    imgs[("t", text, color)] = block_text(text, 150 if len(text) <= 8 else 116, color).rotate(tilt, Image.BICUBIC, expand=True)
                im = imgs[("t", text, color)]
                if s != 1.0:
                    im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.BICUBIC)
                if fade < 1:
                    im = im.copy(); im.putalpha(im.split()[3].point(lambda v: int(v * fade)))
                cy = BAND + int(GAME_H * 0.27)
                img.alpha_composite(im, ((W - im.width) // 2, cy - im.height // 2))
            img.paste((0, 0, 0, 0), (0, 0, W, BAND))          # keep it in the game view
            img.paste((0, 0, 0, 0), (0, BAND + GAME_H, W, H))
            path = outdir / f"fx{len(cache)}.png"
            img.save(path, compress_level=1)
            cache[key] = path
        if runs and runs[-1][0] == cache[key]:
            runs[-1][1] += 1
        else:
            runs.append([cache[key], 1])
    lst = outdir / "fx.txt"
    lst.write_text("ffconcat version 1.0\n" + "".join(f"file '{p}'\nduration {k / fps:.4f}\n" for p, k in runs) + f"file '{runs[-1][0]}'\n")
    return lst


# ---------------------------------------------------------------- hook preview
def hook_prepend(out, spec, t_video, fps=60):
    """Put [t_video-before, t_video+after] of the finished Short in front of it, with the hook text
    over it and a quick zoom-in, then cut to the start. Rewrites `out` in place."""
    h = _load(spec)
    before, after = float(h.get("before", 0.5)), float(h.get("after", 0.0))
    text = h.get("text", "wait for the last one 😳")
    a, b = max(0.0, t_video - before), t_video + after
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="hb-hook-"))
    d = b - a
    txt = block_text(text, 104, COLORS["white"])
    cy = BAND + int(GAME_H * 0.24)
    for i in range(int(math.ceil(d * fps)) + 1):   # the text pops in over the first 0.15 s
        s = _pop(i / fps, 0.15, 0.5)
        im = txt if s == 1.0 else txt.resize((int(txt.width * s), int(txt.height * s)), Image.BICUBIC)
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ov.alpha_composite(im, ((W - im.width) // 2, cy - im.height // 2))
        ov.save(tmp / f"hook{i:03d}.png", compress_level=1)
    has_audio = bool(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", out],
                                    capture_output=True, text=True).stdout.strip())
    # the hook clip: a slow push-in on the game view (crop from 1.0 to 1.06), the text popping in
    zoom = f"1+0.06*t/{d:.3f}"
    g = [f"[0:v]trim={a:.4f}:{b:.4f},setpts=PTS-STARTPTS,split[hk][hb]",
         f"[hk]crop=w={W}:h={GAME_H}:x=0:y={BAND},scale=w='trunc({W}*({zoom})/2+1)*2':h='trunc({GAME_H}*({zoom})/2+1)*2':eval=frame,"
         f"crop={W}:{GAME_H},format=rgba[hz]",
         f"[hb][hz]overlay=0:{BAND}[hc]",
         f"[2:v]format=rgba[tx]",
         f"[hc][tx]overlay=0:0:shortest=1,setsar=1,format=yuv420p[h1]",
         "[1:v]setsar=1,format=yuv420p[m1]"]
    if has_audio:
        g.append(f"[0:a]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS,afade=t=out:st={max(0, d - 0.03):.4f}:d=0.03[ha]")
        g.append("[h1][ha][m1][1:a]concat=n=2:v=1:a=1[v][a]")
        maps = ["-map", "[v]", "-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
    else:
        g.append("[h1][m1]concat=n=2:v=1:a=0[v]")
        maps = ["-map", "[v]"]
    res = tmp / "out.mp4"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", out, "-i", out, "-framerate", str(fps), "-i", str(tmp / "hook%03d.png"),
                    "-filter_complex", ";".join(g), *maps, "-r", str(fps), "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(res)], check=True)
    shutil.move(str(res), out)
    print(f"hook: {d:.2f}s of the finale ({a:.2f}-{b:.2f}s) in front, \"{text}\"")
