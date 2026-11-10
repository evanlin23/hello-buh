"""Voice-match meter (docs/voice_search.md "Closest match"): the numbers we compare a candidate voice to the reference on.

    ~/.hb-tts/bin/python scripts/voice_match/vm.py <audio>...            # one line per file
    ~/.hb-tts/bin/python scripts/voice_match/vm.py --ref REF <audio>...  # plus cosine similarity to REF's embedding

The reference audio is only ever MEASURED here: nothing in this folder feeds it to a TTS model as a prompt or a
reference clip, and it is never committed.

Measures, on the speech only (frames within 30 dB of the peak):
  emb     Resemblyzer GE2E speaker embedding (scripts/speaker_check.py's encoder), compared by cosine similarity
  f0      median pitch (Hz) and its 10th-90th percentile spread in semitones (autocorrelation, as voice_search/measure.py)
  tilt    the long-term spectrum's slope 150-5000 Hz in dB/octave (steeper negative = darker, bassier)
  nasal   energy 0.8-1.5 kHz relative to 0.1-5 kHz, in dB (the band a "nasally" voice pushes up)
  F1-F3   median formants from LPC on voiced frames (Hz)
  rate    words/s while speaking (Whisper base.en) and pause lengths (gaps >= 150 ms)
"""
import importlib.util
import pathlib
import subprocess
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
SR = 16000
_spec = importlib.util.spec_from_file_location("speaker_check", ROOT / "scripts" / "speaker_check.py")
SC = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(SC)


def load(p, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def frames_db(y, hop=160):
    m = len(y) // hop
    return 20 * np.log10(np.sqrt(np.mean(y[:m * hop].reshape(m, hop) ** 2, 1)) + 1e-9)


def speech_mask(y):
    db = frames_db(y)
    return db > db.max() - 30


def f0_track(y):
    n, w = 160, 640
    lo, hi = SR // 400, SR // 60
    gate = np.sqrt(np.mean(y ** 2)) * 0.5
    out = []
    for i in range(0, len(y) - w, n):
        x = y[i:i + w] - y[i:i + w].mean()
        if np.sqrt(np.mean(x ** 2)) < gate:
            continue
        ac = np.correlate(x, x, "full")[w - 1:]
        ac /= ac[0] + 1e-9
        k = lo + np.argmax(ac[lo:hi])
        if ac[k] > 0.5:
            out.append(SR / k)
    return np.array(out)


def spectrum(y):
    """Mean power spectrum (n_fft 1024) over speech frames."""
    n = 1024
    win = np.hanning(n)
    keep = speech_mask(y)
    ps = []
    for i in range(0, len(y) - n, 256):
        if keep[min(len(keep) - 1, (i + n // 2) // 160)]:
            ps.append(np.abs(np.fft.rfft(y[i:i + n] * win)) ** 2)
    return np.fft.rfftfreq(n, 1 / SR), np.mean(ps, 0)


def tilt_nasal(y):
    f, p = spectrum(y)
    # 1/3-octave bands so the slope isn't dominated by the many high bins
    edges = 150 * 2 ** (np.arange(0, 16) / 3)
    c, lv = [], []
    for a, b in zip(edges[:-1], edges[1:]):
        s = (f >= a) & (f < b)
        if s.any() and b <= 5000 * 1.01:
            c.append(np.log2(np.sqrt(a * b)))
            lv.append(10 * np.log10(p[s].mean() + 1e-20))
    slope = np.polyfit(c, lv, 1)[0]
    tot = p[(f >= 100) & (f <= 5000)].sum()
    nas = 10 * np.log10(p[(f >= 800) & (f <= 1500)].sum() / tot)
    low = 10 * np.log10(p[(f >= 100) & (f < 500)].sum() / tot)
    return float(slope), float(nas), float(low)


def formants(y):
    """Median F1-F3 (Hz): LPC order 12 at 10 kHz on loud voiced 25 ms frames."""
    sr = 10000
    x = np.interp(np.arange(0, len(y) / SR, 1 / sr), np.arange(len(y)) / SR, y)
    x = np.append(x[0], x[1:] - 0.63 * x[:-1])   # pre-emphasis
    n, hop = 250, 100
    win = np.hamming(n)
    rms = np.array([np.sqrt(np.mean(x[i:i + n] ** 2)) for i in range(0, len(x) - n, hop)])
    gate = np.percentile(rms, 60)
    res = []
    for j, i in enumerate(range(0, len(x) - n, hop)):
        if rms[j] < gate:
            continue
        fr = x[i:i + n] * win
        r = np.correlate(fr, fr, "full")[n - 1:n + 13]
        if r[0] <= 0:
            continue
        # Levinson-Durbin
        a = np.zeros(13)
        a[0], e = 1.0, r[0]
        for k in range(1, 13):
            acc = r[k] + np.dot(a[1:k], r[k - 1:0:-1])
            kk = -acc / e
            a[1:k + 1] = a[1:k + 1] + kk * a[k - 1::-1][:k]
            e *= 1 - kk * kk
        roots = [z for z in np.roots(a) if z.imag > 0]
        fs = sorted((np.angle(z) * sr / (2 * np.pi), -np.log(abs(z)) * sr / np.pi) for z in roots)
        fs = [fq for fq, bw in fs if 200 < fq < 4000 and bw < 400]
        if len(fs) >= 3:
            res.append(fs[:3])
    return np.median(np.array(res), 0) if res else np.zeros(3)


def pauses(y):
    m = speech_mask(y)
    sp = np.nonzero(m)[0]
    inner = ~m[sp[0]:sp[-1]]
    runs, c = [], 0
    for v in inner:
        if v:
            c += 1
        else:
            if c >= 15:
                runs.append(c / 100)
            c = 0
    speak = (~inner).sum() / 100
    return runs, speak, (sp[-1] - sp[0]) / 100


_ASR = None


def transcript(y):
    global _ASR
    if _ASR is None:
        from transformers import pipeline
        _ASR = pipeline("automatic-speech-recognition", model="openai/whisper-base.en", device="cpu")
    return _ASR({"raw": y.copy(), "sampling_rate": SR}, chunk_length_s=30)["text"].strip()


def embed(y):
    return SC.embed(SC.trim(y))


def measure(y, words=True):
    f = f0_track(y)
    st = 12 * np.log2(f / np.median(f))
    tl, nas, low = tilt_nasal(y)
    runs, speak, span = pauses(y)
    d = {"f0": float(np.median(f)), "f0_range": float(np.percentile(st, 90) - np.percentile(st, 10)),
         "tilt": tl, "nasal": nas, "low": low, "formants": [float(v) for v in formants(y)],
         "pause_med": float(np.median(runs)) if runs else 0.0, "pause_max": float(max(runs)) if runs else 0.0,
         "pauses_per_10s": 10 * len(runs) / max(span, 1e-3), "speak_s": speak, "emb": embed(y)}
    if words:
        t = transcript(y)
        d["text"], d["words"] = t, len(t.split())
        d["wps_speaking"], d["wps_overall"] = d["words"] / speak, d["words"] / span
    return d


def line(name, d, ref=None):
    s = f"{name}: f0 {d['f0']:.0f} Hz (p10-90 {d['f0_range']:.1f} st)  tilt {d['tilt']:.1f} dB/oct  nasal {d['nasal']:.1f} dB  " \
        f"low {d['low']:.1f} dB  F1-3 {'/'.join(f'{v:.0f}' for v in d['formants'])}  " \
        f"pauses med {d['pause_med']:.2f} max {d['pause_max']:.2f} ({d['pauses_per_10s']:.1f}/10s)"
    if "words" in d:
        s += f"  {d['words']} w, {d['wps_speaking']:.2f} w/s speaking, {d['wps_overall']:.2f} overall"
    if ref is not None:
        s += f"  cos {float(np.dot(d['emb'], ref)):.3f}"
    return s


if __name__ == "__main__":
    a = sys.argv[1:]
    ref = None
    if a and a[0] == "--ref":
        ref = embed(load(a[1]))
        a = a[2:]
    for p in a:
        print(line(pathlib.Path(p).name, measure(load(p)), ref))
