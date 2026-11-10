"""Is every line spoken by the right voice? (docs/voices.md "Speaker check")

Gemini's multi-speaker mode sometimes reads a line in the OTHER speaker's voice (Good Boy's "SIT." came out in the
narrator's voice), and the cut can put a word in the wrong line. This catches both without listening:

    ~/.hb-tts/bin/python scripts/speaker_check.py stories/<name>            # table + verdict; exit 1 on a blocker
    ~/.hb-tts/bin/python scripts/speaker_check.py stories/<name> --json     # one JSON object (tts.py's retake hook)
    ~/.hb-tts/bin/python scripts/speaker_check.py stories/<name> --only L06 --no-words
    ~/.hb-tts/bin/python scripts/speaker_check.py voices/samples/samples.json DIR   # a request list's takes

For every line's wav: a speaker embedding (Resemblyzer's GE2E voice encoder, 17 MB, CPU, a few ms a line) and the
median pitch. Each cast member's reference is the mean embedding of their own lines (leave-one-out, refined twice
so a swapped line doesn't pull its speaker's reference toward the wrong voice), plus the library samples of the same
Gemini voice (voices/samples/<id>.mp3), which anchor a speaker with only a few short lines. A line is scored against
every cast member: cosine similarity to their reference, minus a pitch penalty (semitones from their median pitch,
weighted more for short lines, where the embedding is weak). Flags:

  SWAP      the closest voice is not the line's `who` (by more than the noise margin): Gemini swapped the voices.
            Only the speakers of the request that voiced the line count (voice.json `with`, or story.json
            `requests`): a single-speaker request can't swap
  THIN      the right voice wins, but by too little to trust; listen to it (a warning, not a blocker)
  WORDS     Whisper's transcript is under 60% like the script, or it has words the script doesn't (a direction read
            aloud, a word from the next line): a bad cut or a misread
  SIMILAR   two cast voices are too alike to tell apart (embedding similarity and pitch): re-cast one (a warning)
  GATE      a continuous take (story.json "voice_takes": "beat") failed its take gate on every try (scripts/take_gate.py)
  EDGE      the line starts or ends within 30 dB of its peak: a word or breath cut off (voice_edges.py's test); TIGHT
            (a warning) = within 40 dB, or under 60 ms of quiet before the first sound / 150 ms after the last
  CLIPPED   the listening model (gemini-3.5-flash, given every line's audio) hears a word cut off at the start or
            end or clipped in the middle (--no-listen skips it; no answer = a note, not a blocker)

Setup (once, in the TTS venv): ~/.hb-tts/bin/pip install --no-deps resemblyzer   (only its weights and the network
shape are used: the mel spectrogram is computed here, so librosa/webrtcvad aren't needed). Whisper is the one
scripts/align.py already uses (openai/whisper-base.en via transformers).
"""
import difflib
import importlib.util
import json
import pathlib
import re
import subprocess
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 16000
SWAP_MARGIN = 0.02      # a line is SWAP when another voice beats its own by more than this (score units)
THIN_MARGIN = 0.06      # ...and THIN when its own voice wins by less than this
WORDS_MATCH = 0.6       # transcript vs script letters (align.py's threshold)
SIMILAR_COS = 0.88      # two cast references this alike...
SIMILAR_ST = 2.5        # ...and within this many semitones of each other: too alike


# ---- the voice encoder (Resemblyzer's GE2E LSTM: 40 mel bands -> 3x256 LSTM -> 256-d, L2-normed) ----

_ENC = None


def _encoder():
    global _ENC
    if _ENC is None:
        import torch
        torch.set_num_threads(2)   # the LSTM ran 100x slower with torch's default threads on a busy 4-core box
        spec = importlib.util.find_spec("resemblyzer")
        if spec is None:
            raise SystemExit("speaker_check: ~/.hb-tts/bin/pip install --no-deps resemblyzer (17 MB of weights)")
        w = torch.load(pathlib.Path(spec.origin).parent / "pretrained.pt", map_location="cpu")["model_state"]
        lstm, lin = torch.nn.LSTM(40, 256, 3, batch_first=True), torch.nn.Linear(256, 256)
        lstm.load_state_dict({k[5:]: v for k, v in w.items() if k.startswith("lstm.")})
        lin.load_state_dict({k[7:]: v for k, v in w.items() if k.startswith("linear.")})
        lstm.eval()
        _ENC = (torch, lstm, lin)
    return _ENC


def _mel_basis(n_fft=400, n_mels=40):
    """librosa.filters.mel(sr=16000, n_fft=400, n_mels=40): Slaney scale and norm, as Resemblyzer was trained on."""
    def hz2mel(f):
        f = np.asarray(f, float)
        return np.where(f >= 1000, 15 + np.log(np.maximum(f, 1e-9) / 1000) / (np.log(6.4) / 27), f / (200 / 3))

    def mel2hz(m):
        m = np.asarray(m, float)
        return np.where(m >= 15, 1000 * np.exp((np.log(6.4) / 27) * (m - 15)), m * 200 / 3)
    fft = np.linspace(0, SR / 2, 1 + n_fft // 2)
    mf = mel2hz(np.linspace(hz2mel(0), hz2mel(SR / 2), n_mels + 2))
    ramps = mf[:, None] - fft[None, :]
    fd = np.diff(mf)
    wts = np.maximum(0, np.minimum(-ramps[:-2] / fd[:-1, None], ramps[2:] / fd[1:, None]))
    return wts * (2 / (mf[2:] - mf[:-2]))[:, None]


_MEL = _mel_basis()
_WIN = 0.5 - 0.5 * np.cos(2 * np.pi * np.arange(400) / 400)


def mel(x):
    """Power mel spectrogram (frames, 40): 25 ms Hann windows every 10 ms, centred (librosa's defaults)."""
    x = np.pad(x, 200)
    n = 1 + (len(x) - 400) // 160
    fr = np.lib.stride_tricks.as_strided(x, (n, 400), (x.strides[0] * 160, x.strides[0])) * _WIN
    return (np.abs(np.fft.rfft(fr, axis=1)) ** 2 @ _MEL.T).astype(np.float32)


def embed(x):
    """One 256-d embedding for an utterance: the mean of 1.6 s partials (50% overlap), as Resemblyzer does."""
    torch, lstm, lin = _encoder()
    db = 10 * np.log10(np.mean(x ** 2) + 1e-12)
    if db < -30:   # Resemblyzer's volume normalisation (increase only, to -30 dBFS)
        x = x * 10 ** ((-30 - db) / 20)
    step = int(round(SR / 1.3 / 160))
    n_frames = int(np.ceil((len(x) + 1) / 160))
    starts = list(range(0, max(1, n_frames - 160 + step + 1), step))
    if len(starts) > 1 and (len(x) - starts[-1] * 160) / (160 * 160) < 0.75:
        starts = starts[:-1]
    x = np.pad(x, (0, max(0, (starts[-1] + 160) * 160 - len(x))))
    m = mel(x)
    batch = np.stack([m[s:s + 160] for s in starts])
    with torch.no_grad():
        _, (h, _) = lstm(torch.from_numpy(batch))
        e = torch.relu(lin(h[-1]))
        e = (e / e.norm(dim=1, keepdim=True)).mean(0).numpy()
    return e / np.linalg.norm(e)


# ---- audio ----

def load(path):
    return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                        capture_output=True, check=True).stdout, np.float32).copy()


def trim(x, thr=0.02):
    """The speech only: from the first to the last loud 10 ms frame (inner pauses kept)."""
    n = len(x) // 160
    loud = np.nonzero(np.abs(x[:n * 160]).reshape(n, 160).max(1) > thr)[0]
    return x[max(0, loud[0] * 160 - 800):(loud[-1] + 1) * 160 + 800] if len(loud) else x


def f0(x):
    """Median pitch in Hz over voiced 40 ms frames (tts.py's autocorrelation, at 16 kHz); 0 if unvoiced."""
    out = []
    for i in range(0, len(x) - 640, 320):
        f = x[i:i + 640] - x[i:i + 640].mean()
        if np.abs(f).max() < 0.05:
            continue
        ac = np.correlate(f, f, "full")[639:]
        k = SR // 400 + int(np.argmax(ac[SR // 400:SR // 50]))
        if ac[k] > 0.4 * ac[0]:
            out.append(SR / k)
    return float(np.median(out)) if out else 0.0


def st(a, b):
    """Semitones between two pitches (0 if either is unknown)."""
    return abs(12 * np.log2(a / b)) if a and b else 0.0


# ---- the transcript (Whisper, as align.py) ----

ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def spell(n):
    """37 -> 'thirty seven' (Whisper writes numbers as digits; the scripts spell them)."""
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    if n < 1000:
        return ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + spell(n % 100))
    return str(n)


def norm(t):
    t = re.sub(r"\d+", lambda m: " " + spell(int(m.group())) + " ", t.lower().replace("-", " "))
    return re.sub(r"[^a-z ]", "", t).split()


def word_check(spoken, heard):
    """(ok, match, extra words): extra = heard words the script lacks, beyond Whisper's usual slips."""
    a, b = norm(spoken), norm(heard)
    match = difflib.SequenceMatcher(None, "".join(a), "".join(b)).ratio()
    sm = difflib.SequenceMatcher(None, a, b)
    extra = [w for op, _, _, j1, j2 in sm.get_opcodes() if op in ("insert", "replace") for w in b[j1:j2]]
    # a few extra words is Whisper splitting or mishearing a name; a run of them is a direction or another line
    ok = match >= WORDS_MATCH and len(extra) <= max(2, len(a) // 3)
    return ok, round(match, 2), extra


# ---- the check ----

# What each voices/samples/ file really holds (made 2026-11-10 with the first roster; voices/cast.json has been recast
# since, so the cast ids no longer say the voice). Update this when the samples are made again. The Kid's sample is
# left out: it was pitch-lifted (asetrate), which changes the timbre.
SAMPLE_VOICES = {"narrator": "Erinome", "buh": "Achird", "elder": "Algenib", "smith": "Orus", "stranger": "Charon",
                 "villain": "Schedar", "mom": "Sulafat", "friend": "Fenrir"}


def library_refs(voices):
    """Gemini voice -> [embedding] of the voices/samples/ takes in that voice (they anchor a speaker with few lines)."""
    out = {}
    for f, v in SAMPLE_VOICES.items():
        p = ROOT / "voices" / "samples" / f"{f}.mp3"
        if v in voices and p.exists():
            out.setdefault(v, []).append(embed(trim(load(p))))
    return out


def edges(path, inner=(False, False)):
    """Is the line cut off at either end? (scripts/voice_edges.py's test, plus the padding the cut rules ask for.) The
    first and last 20 ms against the line's peak: within 30 dB = CUT (a word or breath sliced; clean takes sit at -50
    and below, Kokoro's at -80); and the quiet kept before the first sound / after the last (rules: >= 80 / 200 ms;
    TIGHT under 60 / 150 ms, or an edge within 40 dB). inner: (start, end) is a line boundary inside a continuous
    take (voice.json `beats`): the take plays whole across it, so that edge is no cut and isn't judged."""
    x = load(path)
    n = len(x) // 160
    if n < 10:
        return {"cut": False, "tight": False}
    db = 20 * np.log10(np.sqrt(np.mean(x[:n * 160].reshape(n, 160) ** 2, axis=1)) + 1e-9)
    pk = db.max()
    head, tail = db[:2].max() - pk, db[-2:].max() - pk
    loud = np.nonzero(db > pk - 40)[0]
    lead, trail = loud[0] * 0.01, (n - 1 - loud[-1]) * 0.01
    hcut, tcut = (not inner[0]) and head > -30, (not inner[1]) and tail > -30
    htight = (not inner[0]) and (head > -40 or lead < 0.06)
    ttight = (not inner[1]) and (tail > -40 or trail < 0.15)
    return {"head_db": round(float(head)), "tail_db": round(float(tail)), "lead": round(lead, 2), "trail": round(trail, 2),
            "cut": bool(hcut or tcut), "tight": bool(htight or ttight), **({"inner": list(inner)} if any(inner) else {})}


LISTEN_MODELS = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"]   # retried on 5xx, the next on anything else


def listen(rows):
    """Ask a Gemini text model to listen to every line (owner, 2026-11-10: "the voices seem to be edited in a way that
    cuts stuff off"): {id: [problems]} for lines with a word cut off at the start or end or clipped in the middle;
    None when no model answered (quota, network): the check then says so, and doesn't block."""
    import base64
    import time
    import urllib.error
    import urllib.request
    if not rows:
        return {}
    parts = [{"text": "You are checking voice-over takes for a video edit. For each numbered line below you get its "
                      "script and its audio. Listen closely to every word. Is any word cut off at the start or end of "
                      "the audio (a missing or sliced first consonant, a chopped last syllable or breath), or clipped "
                      "in the middle (a jump, a missing syllable)? Answer per word: list only the words that are cut "
                      "or clipped, with where (start/end/middle). Ignore acting, accent and pronunciation. Reply as JSON: "
                      '{"lines": [{"id": "L01", "problems": [{"word": "...", "where": "start|end|middle", "what": "..."}]}]} '
                      "with an empty problems list for a clean line."}]
    for r in rows:
        wav = subprocess.run(["ffmpeg", "-v", "error", "-i", str(r["path"]), "-ac", "1", "-ar", "16000", "-f", "wav", "-"],
                             capture_output=True, check=True).stdout
        parts += [{"text": f"Line {r['id']}. Script: {r['say']}"}, {"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(wav).decode()}}]
    body = json.dumps({"contents": [{"parts": parts}], "generationConfig": {"responseMimeType": "application/json", "temperature": 0}}).encode()
    for model in LISTEN_MODELS:
        for attempt in range(3):
            try:
                req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                                             data=body, headers={"Content-Type": "application/json", "x-goog-api-key": "proxy"})
                r = json.loads(urllib.request.urlopen(req, timeout=180).read())
                text = "".join(p.get("text", "") for p in r["candidates"][0]["content"]["parts"])
                ans = json.loads(text[text.index("{"):text.rindex("}") + 1])
                return {l["id"]: l.get("problems") or [] for l in ans.get("lines", []) if l.get("problems")}
            except urllib.error.HTTPError as e:
                if e.code in (500, 502, 503, 504):
                    time.sleep(5 * (attempt + 1)); continue
                print(f"listening check: {model} {e.code}", file=sys.stderr); break
            except (ValueError, KeyError, IndexError, OSError) as e:
                print(f"listening check: {model}: {e}", file=sys.stderr); break
    return None


def check(items, cast_voice, words=True, only=None, library=True, hear=True):
    """items: [{id, who, path, say}]; cast_voice: {who: Gemini voice or None}. -> report dict."""
    rows = []
    for it in items:
        x = trim(load(it["path"]))
        rows.append({**it, "dur": round(len(x) / SR, 2), "hz": round(f0(x)), "e": embed(x)})
    who = list(dict.fromkeys(cast_voice))
    libref = library_refs({v for v in cast_voice.values() if v}) if library else {}
    E = np.stack([r["e"] for r in rows])
    weight = np.array([min(1.0, r["dur"] / 2.0) for r in rows])   # long lines make better references

    def refs(exclude, keep):
        out = {}
        for w in who:
            idx = [i for i, r in enumerate(rows) if r["who"] == w and i != exclude and keep[i]]
            vs = [E[i] * weight[i] for i in idx] + [e * 1.5 for e in libref.get(cast_voice[w], [])]
            hz = [rows[i]["hz"] for i in idx if rows[i]["hz"] and rows[i]["dur"] >= 0.8] or [rows[i]["hz"] for i in idx if rows[i]["hz"]]
            if vs:
                c = np.sum(vs, 0)
                out[w] = (c / np.linalg.norm(c), float(np.median(hz)) if hz else 0.0)
        return out

    def score(i, ref):
        """similarity to a reference, less a pitch penalty that matters more the shorter the line."""
        c, hz = ref
        short = 1.0 - min(1.0, rows[i]["dur"] / 2.5)
        return float(E[i] @ c) - (0.012 + 0.03 * short) * min(st(rows[i]["hz"], hz), 8)

    keep = [True] * len(rows)
    for _ in range(3):   # refine: a line that sounds like someone else doesn't shape its speaker's reference
        res = []
        for i, r in enumerate(rows):
            sc = {w: score(i, ref) for w, ref in refs(i, keep).items()}
            res.append(sc)
        keep = [max(sc, key=sc.get) == r["who"] if len(sc) > 1 and r["who"] in sc else True for sc, r in zip(res, rows)]
    final = refs(-1, keep)
    out = {"lines": [], "pairs": [], "swapped": [], "thin": [], "words": [], "edges": [], "clipped": [], "gate": []}
    heard_cut = listen([r for r in rows if not only or r["id"] in only]) if hear else None
    if hear and heard_cut is None:
        out["listen"] = "skipped (no answer from the listening model): listen to the edges yourself"
    asr = None
    if words:
        sys.path.insert(0, str(ROOT / "scripts"))
        import align
        asr = align.words
    for i, (r, sc) in enumerate(zip(rows, res)):
        if only and r["id"] not in only:
            continue
        own = sc.get(r["who"], 0.0)
        # a voice can only swap with the other speaker of the same request: Gemini never heard the rest
        riv = {w: v for w, v in sc.items() if r.get("rivals") is None or w in r["rivals"] or w == r["who"]}
        best = max(riv, key=riv.get) if riv else r["who"]
        other = max([v for w, v in riv.items() if w != r["who"]], default=None)
        margin = round(own - other, 3) if other is not None else None
        flags = []
        if margin is not None and margin < -SWAP_MARGIN:
            flags.append("SWAP"); out["swapped"].append(r["id"])
        elif margin is not None and margin < THIN_MARGIN:
            flags.append("THIN"); out["thin"].append(r["id"])
        line = {"id": r["id"], "who": r["who"], "closest": best, "margin": margin, "dur": r["dur"], "hz": r["hz"],
                "scores": {w: round(v, 3) for w, v in sc.items()}, "flags": flags, "words": len(r["say"].split())}
        if asr:
            heard = " ".join(w for w, _, _ in asr(r["path"]))
            ok, match, extra = word_check(r["say"], heard)
            line.update({"heard": heard, "match": match, "extra": extra})
            if not ok:
                flags.append("WORDS"); out["words"].append(r["id"])
        ed = edges(r["path"], r.get("inner", (False, False)))
        line["edges"] = ed
        if ed["cut"]:
            flags.append("EDGE"); out["edges"].append(r["id"])
        elif ed["tight"]:
            flags.append("TIGHT")
        if r.get("gate"):   # a continuous take that failed its gate on every try (tts.py voice_beat): re-take the beat
            line["gate"] = r["gate"]
            flags.append("GATE"); out["gate"].append(r["id"])
        if heard_cut and heard_cut.get(r["id"]):
            line["clipped"] = heard_cut[r["id"]]
            flags.append("CLIPPED"); out["clipped"].append(r["id"])
        out["lines"].append(line)
    for a in range(len(who)):
        for b in range(a + 1, len(who)):
            if who[a] in final and who[b] in final:
                (ca, ha), (cb, hb) = final[who[a]], final[who[b]]
                cos, d = float(ca @ cb), st(ha, hb)
                out["pairs"].append({"a": who[a], "b": who[b], "cos": round(cos, 3), "hz": [round(ha), round(hb)], "semitones": round(float(d), 1),
                                     "similar": bool(cos > SIMILAR_COS and d < SIMILAR_ST)})
    out["refs"] = {w: {"hz": int(round(final[w][1])), "lines": sum(1 for i, r in enumerate(rows) if r["who"] == w and keep[i]),
                       "library": len(libref.get(cast_voice[w], []))} for w in who if w in final}
    out["blockers"] = sorted(set(out["swapped"]) | set(out["words"]) | set(out["edges"]) | set(out["clipped"]) | set(out["gate"]))
    out["ok"] = not out["blockers"]
    return out


def story_items(d):
    sys.path.insert(0, str(ROOT / "scripts"))
    import voice as kvoice   # the spoken text, as tts.py and voice.py make it
    from tts import resolve
    story = json.loads((d / "story.json").read_text())
    cast = story.get("cast") or {}
    cs = resolve(cast) if cast else {}
    narrator = next((k for k, c in cs.items() if c.get("role") == "narrator"), "N")
    vj = d / "voice" / "voice.json"
    vjs = json.loads(vj.read_text()) if vj.exists() else {}
    vl = vjs.get("lines") or {}
    beats = vjs.get("beats") or {}
    reqs = story.get("requests") or []
    items = []
    for ln in story["lines"]:
        p = d / "voice" / f"{ln['id']}.wav"
        if p.exists():
            who = ln.get("who") or narrator
            # who could have swapped into this line: the speakers of the request that voiced it (voice.json `with`,
            # written by tts.py), else the first story request listing the speaker (tts.py's rule), else anyone
            r = next((r for r in reqs if who in r.get("speakers", [])), None)
            rivals = (vl.get(ln["id"]) or {}).get("with") or (r["speakers"] if r else None)
            it = {"id": ln["id"], "who": who, "path": p, "say": ln.get("say") or kvoice.spoken(ln), "rivals": rivals}
            b = beats.get((vl.get(ln["id"]) or {}).get("beat"))
            if b:   # a line of a continuous take: only the take's own ends are cuts; its gate verdict travels with it
                it["inner"] = (b["lines"][0] != ln["id"], b["lines"][-1] != ln["id"])
                if not b.get("ok", True):
                    it["gate"] = [f["why"] for f in b.get("gate", [])]
            items.append(it)
    voices = {w: (cs.get(w) or {}).get("voice") for w in dict.fromkeys([narrator] + [i["who"] for i in items])}
    return items, {w: v for w, v in voices.items() if w in {i["who"] for i in items}}


def list_items(spec, d):
    items, voices = [], {}
    lib = json.loads((ROOT / "voices" / "cast.json").read_text())
    for r in json.loads(spec.read_text()):
        for w, lid, t in r["lines"]:
            if (d / f"{lid}.wav").exists():
                items.append({"id": lid, "who": w, "path": d / f"{lid}.wav", "say": t})
                voices[w] = lib[w]["voice"]
    return items, voices


def table(rep):
    out = []
    for l in rep["lines"]:
        sc = "  ".join(f"{w} {v:+.2f}" for w, v in l["scores"].items())
        m = "" if l["margin"] is None else f"{l['margin']:+.3f}"
        out.append(f"{l['id']:6s} {l['who']:8s} {l['dur']:5.2f}s {l['hz']:4d} Hz  closest {l['closest']:8s} margin {m:>7s}  [{sc}]"
                   f"  {' '.join(l['flags']) or 'ok'}" + (f"\n{'':15s}heard: {l['heard']}" + (f"  (extra: {' '.join(l['extra'])})" if l['extra'] else "") if l["flags"] and "heard" in l else ""))
        if set(l["flags"]) & {"EDGE", "TIGHT"}:
            e = l["edges"]
            out.append(f"{'':15s}edges: start {e['head_db']} dB, end {e['tail_db']} dB from peak; {e['lead']:.2f} s before the first sound, {e['trail']:.2f} s after the last")
        if l.get("gate"):
            out.append(f"{'':15s}take gate: " + "; ".join(l["gate"]))
        if l.get("clipped"):
            out.append(f"{'':15s}heard cut: " + "; ".join(f"\"{p.get('word')}\" {p.get('where')}" + (f" ({p['what']})" if p.get('what') else "") for p in l["clipped"]))
    for p in rep["pairs"]:
        out.append(f"voices {p['a']} / {p['b']}: similarity {p['cos']:.2f}, pitch {p['hz'][0]} / {p['hz'][1]} Hz ({p['semitones']} st)"
                   + ("  SIMILAR: hard to tell apart, re-cast one" if p["similar"] else ""))
    out.append("references: " + ", ".join(f"{w} {r['lines']} line(s) + {r['library']} library sample(s), {r['hz']} Hz" for w, r in rep["refs"].items()))
    if rep.get("listen"):
        out.append("listening check " + rep["listen"])
    out.append(("OK: every line in its own voice, words and edges clean" if rep["ok"] else f"BLOCKERS: {', '.join(rep['blockers'])}")
               + (f"; listen to: {', '.join(rep['thin'])}" if rep["thin"] else ""))
    return "\n".join(out)


def main(a):
    only = a[a.index("--only") + 1].split(",") if "--only" in a else None
    p = pathlib.Path(a[0])
    items, voices = story_items(p) if p.is_dir() else list_items(p, pathlib.Path(a[1]))
    if not items:
        raise SystemExit(f"{p}: no voice takes")
    rep = check(items, voices, words="--no-words" not in a, only=only, hear="--no-listen" not in a)
    if "--json" in a:
        rep["lines"] = [{k: v for k, v in l.items()} for l in rep["lines"]]
        print(json.dumps(rep))
    else:
        print(table(rep))
    return 0 if rep["ok"] else 1


SETUP = "~/.hb-tts/bin/pip install transformers scipy && ~/.hb-tts/bin/pip install --no-deps resemblyzer"

if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except ModuleNotFoundError as e:   # a fresh TTS venv: say the exact install line (./hb doctor checks the same)
        sys.exit(f"speaker_check: {e}. Install the voice-check packages into the TTS venv:\n  {SETUP}")
