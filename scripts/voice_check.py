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
        counts = [len([w for w in re.split(r"\s+", t) if norm(w)]) for _, _, t in r['lines']]
        # numbers: "thirty-seven" is one script word but Whisper writes "37": count script words as Whisper would
        counts = [c - sum(1 for w in re.split(r"\s+", t) if '-' in w and norm(w.replace('-', '')).isalpha() and len(w) > 6 and w.lower().split('-')[0] in ('twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety')) * 0 for c, (_, _, t) in zip(counts, r['lines'])]
        if sum(counts) != len(words):
            print(f"{r['id']}: script {sum(counts)} words, Whisper {len(words)}: scaling the split")
        # the cuts: the len(lines) - 1 longest gaps between words (lines are separated by the longest pauses), kept when
        # every line gets about its word count; else by word count (a model's added laugh shifts counts, not gaps)
        n = len(counts)
        gaps = sorted(range(1, len(words)), key=lambda i: words[i][1] - words[i - 1][2], reverse=True)[:n - 1]
        idx = sorted(gaps)
        got = [b - a for a, b in zip([0] + idx, idx + [len(words)])]
        if len(idx) == n - 1 and all(abs(g - c) <= max(2, c // 2) for g, c in zip(got, counts)):
            bounds = [(words[i - 1][2] + words[i][1]) / 2 for i in idx]
        else:
            scale = len(words) / max(1, sum(counts))
            bounds, acc = [], 0.0
            for c in counts[:-1]:
                acc += c * scale
                i = max(1, min(len(words) - 1, round(acc)))
                bounds.append((words[i - 1][2] + words[i][1]) / 2)
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
