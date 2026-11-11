"""measure.py <wav>... : median pitch and speaker distance (Resemblyzer GE2E cosine, speaker_check.embed) of each
audition clip to Pip (dog_hill's narrator lines), Light Sleeper's Mom (Sulafat) and Gold's Grandma (Vindemiatrix).
Run in the TTS venv. Prints a JSON list."""
import glob
import json
import pathlib
import sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import speaker_check as S  # noqa: E402


def ref(paths):
    xs = [S.trim(S.load(p)) for p in paths]
    e = np.mean([S.embed(x) for x in xs], 0)
    return e / np.linalg.norm(e), float(np.median([S.f0(x) for x in xs]))


REFS = {"pip": sorted(p for p in glob.glob("stories/dog_hill/voice/L*.wav")
                      if json.load(open("stories/dog_hill/voice/voice.json"))["lines"][pathlib.Path(p).stem]["who"] == "N"),
        "sulafat_mom": ["out/audition/ref/sulafat_L05.wav", "out/audition/ref/sulafat_L15.wav"],
        "vindemiatrix_grandma": ["out/audition/ref/vindemiatrix_gold_L08.wav"]}
R = {k: ref(v) for k, v in REFS.items()}
rows = [{"ref": k, "f0": round(R[k][1])} for k in R]
for f in sys.argv[1:]:
    x = S.trim(S.load(f))
    e = S.embed(x)
    rows.append({"clip": f, "f0": round(S.f0(x)), **{f"sim_{k}": round(float(e @ R[k][0]), 3) for k in R},
                 **{f"st_{k}": round(S.st(S.f0(x), R[k][1]), 1) for k in R}})
print(json.dumps(rows, indent=0))
