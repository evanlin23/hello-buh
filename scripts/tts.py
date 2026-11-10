"""Acted character voices with Gemini TTS (docs/voices.md). Ported from the AI-dilemma Shorts (claude/ai-dilemma:
scripts/tts.py and cut_vox.py).

    python3 scripts/tts.py stories/<name> [--only L03,L07]              # a story.json v2 -> stories/<name>/voice/
    python3 scripts/tts.py voices/samples/samples.json out/voices_cast   # a request list -> <out>/<line id>.wav

Who speaks: voices/cast.json is the library of recurring characters (Gemini voice, the speaker name Gemini sees,
the profile sent as direction, a post filter). A story's `cast` (docs/story_craft.md section 6) points at it with
`ref` and may add one-off characters with their own `voice` and `profile`:
    "cast": {"N": {"ref": "narrator"}, "Mom": {"ref": "mom", "on_screen": "..."},
             "Ida": {"role": "character", "name": "Ida", "voice": "Kore", "profile": "the librarian: ..."}}
Lines: `who` (a cast id; missing = the narrator), `say` (what is read; default `text` with " / " removed and CAPS
lowered, as voice.py), `direction` (a note for that line: emotion and one rhythmic moment; never quote its words).
`requests` (optional) pairs the speakers ({"id", "speakers": [<=2 cast ids], "direction": scene}); each line goes to
the first request with its speaker. Without it, consecutive lines share a request until a third speaker. A request
holds at most 8 lines.

Quota: the free tier is a handful of requests a day per model, so a whole exchange goes in ONE request (Gemini's
multi-speaker mode takes at most 2 speakers) and is cut into lines at its pauses afterwards. Every raw take is cached
in work/tts/<hash>.wav by its exact prompt and voices: a re-run costs nothing unless a line, a note or a voice changed.
On a 429 the next model in MODELS is tried (the proxy injects the API key). --only re-voices just those lines (one new
request per speaker pair) and keeps the others.

Each line keeps its in-breath and natural tail (the cut pads into the pauses), then: high-pass 60 Hz, the character's
`post` (EQ, or the narrator's formant-preserving tempo/pitch), a light room (the request's or story's `room`: small,
hall, outdoor, or "" for dry), and ONE gain per take (-16 LUFS, a limiter on rare peaks only) so a whisper stays
quieter than a shout. No de-esser, no per-line loudnorm, no asetrate pitch shift: each one made the realism judge say
"AI" (docs/voices.md "Realism"). Writes <id>.wav and, for a story,
voice/voice.json (dur, onset, end, caption chunks spread over the speech by length, who): the file lib/story.js and
edit.py --story already read. Check the printed lengths and pitch: a take far longer than its text means the model
read the direction aloud; a pitch that belongs to the other speaker means a bad cut (fix the text's punctuation, or split the request).
"""
import base64
import hashlib
import json
import pathlib
import subprocess
import sys
import time
import urllib.error
import urllib.request

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
# Realism test 2026-11-10 (docs/voices.md "Realism"): 3.1-flash-tts with the structured prompt was judged the most human
# (9/10 vs 3-8 for 2.5-flash takes). 2.5-pro-tts has a free-tier limit of 0; 3.8-flash-tts takes no direction block
# (multi-speaker needs per-part speechMetadata, no system instruction) and read a bracket tag aloud.
MODELS = ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"]
STRUCTURED = ("gemini-3",)   # models that get the # AUDIO PROFILE / ## THE SCENE / ### DIRECTOR'S NOTES / #### TRANSCRIPT layout
SR = 24000
CACHE = ROOT / "work" / "tts"
STATS = {"requests": 0, "cached": 0}
PITCH_W = 3.0   # weight of the pitch term in cut() (tuned on the voices/samples takes)


def library():
    return {k: v for k, v in json.loads((ROOT / "voices" / "cast.json").read_text()).items() if not k.startswith("_")}


def resolve(story_cast=None):
    """cast id -> {name, voice, profile, post, ...}: library entries, and a story's cast on top (by `ref`)."""
    lib = library()
    if not story_cast:
        return lib
    out = {}
    for cid, c in story_cast.items():
        base = lib.get(c.get("ref", cid if cid in lib else ""), {})
        out[cid] = {**base, **c}
        out[cid].setdefault("name", cid)
        if "voice" not in out[cid] or "profile" not in out[cid]:
            raise SystemExit(f"cast {cid}: no voice/profile (give `ref` to a voices/cast.json id, or both)")
    return out


def request(text, voices):
    """One TTS call -> float32 mono at SR. voices: {label: Gemini voice name} (1 or 2 entries). `text` is the prompt,
    or a function model -> prompt (each model family gets the layout it was tested with)."""
    if len(voices) == 1:
        sc = {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": list(voices.values())[0]}}}
    else:
        sc = {"multiSpeakerVoiceConfig": {"speakerVoiceConfigs": [
            {"speaker": s, "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": v}}} for s, v in voices.items()]}}
    for model in MODELS:
        body = json.dumps({"contents": [{"parts": [{"text": text(model) if callable(text) else text}]}],
                           "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": sc}}).encode()
        # a 429 is the model's daily quota: move to the next one; a 5xx gets one more try
        for attempt in range(2):
            try:
                STATS["requests"] += 1
                req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                                             data=body, headers={"Content-Type": "application/json", "x-goog-api-key": "proxy"})
                part = json.loads(urllib.request.urlopen(req, timeout=240).read())["candidates"][0]["content"]["parts"][0]["inlineData"]
                data = base64.b64decode(part["data"])
                print(f"  {model}: ok")
                if "wav" in part["mimeType"]:
                    data = subprocess.run(["ffmpeg", "-v", "error", "-i", "-", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                                          input=data, capture_output=True, check=True).stdout
                return np.frombuffer(data, "<i2").astype(np.float32) / 32768
            except urllib.error.HTTPError as e:
                msg = e.read()[:300].decode(errors="replace")
                print(f"  {model}: {e.code} {msg[:120]!r}")
                if e.code == 429:
                    break
                if e.code not in (500, 502, 503, 504):
                    raise SystemExit(f"TTS {e.code}: {msg}")
                time.sleep(20)
    raise SystemExit("TTS: every model refused (quota?)")


def loud_frames(x, thr):
    m = len(x) // 480
    return np.abs(x[:m * 480]).reshape(m, 480).max(1) > thr


def speech_segments(x, gap=0.3, thr=0.02):
    """(start, end) samples of every stretch of speech separated by more than `gap` s of quiet."""
    loud, bridge, out, k = loud_frames(x, thr), int(gap * SR / 480), [], 0
    m = len(loud)
    while k < m:
        if loud[k]:
            j = k
            while j < m and (loud[j] or loud[j:j + bridge].any()):
                j += 1
            out.append((max(0, k * 480 - 1200), min(len(x), j * 480 + 2400)))
            k = j
        else:
            k += 1
    return out


def cut(x, texts):
    """Cut a take into len(texts) lines (cut_vox.py): every pause is a candidate, and dynamic programming picks the
    cuts so each line's share of the speech matches its share of the text, preferring long pauses. Lines with pauses
    inside them don't fool it the way "the n - 1 longest pauses" did."""
    segs, L = speech_segments(x, gap=0.12), len(texts)
    M = len(segs)
    if M < L:
        raise SystemExit(f"{M} stretches of speech for {L} lines: the model ran lines together; add a full stop or split the request")
    share = np.array([len(t) for t in texts], float); share /= share.sum()
    T = segs[-1][1] - segs[0][0]
    # pitch: two speakers rarely share one; a line whose stretches disagree in pitch is probably two people
    lp = [np.log2(f0(x[a:b])) if f0(x[a:b]) else np.nan for a, b in segs]
    dur = [(b - a) / SR for a, b in segs]

    def spread(k, j):
        v = [(lp[i], dur[i]) for i in range(k, j) if not np.isnan(lp[i])]
        if len(v) < 2:
            return 0
        m = sum(a * d for a, d in v) / sum(d for _, d in v)
        return PITCH_W * sum(d * (a - m) ** 2 for a, d in v)

    gaps = [segs[j + 1][0] - segs[j][1] for j in range(M - 1)]
    gmax = max(gaps) if gaps else 1
    best = np.full((L + 1, M + 1), np.inf); arg = np.zeros((L + 1, M + 1), int); best[0, 0] = 0
    for i in range(1, L + 1):
        for j in range(i, M + 1):
            for k in range(i - 1, j):
                c = best[i - 1, k] + ((segs[j - 1][1] - segs[k][0]) / T - share[i - 1]) ** 2 * 50 + spread(k, j) - (0.6 * gaps[j - 1] / gmax if j < M else 0)
                if c < best[i, j]:
                    best[i, j], arg[i, j] = c, k
    bounds, j = [], M
    for i in range(L, 0, -1):
        k = arg[i, j]; bounds.append((k, j - 1)); j = k
    return [padded(x, segs, k, e) for k, e in bounds[::-1]]


BREATH = 0.35   # s of the pause before a line kept with it (the in-breath), at most half the pause
TAIL = 0.30     # s after the last word kept (the decay and any out-breath), at most half the pause


def padded(x, segs, k, e):
    """Line = speech stretches k..e plus the quiet around them: the breath before and the natural tail after, each at
    most half of the neighbouring pause (so no line holds the other speaker's breath), with 15 ms fades. Cutting at
    the speech gate (the old way) clipped in-breaths and word tails: the judge's 'robotic tails'."""
    a = segs[k][0] - min(int(BREATH * SR), (segs[k][0] - (segs[k - 1][1] if k else 0)) // 2)
    b = segs[e][1] + min(int(TAIL * SR), ((segs[e + 1][0] if e + 1 < len(segs) else len(x)) - segs[e][1]) // 2)
    y = x[max(0, a):min(len(x), b)].copy()
    f = min(len(y) // 4, int(0.015 * SR))
    if f:
        y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    return y


def f0(x):
    """Median pitch in Hz (autocorrelation over loud 40 ms frames)."""
    out = []
    for i in range(0, len(x) - 960, 480):
        f = x[i:i + 960] - x[i:i + 960].mean()
        if np.abs(f).max() < 0.05:
            continue
        ac = np.correlate(f, f, "full")[959:]
        k = SR // 400 + int(np.argmax(ac[SR // 400:SR // 45]))
        if ac[k] > 0.4 * ac[0]:
            out.append(SR / k)
    return int(np.median(out)) if out else 0


def pcm(args, data=None):
    return subprocess.run(["ffmpeg", "-v", "error", *args], input=data, capture_output=True, check=True).stdout


ROOMS = {   # a short synthetic room (decaying filtered noise + a few early reflections), mixed under the dry voice
    "small": {"rt60": 0.28, "pre": 0.008, "lp": 0.30, "wet": 0.10},     # a bedroom, a kitchen, a shop, a cave mouth
    "hall": {"rt60": 0.70, "pre": 0.020, "lp": 0.25, "wet": 0.14},      # a church, a big hall, a deep cave
    "outdoor": {"rt60": 0.18, "pre": 0.030, "lp": 0.20, "wet": 0.05},   # a field, a village square (almost dry)
}


def room_ir(rt60, pre, lp, seed=1, **_):
    rng = np.random.default_rng(seed)
    n = int(SR * rt60 * 1.2)
    tail = rng.standard_normal(n) * np.exp(-6.9 * np.arange(n) / SR / rt60)
    tail = np.frombuffer(pcm(["-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", f"lowpass=f={int(12000 * lp)}",
                              "-f", "f32le", "-"], tail.astype(np.float32).tobytes()), np.float32)
    ir = np.zeros(len(tail) + int(pre * SR)); ir[int(pre * SR):] = tail
    for d, g in [(0.004, .5), (0.007, -.35), (0.011, .3), (0.017, -.2)]:   # early reflections
        ir[int(d * SR)] += g
    return ir / np.sqrt((ir ** 2).sum())


def add_room(x, kind):
    """The dry voice plus a little of a synthetic room. No room tone: under the game audio it isn't heard, and alone the
    judge heard it as a separate track under a dry voice."""
    r = ROOMS[kind]
    ir = room_ir(**r)
    n = 1 << (len(x) + len(ir) - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[:len(x)]
    return (x * (1 - r["wet"]) + wet * r["wet"] * 0.6).astype(np.float32)


def lufs(x):
    err = subprocess.run(["ffmpeg", "-v", "info", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", "ebur128=framelog=quiet",
                          "-f", "null", "-"], input=x.astype(np.float32).tobytes(), capture_output=True).stderr.decode()
    return float(err.rsplit("I:", 1)[1].split("LUFS")[0])


def shape(x, post="", room="small"):
    """One line, gently (docs/voices.md "Realism"): high-pass 60 Hz, the character's `post` (EQ only, never a pitch
    shift), the scene's room, a 60 ms fade at the end instead of a cut at the last word. No de-esser, no loudnorm."""
    raw = ["-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-"]
    af = ",".join(f for f in ["highpass=f=60:p=1", post] if f)
    y = np.frombuffer(pcm([*raw, "-af", af, "-f", "f32le", "-"], x.astype(np.float32).tobytes()), np.float32).copy()
    if room:
        y = add_room(y, room)
    f = min(len(y) // 4, int(0.06 * SR))
    y[-f:] *= np.linspace(1, 0, f)
    return y


def level(ys, target=-16.0, peak=-1.5, limit_db=3.0):
    """ONE gain for a whole take, so a whisper stays quieter than the line before it (per-line loudnorm made every line
    equally loud: a giveaway). Aim for `target` LUFS; if that pushes peaks over `peak` dBFS, a limiter may take up to
    `limit_db` off the rare peaks, and beyond that the take comes out quieter (edit.py sets the final voice level)."""
    g = 10 ** ((target - lufs(np.concatenate(ys))) / 20)
    pk = max(np.abs(y).max() for y in ys) * g
    g /= max(1.0, pk / 10 ** ((peak + limit_db) / 20))
    out = []
    for y in ys:
        y = y * g
        if np.abs(y).max() > 10 ** (peak / 20):
            y = np.frombuffer(pcm(["-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af",
                                   f"alimiter=limit={10 ** (peak / 20):.3f}:attack=1:release=50:level=disabled", "-f", "f32le", "-"],
                                  y.astype(np.float32).tobytes()), np.float32).copy()
        out.append(y)
    return out


REALISM = ("Real people talking, recorded close on a good microphone: not a performance, not an announcer or an audiobook. "
           "Natural, unpolished, conversational delivery with real breaths and small hesitations.")


def prompt(scene, lines, cs, model=MODELS[0]):
    """What Gemini reads. 3.x models get Google's documented layout (# AUDIO PROFILE: each speaker's profile, the same
    string in every story; ## THE SCENE; ### DIRECTOR'S NOTES: the realism note and the per-line notes by number;
    #### TRANSCRIPT); the headings and notes aren't spoken (6 of 6 takes, Whisper-checked). 2.5 gets the flat layout
    it was tested with. Never put an emotion in [brackets] inside a line: 3.8 read "[barely a whisper]" aloud."""
    who = list(dict.fromkeys(w for w, _, _, _ in lines))
    notes = [f"Line {i + 1}: {note}." for i, (_, _, _, note) in enumerate(lines) if note]
    body = [t if len(who) == 1 else f"{cs[w]['name']}: {t}" for w, _, t, _ in lines]
    profiles = [f"{cs[w]['name']} is {cs[w]['profile']}." for w in who]
    if model.startswith(STRUCTURED):
        return ("# AUDIO PROFILE\n" + "\n".join(profiles) + "\n\n## THE SCENE\n" + (scene.strip() or "A quiet room.") +
                "\n\n### DIRECTOR'S NOTES\n" + "\n".join([REALISM, *notes, "Leave a natural pause between lines."]) +
                "\n\n#### TRANSCRIPT\n" + "\n".join(body))
    head = [scene.strip()] if scene else []
    head += [f"Read these lines as {cs[who[0]]['profile']}."] if len(who) == 1 else profiles
    head += [REALISM, *notes, "Leave a pause after every line."]
    return " ".join(head) + "\n\n" + "\n".join(body)


def take(scene, lines, cs):
    """Voice one request's lines [(who, id, text, note)] (at most 2 speakers) -> [float32 per line], cached."""
    who = list(dict.fromkeys(w for w, _, _, _ in lines))
    if len(who) > 2:
        raise SystemExit(f"{[l for _, l, _, _ in lines]}: {len(who)} speakers in one request (Gemini takes 2)")
    text = prompt(scene, lines, cs)   # the cache key: the first model's prompt (a fallback model's take is cached under it)
    voices = {cs[w]["name"]: cs[w]["voice"] for w in who}
    raw = CACHE / f"{hashlib.sha1(json.dumps([text, voices]).encode()).hexdigest()[:16]}.wav"
    if raw.exists():
        STATS["cached"] += 1
        x = np.frombuffer(pcm(["-i", str(raw), "-f", "f32le", "-"]), np.float32)
    else:
        print(f"request: {', '.join(f'{k}={v}' for k, v in voices.items())}, {len(lines)} lines")
        x = request(lambda m: prompt(scene, lines, cs, m), voices)
        CACHE.mkdir(parents=True, exist_ok=True)
        pcm(["-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(raw)], x.tobytes())
    words = sum(len(t.split()) for _, _, t, _ in lines)
    if len(x) / SR > words / 1.5 + 2:   # slower than ~90 wpm: the direction was probably read aloud
        print(f"  WARNING: {len(x) / SR:.1f} s for {words} words: was the direction read aloud? listen to {raw}")
    return cut(x, [t for _, _, t, _ in lines])


def voice_lines(groups, cs, out):
    """groups: [(scene, [(who, id, text, note)], room)] -> {id: (who, text, wav samples)}. room: a ROOMS key or ""
    (a 2-tuple, or a non-string third item, means the default small room)."""
    out.mkdir(parents=True, exist_ok=True)
    done = {}
    for g in groups:
        scene, lines, room = (*g, "small")[:3] if len(g) == 2 or not isinstance(g[2], str) else g
        ys = level([shape(seg, cs[w].get("post", ""), room) for (w, _, _, _), seg in zip(lines, take(scene, lines, cs))])
        for (w, lid, t, _), y in zip(lines, ys):
            pcm(["-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(out / f"{lid}.wav")], y.astype(np.float32).tobytes())
            done[lid] = (w, t, y)
            print(f"{lid:8s} {len(y) / SR:5.2f} s {f0(y):4d} Hz  {w}: {t}")
    return done


def spoken(t):
    """CAPS key words are for the captions: lower them for the voice (an all-caps word is read louder and flatter)."""
    return " ".join(w.lower() if sum(c.isalpha() for c in w) > 1 and w.isupper() else w for w in t.replace(" / ", " ").split())


def run_list(spec, out):
    groups = [(r.get("direction", ""), [(w, lid, spoken(t), "") for w, lid, t in r["lines"]], r.get("room", "small"))
              for r in json.loads(spec.read_text())]
    voice_lines(groups, library(), out)


def run_story(d, only=None):
    sys.path.insert(0, str(ROOT / "scripts"))
    import voice   # the caption format (" / " chunks, CAPS lowered for speech) stays voice.py's
    story = json.loads((d / "story.json").read_text())
    cs = resolve(story.get("cast"))
    narrator = next((k for k, c in cs.items() if c.get("role") == "narrator"), "narrator")
    reqs = story.get("requests") or []
    groups, cur, cur_req = [], [], None
    for ln in story["lines"]:
        if only and ln["id"] not in only:
            continue
        w = ln.get("who", narrator)
        r = next((r for r in reqs if w in r["speakers"]), None) if reqs else None
        item = (w, ln["id"], ln.get("say") or voice.spoken(ln), ln.get("direction", ""))
        if reqs:   # each line in the first request that lists its speaker
            if r is None:
                raise SystemExit(f"{ln['id']}: no request lists speaker {w}")
            g = next((g for g in groups if g[2] is r and len(g[1]) < 8), None)
            g[1].append(item) if g else groups.append((r.get("direction", ""), [item], r))
            continue
        if cur and (len({x[0] for x in cur} | {w}) > 2 or len(cur) == 8):
            groups.append((story.get("direction", ""), cur, None)); cur = []
        cur.append(item)
    if cur:
        groups.append((story.get("direction", ""), cur, None))
    done = voice_lines([(s, l, (r or {}).get("room", story.get("room", "small"))) for s, l, r in groups], cs, d / "voice")
    vf = d / "voice" / "voice.json"
    meta = json.loads(vf.read_text()) if only and vf.exists() else {"lines": {}}
    meta.update({"model": f"Gemini TTS ({MODELS[0]} first), voices/cast.json", "sr": SR, "gap": story.get("gap", 0.25)})
    for ln in story["lines"]:
        if ln["id"] not in done:
            continue
        w, t, y = done[ln["id"]]
        sp = speech_segments(y, gap=0.12)
        a, b = (sp[0][0] / SR, sp[-1][1] / SR) if sp else (0, len(y) / SR)
        caps = [c for c, _ in voice.chunks(ln)]
        share = np.cumsum([0] + [len(c) for c in caps]) / max(1, sum(len(c) for c in caps))
        meta["lines"][ln["id"]] = {"who": w, "text": t, "dur": round(len(y) / SR, 3), "onset": round(a, 3), "end": round(b, 3),
                                   "chunks": [[round(a + (b - a) * s, 3), round(a + (b - a) * e, 3)] for s, e in zip(share, share[1:])],
                                   "captions": caps}
    meta["lines"] = {ln["id"]: meta["lines"][ln["id"]] for ln in story["lines"] if ln["id"] in meta["lines"]}
    meta["total"] = round(sum(l["dur"] + meta["gap"] for l in meta["lines"].values()), 2)
    vf.write_text(json.dumps(meta, indent=1))


if __name__ == "__main__":
    a = sys.argv[1:]
    only = a[a.index("--only") + 1].split(",") if "--only" in a else None
    p = pathlib.Path(a[0])
    run_story(p, only) if p.is_dir() else run_list(p, pathlib.Path(a[1]))
    print(f"{STATS['requests']} API request(s), {STATS['cached']} take(s) from the cache")
