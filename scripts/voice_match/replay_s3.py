"""replay_s3.py [raw take] [ref.wav] : put the owner-approved s3 raw take (out/voice_match/raw/gem_orus.wav, the one
Gemini request behind s3_gemini_orus.mp3) through tts.py's real path, offline, and compare the result with s3.

The take is copied into work/tts/ under the cache key tts.py computes for the same prompt (cast `narrator`, the 9
paragraphs of scripts/voice_search/text.txt as 9 lines of one beat: byte for byte the prompt gem.py sent), so
tts.raw_take finds it in the cache; tts.request is replaced with a function that fails, so no request can be made.
Then tts.voice_beat runs as a story would: the speed-up on the whole take, trim, shape, level, Whisper, the take gate.

    ~/.hb-tts/bin/python scripts/voice_match/replay_s3.py out/voice_match/raw/gem_orus.wav [owner_ref.wav]
"""
import json
import pathlib
import shutil
import sys
import tempfile

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(HERE))
import tts  # noqa: E402
import vm  # noqa: E402

raw = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "out/voice_match/raw/gem_orus.wav")
paras = (ROOT / "scripts/voice_search/text.txt").read_text().strip().split("\n\n")
cs = tts.resolve({"N": {"ref": "narrator", "role": "narrator"}})
lines = [("N", f"L{i + 1:02d}", t, "") for i, t in enumerate(paras)]
model = cs["N"]["model"]
p = tts.prompt("", lines, cs, model)
meta = json.loads(pathlib.Path(str(raw) + ".json").read_text()) if pathlib.Path(str(raw) + ".json").exists() else {}
if meta:
    assert meta["prompt"] == p, "the prompt tts.py would send differs from the one that made the take"
    assert meta["voice"] == cs["N"]["voice"] and meta["model"] == model
    print("prompt: byte for byte the request that made s3")


def no_request(*a, **k):
    raise SystemExit("replay_s3: a request was attempted (the cache key did not match)")


tts.request = no_request
cache = tempfile.TemporaryDirectory()
tts.CACHE = pathlib.Path(cache.name)
import hashlib  # noqa: E402
key = hashlib.sha1(json.dumps([p, {cs["N"]["name"]: cs["N"]["voice"]}, model]).encode()).hexdigest()[:16]
tts.pcm(["-y", "-i", str(raw), "-ac", "1", "-ar", str(tts.SR), str(tts.CACHE / f"{key}.wav")])
beat = {"id": "L01", "scene": "", "room": "", "lines": lines}
out = pathlib.Path(tempfile.mkdtemp())
for room in ("", "small"):
    done, m = tts.voice_beat(dict(beat, room=room), cs, out, tries=1, opening=False)
    y = vm.load(out / "beat_L01.wav")
    shutil.copy(out / "beat_L01.wav", ROOT / f"out/voice_match/replay_s3_room-{room or 'dry'}.wav")
    print(f"room {room or 'dry'}: {m['dur']} s, tempo {m.get('tempo')}, rate {m.get('rate')}, gate ok {m['ok']}: "
          + "; ".join(f['why'] for f in m["gate"]))
    print("  STATS", tts.STATS)
refs = [ROOT / "out/voice_match/s3_gemini_orus.wav", ROOT / "out/voice_match/replay_s3_room-dry.wav",
        ROOT / "out/voice_match/replay_s3_room-small.wav"]
ref = vm.embed(vm.load(sys.argv[2])) if len(sys.argv) > 2 else None
for f in refs:
    d = vm.measure(vm.load(f))
    print(vm.line(f.name, d, ref))
    print(f"   duration {len(vm.load(f)) / 16000:.2f} s")
a, b = vm.embed(vm.load(refs[0])), vm.embed(vm.load(refs[1]))
print(f"s3 vs replay (dry): cosine {float(np.dot(a, b)):.3f}")
