"""HelloBuh edit: game footage -> 1080x1920 Short with the black caption band and a drawn HUD.

  python3 edit.py --video in.mp4 | --frames 'dir/f%04d.jpg' --fps 26
                  --caption "water bucket clutch 💀" [--red WORD]
                  [--timeline timeline.json] [--audio game.wav] [--hud/--no-hud]
                  --out out.mp4

Layout (measured from a real HelloBuh Short): equal black bands top and bottom (~23.7% each), a
white bold centered caption in the top band, gameplay 1080x1011 in the middle, center-cropped. The HUD (hotbar, hearts,
food) is drawn from the client jar's own GUI sprites at GUI scale 3, because the renderers we
use either don't draw it (prismarine-viewer) or we choose to keep it consistent. The slot
highlight and the bucket item follow the bot's timeline. Audio: game sounds alone at -18 LUFS, or
with --song the owner's song baked in under them, mastered to -10 LUFS like the reference Short.
"""
import argparse
import io
import json
import re
import math
import pathlib
import subprocess
import sys
import tempfile
import urllib.request
import zipfile

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
# Measured on a real HelloBuh Short (afk firework save, 720x1280): black 0-303, game 303-977,
# black 977-1280; caption centered at y~181, ~68% of the width. Scaled to 1080x1920:
W, H, BAND = 1080, 1920, 455
GAME_H = 1011                      # game area 1080x1011 between equal black bands
CAPTION_Y = 271                    # vertical center of the caption block
CAPTION_SIZE = 78                  # px; reference text is ~62 px tall at 1080 wide
GUI = 3  # Minecraft GUI scale
FONT = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
TWEMOJI = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/{}.png"
CLIENT_JAR = HERE / "work" / "client" / (dict(l.split("=", 1) for l in (HERE / "versions.env").read_text().splitlines() if "=" in l and not l.startswith("#"))["MC_VERSION"] + ".jar")
HOTBAR = ["item/diamond_sword", "item/water_bucket", "block/cobblestone", "item/bread", None, None, None, None, None]


def sprite(jar, path):
    with jar.open(f"assets/minecraft/textures/{path}.png") as f:
        im = Image.open(io.BytesIO(f.read())).convert("RGBA")
    return im.crop((0, 0, im.width, im.width)) if im.height > im.width * 2 else im  # animated strips: first frame


def big(im):
    return im.resize((im.width * GUI, im.height * GUI), Image.NEAREST)


def emoji_png(ch):
    code = "-".join(f"{ord(c):x}" for c in ch if ord(c) != 0xFE0F)
    cache = HERE / "work" / "emoji" / f"{code}.png"
    if not cache.exists():
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_bytes(urllib.request.urlopen(TWEMOJI.format(code), timeout=30).read())
    return Image.open(cache).convert("RGBA")


def split_emoji(tok):
    """'⛏️💀' -> ['⛏️', '💀'] (Twemoji has one file per emoji; ZWJ sequences and skin tones stay whole).
    Tokens with any ordinary text are left alone."""
    if not tok or any(ord(c) <= 0x2500 and c not in "\u200d\ufe0f" for c in tok):
        return [tok]
    out = []
    for i, c in enumerate(tok):
        joiner = c in "\u200d\ufe0f" or 0x1F3FB <= ord(c) <= 0x1F3FF or (i > 0 and tok[i - 1] == "\u200d")
        if out and joiner:
            out[-1] += c
        else:
            out.append(c)
    return out


def caption_png(text, red_word, path, colors=None):
    """White bold caption, centered in the top band; emoji drawn from Twemoji, one word optionally red."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, BAND), fill=(0, 0, 0, 255))
    d.rectangle((0, BAND + GAME_H, W, H), fill=(0, 0, 0, 255))
    tokens = [t for tok in text.split(" ") for t in split_emoji(tok)]

    def is_emoji(tok):
        return any(ord(c) > 0x2500 for c in tok)

    def measure(toks, font, size):
        ws = [(size + 6) if is_emoji(t) else d.textlength(t, font=font) for t in toks]
        return ws, sum(ws) + d.textlength(" ", font=font) * (len(toks) - 1)

    # Size measured on the reference Shorts: ~62 px tall text at 1080 wide = Inter ExtraBold 78.
    # One line if it fits in 80% of the width at >= 70 px; otherwise two balanced lines at 78
    # (like "instant respawn / = re:zero moment"), shrinking only if a line still won't fit.
    lines, size = None, CAPTION_SIZE
    for sz in range(CAPTION_SIZE, 69, -2):
        f = ImageFont.truetype(FONT, sz)
        if measure(tokens, f, sz)[1] <= W * 0.80:
            lines, size = [tokens], sz
            break
    if lines is None and len(tokens) > 1:
        for sz in range(CAPTION_SIZE, 40, -2):
            f = ImageFont.truetype(FONT, sz)
            best = min(range(1, len(tokens)), key=lambda k: max(measure(tokens[:k], f, sz)[1], measure(tokens[k:], f, sz)[1]))
            if max(measure(tokens[:best], f, sz)[1], measure(tokens[best:], f, sz)[1]) <= W * 0.86:
                lines, size = [tokens[:best], tokens[best:]], sz
                break
    if lines is None:
        lines, size = [tokens], 44
    font = ImageFont.truetype(FONT, size)
    asc, desc = font.getmetrics()
    line_h = int(size * 1.12)
    y = CAPTION_Y - (line_h * len(lines)) / 2 + (line_h - (asc + desc)) / 2
    space = d.textlength(" ", font=font)
    for toks in lines:
        widths, total = measure(toks, font, size)
        x = (W - total) / 2
        for tok, w in zip(toks, widths):
            if is_emoji(tok):
                e = emoji_png(tok).resize((size, size), Image.LANCZOS)
                img.alpha_composite(e, (int(x + 3), int(y + 4)))
            else:
                key = tok.strip("?!.,:").lower()
                color = (255, 255, 255, 255)
                if red_word and key in red_word.lower().split():   # one word or a phrase
                    color = (235, 40, 40, 255)
                if colors and key in colors:
                    color = colors[key]
                d.text((x, y), tok, font=font, fill=color)
            x += w + space
        y += line_h
    img.save(path)


def hud_png(jar, slot, items, health, path, display=None, blink=False, shake=None):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bar = big(sprite(jar, "gui/sprites/hud/hotbar"))
    sel = big(sprite(jar, "gui/sprites/hud/hotbar_selection"))
    bx, by = (W - bar.width) // 2, BAND + GAME_H - bar.height - GUI   # hotbar sits at the bottom edge of the game
    img.alpha_composite(bar, (bx, by))
    # crosshair in the middle of the game view (vanilla draws it inverted against the scene; plain
    # white reads the same on sky and terrain)
    ch = big(sprite(jar, "gui/sprites/hud/crosshair"))
    img.alpha_composite(ch, ((W - ch.width) // 2, BAND + (GAME_H - ch.height) // 2))
    # selection box before the items and counts (Gui.renderItemHotbar), so counts stay readable
    img.alpha_composite(sel, (bx - GUI + 20 * GUI * slot, by - GUI))
    for i, it in enumerate(items):
        if not it:
            continue
        name, count, path_ = (it[0], it[1], None) if isinstance(it, (list, tuple)) else (None, 1, it)
        ix, iy = bx + (3 + 20 * i) * GUI, by + 3 * GUI
        icon3d = ICONS / f"{name}.png" if name else None
        if icon3d and icon3d.exists():            # block items: 3D icon rendered by renderer/icons.js
            img.alpha_composite(Image.open(icon3d).convert("RGBA").resize((16 * GUI, 16 * GUI), Image.NEAREST), (ix, iy))
        else:
            sp = path_ or item_sprite(name)
            if sp:
                img.alpha_composite(big(sprite(jar, sp)), (ix, iy))
        if count and count > 1:                   # stack count, like GuiGraphics.renderItemDecorations
            draw_text(img, jar, str(count), ix + (19 - 2) * GUI, iy + (6 + 3) * GUI, align_right=True)
    heart_c, heart = big(sprite(jar, "gui/sprites/hud/heart/container")), big(sprite(jar, "gui/sprites/hud/heart/full"))
    half = big(sprite(jar, "gui/sprites/hud/heart/half"))
    food_e, food = big(sprite(jar, "gui/sprites/hud/food_empty")), big(sprite(jar, "gui/sprites/hud/food_full"))
    xp_bg, xp = big(sprite(jar, "gui/sprites/hud/experience_bar_background")), big(sprite(jar, "gui/sprites/hud/experience_bar_progress"))
    img.alpha_composite(xp_bg, (bx + GUI, by - 7 * GUI))
    # no XP progress: a fresh player (the death screen says "Score: 0"; a 35% bar contradicted it)
    hy = by - 17 * GUI
    hc_blink = big(sprite(jar, "gui/sprites/hud/heart/container_blinking"))
    full_b, half_b = big(sprite(jar, "gui/sprites/hud/heart/full_blinking")), big(sprite(jar, "gui/sprites/hud/heart/half_blinking"))
    cur = math.ceil(health)
    disp = cur if display is None else display
    for i in range(9, -1, -1):                     # vanilla draws from the last heart down
        hx = bx + 8 * GUI * i
        y_ = hy + (shake[i] * GUI if shake else 0)
        img.alpha_composite(hc_blink if blink else heart_c, (hx, y_))
        q = 2 * i
        if blink and q < disp:                     # recently lost health flashes white
            img.alpha_composite(half_b if q + 1 == disp else full_b, (hx, y_))
        if q < cur:
            img.alpha_composite(half if q + 1 == cur else heart, (hx, y_))
    for i in range(10):
        fx = bx + bar.width - 9 * GUI - 8 * GUI * i
        img.alpha_composite(food_e, (fx, hy))
        img.alpha_composite(food, (fx, hy))
    img.save(path)


def item_sprite(name):
    """Inventory icon path for an item/block name (flat icons; blocks use their texture)."""
    if not name:
        return None
    names = JAR_NAMES()
    for p in (f"item/{name}", f"block/{name}", f"block/{name}_top", f"block/{name}_front"):
        if f"assets/minecraft/textures/{p}.png" in names:
            return p
    return None


_jar_names = None
def JAR_NAMES():
    global _jar_names
    if _jar_names is None:
        with zipfile.ZipFile(CLIENT_JAR) as z:
            _jar_names = set(z.namelist())
    return _jar_names


ICONS = HERE / "work" / "assets" / CLIENT_JAR.stem / "icons"
_font = None


def draw_text(img, jar, text, x, y, align_right=False, scale=None, color=(255, 255, 255, 255), center=False):
    """Minecraft's default font (textures/font/ascii.png, 8x8 cells) at GUI scale, white with the
    1px dark-grey shadow the game draws under HUD text."""
    global _font
    if _font is None:
        with jar.open("assets/minecraft/textures/font/ascii.png") as f:
            _font = Image.open(io.BytesIO(f.read())).convert("RGBA")
    glyphs = []
    for ch in text:
        c = ord(ch)
        cell = _font.crop(((c % 16) * 8, (c // 16) * 8, (c % 16) * 8 + 8, (c // 16) * 8 + 8))
        w = 0
        for xx in range(8):
            if any(cell.getpixel((xx, yy))[3] > 0 for yy in range(8)):
                w = xx + 1
        glyphs.append((cell, w if ch != " " else 4))
    S = scale or GUI
    width = sum(w + 1 for _, w in glyphs) - 1
    if align_right:
        x -= width * S
    if center:
        x -= width * S // 2
    shadow = tuple(int(c * 0.25) for c in color[:3]) + (255,)
    for col, off in ((shadow, 1), (color, 0)):
        cx = x
        for cell, w in glyphs:
            mask = cell.split()[3].resize((8 * S, 8 * S), Image.NEAREST)
            layer = Image.new("RGBA", (8 * S, 8 * S), col)
            img.paste(layer, (cx + off * S, y + off * S), mask)
            cx += (w + 1) * S


class JavaRandom:
    """java.util.Random / LegacyRandomSource, for the exact low-health heart shake."""
    def __init__(self, seed):
        self.s = (seed ^ 0x5DEECE66D) & ((1 << 48) - 1)

    def next_int2(self):
        self.s = (self.s * 0x5DEECE66D + 0xB) & ((1 << 48) - 1)
        return (2 * (self.s >> 17)) >> 31


def death_windows(timeline, event="death"):
    """[(death, respawn)] in seconds. One death is one window: a second death mark within 1.5 s
    (health packet + combat-kill packet) is the same death, and a respawn mark under 0.5 s after the
    death is the client's early respawn report, not the player clicking Respawn. Split windows
    made the death screen blink off for 2 frames (dig_up, worker 2's review)."""
    out, open_ = [], None
    for e in timeline or []:
        t = e["t"] / 1000
        if e["event"] == event:
            if open_ is None and not (out and out[-1][1] >= t - 0.05 and t - out[-1][0] < 1.5):
                open_ = t
            elif open_ is None:   # re-opened right after a bogus close: extend the last window
                open_ = out.pop()[0]
        elif e["event"] == "respawn" and open_ is not None and t - open_ >= 0.5:
            out.append((open_, t)); open_ = None
    if open_ is not None:
        out.append((open_, 1e9))
    return out


def hud_ticks(timeline, duration):
    """Per game tick: (slot, items, health, display_health, blink, shake) the way Gui draws it.
    A drop in health blinks the hearts for 20 ticks (white = health just lost, shown until 1 s
    after the last change); health <= 4 shakes each heart by 0-1 px, seeded with tick * 312871.
    Between death and respawn health is 0 (mineflayer reports the respawn health early)."""
    states = hud_states(timeline, duration)
    deaths = death_windows(timeline)
    out, last, blink_until, last_change, display, last_hurt = [], 20, -1, 0, 20, -99
    si = 0
    for tick in range(int(duration * 20) + 2):
        t = tick / 20
        while si < len(states) - 1 and t >= states[si][1]:
            si += 1
        _, _, slot, items, health = states[si]
        if any(a - 0.05 <= t + 1e-6 < b for a, b in deaths):   # from the death frame on (the screen starts a frame early)
            health = 0
            items = (None,) * len(items)   # the inventory drops on the death tick (keepInventory off)
        cur = math.ceil(health)
        if cur < last:
            blink_until, last_change, last_hurt = tick + 20, tick, tick
        elif cur > last and tick - last_hurt < 10:
            blink_until, last_change = tick + 10, tick
        if tick - last_change > 20:
            display, last_change = cur, tick
        last = cur
        blink = blink_until > tick and ((blink_until - tick) // 3) % 2 == 1
        shake = None
        if cur <= 4:
            r = JavaRandom(tick * 312871)
            shake = [0] * 10
            for i in range(9, -1, -1):
                shake[i] = r.next_int2()
        out.append((slot, tuple(items), health, display, blink, tuple(shake) if shake else None))
    return out


def hud_states(timeline, duration):
    """[(t0, t1, slot, items, health)] from the bot timeline (ms since recording start)."""
    items = list(HOTBAR)
    if any(e["event"] == "hotbar" for e in timeline or []):
        items = [None] * 9
    slot, health = 0, 20
    states, last_t = [], 0.0
    for ev in timeline or []:
        t = ev["t"] / 1000
        new_items, new_slot, new_health = list(items), ev.get("slot", slot), ev.get("health", health)
        if ev["event"] == "hotbar":
            new_items = [(tuple(n) if isinstance(n, list) else ((n, 1) if n else None)) for n in ev["items"]]
        if ev["event"] == "placed" and not any(e["event"] == "hotbar" for e in timeline):
            new_items[1] = "item/bucket"
        if ev["event"] == "scooped" and ev.get("ok") and not any(e["event"] == "hotbar" for e in timeline):
            new_items[1] = "item/water_bucket"
        if (new_items, new_slot, round(new_health)) != (items, slot, round(health)):
            states.append((last_t, t, slot, items, health))
            last_t, items, slot, health = t, new_items, new_slot, new_health
    states.append((last_t, duration + 1, slot, items, health))
    return states


def countdown_frames(spec, timeline, start_shift, outdir, jar_path):
    """Overlay frames for 'START_EVENT:END_EVENT:Label:item/icon' (like the ender-pearl Shorts'
    "Elytra About To Break: 2.14"), 20 per second from the start event until 0.6 s after the end.
    Returns (offset_seconds, pattern) or None."""
    a, b, label, icon = (spec.split(":") + ["", ""])[:4]
    ev = {e["event"]: e["t"] / 1000 for e in timeline}
    if a not in ev or b not in ev:
        return None
    t0, t1 = ev[a], ev[b]
    font = ImageFont.truetype(FONT, 58)
    icon_im = None
    if icon:
        with zipfile.ZipFile(jar_path) as jar:
            with jar.open(f"assets/minecraft/textures/{icon}.png") as f:
                icon_im = Image.open(io.BytesIO(f.read())).convert("RGBA").resize((128, 128), Image.NEAREST)
    n = int((t1 - t0 + 0.6) * 20)
    for i in range(n):
        t = t0 + i / 20
        left = max(0.0, t1 - t)
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        txt = f"{label}: {left:.2f}"
        tw = d.textlength(txt, font=font)
        y = BAND + 70
        if icon_im:
            img.alpha_composite(icon_im, ((W - 128) // 2, y))
            y += 140
        color = (255, 255, 255, 255) if left > 0.5 else (255, 60, 60, 255)
        d.text(((W - tw) / 2, y), txt, font=font, fill=color, stroke_width=6, stroke_fill=(0, 0, 0, 255))
        img.save(outdir / f"cd_{i:04d}.png")
    return t0 - start_shift, str(outdir / "cd_%04d.png")


def death_message(jar, comp):
    """Plain text of a death message chat component, using the game's en_us.json."""
    global _lang
    if _lang is None:
        _lang = json.loads(jar.read("assets/minecraft/lang/en_us.json"))
    if isinstance(comp, str):
        return comp
    if isinstance(comp, list):
        return "".join(death_message(jar, c) for c in comp)
    if not isinstance(comp, dict):
        return str(comp)
    if "translate" in comp:
        args = [death_message(jar, a) for a in comp.get("with", [])]
        fmt = _lang.get(comp["translate"], comp.get("fallback", comp["translate"]))
        k = 0
        def sub(m):
            nonlocal k
            if m.group(1):
                return args[int(m.group(1)) - 1] if int(m.group(1)) <= len(args) else ""
            k += 1
            return args[k - 1] if k <= len(args) else ""
        text = re.sub(r"%(?:(\d+)\$)?s", sub, fmt)
    else:
        text = comp.get("text", comp.get("", ""))
    return text + "".join(death_message(jar, c) for c in comp.get("extra", []))


_lang = None


def death_screen_png(jar, path, cause=None, active=True):
    """Vanilla DeathScreen at GUI scale 3, laid out on the 16:9 window the game area crops:
    red gradient, "You Died!" at 2x (y 30), the death message (y 85), the score (y 100), and the
    two buttons, greyed out for the first 20 ticks (delayTicker)."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    top, bot = (0x50, 0x00, 0x00, 0x60), (0x80, 0x30, 0x30, 0xA0)
    grad = Image.new("RGBA", (1, GAME_H))
    for y in range(GAME_H):
        f = y / (GAME_H - 1)
        grad.putpixel((0, y), tuple(int(top[i] + (bot[i] - top[i]) * f) for i in range(4)))
    img.alpha_composite(grad.resize((W, GAME_H)), (0, BAND))
    gh = GAME_H // GUI                                     # GUI-space height of the window
    draw_text(img, jar, "You Died!", W // 2, BAND + 30 * GUI, scale=2 * GUI, center=True)
    if cause:
        draw_text(img, jar, cause, W // 2, BAND + 85 * GUI, center=True)
    draw_text(img, jar, "Score: ", W // 2 - 4 * GUI, BAND + 100 * GUI, center=True)
    draw_text(img, jar, "0", W // 2 + 16 * GUI, BAND + 100 * GUI, color=(255, 255, 85, 255))
    btn = big(sprite(jar, "gui/sprites/widget/button" if active else "gui/sprites/widget/button_disabled"))
    for i, label in enumerate(["Respawn", "Title Screen"]):
        by_ = BAND + (gh // 4 + 72 + 24 * i) * GUI
        img.alpha_composite(btn, ((W - btn.width) // 2, by_))
        draw_text(img, jar, label, W // 2, by_ + 6 * GUI, center=True, color=(255, 255, 255, 255) if active else (160, 160, 160, 255))
    img.save(path)


def fire_frames(jar, t0, t1, outdir):
    """On-fire screen overlay (ScreenEffectRenderer.renderFire): the animated fire texture over
    both lower corners at 90% opacity, 20 frames per second from t0 to t1."""
    with jar.open("assets/minecraft/textures/block/fire_1.png") as f:
        strip = Image.open(io.BytesIO(f.read())).convert("RGBA")
    n_frames = strip.height // strip.width
    size = int(GAME_H * 0.5)
    for i in range(int((t1 - t0) * 20)):
        fr = strip.crop((0, (i % n_frames) * strip.width, strip.width, (i % n_frames + 1) * strip.width)).resize((size, size), Image.NEAREST)
        a = fr.split()[3].point(lambda v: int(v * 0.9))
        fr.putalpha(a)
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        y = BAND + GAME_H - int(size * 0.62)
        img.alpha_composite(fr, (-int(size * 0.18), y))
        img.alpha_composite(fr.transpose(Image.FLIP_LEFT_RIGHT), (W - size + int(size * 0.18), y))
        # keep inside the game area
        img.paste((0, 0, 0, 0), (0, BAND + GAME_H, W, H))
        img.save(outdir / f"fire_{i:04d}.png")
    return str(outdir / "fire_%04d.png")


def timer_frames(t0, t1, start_shift, outdir, hold=1.5):
    """Speed-run style timer (RedW1ngs): big white numbers counting up from t0, frozen at t1."""
    font = ImageFont.truetype(FONT, 110)
    n = int((t1 - t0 + hold) * 20)
    for i in range(n):
        el = min(t1 - t0, i / 20)
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        txt = f"{el:.2f}"
        tw = d.textlength(txt, font=font)
        color = (255, 255, 255, 255) if i / 20 < t1 - t0 else (80, 255, 80, 255)
        d.text(((W - tw) / 2, BAND + 40), txt, font=font, fill=color, stroke_width=7, stroke_fill=(0, 0, 0, 255))
        img.save(outdir / f"timer_{i:04d}.png")
    return t0 - start_shift, str(outdir / "timer_%04d.png")


def clock_fmt(v, target, done):
    """'0:00.47' while a clock of a minute or less runs, '37:12' for longer ones; '0:01', '1:00',
    '60:00' once it reaches the target."""
    if done:
        v = target
    m, sec = divmod(v, 60)
    if (done and target == int(target)) or target > 60:   # a sub-second or fractional target keeps its hundredths ("0:00.50", not "0:00")
        return f"{int(m)}:{int(sec):02d}"
    return f"{int(m)}:{sec:05.2f}"


def clock_concat(spec, tl_ev, start, dur, outdir, fps=60, lead=0.3):
    """Big on-screen clocks for 'x in 1 second vs 1 minute vs 1 hour' Shorts. spec is a JSON list
    of [START_EVENT, END_EVENT, TARGET_SECONDS, LABEL]: from the start event the clock counts from
    0 to TARGET linearly over the span (so a sped-up time-lapse reads as that much time), then
    turns green with a small pop and holds until the next clock starts. The first clock shows
    at 0 for `lead` seconds before its start, so the first block never lands before the clock. Returns an ffconcat list."""
    clocks = []
    for c in json.loads(spec):
        a, b, target = c[0], c[1], float(c[2])
        if a in tl_ev and b in tl_ev:
            clocks.append((tl_ev[a] - start, tl_ev[b] - start, target, c[3] if len(c) > 3 else ""))
    if not clocks:
        return None
    clocks.sort()
    font = ImageFont.truetype(FONT, 124)
    lfont = ImageFont.truetype(FONT, 54)
    cache, runs = {}, []
    n = int(math.ceil(dur * fps)) + 1
    for i in range(n):
        t = i / fps
        cur = [c for j, c in enumerate(clocks) if c[0] - (lead if j == 0 else 0) <= t + 1e-6]
        if not cur:
            key = None
        else:
            t0, t1, target, label = cur[-1]
            done = t >= t1 - 1e-6
            v = target * min(1.0, max(0.0, (t - t0) / max(1e-6, t1 - t0)))
            pop = 1.0
            if done:   # a quick pop when it lands: 1.22 -> 1.0 over 0.25 s
                k = (t - t1) / 0.25
                pop = 1.0 + 0.22 * max(0.0, 1 - k) if k < 1 else 1.0
            key = (clock_fmt(v, target, done), label, done, round(pop, 2))
        if key not in cache:
            path = outdir / f"clock{len(cache)}.png"
            img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            if key:
                txt, label, done, pop = key
                f_ = ImageFont.truetype(FONT, int(124 * pop)) if pop != 1.0 else font
                d = ImageDraw.Draw(img)
                y = BAND + 28
                if label:
                    lw = d.textlength(label, font=lfont)
                    d.text(((W - lw) / 2, y), label, font=lfont, fill=(255, 220, 40, 255), stroke_width=6, stroke_fill=(0, 0, 0, 255))
                    y += 66
                tw = d.textlength(txt, font=f_)
                color = (80, 255, 80, 255) if done else (255, 255, 255, 255)
                d.text(((W - tw) / 2, y - (int(124 * pop) - 124) / 2), txt, font=f_, fill=color, stroke_width=8, stroke_fill=(0, 0, 0, 255))
            img.save(path)
            cache[key] = path
        if runs and runs[-1][0] == cache[key]:
            runs[-1][1] += 1
        else:
            runs.append([cache[key], 1])
    lst = outdir / "clock.txt"
    lst.write_text("ffconcat version 1.0\n" + "".join(f"file '{p}'\nduration {k / fps:.4f}\n" for p, k in runs) + f"file '{runs[-1][0]}'\n")
    return lst


def apply_speed(args):
    """--speed: rebuild the footage, the timeline and the game audio on the time-lapse map
    (scripts/timewarp.py), so everything after this works in output time unchanged."""
    sys.path.insert(0, str(HERE / "scripts"))
    from timewarp import Warp, atempo, edit_spans
    rec = json.loads(pathlib.Path(args.timeline).read_text())
    warp = Warp(edit_spans(args.speed, args.slowmo, args.freeze), rec["timeline"])
    if not warp:
        return
    if not args.frames:
        sys.exit("--speed needs --frames (a rendered frame sequence)")
    wd = pathlib.Path(tempfile.mkdtemp(prefix="hb-speed-"))
    src_dir = pathlib.Path(args.frames).parent
    n_src = len(list(src_dir.glob("*" + pathlib.Path(args.frames).suffix)))
    k, blended = 0, 0
    pat = pathlib.Path(args.frames).name
    while True:
        x = warp.src(k / args.fps) * args.fps
        i = int(round(x))
        if i >= n_src:
            break
        frac = x - math.floor(x)
        if 0.2 < frac < 0.8 and math.floor(x) + 1 < n_src:   # slow motion: blend the two neighbours (no duplicate frames)
            lo = Image.open(src_dir / (pat % math.floor(x))).convert("RGB")
            hi = Image.open(src_dir / (pat % (math.floor(x) + 1))).convert("RGB")
            Image.blend(lo, hi, frac).save(wd / (pat % k), compress_level=1)
            blended += 1
        else:
            (wd / (pat % k)).symlink_to((src_dir / (pat % i)).resolve())
        k += 1
    if blended:
        print(f"slow-mo: {blended} blended in-between frames")
    args.warp = warp
    print(f"speed: {n_src} frames -> {k} ({', '.join(f'{a:.2f}-{b:.2f}s x{f:g}' for a, b, f in warp.spans)})")
    args.frames = str(wd / pathlib.Path(args.frames).name)
    (wd / "timeline.json").write_text(json.dumps({"timeline": warp.timeline(rec["timeline"])}))
    args.timeline = str(wd / "timeline.json")
    if args.audio:
        segs = [s for s in warp.segments(n_src / args.fps) if s[2] != math.inf]
        graph = [f"[0:a]asplit={len(segs)}" + "".join(f"[s{j}]" for j in range(len(segs)))] if len(segs) > 1 else ["[0:a]anull[s0]"]
        for j, (a, b, f) in enumerate(segs):
            if f < 0.2:   # a freeze frame: the sound holds its breath (silence) for the frozen time
                graph.append(f"[s{j}]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS,volume=0,apad=whole_dur={(b - a) / f:.4f}[t{j}]")
                continue
            graph.append(f"[s{j}]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS" + (f",{atempo(f)}" if f != 1 else "") + f"[t{j}]")
        graph.append("".join(f"[t{j}]" for j in range(len(segs))) + f"concat=n={len(segs)}:v=0:a=1[a]")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", args.audio, "-filter_complex", ";".join(graph), "-map", "[a]", str(wd / "audio.wav")], check=True)
        args.audio = str(wd / "audio.wav")


def subtitle_png(text, path, yfrac=0.42):
    """Green glowing in-world subtitle (like HelloBuh's re:zero Short): light green text with a
    soft green glow, centred in the game area, wrapped to 2 lines if long. yfrac: vertical centre
    as a fraction of the game height (0.76 = below the death screen's buttons)."""
    from PIL import ImageFilter
    font = ImageFont.truetype(FONT.replace("ExtraBold", "Medium") if pathlib.Path(FONT.replace("ExtraBold", "Medium")).exists() else FONT, 76)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        t = (cur + " " + w_).strip()
        if d.textlength(t, font=font) > W * 0.7 and cur:
            lines.append(cur); cur = w_
        else:
            cur = t
    lines.append(cur)
    y = BAND + int(GAME_H * yfrac) - len(lines) * 36
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    for i, ln in enumerate(lines):
        tw = d.textlength(ln, font=font)
        gd.text(((W - tw) / 2, y + i * 84), ln, font=font, fill=(60, 255, 60, 255), stroke_width=6, stroke_fill=(60, 255, 60, 255))
        d.text(((W - tw) / 2, y + i * 84), ln, font=font, fill=(190, 255, 170, 255), stroke_width=4, stroke_fill=(10, 40, 10, 255))   # dark edge: readable on pale sky
    glow = glow.filter(ImageFilter.GaussianBlur(10))
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0)); out.alpha_composite(glow); out.alpha_composite(img)
    out.save(path)


def probe_duration(args):
    if args.video:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", args.video], capture_output=True, text=True).stdout
        return float(out)
    n = len(list(pathlib.Path(args.frames).parent.glob("*" + pathlib.Path(args.frames).suffix)))
    return n / args.fps


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video")
    ap.add_argument("--frames")
    ap.add_argument("--fps", type=float, default=30)
    ap.add_argument("--out_fps", type=int, default=30)
    ap.add_argument("--caption", required=True)
    ap.add_argument("--red")
    ap.add_argument("--colors", help="word=color pairs, e.g. 'pov=red,villager=green'")
    ap.add_argument("--countdown", help="START_EVENT:END_EVENT:Label:item/icon overlay countdown")
    ap.add_argument("--on_fire", help="START_EVENT:END_EVENT burning overlay")
    ap.add_argument("--timer", help="START_EVENT:END_EVENT count-up timer overlay (speed builds)")
    ap.add_argument("--speed", help='JSON list of [START_EVENT, END_EVENT, FACTOR|"cut"] time-lapse spans (scripts/timewarp.py)')
    ap.add_argument("--clock", help='JSON list of [START_EVENT, END_EVENT, TARGET_SECONDS, LABEL] clocks counting to a target time')
    ap.add_argument("--subs", help='JSON list of [event, text, seconds?] green narration subtitles')
    ap.add_argument("--death_screen", help="timeline event at which the vanilla death screen appears (+0.6 s)")
    ap.add_argument("--timeline")
    ap.add_argument("--audio")
    ap.add_argument("--song", help="music file to bake in (owner-supplied; keep the Short under 60 s)")
    ap.add_argument("--song_start", type=float, default=0.0, help="seconds into the song to start (e.g. the drop)")
    ap.add_argument("--song_drop_at", help="timeline event (or seconds into the Short) where the song's drop should land; the drop is found by scripts/song_drop.py")
    ap.add_argument("--story", help="stories/<name>: narrated story Short (docs/stories.md): the line wavs and word-chunk captions on the `line` marks, game audio turned down under the voice")
    # retention toolkit (scripts/retention.py): all optional, from the stunt's `edit` block
    ap.add_argument("--slowmo", help='JSON list of [EVENT, BEFORE_S, AFTER_S, FACTOR=0.5] slow-motion windows')
    ap.add_argument("--punch", help='JSON list of EVENT or [EVENT, NTH, SCALE] zoom punches on the game view')
    ap.add_argument("--counter", help='JSON {"at": [EVENT, ...], "total": N} "3/5" beat counter')
    ap.add_argument("--cards", help='JSON list of [EVENT, TEXT, SECONDS?, COLOR?, NTH?] impact cards')
    ap.add_argument("--shake", help='JSON list of EVENT or [EVENT, NTH, PX] screen shakes on the game view')
    ap.add_argument("--flash", help='JSON list of EVENT or [EVENT, NTH, ALPHA] white flashes on the game view')
    ap.add_argument("--freeze", help='JSON list of [EVENT, SECONDS, TEXT?, COLOR?] freeze frames with a stamped text')
    ap.add_argument("--fallen", help='JSON list of [EVENT_A, EVENT_B, LABEL?] live "blocks fallen" counters (from the poses)')
    ap.add_argument("--sfx", help='JSON list of [KIND, EVENT, (EVENT2), {opts}] sound effects (scripts/sfx.py)')
    ap.add_argument("--replay", help='JSON {"at": EVENT, ...}: append work/<name>.replay (scripts/render_replay.py) after the payoff')
    ap.add_argument("--loop", help='true or SECONDS: the last 0.25 s dissolve into the first frame')
    ap.add_argument("--hook", help='JSON {"at": EVENT, "before": 0.5, "after": 0, "text": ...} finale preview in front')
    ap.add_argument("--hud", action=argparse.BooleanOptionalAction, default=True)
    ap.add_argument("--start", type=float, default=0.0, help="seconds to skip at the start of the footage")
    ap.add_argument("--start_at", help="EVENT:OFFSET - start OFFSET seconds after a timeline event (overrides --start)")
    ap.add_argument("--end_after", help="EVENT:SECONDS - end SECONDS after a timeline event (cuts dead tails)")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    args.warp, args.rec_path, args.audio0 = None, args.timeline, args.audio
    frames_dir0 = pathlib.Path(args.frames).parent if args.frames else None
    if (args.speed or args.slowmo or args.freeze) and args.timeline:
        apply_speed(args)
    _tl = {}
    if args.timeline:
        for e in json.loads(pathlib.Path(args.timeline).read_text())["timeline"]:
            _tl.setdefault(e["event"], e["t"] / 1000)
    if args.start_at:
        ev_, off_ = args.start_at.rsplit(":", 1)
        if ev_ in _tl:
            args.start = max(0.0, _tl[ev_] + float(off_))
    sys.path.insert(0, str(HERE / "scripts"))
    import retention
    if (args.punch or args.shake or args.flash or args.freeze) and args.timeline and args.frames:
        retention.apply_frame_fx(args, json.loads(pathlib.Path(args.timeline).read_text())["timeline"])

    tmp = pathlib.Path(tempfile.mkdtemp(prefix="hb-edit-"))
    if args.song and args.song_drop_at:
        drop = float(subprocess.run(["python3", str(HERE / "scripts" / "song_drop.py"), args.song], capture_output=True, text=True, check=True).stdout.split()[0])
        try:
            at = float(args.song_drop_at)
        except ValueError:
            tl_ev = {e["event"]: e["t"] / 1000 for e in json.loads(pathlib.Path(args.timeline).read_text())["timeline"]}
            at = tl_ev[args.song_drop_at] - args.start
        args.song_start = max(0.0, drop - at)
        print(f"song drop at {drop:.2f}s lands on {at:.2f}s of the Short (song starts at {args.song_start:.2f}s)")
    named = {"red": (235, 40, 40, 255), "green": (60, 220, 60, 255), "yellow": (255, 220, 40, 255), "blue": (80, 160, 255, 255)}
    colors = {}
    for pair in (args.colors or "").split(","):
        if "=" in pair:
            w, c = pair.split("=", 1)
            colors[w.strip().lower()] = named.get(c.strip().lower(), (255, 255, 255, 255))
    caption_png(args.caption, args.red, tmp / "caption.png", colors)
    dur = probe_duration(args) - args.start
    if args.end_after:
        ev_, secs_ = args.end_after.rsplit(":", 1)
        if ev_ in _tl:
            dur = min(dur, _tl[ev_] + float(secs_) - args.start)
    inputs = (["-ss", str(args.start), "-i", args.video] if args.video else
              ["-framerate", str(args.fps), "-start_number", str(int(args.start * args.fps)), "-i", args.frames])
    inputs += ["-loop", "1", "-i", str(tmp / "caption.png")]
    graph = [f"[0:v]scale={W}:{GAME_H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{GAME_H},"
             f"pad={W}:{H}:0:{BAND}:black,fps={args.out_fps},format=rgba[g0]"]
    last = "g0"
    n_in = 2
    # on-fire overlay first: vanilla draws the HUD on top of the flames
    if args.on_fire and args.timeline:
        a_, b_ = args.on_fire.split(":")
        if a_ in _tl and b_ in _tl:
            with zipfile.ZipFile(CLIENT_JAR) as jar:
                end = _tl[b_] + 0.6
                if b_ == "death":   # a dead body stays on fire (and in view) until the respawn
                    tl_all_ = json.loads(pathlib.Path(args.timeline).read_text())["timeline"]
                    end = next((e["t"] / 1000 for e in tl_all_ if e["event"] == "respawn" and e["t"] / 1000 > _tl[b_]), dur + args.start + 1)
                pat = fire_frames(jar, _tl[a_], end, tmp)
            inputs += ["-framerate", "20", "-i", pat]
            graph.append(f"[{n_in}:v]fps={args.out_fps},setpts=PTS+{max(0, _tl[a_] - args.start):.3f}/TB[firev]")
            graph.append(f"[{last}][firev]overlay=0:0:eof_action=pass[fireo]")
            last, n_in = "fireo", n_in + 1
    if args.hud:
        tl = json.loads(pathlib.Path(args.timeline).read_text())["timeline"] if args.timeline else []
        shift = args.start
        states = hud_states(tl, dur + shift)
        need = sorted({it[0] for st in states for it in st[3] if isinstance(it, tuple) and it and it[0] and not (ICONS / f"{it[0]}.png").exists()})
        if need:   # 3D icons for block items (skips non-block items itself)
            subprocess.run(["node", str(HERE / "renderer" / "icons.js"), CLIENT_JAR.stem, *need], check=True)
        ticks = hud_ticks(tl, dur + shift)
        first = int(shift * 20)
        pngs, runs = {}, []                      # unique HUD images, and (png, n_ticks) runs
        with zipfile.ZipFile(CLIENT_JAR) as jar:
            for st in ticks[first:]:
                if st not in pngs:
                    pngs[st] = tmp / f"hud{len(pngs)}.png"
                    slot, items, health, display, blink, shake = st
                    hud_png(jar, slot, list(items), health, pngs[st], display=display, blink=blink, shake=list(shake) if shake else None)
                if runs and runs[-1][0] == pngs[st]:
                    runs[-1][1] += 1
                else:
                    runs.append([pngs[st], 1])
        lst = tmp / "hud.txt"
        lst.write_text("ffconcat version 1.0\n" + "".join(f"file '{p}'\nduration {n / 20:.3f}\n" for p, n in runs) + f"file '{runs[-1][0]}'\n")
        lead = shift - first / 20                # start isn't always on a tick
        inputs += ["-f", "concat", "-safe", "0", "-i", str(lst)]
        graph.append(f"[{n_in}:v]fps={args.out_fps},format=rgba,trim=start={lead:.3f},setpts=PTS-STARTPTS[hudv]")
        graph.append(f"[{last}][hudv]overlay=0:0:eof_action=repeat[hudo]")
        last, n_in = "hudo", n_in + 1
    if args.countdown and args.timeline:
        tl_all = json.loads(pathlib.Path(args.timeline).read_text())["timeline"]
        cd = countdown_frames(args.countdown, tl_all, args.start, tmp, CLIENT_JAR)
        if cd:
            off, pattern = cd
            inputs += ["-framerate", "20", "-i", pattern]
            graph.append(f"[{n_in}:v]fps={args.out_fps},setpts=PTS+{max(0, off):.3f}/TB[cdv]")
            graph.append(f"[{last}][cdv]overlay=0:0:eof_action=pass[cdo]")
            last, n_in = "cdo", n_in + 1
    tl_ev = {}
    if args.timeline:
        for e in json.loads(pathlib.Path(args.timeline).read_text())["timeline"]:
            tl_ev.setdefault(e["event"], e["t"] / 1000)
    if args.timer and args.timer.split(":")[0] in tl_ev and args.timer.split(":")[1] in tl_ev:
        a_, b_ = args.timer.split(":")
        off, pat = timer_frames(tl_ev[a_], tl_ev[b_], args.start, tmp)
        inputs += ["-framerate", "20", "-i", pat]
        graph.append(f"[{n_in}:v]fps={args.out_fps},setpts=PTS+{max(0, off):.3f}/TB[tmv]")
        graph.append(f"[{last}][tmv]overlay=0:0:eof_action=repeat[tmo]")
        last, n_in = "tmo", n_in + 1
    if args.clock and args.timeline:
        lst = clock_concat(args.clock, tl_ev, args.start, dur, tmp)
        if lst:
            inputs += ["-f", "concat", "-safe", "0", "-i", str(lst)]
            graph.append(f"[{n_in}:v]fps={args.out_fps},format=rgba[clv]")
            graph.append(f"[{last}][clv]overlay=0:0:eof_action=repeat[clo]")
            last, n_in = "clo", n_in + 1
    deferred_subs = []
    if args.subs and args.timeline:
        all_ev = json.loads(pathlib.Path(args.timeline).read_text())["timeline"]
        sub_starts = []
        for sub in json.loads(args.subs):
            tts = [e["t"] / 1000 for e in all_ev if e["event"] == sub[0]]
            nth_ = sub[3] if len(sub) > 3 else 0
            if len(tts) > nth_:
                sub_starts.append(tts[nth_] - args.start)
        for k, sub in enumerate(json.loads(args.subs)):
            ev_name, text = sub[0], sub[1]
            dur_s = sub[2] if len(sub) > 2 else 1.8
            nth = sub[3] if len(sub) > 3 else 0                 # which occurrence of the event
            ts = [e["t"] / 1000 for e in all_ev if e["event"] == ev_name]
            if len(ts) <= nth:
                continue
            t0 = ts[nth] - args.start
            starts = sorted(x for x in sub_starts if x > t0 + 1e-3)
            if starts:                       # never overlap the next line (they doubled up)
                dur_s = min(dur_s, starts[0] - t0 - 0.05)
            # a line shown during a death screen goes below its buttons, drawn over the screen (it sat on
            # "Respawn" at 42% of the game height: worker 7, die_rating)
            dws = [(a - args.start, b - args.start) for a, b in death_windows(all_ev)] if args.death_screen else []
            if any(a < t0 + dur_s and t0 < b for a, b in dws):
                subtitle_png(text, tmp / f"sub{k}.png", yfrac=0.76)
                deferred_subs.append((k, t0, dur_s))
                continue
            subtitle_png(text, tmp / f"sub{k}.png")
            inputs += ["-loop", "1", "-i", str(tmp / f"sub{k}.png")]
            graph.append(f"[{last}][{n_in}:v]overlay=0:0:enable='gte(t,{t0:.3f})*lt(t,{t0 + dur_s:.3f})'[sb{k}]")
            last, n_in = f"sb{k}", n_in + 1
    if args.death_screen and args.death_screen in tl_ev:
        # DeathScreen opens on the tick the client gets the death packet; buttons enable after 20 ticks
        all_ev = json.loads(pathlib.Path(args.timeline).read_text())["timeline"]
        # every death gets its own screen (rated-deaths formats, tries): from the death to the next
        # respawn, with the death_message nearest that death; buttons disabled for the first 1 s
        windows = death_windows(all_ev, args.death_screen)
        msgs = [(e["t"] / 1000, e.get("message")) for e in all_ev if e["event"] == "death_message"]
        deaths = [a for a, _ in windows]
        with zipfile.ZipFile(CLIENT_JAR) as jar:
            for di, (td_abs, tr_abs) in enumerate(windows):
                # one frame early: the game frames start on a whole frame (int(start * fps)), so the
                # death tick can land a frame before the overlay's exact time (2 frames of sky with
                # full hearts before the screen in anvil_rain)
                t_d = td_abs - args.start - 1.0 / args.out_fps
                t_r = min(tr_abs - args.start, 1e6)
                near = [m for m in msgs if abs(m[0] - td_abs) < 1.0]
                msg = min(near, key=lambda m: abs(m[0] - td_abs))[1] if near else (msgs[0][1] if msgs and len(deaths) == 1 else None)
                cause = death_message(jar, msg) if msg else None
                death_screen_png(jar, tmp / f"death{di}_0.png", cause, active=False)
                death_screen_png(jar, tmp / f"death{di}_1.png", cause, active=True)
                for k, (a, b) in enumerate([(t_d, min(t_r, t_d + 1.0)), (t_d + 1.0, t_r)]):
                    if b <= a or b < 0:
                        continue
                    inputs += ["-loop", "1", "-i", str(tmp / f"death{di}_{k}.png")]
                    graph.append(f"[{last}][{n_in}:v]overlay=0:0:enable='gte(t,{max(0, a):.3f})*lt(t,{b:.3f})'[ds{di}_{k}]")
                    last, n_in = f"ds{di}_{k}", n_in + 1
    if (args.counter or args.cards or args.freeze or args.fallen) and args.timeline:   # counters, cards, stamps (scripts/retention.py)
        lst = retention.fx_concat(args.counter, retention.stamp_cards(args.cards, args.freeze), json.loads(pathlib.Path(args.timeline).read_text())["timeline"],
                                  args.start, dur, tmp, args.out_fps, fallen=retention.fallen_fn(args))
        if lst:
            inputs += ["-f", "concat", "-safe", "0", "-i", str(lst)]
            graph.append(f"[{n_in}:v]fps={args.out_fps},format=rgba[fxv]")
            graph.append(f"[{last}][fxv]overlay=0:0:eof_action=repeat[fxo]")
            last, n_in = "fxo", n_in + 1
    for k, t0, dur_s in deferred_subs:   # subtitles over a death screen: above it, below its buttons
        inputs += ["-loop", "1", "-i", str(tmp / f"sub{k}.png")]
        graph.append(f"[{last}][{n_in}:v]overlay=0:0:enable='gte(t,{t0:.3f})*lt(t,{t0 + dur_s:.3f})'[sbd{k}]")
        last, n_in = f"sbd{k}", n_in + 1
    if args.story and args.timeline:   # narrated story: big word-chunk captions over the game (and the death screen)
        sys.path.insert(0, str(HERE / "scripts"))
        import story_track
        story_rec = json.loads(pathlib.Path(args.timeline).read_text())
        story_tl, story_track.POSES = story_rec["timeline"], story_rec.get("poses")
        flash = story_track.flash_concat(story_tl, args.start, dur, tmp)   # white flashes on `flash` marks (under the captions)
        if flash:
            inputs += ["-f", "concat", "-safe", "0", "-i", str(flash)]
            graph.append(f"[{n_in}:v]fps={args.out_fps},format=rgba[flv]")
            graph.append(f"[{last}][flv]overlay=0:0:eof_action=pass[flo]")
            last, n_in = "flo", n_in + 1
        inputs += ["-f", "concat", "-safe", "0", "-i", str(story_track.caption_concat(args.story, story_tl, args.start, dur, tmp))]
        graph.append(f"[{n_in}:v]fps={args.out_fps},format=rgba[capv]")
        graph.append(f"[{last}][capv]overlay=0:0:eof_action=pass[capo]")
        last, n_in = "capo", n_in + 1
        meter = story_track.meter_concat(args.story, story_tl, args.start, dur, tmp)   # the story's rule meter, if it has one
        if meter:
            inputs += ["-f", "concat", "-safe", "0", "-i", str(meter)]
            graph.append(f"[{n_in}:v]fps={args.out_fps},format=rgba[mtv]")
            graph.append(f"[{last}][mtv]overlay=0:0:eof_action=repeat[mto]")
            last, n_in = "mto", n_in + 1
        narration = story_track.narration_wav(args.story, story_tl, args.start, dur, tmp / "narration.wav")
    graph.append(f"[{last}][1:v]overlay=0:0,format=yuv420p[v]")
    audio_ss, duck = args.start, ""
    if args.sfx and args.timeline:   # sound effects (scripts/sfx.py) premixed into the game audio, in Short time
        import sfx
        sfx_tl = json.loads(pathlib.Path(args.timeline).read_text())["timeline"]
        track = sfx.build_track(args.sfx, sfx_tl, args.start, dur, tmp / "sfx.wav", args.cards, args.counter)
        duck = sfx.duck_filter(sfx.dips(args.sfx, sfx_tl, args.start))
        if track and args.audio:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{args.start:.4f}", "-i", args.audio, "-i", str(track), "-filter_complex",
                            f"[0:a]atrim=0:{dur + 0.5:.3f},loudnorm=I=-20:TP=-3,aresample={sfx.SR},aformat=channel_layouts=stereo[g];[g][1:a]amix=inputs=2:normalize=0:duration=longest[a]",
                            "-map", "[a]", "-ar", str(sfx.SR), str(tmp / "game_sfx.wav")], check=True)
            args.audio, audio_ss = str(tmp / "game_sfx.wav"), 0.0
        elif track:
            args.audio, audio_ss = str(track), 0.0
    maps = ["-map", "[v]"]
    if args.story and args.timeline:
        # the voice leads (-15 LUFS), the game sits well under it (-27) and a song is a quiet bed (-31);
        # the master is -14 LUFS like the story channel's
        inputs += ["-i", str(narration)]
        graph.append(f"[{n_in}:a]loudnorm=I=-15:TP=-2,aresample=48000[nar]")
        mix = ["[nar]"]
        if args.audio:
            inputs += ["-ss", str(audio_ss), "-i", args.audio]
            graph.append(f"[{n_in + 1}:a]loudnorm=I=-27:TP=-6,aresample=48000[game]")
            mix.append("[game]")
        if args.song:
            inputs += ["-ss", str(args.song_start), "-i", args.song]
            graph.append(f"[{n_in + len(mix)}:a]atrim=0:{dur:.3f},asetpts=PTS-STARTPTS{duck},loudnorm=I=-31:TP=-8,afade=t=in:d=0.3,afade=t=out:st={max(0, dur - 0.3):.3f}:d=0.3,aresample=48000[song]")
            mix.append("[song]")
        graph.append(f"{''.join(mix)}amix=inputs={len(mix)}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]")
        maps += ["-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
    elif args.audio and not args.song:
        # Game audio only: leave headroom for a song added at upload.
        inputs += ["-ss", str(audio_ss), "-i", args.audio]
        graph.append(f"[{n_in}:a]loudnorm=I=-18:TP=-3:LRA=11,aresample=48000[a]")
        maps += ["-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
    elif args.song:
        # Song baked in under the game sounds, mastered like the reference Short (-10 LUFS overall).
        # Shorts under 1 minute with a Content ID match follow the rights holder's policy
        # (usually monetize/track); see README "Owner decisions".
        inputs += ["-ss", str(args.song_start), "-i", args.song]
        song = f"[{n_in}:a]atrim=0:{dur:.3f},asetpts=PTS-STARTPTS{duck},loudnorm=I=-13:TP=-2,afade=t=in:d=0.08,afade=t=out:st={max(0, dur - 0.6):.3f}:d=0.6,aresample=48000[song]"
        graph.append(song)
        if args.audio:
            inputs += ["-ss", str(audio_ss), "-i", args.audio]
            graph.append(f"[{n_in + 1}:a]loudnorm=I=-15:TP=-2,aresample=48000[game]")
            graph.append("[song][game]amix=inputs=2:normalize=0,loudnorm=I=-10:TP=-1:LRA=11[a]")
        else:
            graph.append("[song]loudnorm=I=-10:TP=-1:LRA=11[a]")
        maps += ["-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
    cmd = ["ffmpeg", "-loglevel", "error", "-y", *inputs, "-filter_complex", ";".join(graph), *maps,
           "-t", f"{dur:.3f}", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
           "-movflags", "+faststart", args.out]
    subprocess.run(cmd, check=True)
    if args.story:   # single-pass loudnorm lands ~2 dB short: measure and correct to -14 LUFS exactly
        story_track.master_gain(args.out, -14.0)
    if args.replay and frames_dir0:   # instant replay from the third-person pass (scripts/render_replay.py)
        rdir = frames_dir0.with_suffix(".replay")
        if (rdir / "replay.json").exists():
            dur += retention.replay_append(args.out, rdir, tmp / "caption.png", args.audio0, args.out_fps)
        else:
            print(f"replay: {rdir} not rendered (python3 scripts/render_replay.py <name>), skipped")
    if args.hook and args.timeline:   # finale preview in front of beat 1 (after mastering: it reuses the final mix)
        h = json.loads(args.hook)
        if h.get("at") in tl_ev:
            retention.hook_prepend(args.out, h, tl_ev[h["at"]] - args.start, args.out_fps)
            dur += retention.hook_len({"hook": h})
    if args.loop:   # the end dissolves into the first frame (a seamless re-watch)
        retention.loop_end(args.out, json.loads(args.loop), args.out_fps)
    print("wrote", args.out, f"{dur:.2f}s")


if __name__ == "__main__":
    main()
