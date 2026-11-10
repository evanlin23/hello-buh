"""score_files.py <ref.wav> <audio>... : cosine similarity of each file to the reference embedding, untouched and
resampled faster (x1.1-1.5: pitch, formants and tempo all up). For voices we can only hear as public preview samples
(Gemini's prebuilt voices via Google's Chirp 3 HD samples of the same names) or as earlier takes."""
import pathlib
import sys

import numpy as np

import vm
from search import resample

RATES = [1.0, 1.1, 1.2, 1.3, 1.35, 1.4, 1.45, 1.5]
ref = vm.embed(vm.load(sys.argv[1]))
rows = []
for p in sys.argv[2:]:
    y = vm.load(p)
    sc = {r: float(np.dot(vm.embed(resample(y, r)), ref)) for r in RATES}
    r, s = max(sc.items(), key=lambda kv: kv[1])
    rows.append((s, pathlib.Path(p).stem, sc[1.0], r, float(np.median(vm.f0_track(y)))))
for s, n, raw, r, f in sorted(rows, reverse=True):
    print(f"{n:16s} raw {raw:.3f}  best x{r} {s:.3f}  f0 {f:.0f}")
