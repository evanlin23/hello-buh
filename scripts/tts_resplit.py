"""Re-cut a story's cached tts.py takes at Whisper's word times (no new requests), when tts.py's pause-based cut put a
word in the wrong line. Runs in the TTS venv (openai-whisper): ~/.hb-tts/bin/python scripts/tts_resplit.py stories/<name>
Each take is transcribed with word timestamps, its words are matched to the script's lines in order (difflib on
normalised words), and each cut goes in the middle of the gap between a line's last word and the next line's first.
Then tts.py writes the wavs and voice.json exactly as it would have."""
import difflib, json, pathlib, re, sys
import numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import tts
import whisper

MODEL = whisper.load_model("base.en")
NUM = {"9,000": "nine thousand", "9000": "nine thousand", "300": "three hundred"}


def norm(t):
    t = t.lower()
    for k, v in NUM.items():
        t = t.replace(k, v)
    return [w for w in re.sub(r"[^a-z' ]", " ", t).split() if w]


orig_take = tts.take
CAP_EARLY, CAP, FIRST = 0.2, 0.3, [0]


def cap(y, mx):
    """Silences inside a line (10 ms frames under -34 dB) shortened to mx seconds (cast.json narrator notes)."""
    f = 240
    m = len(y) // f
    loud = np.abs(y[:m * f]).reshape(m, f).max(1) > 0.02
    out, k = [], 0
    while k < m:
        j = k
        while j < m and loud[j] == loud[k]:
            j += 1
        a, b = k * f, j * f
        if not loud[k] and k > 0 and j < m and (b - a) > mx * tts.SR:
            keep = int(mx * tts.SR) // 2
            out += [y[a:a + keep], y[b - keep:b]]
        else:
            out.append(y[a:b])
        k = j
    out.append(y[m * f:])
    return np.concatenate(out)


def take(scene, lines, cs):
    orig_take(scene, lines, cs)                         # makes sure the raw take is cached (no request if it is)
    text = tts.prompt(scene, lines, cs)
    voices = {cs[w]["name"]: cs[w]["voice"] for w, _, _, _ in lines}
    import hashlib
    raw = tts.CACHE / f"{hashlib.sha1(json.dumps([text, voices]).encode()).hexdigest()[:16]}.wav"
    x = np.frombuffer(tts.pcm(["-i", str(raw), "-f", "f32le", "-"]), np.float32)
    if len(lines) == 1:
        return [x]
    x16 = np.interp(np.arange(0, len(x), tts.SR / 16000), np.arange(len(x)), x).astype(np.float32)
    r = MODEL.transcribe(x16, language="en", fp16=False, word_timestamps=True)
    heard = [(n, w["start"], w["end"]) for s in r["segments"] for w in s["words"] for n in norm(w["word"])]
    script = [(i, n) for i, (_, _, t, _) in enumerate(lines) for n in norm(t)]
    sm = difflib.SequenceMatcher(None, [n for _, n in script], [h[0] for h in heard], autojunk=False)
    owner = {}
    for a, b, size in sm.get_matching_blocks():
        for k in range(size):
            owner[b + k] = script[a + k][0]
    # each line's first and last heard word
    span = {}
    for hi, li in owner.items():
        s0, e0 = heard[hi][1], heard[hi][2]
        if li in span:
            span[li] = (min(span[li][0], s0), max(span[li][1], e0))
        else:
            span[li] = (s0, e0)
    if len(span) != len(lines):
        print(f"  resplit: only {len(span)} of {len(lines)} lines matched; keeping tts.py's cut")
        return orig_take(scene, lines, cs)
    cuts = [0.0]
    for i in range(len(lines) - 1):
        cuts.append((span[i][1] + span[i + 1][0]) / 2)
    cuts.append(len(x) / tts.SR)
    # each line from 0.06 s before its first word to 0.25 s after its last (not the whole gap: the stunt adds the gap)
    segs = [x[max(0, int((span[i][0] - 0.06) * tts.SR)):int(min(cuts[i + 1], span[i][1] + 0.25) * tts.SR)] for i in range(len(lines))]
    segs = [cap(sg, CAP_EARLY if FIRST[0] + i < 2 else CAP) for i, sg in enumerate(segs)]
    FIRST[0] += len(lines)
    for i, (_, lid, t, _) in enumerate(lines):
        print(f"  {lid}: {span[i][0]:.2f}-{span[i][1]:.2f} s")
    return segs


if __name__ == "__main__":
    tts.take = take
    tts.run_story(pathlib.Path(sys.argv[1]), sys.argv[3].split(",") if "--only" in sys.argv else None)
