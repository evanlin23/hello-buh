"""Buh Stories channel art (docs/brand.md "Buh Stories channel"): banner, avatar, watermark and a sample first frame,
from stills rendered with our own renderer (scripts/still.py; the stills' commands are in brand/buh_stories/README.md).
Type is Poppins Black (the story captions' font, assets/fonts) in white with Buh gold (#FFD640) accents.

    python3 scripts/buh_stories_art.py banner  <banner_still 2560x1440> out.png [--guides]
    python3 scripts/buh_stories_art.py avatar  <avatar_still 800x800>   out.png [--guides]
    python3 scripts/buh_stories_art.py mark    <avatar_still 800x800>   out.png            (150x150 watermark)
    python3 scripts/buh_stories_art.py cover   <a story Short's frame 1080x1920> out.png --title "..." [--key WORD]

--guides draws YouTube's safe band (banner: 1546x423 in the middle) or the avatar's circle crop on a copy.
"""
import argparse
import pathlib

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent
POPPINS = str(HERE / "assets" / "fonts" / "Poppins-Black.ttf")
INTER = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"   # edit.py's title-band font (the Short format)
GOLD, WHITE, NIGHT = (255, 214, 64), (255, 255, 255), (27, 32, 48)
W, H, BW, BH = 2560, 1440, 1546, 423


def glow_text(base, items, blur):
    """items: [(text, font, (x, y) top-left, fill)]: drawn with a soft dark shadow under them."""
    lay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for txt, font, xy, fill in items:
        d.text(xy, txt, font=font, fill=fill)
    sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sh.putalpha(lay.split()[3].filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * 0.9)))
    out = Image.alpha_composite(base, sh)
    return Image.alpha_composite(out, lay)


def banner(src, out, guides):
    im = Image.open(src).convert("RGB").resize((W, H), Image.LANCZOS).convert("RGBA")
    x0, y0 = (W - BW) // 2, (H - BH) // 2
    # the dog sits in the middle of the band: the wordmark left of it, what the channel is right of it
    big, small = ImageFont.truetype(POPPINS, 132), ImageFont.truetype(POPPINS, 50)
    d = ImageDraw.Draw(im)
    bx = x0 + 30
    l1, l2 = "BUH", "STORIES"
    h1 = big.getbbox(l1)[3]
    yb = y0 + (BH - 2 * h1 - 10) // 2 - 18
    right_x = x0 + BW - 30
    tag = ["short minecraft", "stories"]   # what the channel is, nothing more (owner: r:rca5363, "just do stories" r:rae1fcc)
    tws = [d.textlength(t, font=small) for t in tag]
    ty = y0 + (BH - len(tag) * 66) // 2
    items = [(l1, big, (bx, yb), GOLD), (l2, big, (bx, yb + h1 + 4), WHITE)]
    items += [(t, small, (right_x - tw, ty + i * 66), WHITE if i < len(tag) - 1 else GOLD) for i, (t, tw) in enumerate(zip(tag, tws))]
    im = glow_text(im, items, 14)
    if guides:
        ImageDraw.Draw(im).rectangle((x0, y0, x0 + BW, y0 + BH), outline=(255, 0, 0, 255), width=4)
    im.convert("RGB").save(out, quality=92)


def avatar(src, out, guides):
    im = Image.open(src).convert("RGB").resize((800, 800), Image.LANCZOS)
    if guides:
        d = ImageDraw.Draw(im)
        d.ellipse((0, 0, 799, 799), outline=(255, 0, 0), width=4)
    im.save(out)


def mark(src, out):
    """The watermark: the dog in a gold ring, 150x150 with a transparent corner (YouTube shows it over the video)."""
    S = 600
    im = Image.open(src).convert("RGB").resize((S, S), Image.LANCZOS)
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).ellipse((24, 24, S - 25, S - 25), fill=255)
    o = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(o).ellipse((6, 6, S - 7, S - 7), fill=GOLD + (255,))
    o.paste(im, (0, 0), m)
    o.resize((150, 150), Image.LANCZOS).save(out)


def cover(src, out, title, key):
    """A story Short's first frame in the Buh Stories style: the format's 1080x1920 layout (edit.py: black bands, the
    game view 1080x1011 at y 455), the title (the story's hook) centred in the top band with its key word in gold.
    No series pill or number (owner: "Do we need BUH STORY #5?"): the channel name and #buhstories carry the brand."""
    im = Image.open(src).convert("RGB").resize((1080, 1920)).convert("RGBA")
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 1080, 455), fill=(0, 0, 0, 255))
    d.rectangle((0, 1466, 1080, 1920), fill=(0, 0, 0, 255))
    f = ImageFont.truetype(INTER, 78)
    words = title.split()
    width = lambda ws: d.textlength(" ".join(ws), font=f)
    if width(words) <= 1080 * 0.84 or len(words) < 2:
        lines = [words]
    else:   # two balanced lines (as edit.py's caption): the split with the narrower longer line
        k = min(range(1, len(words)), key=lambda i: max(width(words[:i]), width(words[i:])))
        lines = [words[:k], words[k:]]
    y = 271 - len(lines) * 88 / 2 - 8   # centred on edit.py's CAPTION_Y
    sp = d.textlength(" ", font=f)
    for ln in lines:
        tw = sum(d.textlength(w, font=f) for w in ln) + sp * (len(ln) - 1)
        x = (1080 - tw) / 2
        for w in ln:
            d.text((x, y), w, font=f, fill=GOLD if key and w.strip(".,!?").lower() == key.lower() else WHITE)
            x += d.textlength(w, font=f) + sp
        y += 88
    im.convert("RGB").save(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kind", choices=["banner", "avatar", "mark", "cover"])
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--guides", action="store_true")
    ap.add_argument("--title", default="")
    ap.add_argument("--key", default="")
    a = ap.parse_args()
    if a.kind == "banner":
        banner(a.src, a.out, a.guides)
    elif a.kind == "avatar":
        avatar(a.src, a.out, a.guides)
    elif a.kind == "mark":
        mark(a.src, a.out)
    else:
        cover(a.src, a.out, a.title, a.key)


if __name__ == "__main__":
    main()
