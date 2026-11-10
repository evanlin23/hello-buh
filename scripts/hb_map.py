"""Draw ./hb map's top-down panels (lib/hb/cli.js cmdMap). JSON on stdin:
{"title", "out", "scale" (px a block), "x0", "z0" (the area's north-west corner, set offsets), "cols",
 "panels": [{"label", "grid": [[ [r,g,b] | null per dx ] per dz], "cam": {x, z, yaw, fov, mode} | null,
             "cast": [{label, x, z, yaw, seen, self}]}]}
North is up, east is right. Offsets are labelled every 4 blocks (dx along the top, dz down the left); the set
origin's axes are red; the camera is a yellow wedge (its view, as wide as its fov), the cast dots with a facing tick
(filled = in frame, hollow = out of it)."""
import json
import math
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


def panel(p, S, x0, z0, f1, f2):
    grid = p["grid"]
    nz, nx = len(grid), len(grid[0])
    L, T = 34, 26                                   # margins for the offset labels
    W, H = L + nx * S + 8, T + nz * S + 8
    im = Image.new("RGB", (W, H), (30, 30, 34))
    d = ImageDraw.Draw(im)
    for j, row in enumerate(grid):
        for i, c in enumerate(row):
            d.rectangle([L + i * S, T + j * S, L + (i + 1) * S - 1, T + (j + 1) * S - 1], fill=tuple(c) if c else (20, 20, 24))
    # grid every 4 blocks, labelled; the origin's axes in red
    for i in range(nx + 1):
        dx = x0 + i
        if dx % 4 == 0:
            col = (255, 60, 60) if dx == 0 else (0, 0, 0)
            d.line([L + i * S, T, L + i * S, T + nz * S], fill=col, width=2 if dx == 0 else 1)
            if dx % 8 == 0:
                d.text((L + i * S, 4), str(dx), fill=(255, 120, 120) if dx == 0 else (220, 220, 220), font=f2, anchor="mt")
    for j in range(nz + 1):
        dz = z0 + j
        if dz % 4 == 0:
            col = (255, 60, 60) if dz == 0 else (0, 0, 0)
            d.line([L, T + j * S, L + nx * S, T + j * S], fill=col, width=2 if dz == 0 else 1)
            if dz % 8 == 0:
                d.text((L - 4, T + j * S), str(dz), fill=(255, 120, 120) if dz == 0 else (220, 220, 220), font=f2, anchor="rm")
    px = lambda x, z: (L + (x - x0) * S, T + (z - z0) * S)
    # mineflayer yaw: the look is (-sin yaw, -cos yaw) in (x, z): yaw 0 = north (up)
    fwd = lambda yaw: (-math.sin(yaw), -math.cos(yaw))
    cam = p.get("cam")
    if cam:
        cx, cy = px(cam["x"], cam["z"])
        half = math.radians(cam.get("fov", 70)) * 0.5 * 1080 / 1011   # the game view is about as wide as tall
        r = 14 * S
        pts = [(cx, cy)]
        for k in range(9):
            a = cam["yaw"] - half + 2 * half * k / 8
            fx, fz = fwd(a)
            pts.append((cx + fx * r, cy + fz * r))
        ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
        ImageDraw.Draw(ov).polygon(pts, fill=(255, 220, 60, 70), outline=(255, 220, 60, 255))
        im.paste(ov, (0, 0), ov)
        d = ImageDraw.Draw(im)
        d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(255, 220, 60), outline=(0, 0, 0))
        d.text((cx + 8, cy + 6), "CAM", fill=(255, 230, 120), font=f2)
    for c in p.get("cast", []):
        if c.get("parked"):
            continue
        x, y = px(c["x"], c["z"])
        rad = max(4, S // 2)
        col = (120, 200, 255) if c.get("self") else (255, 255, 255)
        d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=col if c.get("seen") else None, outline=col, width=2)
        fx, fz = fwd(c.get("yaw", 0))
        d.line([x, y, x + fx * rad * 2.2, y + fz * rad * 2.2], fill=col, width=2)
        d.text((x + rad + 2, y - rad - 2), str(c["label"])[:22], fill=col, font=f2, stroke_width=2, stroke_fill=(0, 0, 0))
    # compass
    d.text((W - 14, T + 4), "N", fill=(255, 255, 255), font=f1, anchor="mt")
    d.polygon([(W - 14, T + 22), (W - 19, T + 34), (W - 9, T + 34)], fill=(255, 255, 255))
    d.text((W - 10, T + nz * S - 4), "E ->", fill=(200, 200, 200), font=f2, anchor="rb")
    return im


def main():
    spec = json.load(sys.stdin)
    S = int(spec.get("scale", 8))
    f1, f2 = font(16), font(12)
    ims = [panel(p, S, spec["x0"], spec["z0"], f1, f2) for p in spec["panels"]]
    w, h = ims[0].size
    cols = max(1, min(int(spec.get("cols", 3)), len(ims)))
    rows = (len(ims) + cols - 1) // cols
    top, lab = 30, 24
    sheet = Image.new("RGB", (cols * (w + 6) + 6, top + rows * (h + lab + 6)), (16, 16, 18))
    d = ImageDraw.Draw(sheet)
    d.text((8, 6), spec.get("title", "") + "   (north up, east right, offsets from the set origin; filled = in frame)", fill=(255, 220, 80), font=f1)
    for i, (im, p) in enumerate(zip(ims, spec["panels"])):
        x, y = 6 + (i % cols) * (w + 6), top + (i // cols) * (h + lab + 6)
        d.text((x + 2, y + 2), str(p.get("label", ""))[:60], fill=(255, 255, 255), font=f1)
        sheet.paste(im, (x, y + lab))
    sheet.save(spec["out"])


if __name__ == "__main__":
    main()
