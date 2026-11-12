"""audition_video.py <spec.json> <out.mp4>: a short casting-audition video, one card per clip (letter, role, voice,
the line, its numbers), each clip played twice with a gap. spec: [{letter, title, sub, text, stats, audio}].
720x1280, a still card per clip, AAC audio: a few hundred KB a clip."""
import json
import pathlib
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

W, H = 720, 1280
F = "/usr/share/fonts/opentype/inter/Inter-{}.otf"


def font(w, s):
    return ImageFont.truetype(F.format(w), s)


def wrap(d, text, f, width):
    out, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) > width and cur:
            out.append(cur)
            cur = w
        else:
            cur = t
    return out + [cur] if cur else out


def card(c, path):
    ref = c["letter"] == "REF"
    im = Image.new("RGB", (W, H), (24, 26, 34) if not ref else (34, 30, 24))
    d = ImageDraw.Draw(im)
    accent = (255, 214, 102) if ref else (125, 211, 252)
    d.text((W // 2, 230), c["letter"], font=font("Bold", 220 if not ref else 150), fill=accent, anchor="mm")
    y = 400
    for ln in wrap(d, c["title"], font("Bold", 46), W - 80):
        d.text((W // 2, y), ln, font=font("Bold", 46), fill=(240, 240, 240), anchor="mm")
        y += 58
    for ln in wrap(d, c["sub"], font("Regular", 28), W - 80):
        d.text((W // 2, y + 10), ln, font=font("Regular", 28), fill=(170, 175, 190), anchor="mm")
        y += 38
    y += 90
    for ln in wrap(d, "“" + c["text"] + "”", font("SemiBold", 44), W - 100):
        d.text((W // 2, y), ln, font=font("SemiBold", 44), fill=(255, 255, 255), anchor="mm")
        y += 58
    y = H - 330
    for ln in c.get("stats", []):
        d.text((60, y), ln, font=font("Regular", 28), fill=(190, 195, 210))
        y += 42
    d.text((W // 2, H - 60), "Buh Stories casting audition, 2026-11-12 (batch 3)", font=font("Regular", 22),
           fill=(110, 115, 130), anchor="mm")
    im.save(path)


def main(spec, out):
    cards = json.loads(pathlib.Path(spec).read_text())
    tmp = pathlib.Path(tempfile.mkdtemp())
    parts = []
    for i, c in enumerate(cards):
        png, seg = tmp / f"{i}.png", tmp / f"{i}.mp4"
        card(c, png)
        # the clip twice: 0.5 s lead, the line, 0.9 s gap, the line, 0.8 s tail
        af = ("[1:a]aresample=48000,aformat=channel_layouts=mono,asplit=2[a][b];"
              "[a]adelay=500,apad=pad_dur=0.9[a1];[b]apad=pad_dur=0.8[b1];[a1][b1]concat=n=2:v=0:a=1,loudnorm=I=-16:TP=-1.5[aout]")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", "10", "-i", str(png), "-i", c["audio"],
                        "-filter_complex", af, "-map", "0:v", "-map", "[aout]", "-shortest", "-c:v", "libx264",
                        "-tune", "stillimage", "-pix_fmt", "yuv420p", "-r", "10", "-c:a", "aac", "-b:a", "128k",
                        "-ar", "48000", "-ac", "1", str(seg)], check=True)
        parts.append(seg)
    lst = tmp / "list.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
                    "-movflags", "+faststart", out], check=True)
    print(out)


if __name__ == "__main__":
    main(*sys.argv[1:])
