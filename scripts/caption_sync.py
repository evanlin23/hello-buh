#!/usr/bin/env python3
"""Captions in sync with the voice before a render (owner, 2026-11-10: "the captions are not lined up correctly"):
the quick check, no model. The finished Short is measured word by word by scripts/caption_av_check.py.

    python3 scripts/caption_sync.py stories/<name>        exit 1 on a BLOCK

- A take changed after it was aligned (voice.json `aligned_wav`, written by align.py, no longer matches the wav: a
  re-cut moved the speech without re-running align.py): BLOCK.
- Whisper word times (voice.json `aligned` not "ctc:..."; align.py's fallback, or a story aligned before the forced
  aligner): WARN, and the first caption is compared with the wav's speech onset (the first 10 ms frame within 30 dB
  of the take's peak): over 0.12 s off is a BLOCK, over 0.06 s a WARN.
- Forced-aligned lines: the same comparison is only a WARN. The aligner places the words on the audio itself; a gap
  here is usually a breath or a hum before the first word that the energy onset counts as speech (good_boy L07: an
  inhale from 0.09 s, "And" at 0.45 s). Listen to the line if it is large.
- No voice/words.json: WARN (one-word captions fall back to letter-share timing).
Fix: ~/.hb-tts/bin/python scripts/align.py stories/<name> (or voice_check.py --resplit, which re-aligns itself).
"""
import hashlib
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
    whisper = []
    for ln in story["lines"]:
        lid = ln["id"]
        wav = os.path.join(sd, "voice", f"{lid}.wav")
        if lid not in v or not os.path.exists(wav):
            continue
        how = v[lid].get("aligned") or ""
        aw = v[lid].get("aligned_wav")
        if aw and hashlib.sha1(open(wav, "rb").read()).hexdigest()[:12] != aw:
            print(f"BLOCK {lid}: the take changed after it was aligned: its word times are stale")
            blocks += 1
            continue
        forced = how.startswith("ctc")
        if not forced:
            whisper.append(lid)
        on = onset(wav)
        cs = (v[lid].get("chunks") or [[v[lid].get("onset", 0), 0]])[0][0]
        cap = max(cs, v[lid].get("onset", 0) or 0)
        checks = [("caption", cap)]
        if words and words.get(lid):
            checks.append(("first word", float(words[lid][0][1])))
        for what, t in checks:
            d = t - on
            if abs(d) > 0.12 and not forced:
                print(f"BLOCK {lid}: {what} at {t:.2f} s but the speech starts at {on:.2f} s ({d:+.2f} s): {'early' if d < 0 else 'late'}")
                blocks += 1
            elif abs(d) > 0.12 and what == "caption":
                print(f"WARN  {lid}: the aligner starts the first word at {t:.2f} s, the sound starts at {on:.2f} s ({d:+.2f} s): "
                      f"a breath or a hum before the word? listen")
                warns += 1
            elif abs(d) > 0.06 and not forced:
                print(f"WARN  {lid}: {what} {d:+.2f} s from the speech onset")
                warns += 1
    if whisper:   # owner: "Some of them are earlier, some of them are after": Whisper's per-word jitter. Never ship it.
        print(f"BLOCK {', '.join(whisper)}: Whisper word times (0.1-0.3 s off per word), not forced-aligned: install the "
              f"aligner (~/.hb-tts/bin/pip install transformers torch) and re-run scripts/align.py")
        blocks += 1
    print(("FAIL" if blocks else "OK") + f": {blocks} blocker(s), {warns} warning(s) (caption sync)")
    if blocks:
        print("fix: ~/.hb-tts/bin/python scripts/align.py " + sd + "   (re-aligns voice.json chunks + words.json to the current wavs)")
    return 1 if blocks else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
