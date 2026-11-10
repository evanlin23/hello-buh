"""`whisper` for the voice tools, whichever Whisper the TTS venv has (a story session lost time installing torch for
openai-whisper when faster-whisper or transformers was already there).

    from whisper_compat import whisper     # then whisper.load_model / model.transcribe / whisper.load_audio as usual

Tries, in order: openai-whisper (the real module), faster-whisper (CTranslate2, ~250 MB, no torch), transformers
(openai/whisper-base.en, the one scripts/align.py uses). model.transcribe(audio, language=, fp16=, word_timestamps=)
returns openai-whisper's shape: {"text", "segments": [{"text", "start", "end", "words": [{"word", "start", "end"}]}]}.
`python3 scripts/whisper_compat.py` prints the backend it found (./hb doctor uses it).
"""
import importlib.util
import subprocess

import numpy as np

SR = 16000


def load_audio(path, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def _audio(a):
    return load_audio(a) if isinstance(a, (str, bytes)) or hasattr(a, "__fspath__") else np.asarray(a, np.float32)


class _Faster:
    def __init__(self, name):
        from faster_whisper import WhisperModel
        self.m = WhisperModel(name, device="cpu", compute_type="int8")

    def transcribe(self, audio, language="en", fp16=False, word_timestamps=False, **_):
        segs, _info = self.m.transcribe(_audio(audio), language=language, word_timestamps=word_timestamps)
        out = []
        for s in segs:
            w = [{"word": x.word, "start": float(x.start), "end": float(x.end)} for x in (s.words or [])]
            out.append({"text": s.text, "start": float(s.start), "end": float(s.end), "words": w})
        return {"text": "".join(s["text"] for s in out), "segments": out}


class _HF:
    def __init__(self, name):
        from transformers import pipeline
        self.p = pipeline("automatic-speech-recognition", model=f"openai/whisper-{name}", device="cpu")

    def transcribe(self, audio, language="en", fp16=False, word_timestamps=False, **_):
        x = _audio(audio)
        r = self.p({"raw": x, "sampling_rate": SR}, return_timestamps="word")
        w = []
        for c in r.get("chunks", []):
            a, b = c["timestamp"]
            w.append({"word": " " + c["text"].strip(), "start": float(a), "end": float(b if b is not None else len(x) / SR)})
        seg = {"text": r["text"], "start": w[0]["start"] if w else 0.0, "end": w[-1]["end"] if w else len(x) / SR, "words": w}
        return {"text": r["text"], "segments": [seg]}


def backend():
    for m in ("whisper", "faster_whisper", "transformers"):
        if importlib.util.find_spec(m):
            return m
    return None


class _Compat:
    load_audio = staticmethod(load_audio)

    @staticmethod
    def load_model(name="base.en"):
        b = backend()
        if b == "faster_whisper":
            return _Faster(name)
        if b == "transformers":
            return _HF(name)
        raise SystemExit("no Whisper in this venv: ~/.hb-tts/bin/pip install faster-whisper (~250 MB, no torch needed)")


if importlib.util.find_spec("whisper"):
    import whisper  # noqa: F401  (openai-whisper: the real thing)
else:
    whisper = _Compat()

if __name__ == "__main__":
    print(backend() or "none")
