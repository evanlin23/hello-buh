#!/usr/bin/env python3
"""Captions in sync with the voice (owner, 2026-11-10: "the captions are not lined up correctly"). For every line,
the first caption chunk must start where the wav's speech actually starts, and words.json's first word likewise:
a stale voice.json (a re-cut that moved the speech inside the wav without re-running align.py) shows the caption
early. Also flags a missing words.json (one-word captions then fall back to letter-share timing).

    python3 scripts/caption_sync.py stories/<name>        exit 1 on a BLOCK
Thresholds: |caption start - speech onset| > 0.12 s = BLOCK, > 0.06 s = WARN (a caption may lead the word by a frame
or two, never by a syllable). Fix: python3 scripts/align.py stories/<name> (or voice_check.py --resplit, which now
re-aligns itself).
"""
import json
import os
import subprocess
import sys

import numpy as np


def onset(path):
    x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                                     capture_output=True, check=True).stdout, np.float32)
    fr = 160
    db = 20 * np.log10(np.sqrt(np.mean(x[: len(x) // fr * fr].reshape(-1, fr) ** 2, axis=1)) + 1e-9)
    return float(np.argmax(db > db.max() - 30)) * 0.01


def main(sd):
    v = json.load(open(os.path.join(sd, "voice", "voice.json")))["lines"]
    wp = os.path.join(sd, "voice", "words.json")
    words = json.load(open(wp)) if os.path.exists(wp) else None
    story = json.load(open(os.path.join(sd, "story.json")))
    blocks = warns = 0
    if words is None and story.get("captions", "word") == "word":
        print("WARN  no voice/words.json: one-word captions fall back to letter-share timing (run scripts/align.py)")
        warns += 1
    for ln in story["lines"]:
        lid = ln["id"]
        wav = os.path.join(sd, "voice", f"{lid}.wav")
        if lid not in v or not os.path.exists(wav):
            continue
        on = onset(wav)
        cs = (v[lid].get("chunks") or [[v[lid].get("onset", 0), 0]])[0][0]
        cap = max(cs, v[lid].get("onset", 0) or 0)
        checks = [("caption", cap)]
        if words and words.get(lid):
            checks.append(("first word", float(words[lid][0][1])))
        for what, t in checks:
            d = t - on
            if abs(d) > 0.12:
                print(f"BLOCK {lid}: {what} at {t:.2f} s but the speech starts at {on:.2f} s ({d:+.2f} s): {'early' if d < 0 else 'late'}")
                blocks += 1
            elif abs(d) > 0.06:
                print(f"WARN  {lid}: {what} {d:+.2f} s from the speech onset")
                warns += 1
    print(("FAIL" if blocks else "OK") + f": {blocks} blocker(s), {warns} warning(s) (caption sync)")
    if blocks:
        print("fix: python3 scripts/align.py " + sd + "   (re-aligns voice.json chunks + words.json to the current wavs)")
    return 1 if blocks else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
