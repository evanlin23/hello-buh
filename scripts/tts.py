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
holds at most 6 lines (MAX_LINES: longer takes drift).

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
BRACKET = ("gemini-3.8",)    # Pip's recipe (voices/recipes/pip.md): no direction block; "[profile]" then the lines
STRUCTURED = ("gemini-3",)   # models that get the # AUDIO PROFILE / ## THE SCENE / ### DIRECTOR'S NOTES / #### TRANSCRIPT layout
SR = 24000
CACHE = ROOT / "work" / "tts"
STATS = {"requests": 0, "cached": 0}
MAX_LINES = 6    # lines per request: longer takes drift over the take (owner, 2026-11-10: voices "change ... even within take")
LOCK = {}        # cast id -> the one model that voices it in this story (voice.json `models`; docs/voices.md "Drift gate")


SHORT_WORDS = 3  # a character line this short goes in a single-speaker request (multi-speaker takes swapped them)
PITCH_W = 3.0   # weight of the pitch term in cut() (tuned on the voices/samples takes)


class QuotaOut(SystemExit):
    """The locked model is out of quota: stop (the takes so far are cached) rather than switch a character's model."""


def library():
    return {k: v for k, v in json.loads((ROOT / "voices" / "cast.json").read_text()).items() if not k.startswith("_")}


def resolve(story_cast=None):
    """cast id -> {name, voice, profile, post, ...}: library entries, and a story's cast on top (by `ref`)."""
    lib = library()
    if not story_cast:
        return lib
    out = {}
    for cid, c in story_cast.items():
        if c.get("silent"):   # on screen, never voiced (a flashback grandpa, a piglin): nothing to cast
            continue
        base = lib.get(c.get("ref", cid if cid in lib else ""), {})
        out[cid] = {**base, **c}
        out[cid].setdefault("name", cid)
        if "voice" not in out[cid] or "profile" not in out[cid]:
            raise SystemExit(f"cast {cid}: no voice/profile (give `ref` to a voices/cast.json id, or both)")
    return out


def request(text, voices, models=None):
    """One TTS call -> (float32 mono at SR, the model that made it). voices: {label: Gemini voice name} (1 or 2
    entries). `text` is the prompt, or a function model -> prompt (each model family gets the layout it was tested
    with). models: the ones this request may use, in order (a locked character: exactly one; default MODELS)."""
    if len(voices) == 1:
        sc = {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": list(voices.values())[0]}}}
    else:
        sc = {"multiSpeakerVoiceConfig": {"speakerVoiceConfigs": [
            {"speaker": s, "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": v}}} for s, v in voices.items()]}}
    for model in models or MODELS:
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
                return np.frombuffer(data, "<i2").astype(np.float32) / 32768, model
            except urllib.error.HTTPError as e:
                msg = e.read()[:300].decode(errors="replace")
                print(f"  {model}: {e.code} {msg[:120]!r}")
                if e.code == 429:
                    break
                if e.code not in (500, 502, 503, 504):
                    raise SystemExit(f"TTS {e.code}: {msg}")
                time.sleep(20)
    if models and len(models) == 1:
        raise QuotaOut(f"TTS: {models[0]} is out of quota and it is locked for this voice (docs/voices.md \"Drift gate\"): "
                       f"run again after the quota resets (the takes so far are cached), or re-take ALL of the character's "
                       f"lines on another model: --relock <cast id>=<model>")
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
    """Cut a take into len(texts) lines: at Whisper's word timings when Whisper is installed (the TTS venv), else at
    the pauses (cut_pauses). The pauses alone went wrong on lines written with "...": the longest pause of a take is
    often inside a line, not between two."""
    if len(texts) == 1:
        segs = speech_segments(x, gap=0.12)
        return [padded(x, segs, 0, len(segs) - 1) if segs else x]   # the breath and tail kept, as cut_pauses does
    try:
        return cut_words(x, texts)
    except ImportError:
        print("  (no Whisper here: cutting at the pauses; run tts.py with ~/.hb-tts/bin/python to cut at the words)")
    except ValueError as e:
        print(f"  word cut failed ({e}): cutting at the pauses")
    return cut_pauses(x, texts)


def cut_words(x, texts):
    """Cut with Whisper's help: it transcribes the take with word times (scripts/align.py's model) and the script is
    matched to what it heard, which says roughly where each boundary is: between the line's last word heard and the
    next line's first. Whisper's times are loose (a word end swallows the pause after it, a start lands up to ~0.3 s
    late), so the boundary is searched in a window around them and placed by the audio (quiet_point); the edges are
    then cut by the safe-cut rules (edges_at). A boundary Whisper can't place (it dropped a lone "Sit.") sends the
    whole take to the pauses (cut_pauses, with the first words heard as hints)."""
    sys.path.insert(0, str(ROOT / "scripts"))
    import difflib
    import align
    x16 = np.interp(np.arange(int(len(x) * 16000 / SR)) * SR / 16000, np.arange(len(x)), x).astype(np.float32)
    heard = align.words(x16)
    if not heard:
        raise ValueError("Whisper heard nothing")
    sw = [w for t in texts for w in t.split()]
    first = np.cumsum([0] + [len(t.split()) for t in texts])[:-1]
    a, b = [align.norm(w) for w in sw], [align.norm(w) for w, _, _ in heard]
    m = {}
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            m[blk.a + k] = blk.b + k
    ends = list(first[1:]) + [len(sw)]

    def hint(i):   # (time, tolerance): the first of the line's first 3 words heard as written ("I" and "a" too common)
        for j in range(first[i], min(first[i] + 3, ends[i])):
            if j in m and len(a[j]) > 1:
                return heard[m[j]][1], 0.3 + 0.4 * (j - first[i])   # a later word: the line starts up to ~0.4 s/word before it
        return None

    def boundary(i):   # (heard index of line i-1's last word, of line i's first word), or None
        lw = next((m[j] + (ends[i - 1] - 1 - j) for j in range(ends[i - 1] - 1, first[i - 1] - 1, -1) if j in m), None)
        fw = next((m[j] - (j - first[i]) for j in range(first[i], ends[i]) if j in m), None)
        if lw is None and fw is None:
            return None
        lw = fw - 1 if lw is None else lw
        fw = lw + 1 if fw is None else fw
        lw, fw = min(lw, fw - 1), max(fw, lw + 1)   # (a word guessed from the matched ones: keep them in order)
        return (lw, fw) if 0 <= lw and fw < len(heard) else None
    bds = [boundary(i) for i in range(1, len(texts))]
    if None in bds:
        hints = [hint(i) for i in range(1, len(texts))]
        if not any(h is not None for h in hints):
            raise ValueError("no line's first word was heard as written")
        print("  (Whisper didn't hear every line's edge: cutting at the pauses, its first words as hints)")
        return cut_pauses(x, texts, hints)
    # the window (claude/cinematic-default's resplit, which left Good Boy's Pip take with 0 cut edges): from just
    # before the last word's heard end (or 0.1 s into it) to 0.3 s past the next line's heard start (or 0.1 s past
    # the word end), but never past that first word's own end
    qs = []
    for lw, fw in bds:
        lw = fw - 1   # words heard between the lines but in neither (a direction read aloud) stay with the line before:
        #               the boundary is the pause before the next line's first word, never inside them
        t0 = min(heard[lw][2] - 0.05, heard[lw][1] + 0.1)
        t1 = min(max(heard[fw][1] + 0.3, heard[lw][2] + 0.1), max(heard[fw][2], heard[lw][2] + 0.1))
        qs.append(quiet_point(x, t0, t1))
    if any(q2 <= q1 for q1, q2 in zip(qs, qs[1:])):
        raise ValueError("boundaries out of order")
    return edges_at(x, qs)


def quiet_point(x, t0, t1, fr=240):
    """The sample to cut at between t0 and t1 s (claude/cinematic-default's resplit rule): among the 10 ms frames
    within 6 dB of the quietest, the one nearest the middle (the quietest alone was once the soft "s" starting the next
    word: "Skeletons" heard as "Gelatin's"); and only frames in a run of 40 ms or more of them when there is one: a
    pause, not a stop consonant's closure inside a word ("zom-b-ies": the middle was the "b", and the cut clipped
    "-ies" and "I" at the head of the next line)."""
    i0, i1 = max(0, int(t0 * SR)), min(len(x), int(t1 * SR))
    if i1 - i0 < 2 * fr:
        return (i0 + i1) // 2
    db = frame_db(x[i0:i1], fr)
    q = db <= db.min() + 6
    keep, i = np.zeros(len(q), bool), 0
    while i < len(q):
        j = i
        while j < len(q) and q[j]:
            j += 1
        keep[i:j] = j - i >= 4
        i = max(j, i + 1)
    ok = np.nonzero(keep if keep.any() else q)[0]
    k = int(ok[np.argmin(np.abs(ok - (len(db) - 1) / 2))])
    return i0 + k * fr + fr // 2


def edges_at(x, qs):
    """Cut a take at the boundary samples qs into len(qs) + 1 lines by the safe-cut rules (owner, 2026-11-10: "the
    voices seem to be edited in a way that cuts stuff off"): from each boundary, the neighbours' last and first sound
    are found by level (soft_floor: 45 dB under the take's loud frames), so breaths and word tails count as sound;
    a line keeps 80-350 ms before its first sound and 200-450 ms after its last, never past the neighbour's own sound,
    and each edge is the boundary itself when it lies in that range, else the quiet point of the range; in a pause too
    short for the margins both lines meet, 200/280 of it going to the tail; lines said with no silence between them
    meet at the boundary. 15 ms fades; the take's first/last line padded with silence if the take itself is tight."""
    fr = 240
    db = frame_db(x, fr)
    floor = soft_floor(db)
    n = len(db)
    loud = np.nonzero(db > floor)[0]
    if not len(loud):
        return [x.copy() for _ in range(len(qs) + 1)]
    pre, post, br, tl = (int(v * SR / fr) for v in (PRE_MIN, POST_MIN, BREATH, TAIL))
    qf = [min(n - 1, q // fr) for q in qs]

    def off_on(f):   # the last sound before boundary frame f and the first after it (frame indices)
        a = f
        while a > 0 and db[a - 1] <= floor:
            a -= 1
        b = f if db[f] > floor else f + 1
        while b < n and db[b] <= floor:
            b += 1
        return (a, b) if db[f] <= floor else (f, f)

    bd = [off_on(f) for f in qf]

    def split(off, on, q):   # a pause too short for both margins: both lines meet in it, the tail getting 200/280 of
        #                      it (a cut-off tail was the owner's complaint); no silence at all: at the quiet point
        return (off * fr + (on - off) * fr * post // (pre + post)) if on > off else q
    starts, stops = [], []
    for i in range(len(qs) + 1):
        if i == 0:   # the take's first sound
            on, prev_off, q0 = int(loud[0]), 0, None
        else:
            prev_off, on = bd[i - 1]; q0 = qs[i - 1]
        lo, hi = max(prev_off, on - br), on - pre
        if hi >= lo:
            s = q0 if q0 is not None and lo * fr <= q0 <= hi * fr else quiet_point(x, lo * fr / SR, hi * fr / SR)
        else:
            s = split(prev_off, on, q0) if q0 is not None else 0
        if i == len(qs):   # the take's last sound
            off, next_on, q1 = int(loud[-1]) + 1, n, None
        else:
            off, next_on = bd[i]; q1 = qs[i]
        lo, hi = off + post, min(next_on, off + tl)
        if hi >= lo:
            e = q1 if q1 is not None and lo * fr <= q1 <= hi * fr else quiet_point(x, lo * fr / SR, hi * fr / SR)
        else:
            e = split(off, next_on, q1) if q1 is not None else len(x)
        starts.append(max(0, s)); stops.append(min(len(x), e))
    ys = [fade(x[a:b].copy()) for a, b in zip(starts, stops)]
    # a take that starts or ends too close to its sound: pad the first/last line with silence to the margin (the
    # sound judged against the line's own peak, as speaker_check's EDGE/TIGHT test does: a quiet line's soft tail counts)
    for i, end in ((0, False), (len(ys) - 1, True)):
        yd = frame_db(ys[i], fr)
        if not len(yd):
            continue
        snd = np.nonzero(yd > yd.max() - 45)[0]
        pad = int(POST_MIN * SR) - (len(ys[i]) - (snd[-1] + 1) * fr) if end else int(PRE_MIN * SR) - snd[0] * fr
        if pad > 0:
            z = np.zeros(pad, np.float32)
            ys[i] = np.concatenate([ys[i], z] if end else [z, ys[i]])
    return ys


def fade(y):
    f = min(len(y) // 4, int(FADE * SR))
    if f:
        y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    return y


def cut_pauses(x, texts, hints=None):
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
                if hints and j < M and i < L and hints[i - 1] is not None:   # line i+1 starts at its first heard word
                    h, tol = hints[i - 1]
                    c += 20 * max(0.0, abs(segs[j][0] / SR - h) - tol) ** 2   # Whisper's starts run ~0.1-0.3 s late
                if c < best[i, j]:
                    best[i, j], arg[i, j] = c, k
    bounds, j = [], M
    for i in range(L, 0, -1):
        k = arg[i, j]; bounds.append((k, j - 1)); j = k
    return [padded(x, segs, k, e) for k, e in bounds[::-1]]


BREATH = 0.35   # s of quiet before a line's first sound kept at most (the in-breath)
TAIL = 0.45     # s after its last sound kept at most (the decay and any out-breath)
PRE_MIN = 0.08  # s kept at least before the first sound (owner: "cuts stuff off"; docs/stories.md)
POST_MIN = 0.20 # s kept at least after the last sound
FADE = 0.015    # s fade at each edge


def frame_db(x, fr=240):
    """10 ms frame RMS in dB."""
    n = len(x) // fr
    return 20 * np.log10(np.sqrt(np.mean(x[:n * fr].reshape(n, fr) ** 2, axis=1)) + 1e-9)


def soft_floor(db):
    """The level under which a frame is silence: 45 dB under the take's loud frames, but above its noise floor."""
    return max(np.percentile(db, 99) - 45, np.percentile(db, 5) + 6)


def padded(x, segs, k, e):
    """Line = speech stretches k..e and the quiet around them, cut safely (owner, 2026-11-10: "the voices seem to be
    edited in a way that cuts stuff off"): the line's first and last sound are found by level, not by the speech gate
    (which misses soft consonants, breaths and word tails), then each edge is cut at the pause's quiet point
    (quiet_point), keeping 80-350 ms before the first sound and 200-450 ms after the last, never past the
    neighbour's own first/last sound, with a 15 ms fade."""
    fr = 240
    db = frame_db(x, fr)
    floor = soft_floor(db)
    n = len(db)

    def onset(i):    # walk back from the gate's start while still above the floor
        f = min(n - 1, i // fr)
        while f > 0 and db[f - 1] > floor:
            f -= 1
        return f

    def offset(i):   # walk forward from the gate's end while still above the floor
        f = min(n - 1, max(0, i // fr - 1))
        while f + 1 < n and db[f + 1] > floor:
            f += 1
        return f + 1

    def valley(lo, hi):   # the quiet point of frames lo..hi (quiet_point: within 6 dB of the quietest, nearest the middle)
        lo, hi = max(0, int(lo)), min(n, int(hi))
        if hi <= lo:
            return lo
        return min(hi - 1, quiet_point(x, lo * fr / SR, hi * fr / SR) // fr)

    on, off = onset(segs[k][0] + 1200), offset(segs[e][1] - 2400)   # undo speech_segments' own padding
    prev_off = offset(segs[k - 1][1] - 2400) if k else 0
    next_on = onset(segs[e + 1][0] + 1200) if e + 1 < len(segs) else n
    pre, post, br, tl = (int(v * SR / fr) for v in (PRE_MIN, POST_MIN, BREATH, TAIL))
    lo = max(prev_off, on - br)
    a = valley(lo, on - pre) if on - pre > lo else valley(prev_off, on) if on > prev_off else on - pre
    hi = min(next_on, off + tl)
    b = valley(off + post, hi) + 1 if hi > off + post else valley(off, next_on) + 1 if next_on > off else off + post
    return fade(x[max(0, a * fr):min(len(x), b * fr)].copy())


def cap_pauses(y, cap, keep=0.06, xf=0.03):
    """Shorten every pause inside a line to `cap` s, only in its silent middle: never within `keep` (60 ms) of a
    sound, joined with a `xf` (30 ms) crossfade. A pause with no silent middle long enough is left alone (re-take
    the line instead). -> (y, [(at s, removed s)])"""
    fr = 240
    db = frame_db(y, fr)
    quiet = db <= soft_floor(db)
    k_fr, x_n = int(keep * SR / fr) + 1, int(xf * SR)
    runs, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if i > 0 and j < len(quiet):   # inside the line, not the edges
                runs.append((i, j))
            i = j
        else:
            i += 1
    out, done, last = [], [], 0
    for i, j in runs:
        if (j - i) * fr / SR <= cap:
            continue
        a, b = (i + k_fr) * fr, (j - k_fr) * fr        # the silent middle
        drop = int(((j - i) * fr / SR - cap) * SR)
        if b - a < drop + x_n:
            continue
        s0 = a + (b - a - drop) // 2                   # remove [s0, s0 + drop) from the middle, crossfaded
        out.append(y[last:s0]); last = s0 + drop
        done.append((round(s0 / SR, 2), round(drop / SR, 2)))
    if not done:
        return y, []
    out.append(y[last:])
    z = out[0]
    for seg in out[1:]:
        n = min(x_n, len(z), len(seg))
        w = np.linspace(0, 1, n, dtype=np.float32)
        z = np.concatenate([z[:len(z) - n], z[len(z) - n:] * (1 - w) + seg[:n] * w, seg[n:]])
    return z.astype(np.float32), done


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
    if model.startswith(BRACKET) and len(who) == 1:   # voices/recipes/pip.md: [profile], a blank line, the lines
        return f"[{cs[who[0]]['profile']}]\n\n" + "\n\n".join(body)
    if model.startswith(STRUCTURED):
        return ("# AUDIO PROFILE\n" + "\n".join(profiles) + "\n\n## THE SCENE\n" + (scene.strip() or "A quiet room.") +
                "\n\n### DIRECTOR'S NOTES\n" + "\n".join([REALISM, *notes, "Leave a natural pause between lines."]) +
                "\n\n#### TRANSCRIPT\n" + "\n".join(body))
    head = [scene.strip()] if scene else []
    head += [f"Read these lines as {cs[who[0]]['profile']}."] if len(who) == 1 else profiles
    head += [REALISM, *notes, "Leave a pause after every line."]
    return " ".join(head) + "\n\n" + "\n".join(body)


TAKE_MODEL = {}   # line id -> the model of its current take (voice.json lines[].model)


def allowed(who, cs):
    """The models a request may use: a character's lock (this story's voice.json `models`, else its cast `model`), the
    same for every speaker in the request; an unlocked request tries MODELS in order and locks what answers."""
    locks = {LOCK.get(w) or cs[w].get("model") for w in who} - {None}
    if len(locks) > 1:
        raise SystemExit(f"{who}: locked to different models {sorted(locks)}: voice them in separate requests (story `requests`)")
    return list(locks) or MODELS


def take(scene, lines, cs, salt=""):
    """Voice one request's lines [(who, id, text, note)] (at most 2 speakers) -> [float32 per line], cached.
    salt: a re-take's name ("retake1"): the same prompt, a new request and its own cache entry."""
    who = list(dict.fromkeys(w for w, _, _, _ in lines))
    if len(who) > 2:
        raise SystemExit(f"{[l for _, l, _, _ in lines]}: {len(who)} speakers in one request (Gemini takes 2)")
    voices = {cs[w]["name"]: cs[w]["voice"] for w in who}
    models = allowed(who, cs)
    # the cache key holds the model: a fallback model's take used to be cached under the first model's prompt and
    # came back later as if the first model had made it (cross-model drift nobody could see)
    key = lambda m: CACHE / f"{hashlib.sha1(json.dumps([prompt(scene, lines, cs, m), voices, m] + ([salt] if salt else [])).encode()).hexdigest()[:16]}.wav"
    hit = next((m for m in models if key(m).exists()), None)
    if hit:
        STATS["cached"] += 1
        model, raw = hit, key(hit)
        x = np.frombuffer(pcm(["-i", str(raw), "-f", "f32le", "-"]), np.float32)
    else:
        print(f"request: {', '.join(f'{k}={v}' for k, v in voices.items())}, {len(lines)} lines, model {' or '.join(models)}")
        x, model = request(lambda m: prompt(scene, lines, cs, m), voices, models)
        raw = key(model)
        CACHE.mkdir(parents=True, exist_ok=True)
        pcm(["-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(raw)], x.tobytes())
    for w in who:
        LOCK.setdefault(w, model)
    TAKE_MODEL.update({lid: model for _, lid, _, _ in lines})
    words = sum(len(t.split()) for _, _, t, _ in lines)
    if len(x) / SR > words / 1.5 + 2:   # slower than ~90 wpm: the direction was probably read aloud
        print(f"  WARNING: {len(x) / SR:.1f} s for {words} words: was the direction read aloud? listen to {raw}")
    return cut(x, [t for _, _, t, _ in lines])


def voice_lines(groups, cs, out, salt=""):
    """groups: [(scene, [(who, id, text, note)], room)] -> {id: (who, text, wav samples)}. room: a ROOMS key or ""
    (a 2-tuple, or a non-string third item, means the default small room). salt: a re-take's name (take())."""
    out.mkdir(parents=True, exist_ok=True)
    done = {}
    for g in groups:
        scene, lines = g[:2]
        room = g[2] if len(g) > 2 and isinstance(g[2], str) else "small"
        ys = level([shape(seg, cs[w].get("post", ""), room) for (w, _, _, _), seg in zip(lines, take(scene, lines, cs, salt))])
        for (w, lid, t, _), y in zip(lines, ys):
            pcm(["-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(out / f"{lid}.wav")], y.astype(np.float32).tobytes())
            done[lid] = (w, t, y)
            print(f"{lid:8s} {len(y) / SR:5.2f} s {f0(y):4d} Hz  {w}: {t}")
    return done


def spoken(t):
    """CAPS key words are for the captions: lower them for the voice (an all-caps word is read louder and flatter)."""
    return " ".join(w.lower() if sum(c.isalpha() for c in w) > 1 and w.isupper() else w for w in t.replace(" / ", " ").split())


def run_list(spec, out):
    """A request list. A request's own `speakers` ({name: Gemini voice}: the AI-dilemma and trailer voices.json) voices
    names that aren't in voices/cast.json; the request's `direction` describes them."""
    reqs = json.loads(spec.read_text())
    cs = library()
    for r in reqs:
        for name, v in (r.get("speakers") or {}).items():
            cs.setdefault(name, {"name": name, "voice": v, "profile": "the character the scene describes"})
    groups = [(r.get("direction", ""), [(w, lid, spoken(t), "") for w, lid, t in r["lines"]], r.get("room", "small")) for r in reqs]
    voice_lines(groups, cs, out)


def write(path, x):
    """A float32 mono line at SR to a file (scripts/cut_vox.py)."""
    pcm(["-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(path)], np.asarray(x, np.float32).tobytes())


def speaker_check(d, ids):
    """scripts/speaker_check.py on these lines (in the TTS venv) -> its report, or None when it can't run."""
    py = pathlib.Path.home() / ".hb-tts" / "bin" / "python"
    r = subprocess.run([str(py if py.exists() else sys.executable), str(ROOT / "scripts" / "speaker_check.py"), str(d),
                        "--json", "--only", ",".join(ids)], capture_output=True, text=True)
    try:
        return json.loads(r.stdout.strip().splitlines()[-1])
    except (IndexError, json.JSONDecodeError):
        print(f"speaker check didn't run ({(r.stderr or r.stdout).strip().splitlines()[-1:] or '?'}): listen to every line")
        return None


HARD = {"WORDS", "EDGE", "CLIPPED"}   # speaker_check flags a re-take can fix whatever the request (SWAP: multi-speaker only)


def retake(d, done, items, cs, n_max, prior=None, groups_of=None):
    """Check the lines just voiced; re-take the ones in the wrong voice or with the wrong words, at most n_max times
    each, always as a single-speaker request (one voice can't swap). Lines that pass are never re-taken. prior: the
    re-take each line already has (voice.json `take`), so a new run asks for a NEW take, not the cached bad one.
    -> {id: n}"""
    takes, ids = dict(prior or {}), list(done)
    solo = {lid for lid in done if takes.get(lid) or len({it[0] for it in (groups_of or {}).get(lid, [])}) == 1}
    for n in range(1, n_max + 1):
        rep = speaker_check(d, ids)
        if rep is None:
            break
        # a single-speaker take can't swap voices, so a re-taken line fails only on its words
        bad = [l for l in rep["lines"] if l["id"] in ids and (set(l["flags"]) & HARD or ("SWAP" in l["flags"] and l["id"] not in solo))]
        for l in rep["lines"]:
            if l["flags"]:
                print(f"  {l['id']}: {' '.join(l['flags'])} (closest {l['closest']}, margin {l['margin']}"
                      + (f", heard \"{l.get('heard', '')}\"" if "WORDS" in l["flags"] else "")
                      + (f", cut: {l.get('clipped')}" if "CLIPPED" in l["flags"] else "") + ")")
        if not bad:
            print(f"speaker check: {len(ids)} line(s) ok" + (f" after {n - 1} re-take round(s)" if n > 1 else ""))
            return takes
        ids = [l["id"] for l in bad]
        print(f"re-take {n}/{n_max}: {', '.join(ids)} (single-speaker)")
        for lid in ids:
            sc, it, rm = items[lid]
            k = takes.get(lid, 0) + 1
            done.update(voice_lines([(sc, [it], rm)], cs, d / "voice", f"retake{k}")); takes[lid] = k; solo.add(lid)
    rep = speaker_check(d, ids) if ids and set(ids) & set(takes) else None
    left = [l["id"] for l in (rep or {}).get("lines", []) if l["id"] in ids and set(l["flags"]) & HARD]
    if left:
        print(f"STILL WRONG after {n_max} re-takes: {', '.join(left)}: listen, then fix the line's text or "
              f"direction (or --retakes more); a swapped voice is a blocker")
    return takes


def drift_check(d, ids):
    """scripts/voice_drift.py on the story (the TTS venv) -> {line id: its report row} for these ids, or None."""
    py = pathlib.Path.home() / ".hb-tts" / "bin" / "python"
    r = subprocess.run([str(py if py.exists() else sys.executable), str(ROOT / "scripts" / "voice_drift.py"), str(d),
                        "--json", "--only", ",".join(ids)], capture_output=True, text=True)
    try:
        return {l["id"]: l for l in json.loads(r.stdout.strip().splitlines()[-1])["lines"]}
    except (IndexError, json.JSONDecodeError, KeyError):
        print(f"drift check didn't run ({(r.stderr or r.stdout).strip().splitlines()[-1:] or '?'}): listen for drift")
        return None


def drift_retake(d, done, items, cs, takes, n_max=2):
    """Re-take every line the drift gate blocks (a different-sounding person, or a voice that changes inside the take),
    at most n_max times, single-speaker on the character's locked model; then keep whichever take is closest (the
    gate's `drift`: 1.0 = the blocker line). -> takes {id: n}"""
    rows = drift_check(d, list(done))
    if rows is None:
        return takes
    bad = [lid for lid, r in rows.items() if lid in items and r.get("drift", 0) >= 1]
    for lid in bad:
        sc, it, rm = items[lid]
        cur = takes.get(lid, 0)
        tried = {cur: rows[lid]["drift"]}
        print(f"  {lid}: drift {rows[lid]['drift']} ({' '.join(rows[lid]['flags'])}): re-taking (max {n_max})")
        for _ in range(n_max):
            k = max(tried) + 1
            done.update(voice_lines([(sc, [it], rm)], cs, d / "voice", f"retake{k}"))
            row = (drift_check(d, [lid]) or {}).get(lid)
            tried[k] = row["drift"] if row else 9.0
            print(f"    take {k}: drift {tried[k]}")
            if tried[k] < 1:
                break
        best = min(tried, key=tried.get)
        if best != max(tried):   # the closest was an earlier take: put it back (from the cache)
            done.update(voice_lines([(sc, [it], rm)], cs, d / "voice", f"retake{best}" if best else ""))
        takes[lid] = best
        print(f"  {lid}: kept take {best} (drift {tried[best]})" + ("  STILL DRIFTS: a blocker, listen" if tried[best] >= 1 else ""))
    return {k: v for k, v in takes.items() if v}


def run_story(d, only=None, check=True, retakes=2, relock=None):
    sys.path.insert(0, str(ROOT / "scripts"))
    import voice   # the caption format (" / " chunks, CAPS lowered for speech) stays voice.py's
    story = json.loads((d / "story.json").read_text())
    cs = resolve(story.get("cast"))
    lib = library()
    for cid, c in (story.get("cast") or {}).items():   # a library character keeps its direction byte for byte
        if c.get("ref") in lib and c.get("profile") not in (None, lib[c["ref"]]["profile"]):
            print(f"WARNING: cast {cid} overrides {c['ref']}'s profile: a different direction is a different-sounding person")
    narrator = next((k for k, c in cs.items() if c.get("role") == "narrator"), "narrator")
    vf = d / "voice" / "voice.json"
    LOCK.update((json.loads(vf.read_text()).get("models") or {}) if vf.exists() else {})   # one model per character
    for cid, m in (relock or {}).items():   # move a character to another model: ALL of its lines are re-taken
        LOCK[cid] = m
        if only:
            only = list(only) + [ln["id"] for ln in story["lines"] if ln.get("who", narrator) == cid]
    reqs = story.get("requests") or []
    groups, cur, cur_req = [], [], None
    for ln in story["lines"]:
        if only and ln["id"] not in only:
            continue
        w = ln.get("who", narrator)
        r = next((r for r in reqs if w in r["speakers"]), None) if reqs else None
        item = (w, ln["id"], ln.get("say") or voice.spoken(ln), ln.get("direction", ""))
        solo = (LOCK.get(w) or cs[w].get("model") or "").startswith(BRACKET)   # Pip's model: single-speaker requests only
        if solo or (w != narrator and len(item[2].split()) <= SHORT_WORDS):   # narrator-first: a short character line goes alone
            g = next((g for g in groups if g[2] == ("solo", w) and len(g[1]) < MAX_LINES), None)
            g[1].append(item) if g else groups.append(((r or {}).get("direction", story.get("direction", "")), [item], ("solo", w)))
            continue
        if reqs:   # each line in the first request that lists its speaker
            if r is None:
                raise SystemExit(f"{ln['id']}: no request lists speaker {w}")
            g = next((g for g in groups if g[2] is r and len(g[1]) < MAX_LINES), None)
            g[1].append(item) if g else groups.append((r.get("direction", ""), [item], r))
            continue
        if cur and (len({x[0] for x in cur} | {w}) > 2 or len(cur) == MAX_LINES):
            groups.append((story.get("direction", ""), cur, None)); cur = []
        cur.append(item)
    if cur:
        groups.append((story.get("direction", ""), cur, None))
    old = json.loads(vf.read_text()) if vf.exists() else {"lines": {}}
    room = lambda r: (r if isinstance(r, dict) else {}).get("room", story.get("room", "small"))   # a solo group: the story's room
    done = voice_lines([(s, l, room(r)) for s, l, r in groups], cs, d / "voice")
    items = {it[1]: (sc, it, room(r)) for sc, l, r in groups for it in l}
    groups_of = {it[1]: l for _, l, _ in groups for it in l}
    takes = {}
    for lid, (sc, it, rm) in items.items():   # a line that passed on an earlier re-take keeps that take (from the cache)
        n = (old["lines"].get(lid) or {}).get("take", 0)
        if n and old["lines"][lid].get("text") == it[2]:
            done.update(voice_lines([(sc, [it], rm)], cs, d / "voice", f"retake{n}")); takes[lid] = n
    if check:
        takes = retake(d, done, items, cs, retakes, takes, groups_of)
    if check and done:   # the voices must stay the same people (owner, 2026-11-10); needs voice.json, written below
        _write_meta(d, story, voice, old, only, done, takes, groups_of)
        takes = drift_retake(d, done, items, cs, takes, retakes)
    _write_meta(d, story, voice, old, only, done, takes, groups_of)


def _write_meta(d, story, voice, old, only, done, takes, groups_of):
    vf = d / "voice" / "voice.json"
    mp = story.get("max_pause")   # seconds, or {"opening": s, "rest": s} (opening = the first two lines)
    if mp:
        first2 = [ln["id"] for ln in story["lines"][:2]]
        for lid, (w, t, y) in list(done.items()):
            cap = mp if isinstance(mp, (int, float)) else mp.get("opening" if lid in first2 else "rest")
            if cap:
                y2, cuts = cap_pauses(y, cap)
                if cuts:
                    pcm(["-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(d / "voice" / f"{lid}.wav")], y2.tobytes())
                    done[lid] = (w, t, y2)
                    print(f"{lid}: pauses shortened to {cap} s in their silent middle: {cuts}")
    meta = old if only else {"lines": {}}
    meta.update({"model": f"Gemini TTS ({MODELS[0]} first), voices/cast.json", "sr": SR, "gap": story.get("gap", 0.25),
                 "models": {**(old.get("models") or {}), **LOCK}})
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
                                   "captions": caps, "with": [w] if takes.get(ln["id"]) else sorted({it[0] for it in groups_of[ln["id"]]}),   # the request's speakers (speaker_check)
                                   "model": TAKE_MODEL.get(ln["id"]),
                                   **({"take": takes[ln["id"]]} if takes.get(ln["id"]) else {})}
    meta["lines"] = {ln["id"]: meta["lines"][ln["id"]] for ln in story["lines"] if ln["id"] in meta["lines"]}
    meta["total"] = round(sum(l["dur"] + meta["gap"] for l in meta["lines"].values()), 2)
    vf.write_text(json.dumps(meta, indent=1))


if __name__ == "__main__":
    a = sys.argv[1:]
    only = a[a.index("--only") + 1].split(",") if "--only" in a else None
    p = pathlib.Path(a[0])
    if p.is_dir():
        relock = dict(kv.split("=", 1) for kv in a[a.index("--relock") + 1].split(",")) if "--relock" in a else None
        run_story(p, only, check="--no-check" not in a, retakes=int(a[a.index("--retakes") + 1]) if "--retakes" in a else 2,
                  relock=relock)
    else:
        run_list(p, pathlib.Path(a[1]))
    print(f"{STATS['requests']} API request(s), {STATS['cached']} take(s) from the cache")
