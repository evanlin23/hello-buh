"""Check a story's voice takes without listening: Whisper transcribes every line's wav and prints it beside its
median pitch, so a bad split (a word in the wrong line), a missing word, a direction read aloud or two voices too
alike shows up at once. Runs in the TTS venv with openai-whisper (~/.hb-tts/bin/pip install openai-whisper; the
base.en model downloads on first use, 139 MB).

    ~/.hb-tts/bin/python scripts/voice_check.py stories/<name>            # transcript + pitch per line
    ~/.hb-tts/bin/python scripts/voice_check.py stories/<name> --words    # voice/words.json for the caption times
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


if __name__ == "__main__":
    (words if "--words" in sys.argv else main)(sys.argv[1])
