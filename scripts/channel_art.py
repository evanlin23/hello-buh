"""Channel banner text over a rendered still (scripts/still.py): "HELLO BUH" and the tagline in Inter ExtraBold,
centred in YouTube's safe band (1546x423 in the middle of 2560x1440: what phones show), with a soft shadow and glow.

    python3 scripts/channel_art.py banner work/brand/banner_art.png out.png [--guides]
    python3 scripts/channel_art.py avatar work/brand/avatar.png out.png [--guides]   (800x800, the circle shown)

--guides draws the safe band (banner) or the circle crop (avatar) on a copy for checking.
"""
import argparse
import pathlib

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
TITLE, TAG = "HELLO BUH", "minecraft stories, stunts & mysteries"
W, H, BW, BH = 2560, 1440, 1546, 423


def text_layer(size, items):
    """items: [(text, font, (x, y) centre, fill, tracking)] -> (text RGBA, shadow RGBA)."""
    lay = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for txt, font, (cx, cy), fill, track in items:
        widths = [d.textlength(ch, font=font) for ch in txt]
        total = sum(widths) + track * (len(txt) - 1)
        x = cx - total / 2
        asc, desc = font.getmetrics()
        y = cy - (asc - desc * 0.2) / 2 - asc * 0.08
        for ch, w in zip(txt, widths):
            d.text((x, y), ch, font=font, fill=fill)
            x += w + track
    a = lay.split()[3]
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    shadow.putalpha(a.filter(ImageFilter.GaussianBlur(size[0] / 220)).point(lambda v: int(v * 0.85)))
    return lay, shadow


def banner(src, out, guides):
    im = Image.open(src).convert("RGB").resize((W, H), Image.LANCZOS).convert("RGBA")
    cx, cy = W // 2, H // 2
    title = ImageFont.truetype(FONT, 250)
    tag = ImageFont.truetype(FONT, 66)
    lay, sh = text_layer((W, H), [(TITLE, title, (cx, cy - 62), (255, 255, 255, 255), 10),
                                  (TAG, tag, (cx, cy + 118), (255, 236, 205, 255), 3)])
    sh2 = sh.copy(); sh2 = Image.alpha_composite(Image.new("RGBA", (W, H), (0, 0, 0, 0)), sh2)
    im = Image.alpha_composite(im, Image.new("RGBA", (W, H), (0, 0, 0, 0)))
    im.alpha_composite(sh2.transform((W, H), Image.AFFINE, (1, 0, -6, 0, 1, -10)))
    glow = lay.filter(ImageFilter.GaussianBlur(28))
    glow.putalpha(glow.split()[3].point(lambda v: int(v * 0.35)))
    tint = Image.new("RGBA", (W, H), (255, 200, 120, 0)); tint.putalpha(glow.split()[3])
    im.alpha_composite(tint)
    im.alpha_composite(lay)
    im.convert("RGB").save(out, quality=95)
    if guides:
        g = im.copy(); d = ImageDraw.Draw(g)
        d.rectangle(((W - BW) // 2, (H - BH) // 2, (W + BW) // 2, (H + BH) // 2), outline=(255, 0, 0, 255), width=4)
        g.convert("RGB").resize((1280, 720)).save(pathlib.Path(out).with_name(pathlib.Path(out).stem + "_guides.jpg"), quality=85)


def avatar(src, out, guides):
    im = Image.open(src).convert("RGB").resize((800, 800), Image.LANCZOS)
    im.save(out)
    if guides:
        g = im.copy(); d = ImageDraw.Draw(g)
        d.ellipse((0, 0, 799, 799), outline=(255, 0, 0), width=3)
        small = im.copy(); m = Image.new("L", (800, 800), 0); ImageDraw.Draw(m).ellipse((0, 0, 799, 799), fill=255)
        bg = Image.new("RGB", (800, 800), (15, 15, 15)); bg.paste(small, (0, 0), m)
        sheet = Image.new("RGB", (800 + 98 + 48 + 20, 800), (15, 15, 15)); sheet.paste(g, (0, 0))
        sheet.paste(bg.resize((98, 98), Image.LANCZOS), (810, 20)); sheet.paste(bg.resize((48, 48), Image.LANCZOS), (810, 140))
        sheet.save(pathlib.Path(out).with_name(pathlib.Path(out).stem + "_guides.jpg"), quality=88)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("kind", choices=["banner", "avatar"])
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--guides", action="store_true")
    a = ap.parse_args()
    (banner if a.kind == "banner" else avatar)(a.src, a.out, a.guides)
