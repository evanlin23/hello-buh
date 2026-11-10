"""Does each character still sound like the same person? (docs/voices.md "Drift gate")

Owner, 2026-11-10: "i think gemini is really bad with the voices drifting. can you ensure theres a gate or some way to
audit this? The voices for the people seem to change like all the time take to take and even within take."

    ~/.hb-tts/bin/python scripts/voice_drift.py stories/<name>            # table + verdict; exit 1 on a blocker
    ~/.hb-tts/bin/python scripts/voice_drift.py stories/<name> --json     # one JSON object (tts.py's re-take hook)
    ~/.hb-tts/bin/python scripts/voice_drift.py stories/<name> --only L03,L07
    ~/.hb-tts/bin/python scripts/voice_drift.py --make-refs               # rebuild voices/refs/*.json from refs.json
    ./hb drift <name>                                                     # the same, from the CLI

What it measures, for every line AND every 1.5 s window inside a line (hop 0.75 s):
  emb    a speaker embedding (Resemblyzer's GE2E encoder, the one scripts/speaker_check.py uses: 17 MB, CPU)
  f0     median pitch (YIN, 60-600 Hz, voiced frames only)
  cent   spectral centroid of the loud frames (brightness), and tilt (dB per octave, 150 Hz-7 kHz)
  fmt    mean of the median F1-F3 (LPC): the vocal tract length, the thing a different person changes most
  rate   words per second of speaking time (lines only)

Each is compared with:
  the REFERENCE    voices/refs/<character>.json: the take the owner approved (or the library sample), made by
                   --make-refs from voices/refs/refs.json. A story cast member finds its reference by `ref`, else by
                   its Gemini voice; a Kokoro story (v1) has no reference and is checked against itself.
  the CHARACTER    the median of the character's own lines in this story (take-to-take drift)
  the LINE         the line's own mean (within-take drift: a window that turns into someone else)

The distances go into one drift score per comparison, in "noise units": each term divided by the spread measured on
known-good material (calibration below), combined as a root mean square with the embedding weighted double, so
1.0 = as different as two good lines of one character usually are. Flags:

  DRIFT     a line's score against its character's other lines >= BLOCK (take-to-take) - a blocker
  OFFREF    a line's score against the reference >= BLOCK_REF - a blocker (the character is not the approved voice)
  WOBBLE    a window's score against its own line >= BLOCK_WIN - a blocker (the voice changes inside the take)
  (lower case: warn / offref / wobble at the WARN levels: listen to it)
  SPREAD    the character's pitch range across lines is wider than SPREAD_ST semitones after acting is allowed for
            (a warning; Good Boy's narrator ran 89-128 Hz)

Calibration (2026-11-10, docs/voices.md "Drift gate"): good = Dog on the Hill v3 Pip (owner-approved), Good Boy's
newest Puck, runaway and the other Kokoro stories (one voice, perfectly consistent); bad = Good Boy's first Gemini
take (Puck directed hushed, mixed models), the L06 "SIT." swap, Dog on the Hill with an Erinome take among the Leda
ones. Thresholds sit between the worst good and the best bad line.
"""
import json
import pathlib
import subprocess
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
REFS = ROOT / "voices" / "refs"
SR = 16000
WIN, HOP = 1.5, 0.75        # s: the within-take windows

# Noise units (calibrated 2026-11-10 on Pip v3, Good Boy's Puck and 16 Kokoro stories: docs/voices.md "Drift gate").
# The embedding carries identity; pitch and brightness move with acting (Pip's "he STOOD UP!" is +10 st and fine),
# so they get wide scales and low weights. The embedding's noise grows on short stretches: emb_scale(speech s).
SCALE = {"f0": 4.0, "cent": 3.0, "tilt": 2.0, "fmt": 2.5, "rate": 0.35}
WEIGHT = {"emb": 3.0, "f0": 0.5, "cent": 0.25, "tilt": 0.25, "fmt": 0.5, "rate": 0.25}
MIN_SPEECH = 0.6                # s: a line with less speech is too short to judge (listen to it)
WARN, BLOCK = 1.7, 2.0          # line vs the character's other lines in the story (good max 1.59, intruders 1.97-2.9)
WARN_REF, BLOCK_REF = 1.9, 2.3  # line vs the locked reference
# A window: two windows in a row this far from the character (a 1.5 s embedding is noisy: one window alone can reach
# 1.8 on good takes, two in a row reached 1.47 at most; a Pip line finished by an Erinome take: 2.03 then 1.97)
WARN_WIN, BLOCK_WIN = 1.55, 1.75
WARN_ONE = 2.1                  # ...or one window this far (a warning)
SPREAD_ST = 7.0                 # semitones of median pitch across one character's lines (a warning)


def emb_scale(speech):
    return 0.06 + 0.08 / max(speech, MIN_SPEECH)


# ---- the voice encoder: Resemblyzer's GE2E (40 mel bands -> 3x256 LSTM -> 256-d), as scripts/speaker_check.py ----

_ENC = None


def _encoder():
    global _ENC
    if _ENC is None:
        import importlib.util
        import torch
        torch.set_num_threads(2)
        spec = importlib.util.find_spec("resemblyzer")
        if spec is None:
            raise SystemExit("voice_drift: ~/.hb-tts/bin/pip install --no-deps resemblyzer (17 MB of weights)")
        w = torch.load(pathlib.Path(spec.origin).parent / "pretrained.pt", map_location="cpu")["model_state"]
        lstm, lin = torch.nn.LSTM(40, 256, 3, batch_first=True), torch.nn.Linear(256, 256)
        lstm.load_state_dict({k[5:]: v for k, v in w.items() if k.startswith("lstm.")})
        lin.load_state_dict({k[7:]: v for k, v in w.items() if k.startswith("linear.")})
        lstm.eval()
        _ENC = (torch, lstm, lin)
    return _ENC


def _mel_basis(n_fft=400, n_mels=40):
    """librosa.filters.mel(sr=16000, n_fft=400, n_mels=40), Slaney: what Resemblyzer was trained on."""
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
    x = np.pad(x, 200)
    n = 1 + (len(x) - 400) // 160
    fr = np.lib.stride_tricks.as_strided(x, (n, 400), (x.strides[0] * 160, x.strides[0])) * _WIN
    return (np.abs(np.fft.rfft(fr, axis=1)) ** 2 @ _MEL.T).astype(np.float32)


def embed(x):
    """256-d embedding: the mean of 1.6 s partials (50% overlap), as Resemblyzer does. A 1.5 s window is one partial."""
    torch, lstm, lin = _encoder()
    db = 10 * np.log10(np.mean(x ** 2) + 1e-12)
    if db < -30:
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


# ---- audio and the acoustic stats ----

def load(path, start=None, dur=None):
    a = ["ffmpeg", "-v", "error"] + (["-ss", str(start)] if start else []) + (["-t", str(dur)] if dur else [])
    return np.frombuffer(subprocess.run(a + ["-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                        capture_output=True, check=True).stdout, np.float32).copy()


def frame_db(x, fr=160):
    n = len(x) // fr
    return 20 * np.log10(np.sqrt(np.mean(x[:n * fr].reshape(n, fr) ** 2, axis=1)) + 1e-9)


def speech_mask(x):
    """10 ms frames that are speech: within 35 dB of the loud frames, gaps under 0.25 s bridged."""
    db = frame_db(x)
    if not len(db):
        return db > 0
    on = db > max(np.percentile(db, 97) - 35, np.percentile(db, 5) + 6)
    idx = np.nonzero(on)[0]
    for a, b in zip(idx, idx[1:]):
        if 1 < b - a <= 25:
            on[a:b] = True
    return on


def trim(x):
    on = np.nonzero(speech_mask(x))[0]
    return x[max(0, on[0] * 160 - 800):(on[-1] + 1) * 160 + 800] if len(on) else x


def yin(x, fmin=60, fmax=600, fr=320, n=640, thr=0.15):
    """Pitch per 20 ms frame (40 ms window) by YIN; 0 = unvoiced or quiet."""
    db = frame_db(x, fr)
    loud = db > np.percentile(db, 95) - 30 if len(db) else db
    lo, hi = SR // fmax, SR // fmin
    out = []
    for i in range(0, len(x) - n - hi, fr):
        if not loud[min(len(loud) - 1, i // fr)]:
            out.append(0.0); continue
        f = x[i:i + n + hi].astype(np.float64)
        # d(tau) = sum (x_j - x_{j+tau})^2 over the first n samples, via cumulative energy and one correlation
        e = np.cumsum(np.r_[0, f ** 2])
        r = np.correlate(f, f[:n], "valid")[:hi + 1]
        d = e[n] + (e[n:n + hi + 1] - e[:hi + 1]) - 2 * r
        d[0] = 0
        cm = d[1:] * np.arange(1, hi + 1) / np.maximum(np.cumsum(d[1:]), 1e-12)
        cand = np.nonzero(cm[lo - 1:] < thr)[0]
        if not len(cand):
            out.append(0.0); continue
        k = cand[0] + lo - 1
        while k + 1 < len(cm) and cm[k + 1] < cm[k]:
            k += 1
        out.append(SR / (k + 1))
    return np.array(out)


def lpc_formants(x, order=12):
    """Median F1, F2, F3 (Hz) over loud 25 ms frames (LPC on a pre-emphasised, Hamming-windowed frame)."""
    y = np.append(x[0], x[1:] - 0.97 * x[:-1])
    n, hop = 400, 160
    db = frame_db(y, hop)
    thr = np.percentile(db, 90) - 20 if len(db) else 0
    w = np.hamming(n)
    fs = []
    for i in range(0, len(y) - n, hop * 2):
        if db[min(len(db) - 1, i // hop)] < thr:
            continue
        f = y[i:i + n] * w
        r = np.correlate(f, f, "full")[n - 1:n + order]
        if r[0] <= 0:
            continue
        a, e = np.zeros(order + 1), r[0]
        a[0] = 1
        for k in range(1, order + 1):   # Levinson-Durbin
            acc = r[k] + a[1:k] @ r[k - 1:0:-1]
            g = -acc / e
            a[1:k + 1] = a[1:k + 1] + g * np.r_[a[k - 1:0:-1], 1]
            e *= 1 - g * g
            if e <= 0:
                break
        roots = [z for z in np.roots(a) if z.imag > 0]
        fr = sorted(np.angle(z) * SR / (2 * np.pi) for z in roots
                    if -np.log(abs(z)) * SR / np.pi < 400)   # bandwidth under 400 Hz
        fr = [f for f in fr if f > 200]
        if len(fr) >= 3:
            fs.append(fr[:3])
    return np.median(np.array(fs), 0) if fs else np.zeros(3)


def spectrum_stats(x):
    """(centroid Hz, tilt dB/octave) of the loud frames' mean power spectrum."""
    n, hop = 512, 160
    db = frame_db(x, hop)
    if len(x) < n or not len(db):
        return 0.0, 0.0
    thr = np.percentile(db, 90) - 20
    idx = [i for i in range(0, len(x) - n, hop) if db[min(len(db) - 1, i // hop)] >= thr]
    if not idx:
        return 0.0, 0.0
    P = np.mean([np.abs(np.fft.rfft(x[i:i + n] * np.hanning(n))) ** 2 for i in idx], 0)
    f = np.fft.rfftfreq(n, 1 / SR)
    band = (f >= 150) & (f <= 7000)
    A = np.sqrt(P)   # magnitude-weighted: the power-weighted centroid sat on the first harmonics
    cent = float((f[band] * A[band]).sum() / max(A[band].sum(), 1e-12))
    # tilt: a line through the spectrum in octave bands (each octave weighted alike)
    edges = 150 * 2 ** np.arange(0, 5.6, 0.5)
    mids, lv = [], []
    for a, b in zip(edges, edges[1:]):
        m = (f >= a) & (f < b)
        if m.any():
            mids.append(np.log2(np.sqrt(a * b))); lv.append(10 * np.log10(P[m].mean() + 1e-20))
    tilt = float(np.polyfit(mids, lv, 1)[0]) if len(mids) > 2 else 0.0
    return cent, tilt


def stats(x, words=None, emb=True):
    """The voiceprint of one stretch of audio."""
    f = yin(x)
    v = f[f > 0]
    sp = speech_mask(x)
    cent, tilt = spectrum_stats(x)
    fm = lpc_formants(x)
    out = {"f0": float(np.median(v)) if len(v) > 3 else 0.0,
           "f0_iqr": float(np.subtract(*np.percentile(v, [75, 25]))) if len(v) > 3 else 0.0,
           "cent": round(cent, 1), "tilt": round(tilt, 2), "fmt": [round(float(a)) for a in fm],
           "speech": round(float(sp.sum()) * 0.01, 2), "dur": round(len(x) / SR, 2)}
    if words:
        out["rate"] = round(words / max(out["speech"], 0.3), 2)
    if emb:
        out["emb"] = embed(x)
    return out


# ---- distance in noise units ----

def st(a, b):
    return 12 * np.log2(a / b) if a and b else 0.0


def terms(a, b):
    """Each term's distance between two voiceprints, in its own units (signed where it has a direction)."""
    t = {}
    if a.get("emb") is not None and b.get("emb") is not None:
        t["emb"] = 1 - float(np.dot(a["emb"], b["emb"]))
    if a.get("f0") and b.get("f0"):
        t["f0"] = st(a["f0"], b["f0"])
    if a.get("cent") and b.get("cent"):
        t["cent"] = st(a["cent"], b["cent"])   # brightness, in semitones of the centroid
    if a.get("tilt") is not None and b.get("tilt") is not None and a.get("cent") and b.get("cent"):
        t["tilt"] = a["tilt"] - b["tilt"]
    fa, fb = np.array(a.get("fmt") or [0] * 3, float), np.array(b.get("fmt") or [0] * 3, float)
    if fa.all() and fb.all():
        t["fmt"] = float(np.mean(12 * np.log2(fa / fb)))
    if a.get("rate") and b.get("rate"):
        t["rate"] = float(np.log(a["rate"] / b["rate"]))
    return t


def score(t, speech):
    """One drift number: the weighted RMS of the terms in noise units (1.0 = two good lines of one character)."""
    if not t:
        return 0.0
    num = sum(WEIGHT[k] * (abs(v) / (emb_scale(speech) if k == "emb" else SCALE[k])) ** 2 for k, v in t.items())
    return float(np.sqrt(num / sum(WEIGHT[k] for k in t)))


# ---- references: voices/refs/<id>.json ----

def git_bytes(rev, path):
    return subprocess.run(["git", "-C", str(ROOT), "show", f"{rev}:{path}"], capture_output=True, check=True).stdout


def load_bytes(data):
    return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", "-", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                        input=data, capture_output=True, check=True).stdout, np.float32).copy()


def merge(prints):
    """One voiceprint from several lines' (the median of each stat and of each embedding dimension, so one
    different-sounding line doesn't pull the centre toward itself)."""
    out = {}
    for k in ("f0", "cent", "tilt", "rate"):
        v = [p[k] for p in prints if p.get(k)]
        if v:
            out[k] = float(np.median(v))
    fm = [p["fmt"] for p in prints if all(p.get("fmt") or [0])]
    out["fmt"] = [round(float(a)) for a in np.median(np.array(fm), 0)] if fm else [0, 0, 0]
    e = np.median([p["emb"] for p in prints], 0)
    out["emb"] = e / np.linalg.norm(e)
    return out


def make_refs(only=None):
    """voices/refs/refs.json -> voices/refs/<id>.json (voiceprint) + <id>.mp3 (a few seconds to listen to). Each source
    is {"rev", "dir", "lines": [ids]} (a story's approved take in git) or {"file": "voices/samples/x.mp3"}."""
    spec = json.loads((REFS / "refs.json").read_text())
    for cid, s in spec.items():
        if cid.startswith("_") or (only and cid not in only):
            continue
        clips, prints = [], []
        if "file" in s:
            x = trim(load(ROOT / s["file"]))
            clips.append(x)
            prints.append(stats(x, s.get("words")))
        else:
            vj = json.loads(git_bytes(s["rev"], f"{s['dir']}/voice.json"))["lines"]
            for lid in s["lines"]:
                x = trim(load_bytes(git_bytes(s["rev"], f"{s['dir']}/{lid}.wav")))
                clips.append(x)
                prints.append(stats(x, len(vj[lid]["text"].split())))
        ref = merge(prints)
        self_d = [score(terms(p, ref), p["speech"]) for p in prints]
        out = {"id": cid, "voice": s["voice"], "model": s.get("model"), "source": {k: v for k, v in s.items() if k != "voice"},
               "provisional": bool(s.get("provisional")), "note": s.get("note", ""),
               **{k: (round(v, 2) if isinstance(v, float) else v) for k, v in ref.items() if k != "emb"},
               "emb": [round(float(v), 5) for v in ref["emb"]],
               "lines_vs_ref": {"median": round(float(np.median(self_d)), 2), "max": round(float(max(self_d)), 2)}}
        (REFS / f"{cid}.json").write_text(json.dumps(out, indent=1) + "\n")
        # the listening clip: up to ~6 s of the source lines, 0.25 s apart, 48 kb/s mono mp3
        gap, clip, total = np.zeros(int(0.25 * SR), np.float32), [], 0.0
        for c in clips:
            if total >= 6:
                break
            clip += [c, gap]; total += len(c) / SR
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-b:a", "48k",
                        str(REFS / f"{cid}.mp3")], input=np.concatenate(clip)[:int(6.5 * SR)].tobytes(), check=True)
        print(f"{cid:12s} {s['voice']:10s} f0 {ref['f0']:5.0f} Hz  cent {ref['cent']:5.0f}  fmt {ref['fmt']}  "
              f"lines vs ref median {out['lines_vs_ref']['median']} max {out['lines_vs_ref']['max']}")


def ref_for(cid, c, lib):
    """The reference voiceprint for a story cast member: `ref`, else the library character with the same Gemini
    voice (the first one in voices/refs), else None."""
    want = c.get("ref") or (cid if cid in lib and not c.get("voice") else None)
    cands = [want] if want else []
    cands += sorted(p.stem for p in REFS.glob("*.json") if p.stem != "refs"
                    and json.loads(p.read_text()).get("voice") == c.get("voice", lib.get(want or "", {}).get("voice")))
    for r in cands:
        p = REFS / f"{r}.json"
        if r and p.exists():
            j = json.loads(p.read_text())
            j["emb"] = np.array(j["emb"], np.float32)
            # it blocks only for the library character itself, and only from an approved take: a one-off character
            # that shares a Gemini voice, or a library sample made under another direction, is shown, not judged
            j["binding"] = r == want and not j.get("provisional")
            j["matched"] = "cast" if r == want else "voice"
            return j
    return None


# ---- the check ----

def windows(x):
    """(start s, samples) of the 1.5 s windows (hop 0.75 s) that are mostly speech; one window for a short line."""
    n, h = int(WIN * SR), int(HOP * SR)
    if len(x) < n * 1.3:
        return [(0.0, x)]
    sp = speech_mask(x)
    out = []
    for a in range(0, len(x) - n + 1, h):
        s = sp[a // 160:(a + n) // 160]
        if len(s) and s.mean() >= 0.6:
            out.append((a / SR, x[a:a + n]))
    return out or [(0.0, x)]


def story_lines(d):
    """[(id, character key, cast id, text, wav path, model)] and {character key: (label, cast entry)}."""
    sys.path.insert(0, str(ROOT / "scripts"))
    vj = json.loads((d / "voice" / "voice.json").read_text())
    story = json.loads((d / "story.json").read_text()) if (d / "story.json").exists() else {}
    lib = {k: v for k, v in json.loads((ROOT / "voices" / "cast.json").read_text()).items() if not k.startswith("_")}
    cast = story.get("cast") or {}
    narr = next((k for k, c in cast.items() if c.get("role") == "narrator"), None)
    who_of = {ln["id"]: ln.get("who") for ln in story.get("lines", [])}
    engine = vj.get("model", "") or vj.get("voice", "")
    out, chars = [], {}
    for lid, l in vj["lines"].items():
        p = d / "voice" / f"{lid}.wav"
        if not p.exists():
            continue
        cid = l.get("who") or who_of.get(lid) or narr or "narrator"
        if "Kokoro" in engine:   # a v1 story: one Kokoro voice, no Gemini reference
            key, c = f"kokoro:{vj.get('voice', '?')}", {"voice": vj.get("voice")}
        else:
            c = {**lib.get(cast.get(cid, {}).get("ref", cid if cid not in cast else ""), {}), **cast.get(cid, {})}
            key = cid
        chars.setdefault(key, (cid, c, lib))
        out.append((lid, key, cid, l.get("say") or l.get("text", ""), p, l.get("model") or (vj.get("models") or {}).get(cid)))
    return out, chars


def check(d, only=None):
    lines, chars = story_lines(d)
    refs = {k: (None if k.startswith("kokoro:") else ref_for(cid, c, lib)) for k, (cid, c, lib) in chars.items()}
    rep = {"story": str(d), "lines": [], "characters": {}, "blockers": 0, "warnings": 0}
    prints = {}
    for lid, key, cid, text, p, model in lines:
        x = trim(load(p))
        lp = stats(x, len(text.split()))
        wins = [(t, stats(w, emb=True)) for t, w in windows(x)]
        prints[lid] = (key, cid, lp, wins, model)
    for key in chars:
        mine = [lid for lid, v in prints.items() if v[0] == key]
        if not mine:
            continue
        ref = refs[key]
        models = sorted({prints[l][4] for l in mine if prints[l][4]})
        f0s = [prints[l][2]["f0"] for l in mine if prints[l][2]["f0"] and prints[l][2]["speech"] >= 1.0]
        spread = float(st(max(f0s), min(f0s))) if len(f0s) > 1 else 0.0
        ch = {"cast_id": chars[key][0], "ref": (ref["id"] + ("" if ref["binding"] else " (shown only: " + (
                  "provisional sample)" if ref["matched"] == "cast" else "same Gemini voice, not this character)"))) if ref else None, "lines": mine, "models": models,
              "f0_range": [round(min(f0s)), round(max(f0s))] if f0s else None, "f0_spread_st": round(spread, 1), "flags": []}
        if len(models) > 1:
            ch["flags"].append("MODELS")   # one character voiced by two models = two people (Good Boy's narrator)
        if spread > SPREAD_ST:
            ch["flags"].append("spread")
        cen = merge([prints[l][2] for l in mine])
        for lid in mine:
            _, cid, lp, wins, model = prints[lid]
            r = {"id": lid, "who": cid, "char": key, "f0": round(lp["f0"]), "rate": lp.get("rate"), "speech": lp["speech"],
                 "cent": round(lp["cent"]), "fmt": lp["fmt"], "model": model, "flags": [], "drift": 0.0}
            if lp["speech"] < MIN_SPEECH:
                r["flags"].append("short")   # too little speech for the embedding: listen
                rep["lines"].append(r); continue
            others = [prints[l][2] for l in mine if l != lid and prints[l][2]["speech"] >= MIN_SPEECH]
            if len(others) >= 2:   # take-to-take: against the character's other lines (leave-one-out, median centre)
                t = terms(lp, merge(others))
                r["peers"] = round(score(t, lp["speech"]), 2)
                r["peers_terms"] = {k: round(v, 2) for k, v in t.items()}
                r["flags"] += ["DRIFT"] if r["peers"] >= BLOCK else ["drift"] if r["peers"] >= WARN else []
                r["drift"] = max(r["drift"], r["peers"] / BLOCK)
            if ref:
                t = terms(lp, ref)
                r["ref"] = round(score(t, lp["speech"]), 2)
                r["ref_terms"] = {k: round(v, 2) for k, v in t.items()}
                if ref["binding"]:
                    r["flags"] += ["OFFREF"] if r["ref"] >= BLOCK_REF else ["offref"] if r["ref"] >= WARN_REF else []
                    r["drift"] = max(r["drift"], r["ref"] / BLOCK_REF)
                elif ref["matched"] == "cast" and r["ref"] >= BLOCK_REF:
                    r["flags"].append("offref")   # a provisional reference: a warning
            if len(wins) > 1:   # within the take: every 1.5 s window against the character (its reference, else its centre)
                base = ref if ref and ref["matched"] == "cast" else cen
                ws = [(round(t0, 2), round(score(terms(wp, base), WIN), 2), round(wp["f0"])) for t0, wp in wins]
                r["windows"] = ws
                sc = [s for _, s, _ in ws]
                run2 = max(min(a, b) for a, b in zip(sc, sc[1:]))   # the voice stays changed for two windows (>= 2.25 s)
                r["wobble"] = round(run2, 2)
                r["flags"] += (["WOBBLE"] if run2 >= BLOCK_WIN else
                               ["wobble"] if run2 >= WARN_WIN or max(sc) >= WARN_ONE else [])
                r["drift"] = max(r["drift"], run2 / BLOCK_WIN)
            r["drift"] = round(r["drift"], 2)
            rep["lines"].append(r)
        rep["characters"][key] = ch
    rep["lines"].sort(key=lambda r: r["id"])
    if only:
        rep["lines"] = [r for r in rep["lines"] if r["id"] in only]
    for r in rep["lines"]:
        rep["blockers"] += any(f.isupper() for f in r["flags"])
        rep["warnings"] += any(f.islower() and f != "short" for f in r["flags"])
    for ch in rep["characters"].values():
        rep["blockers"] += "MODELS" in ch["flags"]
        rep["warnings"] += "spread" in ch["flags"]
    rep["verdict"] = "BLOCK" if rep["blockers"] else "WARN" if rep["warnings"] else "OK"
    return rep


def line_score(wav, ref_id, words=None):
    """One take against a reference (tts.py's re-take hook): (score, terms). Lower is closer."""
    j = json.loads((REFS / f"{ref_id}.json").read_text())
    j["emb"] = np.array(j["emb"], np.float32)
    x = trim(load(wav) if not isinstance(wav, np.ndarray) else wav)
    lp = stats(x, words)
    t = terms(lp, j)
    return round(score(t, lp["speech"]), 2), {k: round(v, 2) for k, v in t.items()}


def show(rep):
    print(f"voice drift: {rep['story']}")
    for key, ch in rep["characters"].items():
        print(f"  {key}: ref {ch['ref'] or '- (checked against itself)'}, {len(ch['lines'])} lines, pitch "
              f"{ch['f0_range']} Hz ({ch['f0_spread_st']} st), models {ch['models'] or 'not recorded'}"
              + (f"  [{' '.join(ch['flags'])}]" if ch["flags"] else ""))
    print(f"  {'line':6s} {'who':8s} {'f0':>4s} {'rate':>5s} {'peers':>6s} {'ref':>6s} {'wobble':>6s}  flags")
    for r in rep["lines"]:
        print(f"  {r['id']:6s} {r['who'][:8]:8s} {r['f0']:4d} {r.get('rate') or 0:5.2f} {r.get('peers', '-'):>6} "
              f"{r.get('ref', '-'):>6} {r.get('wobble', '-'):>6}  {' '.join(r['flags'])}")
        if any(f.upper() in ("DRIFT", "OFFREF") for f in r["flags"]):
            t = r.get("peers_terms") if "DRIFT" in [f.upper() for f in r["flags"]] else r.get("ref_terms")
            print(f"         {', '.join(f'{k} {v:+}' for k, v in (t or {}).items())}  (emb: 1-cos; f0/cent/fmt: st; tilt: dB/oct; rate: log)")
        if any(f.upper() == "WOBBLE" for f in r["flags"]):
            print("         windows (s, score, Hz): " + "  ".join(f"{t}:{s}/{f}" for t, s, f in r["windows"]))
    print(f"verdict: {rep['verdict']} ({rep['blockers']} blocker(s), {rep['warnings']} warning(s)); thresholds: "
          f"line vs peers {WARN}/{BLOCK}, vs reference {WARN_REF}/{BLOCK_REF}, two windows in a row vs the character {WARN_WIN}/{BLOCK_WIN} (warn/block)")


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--make-refs" in a:
        make_refs(a[a.index("--make-refs") + 1].split(",") if len(a) > a.index("--make-refs") + 1 else None)
        sys.exit(0)
    only = a[a.index("--only") + 1].split(",") if "--only" in a else None
    rep = check(pathlib.Path(a[0]), only)
    if "--json" in a:
        print(json.dumps(rep, default=float))
    else:
        show(rep)
    sys.exit(1 if rep["blockers"] else 0)
