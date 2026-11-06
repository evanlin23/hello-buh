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
  shake:   [EVENT | [EVENT, NTH, PX]]             screen shake on the game view (default 16 px, 0.35 s)
  flash:   [EVENT | [EVENT, NTH, ALPHA]]          white flash on the game view (0.7, ~0.2 s)
  freeze:  [[EVENT, SECONDS, TEXT?, COLOR?]]      freeze frame on a mark with a slow push-in and a
                                                   stamped label ("1 IN A MILLION"); it adds SECONDS
  fallen:  [[EVENT_A, EVENT_B, LABEL?]]           live "blocks fallen" counter (top right) from the
                                                   recorded altitude, turning green on EVENT_B
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


def _marks(spec, timeline, default):
    out = []
    for p in _load(spec):
        p = [p] if isinstance(p, str) else list(p)
        ts = event_times(timeline, p[0])
        nth = int(p[1]) if len(p) > 1 else 0
        if len(ts) > nth:
            out.append((ts[nth], float(p[2]) if len(p) > 2 else default))
    return out


def shake_offset(dt, px, dur=0.35, seed=0):
    """Screen-shake offset (dx, dy) in px dt seconds after the mark: decaying, jittered every frame."""
    if dt < 0 or dt > dur:
        return 0.0, 0.0
    a = px * math.exp(-dt / (dur * 0.35))
    k = int(dt * 60) + seed * 101
    return a * math.sin(k * 2.39 + 0.7), a * math.cos(k * 1.71 + 2.1)


def apply_frame_fx(args, timeline):
    """Rewrite the frame sequence with the game-view effects (symlinks for untouched frames):
    zoom punches, screen shakes, white flashes, and a slow push-in on freeze frames. Runs after the
    speed/slowmo/freeze map, so `timeline` is in output time and frame i is t = i / fps. The HUD,
    caption and overlays are drawn later, so they stay still (like a FOV kick in the game)."""
    punches = _marks(args.punch, timeline, 0.12)
    shakes = _marks(args.shake, timeline, 16.0)
    flashes = _marks(args.flash, timeline, 0.7)
    pushes = [(ts[0], float(f[1]) if len(f) > 1 else 0.6) for f in _load(args.freeze)
              for ts in [event_times(timeline, f[0])] if ts]
    if not (punches or shakes or flashes or pushes):
        return
    src = pathlib.Path(args.frames)
    files = sorted(src.parent.glob("*" + src.suffix))
    wd = pathlib.Path(tempfile.mkdtemp(prefix="hb-fx-"))
    n = 0
    for f in files:
        try:
            i = int(f.stem.lstrip("f"))
        except ValueError:
            continue
        t = i / args.fps
        z = max([punch_curve(t - m, peak) for m, peak in punches] + [1.0])
        for m, secs in pushes:   # freeze: a slow push-in so the held frame never sits still
            if m - 1e-6 <= t < m + secs:
                z = max(z, 1 + 0.10 * (1 - (1 - (t - m) / secs) ** 2))
        dx = dy = 0.0
        for j, (m, px) in enumerate(shakes):
            ox, oy = shake_offset(t - m, px, seed=j)
            dx += ox; dy += oy
        fl = max([a * math.exp(-(t - m) / 0.07) for m, a in flashes if 0 <= t - m < 0.3] + [0.0])
        out = wd / f.name
        if z > 1.0005 or abs(dx) > 0.3 or abs(dy) > 0.3 or fl > 0.01:
            im = Image.open(f.resolve()).convert("RGB")
            if abs(dx) > 0.3 or abs(dy) > 0.3:
                z = max(z, 1 + 2 * (abs(dx) + abs(dy) + 2) / im.width)   # zoom just enough to hide the edges
            cw, ch = im.width / z, im.height / z
            x0 = (im.width - cw) / 2 + dx / z; y0 = (im.height - ch) / 2 + dy / z
            im = im.resize(im.size, Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))
            if fl > 0.01:
                im = Image.blend(im, Image.new("RGB", im.size, (255, 255, 255)), min(1.0, fl))
            im.save(out, compress_level=1)
            n += 1
        else:
            out.symlink_to(f.resolve())
    print(f"frame fx: {n} frames ({len(punches)} punches, {len(shakes)} shakes, {len(flashes)} flashes, {len(pushes)} freezes)")
    args.frames = str(wd / src.name)


def stamp_cards(cards, freeze):
    """Impact cards plus the freeze frames' stamped text (style 'stamp')."""
    out = [list(c) for c in _load(cards)]
    for f in _load(freeze):
        if len(f) > 2 and f[2]:
            out.append([f[0], f[2], float(f[1] if len(f) > 1 else 0.6) + 0.15, f[3] if len(f) > 3 else "red", 0, "stamp"])
    return out


def fallen_fn(args):
    """[(t0, t1, label, blocks_at(t))] for the live "blocks fallen" counters, in Short time:
    altitude from the recording's poses (tick, x, y, z, ...), through the speed map."""
    spec = _load(args.fallen)
    if not spec:
        return []
    rec = json.loads(pathlib.Path(args.rec_path).read_text())
    poses, src_tl = rec["poses"], rec["timeline"]
    warp = getattr(args, "warp", None)
    out_tl = warp.timeline(src_tl) if warp else src_tl
    def y_at(t_src):
        k = min(len(poses) - 1, max(0, t_src * 20))
        a = poses[int(k)][2]; b = poses[min(len(poses) - 1, int(k) + 1)][2]
        return a + (b - a) * (k - int(k))
    res = []
    for sp in spec:
        ta, tb = event_times(out_tl, sp[0]), event_times(out_tl, sp[1])
        if not ta or not tb:
            continue
        t0, t1 = ta[0] - args.start, tb[0] - args.start
        y0 = y_at(warp.src(ta[0]) if warp else ta[0])
        fn = (lambda t, y0=y0: max(0, int(round(y0 - y_at(warp.src(t + args.start) if warp else t + args.start)))))
        res.append((t0, t1, sp[2] if len(sp) > 2 else "blocks", fn))
    return res


# ---------------------------------------------------------------- counter + cards track
def _pop(dt, dur=0.18, over=0.75):
    """Scale for a pop-in: from 1+over down past 1 (a small undershoot) and back to 1."""
    if dt >= dur:
        return 1.0
    k = dt / dur
    return 1 + over * (1 - k) ** 2 * math.cos(k * math.pi * 1.2)


def stamp_img(text, color):
    """A rubber-stamp label: bold text in a thick rounded frame, tilted."""
    t = rich_text(text.upper(), 120, color, stroke=(255, 255, 255, 255), stroke_w=6)
    pad = 26
    im = Image.new("RGBA", (t.width + 2 * pad, t.height + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((6, 6, im.width - 7, im.height - 7), 24, outline=(255, 255, 255, 255), width=20)
    d.rounded_rectangle((10, 10, im.width - 11, im.height - 11), 20, outline=tuple(color) + (255,), width=12)
    im.alpha_composite(t, (pad, pad))
    return im.rotate(-8, Image.BICUBIC, expand=True)


def fx_concat(counter, cards, timeline, start, dur, outdir, fps=60, fallen=()):
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
                        COLORS.get((cd[3] if len(cd) > 3 else "yellow") or "yellow", COLORS["yellow"]),
                        "stamp" if len(cd) > 5 and cd[5] == "stamp" else (-5 if j % 2 == 0 else 4)))
    if not marks and not cds and not fallen:
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
        fk = None
        for t0, t1, label, fn in fallen:     # live "blocks fallen" counter, held 0.6 s after the landing
            if t0 <= t + 1e-6 < t1 + 0.6:
                fk = (fn(min(t, t1)), label, t >= t1)
        key = (ck, cc, fk)
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
                    imgs[("t", text, color)] = stamp_img(text, color) if tilt == "stamp" else \
                        block_text(text, 150 if len(text) <= 8 else 116, color).rotate(tilt, Image.BICUBIC, expand=True)
                im = imgs[("t", text, color)]
                if s != 1.0:
                    im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.BICUBIC)
                if fade < 1:
                    im = im.copy(); im.putalpha(im.split()[3].point(lambda v: int(v * fade)))
                cy = BAND + int(GAME_H * 0.27)
                img.alpha_composite(im, ((W - im.width) // 2, cy - im.height // 2))
            if fk:
                v, label, done = fk
                num = rich_text(f"{v}", 92, COLORS["green"] if done else COLORS["white"])
                lab = rich_text(label, 48, COLORS["white"])
                x1 = W - 40
                img.alpha_composite(num, (x1 - num.width, BAND + 22))
                img.alpha_composite(lab, (x1 - lab.width, BAND + 22 + num.height - 14))
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


# ---------------------------------------------------------------- instant replay
def replay_append(out, replay_dir, caption_png, audio, fps=60):
    """Append the third-person instant replay (scripts/render_replay.py) after the Short: the replay
    frames in the game view under the caption, a "REPLAY" tag, a white flash on the cut, the game
    audio of the window slowed to match. Rewrites `out` in place; returns the seconds added."""
    rd = pathlib.Path(replay_dir)
    meta = json.loads((rd / "replay.json").read_text())
    spec, (a, b), rfps = meta["spec"], meta["src"], meta["fps"]
    speed = float(spec.get("speed", 0.5))
    frames = sorted(rd.glob("f*.png"))
    if not frames:
        return 0.0
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="hb-replay-"))
    for k, f in enumerate(frames):
        (tmp / f"r{k:05d}.png").symlink_to(f.resolve())
    d = len(frames) / fps
    tag = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    lab = rich_text(spec.get("label", "REPLAY"), 64, COLORS["white"])
    dot = Image.new("RGBA", (40, 40), (0, 0, 0, 0)); ImageDraw.Draw(dot).ellipse((2, 2, 37, 37), fill=(255, 50, 40, 255), outline=(0, 0, 0, 255), width=4)
    tag.alpha_composite(dot, (40, BAND + 38)); tag.alpha_composite(lab, (90, BAND + 22))
    tag.save(tmp / "tag.png")
    sys.path.insert(0, str(HERE / "scripts"))
    from timewarp import atempo
    g = [f"[0:v]scale={W}:{GAME_H}:force_original_aspect_ratio=increase,crop={W}:{GAME_H},pad={W}:{H}:0:{BAND}:black,"
         f"fade=t=in:st=0:d=0.12:color=white,format=rgba[r0]",
         "[r0][1:v]overlay=0:0[r1]", "[r1][2:v]overlay=0:0,setsar=1,format=yuv420p[rv]",
         "[3:v]setsar=1,format=yuv420p[mv]",
         "[3:a]aresample=48000,aformat=channel_layouts=stereo[ma]"]
    ins = ["-framerate", str(fps), "-i", str(tmp / "r%05d.png"), "-loop", "1", "-i", str(caption_png), "-loop", "1", "-i", str(tmp / "tag.png"), "-i", out]
    if audio:
        ins += ["-i", audio]
        g.append(f"[4:a]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS,{atempo(speed)},loudnorm=I=-16:TP=-2,aresample=48000,"
                 f"aformat=channel_layouts=stereo,apad=whole_dur={d:.4f},atrim=0:{d:.4f}[ra]")
    else:
        g.append(f"anullsrc=r=48000:cl=stereo,atrim=0:{d:.4f}[ra]")
    g.append("[mv][ma][rv][ra]concat=n=2:v=1:a=1[v][a]")
    res = tmp / "out.mp4"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *ins, "-filter_complex", ";".join(g), "-map", "[v]", "-map", "[a]",
                    "-t", f"{float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout) + d:.3f}",
                    "-r", str(fps), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(res)], check=True)
    shutil.move(str(res), out)
    print(f"replay: {d:.2f}s appended ({a:.2f}-{b:.2f}s of the recording at {speed:g}x, CAM={spec.get('cam')})")
    return d


# ---------------------------------------------------------------- loop ending
def loop_end(out, secs=0.25, fps=60):
    """Dissolve the last `secs` into the Short's first frame, so the loop back to the start is seamless
    (the length stays the same). Rewrites `out` in place."""
    secs = float(secs if secs is not True else 0.25)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], capture_output=True, text=True).stdout)
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="hb-loop-"))
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", out, "-frames:v", "1", str(tmp / "first.png")], check=True)
    res = tmp / "out.mp4"
    g = (f"[1:v]fps={fps},format=yuv420p,setsar=1,settb=1/{fps}[f];[0:v]fps={fps},format=yuv420p,setsar=1,settb=1/{fps}[m];"
         f"[m][f]xfade=transition=fade:duration={secs:.3f}:offset={dur - secs:.3f}[v]")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", out, "-loop", "1", "-framerate", str(fps), "-t", f"{secs + 0.05:.3f}", "-i", str(tmp / "first.png"),
                    "-filter_complex", g, "-map", "[v]", "-map", "0:a?", "-c:a", "copy", "-t", f"{dur:.3f}", "-c:v", "libx264", "-preset", "medium",
                    "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(res)], check=True)
    shutil.move(str(res), out)
    print(f"loop: last {secs:.2f}s dissolve into the first frame")
