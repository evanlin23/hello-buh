"""Channel art from the cinematic renders: avatars (800x800), banners (2560x1440 with the title), and a contact sheet.

    python3 scripts/cinematic.py brand/avatar_scene.json --sheet --at 0.5 --scale 1.5       # 2880x1620 stills
    python3 scripts/cinematic.py brand/banner_scene.json --sheet --at 0.5 --scale 1.33334   # 2560x1440 stills
    python3 brand/compose.py                                                                # -> brand/*.png

(STUNT=brand_keep ./scripts/record.sh first: the castle set and the avatar pairs.)
"""
import pathlib

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent
OUT = HERE / "brand"
CINE = HERE / "work" / "cine"
INTER = str(HERE / "fonts" / "Inter-ExtraBold.ttf")
AVATARS = ["golden", "nebula", "dawn"]
BANNERS = {  # name -> (text colour, glow colour)
    "fogsea": ((255, 248, 236), (255, 170, 80)),
    "nebula": ((246, 240, 255), (170, 120, 255)),
    "sunset": ((255, 248, 236), (255, 160, 60)),
}
SAFE = (2560 - 1546) // 2, (1440 - 423) // 2, (2560 + 1546) // 2, (1440 + 423) // 2   # the band every device shows


def sharp(im):
    """A light unsharp mask after the supersampled downscale (block pixels stay crisp at 100%)."""
    return im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=2))


def still(scene, clip, w):
    return Image.open(next((CINE / scene / "sheet" / f"{clip}_{w}").glob("f*.png"))).convert("RGB")


def avatar(name):
    im = still("brand_avatar", name, 4800)   # 2.5x: the square is 2700 px, 3.4x the output
    W, H = im.size
    cx = W // 2                              # the pair's centre: a full-height square on their faces
    return sharp(im.crop((cx - H // 2, 0, cx + H // 2, H)).resize((800, 800), Image.LANCZOS))


def tracked_width(d, text, font, sp):
    return sum(d.textlength(c, font=font) for c in text) + sp * (len(text) - 1)


def draw_tracked(d, x, y, text, font, sp, fill):
    for c in text:
        d.text((x, y), c, font=font, fill=fill, anchor="ls")
        x += d.textlength(c, font=font) + sp


def banner(name):
    ink, glow = BANNERS[name]
    im = still("brand_banner", name, 5120)   # rendered at 2x, Lanczos down, then sharpened
    im = sharp(im.resize((2560, 1440), Image.LANCZOS))
    W, H = im.size
    title, tag = "HELLO BUH", "minecraft stories, stunts & mysteries"
    big, small = ImageFont.truetype(INTER, 150), ImageFont.truetype(INTER, 44)
    d0 = ImageDraw.Draw(im)
    tw, sw = tracked_width(d0, title, big, 6), tracked_width(d0, tag, small, 1)
    cx = SAFE[0] + 70 + tw / 2               # left in the safe band, the castle on the right
    base = SAFE[1] + 423 // 2 + 40           # the title's baseline, the tagline under it
    tx, sx = cx - tw / 2, cx - sw / 2
    # a soft dark pool behind the words (keeps them readable on the bright sky), then a warm glow, then the ink
    shade = Image.new("L", (W, H), 0)
    ImageDraw.Draw(shade).rounded_rectangle((min(tx, sx) - 60, base - 165, max(tx + tw, sx + sw) + 60, base + 100), 80, fill=120)
    shade = shade.filter(ImageFilter.GaussianBlur(70))
    im = Image.composite(Image.new("RGB", (W, H), (10, 8, 20)), im, shade)
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(lay)
    draw_tracked(g, tx, base, title, big, 6, glow + (200,))
    lay = lay.filter(ImageFilter.GaussianBlur(26))
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    s = ImageDraw.Draw(sh)
    draw_tracked(s, tx + 4, base + 6, title, big, 6, (0, 0, 0, 170))
    draw_tracked(s, sx + 2, base + 74, tag, small, 1, (0, 0, 0, 190))
    sh = sh.filter(ImageFilter.GaussianBlur(5))
    im = Image.alpha_composite(Image.alpha_composite(im.convert("RGBA"), lay), sh)
    d = ImageDraw.Draw(im)
    draw_tracked(d, tx, base, title, big, 6, ink + (255,))
    draw_tracked(d, sx, base + 70, tag, small, 1, ink + (235,))
    return im.convert("RGB")


def circle(im, size):
    im = im.resize((size, size), Image.LANCZOS)
    m = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    out = Image.new("RGB", (size, size), (24, 24, 24))
    out.paste(im, (0, 0), m.resize((size, size), Image.LANCZOS))
    return out


def contact(avs, bns):
    BG, FG = (24, 24, 27), (230, 230, 235)
    W = 2400
    lab = ImageFont.truetype(INTER, 34)
    tiny = ImageFont.truetype(INTER, 22)
    rows = []
    # avatars: the full square, then how YouTube shows it (176, 88 and 40 px circles)
    for n, im in avs.items():
        r = Image.new("RGB", (W // 3, 600), BG)
        r.paste(im.resize((480, 480), Image.LANCZOS), (20, 60))
        for k, (s, y) in enumerate([(176, 60), (88, 260), (40, 370)]):
            r.paste(circle(im, s), (530 + (176 - s) // 2, y))
        ImageDraw.Draw(r).text((20, 12), f"avatar_{n}.png", font=lab, fill=FG)
        rows.append(r)
    top = Image.new("RGB", (W, 600), BG)
    for i, r in enumerate(rows):
        top.paste(r, (i * (W // 3), 0))
    parts = [top]
    # banners: the full image with the device crops outlined, then the desktop strip and the phone band
    for n, im in bns.items():
        p = Image.new("RGB", (W, 1020), BG)
        full = im.resize((1280, 720), Image.LANCZOS)
        d = ImageDraw.Draw(full)
        k = 1280 / 2560
        d.rectangle((0, SAFE[1] * k, 1279, SAFE[3] * k), outline=(255, 255, 255), width=2)
        d.rectangle((SAFE[0] * k, SAFE[1] * k, SAFE[2] * k, SAFE[3] * k), outline=(255, 220, 0), width=2)
        p.paste(full, (20, 70))
        dd = ImageDraw.Draw(p)
        dd.text((20, 20), f"banner_{n}.png  (white: desktop strip, yellow: the safe band every device shows)", font=lab, fill=FG)
        desk = im.crop((0, SAFE[1], 2560, SAFE[3])).resize((1060, int(423 * 1060 / 2560)), Image.LANCZOS)
        p.paste(desk, (1320, 110)); dd.text((1320, 74), "desktop", font=tiny, fill=FG)
        phone = im.crop(SAFE).resize((1060, int(423 * 1060 / 1546)), Image.LANCZOS)
        p.paste(phone, (1320, 360)); dd.text((1320, 324), "phone / safe band", font=tiny, fill=FG)
        parts.append(p)
    sheet = Image.new("RGB", (W, sum(x.height for x in parts)), BG)
    y = 0
    for x in parts:
        sheet.paste(x, (0, y)); y += x.height
    return sheet


def main():
    OUT.mkdir(exist_ok=True)
    avs = {n: avatar(n) for n in AVATARS}
    bns = {n: banner(n) for n in BANNERS}
    for n, im in avs.items():
        im.save(OUT / f"avatar_{n}.png", optimize=True)
    for n, im in bns.items():
        im.save(OUT / f"banner_{n}.png", optimize=True)
    c = contact(avs, bns)
    c.save(OUT / "contact.jpg", quality=88)
    print("wrote", sorted(p.name for p in OUT.glob("*.png")), "contact.jpg")


if __name__ == "__main__":
    main()
