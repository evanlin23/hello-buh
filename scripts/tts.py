"""Directed voice lines with Gemini TTS (the proxy injects the key). The free tier allows only a few requests a day, so
a whole exchange goes in ONE multi-speaker request and is split at the silences afterwards.

    python3 scripts/tts.py episodes/trailer/voices.json work/trailer/vox     (writes <id>.wav per line, cached)

voices.json: [{"id": "plank", "direction": "...", "speakers": {"Highkeeper": "Algenib", "Ash": "Puck"},
               "lines": [["Highkeeper", "hk1", "How many in your family?"], ["Ash", "ash1", "Four."]]}, ...]
A single-speaker request has one entry in "speakers". Lines come back in order; the split looks for the len(lines) - 1
longest pauses, and when there are more stretches of speech than lines (the model read the direction aloud, which
gemini-3.x TTS does), keeps the last len(lines) of them. Check the printed durations: a take far longer than its text means the model read the direction aloud.
"""
import base64
import json
import pathlib
import subprocess
import sys
import time
import urllib.request

import numpy as np

MODELS = ["gemini-2.5-flash-preview-tts", "gemini-3.1-flash-tts-preview", "gemini-3.8-flash-lite-tts"]   # tried in order on a 429: each has a small free-tier daily quota (gemini-3.8-flash-tts reads long directions aloud)
SR = 24000


def request(text, speakers, models=MODELS):
    if len(speakers) == 1:
        sc = {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": list(speakers.values())[0]}}}
    else:
        sc = {"multiSpeakerVoiceConfig": {"speakerVoiceConfigs": [{"speaker": s, "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": v}}} for s, v in speakers.items()]}}
    body = {"contents": [{"parts": [{"text": text}]}], "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": sc}}
    for attempt in range(4 * len(models)):
        model = models[min(len(models) - 1, attempt // 2)]
        try:
            req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                                         data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": "proxy"})
            r = json.loads(urllib.request.urlopen(req, timeout=240).read())
            part = r["candidates"][0]["content"]["parts"][0]["inlineData"]
            data = base64.b64decode(part["data"])
            if "wav" in part["mimeType"]:
                raw = subprocess.run(["ffmpeg", "-v", "error", "-i", "-", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], input=data, capture_output=True, check=True).stdout
                return np.frombuffer(raw, np.float32)
            return np.frombuffer(data, "<i2").astype(np.float32) / 32768
        except urllib.error.HTTPError as e:
            msg = e.read()[:300].decode(errors="replace")
            if e.code in (429, 500, 502, 503, 504) and attempt < 4 * len(models) - 1:
                print(f"  {model}: {e.code}, retrying"); time.sleep(5 if e.code == 429 else 20); continue
            raise SystemExit(f"TTS {e.code}: {msg}")


def split(x, n):
    """Cut x into n takes at the n - 1 longest pauses (20 ms frames under -40 dB)."""
    f = 480
    m = len(x) // f
    loud = np.abs(x[:m * f]).reshape(m, f).max(1) > 0.01
    runs, k = [], 0
    while k < m:
        if not loud[k]:
            j = k
            while j < m and not loud[j]:
                j += 1
            if k > 0 and j < m:
                runs.append((j - k, k, j))
            k = j
        else:
            k += 1
    cuts = sorted(sorted(runs, reverse=True)[:n - 1], key=lambda r: r[1])
    bounds = [0] + [((a + b) // 2) * f for _, a, b in cuts] + [len(x)]
    out = []
    for a, b in zip(bounds, bounds[1:]):
        seg = x[a:b]
        nz = np.nonzero(np.abs(seg) > 0.01)[0]
        out.append(seg[max(0, nz[0] - 1200):nz[-1] + 2400] if len(nz) else seg)
    return out


def speech_segments(x, gap=0.3, thr=0.02):
    """(start, end) samples of every stretch of speech separated by more than `gap` s of quiet."""
    f = 480; m = len(x) // f
    loud = np.abs(x[:m * f]).reshape(m, f).max(1) > thr
    bridge = int(gap * SR / f)
    out, k = [], 0
    while k < m:
        if loud[k]:
            j = k
            while j < m and (loud[j] or loud[j:j + bridge].any()):
                j += 1
            out.append((max(0, k * f - 1200), min(len(x), j * f + 2400))); k = j
        else:
            k += 1
    return out


def write(path, x):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(path)], input=x.astype(np.float32).tobytes(), check=True)


def main(spec_path, out_dir):
    out = pathlib.Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    for req in json.loads(pathlib.Path(spec_path).read_text()):
        if all((out / f"{lid}.wav").exists() for _, lid, _ in req["lines"]):
            continue
        sp = req["speakers"]
        if len(sp) == 1:
            text = f"{req['direction']}\n" + "\n".join(t for _, _, t in req["lines"])
        else:
            text = f"{req['direction']}\n" + "\n".join(f"{who}: {t}" for who, _, t in req["lines"])
        x = request(text, sp)
        (out / f"{req['id']}_take.f32").write_bytes(x.tobytes())
        takes = split(x, len(req["lines"]))
        # newer TTS models read a "Say ...:" direction aloud before the line: split at every pause and keep the LAST
        # len(lines) segments (the direction comes first)
        segs = speech_segments(x)
        if len(segs) > len(req["lines"]):
            takes = [x[a:b] for a, b in segs[-len(req["lines"]):]]
        for (who, lid, t), seg in zip(req["lines"], takes):
            write(out / f"{lid}.wav", seg)
            print(f"{lid:8s} {len(seg) / SR:5.2f} s  {who}: {t}")


if __name__ == "__main__":
    main(*sys.argv[1:3])
