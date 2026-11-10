#!/usr/bin/env python3
"""Find voice takes cut off at either end (owner, 2026-11-10: "the voices seem to be edited in a way that cuts stuff
off"). A clean line starts and ends in near-silence: the first and last 20 ms sit well below the take's peak.
A cut lands inside a word or breath: those 20 ms are loud. (Splices inside a line can't be found by level alone:
natural speech jumps as much; the listening check in voice_check.py covers those.)

    python3 scripts/voice_edges.py stories/<name>            # every voice/L*.wav; exit 1 if any is cut
Thresholds: an edge within 30 dB of the peak is CUT, within 40 dB a warning (Kokoro takes sit at -80, clean Gemini
splits at -50 or lower). Fix: re-cut with padding (>= 80 ms before the first word, >= 200 ms after the last), cut at
the quietest point between words (not at Whisper's word start), and a 10-20 ms fade at each edge.
"""
import glob
import os
import subprocess
import sys

import numpy as np


def load(f):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def main(sd):
    bad = 0
    for f in sorted(glob.glob(os.path.join(sd, "voice", "L*.wav"))):
        x = load(f)
        if len(x) < 1600:
            continue
        fr = 160
        db = 20 * np.log10(np.sqrt(np.mean(x[: len(x) // fr * fr].reshape(-1, fr) ** 2, axis=1)) + 1e-9)
        pk = db.max()
        head, tail = db[:2].max() - pk, db[-2:].max() - pk
        msg = []
        for name, v in (("start", head), ("end", tail)):
            if v > -30:
                msg.append(f"CUT at the {name} ({v:.0f} dB from peak)")
            elif v > -40:
                msg.append(f"tight {name} ({v:.0f} dB)")
        cut = any(m.startswith("CUT") for m in msg)
        bad += cut
        print(f"{'CUT ' if cut else 'ok  '}{os.path.basename(f)} {len(x)/16000:.2f}s " + ("; ".join(msg) if msg else ""))
    print(f"{bad} cut take(s)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
