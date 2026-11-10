"""kok.py <voice> <speed> <out.wav> : Kokoro-82M, one call per paragraph, 0.2 s between; prints native word timings count."""
import sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline

voice, speed, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
text = open(sys.argv[4] if len(sys.argv) > 4 else "scripts/voice_search/text.txt").read().strip().split("\n\n")
pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
parts, nts = [], 0
for t in text:
    for r in pipe(t, voice=voice, speed=speed):
        parts.append(r.audio.numpy())
        nts += sum(1 for tk in (r.tokens or []) if tk.start_ts is not None)
    parts.append(np.zeros(int(0.2 * 24000), np.float32))
y = np.concatenate(parts[:-1])
sf.write(out, y, 24000)
print(out, f"{len(y)/24000:.1f}s", "native word timings:", nts)
