"""Word timings for Gemini-voiced lines (docs/voices.md). Gemini TTS returns audio only, but the captions
(scripts/story_track.py) and the stunt's beats (lib/story.js `S.line(id).at(k)`) need each caption chunk's start and
end. This runs Whisper (openai/whisper-base.en, MIT, ~290 MB in the HF cache, CPU) on every line's wav with word
timestamps and rewrites voice/voice.json's `chunks`, `onset` and `end` with them, in the format scripts/voice.py
writes for Kokoro, so a Gemini story plugs into the same caption pipeline.

    ~/.hb-tts/bin/python scripts/align.py stories/<name> [--only L03,L07]     (after scripts/tts.py stories/<name>)

Matching: Whisper mishears names ("Buh" -> "Buzz"), so chunks are matched by position, not by spelling: each word
of the script and of the transcript gets its place along the line as a fraction of the line's letters, and a chunk
starts at the transcript word that sits where the chunk's first letter sits. A transcript far from the script
(under 60% of its letters in common) is printed as a warning: listen to that line, it may be the wrong cut.
"""
import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 16000
_pipe = None


def words(wav):
    """[(word, start, end)] in seconds, from Whisper's word timestamps. wav: a file, or 16 kHz float32 samples."""
    global _pipe
    if _pipe is None:
        from transformers import pipeline
        _pipe = pipeline("automatic-speech-recognition", model="openai/whisper-base.en", device="cpu")
    if isinstance(wav, np.ndarray):   # already 16 kHz mono float32 (tts.py's word cut)
        x = wav.astype(np.float32)
    else:
        x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(wav), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                         capture_output=True, check=True).stdout, np.float32).copy()
    r = _pipe({"raw": x, "sampling_rate": SR}, return_timestamps="word")
    out = []
    for c in r["chunks"]:
        a, b = c["timestamp"]
        out.append((c["text"].strip(), float(a), float(b if b is not None else len(x) / SR)))
    return out


def norm(t):
    return re.sub(r"[^a-z0-9]", "", t.lower())


def place(tokens):
    """Each token's (start, end) position as a fraction of the joined letters."""
    lens = [max(1, len(norm(t))) for t in tokens]
    tot, acc, out = sum(lens), 0, []
    for n in lens:
        out.append((acc / tot, (acc + n) / tot)); acc += n
    return out


def chunk_times(chunks, heard):
    """chunks: the spoken text of each caption chunk; heard: Whisper's words -> [[start, end]] per chunk."""
    script = [w for c in chunks for w in c.split()]
    owner = [i for i, c in enumerate(chunks) for _ in c.split()]
    sp, hp = place(script), place([w for w, _, _ in heard])
    first, last = {}, {}
    for k, (a, b) in enumerate(sp):
        mid = (a + b) / 2
        h = min(range(len(hp)), key=lambda j: abs((hp[j][0] + hp[j][1]) / 2 - mid))
        first.setdefault(owner[k], h); last[owner[k]] = h
    out = []
    for i in range(len(chunks)):
        a = heard[first[i]][1]
        b = max(a + 0.05, heard[last[i]][2])
        out.append([round(a, 3), round(b, 3)])
    for i in range(1, len(out)):   # keep them in order and not overlapping
        out[i][0] = max(out[i][0], out[i - 1][0] + 0.05)
        out[i][1] = max(out[i][1], out[i][0] + 0.05)
    return out


def main(d, only=None):
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import voice
    story = json.loads((d / "story.json").read_text())
    vf = d / "voice" / "voice.json"
    meta = json.loads(vf.read_text())
    for ln in story["lines"]:
        lid = ln["id"]
        if lid not in meta["lines"] or (only and lid not in only):
            continue
        heard = words(d / "voice" / f"{lid}.wav")
        if not heard:
            print(f"{lid}: Whisper heard nothing, kept the even spread"); continue
        spoken = [s for _, s in voice.chunks(ln)]
        ct = chunk_times(spoken, heard)
        said, got = norm(" ".join(spoken)), norm(" ".join(w for w, _, _ in heard))
        match = difflib.SequenceMatcher(None, said, got).ratio()
        m = meta["lines"][lid]
        m.update({"chunks": ct, "onset": ct[0][0], "end": ct[-1][1], "aligned": "whisper-base.en"})
        print(f"{lid}: {' | '.join(f'{a:.2f}' for a, _ in ct)}  heard: {' '.join(w for w, _, _ in heard)}"
              + ("" if match > 0.6 else f"   WARNING: only {match:.0%} like the script"))
    vf.write_text(json.dumps(meta, indent=1))


if __name__ == "__main__":
    a = sys.argv[1:]
    main(Path(a[0]), a[a.index("--only") + 1].split(",") if "--only" in a else None)
