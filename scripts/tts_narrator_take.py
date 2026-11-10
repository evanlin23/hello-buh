"""One fast narrator take for a whole story, the way Dog on the Hill's Pip was voiced (voices/cast.json narrator
model_hint): all of the narrator's lines in ONE single-speaker request, separated by blank lines, the profile as a
short bracketed prefix, then cut per line at Whisper's word times with the silences inside a line capped (0.2 s in
the first two lines, 0.3 s after). The other speakers' lines go through tts.py as usual (cached). Then tts.py writes
the wavs and voice.json. TTS venv: ~/.hb-tts/bin/python scripts/tts_narrator_take.py stories/<name> [--model M]
The raw take is cached in work/tts/narr_<hash>.wav (the prompt + voice), so a re-run costs no request."""
import hashlib, json, pathlib, sys
import numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import tts
import tts_resplit as R   # whisper model, norm(), cap()

sd = pathlib.Path(sys.argv[1])
model = sys.argv[sys.argv.index("--model") + 1] if "--model" in sys.argv else "gemini-3.8-flash-lite-tts"
story = json.loads((sd / "story.json").read_text())
cs = tts.resolve(story.get("cast"))
nid = next(k for k, c in cs.items() if c.get("role") == "narrator")
nl = [l for l in story["lines"] if (l.get("who") or nid) == nid]
pref = story.get("narrator_prefix") or f"[{cs[nid]['profile']}]"   # Pip's recipe: the profile verbatim (voices/recipes/pip.md)
text = pref + "\n\n" + "\n\n".join(l.get("say") or tts.spoken(l["text"]) for l in nl)
raw = tts.CACHE / f"narr_{hashlib.sha1(json.dumps([text, cs[nid]['voice'], model]).encode()).hexdigest()[:16]}.wav"
if raw.exists():
    x = np.frombuffer(tts.pcm(["-i", str(raw), "-f", "f32le", "-"]), np.float32)
else:
    tts.MODELS[:] = [model]
    x = tts.request(text, {cs[nid]["name"]: cs[nid]["voice"]})
    tts.CACHE.mkdir(parents=True, exist_ok=True)
    tts.pcm(["-y", "-f", "f32le", "-ar", str(tts.SR), "-ac", "1", "-i", "-", str(raw)], x.astype(np.float32).tobytes())
print(f"narrator take {len(x) / tts.SR:.1f} s ({raw.name})")
if "--raw" in sys.argv:   # hand the takes to voice_check.py --resplit (the safe quiet-point cut, docs/voices.md "The cut")
    (sd / "voice").mkdir(exist_ok=True)
    x.astype(np.float32).tofile(sd / "voice" / "narr_take.f32")
    reqs = [{"id": "narr", "lines": [[nid, l["id"], l.get("say") or tts.spoken(l["text"])] for l in nl]}]
    for r in story.get("requests", []):
        if nid in r["speakers"]:
            continue
        ls = [l for l in story["lines"] if l["id"] in r["lines"]]
        group = [((l.get("who")), l["id"], l.get("say") or tts.spoken(l["text"]), l.get("direction", "")) for l in ls]
        text = tts.prompt(r.get("direction", ""), group, cs)
        voices = {cs[w]["name"]: cs[w]["voice"] for w, _, _, _ in group}
        rp = tts.CACHE / f"{hashlib.sha1(json.dumps([text, voices]).encode()).hexdigest()[:16]}.wav"
        if not rp.exists():
            tts.take(r.get("direction", ""), group, cs)
        y = np.frombuffer(tts.pcm(["-i", str(rp), "-f", "f32le", "-"]), np.float32)
        y.astype(np.float32).tofile(sd / "voice" / f"{r['id']}_take.f32")
        reqs.append({"id": r["id"], "lines": [[w, lid, t] for w, lid, t, _ in group]})
    (sd / "voices.json").write_text(json.dumps(reqs, indent=1))
    sys.exit(0)
x16 = np.interp(np.arange(0, len(x), tts.SR / 16000), np.arange(len(x)), x).astype(np.float32)
r = R.MODEL.transcribe(x16, language="en", fp16=False, word_timestamps=True)
heard = [(n, w["start"], w["end"]) for s in r["segments"] for w in s["words"] for n in R.norm(w["word"])]
script = [(i, n) for i, l in enumerate(nl) for n in R.norm(l.get("say") or l["text"].replace(" / ", " "))]
import difflib
sm = difflib.SequenceMatcher(None, [n for _, n in script], [h[0] for h in heard], autojunk=False)
span = {}
for a, b, size in sm.get_matching_blocks():
    for k in range(size):
        li, (_, s0, e0) = script[a + k][0], heard[b + k]
        span[li] = (min(span.get(li, (s0, e0))[0], s0), max(span.get(li, (s0, e0))[1], e0))
missing = [nl[i]["id"] for i in range(len(nl)) if i not in span]
if missing:
    sys.exit(f"Whisper didn't hear {missing}: listen to {raw} (a direction read aloud or a dropped line)")
segs = {}
for i, l in enumerate(nl):
    nxt = span[i + 1][0] if i + 1 < len(nl) else len(x) / tts.SR
    a, b = max(0, span[i][0] - 0.06), min(nxt - 0.02, span[i][1] + 0.25)
    segs[l["id"]] = R.cap(x[int(a * tts.SR):int(b * tts.SR)], 0.2 if i < 2 else 0.3)
orig = tts.take


def take(scene, lines, c):
    if all(w == nid for w, _, _, _ in lines):
        return [segs[lid] for _, lid, _, _ in lines]
    return orig(scene, lines, c)


tts.take = take
tts.run_story(sd)
