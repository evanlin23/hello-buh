"""A labelled contact sheet from a list of PNGs (hb still / hb sheet). JSON on stdin:
{"title": "...", "cols": 4, "out": "sheet.jpg", "items": [{"path": "a.png", "label": "4.75 s L03", "sub": "tick 117"}]}
"""
import json
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent


def font(n):
    for f in (HERE / "assets" / "fonts" / "SchibstedGrotesk-Black.ttf", pathlib.Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")):
        try:
            return ImageFont.truetype(str(f), n)
        except OSError:
            pass
    return ImageFont.load_default()


def main():
    spec = json.load(sys.stdin)
    items = spec["items"]
    if not items:
        sys.exit("no images")
    ims = [Image.open(it["path"]).convert("RGB") for it in items]
    w, h = ims[0].size
    cols = max(1, min(int(spec.get("cols", 4)), len(ims)))
    rows = (len(ims) + cols - 1) // cols
    f1, f2 = font(max(12, w // 22)), font(max(11, w // 26))
    lab = f1.size + f2.size + 10
    top = f1.size + 12
    sheet = Image.new("RGB", (cols * (w + 4) + 4, top + rows * (h + lab + 4) + 4), (24, 24, 24))
    d = ImageDraw.Draw(sheet)
    d.text((6, 4), spec.get("title", ""), fill=(255, 220, 80), font=f1)
    for i, (im, it) in enumerate(zip(ims, items)):
        x, y = 4 + (i % cols) * (w + 4), top + (i // cols) * (h + lab + 4)
        sheet.paste(im.resize((w, h)) if im.size != (w, h) else im, (x, y))
        d.text((x + 3, y + h + 2), str(it.get("label", ""))[:48], fill=(255, 255, 255), font=f1)
        d.text((x + 3, y + h + 4 + f1.size), str(it.get("sub", ""))[:56], fill=(170, 220, 255), font=f2)
    sheet.save(spec["out"], quality=88)
    print(spec["out"])


if __name__ == "__main__":
    main()
