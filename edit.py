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
import bisect
import math
import pathlib
import os
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


class gui_scale:
    """`with gui_scale(4): container_png(...)`: draw with another GUI scale (edit.guiScale / edit.chatScale, opt-in for
    phone-readable container screens and chat); None keeps the scale as it is."""
    def __init__(self, s):
        self.s = int(s) if s else None

    def __enter__(self):
        global GUI
        self.old = GUI
        if self.s:
            GUI = self.s

    def __exit__(self, *a):
        global GUI
        GUI = self.old


POTION_TINTED = ("potion", "splash_potion", "lingering_potion", "tipped_arrow")


def potion_icon(jar, name, color):
    """A potion's inventory icon as the item model draws it: layer0 `item/potion_overlay` multiplied by the
    potion_contents colour, layer1 the bottle on top (a tipped arrow: the head tinted under the shaft). Unscaled.
    The colour comes from the recording (lib/harness.js, lib/potion_color.js); older recordings carry none."""
    under, over = ("item/tipped_arrow_head", "item/tipped_arrow_base") if name == "tipped_arrow" else ("item/potion_overlay", f"item/{name}")
    ov = sprite(jar, under).copy()
    r, g, b = (color >> 16) & 255, (color >> 8) & 255, color & 255
    px = ov.load()
    for y in range(ov.height):
        for x in range(ov.width):
            pr, pg, pb, pa = px[x, y]
            px[x, y] = (pr * r // 255, pg * g // 255, pb * b // 255, pa)
    top = sprite(jar, over)
    out = Image.new("RGBA", top.size, (0, 0, 0, 0))
    out.alpha_composite(ov.resize(top.size, Image.NEAREST) if ov.size != top.size else ov)
    out.alpha_composite(top)
    return out


def tint_of(it):
    """The recorded potion colour of a hotbar / container slot ([name, count, glint, damage, max, 0xRRGGBB]), or None."""
    if isinstance(it, (list, tuple)) and len(it) > 5 and isinstance(it[5], int) and it[0] in POTION_TINTED:
        return it[5]
    return None


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


def caption_png(text, red_word, path, colors=None, bands="black"):
    """White bold caption, centered in the top band; emoji drawn from Twemoji, one word optionally red.
    bands="blur": the bands stay transparent (the blurred game shows through) under a soft dark wash."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if bands == "blur":
        for y in range(BAND):                      # darker toward the caption's middle, so the text reads
            d.line((0, y, W, y), fill=(0, 0, 0, int(70 + 60 * (1 - abs(y - BAND * 0.42) / (BAND * 0.6)) ** 1)))
        for y in range(BAND + GAME_H, H):
            d.line((0, y, W, y), fill=(0, 0, 0, 90))
    else:
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


_GLINT = {}
# items that always shine (the same list as render.js)
GLINT_ITEMS = {"enchanted_golden_apple", "experience_bottle", "nether_star", "enchanted_book", "end_crystal", "debug_stick", "written_book"}


def glint_icon(jar, icon, tick):
    """Enchantment glint on a hotbar icon (RenderType.glint, worker 11): enchanted_glint_item.png
    sampled at the item-atlas uv x 8 (a 16 px sprite on the 512 px atlas: 0.25 of the glint per icon),
    turned 10 degrees and scrolled by time (ms * glintSpeed 0.5 * 8: x every 110000, y every 30000),
    added as glint^2 (SRC_COLOR, ONE) where the icon is drawn."""
    import numpy as np
    if "tex" not in _GLINT:
        _GLINT["tex"] = np.asarray(sprite(jar, "misc/enchanted_glint_item").convert("RGB"), dtype=np.float32) / 255
    tex = _GLINT["tex"]
    th, tw = tex.shape[:2]
    a = np.asarray(icon, dtype=np.float32) / 255
    h, w = a.shape[:2]
    py, px = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = (px + 0.5) / w * 0.25, (py + 0.5) / h * 0.25
    c, s_ = math.cos(math.pi / 18), math.sin(math.pi / 18)
    gt = tick * 50 * 4
    gu = c * u - s_ * v - (gt % 110000) / 110000
    gv = s_ * u + c * v + (gt % 30000) / 30000
    g = tex[(np.floor(gv * th).astype(int)) % th, (np.floor(gu * tw).astype(int)) % tw]
    mask = (a[..., 3:4] > 0.1)
    g = g * 0.75                                    # GlintAlpha: Glint Strength defaults to 0.75
    a[..., :3] = np.clip(a[..., :3] + g * g * mask, 0, 1)
    return Image.fromarray((a * 255 + 0.5).astype(np.uint8), "RGBA")


def hud_png(jar, slot, items, health, path, display=None, blink=False, shake=None, max_health=20, xp_state=None, item_name=None):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bar = big(sprite(jar, "gui/sprites/hud/hotbar"))
    sel = big(sprite(jar, "gui/sprites/hud/hotbar_selection"))
    bx, by = (W - bar.width) // 2, BAND + GAME_H - bar.height - GUI   # hotbar sits at the bottom edge of the game
    if item_name:   # Gui.renderSelectedItemName: centred, guiHeight - 59 (survival), alpha from the highlight timer
        text, rgb, alpha = item_name
        draw_text(img, jar, text, W // 2, BAND + GAME_H - 59 * GUI, center=True, color=(*rgb, alpha))
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
        icon = None
        if icon3d and icon3d.exists():            # block items: 3D icon rendered by renderer/icons.js
            icon = Image.open(icon3d).convert("RGBA").resize((16 * GUI, 16 * GUI), Image.NEAREST)
        else:
            sp = path_ or item_sprite(name)
            if sp:
                icon = big(sprite(jar, sp))
            elif name:   # no texture named after it: the item definition's own model (a compass, a crossbow)
                d = item_def_icon(jar, name)
                icon = big(d) if d is not None else None
        if name and tint_of(it) is not None:   # a potion with its recorded colour (new recordings only)
            icon = big(potion_icon(jar, name, tint_of(it)))
        if icon is not None:
            g = it[2] if isinstance(it, (list, tuple)) and len(it) > 2 else None
            if isinstance(g, tuple) and g[0] == "glint":   # enchanted stack (hud_ticks puts the tick here)
                icon = glint_icon(jar, icon, g[1])
            img.alpha_composite(icon, (ix, iy))
        # durability bar (ItemStack.getBarWidth / getBarColor, GuiGraphics.renderItemDecorations): from the
        # first point of damage, a black 13x2 strip at (2, 13) with round(13 - 13 * damage / max) px in
        # hue (max - damage) / max / 3 (green -> red)
        if isinstance(it, (list, tuple)) and len(it) > 4 and it[3] and it[4]:
            import colorsys
            dmg, mx = it[3], it[4]
            w = round(13 - dmg * 13 / mx)
            r_, g_, b_ = colorsys.hsv_to_rgb(max(0.0, (mx - dmg) / mx) / 3, 1, 1)
            draw = ImageDraw.Draw(img)
            draw.rectangle([ix + 2 * GUI, iy + 13 * GUI, ix + 15 * GUI - 1, iy + 15 * GUI - 1], fill=(0, 0, 0, 255))
            if w > 0:
                draw.rectangle([ix + 2 * GUI, iy + 13 * GUI, ix + (2 + w) * GUI - 1, iy + 14 * GUI - 1], fill=(round(r_ * 255), round(g_ * 255), round(b_ * 255), 255))
        if count and count > 1:                   # stack count, like GuiGraphics.renderItemDecorations
            draw_text(img, jar, str(count), ix + (19 - 2) * GUI, iy + (6 + 3) * GUI, align_right=True)
    heart_c, heart = big(sprite(jar, "gui/sprites/hud/heart/container")), big(sprite(jar, "gui/sprites/hud/heart/full"))
    half = big(sprite(jar, "gui/sprites/hud/heart/half"))
    food_e, food = big(sprite(jar, "gui/sprites/hud/food_empty")), big(sprite(jar, "gui/sprites/hud/food_full"))
    xp_bg, xp = big(sprite(jar, "gui/sprites/hud/experience_bar_background")), big(sprite(jar, "gui/sprites/hud/experience_bar_progress"))
    img.alpha_composite(xp_bg, (bx + GUI, by - 7 * GUI))
    if xp_state:   # Gui.renderExperienceBar: progress * 182 px of the bar, the level centred above it in
        level, progress = xp_state   # 0x80FF20 with a 1 px black outline (drawn 4x offset); no number at level 0
        fill = int(progress * 183)
        if fill > 0:
            img.alpha_composite(xp.crop((0, 0, min(xp.width, fill * GUI), xp.height)), (bx + GUI, by - 7 * GUI))
        if level > 0:
            draw_text(img, jar, str(level), W // 2, by - 13 * GUI, center=True, color=(0x80, 0xFF, 0x20, 255), outline=True)
    # no XP progress: a fresh player (the death screen says "Score: 0"; a 35% bar contradicted it)
    hy = by - 17 * GUI
    hc_blink = big(sprite(jar, "gui/sprites/hud/heart/container_blinking"))
    full_b, half_b = big(sprite(jar, "gui/sprites/hud/heart/full_blinking")), big(sprite(jar, "gui/sprites/hud/heart/half_blinking"))
    cur = math.ceil(health)
    disp = cur if display is None else display
    # Gui.renderHearts: ceil(max health / 2) containers, rows of 10 stacked upward, the row step
    # shrinking from 10 px as rows are added (max_health from the recording; 20 by default)
    n = max(1, math.ceil(max_health / 2))
    rows = math.ceil(n / 10)
    row_h = max(10 - (rows - 2), 3)
    for i in range(n - 1, -1, -1):                 # vanilla draws from the last heart down
        hx = bx + 8 * GUI * (i % 10)
        y_ = hy - (i // 10) * row_h * GUI + (shake[i % 10] * GUI if shake else 0)
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


def _model_ref(m):
    """The model an item definition (assets/minecraft/items/<name>.json) shows when nothing special is going on:
    'model' as is; 'condition' its on_false; 'select' / 'range_dispatch' the fallback or the first case/entry (a
    compass's 16, a clock's 00, a crossbow's standby); 'special' its base. -> (model id, tints) or (None, [])."""
    for _ in range(8):
        if not isinstance(m, dict):
            return None, []
        t = m.get("type", "").replace("minecraft:", "")
        if t == "model":
            return m.get("model"), m.get("tints") or []
        if t == "special":
            return m.get("base"), []
        if t == "condition":
            m = m.get("on_false")
        elif t == "select":
            m = m.get("fallback") or ((m.get("cases") or [{}])[0]).get("model")
        elif t == "range_dispatch":
            m = m.get("fallback") or ((m.get("entries") or [{}])[0]).get("model")
        else:
            return None, []
    return None, []


_def_icons = {}
def item_def_icon(jar, name):
    """An item's flat icon from its 1.21.4+ item definition, for items whose texture isn't named after them (no
    item/<name>.png: a compass, a clock, a crossbow, an enchanted golden apple, a tipped arrow): the model's
    layer0, layer1... composited, each tinted as the definition says (the potion default's blue). Unscaled
    (16 px), or None (a 3D special model like the shield). Only reached where the name lookups found nothing, so
    every icon they draw stays as it was."""
    if name in _def_icons:
        return _def_icons[name]
    out = None
    try:
        d = json.loads(jar.read(f"assets/minecraft/items/{name}.json"))
        ref, tints = _model_ref(d.get("model"))
        layers = {}
        while ref:
            mp = "assets/minecraft/models/" + ref.replace("minecraft:", "") + ".json"
            if mp not in JAR_NAMES():
                break
            md = json.loads(jar.read(mp))
            for k, v in (md.get("textures") or {}).items():
                if k.startswith("layer") and k not in layers:
                    layers[k] = v
            ref = md.get("parent")
            if ref and ref.replace("minecraft:", "") in ("item/generated", "item/handheld", "builtin/generated"):
                break
        keys = sorted(layers, key=lambda k: int(k[5:]) if k[5:].isdigit() else 99)
        for i, k in enumerate(keys):
            tex = layers[k].replace("minecraft:", "")
            if f"assets/minecraft/textures/{tex}.png" not in JAR_NAMES():
                continue
            im = sprite(jar, tex)
            tint = tints[i] if i < len(tints) else None
            col = tint.get("default", tint.get("value")) if isinstance(tint, dict) else None
            if isinstance(col, int):
                col &= 0xFFFFFF
                r, g, b = (col >> 16) & 255, (col >> 8) & 255, col & 255
                px = im.load()
                for y in range(im.height):
                    for x in range(im.width):
                        pr, pg, pb, pa = px[x, y]
                        px[x, y] = (pr * r // 255, pg * g // 255, pb * b // 255, pa)
            if out is None:
                out = Image.new("RGBA", im.size, (0, 0, 0, 0))
            out.alpha_composite(im.resize(out.size, Image.NEAREST) if im.size != out.size else im)
    except (KeyError, ValueError):
        out = None
    _def_icons[name] = out
    return out


_jar_names = None
def JAR_NAMES():
    global _jar_names
    if _jar_names is None:
        with zipfile.ZipFile(CLIENT_JAR) as z:
            _jar_names = set(z.namelist())
    return _jar_names


ICONS = HERE / "work" / "assets" / CLIENT_JAR.stem / "icons"
_font = None


def text_width(jar, text):
    """The width of `text` in the default font, in GUI px (the advance draw_text uses, without the last gap)."""
    global _font
    if _font is None:
        with jar.open("assets/minecraft/textures/font/ascii.png") as f:
            _font = Image.open(io.BytesIO(f.read())).convert("RGBA")
    tot = 0
    for ch in text:
        c = ord(ch)
        cell = _font.crop(((c % 16) * 8, (c // 16) * 8, (c % 16) * 8 + 8, (c // 16) * 8 + 8))
        w = max([xx + 1 for xx in range(8) if any(cell.getpixel((xx, yy))[3] > 0 for yy in range(8))] or [0])
        tot += (w if ch != " " else 4) + 1
    return max(0, tot - 1)


def draw_text(img, jar, text, x, y, align_right=False, scale=None, color=(255, 255, 255, 255), center=False, outline=False, shadow_on=True):
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
    # outline (the XP level): black at the 4 neighbours, no shadow; else the usual drop shadow
    passes = ([((0, 0, 0, 255), (dx, dy)) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))] if outline else [(shadow, (1, 1))] if shadow_on else []) + [(color, (0, 0))]
    for col, (ox, oy) in passes:
        cx = x
        for cell, w in glyphs:
            mask = cell.split()[3].resize((8 * S, 8 * S), Image.NEAREST)
            layer = Image.new("RGBA", (8 * S, 8 * S), col)
            img.paste(layer, (cx + ox * S, y + oy * S), mask)
            cx += (w + 1) * S


class JavaRandom:
    """java.util.Random / LegacyRandomSource, for the exact low-health heart shake."""
    def __init__(self, seed):
        self.s = (seed ^ 0x5DEECE66D) & ((1 << 48) - 1)

    def next_int2(self):
        self.s = (self.s * 0x5DEECE66D + 0xB) & ((1 << 48) - 1)
        return (2 * (self.s >> 17)) >> 31


def death_windows(timeline, event="death"):
    return [(a, _snap_respawn(b) if b < 1e6 else b) for a, b in _death_windows(timeline, event)]


# the recording's poses (main sets them): each death window ends on the respawn's camera jump, the last pose jump
# over 4 blocks at the respawn mark or up to 3 ticks before it. The mark can land a tick after the renderer shows
# the spawn (render.js uses the same rule since 039594f), and the death screen and the empty HUD hung over the
# respawned world (frame review, story_respawn_tax f783)
DEATH_POSES = []


def _snap_respawn(tr):
    m = int(tr * 20 + 1e-6)
    for i in range(min(m, len(DEATH_POSES) - 1), max(0, m - 4), -1):
        if sum((DEATH_POSES[i][j] - DEATH_POSES[i - 1][j]) ** 2 for j in (1, 2, 3)) > 16:
            return min(tr, i / 20)
    return tr


def _death_windows(timeline, event="death"):
    """[(death, respawn)] in seconds: each death runs to the next respawn (any length; with
    immediate_respawn it's a tick). Windows that touch (the next death within 0.25 s of a respawn:
    death, a spurious instant respawn, death again) are one death, so the screen doesn't blink off
    (dig_up). An earlier rule ignored respawns under 0.5 s, which, with immediate_respawn, kept every
    other try dead for its whole length (tries: empty HUD on tries 2, 4 and 6)."""
    raw, open_, up = [], None, None
    for e in timeline or []:
        t = e["t"] / 1000
        if open_ is not None and up is None and e["event"] == "health" and (e.get("health") or 0) > 0:
            up = t   # the health coming back: the instant respawn, when no respawn mark was recorded
        if e["event"] == event and open_ is None:
            open_, up = t, None
        elif e["event"] == event and t - open_ > 1.5:   # older recordings: no respawn mark (instant respawn)
            # up to the health coming back, not a fixed tick: the hearts were black on the first
            # frame after 5 of 6 instant respawns (worker 3, tries)
            raw.append([open_, up if up is not None and up - open_ < 1.5 else open_ + 0.05]); open_, up = t, None
        elif e["event"] == "respawn" and open_ is not None:
            raw.append([open_, t]); open_ = None
    if open_ is not None:
        raw.append([open_, 1e9])
    out = []
    for w in raw:
        if out and w[0] - out[-1][1] < 0.25:
            out[-1][1] = w[1]
        else:
            out.append(w)
    return [tuple(w) for w in out]


# Item.getName rarity colours (ChatFormatting): COMMON white, UNCOMMON yellow, RARE aqua, EPIC light purple
RARITY = {"golden_apple": (85, 255, 255), "enchanted_golden_apple": (255, 85, 255), "experience_bottle": (255, 255, 85),
          "totem_of_undying": (255, 255, 85), "nether_star": (255, 255, 85), "dragon_egg": (255, 85, 255)}


def selected_name(hstates, names, t):
    """Gui.renderSelectedItemName: when the selected stack changes (slot or item), its name shows for 40 ticks
    (toolHighlightTimer), alpha = timer * 256 / 10 capped at 255 (it fades over the last 10). `names` maps item
    ids to the hover name ({"splash_potion": "Splash Potion of Weakness"}); others are title-cased ids.
    Returns (text, rgb, alpha) or None."""
    cur, since = None, None
    for a, _b, slot, items, _h in hstates:
        if a > t + 1e-6:
            break
        it = items[slot] if slot is not None and slot < len(items) else None
        nm = (it[0] if isinstance(it, (list, tuple)) else None) if it else None
        if nm != cur:
            cur, since = nm, a
    if not cur or since is None or since <= 0:
        return None
    timer = 40 - int((t - since) * 20 + 1e-6)
    if timer <= 0:
        return None
    alpha = min(255, int(timer * 256 / 10))
    text = names.get(cur) or " ".join(w.capitalize() for w in cur.split("_"))
    return (text, RARITY.get(cur, (255, 255, 255)), alpha)


def hud_ticks(timeline, duration, keep_inventory=False):
    """Per game tick: (slot, items, health, display_health, blink, shake) the way Gui draws it.
    A drop in health blinks the hearts for 20 ticks (white = health just lost, shown until 1 s
    after the last change); health <= 4 shakes each heart by 0-1 px, seeded with tick * 312871.
    Between death and respawn health is 0 (mineflayer reports the respawn health early)."""
    states = hud_states(timeline, duration)
    deaths = death_windows(timeline)
    kis = [(e["t"] / 1000, bool(e.get("on"))) for e in timeline or [] if e["event"] == "keep_inventory"]
    def keep_now(t):
        v = keep_inventory
        for tt, on in kis:
            if tt <= t:
                v = on
        return v
    # start from the recording's first health, not 20: a Short starting at 1 health (max_health 1)
    # read as a hit on tick 0 and blinked a full row of hearts for a second (worker 7, die_rating)
    h0 = math.ceil(next((e["health"] for e in timeline or [] if "health" in e), 20))
    maxes = [(e["t"] / 1000, e["max_health"]) for e in timeline or [] if "max_health" in e]
    def max_now(t):
        v = 20
        for tt, m in maxes:
            if tt <= t:
                v = m
        return v
    xps = [(e["t"] / 1000, e.get("level", 0), e.get("progress", 0)) for e in timeline or [] if e["event"] == "xp"]
    def xp_now(t):   # (level, progress) from the harness's 'xp' marks; None without any (an empty bar)
        if not xps:
            return None
        v = (0, 0.0)
        for tt, lv, pr in xps:
            if tt <= t + 1e-6:
                v = (lv, round(pr, 3))
        return v
    out, last, blink_until, last_change, display, last_hurt = [], h0, -1, 0, h0, -99
    kept = None   # the last hotbar seen alive: what keep_inventory keeps through a death
    si = 0
    for tick in range(int(duration * 20) + 2):
        t = tick / 20
        while si < len(states) - 1 and t >= states[si][1]:
            si += 1
        _, _, slot, items, health = states[si]
        # from the death frame on (the screen starts a frame early) to the tick the respawn falls in: a
        # HUD tick is 3 frames, and the one holding the respawn showed empty hearts on the first
        # respawn frame (worker 5, story_respawn_tax f369)
        # from the death tick (it emptied the hearts and hotbar a tick before the screen: it_rains f1821)
        if any(a <= t + 1e-6 and t + 0.05 <= b + 1e-6 for a, b in deaths):
            health = 0
            # the inventory drops on the death tick (unless keep_inventory), shown only for a real
            # death screen: with immediate_respawn the window is a tick and blanked the hotbar (tries)
            if not keep_now(t) and any(b - a >= 0.5 and a <= t + 1e-6 < b for a, b in deaths):
                items = (None,) * len(items)
            elif keep_now(t) and kept is not None:
                # keep_inventory: mineflayer still clears its copy on death and the harness records an
                # all-empty hotbar, so the screen showed an empty bar (worker 14, which_door): hold it
                items = kept
        else:
            # just respawned: mineflayer's health/hotbar updates land a few ticks late, and the HUD sat
            # on 0 hearts and an empty hotbar for ~0.4 s (worker 7). Take the next values from the respawn.
            rb = next((b for a, b in deaths if b - 0.05 < t + 1e-6 < b + 1.5), None)
            if rb is not None and health <= 0:
                nh = next((e.get("health") for e in timeline or [] if e["t"] / 1000 >= t and e.get("health") is not None and e["health"] > 0), None)
                if nh is not None:
                    health = nh
            if rb is not None and not any(items):
                nxt = next((st for st in states if st[0] >= t and any(st[3])), None)
                if nxt is not None and nxt[0] - t < 0.5:   # a late update, not a real pickup 1.5 s later (story_respawn_tax f1570)
                    items = nxt[3]
                elif keep_now(t) and kept is not None:
                    items = kept
            if any(items):
                kept = items
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
        # enchanted stacks ([name, count, 1]) carry the tick for the moving glint
        items = tuple((it[0], it[1], ("glint", tick)) + tuple(it[3:]) if isinstance(it, tuple) and ((len(it) > 2 and it[2] == 1) or it[0] in GLINT_ITEMS) else it for it in items)
        out.append((slot, tuple(items), health, display, blink, tuple(shake) if shake else None, max_now(t), xp_now(t)))
    return out


def snap_hotbar(timeline):
    """Client-side use prediction: a stunt's 'place' mark is the tick an item was used, and the
    client takes one off the selected stack right then (BlockItem.place / EnderEyeItem shrink the
    stack client-side). The server's slot updates land 0-4 ticks later and in bursts at speed (two
    uses in one update: the counts moved 4 -> 2 -> 0, end_portal_job). So: every place mark is a
    hotbar change of exactly -1 on its own tick, and a server update that only catches up with those
    uses (same item, count between the prediction and the prediction + the uses still unconfirmed) is
    absorbed. Anything else (a refill, a new item, a use the server never confirmed within 500 ms)
    is shown as the server sent it. Done on the recording's own timeline, before any time-lapse warp."""
    if not any(e["event"] == "place" for e in timeline or []) or not any(e["event"] == "hotbar" for e in timeline or []):
        return timeline
    # once only: apply_speed snaps the recording's timeline before the warp, and hud_states would
    # predict every use a second time on the warped one (the counts ran one low, then expired back
    # up during a still shot: lapse_house's 1:00)
    if any(e.get("snapped") for e in timeline if e["event"] == "hotbar"):
        return timeline
    norm = lambda n: (list(n) if isinstance(n, (list, tuple)) else ([n, 1] if n else None))
    out, server, shown, pend = [], None, None, {}   # pend: slot -> [use times not yet confirmed]

    def emit(t, base, items):
        # (no "slot": the event is about the stack, not the selection. A delayed eye count-drop carried
        # the place mark's old slot past the stunt's select() and jumped back to the empty slot: worker 4)
        ev = {k: v for k, v in base.items() if k != "slot"}
        out.append({**ev, "event": "hotbar", "t": t, "items": [list(x) if x else None for x in items], "snapped": True})

    for e in sorted(timeline, key=lambda e: e["t"]):
        t = e["t"]
        # uses the server never confirmed (no item was actually spent): back to the server's view
        if server is not None:
            for sl in list(pend):
                if pend[sl] and t - pend[sl][0] > 500:
                    t_exp = pend[sl][0] + 500
                    pend[sl] = []
                    if shown[sl] != server[sl]:
                        shown = [list(x) if x else None for x in shown]
                        shown[sl] = server[sl]
                        emit(t_exp, e, shown)
        if e["event"] == "hotbar":
            items = [norm(n) for n in e["items"]]
            if server is None:
                server, shown = items, [list(x) if x else None for x in items]
                out.append(e)
                continue
            server = items
            new = [list(x) if x else None for x in shown]
            for sl in range(len(items)):
                c, p, q = items[sl], shown[sl] if sl < len(shown) else None, pend.get(sl, [])
                pc = p[1] if p else 0
                same = (c is None and p is None) or (c and p and c[0] == p[0]) or (c and p is None and q)
                cc = c[1] if c else 0
                if q and same and pc <= cc <= pc + len(q):
                    pend[sl] = q[len(q) - (cc - pc):] if cc > pc else []   # the oldest uses are confirmed
                    if cc == pc:
                        new[sl] = c
                else:
                    pend[sl] = []
                    new[sl] = c
            if new != shown:
                shown = new
                emit(t, e, shown)
            continue
        if e["event"] == "place" and shown is not None:
            # an ender eye isn't predicted (EnderEyeItem.useOn returns early on the client): the count
            # drops with the server's update, the tick the eye shows in the frame (worker 4)
            if e.get("eye"):
                t = t + 50
            sl = e.get("slot", 0)
            it = shown[sl] if sl < len(shown) else None
            if it:
                shown = [list(x) if x else None for x in shown]
                shown[sl] = [it[0], it[1] - 1] + list(it[2:]) if it[1] > 1 else None
                pend.setdefault(sl, []).append(t)
                emit(t, e, shown)
        out.append(e)
    out.sort(key=lambda e: e["t"])
    return out


def hud_states(timeline, duration):
    """[(t0, t1, slot, items, health)] from the bot timeline (ms since recording start)."""
    timeline = snap_hotbar(timeline)
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


CONTAINER_TITLES = {"container.chest": "Chest", "container.chestDouble": "Large Chest", "container.barrel": "Barrel",
                    "container.shulkerBox": "Shulker Box", "container.enderchest": "Ender Chest"}


def item_icon(jar, name):
    """An inventory icon at GUI scale: the 3D block icon (renderer/icons.js) or the flat item sprite (as the HUD)."""
    icon3d = ICONS / f"{name}.png"
    if icon3d.exists():
        return Image.open(icon3d).convert("RGBA").resize((16 * GUI, 16 * GUI), Image.NEAREST)
    sp = item_sprite(name) or next((p for p in (f"item/{name}_standby", f"item/{name}_00") if f"assets/minecraft/textures/{p}.png" in JAR_NAMES()), None)
    if sp:
        return big(sprite(jar, sp))
    d = item_def_icon(jar, name)
    return big(d) if d is not None else None


def container_windows(timeline):
    """[(t_open, t_close, state)] in seconds from the harness's `container` marks (one per state: opening, then
    every slot change) to `container_close` (or a death, or the end)."""
    out, cur = [], None
    for e in timeline or []:
        t = e["t"] / 1000
        if e["event"] == "container":
            if cur:
                out.append((cur[0], t, cur[1]))
            cur = (t, e)
        elif e["event"] in ("container_close", "death") and cur:
            out.append((cur[0], t, cur[1])); cur = None
    if cur:
        out.append((cur[0], 1e9, cur[1]))
    return [w for w in out if w[1] > w[0]]


def syschat_windows(timeline, hold=10.0):
    """[(t0, t1, ((text, rgba), ...))] from `syschat` marks ({text, color}: chat lines the stunt or the harness
    recorded, e.g. '<Jonah> see you tomorrow' and the yellow 'Jonah left the game') and `syschat_clear` marks. A
    line shows for `hold` s (ChatComponent keeps a closed chat's line 200 ticks), newest at the bottom."""
    COL = {"yellow": (255, 255, 85, 255), "white": (255, 255, 255, 255), "gray": (170, 170, 170, 255)}
    lines, cuts = [], []
    for e in timeline or []:
        t = e["t"] / 1000
        if e["event"] == "syschat":
            lines.append([t, t + hold, e.get("text", ""), COL.get(e.get("color"), COL["white"])])
        elif e["event"] == "syschat_clear":
            for ln in lines:
                ln[1] = min(ln[1], t)
    pts = sorted({p for ln in lines for p in ln[:2]})
    out = []
    for a, b in zip(pts, pts[1:]):
        vis = tuple((ln[2], ln[3]) for ln in lines if ln[0] <= a and ln[1] >= b)
        if vis and b > a:
            out.append((a, b, vis))
    return out


def syschat_png(jar, lines, path, align="left", y_frac=0.70):
    """The closed chat (ChatComponent.render): each line on a translucent black strip 320 GUI px wide, 9 px a line,
    the newest bottom line's foot 40 GUI px above the bottom of the game view, text in the game font with its shadow.
    align "center" (edit.chatAlign, the default for story Shorts; owner, 2026-11-11: centre the "Buh left the game"
    line, off the dog): the same font, colour, strip and scale, each strip only as wide as its text (2 GUI px a side)
    and centred, the newest line's middle at y_frac of the game area (edit.chatY; 0.70 is the caption line, empty by
    the payoff), older lines above it. Pick chatY so the strip clears the shot's subject."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bottom = BAND + GAME_H
    for n_, (text, col) in enumerate(reversed(lines)):
        if align == "center":
            tw = text_width(jar, text) * GUI
            y_ = BAND + int(GAME_H * y_frac) - (9 * GUI) // 2 - 9 * GUI * n_
            x0 = max(0, (W - tw) // 2 - 2 * GUI)
            ImageDraw.Draw(img).rectangle((x0, y_, min(W - 1, x0 + tw + 4 * GUI), y_ + 9 * GUI), fill=(0, 0, 0, 128))
            draw_text(img, jar, text, x0 + 2 * GUI, y_ + GUI, color=col)
            continue
        y_ = bottom - (49 + 9 * n_) * GUI
        ImageDraw.Draw(img).rectangle((0, y_, min(320 * GUI, W), y_ + 9 * GUI), fill=(0, 0, 0, 128))   # (wider than the view at chat scale 4+)
        draw_text(img, jar, text, 2 * GUI, y_ + GUI, color=col)
    img.save(path)


def container_png(jar, state, path):
    """ContainerScreen as the player sees it on opening a chest, barrel or shulker box (the vanilla client: the
    dark gradient over the world, gui/container/generic_54 cut to the rows, or shulker_box, the title and
    "Inventory" in 0x404040, the items and counts in their slots), centred on the game area at GUI scale 3."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    top, bot = (0x10, 0x10, 0x10, 0xC0), (0x10, 0x10, 0x10, 0xD0)   # Screen.renderTransparentBackground
    grad = Image.new("RGBA", (1, GAME_H))
    for y in range(GAME_H):
        f = y / (GAME_H - 1)
        grad.putpixel((0, y), tuple(int(top[i] + (bot[i] - top[i]) * f) for i in range(4)))
    img.alpha_composite(grad.resize((W, GAME_H)), (0, BAND))
    rows = max(1, min(6, int(state.get("rows") or 3)))
    shulker = "shulker_box" in str(state.get("type", ""))
    ih = 166 if shulker else 114 + rows * 18
    if 176 * GUI > W or ih * GUI > GAME_H:   # a guiScale too big for this screen: the largest that fits (vanilla caps it too)
        with gui_scale(min(W // 176, GAME_H // ih)):
            return container_png(jar, state, path)
    ox, oy = (W - 176 * GUI) // 2, BAND + (GAME_H - ih * GUI) // 2
    if shulker:
        img.alpha_composite(big(sprite(jar, "gui/container/shulker_box").crop((0, 0, 176, 166))), (ox, oy))
    else:
        tex = sprite(jar, "gui/container/generic_54")
        img.alpha_composite(big(tex.crop((0, 0, 176, rows * 18 + 17))), (ox, oy))
        img.alpha_composite(big(tex.crop((0, 126, 176, 222))), (ox, oy + (rows * 18 + 17) * GUI))
    title = state.get("title") or ""
    title = CONTAINER_TITLES.get(title, title)
    draw_text(img, jar, title, ox + 8 * GUI, oy + 6 * GUI, color=(0x40, 0x40, 0x40, 255), shadow_on=False)
    draw_text(img, jar, "Inventory", ox + 8 * GUI, oy + (ih - 94) * GUI, color=(0x40, 0x40, 0x40, 255), shadow_on=False)
    slots = state.get("slots") or []
    n = rows * 9
    yoff = -19 if shulker else (rows - 4) * 18   # ShulkerBoxMenu: inventory at y 84, hotbar 142
    pos = [(8 + (i % 9) * 18, 18 + (i // 9) * 18) for i in range(n)]
    pos += [(8 + (i % 9) * 18, 103 + yoff + (i // 9) * 18) for i in range(27)]
    pos += [(8 + i * 18, 161 + yoff) for i in range(9)]
    for it, (sx, sy) in zip(slots, pos):
        if not it:
            continue
        ix, iy = ox + sx * GUI, oy + sy * GUI
        icon = big(potion_icon(jar, it[0], tint_of(it))) if tint_of(it) is not None else item_icon(jar, it[0])
        if icon is not None:
            if len(it) > 2 and it[2]:
                icon = glint_icon(jar, icon, 0)
            img.alpha_composite(icon, (ix, iy))
        if it[1] and it[1] > 1:
            draw_text(img, jar, str(it[1]), ix + 17 * GUI, iy + 9 * GUI, align_right=True)
    img.save(path)


def _solve8(src, dst):
    """Coefficients for PIL's PERSPECTIVE transform mapping output points dst to input points src."""
    A, b = [], []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    n = 8
    M = [row[:] + [b[k]] for k, row in enumerate(A)]
    for c in range(n):   # Gaussian elimination with partial pivoting
        piv = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[piv] = M[piv], M[c]
        for r in range(n):
            if r != c and M[r][c]:
                f = M[r][c] / M[c][c]
                M[r] = [a - f * bb for a, bb in zip(M[r], M[c])]
    return [M[k][n] / M[k][k] for k in range(n)]


def fire_quads():
    """Screen corners of ScreenEffectRenderer.renderFire's two quads: for i in 0, 1 a 1x1 quad at
    z -0.5, rotated (i*2-1)*10 deg about Y, then moved by (-(i*2-1)*0.24, -0.3, 0), drawn with the
    hand's projection (FOV 70, not the dynamic one) over the game area. Vertex (-0.5, -0.5) takes
    (u1, v1): the texture is mirrored in x on both. Returns [(corners px, uv corners)] per quad."""
    th = math.tan(math.radians(70) / 2)
    asp = W / GAME_H
    out = []
    for i in (0, 1):
        a = math.radians((i * 2 - 1) * 10.0)
        tx = -(i * 2 - 1) * 0.24
        pts = []
        for (x, y) in ((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)):
            z = -0.5
            xr, zr = x * math.cos(a) + z * math.sin(a), -x * math.sin(a) + z * math.cos(a)
            xw, yw = xr + tx, y - 0.3
            nx, ny = xw / (-zr * th * asp), yw / (-zr * th)
            pts.append(((nx + 1) / 2 * W, (1 - ny) / 2 * GAME_H))
        out.append(pts)
    return out


def fire_frames(jar, t0, t1, outdir, prefix="fire"):
    """On-fire screen overlay (ScreenEffectRenderer.renderFire): the animated fire_1 sprite on two
    quads in front of the eye (fire_quads), colour (1, 1, 1, 0.9), 20 frames per second from t0 to
    t1. The flames reach about 3/4 of the way up the view and overlap in the middle (the old corner
    squares showed only tips along the bottom edge: worker 5, story_respawn_tax f1464)."""
    with jar.open("assets/minecraft/textures/block/fire_1.png") as f:
        strip = Image.open(io.BytesIO(f.read())).convert("RGBA")
    n_frames = strip.height // strip.width
    S = strip.width
    quads = fire_quads()
    coeffs = []
    for pts in quads:
        # texture corners for (-.5,-.5) (.5,-.5) (.5,.5) (-.5,.5): (u1,v1) (u0,v1) (u0,v0) (u1,v0)
        src = [(S, S), (0, S), (0, 0), (S, 0)]
        coeffs.append(_solve8(src, pts))
    for i in range(int((t1 - t0) * 20)):
        fr = strip.crop((0, (i % n_frames) * S, S, (i % n_frames + 1) * S))
        a = fr.split()[3].point(lambda v: int(v * 0.9))
        fr.putalpha(a)
        game = Image.new("RGBA", (W, GAME_H), (0, 0, 0, 0))
        for c in coeffs:
            game.alpha_composite(fr.transform((W, GAME_H), Image.PERSPECTIVE, c, Image.NEAREST))
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        img.paste(game, (0, BAND))
        img.save(outdir / f"{prefix}_{i:04d}.png")
    return str(outdir / f"{prefix}_%04d.png")


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


def clock_concat(spec, tl_ev, start, dur, outdir, fps=60, lead=0.3, timeline=None):
    """Big on-screen clocks for 'x in 1 second vs 1 minute vs 1 hour' Shorts. spec is a JSON list
    of [START_EVENT, END_EVENT, TARGET_SECONDS, LABEL]: from the start event the clock counts from
    0 to TARGET linearly over the span (so a sped-up time-lapse reads as that much time), then
    turns green with a small pop and holds until the next clock starts. The first clock shows
    at 0 for `lead` seconds before its start, so the first block never lands before the clock. Returns
    an image-sequence pattern, one frame per output frame at `fps`."""
    clocks = []
    # 5th element "down": count from TARGET down to 0, red at 0 (per-round countdowns: worker 16).
    # Repeated event names: the k-th entry using a START name takes its k-th occurrence, paired with
    # the next END after it.
    used = {}
    for c in json.loads(spec):
        a, b, target = c[0], c[1], float(c[2])
        down = len(c) > 4 and c[4] == "down"
        k = used.get(a, 0); used[a] = k + 1
        ta = [e["t"] / 1000 for e in timeline if e["event"] == a] if timeline else ([tl_ev[a]] if a in tl_ev else [])
        tb = [e["t"] / 1000 for e in timeline if e["event"] == b] if timeline else ([tl_ev[b]] if b in tl_ev else [])
        if len(ta) > k:
            te = next((x for x in tb if x > ta[k] + 1e-6), None)
            if te is not None:
                clocks.append((ta[k] - start, te - start, target, c[3] if len(c) > 3 else "", down))
    if not clocks:
        return None
    clocks.sort()
    font = ImageFont.truetype(FONT, 124)
    lfont = ImageFont.truetype(FONT, 54)
    cache = {}
    seq = outdir / "clockseq"
    seq.mkdir()
    n = int(math.ceil(dur * fps)) + 1
    for i in range(n):
        t = i / fps
        cur = [c for j, c in enumerate(clocks) if c[0] - (lead if j == 0 else 0) <= t + 1e-6]
        if not cur:
            key = None
        else:
            t0, t1, target, label, down = cur[-1]
            done = t >= t1 - 1e-6
            lag = 1.5 / fps            # the first frame after a cut can land mid-tick: it still reads 0:00
            v = target * min(1.0, max(0.0, (t - t0 - lag) / max(1e-6, t1 - t0 - lag)))
            pop = 1.0
            if done:   # a quick pop when it lands: 1.22 -> 1.0 over 0.25 s
                k = (t - t1) / 0.25
                pop = 1.0 + 0.22 * max(0.0, 1 - k) if k < 1 else 1.0
            txt = (clock_fmt(0.0, target, False) if done else clock_fmt(target - v, target, False)) if down else clock_fmt(v, target, done)
            key = (txt, label, done, round(pop, 2), down)
        if key not in cache:
            path = outdir / f"clock{len(cache)}.png"
            img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            if key:
                txt, label, done, pop, down = key
                f_ = ImageFont.truetype(FONT, int(124 * pop)) if pop != 1.0 else font
                d = ImageDraw.Draw(img)
                y = BAND + 28
                if label:
                    lw = d.textlength(label, font=lfont)
                    d.text(((W - lw) / 2, y), label, font=lfont, fill=(255, 220, 40, 255), stroke_width=6, stroke_fill=(0, 0, 0, 255))
                    y += 66
                tw = d.textlength(txt, font=f_)
                color = ((255, 60, 60, 255) if down else (80, 255, 80, 255)) if done else (255, 255, 255, 255)
                d.text(((W - tw) / 2, y - (int(124 * pop) - 124) / 2), txt, font=f_, fill=color, stroke_width=8, stroke_fill=(0, 0, 0, 255))
            img.save(path)
            cache[key] = path
        # one image per output frame (hardlinks): an ffconcat list with per-image durations went
        # through the fps filter's rounding and repeated a clock frame now and then
        (seq / f"c{i:05d}.png").hardlink_to(cache[key])
    return seq / "c%05d.png"


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
    k, blended, rendered = 0, 0, 0
    pat = pathlib.Path(args.frames).name
    # real slow-motion frames: scripts/render_replay.py renders slow spans at 60/factor fps into
    # work/<name>.slowmo (blends turned a placed boat into a 50% double exposure: worker 4)
    slow_dir = src_dir.with_suffix(".slowmo")
    slow_fps = json.loads((slow_dir / "slowmo.json").read_text())["fps"] if (slow_dir / "slowmo.json").exists() else None
    while True:
        x = warp.src(k / args.fps) * args.fps
        i = warp.frame(k, args.fps)
        if i >= n_src:
            break
        frac = x - math.floor(x)
        step = warp.src((k + 1) / args.fps) * args.fps - x      # < 1 only inside a slow-motion span
        real = None
        if step < 0.99 and 0.2 < frac < 0.8 and slow_fps:   # slow motion: a real in-between frame from the high-fps pass
            j = int(round(x / args.fps * slow_fps))
            real = slow_dir / f"f{j:05d}.png"
            real = real if real.exists() else None
        if real:
            (wd / (pat % k)).symlink_to(real.resolve())
            rendered += 1
        elif step < 0.99 and 0.2 < frac < 0.8 and math.floor(x) + 1 < n_src:   # fallback: blend the two neighbours (fast things ghost)
            lo = Image.open(src_dir / (pat % math.floor(x))).convert("RGB")
            hi = Image.open(src_dir / (pat % (math.floor(x) + 1))).convert("RGB")
            Image.blend(lo, hi, frac).convert(Image.open(src_dir / (pat % math.floor(x))).mode).save(wd / (pat % k), compress_level=1)   # same pixel format as the sequence
            blended += 1
        else:
            (wd / (pat % k)).symlink_to((src_dir / (pat % i)).resolve())
        k += 1
    if rendered:
        print(f"slow-mo: {rendered} real in-between frames ({slow_fps} fps pass)")
    if blended:
        print(f"slow-mo: {blended} blended in-between frames" + ("" if slow_fps else " (run scripts/render_replay.py <name> for real ones)"))
    args.warp = warp
    print(f"speed: {n_src} frames -> {k} ({', '.join(f'{a:.2f}-{b:.2f}s x{f:g}' for a, b, f in warp.spans)})")
    args.frames = str(wd / pathlib.Path(args.frames).name)
    (wd / "timeline.json").write_text(json.dumps({"timeline": warp.timeline(snap_hotbar(rec["timeline"]))}))
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


def death_start(td_abs, args):
    """Video time the death screen starts: the first output frame whose SOURCE time is within one
    frame of the death (the death tick can land a frame before the overlay's exact time), on the
    frame grid. Through the speed map, so a cut that ends on the death doesn't get the screen over
    the last frames before the cut (worker 7, world_delete: it flickered on and off)."""
    fps = args.out_fps
    warp = getattr(args, "warp", None)
    src = warp.src if warp else (lambda x: x)
    td_src = src(td_abs + 1e-6)   # a mark on a cut's boundary warps to 2.3999999 s: map it past the cut
    k = max(0, int(math.floor(td_abs * fps)) - 3)
    while src(k / fps) < td_src - 1.0 / fps - 1e-6:
        k += 1
    return (k - int(args.start * fps + 1e-6)) / fps - 0.5 / fps

def fgrid(t, fps):
    """An overlay window edge for `enable`: just before the first frame at or after video time t (a
    frame exactly on t is included; half a frame of margin keeps float ties off the edge)."""
    return math.ceil(t * fps - 1e-6) / fps - 0.5 / fps


def cut_times(args):
    """Video times of the hard cuts (speed "cut" spans)."""
    w = getattr(args, "warp", None)
    return [w.out(a) - args.start for a, b, f in (w.spans if w else []) if f == math.inf]


def premix_sfx(args, dur, tmp):
    """edit.sfx (scripts/sfx.py) premixed into the game audio, in Short time -> (audio path, its start offset)."""
    import loud
    if not (args.sfx and args.timeline):
        return args.audio, args.start
    import sfx
    sfx_tl = json.loads(pathlib.Path(args.timeline).read_text())["timeline"]
    track = sfx.build_track(args.sfx, sfx_tl, args.start, dur, tmp / "sfx.wav", args.cards, args.counter)
    if track and args.audio:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{args.start:.4f}", "-i", args.audio, "-i", str(track), "-filter_complex",
                        f"[0:a]atrim=0:{dur + 0.5:.3f},{loud.static(args.audio, -20, args.start, dur)},aresample={sfx.SR},aformat=channel_layouts=stereo[g];[g][1:a]amix=inputs=2:normalize=0:duration=longest[a]",
                        "-map", "[a]", "-ar", str(sfx.SR), str(tmp / "game_sfx.wav")], check=True)
        return str(tmp / "game_sfx.wav"), 0.0
    if track:
        return str(track), 0.0
    return args.audio, args.start


def story_sound(args, narration, audio, audio_ss, story_tl, dur, tmp):
    """The story mix (scripts/story_audio.py, standard and evidence in docs/audio.md): the voice through a clarity chain
    at -15 LUFS, the game at -27 ducked under the lines (with every on-screen event's vanilla sound, from audio.py), the
    scene's ambience, the mood score (ducked 2.5 dB, out before the payoff, no sting after), a soft riser and the hit
    on the payoff, room tone, the clarity guard. -> (wav, the end fade's seconds, the mp4 comment tag: the score for
    publish). The master (-14 LUFS, true peak -1 dBTP) runs after the encode."""
    import story_audio
    import story_track
    rec = json.loads(pathlib.Path(args.rec_path).read_text())
    rec["_path"] = str(args.rec_path)
    name = "story_" + pathlib.Path(args.story).name
    wav = story_audio.mix_story(narration, audio, audio_ss, args.story, story_tl, args.start, dur, tmp / "story_mix.wav",
                                song=args.song, song_start=args.song_start, stunt_sfx=args.sfx, end_after=args.end_after,
                                name=name, rec=rec, stems=os.environ.get("HB_STEMS") or None)
    meta = json.loads(pathlib.Path(str(wav) + ".json").read_text())
    # a fade at the very end: a Short that ends on a blast cut the boom off at full volume (frame review,
    # story_runaway). It covers the air after the last spoken word (0.25 s for a spoken ending, up to 0.6 s)
    _story, _voice = story_track._lines(args.story)
    _vs, _ = story_track.voice_starts(_voice, story_track._marks(story_tl, args.start, {l["id"] for l in _story["lines"]}, _story.get("start_on_respawn", ())))
    _ends = [t + _voice["lines"][lid]["end"] for lid, t in _vs.items()]   # (a continuous take's lines: their place in the take)
    fade = min(0.6, max(0.25, dur - max(_ends, default=0) - 0.05))
    tag = json.dumps({"hb_score": meta.get("score"), "levels": meta.get("levels_lufs_premaster")}, separators=(",", ":"))
    return wav, fade, tag


def audio_only(args, dur, tmp):
    """--audio_only: the story's sound re-edited onto a finished mp4's picture (stream-copied: the frames, captions
    and overlays are reused as they are). For a sound fix without re-rendering or re-encoding the picture."""
    import story_audio
    import story_track
    if not (args.story and args.timeline):
        sys.exit("--audio_only re-edits a story's sound: it needs --story and --timeline")
    if args.hook or args.replay or args.loop:
        sys.exit("--audio_only: not for an edit with a hook, replay or loop (their audio is spliced with the picture)")
    story_rec = json.loads(pathlib.Path(args.timeline).read_text())
    story_tl, story_track.POSES = story_rec["timeline"], story_rec.get("poses")
    narration = story_track.narration_wav(args.story, story_tl, args.start, dur, tmp / "narration.wav")
    audio, audio_ss = premix_sfx(args, dur, tmp)
    wav, fade, tag = story_sound(args, narration, audio, audio_ss, story_tl, dur, tmp)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", args.audio_only, "-i", str(wav), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                    "-af", f"afade=t=out:st={max(0, dur - fade):.3f}:d={fade:.3f},aresample=48000", "-c:a", "aac", "-b:a", "192k",
                    "-t", f"{dur:.3f}", "-metadata", f"comment={tag}", "-movflags", "+faststart", args.out], check=True)
    story_audio.master(args.out)
    print("wrote", args.out, f"{dur:.2f}s (sound only, picture from {args.audio_only})")
    import shutil
    shutil.rmtree(tmp, ignore_errors=True)   # (its narration, game and mix wavs: ~30 MB a Short)


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
    ap.add_argument("--bands", choices=["blur", "black"], default="black", help="top/bottom bands: a blurred copy of the game (stories, owner 2026-11-10) or black")
    ap.add_argument("--colors", help="word=color pairs, e.g. 'pov=red,villager=green'")
    ap.add_argument("--countdown", help="START_EVENT:END_EVENT:Label:item/icon overlay countdown")
    ap.add_argument("--on_fire", help="START_EVENT:END_EVENT burning overlay")
    ap.add_argument("--timer", help="START_EVENT:END_EVENT count-up timer overlay (speed builds)")
    ap.add_argument("--speed", help='JSON list of [START_EVENT, END_EVENT, FACTOR|"cut"] time-lapse spans (scripts/timewarp.py)')
    ap.add_argument("--clock", help='JSON list of [START_EVENT, END_EVENT, TARGET_SECONDS, LABEL] clocks counting to a target time')
    ap.add_argument("--subs", help='JSON list of [event, text, seconds?] green narration subtitles')
    ap.add_argument("--subs_y", type=float, default=0.42, help="subtitle height as a fraction of the game view (0.15 = top third; default 0.42, mid view)")
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
    ap.add_argument("--punch_stress", help='JSON list of [LINE ID, S INTO THE LINE, PEAK]: short zoom punches on the spoken stress (edit.punchStress)')
    ap.add_argument("--counter", help='JSON {"at": [EVENT, ...], "total": N} "3/5" beat counter')
    ap.add_argument("--cards", help='JSON list of [EVENT, TEXT, SECONDS?, COLOR?, NTH?] impact cards')
    ap.add_argument("--zoom", help='JSON list of [START[:off], END[:off], SCALE] held push-ins on the game view')
    ap.add_argument("--countdowns", help='JSON list of [START_EVENT, END_EVENT, LABEL?, NTH?] live round countdowns (every START pairs with the next END)')
    ap.add_argument("--ring", help='JSON list of [EVENT[:off], SECONDS, X_FRAC?, Y_FRAC?, RADIUS_PX?] red highlight rings')
    ap.add_argument("--tags", help='JSON list of [START, END|null, TEXT, COLOR, NTH?] persistent role labels')
    ap.add_argument("--chat", help='JSON list of [EVENT, TEXT, TYPE_S?, HOLD_S?, FEEDBACK?] vanilla chat input typed up to EVENT (Enter)')
    ap.add_argument("--shake", help='JSON list of EVENT or [EVENT, NTH, PX] screen shakes on the game view')
    ap.add_argument("--flash", help='JSON list of EVENT or [EVENT, NTH, ALPHA] white flashes on the game view')
    ap.add_argument("--freeze", help='JSON list of [EVENT, SECONDS, TEXT?, COLOR?] freeze frames with a stamped text')
    ap.add_argument("--fallen", help='JSON list of [EVENT_A, EVENT_B, LABEL?] live "blocks fallen" counters (from the poses)')
    ap.add_argument("--sfx", help='JSON list of [KIND, EVENT, (EVENT2), {opts}] sound effects (scripts/sfx.py)')
    ap.add_argument("--replay", help='JSON {"at": EVENT, ...}: append work/<name>.replay (scripts/render_replay.py) after the payoff')
    ap.add_argument("--loop", help='true or SECONDS: the last 0.25 s dissolve into the first frame')
    ap.add_argument("--hook", help='JSON {"at": EVENT, "before": 1.5, "after": 0, "text": ...} finale preview in front (1.2-1.5 s)')
    ap.add_argument("--hud", action=argparse.BooleanOptionalAction, default=True)
    ap.add_argument("--gui_scale", type=int, help="GUI scale of container screens (edit.guiScale; default 3, vanilla's auto scale here; 4 is vanilla's largest at this window): phone-readable chests and barrels")
    ap.add_argument("--chat_align", default="left", choices=["left", "center"], help="chat lines (syschat marks) at vanilla's bottom-left, or centred (edit.chatAlign; story Shorts default to center)")
    ap.add_argument("--chat_y", type=float, default=0.70, help="with --chat_align center: the newest line's middle as a fraction of the game area's height (edit.chatY; 0.70 = the caption line)")
    ap.add_argument("--chat_scale", type=int, help="GUI scale of the chat lines (edit.chatScale; default --gui_scale, else 3): a story's payoff line ('Buh left the game') readable on a phone")
    ap.add_argument("--item_names", help='JSON {item id: name}: draw the selected item\'s name over the hotbar when it changes (Gui.renderSelectedItemName); {} for title-cased ids')
    ap.add_argument("--start", type=float, default=0.0, help="seconds to skip at the start of the footage")
    ap.add_argument("--start_at", help="EVENT:OFFSET - start OFFSET seconds after a timeline event (overrides --start)")
    ap.add_argument("--end_after", help="EVENT:SECONDS - end SECONDS after a timeline event (cuts dead tails)")
    ap.add_argument("--audio_only", metavar="MP4", help="re-edit only a story's sound onto this finished mp4's picture (stream copy; hb render --reuse locally)")
    ap.add_argument("--preview", action="store_true", help="fast encodes for scripts/preview.py (HB_PREVIEW=1): the picture and timing are unchanged")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    if args.preview:
        os.environ["HB_PREVIEW"] = "1"
    args.warp, args.rec_path, args.audio0 = None, args.timeline, args.audio
    frames_dir0 = pathlib.Path(args.frames).parent if args.frames else None
    if (args.speed or args.slowmo or args.freeze) and args.timeline:
        apply_speed(args)
    elif args.timeline:   # (a warped timeline's times no longer match the poses: no snapping there)
        DEATH_POSES[:] = json.loads(pathlib.Path(args.timeline).read_text()).get("poses") or []
    _tl = {}
    if args.timeline:
        for e in json.loads(pathlib.Path(args.timeline).read_text())["timeline"]:
            _tl.setdefault(e["event"], e["t"] / 1000)
    if args.start_at:
        ev_, off_ = args.start_at.rsplit(":", 1)
        if ev_ in _tl:
            args.start = max(0.0, _tl[ev_] + float(off_))
    # start on the frame grid: the footage starts at frame int(start * fps), so every overlay time
    # (event - start) now lines up with the frames (a fractional start put subtitles and screens up to
    # a frame off: workers 3 and 9)
    args.start = math.floor(args.start * args.fps + 1e-6) / args.fps
    sys.path.insert(0, str(HERE / "scripts"))
    import retention
    if (args.punch or getattr(args, 'punch_stress', None) or args.shake or args.flash or args.freeze or args.zoom) and args.timeline and args.frames:
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
        if drop < at - 0.05:   # can't line up: the song starts at 0 and its drop plays early (clutch_harder review)
            print(f"WARNING song drop at {drop:.2f}s plays {at - drop:.2f}s BEFORE the drop event at {at:.2f}s: pick a song with a later drop")
        else:
            print(f"song drop at {drop:.2f}s lands on {at:.2f}s of the Short (song starts at {args.song_start:.2f}s)")
    named = {"red": (235, 40, 40, 255), "green": (60, 220, 60, 255), "yellow": (255, 220, 40, 255), "blue": (80, 160, 255, 255)}
    colors = {}
    for pair in (args.colors or "").split(","):
        if "=" in pair:
            w, c = pair.split("=", 1)
            colors[w.strip().lower()] = named.get(c.strip().lower(), (255, 255, 255, 255))
    caption_png(args.caption, args.red, tmp / "caption.png", colors, bands=args.bands)
    if args.audio_only:   # the finished picture is already cut to the edit: its length is the Short's
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", args.audio_only],
                                   capture_output=True, text=True).stdout)
    else:
        dur = probe_duration(args) - args.start
    if args.end_after:
        ev_, secs_ = args.end_after.rsplit(":", 1)
        if ev_ in _tl:
            dur = min(dur, _tl[ev_] + float(secs_) - args.start)
    if args.audio_only:
        return audio_only(args, dur, tmp)
    inputs = (["-ss", str(args.start), "-i", args.video] if args.video else
              ["-framerate", str(args.fps), "-start_number", str(int(args.start * args.fps + 1e-6)), "-i", args.frames])
    inputs += ["-loop", "1", "-framerate", str(args.out_fps), "-i", str(tmp / "caption.png")]
    if args.bands == "blur":   # owner 2026-11-10: "the top and bottom can be blur rather than black"
        graph = [f"[0:v]scale={W}:{GAME_H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{GAME_H},split=2[gm][gb]",
                 f"[gb]scale=-2:{H}:flags=bilinear,crop={W}:{H},gblur=sigma=42,eq=brightness=-0.16:saturation=1.1[gbg]",
                 f"[gbg][gm]overlay=0:{BAND},fps={args.out_fps},format=rgba[g0]"]
    else:
        graph = [f"[0:v]scale={W}:{GAME_H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{GAME_H},"
                 f"pad={W}:{H}:0:{BAND}:black,fps={args.out_fps},format=rgba[g0]"]
    last = "g0"
    n_in = 2
    # on-fire overlay first: vanilla draws the HUD on top of the flames
    if args.on_fire and args.timeline:
        # START:END, or several comma-separated: every occurrence of START pairs with the next END
        # after it, so a multi-death Short burns once per burn (worker 7, die_rating)
        tl_all_ = json.loads(pathlib.Path(args.timeline).read_text())["timeline"]
        times = lambda ev: [e["t"] / 1000 for e in tl_all_ if e["event"] == ev]
        wins = []
        for spec in args.on_fire.split(","):
            a_, b_ = spec.strip().split(":")
            for ta in times(a_):
                tb = next((x for x in times(b_) if x >= ta), None)
                if tb is None:
                    continue
                end = tb + 0.6
                if b_ == "death":   # a dead body stays on fire (and in view) until the respawn
                    end = next((_snap_respawn(x) for x in times("respawn") if x > tb), dur + args.start + 1)   # on the respawn's camera jump (it burned 3 frames into the respawn view)
                if not any(abs(ta - w[0]) < 1e-3 for w in wins):
                    wins.append((ta, end))
        with zipfile.ZipFile(CLIENT_JAR) as jar:
            for wi, (t0_, t1_) in enumerate(sorted(wins)):
                pat = fire_frames(jar, t0_, t1_, tmp, prefix=f"fire{wi}")
                inputs += ["-framerate", "20", "-i", pat]
                graph.append(f"[{n_in}:v]fps={args.out_fps},setpts=PTS+{max(0, t0_ - args.start):.3f}/TB[firev{wi}]")
                graph.append(f"[{last}][firev{wi}]overlay=0:0:eof_action=pass[fireo{wi}]")
                last, n_in = f"fireo{wi}", n_in + 1
    if args.hud:
        tl = json.loads(pathlib.Path(args.timeline).read_text())["timeline"] if args.timeline else []
        shift = args.start
        states = hud_states(tl, dur + shift)
        # missing icons, and ones older than the icon renderer or the mesher (a stale empty honey_block
        # icon from before the translucent fix stayed invisible: worker 3, every_clutch)
        made = max((HERE / "renderer" / f).stat().st_mtime for f in ("icons.js", "models.js", "mesher.js", "specialitems.js", "blockentities.js"))
        stale = lambda n: not (ICONS / f"{n}.png").exists() or (ICONS / f"{n}.png").stat().st_mtime < made
        need = sorted({it[0] for st in states for it in st[3] if isinstance(it, tuple) and it and it[0] and stale(it[0])})
        if need:   # 3D icons for block items and special item models (skips flat items itself)
            subprocess.run(["node", str(HERE / "renderer" / "icons.js"), CLIENT_JAR.stem, *need], check=True)
        ticks = hud_ticks(tl, dur + shift, bool(json.loads(pathlib.Path(args.timeline).read_text()).get('keepInventory')) if args.timeline else False)
        first = int(shift * 20 + 1e-6)
        pngs, runs = {}, []                      # unique HUD images, and (png, n_ticks) runs
        with zipfile.ZipFile(CLIENT_JAR) as jar:
            # F1 (hide GUI): no HUD between an f1_on mark and the next f1_off (a cinematic shot, the
            # time-lapse beat of a build Short)
            f1, on_ = [], None
            for e in tl:
                if e["event"] == "f1_on" and on_ is None:
                    on_ = e["t"] / 1000
                elif e["event"] == "f1_off" and on_ is not None:
                    f1.append((on_, e["t"] / 1000)); on_ = None
            if on_ is not None:
                f1.append((on_, 1e9))
            # one HUD image per OUTPUT frame, picked by that frame's tick (floor(t * 20), the same
            # time the game frame shows): through ffconcat with tick durations + fps the HUD changed a
            # frame late (black hearts on the first frame after an instant respawn: worker 3, tries)
            seq = tmp / "hudseq"
            seq.mkdir(exist_ok=True)
            # (video start of each death screen, the first tick hud_ticks shows as dead)
            ds_ticks = [(death_start(a_, args), int(math.ceil(a_ * 20 - 2e-5))) for a_, _b in death_windows(tl, args.death_screen)] \
                if args.death_screen else []
            # the hotbar and slot at the frame's own time, not its tick's: in a time-lapse span a tick
            # of the (warped) timeline is several source ticks, and the counts changed up to 2 frames
            # after the block appeared (lapse_statue). Not around deaths (hud_ticks' death handling)
            # or enchanted stacks (the glint's tick)
            # With a speed map, the HUD state comes from the SOURCE recording at each output frame's
            # source time (warp.src), like the picture: on the warped timeline the 20 Hz grid drifts
            # off the picture after a few cuts (+1/60 s each, lengths not multiples of 50 ms), and the
            # first frames after a cut showed the previous beat's HUD (worker 15, noob_pro_hacker)
            warp = getattr(args, "warp", None)
            if warp:
                src_rec = json.loads(pathlib.Path(args.rec_path).read_text())
                htl = src_rec["timeline"]
                src_end = warp.src(dur + shift) + 0.1
                hstates = hud_states(htl, src_end)
                hticks = hud_ticks(htl, src_end, bool(src_rec.get("keepInventory")))
                tsrc = lambda t_: warp.src(t_ + 1e-9)
                ds_ticks = [(death_start(warp.out(a_), args), int(math.ceil(a_ * 20 - 2e-5))) for a_, _b in death_windows(htl, args.death_screen)] \
                    if args.death_screen else []
            else:
                htl, hstates, hticks, tsrc = tl, states, ticks, (lambda t_: t_)
            exact = not death_windows(htl)
            st_t0 = [a for a, *_ in hstates]
            item_names = json.loads(args.item_names) if getattr(args, "item_names", None) else None
            for j in range(int(math.ceil(dur * args.out_fps)) + 1):
                t_out = shift + j / args.out_fps
                ts = tsrc(t_out)
                st = hticks[min(len(hticks) - 1, int(math.floor(ts * 20 + 1e-6)))]
                if exact and not any(isinstance(it, tuple) and len(it) > 2 for it in st[1]):
                    k = max(0, bisect.bisect_right(st_t0, ts + 1e-6) - 1)
                    st = (hstates[k][2], tuple(hstates[k][3])) + tuple(st[2:])
                for ds0, dtick in ds_ticks:   # the death screen starts on the frame grid (up to a frame
                    if ds0 <= j / args.out_fps and ts < dtick / 20:   # early): empty the HUD on the same frame
                        st = hticks[min(len(hticks) - 1, dtick)]
                if any(a <= t_out + 1e-6 < b for a, b in f1):   # F1 spans, frame-exact
                    st = "F1"
                if st != "F1" and item_names is not None:   # the selected item's name over the hotbar (opt-in)
                    st = tuple(st) + (selected_name(hstates, item_names, ts),)
                if st not in pngs:
                    pngs[st] = tmp / f"hud{len(pngs)}.png"
                    if st == "F1":
                        Image.new("RGBA", (W, H), (0, 0, 0, 0)).save(pngs[st])
                    else:
                        slot, items, health, display, blink, shake, max_health, xp = st[:8]
                        hud_png(jar, slot, list(items), health, pngs[st], display=display, blink=blink, shake=list(shake) if shake else None, max_health=max_health, xp_state=xp, item_name=st[8] if len(st) > 8 else None)
                (seq / f"h{j:05d}.png").symlink_to(pngs[st].resolve())
        inputs += ["-framerate", str(args.out_fps), "-i", str(seq / "h%05d.png")]
        graph.append(f"[{n_in}:v]format=rgba[hudv]")
        graph.append(f"[{last}][hudv]overlay=0:0:eof_action=repeat[hudo]")
        last, n_in = "hudo", n_in + 1
    if args.countdown and args.timeline:
        tl_all = json.loads(pathlib.Path(args.timeline).read_text())["timeline"]
        cd = countdown_frames(args.countdown, tl_all, args.start, tmp, CLIENT_JAR)
        if cd:
            off, pattern = cd
            inputs += ["-framerate", "20", "-i", pattern]
            graph.append(f"[{n_in}:v]fps={args.out_fps},setpts=PTS+{max(0, off):.3f}/TB[cdv]")
            # never over a death screen: the 0.6 s hold after the end mark sat on "You Died!" when the
            # end was a death (worker 18, worse_sky: "SUYou Died!00")
            dsw = [(death_start(a_, args), b_ - args.start) for a_, b_ in death_windows(tl_all, args.death_screen)] if args.death_screen else []
            en = "".join(f"*(1-between(t,{a_:.4f},{min(b_, 1e5):.4f}))" for a_, b_ in dsw)
            graph.append(f"[{last}][cdv]overlay=0:0:eof_action=pass" + (f":enable='1{en}'" if en else "") + "[cdo]")
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
        seq = clock_concat(args.clock, tl_ev, args.start, dur, tmp, fps=args.out_fps, timeline=json.loads(pathlib.Path(args.timeline).read_text())["timeline"])
        if seq:
            inputs += ["-framerate", str(args.out_fps), "-i", str(seq)]
            graph.append(f"[{n_in}:v]format=rgba[clv]")
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
                t_ = tts[nth_] - args.start
                for c in cut_times(args):    # (the same snap as below: a line due a frame or two before a cut starts on it)
                    if c - 0.07 < t_ < c:
                        t_ = c
                sub_starts.append(t_)
        for k, sub in enumerate(json.loads(args.subs)):
            ev_name, text = sub[0], sub[1]
            dur_s = sub[2] if len(sub) > 2 else 1.8
            nth = sub[3] if len(sub) > 3 else 0                 # which occurrence of the event
            ts = [e["t"] / 1000 for e in all_ev if e["event"] == ev_name]
            if len(ts) <= nth:
                continue
            t0 = ts[nth] - args.start
            for c in cut_times(args):
                if c - 0.07 < t0 < c:        # a line due a frame or two before a cut starts on it
                    dur_s -= c - t0; t0 = c
            starts = sorted(x for x in sub_starts if x > t0 + 1e-3)
            if starts and t0 + dur_s >= starts[0] - 0.05:   # never overlap the next line (they doubled up), and
                dur_s = starts[0] - t0       # hand over on its first frame (a 0.05 s gap blanked 3 frames at every change: pickaxe_race)
            for c in cut_times(args):        # a line ending just after a hard cut ends ON the cut (it stayed a frame on the new shot)
                if t0 + 0.3 < c < t0 + dur_s <= c + 0.3:
                    dur_s = c - t0
            # a line shown during a death screen goes below its buttons, drawn over the screen (it sat on
            # "Respawn" at 42% of the game height: worker 7, die_rating)
            dws = [(a - args.start, b - args.start) for a, b in death_windows(all_ev)] if args.death_screen else []
            if any(a < t0 + dur_s and t0 < b for a, b in dws):
                subtitle_png(text, tmp / f"sub{k}.png", yfrac=0.76)
                deferred_subs.append((k, t0, dur_s))
                continue
            subtitle_png(text, tmp / f"sub{k}.png", yfrac=args.subs_y)
            inputs += ["-loop", "1", "-framerate", str(args.out_fps), "-i", str(tmp / f"sub{k}.png")]
            graph.append(f"[{last}][{n_in}:v]overlay=0:0:enable='gte(t,{fgrid(t0, args.out_fps):.4f})*lt(t,{fgrid(t0 + dur_s, args.out_fps):.4f})'[sb{k}]")
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
                t_d = death_start(td_abs, args)
                t_r = min(tr_abs - args.start, 1e6)
                near = [m for m in msgs if abs(m[0] - td_abs) < 1.0]
                msg = min(near, key=lambda m: abs(m[0] - td_abs))[1] if near else (msgs[0][1] if msgs and len(deaths) == 1 else None)
                cause = death_message(jar, msg) if msg else None
                death_screen_png(jar, tmp / f"death{di}_0.png", cause, active=False)
                death_screen_png(jar, tmp / f"death{di}_1.png", cause, active=True)
                for k, (a, b) in enumerate([(t_d, min(t_r, t_d + 1.0)), (t_d + 1.0, t_r)]):
                    if b <= a or b < 0:
                        continue
                    inputs += ["-loop", "1", "-framerate", str(args.out_fps), "-i", str(tmp / f"death{di}_{k}.png")]
                    graph.append(f"[{last}][{n_in}:v]overlay=0:0:enable='gte(t,{max(0, a):.3f})*lt(t,{b:.3f})'[ds{di}_{k}]")
                    last, n_in = f"ds{di}_{k}", n_in + 1
    # an opened chest, barrel or shulker box: the container screen over the game (harness `container` marks)
    if args.timeline:
        cwins = container_windows(json.loads(pathlib.Path(args.timeline).read_text())["timeline"])
        if cwins:
            with zipfile.ZipFile(CLIENT_JAR) as jar:
                for ci, (a_, b_, st) in enumerate(cwins):
                    a, b = a_ - args.start, min(b_ - args.start, 1e6)
                    if b <= 0 or b <= a:
                        continue
                    with gui_scale(args.gui_scale):
                        container_png(jar, st, tmp / f"cont{ci}.png")
                    inputs += ["-loop", "1", "-framerate", str(args.out_fps), "-i", str(tmp / f"cont{ci}.png")]
                    graph.append(f"[{last}][{n_in}:v]overlay=0:0:enable='gte(t,{fgrid(max(0, a), args.out_fps):.4f})*lt(t,{fgrid(b, args.out_fps):.4f})'[ct{ci}]")
                    last, n_in = f"ct{ci}", n_in + 1
    # chat lines (`syschat` marks): '<Jonah> see you tomorrow', 'Jonah left the game' in yellow
    if args.timeline:
        swins = syschat_windows(json.loads(pathlib.Path(args.timeline).read_text())["timeline"])
        if swins:
            with zipfile.ZipFile(CLIENT_JAR) as jar:
                for si, (a_, b_, lines_) in enumerate(swins):
                    a, b = a_ - args.start, min(b_ - args.start, 1e6)
                    if b <= 0 or b <= a:
                        continue
                    with gui_scale(args.chat_scale or args.gui_scale):
                        syschat_png(jar, lines_, tmp / f"chat{si}.png", align=args.chat_align, y_frac=args.chat_y)
                    inputs += ["-loop", "1", "-framerate", str(args.out_fps), "-i", str(tmp / f"chat{si}.png")]
                    graph.append(f"[{last}][{n_in}:v]overlay=0:0:enable='gte(t,{fgrid(max(0, a), args.out_fps):.4f})*lt(t,{fgrid(b, args.out_fps):.4f})'[sc{si}]")
                    last, n_in = f"sc{si}", n_in + 1
    if (args.counter or args.cards or args.freeze or args.fallen or args.countdowns or args.ring or args.tags or args.chat) and args.timeline:   # counters, cards, stamps (scripts/retention.py)
        lst = retention.fx_concat(args.counter, retention.stamp_cards(args.cards, args.freeze), json.loads(pathlib.Path(args.timeline).read_text())["timeline"],
                                  args.start, dur, tmp, args.out_fps, fallen=retention.fallen_fn(args), countdowns=args.countdowns, rings=args.ring, tags=args.tags, chat=args.chat,
                                  hide=[(death_start(a_, args), b_ - args.start) for a_, b_ in death_windows(json.loads(pathlib.Path(args.timeline).read_text())["timeline"], args.death_screen)]
                                  if args.death_screen else [], cuts=cut_times(args))
        if lst:
            inputs += ["-framerate", str(args.out_fps), "-i", str(lst)]   # an exact per-frame image sequence
            graph.append(f"[{n_in}:v]format=rgba[fxv]")
            graph.append(f"[{last}][fxv]overlay=0:0:eof_action=repeat[fxo]")
            last, n_in = "fxo", n_in + 1
    for k, t0, dur_s in deferred_subs:   # subtitles over a death screen: above it, below its buttons
        inputs += ["-loop", "1", "-framerate", str(args.out_fps), "-i", str(tmp / f"sub{k}.png")]
        graph.append(f"[{last}][{n_in}:v]overlay=0:0:enable='gte(t,{fgrid(t0, args.out_fps):.4f})*lt(t,{fgrid(t0 + dur_s, args.out_fps):.4f})'[sbd{k}]")
        last, n_in = f"sbd{k}", n_in + 1
    if args.story and args.timeline:   # narrated story: big word-chunk captions over the game (and the death screen)
        sys.path.insert(0, str(HERE / "scripts"))
        import story_track
        story_rec = json.loads(pathlib.Path(args.timeline).read_text())
        story_tl, story_track.POSES = story_rec["timeline"], story_rec.get("poses")
        flash = story_track.flash_concat(story_tl, args.start, dur, tmp)   # white flashes on `flash` marks (under the captions)
        if flash:
            inputs += ["-framerate", str(args.out_fps), "-i", story_track.as_sequence(flash, "fl")]   # exact frames (ffconcat + fps landed a frame early)
            graph.append(f"[{n_in}:v]format=rgba[flv]")
            graph.append(f"[{last}][flv]overlay=0:0:eof_action=pass[flo]")
            last, n_in = "flo", n_in + 1
        inputs += ["-framerate", str(args.out_fps), "-i", story_track.as_sequence(story_track.caption_concat(args.story, story_tl, args.start, dur, tmp), "cap")]
        graph.append(f"[{n_in}:v]format=rgba[capv]")
        graph.append(f"[{last}][capv]overlay=0:0:eof_action=pass[capo]")
        last, n_in = "capo", n_in + 1
        meter = story_track.meter_concat(args.story, story_tl, args.start, dur, tmp)   # the story's rule meter, if it has one
        if meter:
            inputs += ["-framerate", str(args.out_fps), "-i", story_track.as_sequence(meter, "mt")]
            graph.append(f"[{n_in}:v]format=rgba[mtv]")
            graph.append(f"[{last}][mtv]overlay=0:0:eof_action=repeat[mto]")
            last, n_in = "mto", n_in + 1
        narration = story_track.narration_wav(args.story, story_tl, args.start, dur, tmp / "narration.wav")
    graph.append(f"[{last}][1:v]overlay=0:0,format=yuv420p[v]")
    audio_ss, duck = args.start, ""
    # with a replay or a hook the song goes in LAST, over the whole finished video, so it plays on
    # under the appended replay instead of cutting out (one_in_a_million: the bass fell 35 dB 1 s
    # after the drop), its drop still on the event (+ the hook's length)
    import loud   # static gains + a measured master: dynamic loudnorm flattened build-ups (worker 17)
    late_song = args.song if (args.song and not args.story and (args.replay or args.hook)) else None
    if late_song:
        args.song = None
    if args.sfx and args.timeline:   # sound effects (scripts/sfx.py) premixed into the game audio, in Short time
        import sfx
        duck = sfx.duck_filter(sfx.dips(args.sfx, json.loads(pathlib.Path(args.timeline).read_text())["timeline"], args.start))
        args.audio, audio_ss = premix_sfx(args, dur, tmp)
    maps = ["-map", "[v]"]
    tag = []
    if args.story and args.timeline:   # the whole story mix, the score included (story_sound, scripts/story_audio.py)
        story_wav, story_fade, comment = story_sound(args, narration, args.audio, audio_ss, story_tl, dur, tmp)
        tag = ["-metadata", f"comment={comment}"]   # the score's credit, for publish (scripts/add_song.py)
        inputs += ["-i", str(story_wav)]
        graph.append(f"[{n_in}:a]afade=t=out:st={max(0, dur - story_fade):.3f}:d={story_fade:.3f},aresample=48000[a]")
        maps += ["-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
    elif args.audio and not args.song:
        # Game audio only: leave headroom for a song added at upload.
        inputs += ["-ss", str(audio_ss), "-i", args.audio]
        graph.append(f"[{n_in}:a]{loud.static(args.audio, -18, audio_ss, dur)},aresample=48000,"
                     f"afade=t=out:st={max(0, dur - 0.15):.3f}:d=0.15[a]")
        maps += ["-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
    elif args.song:
        # Song baked in under the game sounds, mastered like the reference Short (-10 LUFS overall).
        # Shorts under 1 minute with a Content ID match follow the rights holder's policy
        # (usually monetize/track); see README "Owner decisions".
        inputs += ["-ss", str(args.song_start), "-i", args.song]
        song = f"[{n_in}:a]atrim=0:{dur:.3f},asetpts=PTS-STARTPTS{duck},{loud.static(args.song, -13, args.song_start, dur)},afade=t=in:d=0.08,afade=t=out:st={max(0, dur - 0.6):.3f}:d=0.6,aresample=48000[song]"
        graph.append(song)
        if args.audio:
            inputs += ["-ss", str(audio_ss), "-i", args.audio]
            graph.append(f"[{n_in + 1}:a]{loud.static(args.audio, -15, audio_ss, dur)},aresample=48000[game]")
            graph.append("[song][game]amix=inputs=2:normalize=0[a]")
        else:
            graph.append("[song]anull[a]")
        maps += ["-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
    cmd = ["ffmpeg", "-loglevel", "error", "-y", *inputs, "-filter_complex", ";".join(graph), *maps,
           "-t", f"{dur:.3f}", "-c:v", "libx264", *retention.x264(), "-pix_fmt", "yuv420p", *tag,
           "-movflags", "+faststart", args.out]
    subprocess.run(cmd, check=True)
    got = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", args.out], capture_output=True, text=True).stdout or 0)
    if got > dur + 0.1:   # never run past --end_after (worker 7 saw a 1.5 s tail with punch/cards/counter)
        print(f"WARNING: encoded {got:.2f}s but the edit is {dur:.2f}s; trimming")
        fixed = tmp / "trim.mp4"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", args.out, "-t", f"{dur:.3f}", "-c", "copy", "-movflags", "+faststart", str(fixed)], check=True)
        pathlib.Path(fixed).replace(args.out)
    if args.story:   # static gain to -14 LUFS and a 4x-oversampled limiter (true peak <= -1 dBTP): scripts/story_audio.py
        import story_audio
        story_audio.master(args.out)
    elif args.audio or args.song:   # the master: a static gain and a true-peak limiter, measured to target
        loud.master(args.out, -10.0 if args.song else -18.0, -1.0 if args.song else -3.0)
    if args.replay and frames_dir0:   # instant replay from the third-person pass (scripts/render_replay.py)
        rdir = frames_dir0.with_suffix(".replay")
        if (rdir / "replay.json").exists():
            ra, rb = json.loads((rdir / "replay.json").read_text())["src"]
            if audio_ss == 0.0 and args.audio:   # the premixed game+sfx track is in Short time: map the window
                wo = args.warp.out if args.warp else (lambda x: x)
                dur += retention.replay_append(args.out, rdir, tmp / "caption.png", args.audio, args.out_fps,
                                               (max(0.0, wo(ra) - args.start), wo(rb) - args.start), tag_off=0.25 if args.loop else 0.0)
            else:
                dur += retention.replay_append(args.out, rdir, tmp / "caption.png", args.audio0, args.out_fps, tag_off=0.25 if args.loop else 0.0)
        else:
            print(f"replay: {rdir} not rendered (python3 scripts/render_replay.py <name>), skipped")
    if args.hook and args.timeline:   # finale preview in front of beat 1 (after mastering: it reuses the final mix)
        h = json.loads(args.hook)
        if h.get("at") in tl_ev:
            retention.hook_prepend(args.out, h, tl_ev[h["at"]] - args.start, args.out_fps,
                                   frames=args.frames, start_index=int(round(args.start * args.fps)), caption=tmp / "caption.png")
            dur += retention.hook_len({"hook": h})
    if late_song:
        h_len = retention.hook_len({"hook": json.loads(args.hook)}) if args.hook else 0.0
        total = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", args.out], capture_output=True, text=True).stdout)
        lduck = ""
        if args.sfx and args.timeline:
            import sfx
            lduck = sfx.duck_filter(sfx.dips(args.sfx, json.loads(pathlib.Path(args.timeline).read_text())["timeline"], args.start, h_len))
        ss = args.song_start - h_len               # the song keeps running: the drop lands h_len later
        delay = max(0.0, -ss)
        res = tmp / "song_mix.mp4"
        g = (f"[1:a]atrim=0:{total - delay:.3f},asetpts=PTS-STARTPTS" + (f",adelay={int(delay * 1000)}:all=1" if delay > 0 else "") +
             f"{lduck},{loud.static(late_song, -13, max(0.0, ss), total - delay)},afade=t=in:d=0.08,afade=t=out:st={max(0, total - 0.6):.3f}:d=0.6,aresample=48000[song];"
             f"[0:a]{loud.static(args.out, -15)},aresample=48000[game];[song][game]amix=inputs=2:normalize=0:duration=first[a]")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", args.out, "-ss", f"{max(0.0, ss):.3f}", "-i", late_song, "-filter_complex", g,
                        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(res)], check=True)
        pathlib.Path(res).replace(args.out)
        loud.master(args.out, -10.0, -1.0)
        print(f"song: mixed over the whole {total:.2f}s (it plays on under the replay; hook {h_len:.2f}s)")
    if args.loop:   # the end dissolves into the first frame (a seamless re-watch)
        retention.loop_end(args.out, json.loads(args.loop), args.out_fps)
    print("wrote", args.out, f"{dur:.2f}s")


if __name__ == "__main__":
    main()
