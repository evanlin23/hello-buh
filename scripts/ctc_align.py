"""Forced alignment of a known script to a voice take: each word's start and end, from a CTC acoustic model and a
small numpy Viterbi (no torchaudio). This is where the captions' word times come from (scripts/align.py writes them
into voice/words.json; scripts/caption_av_check.py measures the finished Short against them).

    ~/.hb-tts/bin/python scripts/ctc_align.py <take.wav> "the script text"      print each word's start/end

Why not Whisper: Whisper-base's word timestamps come from cross-attention DTW and land anywhere from 0.3 s early to
0.2 s late per word (owner 2026-11-10: "Some of them are earlier, some of them are after"); it also splits and merges
words ("pork chops", "37"), so they can't be mapped to the caption words by index. A CTC aligner is given the exact
words, so it returns one time per caption word, in order. The models were compared on 38 hand-marked onsets
(docs/voices.md "Caption timing"): wav2vec2-base-960h (WhisperX's English aligner) ties MMS and beats wav2vec2-large at a
third of MMS's size, so it is MODEL.

Times: a CTC frame is 20 ms (320 samples at 16 kHz). A word's start is the first frame its first letter wins, plus
LAG[model]; for a word starting with a hiss (s, f, z, sh, soft c) the CTC spike comes 50-100 ms into the hiss, so the
start moves back to where the hiss begins (_fricative_onset).
"""
import json
import os
import re
import subprocess
import sys
import tempfile

import numpy as np

SR = 16000
HOP = 320 / SR                                   # s per CTC frame
MODEL = "facebook/wav2vec2-base-960h"            # the default (docs/voices.md "Caption timing": it measured best)
# s added to a word's first-letter frame to get its audible onset. Calibrated on 38 hand-marked onsets, 2026-11-10
# (docs/voices.md "Caption timing"): with the hiss refinement below, wav2vec2-base lands +6 ms from the marks on median (MMS -4 ms),
# under a frame, so no correction. (Without the refinement it was +18 ms, and s/f words up to 100 ms late.)
LAG = {"facebook/wav2vec2-base-960h": 0.0,
       "MahmoudAshraf/mms-300m-1130-forced-aligner": 0.0}
MIN_SCORE = -2.5   # mean log-prob of the letters' best frames under this: the take doesn't say the script (fallback)

_models = {}

ONES = ("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen "
        "seventeen eighteen nineteen").split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def say(n):
    """A whole number in words: 31 -> "thirty one", 9000 -> "nine thousand", 1998 -> "nineteen ninety eight"."""
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    if 1100 <= n <= 2099 and n % 100 and not 2000 <= n < 2010:   # years: "nineteen ninety eight", "twenty twenty six"
        return say(n // 100) + " " + say(n % 100)
    for size, name in ((10 ** 9, "billion"), (10 ** 6, "million"), (1000, "thousand"), (100, "hundred")):
        if n >= size:
            rest = n % size
            return say(n // size) + " " + name + ("" if rest == 0 else " " + say(rest))
    return str(n)


def spoken_words(token):
    """What a caption token sounds like, as lowercase words of letters and apostrophes: "31" -> ["thirty", "one"],
    "9,000" -> ["nine", "thousand"], "DON'T," -> ["don't"], "&" -> ["and"], "50%" -> ["fifty", "percent"],
    "thirty-seven" -> ["thirty", "seven"]. [] for a token with nothing to say ("—")."""
    t = token.lower().replace("’", "'").replace("&", " and ").replace("%", " percent ")
    t = re.sub(r"(?<=\d),(?=\d{3})", "", t)
    t = re.sub(r"(\d+)(st|nd|rd|th)\b", r"\1", t)
    t = re.sub(r"\d+", lambda m: " " + say(int(m.group())) + " ", t)
    t = re.sub(r"[^a-z']+", " ", t)
    return [w.strip("'") for w in t.split() if w.strip("'")]


def letters(token):
    """The token's letters, numbers spelled out, as one string ("31" -> "thirtyone"): for matching by text."""
    return "".join(spoken_words(token)).replace("'", "")


def match_words(tokens, heard):
    """Map caption tokens onto timed words by their letters, not by index: [(start, end) or None per token].
    heard: [[word, start, end]] (voice/words.json: the aligner's caption words, or Whisper's own words, which split and
    merge them: "porkchops" / "pork chops", "37" / "thirty-seven"). Both sides are spelled out ("31" -> "thirtyone"),
    joined, and matched letter by letter (difflib); a token starts where its first matched letter is said, inside a
    merged word by its share of that word's letters. Tokens with no matched letter get None (the caller spreads them)."""
    import difflib
    merged = []   # Whisper writes 9,000 as "9" ",000": one number again before spelling it
    for w, a, b in heard:
        if merged and re.match(r"^[,.]\d", str(w)) and re.search(r"\d$", str(merged[-1][0])):
            merged[-1] = [merged[-1][0] + w, merged[-1][1], b]
        else:
            merged.append([w, a, b])
    heard = merged
    hs, hk = [], []   # heard letters, and for each: (heard word index, letter index in it, letters in it)
    for j, (w, _, _) in enumerate(heard):
        lw = letters(w)
        for i, ch in enumerate(lw):
            hs.append(ch); hk.append((j, i, len(lw)))
    ts, tk = [], []
    for k, t in enumerate(tokens):
        for i, ch in enumerate(letters(t)):
            ts.append(ch); tk.append((k, i))
    at = {}
    for blk in difflib.SequenceMatcher(None, ts, hs, autojunk=False).get_matching_blocks():
        for n in range(blk.size):
            at[blk.a + n] = blk.b + n
    out = [None] * len(tokens)
    first, last = {}, {}
    for p, (k, _) in enumerate(tk):
        if p in at:
            first.setdefault(k, at[p]); last[k] = at[p]
    def when(q, edge):
        j, i, n = hk[q]
        a, b = float(heard[j][1]), float(heard[j][2])
        return a + (b - a) * (i + edge) / n
    for k in range(len(tokens)):
        if k in first:
            out[k] = (when(first[k], 0), when(last[k], 1))
    return out


def load(model=MODEL):
    if model not in _models:
        import torch
        import transformers
        from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
        transformers.logging.set_verbosity_error()
        try:
            transformers.utils.logging.disable_progress_bar()
        except Exception:
            pass
        torch.set_num_threads(max(1, min(8, torch.get_num_threads())))
        try:
            proc = Wav2Vec2Processor.from_pretrained(model)
        except Exception:   # an aligner checkpoint with only a tokenizer + feature extractor config
            from transformers import AutoFeatureExtractor, AutoTokenizer
            proc = (AutoFeatureExtractor.from_pretrained(model), AutoTokenizer.from_pretrained(model))
        m = Wav2Vec2ForCTC.from_pretrained(model).eval()
        _models[model] = (proc, m)
    return _models[model]


def read16k(wav):
    """16 kHz mono float32 samples of a file (or an array, returned as is)."""
    if isinstance(wav, np.ndarray):
        return wav.astype(np.float32)
    return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(wav), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                        capture_output=True, check=True).stdout, np.float32).copy()


def emissions(x, model=MODEL):
    """(log-probs [frames, vocab], vocab {char: id}, blank id) for 16 kHz samples x."""
    import torch
    proc, m = load(model)
    fe, tok = proc if isinstance(proc, tuple) else (proc.feature_extractor, proc.tokenizer)
    pad = np.zeros(int(0.1 * SR), np.float32)   # a little air on both ends: a word cut at the edge still gets frames
    inp = fe(np.concatenate([pad, x, pad]), sampling_rate=SR, return_tensors="pt").input_values
    with torch.inference_mode():
        lp = torch.log_softmax(m(inp).logits[0].float(), -1).numpy()
    vocab = tok.get_vocab()
    blank = vocab["<blank>"] if "<blank>" in vocab else tok.pad_token_id if tok.pad_token_id is not None else 0   # (MMS: <blank> 0, <pad> 1)
    return lp, vocab, blank, len(pad) / SR


def _char_ids(word, vocab):
    out = []
    for ch in word:
        for c in (ch, ch.upper(), ch.lower()):
            if c in vocab:
                out.append(vocab[c]); break
    return out


def viterbi(lp, groups, blank, sep=None):
    """CTC forced alignment. groups: one list of token ids per word. The word separator `sep` (wav2vec2's "|") may sit
    between words or not. -> ([(first frame, last frame + 1) per word], mean log-prob of the path's letter frames)."""
    ext, word_of, first_of, last_of = [blank], [-1], [], []   # extended states: blank, c, blank, c, ... (+ optional sep)
    pred = [[0]]
    for wi, g in enumerate(groups):
        if wi and sep is not None:
            prev_last = len(ext) - 1   # the blank after the previous word's last letter
            ext += [sep, blank]; word_of += [-1, -1]
            pred.append([len(ext) - 2, len(ext) - 3, len(ext) - 4])   # sep: stay, from the blank, from the last letter
            pred.append([len(ext) - 1, len(ext) - 2])                    # the blank after sep
        for ci, c in enumerate(g):
            s = len(ext)
            p = [s, s - 1]
            if ext[s - 2] != c if s >= 2 else False:
                p.append(s - 2)
            if ci == 0 and wi and sep is not None:   # skip the separator: from the previous word's last letter/blank
                p += [prev_last, prev_last - 1]
            ext.append(c); word_of.append(wi); pred.append(p)
            if ci == 0:
                first_of.append(s)
            ext.append(blank); word_of.append(-1); pred.append([s + 1, s])
        last_of.append(len(ext) - 2)
    S, T = len(ext), lp.shape[0]
    if T < sum(len(g) for g in groups):
        return None, -99.0
    P = max(len(p) for p in pred)
    pidx = np.full((S, P), -1, np.int64)
    for s, p in enumerate(pred):
        pidx[s, :len(p)] = p
    valid = pidx >= 0
    pidx_c = np.where(valid, pidx, 0)
    e = lp[:, ext]                                    # [T, S]
    dp = np.full(S, -np.inf)
    dp[0], dp[1] = e[0, 0], e[0, 1]
    back = np.zeros((T, S), np.int64)
    for t in range(1, T):
        cand = np.where(valid, dp[pidx_c], -np.inf)    # [S, P]
        k = np.argmax(cand, 1)
        back[t] = pidx_c[np.arange(S), k]
        dp = cand[np.arange(S), k] + e[t]
    s = S - 1 if dp[S - 1] >= dp[S - 2] else S - 2
    path = np.zeros(T, np.int64)
    for t in range(T - 1, -1, -1):
        path[t] = s
        s = back[t, s]
    spans, scores = [], []
    word_arr = np.array(word_of)[path]
    for wi in range(len(groups)):
        fr = np.nonzero(word_arr == wi)[0]
        spans.append((int(fr[0]), int(fr[-1]) + 1) if len(fr) else None)
    is_char = np.array(word_of)[path] >= 0
    score = float(e[np.arange(T), path][is_char].mean()) if is_char.any() else -99.0
    return spans, score


REFINE = True
FRICATIVE = re.compile(r"^(s|f|z|sh|c[eiy])")   # words whose CTC start lands late in the hiss (hand-marked onsets)
FR_HOP = 0.005


def _fricative_frames(x):
    """Per 5 ms: is this frame a hiss (an unvoiced fricative)? More energy above 2.5 kHz than under 1 kHz, and the
    frame 15 dB over the take's quiet floor."""
    n, hop = 320, int(FR_HOP * SR)
    if len(x) < n:
        return np.zeros(0, bool)
    k = (len(x) - n) // hop + 1
    fr = np.stack([x[i * hop: i * hop + n] for i in range(k)]) * np.hanning(n)
    sp = np.abs(np.fft.rfft(fr, axis=1)) ** 2
    f = np.fft.rfftfreq(n, 1 / SR)
    hi, lo = sp[:, f >= 2500].sum(1) + 1e-12, sp[:, f < 1000].sum(1) + 1e-12
    db = 10 * np.log10(sp.sum(1) + 1e-12)   # the frame's loudness, over the take's quietest tenth
    return (hi > lo) & (db > np.percentile(db, 10) + 15)


def _fricative_onset(fr, t, floor):
    """Move a fricative-initial word's start back to where its hiss begins: the CTC spike comes 50-100 ms into an
    s or an f (Somebody, from, SAFE, fight: hand-marked onsets, docs/voices.md "Caption timing"). The hiss must touch the CTC start
    (within 40 ms after it); at most 250 ms back, and never before `floor`."""
    k0 = int(round(t / FR_HOP))
    if k0 >= len(fr):
        return t
    hit = next((k for k in range(k0, min(len(fr), k0 + 9)) if fr[k]), None)
    if hit is None:
        return t
    k = hit
    lo = max(int(np.ceil(floor / FR_HOP)), k0 - 50, 0)
    while k - 1 >= lo and (fr[k - 1] or (k - 2 >= lo and fr[k - 2])):   # (a single 5 ms dropout doesn't end it)
        k -= 1
    return min(t, max(floor, k * FR_HOP))


def greedy_letters(lp, vocab, blank):
    """What the acoustic model itself hears, best frame by best frame: the collapsed CTC path's letters, lowercase,
    with no blanks, word separators or apostrophes ("MOM|SAYY_SS" -> "momsays")."""
    inv = {v: k for k, v in vocab.items()}
    out, prev = [], None
    for i in np.asarray(lp).argmax(1):
        if i != prev and i != blank:
            ch = inv.get(int(i), "")
            if len(ch) == 1 and ch.isalpha():
                out.append(ch.lower())
        prev = i
    return "".join(out)


def fits(score, lp, groups, vocab, blank):
    """Does the take say the script? The mean letter log-prob over MIN_SCORE, or, for a take whose mean is dragged under
    it by a few weak frames (a 2-word lead-in like "Mom says:" scored -2.87: too few letters to average out one soft
    vowel), the model's own greedy reading spelling exactly the script's letters. A take that says something else never
    passes the second test, so this only rescues takes the model already hears correctly."""
    if score >= MIN_SCORE:
        return True
    if score < -99 + 1:
        return False
    inv = {v: k for k, v in vocab.items()}
    want = "".join(inv.get(i, "") for g in groups for i in g).lower().replace("'", "")
    return bool(want) and greedy_letters(lp, vocab, blank) == want


def align(wav, tokens, model=MODEL):
    """[(token, start s, end s)] for each caption token of a take, or None when the take doesn't fit the words.
    tokens: the caption words, in order (punctuation and CAPS as displayed)."""
    x = read16k(wav)
    lp, vocab, blank, pad = emissions(x, model)
    groups, owner = [], []
    for i, tk in enumerate(tokens):
        for w in spoken_words(tk):
            ids = _char_ids(w, vocab)
            if ids:
                groups.append(ids); owner.append(i)
    if not groups:
        return None
    sep = vocab.get("|")
    spans, score = viterbi(lp, groups, blank, sep)
    if spans is None or not fits(score, lp, groups, vocab, blank):
        return None
    lag = LAG.get(model, 0.0)
    dur = len(x) / SR
    out = [[tk, None, None] for tk in tokens]
    for sp, i in zip(spans, owner):
        if sp is None:
            continue
        a, b = sp
        t0, t1 = max(0.0, a * HOP - pad + lag), min(dur, b * HOP - pad)
        if out[i][1] is None:
            out[i][1] = t0
        out[i][2] = t1
    if REFINE:
        fr = _fricative_frames(x)
        for i, o in enumerate(out):
            if o[1] is not None and FRICATIVE.match(letters(tokens[i])):
                floor = out[i - 1][1] + 0.08 if i and out[i - 1][1] is not None else 0.0
                o[1] = _fricative_onset(fr, o[1], floor)
    for i, o in enumerate(out):   # a token with nothing to say: on the next word (or after the last)
        if o[1] is None:
            nxt = next((p[1] for p in out[i + 1:] if p[1] is not None), None)
            o[1] = nxt if nxt is not None else (out[i - 1][2] if i else 0.0)
            o[2] = o[1]
    for i in range(1, len(out)):   # in order
        out[i][1] = max(out[i][1], out[i - 1][1])
        out[i][2] = max(out[i][2], out[i][1])
    return [(w, round(a, 3), round(b, 3)) for w, a, b in out]


TTS_PY = os.path.expanduser("~/.hb-tts/bin/python")   # the venv with torch + transformers (./hb doctor)


def align_batch(items, model=MODEL):
    """[align(wav, tokens) for (wav, tokens) in items], from any Python: in this process when torch is importable,
    else through the TTS venv (one model load for the whole batch). wav: a file, or 16 kHz float32 samples."""
    try:
        import torch  # noqa: F401
        import transformers  # noqa: F401
        return [align(w, t, model) for w, t in items]
    except ImportError:
        pass
    if not os.path.exists(TTS_PY):
        raise ImportError(f"no torch here and no TTS venv at {TTS_PY} (./hb doctor)")
    with tempfile.TemporaryDirectory(prefix="hb-ctc-") as td:
        jobs = []
        for i, (w, t) in enumerate(items):
            if isinstance(w, np.ndarray):
                p = os.path.join(td, f"{i}.f32")
                w.astype(np.float32).tofile(p)
                w = p
            jobs.append([str(w), list(t)])
        jf = os.path.join(td, "jobs.json")
        json.dump({"model": model, "jobs": jobs}, open(jf, "w"))
        r = subprocess.run([TTS_PY, os.path.abspath(__file__), "--batch", jf], capture_output=True, text=True)
        if r.returncode:
            raise RuntimeError(f"ctc_align --batch failed: {r.stderr.strip().splitlines()[-1:]}")
        return json.loads(r.stdout.strip().splitlines()[-1])


if __name__ == "__main__":
    args = sys.argv[1:]
    mdl = args[args.index("--model") + 1] if "--model" in args else MODEL
    if args[0] == "--batch":
        spec = json.load(open(args[1]))
        res = []
        for w, t in spec["jobs"]:
            x = np.fromfile(w, np.float32) if w.endswith(".f32") else w
            res.append(align(x, t, spec.get("model", MODEL)))
        print(json.dumps(res))
        sys.exit(0)
    for w, a, b in align(args[0], args[1].split(), mdl) or []:
        print(f"{a:7.3f} {b:7.3f}  {w}")
