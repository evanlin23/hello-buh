"""Original player skins for Buh Stories' new characters (docs/engine_briefs/skins.md): every default skin is taken by
a character (docs/world/canon.md, STANDARDS 7a: one look per character), so these are drawn by us, pixel by pixel,
from the specs below (no Mojang or skin-site pixels). 64x64, classic (wide) arms, the same layout and folder as
scripts/make_skins.py: render.js serves skins/ beside the jar's skins, so a stunt's `cast` names them like 'noor'.

    python3 scripts/make_story_skins.py            # -> skins/<name>.png for every name in SKINS
    python3 scripts/make_story_skins.py --flat F   # also a flat front/back sheet of them all at F (a quick look)
    python3 scripts/make_story_skins.py --out D    # write them to D instead (lib/hb/test/story_skins.test.js)

The faces are 8x8 strings (legend in FACE_KEYS); hair, clothes and shoes come from each spec's parameters. Shading is
a fixed per-skin noise (seeded by the name), so a re-run writes the same bytes. Each spec has a one-line canon note
(`note`), also in docs/world/canon.md "Original skins".
"""
import pathlib
import random
import sys

from PIL import Image

OUT = pathlib.Path(__file__).resolve().parent.parent / "skins"


def hexc(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def shade(c, k):
    """k < 0 darker, k > 0 lighter (fraction)."""
    return mix(c, (0, 0, 0), -k) if k < 0 else mix(c, (255, 255, 255), k)


# Java box UV: the faces of a w x h x d cube whose texture starts at (u, v)
def rects(u, v, w, h, d):
    return {"top": (u + d, v, w, d), "bottom": (u + d + w, v, w, d), "right": (u, v + d, d, h),
            "front": (u + d, v + d, w, h), "left": (u + d + w, v + d, d, h), "back": (u + 2 * d + w, v + d, w, h)}


# the parts (base layer, overlay layer), wide arms
PARTS = {
    "head": ((0, 0), (32, 0), (8, 8, 8)),
    "body": ((16, 16), (16, 32), (8, 12, 4)),
    "rarm": ((40, 16), (40, 32), (4, 12, 4)),
    "larm": ((32, 48), (48, 48), (4, 12, 4)),
    "rleg": ((0, 16), (0, 32), (4, 12, 4)),
    "lleg": ((16, 48), (0, 48), (4, 12, 4)),
}

# face string legend (8x8 front of the head, row 0 at the top; column 0 is the character's right = the viewer's left)
FACE_KEYS = {
    "H": "hair", "h": "hair_d", "S": "skin", "s": "skin_d", "W": "eye_w", "E": "eye", "B": "brow", "M": "mouth",
    "R": "beard", "r": "beard_d", "C": "cheek", "G": "glasses", "T": "hat", "t": "hat_d", "X": "mark",
}

SKINS = {
    # --- The Walk (Gullwick, day 4000) ---
    "grandpa_gullwick": dict(
        note="The Walk's Grandpa (Gullwick): bald crown, white hair at the sides, a full white beard and bushy brows; oatmeal cardigan over a blue shirt, brown cords",
        skin="#d9a383", hair="#d8d8d4", hair_d="#a9a9a6", beard="#e6e6e2", beard_d="#b8b8b4", brow="#f2f2ee",
        eye_w="#f0f0ec", eye="#3a5a7a", mouth="#7a4a3a",
        face=["SSSSSSSS",
              "HsSSSSsH",
              "HBBSSBBH",
              "SWESSEWS",
              "RSSssSSR",
              "RRMMMMRR",
              "rRRMMRRr",
              "rRRRRRRr"],
        top="bald", side_rows=5, back_rows=6, beard_rows=(4, 8), hat_layer="beard",
        shirt="#5f86b0", coat="#cdb995", coat_open=True, buttons="#6b4f33", sleeve=12, cuff="#b8a37f",
        pants="#6b4a35", shoes="#3a2a20", shoe_rows=2,
    ),
    "grandma_island": dict(
        note="The Walk's Grandma (the island): silver hair in a bun, round glasses, rosy cheeks; a lavender shawl over a cream blouse, long navy skirt",
        skin="#e7b898", hair="#c9c9cf", hair_d="#9d9da6", brow="#a6a6ad", eye_w="#f4f4f0", eye="#4c6a50",
        mouth="#b0605a", cheek="#e89a8e", glasses="#5a4a3e",
        face=["HHHHHHHH",
              "HHhHHhHH",
              "HBSSSSBH",
              "GWEGGEWG",
              "SCSSSSCS",
              "SSSssSSS",
              "SSSMMSSS",
              "SSSSSSSS"],
        top="full", side_rows=6, back_rows=7, bun=True,
        shirt="#efe6d2", coat="#8a74a8", coat_open=True, shawl=True, sleeve=11, cuff="#efe6d2",
        skirt="#26335a", skirt_rows=10, pants="#26335a", shoes="#2a2420", shoe_rows=2, socks="#7a6f66",
    ),
    "walk_kid": dict(
        note="The Walk's grandchild (Gullwick, by the sea): curly black hair, a yellow raincoat, navy trousers, red wellies",
        skin="#a8714f", hair="#1e1714", hair_d="#3a2c24", brow="#1e1714", eye_w="#f4f4f0", eye="#3a2414",
        mouth="#6e3b2c",
        face=["HhHHhHHh",
              "HHhHHhHH",
              "HSSSSSSH",
              "SWESSEWS",
              "SSSSSSSS",
              "SSSssSSS",
              "SSSMMSSS",
              "SSSSSSSS"],
        top="curly", side_rows=4, back_rows=6, hat_layer="curls",
        shirt="#f2c81e", coat="#f2c81e", buttons="#2a4a8a", toggles=True, sleeve=11, cuff="#d9ab12", hood_collar="#e0b316",
        pants="#24305a", shoes="#c8342c", shoe_rows=4,
    ),
    # --- Pulled Away (Bramble Hollow) ---
    "pulled_man": dict(
        note="Pulled Away's man: short black hair, stubble, a plain grey work shirt with rolled sleeves, dark brown trousers, black boots",
        skin="#c48d68", hair="#1c1a1a", hair_d="#34302e", brow="#1c1a1a", beard="#5a4638", beard_d="#4a382c",
        eye_w="#eeeeea", eye="#4a3020", mouth="#6a3a2c",
        face=["HHHHHHHH",
              "HHHhHHHH",
              "HBBSSBBH",
              "SWESSEWS",
              "SSSssSSS",
              "sSSSSSSs",
              "rSRMMRSr",
              "rrRRRRrr"],
        top="full", side_rows=3, back_rows=4,
        shirt="#8e9196", collar="#7a7d82", placket="#74777c", sleeve=8, cuff="#7a7d82",
        pants="#4f3a2c", belt="#2a2018", shoes="#1e1c1c", shoe_rows=2,
    ),
    # --- The Wall Grows (Highwall, day 3700, in the White) ---
    "hall_player": dict(
        note="The Wall Grows' trading-hall player (Highwall): copper hair, freckles, a forest-green winter coat with a fur collar, grey trousers, black boots",
        skin="#eec3a4", hair="#b8541f", hair_d="#8e3e16", brow="#9a4618", eye_w="#f4f4f0", eye="#3a6a4a",
        mouth="#a85a4a", mark="#d08a68",
        face=["HHHHHHHh",
              "HhHHHHHH",
              "HBBSSBBH",
              "SWESSEWS",
              "SXSXSXSS",
              "SSSssSSS",
              "SSMMMMSS",
              "SSSSSSSS"],
        top="full", side_rows=4, back_rows=5,
        shirt="#2f5a3a", coat="#2f5a3a", fur="#d9cbb0", toggles=True, buttons="#d9cbb0", sleeve=12, cuff="#d9cbb0",
        pants="#6a6e74", belt="#3a3c40", shoes="#18181a", shoe_rows=3,
    ),
    # --- The Singing Box Next Door ---
    "miner_girl": dict(
        note="The Singing Box's girl miner: brown pigtails under a teal bandana, a soot smudge, a rust-orange work shirt, tool belt, patched grey trousers",
        skin="#e0ac88", hair="#5a3420", hair_d="#3e2214", brow="#4a2a18", hat="#2a9a96", hat_d="#1e7470",
        eye_w="#f4f4f0", eye="#3a2414", mouth="#b0604e", mark="#b89484",
        face=["TTTTTTTT",
              "ttTTTTtt",
              "HHSSSSHH",
              "HWESSEWH",
              "SSSSSSXS",
              "SSSssSSS",
              "SSSMMSSS",
              "SSSSSSSS"],
        top="bandana", side_rows=7, back_rows=7, pigtails=True,
        shirt="#c4582a", collar="#a8461e", placket="#a8461e", sleeve=10, cuff="#a8461e", toolbelt="#6b4428",
        pants="#5c6066", patches="#7a8088", shoes="#4a3020", shoe_rows=2,
    ),
    "neighbour": dict(
        note="The Singing Box's neighbour: bald with dark hair at the sides, black round glasses, a thick black moustache (the face that reads the same in diamond armour); navy sweater vest over a white shirt",
        skin="#e2a888", hair="#262222", hair_d="#3c3634", brow="#4a403c", beard="#1a1616", beard_d="#2c2626",
        eye_w="#f4f4f0", eye="#2a2a3a", mouth="#b0705e", glasses="#121212",
        face=["SSSSSSSS",
              "SSSssSSS",
              "HBBSSBBH",
              "GWEGGEWG",
              "SSSssSSS",
              "SRRRRRRS",
              "SSSMMSSS",
              "SSSSSSSS"],
        top="bald", side_rows=5, back_rows=6, jaw=False,
        shirt="#f0f0ec", vest="#22305a", vest_d="#1a2546", sleeve=11, cuff="#dcdcd6",
        pants="#7a6a52", belt="#3a2e22", shoes="#4a3022", shoe_rows=2,
    ),
    # --- Saving Up for a Bastion ---
    "barter_player": dict(
        note="Saving Up for a Bastion's barter-farm player: an orange beanie, dark skin, a short black beard; a black hoodie with orange strings, khaki trousers",
        skin="#7a4a32", hair="#141010", hair_d="#2a2020", brow="#141010", beard="#141010", beard_d="#241a18",
        hat="#e8731e", hat_d="#c25a12", eye_w="#eeeeea", eye="#2a1810", mouth="#4a2418",
        face=["TTTTTTTT",
              "tTtTtTtT",
              "HBBSSBBH",
              "SWESSEWS",
              "SSSssSSS",
              "RSSSSSSR",
              "RRRMMRRR",
              "rRRRRRRr"],
        top="beanie", side_rows=3, back_rows=4, hat_layer="beanie",
        shirt="#1e1e22", hoodie=True, strings="#e8731e", pocket="#16161a", sleeve=12, cuff="#141418",
        pants="#b8a47a", shoes="#e8e4dc", shoe_rows=2, sole="#9a948a",
    ),
    # --- spares ---
    "spare_boy": dict(
        note="Spare boy: chestnut hair with a swept fringe, a burgundy hoodie with white strings, grey joggers, white trainers (no character yet)",
        skin="#f0c4a2", hair="#7a4a26", hair_d="#5a341a", brow="#5a341a", eye_w="#f4f4f0", eye="#4a6aa0",
        mouth="#b46a5a", cheek="#f0aa96",
        face=["HHHHHHHH",
              "HHHHHhSH",
              "HHhSSSSH",
              "SWESSEWS",
              "SCSSSSCS",
              "SSSssSSS",
              "SSSMMSSS",
              "SSSSSSSS"],
        top="full", side_rows=4, back_rows=5,
        shirt="#8a2a3a", hoodie=True, strings="#f0f0ec", pocket="#74222f", sleeve=12, cuff="#74222f",
        pants="#8a8c92", shoes="#f2f2ee", shoe_rows=2, sole="#c8c8c2",
    ),
    "spare_girl": dict(
        note="Spare girl: long straight black hair with a fringe, a pink cardigan over a white top, light jeans, white trainers (no character yet)",
        skin="#f2cfae", hair="#16141a", hair_d="#2c2832", brow="#16141a", eye_w="#f4f4f0", eye="#2a1e18",
        mouth="#c46a6a", cheek="#f2b0a4",
        face=["HHHHHHHH",
              "HHHHHHHH",
              "HHHHHHHH",
              "HWESSEWH",
              "HCSSSSCH",
              "HSSssSSH",
              "HSSMMSSH",
              "hSSSSSSh"],
        top="full", side_rows=8, back_rows=8, long_hair=6,
        shirt="#f4f2ee", coat="#e88aa8", coat_open=True, buttons="#f4f2ee", sleeve=12, cuff="#d07090",
        pants="#8aa8cc", shoes="#f2f2ee", shoe_rows=2, sole="#c8c8c2",
    ),
}


class Skin:
    def __init__(self, name, spec):
        self.name, self.s = name, spec
        self.im = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        self.rng = random.Random(name)
        self.c = {k: hexc(v) for k, v in spec.items() if isinstance(v, str) and v.startswith("#")}
        self.c.setdefault("skin_d", shade(self.c["skin"], -0.12))
        self.c.setdefault("hair_d", shade(self.c["hair"], -0.2))

    def jit(self, c, amt=0.05):
        """a fabric/skin texture: a small fixed random light change per pixel"""
        return shade(c, self.rng.uniform(-amt, amt))

    def put(self, x, y, c, a=255):
        self.im.putpixel((x, y), (*c, a))

    def face_fill(self, part, layer, face, fn):
        (u, v) = PARTS[part][layer]
        w, h, d = PARTS[part][2]
        x0, y0, rw, rh = rects(u, v, w, h, d)[face]
        for y in range(rh):
            for x in range(rw):
                c = fn(x, y, rw, rh)
                if c is not None:
                    self.put(x0 + x, y0 + y, c)

    # ---------- head ----------
    def head(self):
        s, c = self.s, self.c
        key = lambda ch: c[FACE_KEYS[ch]]
        self.face_fill("head", 0, "front", lambda x, y, w, h: self.jit(key(s["face"][y][x]), 0.03))
        hair, hair_d, skin, skin_d = c["hair"], c["hair_d"], c["skin"], c["skin_d"]
        top, sr, br = s["top"], s["side_rows"], s["back_rows"]
        hat = c.get("hat")

        def hairpx(x, y):
            return self.jit(hair_d if (x * 3 + y * 5) % 7 == 0 else hair, 0.04)

        def top_fn(x, y, w, h):
            # y = 0 is the back edge, y = 7 the front edge (Java box UV: the top face's bottom row meets the front)
            if top == "bald":
                rim = x in (0, 7) or y <= 1
                return hairpx(x, y) if rim else self.jit(shade(skin, 0.06), 0.03)
            if top in ("bandana", "beanie"):
                return self.jit(c["hat_d"] if (x + y) % 4 == 0 else hat, 0.04)
            if top == "curly":
                return self.jit(hair_d if (x + 2 * y) % 3 == 0 else hair, 0.05)
            return hairpx(x, y)

        def side_fn(front_col):
            # front_col(x, w) -> how far from the front this column is (0 = touching the front face)
            def f(x, y, w, h):
                k = front_col(x, w)
                beard = s.get("beard_rows")
                if top in ("bandana", "beanie") and y < 2:
                    return self.jit(c["hat_d"] if (y == 1 and top == "beanie" and x % 2) else hat, 0.04)
                if y < sr and (k >= (5 if top == "bald" else 2) or y < 2 or top != "bald"):
                    if top == "bald" and y < 2 and k < 6:
                        return self.jit(shade(skin, 0.0), 0.03)
                    return hairpx(x, y)
                if beard and beard[0] <= y < beard[1] and k <= 4:
                    return self.jit(c["beard_d"] if k == 4 else c["beard"], 0.04)
                if s.get("beard") and not beard and s.get("jaw", True) and y >= 5 and k <= 3:   # a short beard / stubble along the jaw
                    return self.jit(c["beard_d"] if y == 5 else c["beard"], 0.04)
                if 3 <= y <= 5 and k in (3, 4):   # the ear
                    return self.jit(skin_d if y == 4 else skin, 0.03)
                return self.jit(skin_d, 0.03)
            return f

        self.face_fill("head", 0, "top", top_fn)
        self.face_fill("head", 0, "right", side_fn(lambda x, w: w - 1 - x))
        self.face_fill("head", 0, "left", side_fn(lambda x, w: x))

        def back_fn(x, y, w, h):
            if top in ("bandana", "beanie") and y < 2:
                return self.jit(hat, 0.04)
            if s.get("bun") and 1 <= y <= 3 and 2 <= x <= 5:
                return self.jit(c["hair_d"] if (x + y) % 2 else hair, 0.04)
            if top == "bandana" and y == 2 and x in (3, 4):   # the knot
                return self.jit(c["hat_d"], 0.03)
            return hairpx(x, y) if y < br else self.jit(skin_d, 0.03)
        self.face_fill("head", 0, "back", back_fn)
        self.face_fill("head", 0, "bottom", lambda x, y, w, h: self.jit(
            c["beard_d"] if s.get("beard_rows") else skin_d, 0.03))

        # the overlay (hat) layer: a little depth where a real skin would have it
        hl = s.get("hat_layer")
        if hl == "beard":   # the beard and moustache stand out a pixel
            self.face_fill("head", 1, "front", lambda x, y, w, h: self.jit(c["beard"], 0.05) if (y == 7 or (y == 6 and x in (0, 1, 6, 7))) else None)
        elif hl == "beanie":   # the cuff of the beanie around the head
            fn = lambda x, y, w, h: self.jit(c["hat_d"] if x % 2 else hat, 0.04) if y < 2 else None
            for f in ("front", "right", "left", "back"):
                self.face_fill("head", 1, f, fn)
            self.face_fill("head", 1, "top", lambda x, y, w, h: self.jit(hat, 0.05))
        elif hl == "curls":   # curls stand off the head at the top and sides
            fn = lambda x, y, w, h: self.jit(hair, 0.06) if (y == 0 and (x % 3) != 1) else None
            for f in ("front", "right", "left", "back"):
                self.face_fill("head", 1, f, fn)
            self.face_fill("head", 1, "top", lambda x, y, w, h: self.jit(hair_d, 0.05) if (x + y) % 3 == 0 else None)
        if s.get("bun"):   # the bun stands out at the back
            self.face_fill("head", 1, "back", lambda x, y, w, h: self.jit(hair if (x + y) % 2 else c["hair_d"], 0.04) if (1 <= y <= 3 and 2 <= x <= 5) else None)
        if top == "bandana":   # the bandana's tails hang at the back
            self.face_fill("head", 1, "back", lambda x, y, w, h: self.jit(c["hat_d"], 0.04) if (x in (3, 4) and 2 <= y <= 4) else None)

    # ---------- body ----------
    def torso(self):
        s, c = self.s, self.c
        shirt = c["shirt"]
        coat = c.get("coat") or c.get("vest")

        def front(x, y, w, h):
            col = shirt
            if s.get("hoodie"):
                if y == 0: col = shade(shirt, -0.25)   # the hood at the neck
                if y in (1, 2, 3) and x in (2, 5): col = c["strings"]
                if 7 <= y <= 9 and 1 <= x <= 6: col = c["pocket"]
                if y == 11: col = shade(shirt, -0.2)
            if coat and not s.get("vest"):
                inner = 3 <= x <= 4 if s.get("coat_open") else False
                col = shirt if inner else coat
                if s.get("shawl") and y <= 3:
                    col = coat if not (x in (3, 4) and y >= 2) else shirt
                if s.get("toggles") and x == 4 and y in (2, 5, 8):
                    col = c["buttons"]
                if s.get("coat_open") and c.get("buttons") and x == 2 and y in (3, 6, 9) and not s.get("shawl"):
                    col = c["buttons"]
                if s.get("toggles") and x == 3 and 1 <= y:
                    col = shade(coat, -0.18)
            if s.get("vest"):
                if y >= 2 and not (y < 5 and 3 <= x <= 4): col = c["vest"] if (x + y) % 4 else c["vest_d"]
                if y == 11: col = c["vest_d"]
            if c.get("collar") and y == 0 and x not in (3, 4): col = c["collar"]
            if c.get("placket") and x == 3 and 1 <= y <= 8: col = c["placket"]
            if c.get("fur") and (y == 0 or (y == 1 and x in (0, 1, 6, 7))): col = c["fur"]
            if c.get("hood_collar") and y == 0: col = c["hood_collar"]
            if c.get("belt") and y == 11: col = c["belt"]
            if c.get("toolbelt") and y in (10, 11): col = c["toolbelt"] if not (y == 10 and x in (1, 6)) else shade(c["toolbelt"], 0.25)
            if s.get("skirt") and y >= 10: col = c["skirt"]
            if s.get("pigtails") and x in (0, 7) and y <= 4: col = c["hair"] if y < 4 else c["hair_d"]
            if s.get("long_hair") and x in (0, 7) and y < 3: col = c["hair"]
            return self.jit(shade(col, -0.04 * (y / 11)), 0.035)

        def back(x, y, w, h):
            col = coat if (coat and not s.get("vest")) else shirt
            if s.get("vest") and y >= 1: col = c["vest"]
            if s.get("hoodie") and y <= 2: col = shade(shirt, -0.25)   # the hood down the back
            if c.get("fur") and y == 0: col = c["fur"]
            if c.get("hood_collar") and y <= 1: col = c["hood_collar"]
            if c.get("belt") and y == 11: col = c["belt"]
            if c.get("toolbelt") and y in (10, 11): col = c["toolbelt"]
            if s.get("skirt") and y >= 10: col = c["skirt"]
            if s.get("long_hair") and y < s["long_hair"] and 1 <= x <= 6: col = c["hair"] if (x + y) % 5 else c["hair_d"]
            if s.get("shawl") and y <= 4: col = coat
            return self.jit(shade(col, -0.08 - 0.04 * (y / 11)), 0.035)

        def sides(x, y, w, h):
            col = coat if (coat and not s.get("vest")) else shirt
            if s.get("vest") and y >= 3: col = c["vest"]
            if c.get("belt") and y == 11: col = c["belt"]
            if c.get("toolbelt") and y in (10, 11): col = c["toolbelt"]
            if s.get("skirt") and y >= 10: col = c["skirt"]
            return self.jit(shade(col, -0.06), 0.035)

        self.face_fill("body", 0, "front", front)
        self.face_fill("body", 0, "back", back)
        self.face_fill("body", 0, "right", sides)
        self.face_fill("body", 0, "left", sides)
        top_col = c.get("fur") or c.get("hood_collar") or (coat if coat and not s.get("vest") else shirt)
        self.face_fill("body", 0, "top", lambda x, y, w, h: self.jit(top_col, 0.03))
        self.face_fill("body", 0, "bottom", lambda x, y, w, h: self.jit(c.get("skirt", c["pants"]), 0.03))
        # a skirt flares a pixel on the overlay layer at its hem
        if s.get("skirt"):
            for f in ("front", "back", "right", "left"):
                self.face_fill("body", 1, f, lambda x, y, w, h: self.jit(c["skirt"], 0.04) if y >= 10 else None)
        if c.get("fur"):   # the fur collar stands out
            for f in ("front", "back", "right", "left"):
                self.face_fill("body", 1, f, lambda x, y, w, h: self.jit(c["fur"], 0.05) if y == 0 else None)

    def arms(self):
        s, c = self.s, self.c
        sl = s["sleeve"]
        outer = c.get("coat") if (c.get("coat") and not s.get("vest")) else c["shirt"]

        def arm(dark):
            def f(x, y, w, h):
                if y >= sl:
                    col = c["skin"] if y < 11 else c["skin_d"]
                elif y == sl - 1 and c.get("cuff"):
                    col = c["cuff"]
                else:
                    col = outer
                    if s.get("sleeve") and sl <= 8 and y == sl - 2: col = shade(outer, -0.1)   # the roll
                return self.jit(shade(col, dark), 0.035)
            return f
        for p in ("rarm", "larm"):
            self.face_fill(p, 0, "front", arm(0))
            self.face_fill(p, 0, "right", arm(-0.06))
            self.face_fill(p, 0, "left", arm(-0.06))
            self.face_fill(p, 0, "back", arm(-0.1))
            self.face_fill(p, 0, "top", lambda x, y, w, h: self.jit(c.get("fur") or outer, 0.03))
            self.face_fill(p, 0, "bottom", lambda x, y, w, h: self.jit(c["skin_d"], 0.03))
        if s.get("long_hair"):   # nothing on the arms; the hair is on the head and the back
            pass

    def legs(self):
        s, c = self.s, self.c
        sr = s["shoe_rows"]
        skirt_rows = s.get("skirt_rows", 0)

        def leg(dark, patch):
            def f(x, y, w, h):
                if y >= 12 - sr:
                    col = c["shoes"]
                    if c.get("sole") and y == 11: col = c["sole"]
                    if s["shoe_rows"] >= 3 and y == 12 - sr: col = shade(c["shoes"], 0.15)   # the boot's top
                elif y < skirt_rows:
                    col = c["skirt"]
                elif c.get("socks") and y >= skirt_rows:
                    col = c["socks"]
                else:
                    col = c["pants"]
                    if patch and c.get("patches") and 4 <= y <= 6 and 1 <= x <= 2: col = c["patches"]
                return self.jit(shade(col, dark - 0.03 * (y / 11)), 0.035)
            return f
        for p, patch in (("rleg", True), ("lleg", False)):
            self.face_fill(p, 0, "front", leg(0, patch))
            self.face_fill(p, 0, "right", leg(-0.06, False))
            self.face_fill(p, 0, "left", leg(-0.06, False))
            self.face_fill(p, 0, "back", leg(-0.1, False))
            self.face_fill(p, 0, "top", lambda x, y, w, h: self.jit(c.get("skirt") or c["pants"], 0.03))
            self.face_fill(p, 0, "bottom", lambda x, y, w, h: self.jit(c.get("sole") or shade(c["shoes"], -0.2), 0.03))

    def make(self):
        self.head(); self.torso(); self.arms(); self.legs()
        return self.im


def flat(sk, back=False, S=8):
    can = Image.new("RGBA", (16 * S, 32 * S), (0, 0, 0, 0))
    def put(sx, sy, w, h, dx, dy, ov=None):
        can.alpha_composite(sk.crop((sx, sy, sx + w, sy + h)).resize((w * S, h * S), Image.NEAREST), (dx * S, dy * S))
        if ov:
            can.alpha_composite(sk.crop((ov[0], ov[1], ov[0] + w, ov[1] + h)).resize((w * S, h * S), Image.NEAREST), (dx * S, dy * S))
    if not back:
        put(8, 8, 8, 8, 4, 0, (40, 8)); put(20, 20, 8, 12, 4, 8, (20, 36)); put(44, 20, 4, 12, 0, 8); put(36, 52, 4, 12, 12, 8)
        put(4, 20, 4, 12, 4, 20); put(20, 52, 4, 12, 8, 20)
    else:
        put(24, 8, 8, 8, 4, 0, (56, 8)); put(32, 20, 8, 12, 4, 8, (32, 36)); put(52, 20, 4, 12, 0, 8); put(44, 52, 4, 12, 12, 8)
        put(28, 52, 4, 12, 4, 20); put(12, 20, 4, 12, 8, 20)
    return can


def main():
    global OUT
    if "--out" in sys.argv:
        OUT = pathlib.Path(sys.argv[sys.argv.index("--out") + 1])
    OUT.mkdir(exist_ok=True)
    made = {}
    for name, spec in SKINS.items():
        made[name] = Skin(name, spec).make()
        made[name].save(OUT / f"{name}.png")
    print("wrote", ", ".join(str(OUT / f"{n}.png") for n in made))
    if "--flat" in sys.argv:
        dst = sys.argv[sys.argv.index("--flat") + 1]
        S = 8
        sheet = Image.new("RGBA", (len(made) * 16 * S + (len(made) + 1) * 8, 2 * 32 * S + 24), (120, 124, 130, 255))
        for i, im in enumerate(made.values()):
            sheet.alpha_composite(flat(im, False, S), (8 + i * (16 * S + 8), 8))
            sheet.alpha_composite(flat(im, True, S), (8 + i * (16 * S + 8), 16 + 32 * S))
        sheet.save(dst)
        print("wrote", dst)


if __name__ == "__main__":
    main()
