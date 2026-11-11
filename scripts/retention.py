"""Retention toolkit for edit.py: payoff emphasis, beat counters, impact cards and the hook preview.

Every feature is optional and comes from the stunt's `edit` block (scripts/edit_args.js):

  punch:   [EVENT | [EVENT, NTH, SCALE]]          (SCALE 0.12 or 1.12, same thing) zoom punch on the game view: 1.0 -> 1.12 -> 1.0
                                                   in ~0.4 s (the HUD and caption don't zoom, like
                                                   a FOV kick)
  slowmo:  [[EVENT, BEFORE_S, AFTER_S, FACTOR]]    slow motion around a mark (scripts/timewarp.py;
                                                   FACTOR defaults to 0.5). Keep it short (~0.5 s
                                                   of footage) so it never reads as dead space.
  counter: {"at": [EVENT, ...], "total": N}        "3/5" beat counter in the top-left of the game
           or [EVENT, ...]                         view, popping up on each mark
  cards:   [[EVENT, TEXT, SECONDS?, COLOR?, NTH?]]  big impact text popping on a mark ("10/10",
                                                   "NO WAY"); COLOR: white|red|green|yellow|blue|gold
  zoom:    [[START[:off], END[:off], SCALE]]       a held push-in on the crosshair (eases in 0.4 s,
                                                   back out over 0.25 s after END); multiplies with punch.
                                                   It upscales the rendered frame, so above ~1.3-1.4x
                                                   pixel art goes soft: for big push-ins use the
                                                   stunt's `fovZoom` (same spec, recording time), which
                                                   narrows the render camera's FOV and stays sharp
  shake:   [EVENT | [EVENT, NTH, PX]]             screen shake on the game view (default 16 px, 0.35 s)
  flash:   [EVENT | [EVENT, NTH, ALPHA]]          white flash on the game view (0.7, ~0.2 s)
  freeze:  [[EVENT, SECONDS, TEXT?, COLOR?]]      freeze frame on a mark with a slow push-in and a
                                                   stamped label ("1 IN A MILLION"); it adds SECONDS
  fallen:  [[EVENT_A, EVENT_B, LABEL?]]           live "blocks fallen" counter (top right) from the
                                                   recorded altitude, turning green on EVENT_B
  hook:    {"at": EVENT, "before": 1.5, "after": 0.0, "text": "wait for the last one"}
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
import os
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


def x264():
    """The x264 settings of every full-video encode. HB_PREVIEW=1 (edit.py --preview, scripts/preview.py) trades
    quality for speed: the preview is cut down to 360x640 anyway."""
    if os.environ.get("HB_PREVIEW"):
        return ["-preset", "ultrafast", "-crf", "26"]
    return ["-preset", "medium", "-crf", "18", "-maxrate", "18M", "-bufsize", "36M"]


def hook_len(edit):
    """Seconds the hook preview adds in front of the Short (0 without one)."""
    h = _load(edit.get("hook")) if edit else None
    if not h:
        return 0.0
    return float(h.get("before", 1.5)) + float(h.get("after", 0.0))


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
        if not ts and event_at(timeline, p[0]) is not None:   # 'EVENT:OFFSET_S'
            ts = [event_at(timeline, p[0])]
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


def event_at(timeline, name):
    """Output time of 'EVENT' or 'EVENT:OFFSET_S' (first occurrence), or None."""
    ts = event_times(timeline, name)
    if ts:
        return ts[0]
    k, _, off = str(name).rpartition(":")
    try:
        ts = event_times(timeline, k)
        return ts[0] + float(off) if ts else None
    except ValueError:
        return None


def zoom_curve(t, a, b, scale, ease_in=0.4, ease_out=0.25):
    """Held zoom over [a, b]: smoothstep up to `scale` over ease_in, held, back to 1 over ease_out after b."""
    if t < a or t > b + ease_out:
        return 1.0
    sm = lambda k: k * k * (3 - 2 * k)
    k = sm(min(1.0, (t - a) / ease_in)) if t < b else sm(max(0.0, 1 - (t - b) / ease_out))
    return 1 + (scale - 1) * k


def apply_frame_fx(args, timeline):
    """Rewrite the frame sequence with the game-view effects (symlinks for untouched frames):
    zoom punches, screen shakes, white flashes, and a slow push-in on freeze frames. Runs after the
    speed/slowmo/freeze map, so `timeline` is in output time and frame i is t = i / fps. The HUD,
    caption and overlays are drawn later, so they stay still (like a FOV kick in the game)."""
    # punch SCALE: an increment (0.12) or an absolute zoom (1.12); 1.08 used to mean a 2.08x zoom
    punches = [(m, v - 1 if v >= 1 else v) for m, v in _marks(args.punch, timeline, 0.12)]
    # the spoken stress (edit.punchStress): a line's mark + the word's start in it; short: 0.06 s in, 0.2 s back
    lines_at = {e.get("id"): e["t"] / 1000 for e in timeline if e.get("event") == "line"}
    stress = [(lines_at[l] + float(off), float(pk)) for l, off, pk in _load(getattr(args, "punch_stress", None)) if l in lines_at]
    shakes = _marks(args.shake, timeline, 16.0)
    flashes = _marks(args.flash, timeline, 0.7)
    pushes = [(ts[0], float(f[1]) if len(f) > 1 else 0.6) for f in _load(args.freeze)
              for ts in [event_times(timeline, f[0])] if ts]
    zooms = []   # [[START[:off], END[:off], SCALE]]: a held push-in on the crosshair (one_in_a_million's falls)
    for zs in _load(getattr(args, "zoom", None)):
        a_, b_ = event_at(timeline, zs[0]), event_at(timeline, zs[1])
        if a_ is not None and b_ is not None and b_ > a_:
            zooms.append((a_, b_, float(zs[2]) if len(zs) > 2 else 1.5))
        else:
            print(f"zoom {zs} skipped (event missing or empty)")
    if not (punches or stress or shakes or flashes or pushes or zooms):
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
        z = max([punch_curve(t - m, peak) for m, peak in punches] + [punch_curve(t - m, pk, attack=0.06, decay=0.2) for m, pk in stress] + [1.0])
        for a_, b_, sc in zooms:   # composes with punches and shakes: the scales multiply
            z *= zoom_curve(t, a_, b_, sc)
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
            src_im = Image.open(f.resolve())
            mode = src_im.mode   # keep the renderer's pixel format: an RGB frame inside an RGBA
            im = src_im.convert("RGB")   # sequence made ffmpeg re-init the graph and drop every overlay on it
            if abs(dx) > 0.3 or abs(dy) > 0.3:
                z = max(z, 1 + 2 * (abs(dx) + abs(dy) + 2) / im.width)   # zoom just enough to hide the edges
            cw, ch = im.width / z, im.height / z
            x0 = (im.width - cw) / 2 + dx / z; y0 = (im.height - ch) / 2 + dy / z
            im = im.resize(im.size, Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))
            if fl > 0.01:
                im = Image.blend(im, Image.new("RGB", im.size, (255, 255, 255)), min(1.0, fl))
            im.convert(mode).save(out, compress_level=1)
            n += 1
        else:
            out.symlink_to(f.resolve())
    print(f"frame fx: {n} frames ({len(punches)} punches, {len(shakes)} shakes, {len(flashes)} flashes, {len(pushes)} freezes, {len(zooms)} zooms)")
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
        sa, sb = event_times(src_tl, sp[0]), event_times(src_tl, sp[1])   # the marks' own recording times
        ts0 = sa[0] if sa else (warp.src(ta[0] + 1e-6) if warp else ta[0])
        # the standing height: the highest pose in the 0.25 s before the drop mark (at the mark the
        # player can already be 0.08 below the block top, which read 99 under a "100 blocks" label)
        y0 = max(y_at(ts0 - k / 20) for k in range(0, 6))
        # -1 for a water landing (the end mark fires with the feet inside the water block, one under
        # the surface): automatic for 'splash*' end marks, else pass it as the 4th field
        off = int(sp[3]) if len(sp) > 3 else (-1 if str(sp[1]).startswith("splash") else 0)
        final = max(0, int(math.floor(y0 - y_at(sb[0]))) + off) if sb else None   # the landing value, from the mark itself
        fn = (lambda t, y0=y0, off=off, t1=t1, final=final:
              final if final is not None and t >= t1 - 1e-6 else
              max(0, int(math.floor(y0 - y_at(warp.src(t + args.start) if warp else t + args.start))) + off))
        # held 0.6 s after the landing, but never past the next hard cut (the last total stayed up
        # over the next shot: worker 3, drops)
        cuts = [warp.out(a) - args.start for a, b, f in (warp.spans if warp else []) if f == math.inf]
        hold = min([t1 + 0.6] + [c for c in cuts if c > t1 - 1e-6])
        res.append((t0, t1, sp[2] if len(sp) > 2 else "blocks", fn, hold))
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
    t = rich_text(text.upper(), 100, color, stroke=(255, 255, 255, 255), stroke_w=6)
    pad = 26
    im = Image.new("RGBA", (t.width + 2 * pad, t.height + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((6, 6, im.width - 7, im.height - 7), 24, outline=(255, 255, 255, 255), width=20)
    d.rounded_rectangle((10, 10, im.width - 11, im.height - 11), 20, outline=tuple(color) + (255,), width=12)
    im.alpha_composite(t, (pad, pad))
    return im.rotate(-8, Image.BICUBIC, expand=True)


def countdown_windows(spec, timeline, start):
    """[(t0, t1, label)] in Short time for [START, END, LABEL?, NTH?] entries; without NTH every START
    occurrence pairs with the next END after it (one countdown per round)."""
    out = []
    for c in _load(spec):
        a, b = event_times(timeline, c[0]), event_times(timeline, c[1])
        label = c[2] if len(c) > 2 and c[2] is not None else ""
        red = float(c[4]) if len(c) > 4 and c[4] is not None else 0.5   # red under this many seconds
        yf = float(c[5]) if len(c) > 5 and c[5] is not None else 0.42   # height in the game view (0.13 = centre-top)
        if len(c) > 3 and c[3] is not None:
            n = int(c[3]); a = a[n:n + 1]
        for ta in a:
            tb = next((x for x in b if x > ta + 1e-6), None)
            if tb is not None:
                out.append((ta - start, tb - start, label, red, yf))
    return out


def countdown_img(left, total, label, since, red_under=0.5, yf=0.42):
    """A live round countdown: the label, a big digit (ceil of the time left, popping on each
    change), and a bar draining every frame; red under `red_under` s. The bar sits under the digit's
    baseline and the pop is capped to the room between the label and the bar (it covered the label
    for 1-2 frames: worker 13)."""
    red = left < red_under
    color = COLORS["red"] if red else COLORS["white"]
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    k = 1.0 if yf >= 0.3 else 0.6   # near the top: smaller, so it stays inside the game view
    cy = BAND + int(GAME_H * yf)
    size, sw = int(260 * k), int(14 * k)
    # never above the window's own whole seconds: a 3.15 s window (tick jitter) opened on a "4" (worker 13)
    digit = rich_text(str(max(1, min(math.ceil(left - 1e-6), max(1, round(total))))), size, color, stroke_w=sw)
    asc = ImageFont.truetype(FONT, size).getmetrics()[0]
    cap_top = asc - int(size * 0.73)            # the empty space above a digit's cap height in the box
    top0 = cy - digit.height // 2
    baseline = top0 + sw + 2 + asc
    bar_y = baseline + sw + int(14 * k)
    lab_bottom = None
    if label:
        lab = rich_text(label, int(72 * k), COLORS["yellow"])
        ly = max(BAND + 4, top0 + cap_top - lab.height + int(10 * k))
        img.alpha_composite(lab, ((W - lab.width) // 2, ly))
        lab_bottom = ly + lab.height - int(10 * k)
    sc = _pop(since, 0.2, 0.45)
    if lab_bottom is not None:                  # grow about the baseline, never over the label
        room = baseline - lab_bottom
        sc = min(sc, max(1.0, room / max(1, baseline - (top0 + cap_top))))
    if sc != 1.0:
        digit = digit.resize((int(digit.width * sc), int(digit.height * sc)), Image.BICUBIC)
    top = int(baseline - (sw + 2 + asc) * sc)   # keep the baseline put: the bar never gets covered
    img.alpha_composite(digit, ((W - digit.width) // 2, top))
    bw, bh = int(W * 0.6 * k), int(26 * k)
    x0 = (W - bw) // 2
    d = ImageDraw.Draw(img)
    # a light outline on the track: over dark scenes the bare draining bar read as "_4" or "- 1" (worker 12)
    d.rounded_rectangle((x0 - 6, bar_y - 6, x0 + bw + 6, bar_y + bh + 6), 16, fill=(0, 0, 0, 200), outline=(235, 235, 235, 230), width=max(2, int(4 * k)))
    fw = int(bw * max(0.0, min(1.0, left / total)))
    if fw > 0:
        d.rounded_rectangle((x0, bar_y, x0 + fw, bar_y + bh), 12, fill=tuple(color) + (255,))
    return img


def ring_windows(spec, timeline, start):
    """[(t0, t1, xf, yf, r)] for ring: [[EVENT[:off], SECONDS, X_FRAC?, Y_FRAC?, RADIUS_PX?]]."""
    out = []
    for r in _load(spec):
        t = event_at(timeline, r[0])
        if t is None:
            print(f"ring {r} skipped (event missing)"); continue
        out.append((t - start, t - start + float(r[1] if len(r) > 1 else 1.5), float(r[2]) if len(r) > 2 and r[2] is not None else 0.5,
                    float(r[3]) if len(r) > 3 and r[3] is not None else 0.5, int(r[4]) if len(r) > 4 and r[4] else 110))
    return out


def ring_img(xf, yf, r, scale, alpha, pulse):
    """A thick red highlight ring with a white edge (spot-the-difference style)."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rr = r * scale * (1 + 0.04 * pulse)
    cx, cy = xf * W, BAND + yf * GAME_H
    d = ImageDraw.Draw(img)
    d.ellipse((cx - rr - 4, cy - rr - 4, cx + rr + 4, cy + rr + 4), outline=(255, 255, 255, 255), width=22)
    d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=(235, 30, 30, 255), width=14)
    if alpha < 1:
        img.putalpha(img.split()[3].point(lambda v: int(v * alpha)))
    return img


def tag_windows(spec, timeline, start, dur):
    """[(t0, t1, text, color)] for tags: [[START, END|null, TEXT, COLOR, NTH?]]; a null END runs to the
    next tag's start (or the end)."""
    raw = []
    for tg in _load(spec):
        ts = event_times(timeline, tg[0])
        nth = int(tg[4]) if len(tg) > 4 and tg[4] is not None else 0
        if len(ts) <= nth:
            print(f"tag {tg[:3]} skipped (event missing)"); continue
        t0 = ts[nth] - start
        t1 = None
        if tg[1]:
            te = next((x for x in event_times(timeline, tg[1]) if x > ts[nth] + 1e-6), None)
            t1 = te - start if te is not None else None
        raw.append([t0, t1, tg[2], COLORS.get(tg[3] if len(tg) > 3 else "white", COLORS["white"])])
    raw.sort(key=lambda x: x[0])
    for j, tg in enumerate(raw):
        if tg[1] is None:
            tg[1] = raw[j + 1][0] if j + 1 < len(raw) else dur + 1
    return [tuple(x) for x in raw]


def tag_img(text, color, scale):
    """A persistent role label at the top centre of the game view: bold text in a dark box."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    t = rich_text(text, 84, color)
    pad = 18
    box = Image.new("RGBA", (t.width + 2 * pad, t.height + pad), (0, 0, 0, 0))
    ImageDraw.Draw(box).rounded_rectangle((0, 0, box.width - 1, box.height - 1), 22, fill=(0, 0, 0, 170))
    box.alpha_composite(t, (pad, pad // 2))
    if scale != 1.0:
        box = box.resize((max(1, int(box.width * scale)), max(1, int(box.height * scale))), Image.BICUBIC)
    img.alpha_composite(box, ((W - box.width) // 2, BAND + 30 + int(box.height * (1 - scale) / 2)))
    return img


def chat_windows(spec, timeline, start):
    """[(t_type, t_enter, t_close, text, feedback)] for chat: [[EVENT, TEXT, TYPE_S?, HOLD_S?, FEEDBACK?]]."""
    out = []
    for c in _load(spec):
        t = event_at(timeline, c[0])
        if t is None:
            print(f"chat {c[:2]} skipped (event missing)"); continue
        typ = float(c[2]) if len(c) > 2 and c[2] is not None else 1.2
        hold = float(c[3]) if len(c) > 3 and c[3] is not None else 0.0
        recall = typ <= 0.05               # a recalled line (up arrow): the whole line at once, on screen 0.3 s
        typ = 0.3 if recall else typ
        out.append((t - start - typ, t - start, t - start + hold, c[1], c[4] if len(c) > 4 else None, recall))
    return out


_jar = None
def chat_img(typed, cursor, feedback, fb_alpha=1.0):
    """Vanilla ChatScreen at GUI scale 3: the translucent input box along the bottom of the game view
    (fill(2, h-14, w-2, h-2, 0x80000000)), the typed text in the game font at (4, h-12) with a
    blinking '_', and an optional feedback line above it in the chat history."""
    global _jar
    import zipfile
    from edit import draw_text, CLIENT_JAR, GUI
    if _jar is None:
        _jar = zipfile.ZipFile(CLIENT_JAR)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    bottom = BAND + GAME_H
    if typed is not None:
        d.rectangle((2 * GUI, bottom - 14 * GUI, W - 2 * GUI, bottom - 2 * GUI), fill=(0, 0, 0, 128))
        draw_text(img, _jar, typed + ("_" if cursor else ""), 4 * GUI, bottom - 12 * GUI)
    # feedback: the chat history, newest at the bottom, stacked 9 GUI px a line like vanilla
    lines = feedback if isinstance(feedback, tuple) else ((feedback, fb_alpha),) if feedback else ()
    for n_, (text, a_) in enumerate(reversed(lines)):
        if a_ <= 0.01:
            continue
        y_ = bottom - (49 + 9 * n_) * GUI
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(layer).rectangle((0, y_, 320 * GUI, y_ + 9 * GUI), fill=(0, 0, 0, 128))
        draw_text(layer, _jar, text, 2 * GUI, y_ + GUI, color=(220, 220, 220, 255))
        if a_ < 1:
            layer.putalpha(layer.split()[3].point(lambda v, a_=a_: int(v * a_)))
        img.alpha_composite(layer)
    return img


def fx_concat(counter, cards, timeline, start, dur, outdir, fps=60, fallen=(), countdowns=None, rings=None, tags=None, chat=None, hide=(), cuts=()):
    """One overlay track (ffconcat of cached PNGs) with the beat counter and the impact cards."""
    marks = []                                       # counter marks: (video time, index)
    c = _load(counter)
    if c:
        at = c["at"] if isinstance(c, dict) else c
        total = int(c.get("total", len(at))) if isinstance(c, dict) else len(at)
        prefix = c.get("label", "") if isinstance(c, dict) else ""
        if len(at) == 1 and total > 1 and isinstance(at[0], str):   # {at: ['death'], total: 14}: every occurrence counts
            at = [[at[0], j] for j in range(len(event_times(timeline, at[0])))]
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
    cdw = countdown_windows(countdowns, timeline, start)
    rgw = ring_windows(rings, timeline, start)
    tgw = tag_windows(tags, timeline, start, dur)
    chw = chat_windows(chat, timeline, start)
    if not marks and not cds and not fallen and not cdw and not rgw and not tgw and not chw:
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
        for t0, t1, label, fn, hold in fallen:   # live "blocks fallen" counter, held after the landing
            if t0 <= t + 1e-6 < hold - 1e-6:
                fk = (fn(min(t, t1)), label, t >= t1)
        cwk = None
        for c0, c1, clabel, cred, cyf in cdw:      # live round countdowns (a new image every frame)
            if c0 <= t + 1e-6 < c1 - 1e-6:
                left = c1 - t
                since = t - max(c0, c1 - math.ceil(left - 1e-6))   # time since the digit last changed
                cwk = (round(left, 3), round(c1 - c0, 3), clabel, round(since, 3), cred, cyf)
        rk = None
        for r0, r1, xf, yf, rad in rgw:       # highlight ring: pops in, pulses, fades over the last 0.12 s
            if r0 <= t + 1e-6 < r1 - 1e-6:
                rk = (xf, yf, rad, round(_pop(t - r0, 0.2, 0.5), 2), round(min(1.0, (r1 - t) / 0.12), 2),
                      round(math.sin((t - r0) * 2 * math.pi * 1.5), 2))
        tk = None
        for g0, g1, gtext, gcolor in tgw:    # persistent role tag (no fade between consecutive tags)
            if g0 <= t + 1e-6 < g1 - 1e-6 and not any(h0 <= t + 1e-6 < h1 for h0, h1 in hide):   # not over a death screen
                tk = (gtext, gcolor, round(_pop(t - g0, 0.18, 0.5), 2))
        chk, typed_now, fbs = None, None, []
        for c0, c1, c2, ctext, cfb, crecall in chw:   # chat: typed letter by letter up to Enter, held, closed
            typed = None
            ccut = next((c for c in cuts if c > c0 + 1e-6), 1e9)   # it all closes at the next hard cut (worker 15)
            if t >= ccut - 1e-6:
                continue
            if c0 <= t + 1e-6 < c1:
                # typing ends 0.1 s before Enter and the full line holds (the last 1-3 characters never
                # showed: worker 15); TYPE_S <= 0.05 is a recalled line, shown whole at once
                c_done = c1 - 0.1
                k_ = len(ctext) if (crecall or t >= c_done - 1e-6) else \
                    int(len(ctext) * max(0.0, (t - c0) / max(1e-6, c_done - c0)))
                typed = ctext[:k_]
            elif c1 <= t + 1e-6 < c2:
                typed = ctext
            fb_a = 0.0
            if cfb and t >= c1 - 1e-6 and t < c1 + 2.0:
                fb_a = 1.0 if t < c1 + 1.5 else max(0.0, 1 - (t - c1 - 1.5) / 0.5)
            if typed is not None:
                typed_now = typed
            if fb_a > 0:
                fbs.append((cfb, round(fb_a, 2)))   # every open feedback line: vanilla stacks the history
        if typed_now is not None or fbs:
            chk = (typed_now, (int(t / 0.3) % 2 == 0) if typed_now is not None else False, tuple(fbs[-10:]))
        key = (ck, cc, fk, cwk, rk, tk, chk)
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
                s = min(s, W * 0.95 / im.width)   # the slam-in never clips the frame edges (the stamp did for 3 frames)
                if s != 1.0:
                    im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.BICUBIC)
                if fade < 1:
                    im = im.copy(); im.putalpha(im.split()[3].point(lambda v: int(v * fade)))
                cy = BAND + int(GAME_H * 0.36)   # below the corner counters
                img.alpha_composite(im, ((W - im.width) // 2, cy - im.height // 2))
            if cwk:
                img.alpha_composite(countdown_img(*cwk))
            if rk:
                img.alpha_composite(ring_img(*rk))
            if tk:
                img.alpha_composite(tag_img(*tk))
            if chk:
                img.alpha_composite(chat_img(*chk))
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
    # one symlink per output frame, read as an exact image sequence: through ffconcat + fps the
    # track landed one frame early at most marks (the counter changed a frame before the cut)
    seq = outdir / "fxseq"
    seq.mkdir(exist_ok=True)
    i = 0
    for p, k in runs:
        for _ in range(k):
            (seq / f"fx{i:05d}.png").symlink_to(pathlib.Path(p).resolve())
            i += 1
    return str(seq / "fx%05d.png")


# ---------------------------------------------------------------- hook preview
def hook_prepend(out, spec, t_video, fps=60, frames=None, start_index=0, caption=None):
    """Put [t_video-before, t_video+after] of the Short in front of it, with the hook text over it
    and a slow push-in, then cut to the start. Rewrites `out` in place. With `frames` (the edit's
    game-view frame pattern, output-indexed) and `caption`, the clip is built from the clean game
    frames + the caption, so no counter, card or HUD from the finale shows in it (the old crop of the
    finished video left fragments of the blocks-fallen counter at the top edge); otherwise it falls
    back to cropping the finished video."""
    h = _load(spec)
    before, after = float(h.get("before", 1.5)), float(h.get("after", 0.0))
    text = h.get("text", "wait for the last one 😳")
    a, b = max(0.0, t_video - before), t_video + after
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="hb-hook-"))
    d = b - a
    n = int(round(d * fps))
    txt = block_text(text, 104, COLORS["white"], max_w=W * 0.8)
    smax = W * 0.95 / txt.width                 # the pop never grows past 95% of the view (it was cut off)
    cy = BAND + int(GAME_H * 0.2)               # high in the view: the hook has no counters, and lower it covered the target
    for i in range(n + 1):                      # the text pops in over the first 0.15 s
        sc = min(1.0, smax)   # no pop: frame 0 must match the loop's last frame (the pop made the loop end jump)
        im = txt if sc == 1.0 else txt.resize((int(txt.width * sc), int(txt.height * sc)), Image.BICUBIC)
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ov.alpha_composite(im, ((W - im.width) // 2, cy - im.height // 2))
        ov.save(tmp / f"hook{i:03d}.png", compress_level=1)
    has_audio = bool(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", out],
                                    capture_output=True, text=True).stdout.strip())
    zoom = f"1+0.08*t/{d:.3f}"                 # a slow push-in, so the flash never sits still
    push = (f"scale=w='trunc({W}*({zoom})/2+1)*2':h='trunc({GAME_H}*({zoom})/2+1)*2':eval=frame,"
            f"crop={W}:{GAME_H},format=rgba")
    if frames and caption:
        # -t on the clip's inputs: read only the hook's frames (decoding the whole sequence while the
        # main video queued behind the concat took 5+ GB and many minutes)
        ins = ["-framerate", str(fps), "-start_number", str(start_index + int(round(a * fps))), "-t", f"{d + 0.05:.4f}", "-i", frames,
               "-i", out, "-framerate", str(fps), "-i", str(tmp / "hook%03d.png"),
               "-loop", "1", "-framerate", str(fps), "-t", f"{d + 0.05:.4f}", "-i", str(caption)]
        g = [f"[0:v]trim=end_frame={n},setpts=PTS-STARTPTS,scale={W}:{GAME_H}:force_original_aspect_ratio=increase,crop={W}:{GAME_H},"
             f"{push},pad={W}:{H}:0:{BAND}:black[hc0]",
             "[hc0][3:v]overlay=0:0[hc]"]
        va = "1"
    else:
        # fallback: crop the finished video below the corner counters (same aspect), then push in
        top = 190
        cw = int(W * (GAME_H - top) / GAME_H) // 2 * 2
        ins = ["-i", out, "-i", out, "-framerate", str(fps), "-i", str(tmp / "hook%03d.png")]
        g = [f"[0:v]trim={a:.4f}:{b:.4f},setpts=PTS-STARTPTS,split[hk][hb]",
             f"[hk]crop=w={cw}:h={GAME_H - top}:x={(W - cw) // 2}:y={BAND + top},scale={W}:{GAME_H},{push}[hz]",
             f"[hb][hz]overlay=0:{BAND}[hc]"]
        va = "0"
    g += ["[2:v]format=rgba[tx]",
          "[hc][tx]overlay=0:0:shortest=1,setsar=1,format=yuv420p[h1]",
          "[1:v]setsar=1,format=yuv420p[m1]"]
    if has_audio:
        g.append(f"[{va}:a]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS,afade=t=out:st={max(0, d - 0.03):.4f}:d=0.03[ha]")
        g.append("[h1][ha][m1][1:a]concat=n=2:v=1:a=1[v][a]")
        maps = ["-map", "[v]", "-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
    else:
        g.append("[h1][m1]concat=n=2:v=1:a=0[v]")
        maps = ["-map", "[v]"]
    res = tmp / "out.mp4"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *ins,
                    "-filter_complex", ";".join(g), *maps, "-r", str(fps), "-c:v", "libx264", *x264(),
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(res)], check=True)
    shutil.move(str(res), out)
    print(f"hook: {d:.2f}s of the finale ({a:.2f}-{b:.2f}s) in front, \"{text}\"")


# ---------------------------------------------------------------- instant replay
def replay_append(out, replay_dir, caption_png, audio, fps=60, audio_window=None, tag_off=0.0):
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
         "[r0][1:v]overlay=0:0[r1]", (f"[r1][2:v]overlay=0:0:enable='lt(t,{max(0.0, d - tag_off):.4f})',setsar=1,format=yuv420p[rv]" if tag_off else
          "[r1][2:v]overlay=0:0,setsar=1,format=yuv420p[rv]"),   # the tag clears only for the loop dissolve
         "[3:v]setsar=1,format=yuv420p[mv]",
         "[3:a]aresample=48000,aformat=channel_layouts=stereo[ma]"]
    ins = ["-framerate", str(fps), "-i", str(tmp / "r%05d.png"), "-loop", "1", "-framerate", str(fps), "-i", str(caption_png), "-loop", "1", "-framerate", str(fps), "-i", str(tmp / "tag.png"), "-i", out]
    if audio:
        ins += ["-i", audio]
        aa, ab = audio_window or (a, b)   # the edit's game+sfx track (Short time) when there is one: wind, boom
        g.append(f"[4:a]atrim={aa:.4f}:{ab:.4f},asetpts=PTS-STARTPTS,{atempo(speed)},{__import__("loud").static(audio, -18, aa, ab - aa)},aresample=48000,"
                 f"aformat=channel_layouts=stereo,apad=whole_dur={d:.4f},atrim=0:{d:.4f}[ra]")
    else:
        g.append(f"anullsrc=r=48000:cl=stereo,atrim=0:{d:.4f}[ra]")
    g.append("[mv][ma][rv][ra]concat=n=2:v=1:a=1[v][a]")
    res = tmp / "out.mp4"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *ins, "-filter_complex", ";".join(g), "-map", "[v]", "-map", "[a]",
                    "-t", f"{float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout) + d:.3f}",
                    "-r", str(fps), "-c:v", "libx264", *x264(), "-pix_fmt", "yuv420p",
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
                    "-filter_complex", g, "-map", "[v]", "-map", "0:a?", "-c:a", "copy", "-t", f"{dur:.3f}", "-c:v", "libx264", *x264(), "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(res)], check=True)
    shutil.move(str(res), out)
    print(f"loop: last {secs:.2f}s dissolve into the first frame")
