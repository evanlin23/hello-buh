#!/usr/bin/env python3
"""Label a rendered Short with its ./hb check verdict, so no preview reaches the owner with an unflagged known blocker
(2026-11-10: the owner found cast teleports, noticeable cuts, digging through blocks, captions off and silent actions
that our checks would have caught).

    python3 scripts/check_label.py out/<name>.mp4 <check.json>     # the report ./hb check --report wrote

- the check passed: nothing changes (exit 0)
- blockers (or the report missing / incomplete): a red band burned over the top of the picture for the whole Short,
  "CHECK FAILED: <n> blockers" (or "CHECK DID NOT RUN"), and <mp4 without .mp4>.check.txt written beside it.
  One re-encode of the finished Short (x264 veryfast, audio copied): ~20-40 s on a runner, only when there is a blocker.
Exit 0 always unless ffmpeg fails (the label is a flag, not a gate)."""
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

FONTS = ["/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]


def verdict(report):
    """-> (label or None when the check passed, the text report)"""
    p = pathlib.Path(report) if report else None
    if not p or not p.exists():
        return "CHECK DID NOT RUN", "no ./hb check report for this render: run ./hb check before showing it\n"
    j = json.loads(p.read_text())
    txt = p.with_suffix(".txt").read_text() if p.with_suffix(".txt").exists() else json.dumps(j, indent=1)
    if j.get("ok"):
        return None, txt
    return j.get("label") or "CHECK FAILED", txt


def burn(mp4, label):
    font = next((f for f in FONTS if os.path.exists(f)), None)
    with tempfile.TemporaryDirectory() as td:
        tf = pathlib.Path(td) / "label.txt"
        tf.write_text(label)
        dt = (f"drawbox=x=0:y=0:w=iw:h=ih*0.055:color=0xC00000@0.92:t=fill,"
              f"drawtext=textfile='{tf}':{'fontfile=' + repr(font)[1:-1] + ':' if font else ''}"
              f"fontcolor=white:fontsize=h*0.032:x=(w-text_w)/2:y=h*0.0275-text_h/2")
        out = pathlib.Path(td) / "out.mp4"
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp4), "-vf", dt, "-c:v", "libx264", "-preset", "veryfast",
                            "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", str(out)])
        if r.returncode:
            sys.exit(f"check_label: ffmpeg failed ({r.returncode})")
        shutil.move(str(out), str(mp4))


def main(mp4, report=None):
    mp4 = pathlib.Path(mp4)
    label, txt = verdict(report)
    (mp4.parent / (mp4.stem + ".check.txt")).write_text(txt if txt.endswith("\n") else txt + "\n")
    if not label:
        print(f"{mp4.name}: CHECK OK (no label)")
        return 0
    burn(mp4, label)
    print(f"{mp4.name}: labelled \"{label}\" on the picture; the report is {mp4.stem}.check.txt")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
