#!/usr/bin/env python3
"""Are the captions on the word? Measured on the finished Short (owner 2026-11-10: "The captions actually seem
behind", then "a bit early now", then "Some of them are earlier, some of them are after").

    python3 scripts/caption_av_check.py out/<stunt>.mp4 stories/<name> [--rec work/<stunt>.rec.json] [--track story_track.py]
    python3 scripts/caption_av_check.py --events stories/<name> --rec <rec>     (no video: the edit's math)

For every caption word it compares when the caption appears with when that word is heard:
  heard   the narration track the edit lays (story_track.narration_wav), each line's stretch force-aligned to its
          caption words (scripts/ctc_align.py: wav2vec2 CTC + the hiss refinement; ~15 ms median error against
          hand-marked onsets, docs/voices.md "Caption timing"), then placed in the video by cross-correlating that track
          with the Short's final mix (so a shifted or padded mix shows up);
  shown   story_track.caption_events, checked against the video itself: each caption's first frame is found where
          the caption band changes, between the neighbouring captions' frames.
offset = shown - heard (negative: the caption is early). The target is the caption appearing on the frame in which
its word starts: offset between -1 frame and 0.

Coverage (owner 2026-11-11: "should we have captions on all of the words, not just some of them?"; STANDARDS 6.1):
  every word of every line (narrator and characters, voice/words.json placed where the edit lays the line) has its
  line's caption on screen while it is spoken (its middle, +-40 ms); every caption word of the line (voice.json
  captions) appears in the caption events; and the take says the caption text (Whisper on each line's wav, the take
  gate's matcher: >= 75 % of the letters, every line heard, no run of 3+ extra words); and no caption is on screen
  under 0.25 s (whole frames: a flash can't be read). Any miss is a BLOCK.

Short captions in the video (a WARN, not a BLOCK; Buh Stories lead 2026-11-11): with an mp4, the caption holds are
also measured from the frames (video_holds: outlined white text in the caption band, a change only when the text
itself changes, not a cut or a GUI under it), so a flash the caption track's own times can't show (a video edited
from an older voice.json) is still printed.

BLOCK (exit 1) when |median offset| > 33 ms or over 10% of words are more than 100 ms off, or on any coverage miss. Prints the median,
p10/p90, a per-line table (a constant offset, drift along the Short, or one bad line) and the worst words. Exit 2:
could not run. --json prints the numbers as JSON on the last line.

Fix: python3 scripts/align.py stories/<name> (re-times voice/words.json), then re-edit (./hb render <stunt> --reuse).
"""
import gzip
import importlib.util
import json
import os
import pathlib
import subprocess
import sys
import tempfile

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import ctc_align   # noqa: E402

FPS = 60
MEDIAN_MAX = 0.033   # s: |median offset| above this is a BLOCK (2 frames at 60 fps; the owner notices ~45 ms late)
WORD_MAX = 0.100     # s: a word this far off is a miss
MISS_MAX = 0.10      # share of words that may miss


def load_rec(p):
    p = str(p)
    return json.load(gzip.open(p) if p.endswith(".gz") else open(p))


def find_rec(story_dir, mp4):
    """The recording the Short was edited from: next to the video (a published package's recording.json.gz),
    work/<stunt>.rec.json, or renders/<name>/ and renders/slices/ on a render branch."""
    name = pathlib.Path(story_dir).name
    root = HERE.parent
    cands = []
    if mp4:
        d = pathlib.Path(mp4).parent
        cands += [d / "recording.json.gz", d / "recording.json"]
    cands += [root / "work" / f"story_{name}.rec.json", root / "renders" / name / f"story_{name}.rec.json.gz",
              root / "renders" / "slices" / f"story_{name}.rec.json.gz"]
    return next((c for c in cands if c.exists()), None)


def import_track(path=None):
    """scripts/story_track.py, or another copy of it (--track: the version a Short was rendered with)."""
    path = pathlib.Path(path or HERE / "story_track.py").resolve()
    spec = importlib.util.spec_from_file_location(f"story_track_{abs(hash(str(path)))}", path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def read_audio(path, sr=16000):
    return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-map", "0:a:0", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                                        capture_output=True, check=True).stdout, np.float32).copy()


def _env(x, sr, rate):
    """Voice-band envelope at `rate` Hz (first difference kills the bass, then |x| in rate-sized bins)."""
    y = np.abs(np.diff(x, prepend=0))
    hop = sr // rate
    n = len(y) // hop
    return y[: n * hop].reshape(n, hop).mean(1)


def audio_offset(narr, mix, sr=16000):
    """s such that mix(t) ~ narr(t + s): where the narration (in recording time) sits in the Short. Envelope
    cross-correlation at 100 Hz, refined at 1 kHz. -> (s, peak correlation)"""
    def xc(a, b):
        a, b = a - a.mean(), b - b.mean()
        n = 1 << int(np.ceil(np.log2(len(a) + len(b))))
        c = np.fft.irfft(np.fft.rfft(a, n) * np.conj(np.fft.rfft(b, n)), n)
        return c, np.sqrt((a * a).sum() * (b * b).sum()) + 1e-12
    ea, eb = _env(narr, sr, 100), _env(mix, sr, 100)
    c, nrm = xc(ea, eb)
    k = int(np.argmax(c))
    lag = k if k < len(c) // 2 else k - len(c)
    peak = float(c[k] / nrm)
    ea, eb = _env(narr, sr, 1000), _env(mix, sr, 1000)
    best, bl = -np.inf, lag * 10
    for L in range(lag * 10 - 15, lag * 10 + 16):   # narr[i + L] ~ mix[i]
        a = ea[max(0, L): max(0, L) + len(eb)]
        b = eb[max(0, -L): max(0, -L) + len(a)]
        a = a[: len(b)]
        if len(a) < 100:
            continue
        v = float(np.dot(a - a.mean(), b - b.mean()))
        if v > best:
            best, bl = v, L
    return bl / 1000, peak


def heard_words(track, story_dir, timeline, start, dur, tmp):
    """{line id: [(token, heard start s, heard end s)]} in the edit's time (the narration track's), by forced
    alignment of each line's stretch of the narration track to its caption words."""
    story, voice = track._lines(story_dir)
    marks = track._marks(timeline, start, {l["id"] for l in story["lines"]}, story.get("start_on_respawn", ()))
    vs = track.voice_starts(voice, marks)[0] if hasattr(track, "voice_starts") else {lid: t for t, lid in marks}   # (older copies: no continuous takes)
    nw = track.narration_wav(story_dir, timeline, start, dur, pathlib.Path(tmp) / "narration.wav")
    x = read_audio(nw)
    out, jobs = {}, []
    for _, lid in marks:
        v = voice["lines"][lid]
        toks = " ".join(v["captions"]).split()
        wav = pathlib.Path(story_dir) / "voice" / f"{lid}.wav"
        ln = float(v.get("dur") or 0) or (len(read_audio(wav)) / 16000 if wav.exists() else 0)
        a0 = vs[lid]
        i0, i1 = int(round(max(0.0, a0) * 16000)), int(round((a0 + ln + 0.05) * 16000))
        seg = x[i0:i1]
        if len(seg) < 1600:
            continue
        jobs.append((lid, i0, seg, toks))
    for (lid, i0, _, _), r in zip(jobs, ctc_align.align_batch([(seg, toks) for _, _, seg, toks in jobs])):
        if r is None:
            print(f"note: {lid}: the aligner could not fit the words to the track (left out)")
            continue
        out[lid] = [(w, i0 / 16000 + a, i0 / 16000 + b) for w, a, b in r]
    return out, x, vs


def caption_frames(mp4, events, s_video, track, story_dir, tmp):
    """The frame each caption really appears on, found in the video: the frame (between the neighbouring captions')
    where the caption band changes most, inside the outline of this caption and the one before. -> [frame or None]"""
    from PIL import Image
    story, _ = track._lines(story_dir)
    key = tuple(int(story.get("key_color", "#ffd640")[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    spk = track.speakers(story)
    cast_v = any(c for c in spk.values() if c[1])
    W, H, CY = track.W, track.H, track.CY
    y0, y1, sc = max(0, CY - 300), min(H, CY + 200), 4
    masks = []
    for t0, t1, text, lid in events:
        col, is_char, tag = spk.get(lid, ((255, 255, 255, 255), False, None))
        im = track.caption_image(text, key, col, is_char or cast_v, tag, None if is_char else key)
        full = Image.new("L", (W, H), 0)
        full.paste(im.split()[3], (int(W / 2 - im.width / 2), int(CY - im.height / 2 - im.info.get("tag_h", 0) / 2)))
        m = np.asarray(full.crop((0, y0, W, y1)).resize((W // sc, (y1 - y0) // sc), Image.BILINEAR)) > 100
        masks.append(m)
    w, h = W // sc, (y1 - y0) // sc
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp4), "-vf", f"crop={W}:{y1 - y0}:0:{y0},scale={w}:{h}:flags=area,format=gray",
                          "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.int16)
    diff = np.abs(np.diff(fr, axis=0))   # diff[k] = frame k+1 vs frame k
    fo = getattr(track, "frame_of", lambda t: int(round(t * FPS)))
    pred = [fo(e[0] - s_video) for e in events]
    out = []
    for k, p in enumerate(pred):
        lo = max(1, p - 9, (pred[k - 1] + p) // 2 + 1 if k else 1)
        hi = min(len(fr) - 1, p + 9, (p + pred[k + 1]) // 2 if k + 1 < len(pred) else p + 9)
        if hi < lo:
            out.append(None); continue
        # the caption before it, if it is still up when this one comes (else its own disappearance, at a line's cut,
        # is the bigger change)
        joined = k and abs(fo(events[k - 1][1] - s_video) - pred[k]) <= 1
        m = masks[k] | masks[k - 1] if joined else masks[k]
        if k and not joined:   # (and look only after it has gone)
            lo = max(lo, fo(events[k - 1][1] - s_video) + 2)
            if hi < lo:
                out.append(None); continue
        if not m.any():
            out.append(None); continue
        sc_ = np.array([diff[f - 1][m].mean() for f in range(lo, hi + 1)])
        # the first big change: the caption's pop (0.84 -> 1.06 scale over 6 frames) changes a long word's pixels
        # about as much as its arrival did, so the largest change can be 1-2 frames after it
        j = int(np.argmax(sc_ >= 0.5 * sc_.max()))
        rest = np.delete(sc_, j)
        # a clear change: well above the band's own motion around it
        out.append(lo + j if len(rest) == 0 or sc_[j] > 2.0 * np.median(rest) + 2 else None)
    return out


COVER_TOL = 0.04   # s: a word counts as captioned if its middle falls inside one of its line's captions, +-40 ms
SHOW_MIN = 0.25    # s: a caption on screen for less than this can't be read (story_track.min_show aims for 0.30)


def flashes(events, frame_of=lambda t: int(round(t * FPS)), min_s=SHOW_MIN):
    """The captions on screen for less than min_s, measured in whole frames as the caption track draws them."""
    return [(t0, t1, text, lid) for t0, t1, text, lid in events if (frame_of(t1) - frame_of(t0)) / FPS < min_s - 1e-9]


# the video-side short-caption WARN: caption holds measured from the frames themselves, so a flash the caption
# track's own times don't show (a video cut from another voice.json, an edit bug) is still seen. A WARN, not a BLOCK.
HOLD_SCALE = 2           # the band is read at half size (900x240 -> 450x120)
HOLD_BURST = 0.015       # a frame where over 1.5% of the band's white (>235) pixels flip starts a burst of change
HOLD_TEXT = 0.35         # a burst is a caption change only if this share of the outlined text is new AND gone
HOLD_POP = 6            # frames: the caption's pop-in (story_track); a change this soon after one is part of it
HOLD_INK = 0.005         # outlined text on screen after the change (else it is a blank gap, not a caption)


def _grow(m, r):
    """m (boolean, ..., h, w) grown by r pixels in every direction (a square dilation, numpy only)."""
    o = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dy or dx:
                o |= np.roll(np.roll(m, dy, -2), dx, -1)
    return o


def _text_change(a, b):
    """The share of caption text that changed between two outlined-text masks: the smaller of 'a's text gone in b'
    and 'b's text new since a' (1 px slack for the pop). A background cut or a GUI under a steady caption adds or
    removes white on one side only; a new caption does both."""
    if not a.any() or not b.any():
        return 1.0 if (a.any() or b.any()) else 0.0
    return min((a & ~_grow(b, 1)).sum() / a.sum(), (b & ~_grow(a, 1)).sum() / b.sum())


def video_holds(band, fps=FPS, min_s=SHOW_MIN):
    """band: the caption band's frames, gray uint8 (n, h, w). -> [(start s, hold s)] for each caption on screen
    under min_s: from one caption change to the next. The text is white with a dark outline, so the mask is white
    pixels with dark (<70) within 2 px: Minecraft's own whites (snow, GUI, gold) rarely have that edge everywhere."""
    white = band > 235
    text = white & _grow(band < 70, 2)
    hot = (white[1:] ^ white[:-1]).mean(axis=(1, 2)) > HOLD_BURST   # hot[i]: frame i+1 vs frame i
    changes, i = [], 0
    while i < len(hot):
        if not hot[i]:
            i += 1
            continue
        s = i + 1
        while i < len(hot) and hot[i]:
            i += 1
        e = i   # the last changed frame
        # (a change inside the pop of the one before, 0.84 -> 1.06 scale over 6 frames, is that caption still arriving)
        if (not changes or s - changes[-1] > HOLD_POP) and _text_change(text[max(0, s - 2)], text[min(len(band) - 1, e + 1)]) > HOLD_TEXT:
            changes.append(s)
    out = []
    for a, b in zip(changes, changes[1:]):
        if (b - a) / fps < min_s - 1e-9 and text[min(b - 1, a + 6)].mean() > HOLD_INK:
            out.append((round(a / fps, 2), round((b - a) / fps, 2)))
    return out


def caption_band(mp4, track):
    """The caption band of the finished Short (900x240 around the caption centre), read at half size. -> uint8 array"""
    x0, w, h = (track.W - 900) // 2, 900 // HOLD_SCALE, 240 // HOLD_SCALE
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp4), "-vf",
                          f"crop=900:240:{x0}:{track.CY - 122},scale={w}:{h}:flags=area,format=gray", "-f", "rawvideo", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w)


def uncaptioned(spoken, events, tol=COVER_TOL):
    """spoken: [(line id, word, start s, end s)] in the edit's time; events: [(t0, t1, text, line id)] (the caption
    track). -> the spoken words with no caption of their own line on screen at their middle."""
    by = {}
    for t0, t1, _, lid in events:
        by.setdefault(lid, []).append((t0, t1))
    out = []
    for lid, w, a, b in spoken:
        mid = (a + b) / 2
        if not any(t0 - tol <= mid < t1 + tol for t0, t1 in by.get(lid, [])):
            out.append((lid, w, a, b))
    return out


def letters(t):
    return "".join(ctc_align.spoken_words(t)).replace("'", "")


def missing_caption_words(captions, events):
    """captions: {line id: [chunk text, ...]} (voice.json); events as above. -> {line id: [caption tokens never shown]},
    matched by letters in order (a dropped chunk, a line with no events)."""
    import difflib
    shown = {}
    for _, _, text, lid in events:
        shown.setdefault(lid, []).extend(text.split())
    out = {}
    for lid, chunks in captions.items():
        want = [t for c in chunks for t in c.split() if letters(t)]
        got = [t for t in shown.get(lid, []) if letters(t)]
        sm = difflib.SequenceMatcher(None, [letters(t) for t in want], [letters(t) for t in got], autojunk=False)
        miss = [want[i] for op, i1, i2, _, _ in sm.get_opcodes() if op in ("delete", "replace") for i in range(i1, i2)]
        if miss:
            out[lid] = miss
    return out


def take_word_fails(captions, heard):
    """captions: {line id: [chunk text]}; heard: {line id: [(word, a, b)]} (Whisper on the line's wav). -> {line id:
    [reason]} where the take doesn't say its caption text (take_gate's matcher: the take gate's own words check)."""
    import take_gate
    out = {}
    for lid, chunks in captions.items():
        if lid not in heard:
            continue
        f = take_gate.words_check([" ".join(chunks)], heard[lid])
        if f:
            out[lid] = [x["why"] for x in f]
    return out


def whisper_lines(wavs):
    """{line id: [(word, a, b)]} from Whisper (align.words) on each wav, in this process if transformers is here, else
    through the TTS venv; None when neither can run."""
    try:
        import align
        return {lid: align.words(str(w)) for lid, w in wavs.items()}
    except ImportError:
        pass
    py = os.path.expanduser("~/.hb-tts/bin/python")
    if not os.path.exists(py):
        return None
    code = ("import sys, json; sys.path.insert(0, sys.argv[1]); import align; "
            "print(json.dumps({k: align.words(v) for k, v in json.loads(sys.argv[2]).items()}))")
    r = subprocess.run([py, "-c", code, str(HERE), json.dumps({k: str(v) for k, v in wavs.items()})], capture_output=True, text=True)
    if r.returncode:
        return None
    return {k: [tuple(x) for x in v] for k, v in json.loads(r.stdout.strip().splitlines()[-1]).items()}


def coverage(story_dir, vs, events, verbose=True, listen=True, frame_of=lambda t: int(round(t * FPS))):
    """The coverage BLOCK (module doc): every spoken word captioned, every caption word shown, the take says the
    captions. vs: {line id: where the edit lays the line's wav (s)}. -> {"block", "uncaptioned", "missing", "words"}."""
    sd = pathlib.Path(story_dir)
    voice = json.loads((sd / "voice" / "voice.json").read_text())
    wj = sd / "voice" / "words.json"
    words = json.loads(wj.read_text()) if wj.exists() else {}
    lines = {lid: v for lid, v in voice["lines"].items() if lid in vs}
    spoken = [(lid, w, vs[lid] + a, vs[lid] + b) for lid in lines for w, a, b in words.get(lid, [])]
    unc = uncaptioned(spoken, events)
    no_words = [lid for lid in lines if not words.get(lid)]
    miss = missing_caption_words({lid: v.get("captions", []) for lid, v in lines.items()}, events)
    wf, listened = {}, False
    if listen:
        heard = whisper_lines({lid: sd / "voice" / f"{lid}.wav" for lid in lines if (sd / "voice" / f"{lid}.wav").exists()})
        if heard is not None:
            listened = True
            wf = take_word_fails({lid: v.get("captions", []) for lid, v in lines.items()}, heard)
    fl = flashes(events, frame_of)
    block = bool(unc or miss or wf or no_words or fl)
    if verbose:
        print(("BLOCK" if block else "OK") + f": caption coverage ({len(spoken)} spoken words in {len(lines)} lines: "
              f"{len(unc)} with no caption on screen, {sum(map(len, miss.values()))} caption words never shown, "
              f"{len(wf)} line(s) whose take doesn't say its captions, {len(fl)} caption(s) on screen under {SHOW_MIN:.2f} s"
              + ("" if listened else "; the take's words not checked: no Whisper") + ")")
        for t0, t1, text, lid in fl[:10]:
            print(f"  too short: {lid} {text!r} on screen {t1 - t0:.2f} s from {t0:.2f} s (story_track.min_show merges or lengthens these)")
        for lid, w, a, b in unc[:10]:
            print(f"  uncaptioned: {lid} {w!r} spoken {a:.2f}-{b:.2f} s")
        for lid in no_words:
            print(f"  uncaptioned: {lid} has no word times (voice/words.json): run scripts/align.py {story_dir}")
        for lid, ws in miss.items():
            print(f"  never shown: {lid} {' '.join(ws)!r}")
        for lid, why in wf.items():
            print(f"  take vs captions: {lid}: {'; '.join(why)}")
        if block:
            print(f"fix: re-align (scripts/align.py {story_dir}) and re-edit; a take that says other words than story.json is a re-take, "
                  "or change the line's text to what was said")
    return {"block": block, "uncaptioned": [list(u) for u in unc], "no_words": no_words, "missing": miss, "words": wf,
            "flashes": [list(f) for f in fl], "listened": listened}


def check(story_dir, rec_path, mp4=None, track_path=None, verbose=True):
    track = import_track(track_path)
    rec = load_rec(rec_path)
    timeline, track.POSES = rec["timeline"], rec.get("poses")
    dur = max([len(rec.get("poses") or []) / 20] + [e["t"] / 1000 + 1 for e in timeline])
    tmp = tempfile.mkdtemp(prefix="hb-capav-")
    try:
        heard, narr, vs = heard_words(track, story_dir, timeline, 0.0, dur, tmp)
        ev = track.caption_events(story_dir, timeline, 0.0, dur, who=True)
        cov = coverage(story_dir, vs, ev, verbose, frame_of=getattr(track, "frame_of", lambda t: int(round(t * FPS))))
        # each caption's words, in order per line: the first word's heard start is the caption's target
        used, rows = {}, []
        for k, (t0, t1, text, lid) in enumerate(ev):
            n = len(text.split())
            i = used.get(lid, 0)
            used[lid] = i + n
            hw = heard.get(lid)
            if not hw or i >= len(hw):
                continue
            rows.append({"k": k, "line": lid, "word": text, "shown": t0, "heard": hw[i][1]})
        s_audio = s_video = 0.0
        peak, frames_ok, frame_err, vh = None, 0, [], None
        if mp4:
            mix = read_audio(mp4)
            s_audio, peak = audio_offset(narr, mix)
            s_video = s_audio
            vh = video_holds(caption_band(mp4, track))
            got = caption_frames(mp4, [ev[r["k"]] for r in rows], s_video, track, story_dir, tmp)
            for r, f in zip(rows, got):
                p = getattr(track, "frame_of", lambda t: int(round(t * FPS)))(r["shown"] - s_video)
                r["frame"] = f
                r["shown_v"] = (f if f is not None else p) / FPS
                if f is not None:
                    frames_ok += 1
                    frame_err.append(f - p)
                r["heard_v"] = r["heard"] - s_audio
                r["off"] = r["shown_v"] - r["heard_v"]
        else:
            for r in rows:
                # the caption track is whole 60 fps frames: the frame it lands on (caption_concat's rounding)
                f = track.frame_of(r["shown"]) if hasattr(track, "frame_of") else int(round(r["shown"] * FPS))
                r["shown_v"] = f / FPS
                r["heard_v"] = r["heard"]
                r["off"] = r["shown_v"] - r["heard_v"]
    finally:
        subprocess.run(["rm", "-rf", tmp])
    if not rows:
        print("could not measure: no caption word matched an aligned word")
        return (1 if cov["block"] else 2), {"coverage": cov}
    off = np.array([r["off"] for r in rows])
    med = float(np.median(off))
    miss = float(np.mean(np.abs(off) > WORD_MAX))
    res = {"words": len(rows), "median": med, "p10": float(np.percentile(off, 10)), "p90": float(np.percentile(off, 90)),
           "mean_abs": float(np.mean(np.abs(off))), "miss": miss, "jitter_p90": float(np.percentile(np.abs(off - med), 90)),
           "audio_offset": s_audio, "audio_peak": peak, "frames_found": frames_ok,
           "frame_vs_events": (float(np.median(frame_err)) if frame_err else None)}
    t = np.array([r["heard_v"] for r in rows])
    if len(rows) > 5 and np.ptp(t) > 1:
        res["drift_ms_per_10s"] = float(np.polyfit(t, off, 1)[0] * 10 * 1000)
    res["coverage"] = cov
    if vh is not None:
        res["video_short"] = vh
        if verbose:
            print(("WARN" if vh else "OK") + f": caption holds seen in the video ({len(vh)} under {SHOW_MIN:.2f} s)")
            for t, d in vh[:10]:
                print(f"  short in the video: a caption on screen {d:.2f} s from {t:.2f} s (video time): look at the frames; "
                      "re-edit from the current voice.json (./hb render <stunt> --reuse)")
    timing_blk = abs(med) > MEDIAN_MAX or miss > MISS_MAX
    blk = timing_blk or cov["block"]
    if verbose:
        if mp4:
            print(f"video: the Short starts {s_audio:.3f} s into the recording (narration vs final mix match {peak:.2f}); caption frames found "
                  f"{frames_ok}/{len(rows)}" + (f", median {np.median(frame_err):+.0f} frame(s) from the edit's own times "
                                                  f"(p10 {np.percentile(frame_err, 10):+.0f}, p90 {np.percentile(frame_err, 90):+.0f})" if frame_err else ""))
        print(f"{len(rows)} caption words: offset median {med * 1000:+.0f} ms, p10 {res['p10'] * 1000:+.0f}, p90 {res['p90'] * 1000:+.0f}; "
              f"{miss:.0%} over {WORD_MAX * 1000:.0f} ms; spread around the median p90 {res['jitter_p90'] * 1000:.0f} ms"
              + (f"; drift {res['drift_ms_per_10s']:+.0f} ms per 10 s" if "drift_ms_per_10s" in res else "")
              + "   (negative = caption early)")
        print("per line (median, worst):")
        for lid in dict.fromkeys(r["line"] for r in rows):
            o = np.array([r["off"] for r in rows if r["line"] == lid])
            print(f"  {lid}: {np.median(o) * 1000:+5.0f} ms   worst {o[np.argmax(np.abs(o))] * 1000:+5.0f} ms   ({len(o)} words)")
        print("worst words:")
        for r in sorted(rows, key=lambda r: -abs(r["off"]))[:8]:
            print(f"  {r['line']} {r['word']!r:18s} shown {r['shown_v']:6.2f} s, heard {r['heard_v']:6.2f} s: {r['off'] * 1000:+5.0f} ms")
        print(("BLOCK" if timing_blk else "OK") + f": caption timing (|median| <= {MEDIAN_MAX * 1000:.0f} ms and <= {MISS_MAX:.0%} of words over "
              f"{WORD_MAX * 1000:.0f} ms)")
        if timing_blk:
            print(f"fix: python3 scripts/align.py {story_dir}   (forced-aligned word times), then re-edit: ./hb render <stunt> --reuse")
    res["rows"] = [{k: (round(v, 4) if isinstance(v, float) else v) for k, v in r.items()} for r in rows]
    return (1 if blk else 0), res


def main(argv):
    a = list(argv)
    js = "--json" in a
    if js:
        a.remove("--json")
    opt = {}
    for flag in ("--rec", "--track", "--events"):
        if flag in a:
            i = a.index(flag)
            opt[flag] = a[i + 1]
            del a[i:i + 2]
    if "--events" in opt:
        sd, mp4 = opt["--events"], None
    elif len(a) >= 2:
        mp4, sd = a[0], a[1]
    else:
        print(__doc__)
        return 2
    rec = opt.get("--rec") or find_rec(sd, mp4)
    if not rec or not os.path.exists(rec):
        print(f"could not run: no recording found for {sd} (pass --rec)")
        return 2
    try:
        code, res = check(sd, rec, mp4, opt.get("--track"))
    except (subprocess.CalledProcessError, FileNotFoundError, KeyError, ImportError, RuntimeError) as e:
        print(f"could not run: {e}")
        return 2
    if js:
        print(json.dumps({k: v for k, v in res.items() if k != "rows"} | {"exit": code}))
    return code


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
