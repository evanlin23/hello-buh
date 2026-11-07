# Speedrun timer strip for end_portal_job: runs from 0, splits (green flash + split line) on each portal,
# never stops; turns red on the "IT NEVER ENDS" outro.
import sys, pathlib
from PIL import Image, ImageDraw, ImageFont
out = pathlib.Path(sys.argv[1]); out.mkdir(exist_ok=True)
dur, fps = float(sys.argv[2]), 60
rec_portal = [6.2, 12.2, 17.6, 22.35, 26.65, 30.45, 33.6]
shift = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
splits = [5.233, 10.8, 15.817, 20.133, 24.0, 27.317, 30.083]   # portal openings measured in short.mp4
outro = 32.083 - 1.4   # the IT NEVER ENDS card
F = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
big, small = ImageFont.truetype(F, 72), ImageFont.truetype(F, 34)
SW, SH = 440, 112
def fmt(t):
    m, s = divmod(t, 60); return f"{int(m)}:{s:05.2f}"
def draw_fixed(d, x0, y, txt, font, fill, adv):
    # fixed advance per digit so the timer doesn't jitter
    tw = sum(adv if c.isdigit() else d.textlength(c, font=font) for c in txt)
    x = x0 - tw / 2
    for c in txt:
        w = adv if c.isdigit() else d.textlength(c, font=font)
        cw = d.textlength(c, font=font)
        d.text((x + (w - cw) / 2, y), c, font=font, fill=fill, stroke_width=6, stroke_fill=(0, 0, 0, 255))
        x += w
print("splits", [round(s, 2) for s in splits], "outro", round(outro, 2))
for i in range(int(dur * fps) + 1):
    t = i / fps
    img = Image.new("RGBA", (SW, SH), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, SW - 1, SH - 1), 16, fill=(0, 0, 0, 150))
    done = [s for s in splits if s <= t]
    col = (255, 255, 255, 255)
    if done and t - done[-1] < 0.6: col = (90, 255, 90, 255)
    if t >= outro: col = (255, 70, 70, 255)
    draw_fixed(d, 172, 12, fmt(t), big, col, 46)
    if done:
        n = len(done)
        line = f"{n}/7" if t < outro else "8/∞"
        d.text((340, 36), line, font=small, fill=(90, 255, 90, 255) if t < outro else (255, 70, 70, 255),
               stroke_width=4, stroke_fill=(0, 0, 0, 255))
    img.save(out / f"t_{i:05d}.png")
