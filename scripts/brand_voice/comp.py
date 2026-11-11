"""comp.py <out.mp4> <spec.json> : one review video of an audition: for each clip, a 720x1280 card (its letter, the
voice name, the role and model, the line) held while the clip plays, 0.6 s of quiet between clips.
spec: [{"letter", "name", "sub", "text", "audio"}]."""
import json
import pathlib
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
BIG = ImageFont.truetype(str(ROOT / "assets/fonts/Poppins-Black.ttf"), 260)
MID = ImageFont.truetype(str(ROOT / "assets/fonts/Poppins-Black.ttf"), 70)
SM = ImageFont.truetype(str(ROOT / "assets/fonts/Poppins-Black.ttf"), 36)
GOLD, WHITE, GREY, BG = (255, 214, 64), (255, 255, 255), (170, 176, 190), (27, 32, 48)


def wrap(d, text, font, w):
    lines, cur = [], ""
    for word in text.split():
        t = (cur + " " + word).strip()
        if d.textlength(t, font=font) > w and cur:
            lines.append(cur)
            cur = word
        else:
            cur = t
    return lines + [cur] if cur else lines


def card(c, path):
    im = Image.new("RGB", (720, 1280), BG)
    d = ImageDraw.Draw(im)
    d.text((360, 330), c["letter"], font=BIG, fill=GOLD, anchor="mm")
    d.text((360, 560), c["name"], font=MID, fill=WHITE, anchor="mm")
    y = 650
    for ln in wrap(d, c["sub"], SM, 620):
        d.text((360, y), ln, font=SM, fill=GREY, anchor="mm")
        y += 48
    y += 60
    for ln in wrap(d, "“" + c["text"] + "”", SM, 620):
        d.text((360, y), ln, font=SM, fill=WHITE, anchor="mm")
        y += 48
    im.save(path)


def main(out, spec):
    spec = json.load(open(spec))
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="comp-"))
    parts = []
    for i, c in enumerate(spec):
        png, mp4 = tmp / f"{i}.png", tmp / f"{i}.mp4"
        card(c, png)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", str(png), "-i", c["audio"], "-af",
                        "adelay=500|500,apad=pad_dur=0.6,aresample=44100", "-ac", "2", "-shortest", "-r", "30", "-c:v", "libx264",
                        "-pix_fmt", "yuv420p", "-tune", "stillimage", "-c:a", "aac", "-b:a", "160k", str(mp4)], check=True)
        parts.append(mp4)
    (tmp / "list.txt").write_text("".join(f"file '{p}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(tmp / "list.txt"), "-c", "copy",
                    "-movflags", "+faststart", out], check=True)
    print(out)


if __name__ == "__main__":
    main(*sys.argv[1:])
