"""sample.py <out.wav> <weights json> <speed> <rate> [gap_s] : a Kokoro blend reading scripts/voice_search/text.txt (one call per sentence,
`gap_s` of silence between, default 0.08 s before the resample), then resampled by `rate` (1.0 = untouched; >1 raises pitch, formants and
tempo together, like playing the file faster), loudness-matched to -16 LUFS. Prints the native word-timing count.

    ~/.hb-tts/bin/python scripts/voice_match/sample.py out/voice_match/x.wav '{"am_onyx":0.6,"am_puck":0.4}' 1.0 1.4
"""
import json
import pathlib
import subprocess
import sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline

HERE = pathlib.Path(__file__).parent
out, w, speed, rate = sys.argv[1], json.loads(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
gap = float(sys.argv[5]) if len(sys.argv) > 5 else 0.08
import re  # noqa: E402
# one generation per SENTENCE, joined with `gap` (the reference has no pauses: gaps of ~0.08 s, at most ~0.15 s)
text = [t for para in (HERE.parent / "voice_search" / "text.txt").read_text().strip().split("\n\n") for t in re.split(r"(?<=[.!?])\s+", para)]
pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
pack = sum(float(x) * pipe.load_single_voice(v) for v, x in w.items())


def trim(a, db=-40):
    """Cut the quiet head and tail of a generation (keeps 20 ms each side)."""
    loud = np.nonzero(np.abs(a) > np.abs(a).max() * 10 ** (db / 20))[0]
    return a[max(0, loud[0] - 480):loud[-1] + 480] if len(loud) else a


parts, nts = [], 0
for t in text:
    for r in pipe(t, voice=pack, speed=speed):
        parts.append(trim(r.audio.numpy()))
        nts += sum(1 for tk in (r.tokens or []) if tk.start_ts is not None)
    parts.append(np.zeros(int(gap * 24000), np.float32))
y = np.concatenate(parts[:-1])
tmp = out + ".raw.wav"
sf.write(tmp, y, 24000)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", (f"asetrate={24000 * rate:.0f},aresample=24000," if rate != 1.0 else "") + "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "24000", out],
               check=True)
pathlib.Path(tmp).unlink()
print(out, f"{len(y)/24000/rate:.1f}s", "native word timings:", nts)
