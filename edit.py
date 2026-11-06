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
import pathlib
import subprocess
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


def caption_png(text, red_word, path, colors=None):
    """White bold caption, centered in the top band; emoji drawn from Twemoji, one word optionally red."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, BAND), fill=(0, 0, 0, 255))
    d.rectangle((0, BAND + GAME_H, W, H), fill=(0, 0, 0, 255))
    tokens = text.split(" ")

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
                if red_word and key == red_word.lower():
                    color = (235, 40, 40, 255)
                if colors and key in colors:
                    color = colors[key]
                d.text((x, y), tok, font=font, fill=color)
            x += w + space
        y += line_h
    img.save(path)


def hud_png(jar, slot, items, health, path):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bar = big(sprite(jar, "gui/sprites/hud/hotbar"))
    sel = big(sprite(jar, "gui/sprites/hud/hotbar_selection"))
    bx, by = (W - bar.width) // 2, BAND + GAME_H - bar.height - GUI   # hotbar sits at the bottom edge of the game
    img.alpha_composite(bar, (bx, by))
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
    img.alpha_composite(sel, (bx - GUI + 20 * GUI * slot, by - GUI))
    heart_c, heart = big(sprite(jar, "gui/sprites/hud/heart/container")), big(sprite(jar, "gui/sprites/hud/heart/full"))
    half = big(sprite(jar, "gui/sprites/hud/heart/half"))
    food_e, food = big(sprite(jar, "gui/sprites/hud/food_empty")), big(sprite(jar, "gui/sprites/hud/food_full"))
    xp_bg, xp = big(sprite(jar, "gui/sprites/hud/experience_bar_background")), big(sprite(jar, "gui/sprites/hud/experience_bar_progress"))
    img.alpha_composite(xp_bg, (bx + GUI, by - 7 * GUI))
    img.alpha_composite(xp.crop((0, 0, int(xp.width * 0.35), xp.height)), (bx + GUI, by - 7 * GUI))
    hy = by - 17 * GUI
    for i in range(10):
        hx = bx + 8 * GUI * i
        img.alpha_composite(heart_c, (hx, hy))
        if health >= 2 * i + 2:
            img.alpha_composite(heart, (hx, hy))
        elif health >= 2 * i + 1:
            img.alpha_composite(half, (hx, hy))
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


def death_screen_png(jar, path):
    """Vanilla DeathScreen at GUI scale 3, laid out on the 16:9 window the game area crops."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    top, bot = (0x50, 0x00, 0x00, 0x60), (0x80, 0x30, 0x30, 0xA0)
    grad = Image.new("RGBA", (1, GAME_H))
    for y in range(GAME_H):
        f = y / (GAME_H - 1)
        grad.putpixel((0, y), tuple(int(top[i] + (bot[i] - top[i]) * f) for i in range(4)))
    img.alpha_composite(grad.resize((W, GAME_H)), (0, BAND))
    gh = GAME_H // GUI                                     # GUI-space height of the window
    draw_text(img, jar, "You Died!", W // 2, BAND + 30 * GUI, scale=2 * GUI, center=True)
    draw_text(img, jar, "Score: ", W // 2 - 4 * GUI, BAND + 85 * GUI, center=True)
    draw_text(img, jar, "0", W // 2 + 16 * GUI, BAND + 85 * GUI, color=(255, 255, 85, 255))
    btn = big(sprite(jar, "gui/sprites/widget/button"))
    for i, label in enumerate(["Respawn", "Title Screen"]):
        by_ = BAND + (gh // 4 + 72 + 24 * i) * GUI
        img.alpha_composite(btn, ((W - btn.width) // 2, by_))
        draw_text(img, jar, label, W // 2, by_ + 6 * GUI, center=True)
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


def subtitle_png(text, path):
    """Green glowing in-world subtitle (like HelloBuh's re:zero Short): light green text with a
    soft green glow, centred in the game area, wrapped to 2 lines if long."""
    from PIL import ImageFilter
    font = ImageFont.truetype(FONT.replace("ExtraBold", "Medium") if pathlib.Path(FONT.replace("ExtraBold", "Medium")).exists() else FONT, 64)
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
    y = BAND + int(GAME_H * 0.42) - len(lines) * 36
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    for i, ln in enumerate(lines):
        tw = d.textlength(ln, font=font)
        gd.text(((W - tw) / 2, y + i * 72), ln, font=font, fill=(60, 255, 60, 255), stroke_width=6, stroke_fill=(60, 255, 60, 255))
        d.text(((W - tw) / 2, y + i * 72), ln, font=font, fill=(190, 255, 170, 255))
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
    ap.add_argument("--subs", help='JSON list of [event, text, seconds?] green narration subtitles')
    ap.add_argument("--death_screen", help="timeline event at which the vanilla death screen appears (+0.6 s)")
    ap.add_argument("--timeline")
    ap.add_argument("--audio")
    ap.add_argument("--song", help="music file to bake in (owner-supplied; keep the Short under 60 s)")
    ap.add_argument("--song_start", type=float, default=0.0, help="seconds into the song to start (e.g. the drop)")
    ap.add_argument("--song_drop_at", help="timeline event (or seconds into the Short) where the song's drop should land; the drop is found by scripts/song_drop.py")
    ap.add_argument("--hud", action=argparse.BooleanOptionalAction, default=True)
    ap.add_argument("--start", type=float, default=0.0, help="seconds to skip at the start of the footage")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

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
    inputs = (["-ss", str(args.start), "-i", args.video] if args.video else
              ["-framerate", str(args.fps), "-start_number", str(int(args.start * args.fps)), "-i", args.frames])
    inputs += ["-loop", "1", "-i", str(tmp / "caption.png")]
    graph = [f"[0:v]scale={W}:{GAME_H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{GAME_H},"
             f"pad={W}:{H}:0:{BAND}:black,fps={args.out_fps},format=rgba[g0]"]
    last = "g0"
    n_in = 2
    if args.hud:
        tl = json.loads(pathlib.Path(args.timeline).read_text())["timeline"] if args.timeline else []
        shift = args.start
        states = hud_states(tl, dur + shift)
        need = sorted({it[0] for st in states for it in st[3] if isinstance(it, tuple) and it and it[0] and not (ICONS / f"{it[0]}.png").exists()})
        if need:   # 3D icons for block items (skips non-block items itself)
            subprocess.run(["node", str(HERE / "renderer" / "icons.js"), CLIENT_JAR.stem, *need], check=True)
        with zipfile.ZipFile(CLIENT_JAR) as jar:
            for k, (a, b, slot, items, health) in enumerate(states):
                p = tmp / f"hud{k}.png"
                hud_png(jar, slot, items, health, p)
                inputs += ["-loop", "1", "-i", str(p)]
                graph.append(f"[{last}][{n_in}:v]overlay=0:0:enable='between(t,{max(0, a - shift):.3f},{b - shift:.3f})'[h{k}]")
                last, n_in = f"h{k}", n_in + 1
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
    if args.on_fire and args.timeline:
        a_, b_ = args.on_fire.split(":")
        if a_ in tl_ev and b_ in tl_ev:
            with zipfile.ZipFile(CLIENT_JAR) as jar:
                pat = fire_frames(jar, tl_ev[a_], tl_ev[b_] + 0.6, tmp)
            inputs += ["-framerate", "20", "-i", pat]
            graph.append(f"[{n_in}:v]fps={args.out_fps},setpts=PTS+{max(0, tl_ev[a_] - args.start):.3f}/TB[firev]")
            graph.append(f"[{last}][firev]overlay=0:0:eof_action=pass[fireo]")
            last, n_in = "fireo", n_in + 1
    if args.timer and args.timer.split(":")[0] in tl_ev and args.timer.split(":")[1] in tl_ev:
        a_, b_ = args.timer.split(":")
        off, pat = timer_frames(tl_ev[a_], tl_ev[b_], args.start, tmp)
        inputs += ["-framerate", "20", "-i", pat]
        graph.append(f"[{n_in}:v]fps={args.out_fps},setpts=PTS+{max(0, off):.3f}/TB[tmv]")
        graph.append(f"[{last}][tmv]overlay=0:0:eof_action=repeat[tmo]")
        last, n_in = "tmo", n_in + 1
    if args.subs and args.timeline:
        all_ev = json.loads(pathlib.Path(args.timeline).read_text())["timeline"]
        for k, sub in enumerate(json.loads(args.subs)):
            ev_name, text = sub[0], sub[1]
            dur_s = sub[2] if len(sub) > 2 else 1.8
            nth = sub[3] if len(sub) > 3 else 0                 # which occurrence of the event
            ts = [e["t"] / 1000 for e in all_ev if e["event"] == ev_name]
            if len(ts) <= nth:
                continue
            t0 = ts[nth] - args.start
            subtitle_png(text, tmp / f"sub{k}.png")
            inputs += ["-loop", "1", "-i", str(tmp / f"sub{k}.png")]
            graph.append(f"[{last}][{n_in}:v]overlay=0:0:enable='between(t,{t0:.3f},{t0 + dur_s:.3f})'[sb{k}]")
            last, n_in = f"sb{k}", n_in + 1
    if args.death_screen and args.death_screen in tl_ev:
        with zipfile.ZipFile(CLIENT_JAR) as jar:
            death_screen_png(jar, tmp / "death.png")
        inputs += ["-loop", "1", "-i", str(tmp / "death.png")]
        graph.append(f"[{last}][{n_in}:v]overlay=0:0:enable='gte(t,{tl_ev[args.death_screen] - args.start + 0.6:.3f})'[dso]")
        last, n_in = "dso", n_in + 1
    graph.append(f"[{last}][1:v]overlay=0:0,format=yuv420p[v]")
    maps = ["-map", "[v]"]
    if args.audio and not args.song:
        # Game audio only: leave headroom for a song added at upload.
        inputs += ["-ss", str(args.start), "-i", args.audio]
        graph.append(f"[{n_in}:a]loudnorm=I=-18:TP=-3:LRA=11,aresample=48000[a]")
        maps += ["-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
    elif args.song:
        # Song baked in under the game sounds, mastered like the reference Short (-10 LUFS overall).
        # Shorts under 1 minute with a Content ID match follow the rights holder's policy
        # (usually monetize/track); see README "Owner decisions".
        inputs += ["-ss", str(args.song_start), "-i", args.song]
        song = f"[{n_in}:a]atrim=0:{dur:.3f},asetpts=PTS-STARTPTS,loudnorm=I=-13:TP=-2,afade=t=in:d=0.08,afade=t=out:st={max(0, dur - 0.6):.3f}:d=0.6,aresample=48000[song]"
        graph.append(song)
        if args.audio:
            inputs += ["-ss", str(args.start), "-i", args.audio]
            graph.append(f"[{n_in + 1}:a]loudnorm=I=-15:TP=-2,aresample=48000[game]")
            graph.append("[song][game]amix=inputs=2:normalize=0,loudnorm=I=-10:TP=-1:LRA=11[a]")
        else:
            graph.append("[song]loudnorm=I=-10:TP=-1:LRA=11[a]")
        maps += ["-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
    cmd = ["ffmpeg", "-loglevel", "error", "-y", *inputs, "-filter_complex", ";".join(graph), *maps,
           "-t", f"{dur:.3f}", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
           "-movflags", "+faststart", args.out]
    subprocess.run(cmd, check=True)
    print("wrote", args.out, f"{dur:.2f}s")


if __name__ == "__main__":
    main()
