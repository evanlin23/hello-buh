"""post.py <name> [tempo] : out/brand_voice/<name>_raw.wav -> <name>.mp3, the narrator chain we'd ship:
edges trimmed, every silence capped at 0.12 s (tts.shorten_pauses, the take gate's own silence measure; words never
cut), an optional MILD atempo (pitch kept; never a resample), -16 LUFS. Prints the measurements (docs/brand.md)."""
import json
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import take_gate  # noqa: E402
import tts  # noqa: E402


def f0(y, sr=16000):
    """Autocorrelation pitch track, as scripts/voice_search/measure.py (which runs on import)."""
    n, w, lo, hi, out = 160, 640, sr // 400, sr // 60, []
    for i in range(0, len(y) - w, n):
        x = y[i:i + w] - y[i:i + w].mean()
        if np.sqrt(np.mean(x ** 2)) < 0.01:
            continue
        ac = np.correlate(x, x, "full")[w - 1:]
        ac /= ac[0] + 1e-9
        k = lo + np.argmax(ac[lo:hi])
        if ac[k] > 0.5:
            out.append(sr / k)
    return np.array(out)


OUT, SR, CAP = "out/brand_voice", tts.SR, 0.12
name = sys.argv[1]
tempo = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
words = len(open("scripts/brand_voice/text.txt").read().split())


def load(p, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def stats(y):
    ps = take_gate.pauses(y, SR, min_len=0.08)
    db = take_gate.frame_db(y, SR)
    snd = np.nonzero(db > db.max() - take_gate.SILENT_DB)[0]
    span = (snd[-1] - snd[0] + 1) * take_gate.FR
    speak = span - sum(l for _, l in ps)
    return span, speak, ps


raw = load(f"{OUT}/{name}_raw.wav")
span0, speak0, ps0 = stats(raw)
y = tts.shorten_pauses(raw, CAP)
af = [f"atempo={tempo:g}"] if tempo != 1.0 else []
tmp = f"{OUT}/{name}_tmp.wav"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", tmp],
               input=y.astype(np.float32).tobytes(), check=True)
af += ["silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08",
       "areverse", "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.2", "areverse",
       "loudnorm=I=-16:TP=-1.5:LRA=11"]
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", ",".join(af), "-ar", "24000", "-ac", "1",
                f"{OUT}/{name}.wav"], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{OUT}/{name}.wav", "-b:a", "96k", f"{OUT}/{name}.mp3"], check=True)
os.remove(tmp)
fin = load(f"{OUT}/{name}.wav")
span1, speak1, ps1 = stats(fin)
p = f0(load(f"{OUT}/{name}.wav", 16000))
r = {"name": name, "tempo": tempo, "raw_s": round(len(raw) / SR, 2), "final_s": round(len(fin) / SR, 2),
     "raw_wps_speaking": round(words / speak0, 2), "raw_wps_overall": round(words / span0, 2),
     "raw_pauses_max": round(max([l for _, l in ps0] or [0]), 2), "raw_pauses_over_0.12": sum(l > CAP for _, l in ps0),
     "wps_speaking": round(words / speak1, 2), "wps_overall": round(words / span1, 2),
     "pauses_max": round(max([l for _, l in ps1] or [0]), 2),
     "f0_median": round(float(np.median(p)), 0), "f0_spread_st": round(float(12 * np.log2(np.percentile(p, 90) / np.percentile(p, 10))), 1)}
json.dump(r, open(f"{OUT}/{name}.stats.json", "w"), indent=1)
print(json.dumps(r))
