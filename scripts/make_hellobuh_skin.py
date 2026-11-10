"""HelloBuh's player skin (64x64, classic/wide arms), themed on the channel avatar: a nebula (deep space navy,
magenta, pink, cyan and orange, white stars). Writes skins/hellobuh.png (hood down) and skins/hellobuh_hood.png
(hood up), plus out/brand/skin_preview.png (front + back, both variants).

    python3 scripts/make_hellobuh_skin.py
"""
import math, random, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
R = random.Random(7)
SPACE = (20, 24, 58); SPACE2 = (12, 14, 38); MAG = (196, 58, 140); PINK = (240, 120, 170)
CYAN = (70, 190, 235); ORANGE = (240, 140, 80); WHITE = (250, 250, 255); SKIN = (232, 180, 140); SKIN_D = (205, 150, 112)
HAIR = (28, 26, 48); HAIR_HI = (90, 70, 170); PANTS = (34, 38, 64); PANTS_D = (24, 27, 48); SHOE = (235, 238, 245); SHOE_D = (60, 190, 230)

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def nebula(u, v):
    """A colour on a continuous nebula plane (u, v in skin-space units)."""
    a = math.sin(u * 0.55 + v * 0.35) + math.sin(u * 0.21 - v * 0.6 + 1.3) * 0.8
    b = math.sin(u * 0.4 + v * 0.9 + 2.1) * 0.7 + math.cos(v * 0.3 - u * 0.15)
    t = max(0.0, min(1.0, (a + 1.8) / 3.6))
    col = lerp(SPACE, MAG, t ** 1.6)
    if b > 0.6: col = lerp(col, CYAN, min(1, (b - 0.6) * 0.9))
    if a > 1.2: col = lerp(col, ORANGE, min(1, (a - 1.2) * 0.8))
    if t > 0.85: col = lerp(col, PINK, (t - 0.85) * 3)
    return col

img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
px = img.load()

def box(x0, y0, w, h, fn):
    for y in range(h):
        for x in range(w):
            c = fn(x, y, w, h)
            if c is not None: px[x0 + x, y0 + y] = c if len(c) == 4 else c + (255,)

def part(x, y, w, h, d, faces):
    """Classic skin cuboid at (x,y): faces dict of fn for top,bottom,right,front,left,back."""
    L = {'top': (x + d, y, w, d), 'bottom': (x + d + w, y, w, d), 'right': (x, y + d, d, h), 'front': (x + d, y + d, w, h),
         'left': (x + d + w, y + d, d, h), 'back': (x + d + w + d, y + d, w, h)}
    for k, (fx, fy, fw, fh) in L.items():
        if k in faces: box(fx, fy, fw, fh, faces[k])

def stars(fn, density=0.06, ox=0, oy=0):
    def g(x, y, w, h):
        c = fn(x, y, w, h)
        if c is None: return None
        r = random.Random(hash((x + ox, y + oy, w, h)) & 0xffff).random()
        if r < density: return WHITE
        if r < density * 1.6: return lerp(c, WHITE, 0.5)
        return c
    return g

# ---- head: hair + face ----
def hair(x, y, w, h):
    c = HAIR
    if (x + y * 3) % 7 == 0: c = HAIR_HI
    return c
def face(x, y, w, h):
    if y < 2: return hair(x, y, w, h)
    if y == 2 and x in (0, 7): return hair(x, y, w, h)
    if y == 3 and x in (0, 7): return SKIN_D
    if y == 4:
        if x in (1, 5): return WHITE
        if x in (2, 6): return CYAN
        if x in (0, 3, 4, 7): return SKIN
    if y == 6 and x in (3, 4): return (150, 80, 80)
    if y == 7: return SKIN_D
    return SKIN
def side(x, y, w, h): return hair(x, y, w, h) if y < 3 or (y < 5 and x > 4) else SKIN_D
def back_head(x, y, w, h): return hair(x, y, w, h) if y < 7 else SKIN_D
part(0, 0, 8, 8, 8, {'top': hair, 'bottom': lambda *a: SKIN_D, 'right': side, 'front': face,
                     'left': lambda x, y, w, h: side(w - 1 - x, y, w, h), 'back': back_head})

# ---- body: nebula hoodie with a cyan zip line and a darker hood bunched at the neck ----
def hoodie(xoff):
    def f(x, y, w, h):
        c = nebula(x + xoff, y)
        if y == 0: c = lerp(c, SPACE2, 0.6)   # hood at the neck
        return c
    return stars(f, 0.05, xoff)
def front_body(x, y, w, h):
    c = hoodie(10)(x, y, w, h)
    if x in (3, 4) and 1 <= y <= 11: c = lerp(c, CYAN, 0.35)   # zip
    if y in (10, 11): c = lerp(c, SPACE2, 0.5)                  # waistband
    return c
part(16, 16, 8, 12, 4, {'top': lambda *a: SPACE2, 'bottom': lambda *a: SPACE2, 'right': hoodie(6), 'front': front_body,
                        'left': hoodie(18), 'back': hoodie(26)})

# ---- arms: hoodie sleeves, cuffs and hands ----
def sleeve(xoff):
    h0 = hoodie(xoff)
    def f(x, y, w, h):
        if y >= 10: return SKIN
        if y == 9: return lerp(SPACE2, CYAN, 0.4)
        return h0(x, y, w, h)
    return f
part(40, 16, 4, 12, 4, {'top': hoodie(40), 'bottom': lambda *a: SKIN, 'right': sleeve(0), 'front': sleeve(2), 'left': sleeve(4), 'back': sleeve(6)})
part(32, 48, 4, 12, 4, {'top': hoodie(44), 'bottom': lambda *a: SKIN, 'right': sleeve(20), 'front': sleeve(22), 'left': sleeve(24), 'back': sleeve(26)})

# ---- legs: dark pants, white sneakers with a cyan stripe ----
def leg(x, y, w, h):
    if y >= 10: return SHOE_D if y == 10 else SHOE
    return PANTS_D if x == 0 or y == 9 else PANTS
part(0, 16, 4, 12, 4, {'top': lambda *a: PANTS, 'bottom': lambda *a: SHOE, 'right': leg, 'front': leg, 'left': leg, 'back': leg})
part(16, 48, 4, 12, 4, {'top': lambda *a: PANTS, 'bottom': lambda *a: SHOE, 'right': leg, 'front': leg, 'left': leg, 'back': leg})

out = ROOT / 'skins'; out.mkdir(exist_ok=True)
img.save(out / 'hellobuh.png')

# hood-up variant: the hat layer becomes a nebula hood around the face
hood = img.copy(); hp = hood.load()
def hood_face(x, y, w, h): return nebula(x + 3, y + 30) if (y < 2 or x in (0, 7)) else (0, 0, 0, 0)
def hood_side(xoff): return stars(lambda x, y, w, h: nebula(x + xoff, y + 30), 0.05, xoff)
img2 = hood
px = hp
part(32, 0, 8, 8, 8, {'top': hood_side(0), 'right': hood_side(4), 'front': hood_face, 'left': hood_side(12), 'back': hood_side(20)})
hood.save(out / 'hellobuh_hood.png')

# ---- preview: front and back, flat, x16 ----
def flat(sk, back=False):
    S = 16; can = Image.new('RGBA', (16 * S, 32 * S), (0, 0, 0, 0))
    def put(sx, sy, w, h, dx, dy, ov=None):
        reg = sk.crop((sx, sy, sx + w, sy + h)).resize((w * S, h * S), Image.NEAREST)
        can.alpha_composite(reg, (dx * S, dy * S))
        if ov: can.alpha_composite(sk.crop((ov[0], ov[1], ov[0] + w, ov[1] + h)).resize((w * S, h * S), Image.NEAREST), (dx * S, dy * S))
    if not back:
        put(8, 8, 8, 8, 4, 0, (40, 8)); put(20, 20, 8, 12, 4, 8); put(44, 20, 4, 12, 0, 8); put(36, 52, 4, 12, 12, 8)
        put(4, 20, 4, 12, 4, 20); put(20, 52, 4, 12, 8, 20)
    else:
        put(24, 8, 8, 8, 4, 0, (56, 8)); put(32, 20, 8, 12, 4, 8); put(44, 52, 4, 12, 0, 8); put(52, 20, 4, 12, 12, 8)
        put(28, 52, 4, 12, 4, 20); put(12, 20, 4, 12, 8, 20)
    return can
prev = Image.new('RGBA', (16 * 16 * 4 + 120, 32 * 16 + 40), (236, 238, 242, 255))
for i, (sk, b) in enumerate([(img, False), (img, True), (hood, False), (hood, True)]):
    prev.alpha_composite(flat(sk, b), (20 + i * (16 * 16 + 27), 20))
pv = ROOT / 'out' / 'brand'; pv.mkdir(parents=True, exist_ok=True)
prev.save(pv / 'skin_preview.png')
print('wrote', out / 'hellobuh.png', out / 'hellobuh_hood.png', pv / 'skin_preview.png')
