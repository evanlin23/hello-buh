"""Find a song's drop: the moment the music gets clearly louder and stays loud.

Short-term loudness every 0.25 s; the drop is the time t (within the first 120 s) that
maximizes (mean loudness over the next 6 s) - (mean over the previous 3 s), i.e. the biggest
sustained jump. Prints seconds. Used by edit.py --song_drop_at to land the drop on the Short's
key moment.

  python3 scripts/song_drop.py songs/misery.mp3
"""
import subprocess
import sys

import numpy as np

SR, HOP = 8000, 0.25


def drop_time(path, limit=120.0):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-t", str(limit + 10), "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    n = int(SR * HOP)
    rms = np.array([np.sqrt(np.mean(x[i:i + n] ** 2) + 1e-12) for i in range(0, len(x) - n, n)])
    db = 20 * np.log10(rms)
    best, best_t = -1e9, 0.0
    after, before = int(6 / HOP), int(3 / HOP)
    for i in range(before, min(len(db) - after, int(limit / HOP))):
        score = db[i:i + after].mean() - db[i - before:i].mean()
        if score > best:
            best, best_t = score, i * HOP
    return best_t, best


if __name__ == "__main__":
    t, s = drop_time(sys.argv[1])
    print(f"{t:.2f}")
    print(f"(jump {s:.1f} dB)", file=sys.stderr)
