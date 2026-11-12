"""The fake mod's permission popup (format fakemod, STANDARDS r:rd551de): an edit overlay drawn as a clean
Minecraft-style GUI of our own (a container-grey bevelled panel, the game font, vanilla's button widgets, the mob's
spawn egg), with a mouse cursor that glides to the buttons and clicks one. "Roll" spins ALLOW / DENY and lands on
the result.

edit.popup: a list of entries (lib/fakemod.js builds them; every time is a timeline mark the stunt made):
  {"at": [OPEN, CLICK, CLOSE],       the popup opens, the pick is clicked, it closes (the stunt resumes the game there)
   "mob": "creeper",                 spawn egg icon (item/<mob>_spawn_egg)
   "title": "Permission Request",
   "text": ["A ", ["Creeper", "red"], " is asking for permission to explode."],   segments, [TEXT, COLOR] coloured
   "buttons": [["Allow", "green"], ["Deny", "red"], ["Roll", "yellow"]],
   "hover": ["Deny", "Roll"],        the cursor's path over the buttons; the last one is clicked (default: the pick)
   "done": ["Request ", ["DENIED", "red"]],     the body after the click (optional)
   "roll": {"ticks": EVENT, "result": "Allow", "at": RESULT_EVENT},   Roll: each EVENT mark after CLICK switches the
                                     slot (ALLOW / DENY ...), RESULT_EVENT lands it on the result
   "y": 0.5,                         the panel's centre as a fraction of the game view (default 0.5: centred like a
                                     modal, owner r:r7ef6ec; lib/fakemod.js frames the mob under it)
   "scale": 3}                       GUI scale (default 3: 666 x 249 px, the game font 24 px tall)

`frame_key(windows, t)` gives a hashable state for the overlay track (scripts/retention.py fx_concat caches one PNG per
state) and `frame_img(key)` draws it. Times are Short seconds (the timeline already warped, minus the start).
"""
import io
import math
import zipfile

from PIL import Image, ImageDraw

W, H, BAND, GAME_H = 1080, 1920, 455, 1011
SCALE = 3                                # default GUI scale: the panel 666 px wide, centred, the mob framed under it
S = SCALE
PANEL_W = 222                            # GUI px (888 px of the 1080)
PAD = 8
BTN_H = 20
GAP = 4
LINE = 10
DARK = (64, 64, 64, 255)                 # 0x404040: vanilla's container title colour
COL = {"green": (0, 170, 0, 255), "red": (190, 30, 30, 255), "yellow": (190, 140, 0, 255), "blue": (40, 70, 200, 255),
       "dark": DARK, "grey": (110, 110, 110, 255)}
BTN_COL = {"green": (85, 255, 85, 255), "red": (255, 85, 85, 255), "yellow": (255, 255, 85, 255), "white": (255, 255, 255, 255)}
POP_IN, POP_OUT = 0.14, 0.12
# a classic arrow cursor (our own bitmap): X outline, . fill
CURSOR = ["X", "XX", "X.X", "X..X", "X...X", "X....X", "X.....X", "X......X", "X.......X", "X........X", "X.....XXXX",
          "X..X..X", "X.X X..X", "XX  X..X", "X    X..X", "     X..X", "      XX"]

_jar = None
_cache = {}


def jar():
    global _jar
    if _jar is None:
        from edit import CLIENT_JAR
        _jar = zipfile.ZipFile(CLIENT_JAR)
    return _jar


def _png(path):
    if path not in _cache:
        with jar().open(f"assets/minecraft/textures/{path}.png") as f:
            _cache[path] = Image.open(io.BytesIO(f.read())).convert("RGBA")
    return _cache[path]


def nine_slice(path, w, h, b):
    """A vanilla GUI sprite stretched to w x h GUI px with a b px border (gui.scaling nine_slice: the middle tiles)."""
    src = _png(path)
    sw, sh = src.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    xs = [(0, b, 0, b), (b, sw - b, b, w - b), (sw - b, sw, w - b, w)]
    ys = [(0, b, 0, b), (b, sh - b, b, h - b), (sh - b, sh, h - b, h)]
    for sx0, sx1, dx0, dx1 in xs:
        for sy0, sy1, dy0, dy1 in ys:
            if dx1 <= dx0 or dy1 <= dy0:
                continue
            piece = src.crop((sx0, sy0, sx1, sy1))
            for x in range(dx0, dx1, piece.width):          # tiled, like the game (never smeared)
                for y in range(dy0, dy1, piece.height):
                    p = piece.crop((0, 0, min(piece.width, dx1 - x), min(piece.height, dy1 - y)))
                    out.paste(p, (x, y))
    return out


def text_w(text):
    from edit import text_width
    return text_width(jar(), text)


def segs(spec):
    """[(text, rgba)] from a list of str | [text, colour]."""
    out = []
    for s in spec or []:
        if isinstance(s, str):
            out.append((s, DARK))
        else:
            out.append((s[0], COL.get(s[1], DARK) if len(s) > 1 else DARK))
    return out


def wrap(spec, max_w):
    """Word-wrap coloured segments to lines of at most max_w GUI px -> [[(text, rgba)], ...]."""
    words = []
    for text, c in segs(spec):
        parts = text.split(" ")
        for i, p in enumerate(parts):
            words.append((p, c, i < len(parts) - 1))       # (word, colour, a space after it)
    lines, cur, cw = [], [], 0
    space = 4
    for word, c, sp in words:
        ww = text_w(word) + (1 if word else 0)
        if cur and cw + ww > max_w:
            lines.append(cur); cur, cw = [], 0
        if word:
            cur.append((word, c)); cw += ww
        if sp and cur:
            cur.append((" ", c)); cw += space + 1
    if cur:
        lines.append(cur)
    return [[(t, c) for t, c in ln] for ln in lines]


def draw(img, text, x, y, color, shadow=False, scale=1):
    from edit import draw_text
    draw_text(img, jar(), text, x, y, scale=scale, color=color, shadow_on=shadow)


def panel(w, h):
    """A container panel like the inventory's: light grey, a 1 px black outline with cut corners, a white bevel on the
    top-left, a dark one on the bottom-right."""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle((1, 1, w - 2, h - 2), fill=(198, 198, 198, 255))
    d.line((2, 0, w - 3, 0), fill=(0, 0, 0, 255)); d.line((2, h - 1, w - 3, h - 1), fill=(0, 0, 0, 255))
    d.line((0, 2, 0, h - 3), fill=(0, 0, 0, 255)); d.line((w - 1, 2, w - 1, h - 3), fill=(0, 0, 0, 255))
    d.point([(1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2)], fill=(0, 0, 0, 255))
    d.rectangle((1, 1, w - 3, 2), fill=(255, 255, 255, 255)); d.rectangle((1, 1, 2, h - 3), fill=(255, 255, 255, 255))
    d.rectangle((3, h - 3, w - 2, h - 2), fill=(85, 85, 85, 255)); d.rectangle((w - 3, 3, w - 2, h - 2), fill=(85, 85, 85, 255))
    return im


def button(w, label, color, state, big_text=False):
    """A vanilla button widget (widget/button | button_highlighted | button_disabled) with its label centred, the game
    font with its shadow; disabled: grey text. big_text: the label at twice the size (the roll's ALLOW / DENY, readable
    on a phone: the no-op audit 2026-11-12, r:r4607fa)."""
    path = {"hover": "gui/sprites/widget/button_highlighted", "off": "gui/sprites/widget/button_disabled"}.get(state, "gui/sprites/widget/button")
    im = nine_slice(path, w, BTN_H, 1 if state == "off" else 3)
    big = Image.new("RGBA", (w * S, BTN_H * S), (0, 0, 0, 0))
    big.alpha_composite(im.resize((w * S, BTN_H * S), Image.NEAREST))
    col = (160, 160, 160, 255) if state == "off" else BTN_COL.get(color, BTN_COL["white"])
    tw = text_w(label)
    k = 2 if big_text else 1
    draw(big, label, (w * S - tw * S * k) // 2, (BTN_H * S - 8 * S * k) // 2, col, shadow=True, scale=S * k)
    return big


def layout(e):
    """Panel geometry in GUI px: (height, body lines, button rects {label: (x, y, w)})."""
    inner = PANEL_W - 2 * PAD
    body = wrap(e.get("text"), inner)
    done = wrap(e.get("done"), inner) if e.get("done") else None
    n_lines = max(len(body), len(done or []))
    top = PAD + 16 + 5                                      # the icon row
    by = top + n_lines * LINE + 6
    btns = e.get("buttons") or [["Allow", "green"], ["Deny", "red"], ["Roll", "yellow"]]
    bw = (inner - GAP * (len(btns) - 1)) // len(btns)
    rects = {}
    for i, b in enumerate(btns):
        rects[b[0]] = (PAD + i * (bw + GAP), by, bw)
    return by + BTN_H + PAD, body, done, rects


def windows(spec, ev_at, ev_all, start):
    """The entries with their times in Short seconds: ev_at(name) -> source s or None, ev_all(name) -> [source s]."""
    out = []
    for e in spec or []:
        at = e.get("at") or []
        ts = [ev_at(a) for a in at]
        if len(ts) < 3 or any(t is None for t in ts):
            print(f"popup {at} skipped (event missing)")
            continue
        t0, tc, t1 = (t - start for t in ts)
        roll = e.get("roll")
        rt, rres = [], None
        if roll:
            rt = sorted(t - start for t in ev_all(roll.get("ticks", "")) if tc - 1e-6 <= t - start <= t1 + 1e-6)
            rr = ev_at(roll.get("at", "")) if roll.get("at") else None
            rres = (rr - start) if rr is not None else (rt[-1] if rt else tc)
        out.append(dict(e=e, t0=t0, tc=tc, t1=t1, roll_ticks=rt, roll_at=rres))
    return out


def _ease(k):
    k = max(0.0, min(1.0, k))
    return k * k * (3 - 2 * k)


def cursor_at(w, rects, t):
    """The cursor's GUI px position in the panel at Short time t: in from the lower right, then over each hovered button
    in turn (a glide and a rest), on the clicked one by the click."""
    e = w["e"]
    path = list(e.get("hover") or [e.get("pick")])
    pts = [(PANEL_W - 14, rects[path[0]][1] + BTN_H + 26)]
    for name in path:
        x, y, bw = rects[name]
        pts.append((x + bw * 0.55, y + BTN_H * 0.6))
    a, b = w["t0"] + 0.08, w["tc"] - 0.14
    seg = (b - a) / max(1, len(pts) - 1)
    if t <= a:
        return pts[0]
    if t >= b:
        return pts[-1]
    i = min(len(pts) - 2, int((t - a) / seg))
    k = _ease(((t - a) - i * seg) / (seg * 0.7))          # glide 70 % of the segment, rest on the button
    (x0, y0), (x1, y1) = pts[i], pts[i + 1]
    return (x0 + (x1 - x0) * k, y0 + (y1 - y0) * k)


def frame_key(wins, t):
    """The hashable state of the popup at Short time t, or None."""
    for w in wins:
        if not (w["t0"] - 1e-6 <= t < w["t1"] + POP_OUT):
            continue
        e = w["e"]
        h, body, done, rects = layout(e)
        if t < w["t0"] + POP_IN:
            scale = round(0.86 + 0.14 * _ease((t - w["t0"]) / POP_IN), 3); alpha = round(min(1, (t - w["t0"]) / POP_IN * 1.5), 2)
        elif t >= w["t1"]:
            k = (t - w["t1"]) / POP_OUT
            scale = round(1 - 0.12 * k, 3); alpha = round(max(0, 1 - k), 2)
        else:
            scale, alpha = 1.0, 1.0
        clicked = t >= w["tc"] - 1e-6
        cx, cy = cursor_at(w, rects, t)
        hov = next((n for n, (x, y, bw) in rects.items() if x <= cx < x + bw and y <= cy < y + BTN_H), None)
        press = clicked and t < w["tc"] + 0.1
        slot = None
        if e.get("roll") and clicked:
            words = ["Allow", "Deny"]
            res = e["roll"].get("result", "Allow")
            n = sum(1 for x in w["roll_ticks"] if x <= t + 1e-6)
            landed = t >= w["roll_at"] - 1e-6
            # the slot steps through ALLOW / DENY on every tick mark and stops on the result
            word = res if landed else words[(words.index(res) + len(w["roll_ticks"]) - n) % 2]
            slot = (word, landed, round(min(1.0, (t - w["roll_at"]) / 0.25), 2) if landed else 0.0)
        return (id(w), scale, alpha, round(cx * 2) / 2, round(cy * 2) / 2, hov, clicked, press, slot,
                t >= w["tc"] + 0.05 and not e.get("roll"))
    return None


_wins_by_id = {}


def register(wins):
    for w in wins:
        _wins_by_id[id(w)] = w


def frame_img(key):
    """The full-frame RGBA overlay (1080x1920) for a frame_key."""
    global S
    wid, scale, alpha, cx, cy, hov, clicked, press, slot, show_done = key
    w = _wins_by_id[wid]
    e = w["e"]
    S = int(e.get("scale", SCALE))
    h, body, done, rects = layout(e)
    pick = e.get("pick")
    gw, gh = PANEL_W * S, h * S
    pan = panel(PANEL_W, h).resize((gw, gh), Image.NEAREST)
    # the icon row: the mob's spawn egg, the title
    try:
        egg = _png(f"item/{e.get('mob', 'zombie')}_spawn_egg").resize((16 * S, 16 * S), Image.NEAREST)
        pan.alpha_composite(egg, (PAD * S, PAD * S))
    except KeyError:
        pass
    draw(pan, e.get("title", "Permission Request"), (PAD + 20) * S, (PAD + 4) * S, DARK, scale=S)
    tag = e.get("tag", "MobPerms")
    draw(pan, tag, (PANEL_W - PAD - text_w(tag)) * S, (PAD + 4) * S, COL["grey"], scale=S)
    ImageDraw.Draw(pan).rectangle((PAD * S, (PAD + 17) * S, (PANEL_W - PAD) * S - 1, (PAD + 17) * S + S - 1), fill=(139, 139, 139, 255))
    lines = done if (show_done or (slot and slot[1])) and done else body
    y = PAD + 16 + 6
    for ln in lines:
        x = PAD
        for text, c in ln:
            draw(pan, text, x * S, y * S, c, scale=S)
            x += (text_w(text) + 1) if text != " " else 5
        y += LINE
    if slot:                                                 # Roll: one wide slot over the button row
        word, landed, k = slot
        x0 = min(r[0] for r in rects.values()); y0 = next(iter(rects.values()))[1]
        x1 = max(r[0] + r[2] for r in rects.values())
        col = "green" if word == "Allow" else "red"
        b = button(x1 - x0, ("> " + word.upper() + " <") if landed else word.upper(), col, "hover" if landed else "normal", big_text=True)
        pan.alpha_composite(b, (x0 * S, y0 * S))
    else:
        for name, (x, y_, bw) in rects.items():
            color = next((b[1] for b in (e.get("buttons") or []) if b[0] == name), "white")
            if clicked and name != pick:
                st = "off"
            elif (clicked and name == pick) or name == hov:
                st = "hover"
            else:
                st = "normal"
            b = button(bw, name, color, st)
            pan.alpha_composite(b, (x * S, (y_ + (1 if press and name == pick else 0)) * S))
    if scale != 1.0:
        pan = pan.resize((max(1, int(gw * scale)), max(1, int(gh * scale))), Image.BICUBIC)
    if alpha < 1:
        pan.putalpha(pan.split()[3].point(lambda v: int(v * alpha)))
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dim = Image.new("RGBA", (W, GAME_H), (8, 8, 12, int(80 * alpha)))   # the world dims a little behind a screen
    img.alpha_composite(dim, (0, BAND))
    mid = BAND + int(GAME_H * float(e.get("y", 0.5)))      # the panel's centre (centred by default: r:r7ef6ec)
    px, py = (W - pan.width) // 2, mid - pan.height // 2
    img.alpha_composite(pan, (px, py))
    # the cursor, over everything, while the panel is fully open (not on the landed roll's last moments)
    if scale == 1.0 and alpha >= 1 and not (slot and slot[1] and slot[2] >= 1):
        cur = Image.new("RGBA", (12, len(CURSOR)), (0, 0, 0, 0))
        for yy, row in enumerate(CURSOR):
            for xx, ch in enumerate(row):
                if ch in "X.":
                    cur.putpixel((xx, yy), (0, 0, 0, 255) if ch == "X" else (255, 255, 255, 255))
        cur = cur.resize((cur.width * max(2, S - 1), cur.height * max(2, S - 1)), Image.NEAREST)
        x, y = px + int(cx * S), py + int(cy * S)
        if 0 <= x <= W - cur.width and 0 <= y <= H - cur.height:
            img.alpha_composite(cur, (x, y))
    return img
