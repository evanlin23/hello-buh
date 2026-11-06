"""Frame-by-frame QA of a finished Short. Every frame (60 fps) is measured, every 6th frame goes
into a labelled sheet for review, and every flagged moment gets full-resolution frames.

Automatic checks, per frame of the game area (between the caption band and the bottom band):
  jump      a frame-to-frame change far above its neighbours (teleport in-between frames,
            pop-in, flashes of missing geometry). Hard cuts the stunt asked for are listed too:
            the reviewer decides.
  dup       a frame identical to the previous one while the shot is moving (dropped frame)
  flicker   brightness goes up then down (or down then up) by a lot within 3 frames
  hole      a 1/8 x 1/8 tile that is near-black while its neighbours are not (lighting holes,
            missing faces, unlit chunks)
  dark      the whole picture below DARK for 0.5 s or more
  stuck     almost no motion for 1.5 s or more (the bot standing still, a frozen camera)

  python3 scripts/qa_frames.py out/a.mp4 [...] --out work/qa_frames
  -> <out>/<name>/report.json, report.txt, sheet_NN.jpg (5x4 labelled frames, 10 fps),
     flag_<frame>_<kind>.jpg (the frame before, the frame, the frame after, full width)

Reviewers (independent agents, not told the known issues) read report.txt and EVERY sheet,
then every flag image, and list problems by frame number. See docs/qa.md.
"""
import argparse
import json
import pathlib
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont

TOP, GAME_H, FULL_W = 455, 1011, 1080
W, H = 216, 202                 # analysis size (1/5)
DARK = 28
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate,nb_frames",
                          "-show_entries", "format=duration", "-of", "json", str(path)], capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    a, b = j["streams"][0]["r_frame_rate"].split("/")
    return float(a) / float(b), float(j["format"]["duration"])


def gray_frames(path):
    cmd = ["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"crop={FULL_W}:{GAME_H}:0:{TOP},scale={W}:{H},format=gray",
           "-f", "rawvideo", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W).astype(np.float32)


def runs(mask, min_len):
    out, start = [], None
    for i, m in enumerate(list(mask) + [False]):
        if m and start is None:
            start = i
        if not m and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    return out


def analyse(f, fps):
    n = len(f)
    g = f[:, : int(H * 0.86)]                                   # without the hotbar/HUD rows
    diff = np.concatenate([[0.0], np.abs(np.diff(g, axis=0)).mean(axis=(1, 2))])
    bright = f.mean(axis=(1, 2))
    flags = []
    # jump: diff far above the local median (window of 15 frames each side)
    for i in range(1, n):
        lo, hi = max(1, i - 15), min(n, i + 16)
        med = float(np.median(diff[lo:hi]))
        if diff[i] > 8 and diff[i] > 5 * max(med, 0.8):
            flags.append((i, "jump", f"change {diff[i]:.1f} vs local {med:.1f}"))
    # dup: identical frame inside a moving stretch
    for i in range(2, n - 1):
        if diff[i] < 0.02 and diff[i - 1] > 1.0 and diff[i + 1] > 1.0:
            flags.append((i, "dup", "frame repeats while the shot moves"))
    # flicker: brightness up/down swing
    for i in range(1, n - 2):
        a, b = bright[i] - bright[i - 1], bright[i + 2] - bright[i + 1]
        if abs(a) > 12 and abs(b) > 12 and np.sign(a) != np.sign(b):
            flags.append((i, "flicker", f"brightness {bright[i - 1]:.0f}->{bright[i]:.0f}->{bright[i + 2]:.0f}"))
    # hole: an 8x8 grid tile that is near-black while the frame around it is lit
    th, tw = H // 8, W // 8
    last_hole = -99
    for i in range(0, n, 2):
        if bright[i] < DARK + 20:
            continue
        t = f[i, : th * 8, : tw * 8].reshape(8, th, 8, tw)
        black = (t < 14).mean(axis=(1, 3))
        mean = t.mean(axis=(1, 3))
        for r in range(7):                                      # skip the bottom (HUD) row
            for c in range(8):
                if black[r, c] > 0.6:
                    nb = [mean[rr, cc] for rr, cc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)) if 0 <= rr < 7 and 0 <= cc < 8]
                    if nb and np.median(nb) > 70 and i - last_hole > 30:
                        flags.append((i, "hole", f"black tile row {r} col {c} (neighbours ~{np.median(nb):.0f})"))
                        last_hole = i
    for a, b in runs(bright < DARK, int(0.5 * fps)):
        flags.append((a, "dark", f"dark for {(b - a) / fps:.1f}s (frames {a}-{b})"))
    for a, b in runs(diff < 0.6, int(1.5 * fps)):
        if a > 0:
            flags.append((a, "stuck", f"no motion for {(b - a) / fps:.1f}s (frames {a}-{b})"))
    flags.sort()
    return flags, diff, bright


def frame_png(path, idx, fps, dst, full=True):
    ss = max(0.0, idx / fps - 1.0)                              # seek near, then select exactly
    vf = f"select=eq(n\\,{idx - round(ss * fps)})" + ("" if full else f",crop={FULL_W}:{GAME_H}:0:{TOP},scale=270:-1")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{ss:.4f}", "-i", str(path), "-vf", vf, "-vsync", "0", "-frames:v", "1", str(dst)], check=True)


def sheets(path, n, fps, out, step=6, cols=5, rows=4):
    """Every `step`-th frame of the whole Short (game area + caption), labelled, cols x rows per sheet."""
    tw, th = 270, 329                                           # caption + game area (y 150..1466) at 1/4
    cmd = ["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"select=not(mod(n\\,{step})),crop={FULL_W}:{TOP + GAME_H - 150}:0:150,scale={tw}:{th}",
           "-vsync", "0", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    imgs = np.frombuffer(raw, dtype=np.uint8).reshape(-1, th, tw, 3)
    per = cols * rows
    paths = []
    for s in range(0, len(imgs), per):
        sheet = Image.new("RGB", (cols * tw, rows * (th + 26)), (20, 20, 20))
        d = ImageDraw.Draw(sheet)
        for k, im in enumerate(imgs[s:s + per]):
            fi = (s + k) * step
            x, y = (k % cols) * tw, (k // cols) * (th + 26)
            sheet.paste(Image.fromarray(im), (x, y + 26))
            d.text((x + 4, y + 1), f"f{fi}  {fi / fps:.2f}s", fill=(255, 230, 0), font=FONT)
        p = out / f"sheet_{s // per:02d}.jpg"
        sheet.save(p, quality=88)
        paths.append(p)
    return paths


def flag_images(path, flags, fps, out, limit=40):
    made = []
    for i, kind, _ in flags[:limit]:
        trip = []
        for k, j in enumerate((max(0, i - 1), i, i + 1)):
            p = out / f"_t{k}.png"
            frame_png(path, j, fps, p, full=False)
            trip.append(Image.open(p).convert("RGB"))
        w, h = trip[0].size
        im = Image.new("RGB", (3 * w, h + 26), (20, 20, 20))
        d = ImageDraw.Draw(im)
        for k, t in enumerate(trip):
            im.paste(t, (k * w, 26))
            d.text((k * w + 4, 1), f"f{i - 1 + k}", fill=(255, 230, 0), font=FONT)
        p = out / f"flag_{i:05d}_{kind}.jpg"
        im.save(p, quality=90)
        made.append(p)
    for p in out.glob("_t*.png"):
        p.unlink()
    return made


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("videos", nargs="+")
    ap.add_argument("--out", default="work/qa_frames")
    ap.add_argument("--no-sheets", action="store_true")
    a = ap.parse_args()
    for v in a.videos:
        v = pathlib.Path(v)
        if v.suffix != ".mp4":
            continue
        name = v.parent.name if v.stem.startswith("short") else v.stem
        out = pathlib.Path(a.out) / name
        out.mkdir(parents=True, exist_ok=True)
        for old in list(out.glob("sheet_*.jpg")) + list(out.glob("flag_*.jpg")):
            old.unlink()
        fps, dur = probe(v)
        f = gray_frames(v)
        flags, diff, bright = analyse(f, fps)
        sh = [] if a.no_sheets else sheets(v, len(f), fps, out)
        fl = flag_images(v, flags, fps, out)
        counts = {}
        for _, k, _ in flags:
            counts[k] = counts.get(k, 0) + 1
        rep = {"file": str(v), "frames": len(f), "fps": fps, "seconds": round(dur, 2),
               "mean_brightness": round(float(bright.mean()), 1), "counts": counts,
               "flags": [{"frame": i, "t": round(i / fps, 3), "kind": k, "detail": d} for i, k, d in flags],
               "sheets": [p.name for p in sh], "flag_images": [p.name for p in fl]}
        (out / "report.json").write_text(json.dumps(rep, indent=1))
        lines = [f"{name}: {len(f)} frames, {dur:.2f}s, mean brightness {rep['mean_brightness']}",
                 "flags: " + (", ".join(f"{k} x{c}" for k, c in counts.items()) or "none")]
        lines += [f"  f{x['frame']:5d} {x['t']:6.2f}s  {x['kind']:7s} {x['detail']}" for x in rep["flags"]]
        (out / "report.txt").write_text("\n".join(lines) + "\n")
        print(lines[0] + " | " + lines[1] + f" | {len(sh)} sheets -> {out}")


if __name__ == "__main__":
    main()
