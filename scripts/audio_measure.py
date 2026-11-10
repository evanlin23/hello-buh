"""Measure a Short's (or any file's) audio the way the audio standard is written (docs/audio.md).

  python3 scripts/audio_measure.py out/x.mp4 [more files...]        # one row per file
  python3 scripts/audio_measure.py --story story_runaway            # the package on hb-videos, with voice-to-bed

Columns: integrated loudness (LUFS), loudness range (LU), true peak (dBTP), the momentary loudness (400 ms)
at the 10th / 50th / 95th percentile, the share of time quieter than -50 LUFS momentary ("dead air": the
pacing gate's silences between lines) and under -70 (digital silence), and the share of the energy in the
speech-presence band 1-4 kHz. With --story, the voice-to-bed ratio: the narration's loudness while a line is
spoken vs the rest of the mix (the package's short.mp4 minus short_nosong.mp4 is the bed).
"""
import json
import pathlib
import re
import subprocess
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent


def ebur(path, ss=None, dur=None):
    cmd = ["ffmpeg", "-nostats", "-v", "verbose"] + (["-ss", f"{ss:.3f}"] if ss else []) + (["-t", f"{dur:.3f}"] if dur else []) + \
          ["-i", str(path), "-map", "0:a", "-af", "ebur128=peak=true:framelog=verbose", "-f", "null", "-"]
    err = subprocess.run(cmd, capture_output=True, text=True).stderr
    m = [float(x) for x in re.findall(r"\sM:\s*(-?[\d.]+|-inf)", err.replace("-inf", "-120"))]
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", err)
    lra = re.findall(r"LRA:\s+(-?[\d.]+) LU", err)
    tp = re.findall(r"Peak:\s+(-?[\d.]+|-inf) dBFS", err)
    return {"I": float(i[-1]) if i else -70.0, "LRA": float(lra[-1]) if lra else 0.0,
            "TP": float(tp[-1]) if tp and tp[-1] != "-inf" else -120.0, "M": np.array(m[::1] or [-120.0])}


def pcm(path, sr=16000):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32)


def presence_share(path):
    x = pcm(path)
    if len(x) < 2048:
        return 0.0
    n = 2048
    frames = x[: len(x) // n * n].reshape(-1, n) * np.hanning(n)
    spec = (np.abs(np.fft.rfft(frames, axis=1)) ** 2).sum(0)
    f = np.fft.rfftfreq(n, 1 / 16000)
    return float(spec[(f >= 1000) & (f <= 4000)].sum() / max(spec[f >= 60].sum(), 1e-12))


def summary(path):
    e = ebur(path)
    m = e["M"][4:] if len(e["M"]) > 8 else e["M"]   # the meter's first 400 ms is still filling
    return {"file": str(path), "I": round(e["I"], 1), "LRA": round(e["LRA"], 1), "TP": round(e["TP"], 1),
            "M10": round(float(np.percentile(m, 10)), 1), "M50": round(float(np.percentile(m, 50)), 1), "M95": round(float(np.percentile(m, 95)), 1),
            "dead_air": round(float((m < -50).mean()), 3), "digital_silence": round(float((m < -70).mean()), 3),
            "presence_1_4k": round(presence_share(path), 3)}


def story_ratio(name):
    """Voice-to-bed for a published story: the voice+game file vs the bed (short.mp4 - short_nosong.mp4)."""
    d = ROOT.parent / "hb-videos" / "shorts" / name
    a, b = pcm(d / "short.mp4", 48000), pcm(d / "short_nosong.mp4", 48000)
    n = min(len(a), len(b))
    # short.mp4 re-mastered the nosong mix: find the gain that best explains it before subtracting
    g = float(np.dot(a[:n], b[:n]) / max(np.dot(b[:n], b[:n]), 1e-12))
    bed = a[:n] - g * b[:n]
    win = 4800   # 100 ms
    rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x[: len(x) // win * win].reshape(-1, win) ** 2, axis=1)) + 1e-9)
    rv, rb = rms(g * b[:n]), rms(bed)
    talk = rv > np.percentile(rv, 60)
    return {"voice_db": round(float(np.median(rv[talk])), 1), "bed_db_under_voice": round(float(np.median(rb[talk])), 1),
            "voice_to_bed_db": round(float(np.median(rv[talk] - rb[talk])), 1), "bed_in_gaps_db": round(float(np.median(rb[~talk])), 1)}


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="*")
    ap.add_argument("--story", action="append", default=[])
    a = ap.parse_args()
    for f in a.files:
        print(json.dumps(summary(f)))
    for s in a.story:
        d = ROOT.parent / "hb-videos" / "shorts" / s
        print(json.dumps({"story": s, **summary(d / "short.mp4"), **story_ratio(s)}))
