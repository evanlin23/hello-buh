"""Our own player skins for the AI-dilemma Shorts (docs/ai_dilemma.md): TV-head characters, one per AI, in each brand's
colours with a simple pixel glyph on the screen (original designs, not the companies' logos). Writes 64x64 wide skins to
skins/<name>.png plus skins/<name>_glow.png, the screen alone, which renderer/entities.js draws full bright so the faces
glow at dusk. render.js serves skins/ beside the jar's skins, so a stunt's `cast` can name them like 'noor'.

    python3 scripts/make_skins.py            # -> skins/ai_gpt.png, ai_deep.png, ai_claude.png, ai_gemini.png, ai_grok.png
"""
import pathlib

from PIL import Image

OUT = pathlib.Path(__file__).resolve().parent.parent / "skins"


def hexc(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def box(im, u, v, w, h, d, faces):
    """Paint a Java box-UV cube at (u, v), size w x h x d. faces: a colour or a dict top/bottom/right/front/left/back
    of colours or functions (x, y) -> colour."""
    rects = {"top": (u + d, v, w, d), "bottom": (u + d + w, v, w, d), "right": (u, v + d, d, h),
             "front": (u + d, v + d, w, h), "left": (u + d + w, v + d, d, h), "back": (u + 2 * d + w, v + d, w, h)}
    for name, (x0, y0, rw, rh) in rects.items():
        f = faces.get(name, faces.get("all")) if isinstance(faces, dict) else faces
        if f is None:
            continue
        for y in range(rh):
            for x in range(rw):
                c = f(x, y) if callable(f) else f
                if c is not None:
                    im.putpixel((x0 + x, y0 + y), c)


# glyphs on the 6x6 screen ('#' = glyph colour, '.' = screen colour)
GLYPHS = {
    "ring":    ["..##..", ".#..#.", "#....#", "#....#", ".#..#.", "..##.."],
    "wave":    ["......", ".#....", "#.#..#", "...##.", "......", "......"],
    "spark":   ["..#...", "#.#.#.", ".###..", "#####.", ".###..", "#.#.#."],
    "sparkle": ["..#...", "..#...", "#####.", "..#...", "..#...", "......"],
    "slash":   [".....#", "....#.", "...#..", "..#...", ".#....", "#....."],
}

CHARS = {
    # name: screen, glyph colour, glyph, casing, shirt, jacket, trousers, shoes, accent (tie / trim)
    "ai_gpt":    dict(screen="#0f8f6e", ink="#e8fff6", glyph="ring", case="#1b1d21", shirt="#e9e9e9", jacket="#16181b", legs="#16181b", shoes="#0b0b0c", accent="#0f8f6e"),
    "ai_deep":   dict(screen="#2f56d6", ink="#dfe8ff", glyph="wave", case="#20283a", shirt="#9fb6e8", jacket="#1f2f5e", legs="#2a3346", shoes="#15181f", accent="#2f56d6"),
    "ai_claude": dict(screen="#f3ead8", ink="#d0623c", glyph="spark", case="#5a4636", shirt="#efe4d0", jacket="#c9673f", legs="#8b7660", shoes="#3e2f25", accent="#e8a27f"),
    "ai_gemini": dict(screen="grad", ink="#ffffff", glyph="sparkle", case="#e7e9f0", shirt="#ffffff", jacket="#eef0f6", legs="#4b5cb8", shoes="#2b2f45", accent="#7c6cf0"),
    "ai_grok":   dict(screen="#050506", ink="#f2f2f2", glyph="slash", case="#0d0d0f", shirt="#1a1a1c", jacket="#0a0a0b", legs="#101012", shoes="#050505", accent="#2a2a2e"),
}
GRAD = ["#4285f4", "#6a6cf0", "#9a5cdf", "#c459c8", "#e5609f", "#f07a6f"]   # blue to pink, row by row


def make(name, c):
    im = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    glow = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    case, ink = hexc(c["case"]), hexc(c["ink"])
    g = GLYPHS[c["glyph"]]

    def screen_px(x, y):   # the 8x8 head front: a 1-px bezel round a 6x6 screen
        if x in (0, 7) or y in (0, 7):
            return case
        sx, sy = x - 1, y - 1
        if g[sy][sx] == "#":
            return ink
        return hexc(GRAD[sy]) if c["screen"] == "grad" else hexc(c["screen"])

    def screen_glow(x, y):
        if x in (0, 7) or y in (0, 7):
            return None
        p = screen_px(x, y)
        return (p[0], p[1], p[2], 235)

    # the head: a monitor (casing on every side, the screen on the front), a vent stripe on the back
    darker = tuple(max(0, v - 18) for v in case[:3]) + (255,)
    box(im, 0, 0, 8, 8, 8, {"all": case, "front": screen_px, "back": lambda x, y: darker if y in (2, 4) and 1 <= x <= 6 else case})
    box(glow, 0, 0, 8, 8, 8, {"front": screen_glow})
    # the body: jacket open over the shirt, an accent down the middle (a tie or a zip)
    jacket, shirt, acc = hexc(c["jacket"]), hexc(c["shirt"]), hexc(c["accent"])

    def torso(x, y):
        if 2 <= x <= 5 and y <= 7:
            return acc if x in (3, 4) and 1 <= y <= 6 else shirt
        return jacket
    box(im, 16, 16, 8, 12, 4, {"all": jacket, "front": torso})
    # arms (right 40,16; left 32,48) in the jacket, hands bare-ish (the casing colour: robot hands)
    hand = case

    def arm(x, y):
        return hand if y >= 10 else jacket
    for (u, v) in ((40, 16), (32, 48)):
        box(im, u, v, 4, 12, 4, {"all": arm, "top": jacket, "bottom": hand})
    # legs (right 0,16; left 16,48): trousers, shoes on the last two rows
    legs, shoes = hexc(c["legs"]), hexc(c["shoes"])
    for (u, v) in ((0, 16), (16, 48)):
        box(im, u, v, 4, 12, 4, {"all": lambda x, y: shoes if y >= 10 else legs, "bottom": shoes})
    OUT.mkdir(exist_ok=True)
    im.save(OUT / f"{name}.png")
    glow.save(OUT / f"{name}_glow.png")
    print("wrote", OUT / f"{name}.png")


if __name__ == "__main__":
    for n, c in CHARS.items():
        make(n, c)
