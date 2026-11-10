"""measure.py <audio>... : duration, median f0 + spread (semitones IQR), words/s while speaking (Whisper), pauses."""
import subprocess
import sys

import numpy as np

SR = 16000


def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def f0(y):
    n, w = 160, 640
    out = []
    lo, hi = SR // 400, SR // 60
    for i in range(0, len(y) - w, n):
        x = y[i:i + w] - y[i:i + w].mean()
        if np.sqrt(np.mean(x ** 2)) < 0.01:
            continue
        ac = np.correlate(x, x, "full")[w - 1:]
        ac /= ac[0] + 1e-9
        k = lo + np.argmax(ac[lo:hi])
        if ac[k] > 0.5:
            out.append(SR / k)
    return np.array(out)


def frames_db(y):
    m = len(y) // 160
    return 20 * np.log10(np.sqrt(np.mean(y[:m * 160].reshape(m, 160) ** 2, 1)) + 1e-9)


_pipe = None


def nwords(y):
    global _pipe
    if _pipe is None:
        from transformers import pipeline
        _pipe = pipeline("automatic-speech-recognition", model="openai/whisper-base.en", device="cpu")
    t = _pipe({"raw": y.copy(), "sampling_rate": SR}, chunk_length_s=30)["text"]
    return len(t.split()), t


for p in sys.argv[1:]:
    y = load(p)
    f = f0(y)
    db = frames_db(y)
    sil = db < db.max() - 30
    speech = np.where(~sil)[0]
    s0, s1 = speech[0], speech[-1]
    inner = sil[s0:s1]
    # pauses >= 150 ms
    runs, c = [], 0
    for v in inner:
        if v:
            c += 1
        else:
            if c >= 15:
                runs.append(c / 100)
            c = 0
    spk = (~inner).sum() / 100
    nw, txt = nwords(y)
    st = 12 * np.log2(f / np.median(f))
    print(f"{p.split('/')[-1]}: dur {len(y)/SR:.1f}s  f0 {np.median(f):.0f} Hz (IQR {np.percentile(st,75)-np.percentile(st,25):.1f} st, "
          f"p10-p90 {np.percentile(st,90)-np.percentile(st,10):.1f} st)  words {nw}  {nw/((s1-s0)/100):.2f} w/s overall, "
          f"{nw/spk:.2f} w/s speaking  pauses>=.15s: n={len(runs)} median {np.median(runs) if runs else 0:.2f} max {max(runs) if runs else 0:.2f}")
    print("   ", txt.strip()[:160])
