"""Check a story's voice takes without listening: Whisper transcribes every line's wav and prints it beside its
median pitch, so a bad split (a word in the wrong line), a missing word, a direction read aloud or two voices too
alike shows up at once. The full check, with the speaker of every line, is scripts/speaker_check.py (`./hb voice
<stunt> --check`); this is the quick transcript view. Whisper is align.py's (openai/whisper-base.en via transformers,
already in the TTS venv: nothing else to install).

    ~/.hb-tts/bin/python scripts/voice_check.py stories/<name>            # transcript + pitch per line
    ~/.hb-tts/bin/python scripts/voice_check.py stories/<name> --words    # voice/words.json for the caption times
    ~/.hb-tts/bin/python scripts/voice_check.py stories/<name> --resplit  # re-cut the takes at Whisper's word gaps
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import align           # noqa: E402
import speaker_check   # noqa: E402


def main(sd):
    d = json.load(open(f"{sd}/story.json"))
    for ln in d['lines']:
        p = f"{sd}/voice/{ln['id']}.wav"
        t = " ".join(w for w, _, _ in align.words(p))
        hz = speaker_check.f0(speaker_check.trim(speaker_check.load(p)))
        print(f"{ln['id']} {ln.get('who', 'N'):5s} {round(hz):4d} Hz | {t}\n{'':16s}  script: {ln['text'].replace(' / ', ' ')}")


def words(sd):
    """Write stories/<name>/voice/words.json: Whisper's word timestamps per line ({id: [[word, start, end], ...]})."""
    d = json.load(open(f"{sd}/story.json"))
    out = {ln['id']: [[w, round(a, 3), round(b, 3)] for w, a, b in align.words(f"{sd}/voice/{ln['id']}.wav")] for ln in d['lines']}
    open(f"{sd}/voice/words.json", 'w').write(json.dumps(out, indent=0))
    print(f"{sd}/voice/words.json: {sum(len(v) for v in out.values())} words")


def resplit(sd):
    """Re-cut every request's cached take (voice/<req>_take.f32) into its lines by Whisper's word timestamps: words are
    matched to the script in order (by count, with a fuzzy check), and each cut falls in the gap between a line's last
    word and the next line's first. Fixes splits that the pause-based cut got wrong."""
    import re
    import subprocess
    SR = 24000
    d = json.load(open(f"{sd}/story.json"))
    reqs = json.load(open(f"{sd}/voices.json"))
    m = whisper.load_model('base.en')
    norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
    for r in reqs:
        x = np.fromfile(f"{sd}/voice/{r['id']}_take.f32", np.float32)
        x16 = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-ar", "16000", "-f", "f32le", "-"], input=x.tobytes(), capture_output=True).stdout
        res = m.transcribe(np.frombuffer(x16, np.float32).copy(), language='en', fp16=False, word_timestamps=True)
        words = [(norm(w['word']), w['start'], w['end']) for s in res['segments'] for w in s['words'] if norm(w['word'])]
        # align each line by its own words: its first two words' first match after the previous line, and its last
        # word's last match before the next line starts. Words that match no line (a direction read aloud before the
        # lines, a line dropped from the script but still in a cached take) are left out
        def toks(t):
            out = []
            for w in re.split(r"[\s-]+", t):
                n = norm(w)
                if n:
                    out.append({"thirtyseven": "37", "twelve": "12", "porkchops": "pork"}.get(n, n))
            return out
        same = lambda a, b: a == b or (len(a) > 2 and len(b) > 2 and (a.startswith(b[:3]) or b.startswith(a[:3])))
        W = [w[0] for w in words]
        spans, ptr = [], 0
        for _, _, t in r['lines']:
            tk = toks(t)
            st = next((i for i in range(ptr, len(W)) if same(W[i], tk[0]) and (len(tk) < 2 or (i + 1 < len(W) and same(W[i + 1], tk[1])))), None)
            if st is None:
                st = next((i for i in range(ptr, len(W)) if same(W[i], tk[0])), ptr)
            spans.append([st, None]); ptr = st + 1
        for k, (_, _, t) in enumerate(r['lines']):
            tk, st = toks(t), spans[k][0]
            lim = spans[k + 1][0] if k + 1 < len(spans) else len(W)
            cand = [i for i in range(st, lim) if same(W[i], tk[-1])]
            en = min(cand, key=lambda i: abs(i - (st + len(tk) - 1))) if cand else min(lim, st + len(tk)) - 1   # the match nearest the line's length
            spans[k][1] = en
        segs = [(max(words[a - 1][2] + 0.02 if a else 0.0, words[a][1] - 0.08), min(words[b + 1][1] - 0.02 if b + 1 < len(words) else 1e9, words[b][2] + 0.12)) for a, b in spans]
        for (who, lid, t), (a, b) in zip(r['lines'], segs):
            seg = x[int(a * SR):int(b * SR)]
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", f"{sd}/voice/{lid}.wav"], input=seg.astype(np.float32).tobytes(), check=True)
        print(f"{r['id']}: {len(r['lines'])} lines at {[(round(a, 2), round(b, 2)) for a, b in segs]}")
        continue
        cuts = [0.0] + bounds + [len(x) / SR]
        for (who, lid, t), a, b in zip(r['lines'], cuts, cuts[1:]):
            seg = x[int(a * SR):int(b * SR)]
            nz = np.nonzero(np.abs(seg) > 0.01)[0]
            if len(nz):
                seg = seg[max(0, nz[0] - 1200):nz[-1] + 2400]
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", f"{sd}/voice/{lid}.wav"], input=seg.astype(np.float32).tobytes(), check=True)
        print(f"{r['id']}: {len(r['lines'])} lines cut at {[round(c, 2) for c in bounds]}")


if __name__ == "__main__":
    (resplit if "--resplit" in sys.argv else words if "--words" in sys.argv else main)(sys.argv[1])
