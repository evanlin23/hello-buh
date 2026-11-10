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

BLOCK (exit 1) when |median offset| > 33 ms or over 10% of words are more than 100 ms off. Prints the median,
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
    return out, x


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


def check(story_dir, rec_path, mp4=None, track_path=None, verbose=True):
    track = import_track(track_path)
    rec = load_rec(rec_path)
    timeline, track.POSES = rec["timeline"], rec.get("poses")
    dur = max([len(rec.get("poses") or []) / 20] + [e["t"] / 1000 + 1 for e in timeline])
    tmp = tempfile.mkdtemp(prefix="hb-capav-")
    try:
        heard, narr = heard_words(track, story_dir, timeline, 0.0, dur, tmp)
        ev = track.caption_events(story_dir, timeline, 0.0, dur, who=True)
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
        peak, frames_ok, frame_err = None, 0, []
        if mp4:
            mix = read_audio(mp4)
            s_audio, peak = audio_offset(narr, mix)
            s_video = s_audio
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
        return 2, {}
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
    blk = abs(med) > MEDIAN_MAX or miss > MISS_MAX
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
        print(("BLOCK" if blk else "OK") + f": caption timing (|median| <= {MEDIAN_MAX * 1000:.0f} ms and <= {MISS_MAX:.0%} of words over "
              f"{WORD_MAX * 1000:.0f} ms)")
        if blk:
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
