"""The story narrator: Kokoro-82M (Apache 2.0) reads each line of stories/<name>/story.json, then the line is
played 1.45x faster (pitch goes up with it) for the rushed, bright storyteller these Shorts use. Adapted from
evanlin23/blocky-stories blocky/voice.py (same owner).

Runs in the TTS venv, not the system Python:

    python3.11 -m venv ~/.hb-tts
    ~/.hb-tts/bin/pip install --extra-index-url https://download.pytorch.org/whl/cpu torch kokoro soundfile numpy
    apt-get install -y espeak-ng                     # Kokoro's fallback phonemizer
    ~/.hb-tts/bin/python scripts/voice.py stories/<name> [--only L03,L07]

A line's "text" is its captions: chunks split by " / ", key words in CAPS (drawn in the story's key colour).
The spoken text is the same words with the CAPS lowered, so Kokoro never spells them out as letters.

Writes stories/<name>/voice/<id>.wav (24 kHz mono, already sped up) and stories/<name>/voice/voice.json:
for every line its length (`dur`), the speech onset and end, and each caption chunk's [start, end] in
seconds from the start of that line's wav, from Kokoro's own word timestamps divided by the rate. The stunt
waits each line's `dur` (plus the story's `gap`) and edit.py places the wavs and captions on the `line` marks.
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

import numpy as np

SR = 24000
NARRATOR = {"voice": "am_adam", "tempo": 1.03, "rate": 1.45}


def chunks(line: dict) -> list[tuple[str, str]]:
    """[(display, spoken)] for each caption chunk."""
    out = []
    for c in line["text"].split(" / "):
        words = c.split()
        sp = " ".join(w.lower() if sum(ch.isalpha() for ch in w) > 1 and w.upper() == w and any(ch.isalpha() for ch in w) else w for w in words)
        out.append((c.strip(), sp))
    return out


def spoken(line: dict) -> str:
    s = " ".join(sp for _, sp in chunks(line))
    return s[:1].upper() + s[1:]


def norm(t: str) -> str:
    return re.sub(r"[^a-z0-9]", "", t.lower())


def chunk_times(line: dict, tokens: list[tuple[str, float, float]]) -> list[list[float]]:
    """Each chunk's (start, end), matching the chunk's spoken words to Kokoro's tokens by their letters."""
    out, k = [], 0
    toks = [(norm(t), a, b) for t, a, b in tokens if norm(t)]
    for _, sp in chunks(line):
        want = norm(sp)
        got, start, end = "", None, None
        while k < len(toks) and len(got) < len(want):
            t, a, b = toks[k]
            got += t
            start = a if start is None else start
            end = b
            k += 1
        if got != want:
            raise SystemExit(f"{line['id']}: chunk {sp!r} doesn't match the tokens ({got!r})")
        out.append([start, end])
    return out


def speed_up(x: np.ndarray, rate: float) -> np.ndarray:
    """Play x `rate` times faster at the same sample rate (tempo and pitch both go up), band-limited by FFT."""
    if abs(rate - 1) < 1e-6:
        return x
    n = int(round(len(x) / rate))
    X = np.fft.rfft(x)
    return np.fft.irfft(X[: n // 2 + 1], n) * (n / len(x))


def synth(story_dir: Path, only: list[str] | None = None) -> None:
    import soundfile as sf
    from kokoro import KPipeline

    story = json.loads((story_dir / "story.json").read_text())
    v = dict(NARRATOR, **story.get("voice", {}))
    out = story_dir / "voice"
    out.mkdir(parents=True, exist_ok=True)
    meta = {"voice": v["voice"], "tempo": v["tempo"], "rate": v["rate"], "sr": SR, "gap": story.get("gap", 0.12),
            "model": "hexgrad/Kokoro-82M (Apache 2.0)", "lines": {}}
    if only and (out / "voice.json").exists():
        meta["lines"] = json.loads((out / "voice.json").read_text())["lines"]
    pipe = KPipeline(lang_code="b" if v["voice"][0] == "b" else "a", repo_id="hexgrad/Kokoro-82M")
    for line in story["lines"]:
        if only and line["id"] not in only:
            continue
        text = spoken(line)
        tempo = v["tempo"] * float(line.get("tempo", 1.0))
        t0 = time.time()
        audio, tokens, off = [], [], 0.0
        for res in pipe(text, voice=v["voice"], speed=tempo):
            a = res.audio.numpy()
            for tk in res.tokens or []:
                if tk.start_ts is not None:
                    tokens.append((tk.text, off + tk.start_ts, off + tk.end_ts))
            audio.append(a)
            off += len(a) / SR
        y = speed_up(np.concatenate(audio).astype(np.float64), v["rate"]).astype(np.float32)
        sf.write(out / f"{line['id']}.wav", y, SR)
        ct = [[round(a / v["rate"], 3), round(b / v["rate"], 3)] for a, b in chunk_times(line, tokens)]
        meta["lines"][line["id"]] = {"text": text, "dur": round(len(y) / SR, 3), "onset": ct[0][0], "end": ct[-1][1],
                                     "chunks": ct, "captions": [c for c, _ in chunks(line)]}
        words = len(text.split())
        print(f"{line['id']}: {len(y) / SR:.2f}s ({words / max(1e-3, ct[-1][1] - ct[0][0]) * 60:.0f} wpm) "
              f"in {time.time() - t0:.1f}s  {text}", flush=True)
    meta["total"] = round(sum(l["dur"] + meta["gap"] for l in meta["lines"].values()), 2)
    (out / "voice.json").write_text(json.dumps(meta, indent=1))
    print(f"total {meta['total']}s of narration")


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("story", type=Path)
    ap.add_argument("--only", default=None)
    a = ap.parse_args()
    synth(a.story, a.only.split(",") if a.only else None)
