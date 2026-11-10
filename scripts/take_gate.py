"""The take gate for continuous takes (docs/STANDARDS.md 2b.4; owner, 2026-11-10: "instead we should be ensuring the
voice we get back is all like continuous already without the stuff we dont want"). A beat's take is used whole, so
nothing in it can be trimmed out afterwards: a take with a long pause, a loud breath, a whispered stretch, the wrong
words or a clipped edge is REJECTED here and re-requested with a tightened direction (scripts/tts.py `voice_beat`).

Pure numpy on one take (float32 mono at `sr`) and Whisper's words for it ([(word, start s, end s)], scripts/align.py);
no model is loaded here, so the tests can feed it synthetic audio.

    gate(y, sr, texts, heard, bounds, limits, raw=None, opening=False) -> {"ok", "fails": [...], "fix": [...]}

What fails (each a dict with `kind`, `at` s, `len` s, `why`):
  pause    a silence (every 10 ms frame under the take's peak - 30 dB, pace.py's measure) inside the speech longer than
           the limit: inside a line `inside` s, between two lines `between` s; in the story's opening (the first
           OPEN_S s of the first beat) pace.py's blockers: 0.2 s inside line 1, 0.35 inside a line, 0.6 between.
  breath   an unvoiced stretch of noise (no pitch; spectral centroid under 4 kHz, so not an "s" or "t") of BREATH_MIN s
           or more, above the silence line (peak - 30 dB) but under any word (peak - 15), not straight after a word:
           an audible gasp. A softer in-breath sits under the silence line and counts as part of its pause.
  whisper  WHISPER_MIN s or more of sound in a run of Whisper's words with almost no voicing (under 20% of their sound
           frames pitched) or 14 dB under the take's median word level.
  words    Whisper vs the script: under WORDS_MATCH of the letters alike, a line with under half its words heard, or a
           run of EXTRA_RUN words the script doesn't have (a direction read aloud); also a line edge Whisper can't place.
  clipped  the raw take's first or last 20 ms within 30 dB of its peak (speaker_check's EDGE test): Gemini cut a word.
"""
import difflib
import re

import numpy as np

FR = 0.01           # s, analysis frame
SILENT_DB = 30      # a frame this far under the take's peak is silence (pace.py)
OPEN_S = 5.0        # s: the story's opening, where pace.py blocks any pause (owner: "no pauses in the first few seconds")
LIMITS = {          # longest pause allowed, s (story.json "max_pause" overrides: a number, or {"opening", "rest"})
    "opening": {"first": 0.2, "inside": 0.35, "between": 0.6},   # pace.py's BLOCK thresholds
    "rest": {"inside": 0.3, "between": 0.35},                    # owner 2026-11-10 "the narrator just yaps on and on": the
    # reference Short has 194 of 195 word gaps under 0.3 s (sentence ends: median ~0, p90 0.1 s, max 0.3)
}
BREATH_MIN, BREATH_DB, BREATH_TOP = 0.15, SILENT_DB, 15   # louder than the silence line, never as loud as a word
BREATH_CENTROID = 4000   # Hz: an "s"/"sh" sits above it, a breath (and an "h") below
WHISPER_MIN, WHISPER_VOICED, WHISPER_DB = 0.5, 0.2, 14
WORDS_MATCH, EXTRA_RUN = 0.75, 3
FIX = {   # the line added to the direction when a take fails this way (scripts/tts.py `prompt(..., fixes)`)
    "pause": "one continuous take, no pauses between sentences",
    "breath": "no audible breaths",
    "whisper": "full voice throughout, never whispering",
    "words": "read every word exactly as written, nothing added or skipped",
    "clipped": "say every word fully, from the first to the last",
}


def frame_db(y, sr, fr=FR):
    n = int(sr * fr)
    m = len(y) // n
    return 20 * np.log10(np.sqrt(np.mean(np.asarray(y[:m * n], np.float64).reshape(m, n) ** 2, axis=1)) + 1e-9)


def voiced(y, sr, fr=FR):
    """Per 10 ms frame: True where a clear pitch (60-500 Hz) is present (normalised autocorrelation over 40 ms, > 0.5)."""
    n, w = int(sr * fr), int(sr * 0.04)
    m = len(y) // n
    out = np.zeros(m, bool)
    lo, hi = sr // 500, sr // 60
    for i in range(m):
        f = np.asarray(y[i * n:i * n + w], np.float64)
        if len(f) < w:
            break
        f = f - f.mean()
        if float(np.dot(f, f)) < 1e-8:
            continue
        ac = np.correlate(f, f, "full")[w - 1:]
        e = np.cumsum(f[::-1] ** 2)[::-1]           # energy of f[k:]
        nrm = ac[lo:hi] / np.sqrt(e[0] * e[lo:hi] + 1e-12)
        out[i] = nrm.max() > 0.5
    return out


def centroid(y, sr, a, b):
    """Spectral centroid (Hz) of samples a..b."""
    s = np.abs(np.fft.rfft(y[a:b] * np.hanning(b - a)))
    f = np.fft.rfftfreq(b - a, 1 / sr)
    return float((s * f).sum() / (s.sum() + 1e-12))


def runs(mask):
    """[(start, end)] of the True runs of a boolean array."""
    out, i, n = [], 0, len(mask)
    while i < n:
        if mask[i]:
            j = i
            while j < n and mask[j]:
                j += 1
            out.append((i, j))
            i = j
        else:
            i += 1
    return out


def pauses(y, sr, min_len=0.2):
    """[(at s, len s)]: silences (every frame under peak - SILENT_DB) between the first and last sound."""
    db = frame_db(y, sr)
    if not len(db):
        return []
    snd = np.nonzero(db > db.max() - SILENT_DB)[0]
    if len(snd) < 2:
        return []
    q = db[snd[0]:snd[-1] + 1] <= db.max() - SILENT_DB
    return [((snd[0] + a) * FR, (b - a) * FR) for a, b in runs(q) if (b - a) * FR >= min_len - 1e-9]


def norm(t):
    return re.sub(r"[^a-z0-9]", "", t.lower())


ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def spelled(t):
    """A token as words (Whisper writes "31" for "thirty-one"): ["thirty", "one"]."""
    def say(n):
        if n < 20:
            return [ONES[n]]
        if n < 100:
            return [TENS[n // 10]] + ([ONES[n % 10]] if n % 10 else [])
        if n < 1000:
            return [ONES[n // 100], "hundred"] + (say(n % 100) if n % 100 else [])
        return [str(n)]
    out = []
    for p in re.split(r"[\s\-]+", t.lower()):
        for q in re.findall(r"\d+|[a-z']+", p):
            out += say(int(q)) if q.isdigit() else [norm(q)]
    return [w for w in out if w]


def word_map(texts, heard):
    """Match the script's words to Whisper's: (script words, the line of each, heard words (spelled), the `heard` index
    of each heard word, the `heard` index matched to each script word or None). Numbers are spelled so "31" meets
    "thirty-one"."""
    sw, owner, hw, hidx = [], [], [], []
    for i, t in enumerate(texts):
        for w in t.split():
            for s in spelled(w):
                sw.append(s); owner.append(i)
    for k, (w, _, _) in enumerate(heard):
        for s in spelled(w):
            hw.append(s); hidx.append(k)
    m = [None] * len(sw)
    for blk in difflib.SequenceMatcher(None, sw, hw, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            m[blk.a + k] = hidx[blk.b + k]
    return sw, owner, hw, hidx, m


def words_check(texts, heard):
    """[fail dicts] for the words: the whole take's letters alike, every line heard, no run of extra words."""
    fails = []
    sw, owner, hw, hidx, m = word_map(texts, heard)
    ratio = difflib.SequenceMatcher(None, "".join(sw), "".join(hw), autojunk=False).ratio() if sw else 0.0
    if ratio < WORDS_MATCH:
        fails.append({"kind": "words", "at": 0.0, "len": 0.0, "why": f"Whisper heard only {ratio:.0%} of the script ({' '.join(w for w, _, _ in heard)[:120]!r})"})
    for i, t in enumerate(texts):
        mine = [k for k, o in enumerate(owner) if o == i]
        got = sum(m[k] is not None for k in mine)
        if mine and got < len(mine) / 2:
            fails.append({"kind": "words", "at": 0.0, "len": 0.0, "why": f"line {i + 1} not heard ({got}/{len(mine)} words): {t!r}"})
    sm = difflib.SequenceMatcher(None, sw, hw, autojunk=False)
    for op, _, _, j1, j2 in sm.get_opcodes():
        if op == "insert" and j2 - j1 >= EXTRA_RUN:   # a replace is Whisper mishearing; a run of new words is not
            at = heard[hidx[j1]][1]
            fails.append({"kind": "words", "at": round(at, 2), "len": 0.0, "why": f"extra words {' '.join(hw[j1:j2])!r} (a direction read aloud?)"})
    return fails


def breaths(y, sr):
    """[(at s, len s)]: audible breaths (see the module doc)."""
    db = frame_db(y, sr)
    if not len(db):
        return []
    pk = db.max()
    v = voiced(y, sr)[:len(db)]
    db = db[:len(v)]
    loud = db > pk - BREATH_DB
    n = int(sr * FR)
    out = []
    # an unvoiced stretch that is loud enough, between silences or right before voicing (the in-breath) but not
    # right after voicing (a word's own unvoiced tail: "...his courAGE", "...the hill-s")
    for a, b in runs(loud & ~v):
        if (b - a) * FR < BREATH_MIN - 1e-9:
            continue
        if a > 0 and v[max(0, a - 2):a].any():   # follows a voiced frame directly: the end of a word
            continue
        if db[a:b].max() > pk - BREATH_TOP:      # as loud as speech: a word the pitch tracker missed, not a breath
            continue
        if np.median([centroid(y, sr, k * n, (k + 2) * n) for k in range(a, b - 1)]) >= BREATH_CENTROID:
            continue                              # an "s", "sh", "t": high, hissy
        out.append((round(a * FR, 2), round((b - a) * FR, 2)))
    return out


def whispers(y, sr, heard):
    """[(at s, len s)]: runs of Whisper's words that are unvoiced or far quieter than the take's words."""
    db = frame_db(y, sr)
    v = voiced(y, sr)
    if not heard or not len(db):
        return []
    lv, vf, ns = [], [], []
    pk = db.max()
    for _, a, b in heard:
        i, j = int(a / FR), max(int(a / FR) + 1, int(b / FR))
        seg = db[i:j]
        lv.append(float(np.percentile(seg, 90)) if len(seg) else -120.0)
        snd = np.nonzero(seg > pk - SILENT_DB)[0] + i   # Whisper's word spans hold pauses: judge the sound only
        snd = snd[snd < len(v)]
        vf.append(float(v[snd].mean()) if len(snd) else 0.0)
        ns.append(len(snd) * FR)
    ref = float(np.median(lv))
    bad = [(f < WHISPER_VOICED or l < ref - WHISPER_DB) for f, l in zip(vf, lv)]
    out = []
    for a, b in runs(np.array(bad)):
        if sum(ns[a:b]) >= WHISPER_MIN - 1e-9:   # seconds of sound, not of Whisper's loose word spans
            out.append((round(heard[a][1], 2), round(sum(ns[a:b]), 2)))
    return out


def clipped(raw, sr):
    """(head dB, tail dB) of the raw take's first/last 20 ms against its peak; within -30 = a word cut by the model."""
    db = frame_db(raw, sr)
    if len(db) < 4:
        return 0.0, 0.0
    return float(db[:2].max() - db.max()), float(db[-2:].max() - db.max())


def limits_for(max_pause=None):
    """The pause limits, with story.json's `max_pause` (s, or {"opening": s, "rest": s}) on top."""
    lim = {k: dict(v) for k, v in LIMITS.items()}
    if isinstance(max_pause, (int, float)):
        for k in lim:
            lim[k].update({p: max_pause for p in lim[k]})
    elif isinstance(max_pause, dict):
        for k in ("opening", "rest"):
            if max_pause.get(k):
                lim[k].update({p: max_pause[k] for p in lim[k] if p != "first"})
    return lim


def gate(y, sr, texts, heard, bounds, limits=None, raw=None, opening=False):
    """Judge one beat's take (already trimmed and shaped: what the viewer hears). bounds: the take's line boundaries
    in s (len(texts) - 1 of them; None when Whisper couldn't place them: a words fail). opening: the beat opens the
    story (pace.py's opening rules apply to its first OPEN_S s). -> {"ok", "fails", "fix"}"""
    lim = limits or limits_for()
    fails = []
    if bounds is None:
        fails.append({"kind": "words", "at": 0.0, "len": 0.0, "why": "a line edge Whisper can't place (a line dropped or run together)"})
        bounds = []
    edges = [0.0, *bounds, len(y) / sr]
    for at, ln in pauses(y, sr):
        mid = at + ln / 2
        line = next((i for i in range(len(texts)) if edges[i] <= mid < edges[i + 1]), len(texts) - 1)
        # between lines: the pause holds a boundary (or ends within 0.1 s of one: the boundary is its quiet point)
        between = any(at - 0.1 <= b <= at + ln + 0.1 for b in bounds)
        if opening and at < OPEN_S:
            cap = lim["opening"]["between"] if between else lim["opening"]["first"] if line == 0 else lim["opening"]["inside"]
        else:
            cap = lim["rest"]["between" if between else "inside"]
        if ln > cap + 1e-9:
            fails.append({"kind": "pause", "at": round(at, 2), "len": round(ln, 2),
                          "why": f"{ln:.2f} s pause {'between lines ' + str(line) + '-' + str(line + 1) if between else 'inside line ' + str(line + 1)} (limit {cap} s{', the opening' if opening and at < OPEN_S else ''})"})
    for at, ln in breaths(y, sr):
        fails.append({"kind": "breath", "at": at, "len": ln, "why": f"an audible breath ({ln:.2f} s)"})
    for at, ln in whispers(y, sr, heard):
        fails.append({"kind": "whisper", "at": at, "len": ln, "why": f"{ln:.2f} s whispered or dropped far under the take"})
    fails += words_check(texts, heard)
    if raw is not None:
        h, t = clipped(raw, sr)
        for name, v in (("start", h), ("end", t)):
            if v > -30:
                fails.append({"kind": "clipped", "at": 0.0 if name == "start" else round(len(raw) / sr, 2), "len": 0.0,
                              "why": f"the take's {name} is cut ({v:.0f} dB from its peak in the last 20 ms)"})
    fix = list(dict.fromkeys(f["kind"] for f in fails))
    return {"ok": not fails, "fails": fails, "fix": fix}


def score(res):
    """Lower is better: for keeping the least bad take when every try fails."""
    w = {"words": 100, "clipped": 50, "whisper": 20, "breath": 5, "pause": 3}
    return sum(w[f["kind"]] + f.get("len", 0) for f in res["fails"])
