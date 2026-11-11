"""Casting audition (Buh Stories lead 2026-11-11, r:rc31bfe): stock Gemini voices for a role, two per request
(multi-speaker), each reading the role's lines, cut per speaker and saved as out/audition/<role>_<voice>_<model>.wav.
Run in the TTS venv (Whisper cuts the take):

    ~/.hb-tts/bin/python scripts/brand_voice/audition.py <role> <model> <voice> [<voice>]

Every request goes through tts.request (logged to work/tts/quota.json; 429s handled). The direction is one short
bracketed clause: long brackets get read aloud on 3.8. Stock voices only, never a reference clip."""
import json
import pathlib
import subprocess
import sys

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import tts  # noqa: E402

ROLES = {
    "mom": ("A warm mother around forty, low, calm and steady",
            ["Walk soft, sweetie. The ground's a light sleeper.", "Sweetie, don't move."]),
    "grandma": ("An old grandmother in her seventies, warm, slow and a little dry",
                ["One's plenty, sweetie."]),
}
NAMES = ["Anna", "Beth"]   # speaker labels for the multi-speaker request (not voice names: those would be read as cues)
OUT = pathlib.Path("out/audition")


def main(role, model, *voices):
    direction, lines = ROLES[role]
    sp = dict(zip(NAMES, voices))
    texts = [t for _ in voices for t in lines]
    if len(voices) == 1:
        prompt = f"[{direction}]\n\n" + "\n\n".join(lines)
    else:
        prompt = f"[{direction}]\n\n" + "\n".join(f"{n}: {t}" for n in sp for t in lines)
    x, used = tts.request(prompt, sp, [model])
    OUT.mkdir(parents=True, exist_ok=True)
    raw = OUT / f"{role}_{'+'.join(voices)}_{used}_raw.wav"
    write(raw, x)
    segs = tts.cut(x, texts)
    for i, v in enumerate(voices):
        mine = segs[i * len(lines):(i + 1) * len(lines)]
        gap = np.zeros(int(0.45 * tts.SR), np.float32)
        y = np.concatenate([s for seg in mine for s in (seg, gap)][:-1])
        p = OUT / f"{role}_{v}_{used}.wav"
        write(p, y)
        json.dump({"role": role, "voice": v, "model": used, "prompt": prompt, "speaker": NAMES[i]},
                  open(str(p) + ".json", "w"), indent=1)
        print(p)


def write(p, x):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(tts.SR), "-ac", "1", "-i", "-", str(p)],
                   input=np.asarray(x, np.float32).tobytes(), check=True)


if __name__ == "__main__":
    main(*sys.argv[1:])
