"""Word timings for Gemini-voiced lines (docs/voices.md). Gemini TTS returns audio only, but the captions
(scripts/story_track.py) and the stunt's beats (lib/story.js `S.line(id).at(k)`) need each caption chunk's start and
end. This force-aligns every line's caption words to its wav (scripts/ctc_align.py: wav2vec2-base-960h CTC, ~360 MB
in the HF cache, CPU; docs/voices.md "Caption timing") and rewrites voice/voice.json's `chunks`, `onset` and `end` with
them, and voice/words.json with every caption word's start and end (one entry per caption word, in order), in the
format scripts/voice.py writes for Kokoro, so a Gemini story plugs into the same caption pipeline. Whisper
(openai/whisper-base.en: `words()` below, which tts.py and voice_check.py also use to hear what a take says) is only
the fallback for a take the aligner can't fit.

    ~/.hb-tts/bin/python scripts/align.py stories/<name> [--only L03,L07]     (after scripts/tts.py stories/<name>)

Whisper fallback matching: Whisper mishears names ("Buh" -> "Buzz"), so chunks are matched by position, not by
spelling (each word's place along the line as a fraction of its letters). A transcript far from the script (under
60% of its letters in common) is printed as a warning: listen to that line, it may be the wrong cut.
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


def speech_onset(wav):
    """Seconds to the first 10 ms frame within 30 dB of the take's peak."""
    x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(wav), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                     capture_output=True, check=True).stdout, np.float32)
    fr = SR // 100
    db = 20 * np.log10(np.sqrt(np.mean(x[: len(x) // fr * fr].reshape(-1, fr) ** 2, axis=1)) + 1e-9)
    return float(np.argmax(db > db.max() - 30)) / 100


def norm(t):
    return re.sub(r"[^a-z0-9]", "", t.lower())


ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def spelled(t):
    """A token's letters, numbers spelled out (Whisper hears "thirty-seven" as "37": 2 letters against the script's
    11 shifted every later chunk's place; Good Boy's "to LEAVE" started on "tried")."""
    def say(n):
        if n < 20: return ONES[n]
        if n < 100: return TENS[n // 10] + (ONES[n % 10] if n % 10 else "")
        if n < 1000: return ONES[n // 100] + "hundred" + (say(n % 100) if n % 100 else "")
        return str(n)
    return re.sub(r"\d+", lambda m: say(int(m.group())), norm(t))


def place(tokens):
    """Each token's (start, end) position as a fraction of the joined letters."""
    lens = [max(1, len(spelled(t))) for t in tokens]
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


def wav_id(path):
    """A short fingerprint of a take's audio (voice.json `aligned_wav`): a re-cut take no longer matches it."""
    import hashlib
    return hashlib.sha1(Path(path).read_bytes()).hexdigest()[:12]


def _whisper_line(wav, spoken):
    """The old way, kept as the fallback for a take the aligner can't fit: Whisper's words (the first clamped to the
    speech onset: Whisper stamps it 0.0 when the take starts with lead silence) and chunk times by letter position.
    -> (words [(w, a, b)], chunk times) or (None, None)"""
    heard = words(wav)
    if not heard:
        return None, None
    on = speech_onset(wav)
    w0, a0, b0 = heard[0]
    if a0 < on - 0.03:
        heard[0] = (w0, round(min(on, b0 - 0.05), 3), b0)
    ct = chunk_times(spoken, heard)
    # the first chunk starts with the first word heard, even when the script and Whisper spell it differently
    if ct and heard[0][1] < ct[0][0]:
        ct[0][0] = round(heard[0][1], 3)
    return heard, ct


def main(d, only=None):
    """Every line's word and chunk times: forced alignment of its caption words (scripts/ctc_align.py), Whisper only
    when the aligner can't fit the take (owner 2026-11-10: "Some of them are earlier, some of them are after":
    Whisper-base's word starts were 0.1 s early on median and up to 0.3 s off, docs/voices.md "Caption timing")."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import ctc_align
    import voice
    story = json.loads((d / "story.json").read_text())
    vf = d / "voice" / "voice.json"
    meta = json.loads(vf.read_text())
    wf = d / "voice" / "words.json"   # every caption word's time, for one-word captions (story_track._one_word)
    wj = json.loads(wf.read_text()) if wf.exists() else {}
    for ln in story["lines"]:
        lid = ln["id"]
        if lid not in meta["lines"] or (only and lid not in only):
            continue
        wav = d / "voice" / f"{lid}.wav"
        m = meta["lines"][lid]
        disp = m.get("captions") or [c for c, _ in voice.chunks(ln)]
        spoken = [s for _, s in voice.chunks(ln)]
        toks = [t for c in disp for t in c.split()]
        got = ctc_align.align(wav, toks)
        note = ""
        if got is not None:
            wj[lid] = [[w, a, b] for w, a, b in got]
            ct, k = [], 0
            for c in disp:
                n = len(c.split())
                ct.append([got[k][1], max(got[k + n - 1][2], got[k][1] + 0.05)])
                k += n
            how = "ctc:" + ctc_align.MODEL.split("/")[-1]
        else:
            heard, ct = _whisper_line(wav, spoken)
            if not heard:
                print(f"{lid}: neither the aligner nor Whisper heard it: kept the old times")
                continue
            wj[lid] = [[w, round(a, 3), round(b, 3)] for w, a, b in heard]
            said, gotw = norm(" ".join(spoken)), norm(" ".join(w for w, _, _ in heard))
            match = difflib.SequenceMatcher(None, said, gotw).ratio()
            how = "whisper-base.en"
            note = ("   WARNING: the aligner could not fit the script to the take (Whisper fallback, ~0.1-0.3 s off)"
                    + ("" if match > 0.6 else f"; Whisper heard only {match:.0%} of the script: listen, it may be the wrong cut"))
        for i in range(1, len(ct)):   # keep them in order and not overlapping
            ct[i][0] = max(ct[i][0], ct[i - 1][0] + 0.05)
            ct[i][1] = max(ct[i][1], ct[i][0] + 0.05)
        ct = [[round(a, 3), round(b, 3)] for a, b in ct]
        m.update({"chunks": ct, "onset": ct[0][0], "end": ct[-1][1], "aligned": how,
                  "aligned_wav": wav_id(wav)})   # caption_sync blocks when the take changes after this
        print(f"{lid}: {' | '.join(f'{a:.2f}' for a, _ in ct)}  [{how}]{note}")
    vf.write_text(json.dumps(meta, indent=1))
    wf.write_text(json.dumps({ln["id"]: wj[ln["id"]] for ln in story["lines"] if ln["id"] in wj}, indent=0))


if __name__ == "__main__":
    a = sys.argv[1:]
    main(Path(a[0]), a[a.index("--only") + 1].split(",") if "--only" in a else None)
