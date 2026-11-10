"""Check a story's voice takes without listening: Whisper transcribes every line's wav and prints it beside its
median pitch, so a bad split (a word in the wrong line), a missing word, a direction read aloud or two voices too
alike shows up at once. Runs in the TTS venv with openai-whisper (~/.hb-tts/bin/pip install openai-whisper; the
base.en model downloads on first use, 139 MB).

    ~/.hb-tts/bin/python scripts/voice_check.py stories/<name>            # transcript + pitch per line
    ~/.hb-tts/bin/python scripts/voice_check.py stories/<name> --words    # voice/words.json for the caption times
    ~/.hb-tts/bin/python scripts/voice_check.py stories/<name> --resplit  # re-cut the takes at Whisper's word gaps
"""
import json
import sys

import numpy as np
import whisper


def f0(x, sr=16000):
    fr = int(0.04 * sr); out = []
    for i in range(0, len(x) - fr, fr):
        s = x[i:i + fr]
        if np.abs(s).max() < 0.05:
            continue
        s = s - s.mean(); c = np.correlate(s, s, 'full')[fr - 1:]
        lo, hi = int(sr / 400), int(sr / 60); k = lo + np.argmax(c[lo:hi])
        if c[k] > 0.3 * c[0]:
            out.append(sr / k)
    return np.median(out) if out else 0


def main(sd):
    d = json.load(open(f"{sd}/story.json"))
    m = whisper.load_model('base.en')
    for ln in d['lines']:
        x = whisper.load_audio(f"{sd}/voice/{ln['id']}.wav")
        t = m.transcribe(x, language='en', fp16=False)['text'].strip()
        print(f"{ln['id']} {ln.get('who', 'N'):5s} {round(f0(x)):4d} Hz | {t}\n{'':16s}  script: {ln['text'].replace(' / ', ' ')}")




def words(sd):
    """Write stories/<name>/voice/words.json: Whisper's word timestamps per line ({id: [[word, start, end], ...]}).
    scripts/voice_cast.py --timing uses them for the caption chunk times (Gemini gives none)."""
    d = json.load(open(f"{sd}/story.json"))
    m = whisper.load_model('base.en')
    out = {}
    for ln in d['lines']:
        r = m.transcribe(f"{sd}/voice/{ln['id']}.wav", language='en', fp16=False, word_timestamps=True)
        out[ln['id']] = [[w['word'].strip(), round(float(w['start']), 3), round(float(w['end']), 3)] for s in r['segments'] for w in s['words']]
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
        # cut at the quietest 10 ms between one line's last word and the next line's first (Whisper's word ends run
        # early on fast speech: a cut at its timestamp clipped "times" in Good Boy's L01)
        def quiet(t0, t1):
            i0, i1 = max(0, int(t0 * SR)), min(len(x), int(t1 * SR))
            if i1 - i0 < 480:
                return (t0 + t1) / 2
            f = 240; m = (i1 - i0) // f
            e = np.abs(x[i0:i0 + m * f]).reshape(m, f).mean(1)
            return (i0 + int(np.argmin(e)) * f + f // 2) / SR
        cutsq = [quiet(words[spans[k][1]][2] - 0.05, words[spans[k + 1][0]][1] + 0.1) for k in range(len(spans) - 1)]
        segs = []
        for k, (a, b) in enumerate(spans):
            s0 = max(cutsq[k - 1], words[a][1] - 0.15) if k else max(0.0, words[a][1] - 0.15)
            s1 = min(cutsq[k], words[b][2] + 0.4) if k + 1 < len(spans) else min(len(x) / SR, words[b][2] + 0.4)   # (never past its own words: a stale line sat between two)
            segs.append((s0, s1))
        for (who, lid, t), (a, b) in zip(r['lines'], segs):
            seg = x[int(a * SR):int(b * SR)].copy()
            fd = min(len(seg) // 4, int(0.012 * SR))   # 12 ms fades: no click where a cut lands inside a word's tail
            if fd:
                seg[:fd] *= np.linspace(0, 1, fd); seg[-fd:] *= np.linspace(1, 0, fd)
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
