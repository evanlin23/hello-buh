"""Check a story's voice takes without listening: Whisper transcribes every line's wav and prints it beside its
median pitch, so a bad split (a word in the wrong line), a missing word, a direction read aloud or two voices too
alike shows up at once. The full check, with the speaker of every line, is scripts/speaker_check.py (`./hb voice
<stunt> --check`); this is the quick transcript view. Whisper is align.py's (openai/whisper-base.en via transformers,
already in the TTS venv: nothing else to install).

    ~/.hb-tts/bin/python scripts/voice_check.py stories/<name>            # transcript + pitch per line
    ~/.hb-tts/bin/python scripts/voice_check.py stories/<name> --words    # voice/words.json for the caption times
    ~/.hb-tts/bin/python scripts/voice_check.py stories/<name> --resplit  # re-cut cached raw takes (voice/<req>_take.f32) with tts.py's cut
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
    """Re-cut every request's cached raw take (voice/<req>_take.f32, listed in voices.json) into its lines with
    tts.py's cut, the one cutter (docs/voices.md "The cut"): Whisper says roughly where each boundary is, the audio
    says exactly (the quiet point: within 6 dB of the quietest 10 ms, nearest the middle of the window), and each
    edge keeps 80-350 ms before the line's first sound and 200-450 ms after its last, never into the neighbour's
    sound, with 15 ms fades. Writes voice/<id>.wav only: run ./hb voice <stunt> --check (or align.py) after it for
    voice.json and words.json."""
    import subprocess
    import numpy as np
    import tts
    reqs = json.load(open(f"{sd}/voices.json"))
    for r in reqs:
        x = np.fromfile(f"{sd}/voice/{r['id']}_take.f32", np.float32)
        segs = tts.cut(x, [tts.spoken(t) for _, _, t in r['lines']])
        for (who, lid, t), seg in zip(r['lines'], segs):
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(tts.SR), "-ac", "1", "-i", "-", f"{sd}/voice/{lid}.wav"],
                           input=seg.astype(np.float32).tobytes(), check=True)
        print(f"{r['id']}: {len(r['lines'])} lines, {[round(len(g) / tts.SR, 2) for g in segs]} s")


if __name__ == "__main__":
    (resplit if "--resplit" in sys.argv else words if "--words" in sys.argv else main)(sys.argv[1])
