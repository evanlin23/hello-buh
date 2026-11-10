"""scripts/qa_frames.py for 16:9 long-form video (docs/longform.md): the same checks (jump, dup, flicker, hole,
dark, stuck) on the full 1920x1080 frame, and contact sheets of every 15th frame (2 a second at 30 fps).

    python3 scripts/qa_landscape.py out/lf_clutches.mp4 [--out work/qa_frames] [--step 15]

Expect `jump` on every hard cut (cards, chapter changes, teleport cuts) and `stuck` on cards and the outro:
the reviewer decides, as for the Shorts.
"""
import pathlib
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import qa_frames as q  # noqa: E402

STEP = 15


def sheets(path, n, fps, out, step=None, cols=4, rows=5):
    step = step or STEP
    tw, th = 384, 216
    cmd = ["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"select=not(mod(n\\,{step})),scale={tw}:{th}",
           "-vsync", "0", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = q.subprocess.run(cmd, capture_output=True, check=True).stdout
    imgs = np.frombuffer(raw, dtype=np.uint8).reshape(-1, th, tw, 3)
    per, paths = cols * rows, []
    for s in range(0, len(imgs), per):
        sheet = Image.new("RGB", (cols * tw, rows * (th + 26)), (20, 20, 20))
        d = ImageDraw.Draw(sheet)
        for k, im in enumerate(imgs[s:s + per]):
            fi = (s + k) * step
            x, y = (k % cols) * tw, (k // cols) * (th + 26)
            sheet.paste(Image.fromarray(im), (x, y + 26))
            d.text((x + 4, y + 1), f"f{fi}  {int(fi / fps) // 60}:{fi / fps % 60:05.2f}", fill=(255, 230, 0), font=q.FONT)
        p = out / f"sheet_{s // per:02d}.jpg"
        sheet.save(p, quality=88)
        paths.append(p)
    return paths


if __name__ == "__main__":
    if "--step" in sys.argv:
        i = sys.argv.index("--step")
        STEP = int(sys.argv[i + 1])
        del sys.argv[i:i + 2]
    q.TOP, q.GAME_H, q.FULL_W = 0, 1080, 1920
    q.W, q.H = 384, 216
    q.sheets = sheets
    q.main()
