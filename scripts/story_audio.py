"""The story Short's sound: voice clarity, the game under it, sound design, room tone, the mood score, the master.

The standard and its evidence: docs/audio.md. In short:
- voice: high-pass 80 Hz, -2 dB at 250 Hz (mud), +2.5 dB at 3.5 kHz (presence), de-ess, 3:1 compression, -15 LUFS
- game: -27 LUFS, ducked 4 dB while a line is spoken (on-screen sounds land in the gaps)
- score: a mood-tagged track (music/score.json) at -26 LUFS, ducked 7 dB under speech (the voice sits ~18 dB over
  it), dropping out 0.45 s before the payoff (silence before the hit), a riser into the drop-out, an impact on
  the payoff, then the payoff track (or the same one, for funny) from its loudest entrance
- room tone at -47 LUFS under everything: never digital silence (the pacing gate found 8-12% of our Shorts'
  nosong mixes below -70 LUFS between lines)
- whooshes only on scene changes, at most one per 6 s, peaking just before the cut
- master: -14 LUFS integrated, true peak <= -1 dBTP (measured with 4x oversampling), no dynamic loudnorm:
  the old double loudnorm left our stories at 1.3-2.7 LU of loudness range, the payoff no louder than the setup

edit.py --story calls mix_story() (no music: short_nosong.mp4); scripts/add_song.py calls add_score().
story.json fields: "mood": "eerie" | ["eerie", "sad"] (before / after the payoff), "payoff": "L13" or "event:boom",
"audio": {"whoosh": false, "riser": false, "hit": false, "score": false} to turn a default off.

  python3 scripts/story_audio.py plan stories/<name> work/<stunt>.rec.json [--start S]   # what it will do, no audio
"""
import json
import pathlib
import re
import subprocess
import sys
import tempfile

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
SR = 48000

VOICE_LUFS, GAME_LUFS, BED_LUFS, PAYOFF_LUFS, ROOM_LUFS = -15.0, -27.0, -26.0, -24.0, -47.0
BED_DUCK_DB, GAME_DUCK_DB = 7.0, 4.0
DUCK_ATTACK, DUCK_RELEASE, DUCK_LEAD = 0.08, 0.35, 0.08
SILENCE_BEFORE_HIT = 0.45
RISER_LEN = 1.9
WHOOSH_MIN_GAP = 6.0
MASTER_LUFS, MASTER_TP = -14.0, -1.0
# voice clarity (ffmpeg): rumble out, mud down, presence up, sibilance tamed, 3:1 compression
VOICE_CHAIN = ("highpass=f=80:poles=2,equalizer=f=250:t=q:w=1.0:g=-2,equalizer=f=3500:t=q:w=1.2:g=2.5,"
               "deesser=i=0.4:m=0.5:f=0.5:s=o,acompressor=threshold=0.125:ratio=3:attack=5:release=60:knee=2.5:makeup=1")
MOODS = ("eerie", "tense", "sad", "funny", "heroic")
MOOD_WORDS = {   # a fallback only: story-write sets story.json "mood"
    "sad": r"\b(die[sd]?|dead|death|funeral|grave|miss(ed|es)?|alone|goodbye|never came back|lost|old|grandpa|grandma|last)\b",
    "eerie": r"\b(night|warden|herobrine|ghost|nobody|empty|shadow|stares?|watch(ing|es)?|dark|creeper|zombie|sculk|whisper)\b",
    "heroic": r"\b(raid|save[sd]?|protect|defend|hero|fight|army|brave)\b",
    "funny": r"\b(nitwit|dumb|stupid|prank|chicken|oops|accidentally)\b|💀|😭",
}
MIXKIT = ROOT / "sfx" / "mixkit"
WHOOSH_FILE = MIXKIT / "transition" / "transition_windy_swoosh_1474.mp3"
RISER_FILE = MIXKIT / "cinematic" / "cinematic_trailer_riser_790.mp3"
HIT_FILE = MIXKIT / "transition" / "apocalyptic_stomp_impact_3057.mp3"


# ------------------------------------------------------------------ io
def read(path, ss=0.0, dur=None):
    """Any audio -> float32 stereo at SR."""
    cmd = ["ffmpeg", "-v", "error"] + (["-ss", f"{ss:.4f}"] if ss else []) + ["-i", str(path)] + (["-t", f"{dur:.4f}"] if dur else []) + \
          ["-map", "0:a:0", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def write(path, x):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_f32le", str(path)],
                   input=np.ascontiguousarray(x, np.float32).tobytes(), check=True)
    return path


def lufs(x):
    """Integrated loudness of a stereo array (ffmpeg ebur128 on a temp file)."""
    if not np.any(x):
        return -70.0
    import loud
    with tempfile.TemporaryDirectory() as td:
        return loud.measure(write(pathlib.Path(td) / "m.wav", x))


def to_lufs(x, target):
    v = lufs(x)
    return x * (10 ** ((target - v) / 20)) if v > -69 else x


def fit(x, n):
    out = np.zeros((n, 2), np.float32)
    k = min(n, len(x))
    out[:k] = x[:k]
    return out


def put(mix, x, t, gain=1.0):
    i = int(round(t * SR))
    a, b = max(0, i), min(len(mix), i + len(x))
    if b > a:
        mix[a:b] += x[a - i:b - i] * gain


def peak_index(x, win=0.02):
    env = np.convolve(np.abs(x).mean(1), np.ones(int(win * SR)) / int(win * SR), "same")
    return int(np.argmax(env))


def onset_index(x, frac=0.1):
    a = np.abs(x).mean(1)
    idx = np.nonzero(a > frac * a.max())[0]
    return int(idx[0]) if len(idx) else 0


def fades(x, fin=0.0, fout=0.0):
    x = x.copy()
    if fin > 0:
        k = min(len(x), int(fin * SR))
        x[:k] *= np.linspace(0, 1, k)[:, None]
    if fout > 0:
        k = min(len(x), int(fout * SR))
        if k:
            x[-k:] *= np.linspace(1, 0, k)[:, None]
    return x


# ------------------------------------------------------------------ the story's timing
def _story(story_dir):
    return json.loads((pathlib.Path(story_dir) / "story.json").read_text())


def line_times(story_dir, timeline, start):
    """[(t, line id, onset, end)] in Short seconds (the same marks and cut snapping as the captions)."""
    import story_track
    story, voice = story_track._lines(story_dir)
    ids = {l["id"] for l in story["lines"]}
    out = []
    for t, lid in story_track._marks(timeline, start, ids, story.get("start_on_respawn", ())):
        v = voice["lines"].get(lid, {})
        out.append((t, lid, v.get("onset", 0.0), v.get("end", v.get("dur", 0.0))))
    return out


def speech_spans(story_dir, timeline, start):
    return [(t + on, t + end) for t, _, on, end in line_times(story_dir, timeline, start)]


def payoff_time(story_dir, timeline, start, dur=None, end_after=None):
    """The payoff in Short seconds. story.json "payoff" in the pacing gate's form (scripts/pace.py): a line id or a
    mark name, optionally "+0.4" / ":0.4" seconds after it ("L19", "boom", "today_word+0.2"); else the edit's
    endAfter mark (not story_end/end/line); else a `payoff`, `reveal` or `boom` mark. None: no stinger, no switch."""
    spec = _story(story_dir).get("payoff")
    lines = {lid: lt for lt, lid, _, _ in line_times(story_dir, timeline, start)}

    def mark(name):
        if name in lines:
            return lines[name]
        return next((e["t"] / 1000 - start for e in timeline if e["event"] == name), None)
    t = None
    if spec:
        t = mark(re.split(r"[+:]", str(spec))[0])
        m = re.search(r"[+:](-?[\d.]+)$", str(spec))
        if t is not None and m:
            t += float(m.group(1))
    if t is None and end_after:
        ev = str(end_after).split(":")[0]
        if ev not in ("story_end", "end", "line"):
            t = mark(ev)
    if t is None and not spec:
        t = next((e["t"] / 1000 - start for e in timeline if e["event"] in ("payoff", "reveal", "boom")), None)
    if t is None or t < 1.0 or (dur is not None and t > dur - 0.2):
        return None
    return t


def scene_cuts(timeline, start, dur, poses=None):
    """Cut times (Short seconds) that get a whoosh: scene changes only (the clock jumps on the cut, or the camera
    moves over 24 blocks), never in the first second, at most one per WHOOSH_MIN_GAP s. A whoosh on every cut is
    noise: a story cuts on nearly every line."""
    times = [e["t"] for e in timeline if e["event"] == "time"]
    by_tick = {p[0]: p for p in (poses or [])}
    out, last = [], -1e9
    for e in sorted((e for e in timeline if e["event"] == "cut"), key=lambda e: e["t"]):
        c = e["t"] / 1000 - start
        if c < 1.0 or c > dur - 0.5 or c - last < WHOOSH_MIN_GAP:
            continue
        tick = e["t"] // 50
        a, b = by_tick.get(tick - 2), by_tick.get(tick + 2)
        far = bool(a and b and ((a[1] - b[1]) ** 2 + (a[3] - b[3]) ** 2) ** 0.5 > 24)
        if far or any(abs(t - e["t"]) <= 200 for t in times) or e.get("scene"):
            out.append(c)
            last = c
    return out


def mood_of(story_dir):
    """(before, after) moods: story.json "mood" (a string or [before, after]), else guessed from the premise."""
    story = _story(story_dir)
    m = story.get("mood")
    if isinstance(m, list) and m:
        return m[0], m[-1]
    if isinstance(m, str) and m in MOODS:
        return m, m
    text = " ".join(str(story.get(k, "")) for k in ("caption", "premise", "twist", "logline")).lower()
    score = {k: len(re.findall(rx, text)) for k, rx in MOOD_WORDS.items()}
    best = max(score, key=score.get)
    m = best if score[best] else "tense"
    return m, m


def audio_opts(story_dir):
    return {"whoosh": True, "riser": True, "hit": True, "score": True, **(_story(story_dir).get("audio") or {})}


# ------------------------------------------------------------------ building blocks
def duck_gain(n, spans, depth_db, attack=DUCK_ATTACK, release=DUCK_RELEASE, lead=DUCK_LEAD):
    """Per-sample gain: 1, down by depth_db while any span is spoken (starting `lead` early), with attack/release."""
    rate = 1000
    m = int(n * rate / SR) + 2
    tgt = np.ones(m)
    low = 10 ** (-depth_db / 20)
    for a, b in spans:
        tgt[max(0, int((a - lead) * rate)):max(0, int(b * rate))] = low
    g = np.empty(m)
    acc = 1.0
    ka, kr = 1 - np.exp(-1 / (attack * rate)), 1 - np.exp(-1 / (release * rate))
    for i in range(m):
        k = ka if tgt[i] < acc else kr
        acc += k * (tgt[i] - acc)
        g[i] = acc
    return np.interp(np.arange(n) * rate / SR, np.arange(m), g).astype(np.float32)[:, None]


def room_tone(n, seed=11):
    """Soft air: brown-ish noise, low-passed, decorrelated L/R (never digital silence)."""
    rng = np.random.default_rng(seed)
    w = rng.standard_normal((n, 2)).astype(np.float32)
    k = np.ones(SR // 400) / (SR // 400)   # a gentle low-pass (box filter ~ 400 Hz)
    x = np.stack([np.convolve(w[:, c], k, "same") for c in range(2)], 1)
    return to_lufs(x.astype(np.float32), ROOM_LUFS)


def _lib(path, fallback):
    try:
        return read(path) if path.exists() else fallback()
    except Exception:
        return fallback()


def design_track(story_dir, timeline, start, dur, stunt_sfx=None, end_after=None):
    """Whooshes on scene cuts, a riser into the drop-out before the payoff, the hit on the payoff. (stereo, notes)"""
    import sfx
    n = int(dur * SR) + SR
    mix = np.zeros((n, 2), np.float32)
    notes = []
    opts = audio_opts(story_dir)
    manual = {s[0] for s in (json.loads(stunt_sfx) if isinstance(stunt_sfx, str) else (stunt_sfx or [])) if s}
    spans = speech_spans(story_dir, timeline, start)
    P = payoff_time(story_dir, timeline, start, dur, end_after)
    mood = mood_of(story_dir)[0]
    if opts["whoosh"] and "whoosh" not in manual:
        w = _lib(WHOOSH_FILE, lambda: sfx.synth_whoosh(0.6))
        pk = peak_index(w)
        w = fades(w[:min(len(w), pk + int(0.5 * SR))], 0.0, 0.3) * (10 ** (-20 / 20) / max(1e-6, np.abs(w).max()))   # peak -20 dBFS
        import story_track
        for c in scene_cuts(timeline, start, dur, story_track.POSES):
            if P is not None and abs(c - P) < 2.5:
                continue
            put(mix, w, c - 0.04 - pk / SR)
            notes.append(f"whoosh {c:.2f}s")
    if P is not None and opts["riser"] and not manual & {"riser", "scratch"}:
        end = P - SILENCE_BEFORE_HIT
        if mood == "funny":   # the comic stop: a record scratch into the silence
            s = sfx.synth_scratch() * (10 ** (-12 / 20))
            put(mix, s, end - len(s) / SR + 0.05)
            notes.append(f"scratch into {end:.2f}s")
        elif end - RISER_LEN > 0.5:
            r = _lib(RISER_FILE, lambda: sfx.synth_riser(RISER_LEN))
            pk = peak_index(r, 0.05)
            r = r[max(0, pk - int(RISER_LEN * SR)):pk]
            r = fades(r, 0.3, 0.03) * (10 ** (-14 / 20) / max(1e-6, np.abs(r).max()))   # peaks -14 dBFS on the cut
            put(mix, r, end - len(r) / SR)
            notes.append(f"riser {end - len(r) / SR:.2f}-{end:.2f}s")
    if P is not None and opts["hit"] and not manual & {"boom", "impact"} and mood != "funny":
        h = _lib(HIT_FILE, lambda: sfx.synth_boom(2.0))
        h = h[onset_index(h):]
        h = fades(h, 0.0, 0.6) * (10 ** (-5 / 20) / max(1e-6, np.abs(h).max()))
        sub = sfx.synth_boom(1.8, 80, 32, 0.6) * (10 ** (-9 / 20))
        put(mix, h, P)
        put(mix, sub, P)
        notes.append(f"hit {P:.2f}s")
    return mix[: int(dur * SR)], notes


# ------------------------------------------------------------------ edit.py: the story mix without music
def mix_story(narration_wav, game, game_ss, story_dir, timeline, start, dur, out_wav, song=None, song_start=0.0, stunt_sfx=None, end_after=None):
    """Voice (clarity chain, -15 LUFS) + game (-27, ducked) + design + room tone (+ an explicit --song as the bed).
    Writes a float wav of `dur` s; the master (-14 LUFS, -1 dBTP) is applied to the encoded file by master()."""
    n = int(dur * SR)
    with tempfile.TemporaryDirectory() as td:
        vp = pathlib.Path(td) / "voice.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(narration_wav), "-af", VOICE_CHAIN, "-ac", "2", "-ar", str(SR), "-c:a", "pcm_f32le", str(vp)], check=True)
        voice = fit(read(vp), n)
    voice = to_lufs(voice, VOICE_LUFS)
    spans = speech_spans(story_dir, timeline, start)
    mix = voice.copy()
    if game:
        g = fit(read(game, game_ss, dur + 0.1), n)
        if np.any(g):
            mix += to_lufs(g, GAME_LUFS) * duck_gain(n, spans, GAME_DUCK_DB)
    d, notes = design_track(story_dir, timeline, start, dur, stunt_sfx, end_after)
    mix += fit(d, n)
    mix += room_tone(n)
    if song:   # a stunt's own bed (edit.song): quiet and ducked, like the score
        s = fit(read(song, song_start, dur + 0.1), n)
        mix += fades(to_lufs(s, BED_LUFS), 0.3, 0.3) * duck_gain(n, spans, BED_DUCK_DB)
    write(out_wav, mix)
    print("story audio:", ", ".join(notes) or "no design sounds", f"(mood {mood_of(story_dir)[0]}, payoff {payoff_time(story_dir, timeline, start, dur, end_after) or 0:.2f}s)")
    return out_wav


# ------------------------------------------------------------------ add_song.py: the mood score
def tracks():
    return json.loads((ROOT / "music" / "score.json").read_text())


def fetch_name(t):
    return f"songs/score/{t['id']}.ogg"


def _presence(path):
    import audio_measure
    return audio_measure.presence_share(path)


def pick(mood, name, role="bed", used=None, avoid=()):
    """A track for `mood`: beds prefer a free voice band (little energy at 1-4 kHz), payoffs the track marked for
    it in the list; ties: the least used across the packages, then a fixed per-Short choice."""
    import fetch_music
    cand = [t for t in tracks() if t["mood"] == mood and t["id"] not in avoid] or [t for t in tracks() if t["id"] not in avoid]
    if role == "payoff":
        cand = [t for t in cand if t.get("role") == "payoff"] or cand
    else:
        cand = [t for t in cand if t.get("role") != "payoff"] or cand
    used = used or {}
    h = sum(map(ord, name))
    ids = sorted(t["id"] for t in cand)
    cand.sort(key=lambda t: (used.get(t["id"], 0), (ids.index(t["id"]) - h) % len(ids)))
    for t in cand:
        p = fetch_music.fetch(t)
        if p:
            if role == "bed" and len(cand) > 1 and _presence(p) > 0.15:   # a lead instrument in the voice band
                continue
            return t, p
    return None, None


def lead_in(path):
    """Seconds of near-silence at a track's start (skip it: the bed is there from frame 1)."""
    import audio_measure
    m = audio_measure.ebur(path, dur=30)["M"]
    loud = np.nonzero(m > m.max() - 18)[0]
    return max(0.0, (int(loud[0]) - 4) * 0.1) if len(loud) else 0.0


def add_score(src, out, name, story_dir, timeline, start, used=None, end_after=None):
    """Mix the mood score under a finished story mix (short_nosong.mp4) into `out`, master it. Returns song metadata."""
    import song_drop
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)], capture_output=True, text=True, check=True).stdout)
    n = int(dur * SR)
    m1, m2 = mood_of(story_dir)
    spans = speech_spans(story_dir, timeline, start)
    P = payoff_time(story_dir, timeline, start, dur, end_after)
    ta, pa = pick(m1, name, "bed", used)
    if not ta:
        raise SystemExit("no score track: python3 scripts/fetch_music.py")
    s0 = lead_in(pa)
    bed = fit(read(pa, s0, dur + 1), n)
    bed = to_lufs(bed, BED_LUFS)
    used_tracks = [ta]
    if P is not None:
        cut = P - SILENCE_BEFORE_HIT
        k = int(cut * SR)
        bed[:k] = fades(bed[:k], 0.15, 0.12)
        bed[k:] = 0
        if dur - P >= 2.0:
            if m2 == "funny" and m1 == "funny":   # comedy: the same tune picks up again after the stop
                b = fit(read(pa, s0 + cut, dur - P + 0.5), n - int(P * SR))
                tb = ta
            else:
                tb, pb = pick(m2, name, "payoff", used, avoid=(ta["id"],))
                d = song_drop.drop_time(str(pb), limit=60)[0] if pb else 0.0
                b = fit(read(pb, d, dur - P + 0.5), n - int(P * SR)) if pb else np.zeros((n - int(P * SR), 2), np.float32)
                if tb:
                    used_tracks.append(tb)
            b = fades(to_lufs(b, PAYOFF_LUFS), 0.02, 0.8)
            bed[int(P * SR):] += b[: n - int(P * SR)]
    else:
        bed = fades(bed, 0.15, 0.8)
    bed *= duck_gain(n, spans, BED_DUCK_DB)
    mix = fit(read(src), n) + bed
    with tempfile.TemporaryDirectory() as td:
        w = write(pathlib.Path(td) / "mix.wav", mix)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-i", str(w), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], check=True)
    master(out)
    print(f"{name}: score {m1}/{m2}: {', '.join(t['title'] for t in used_tracks)}; payoff {'%.2fs' % P if P is not None else 'none'}")
    return used_tracks, (m1, m2), P


# ------------------------------------------------------------------ the master
def true_peak(path):
    import audio_measure
    return audio_measure.ebur(path)["TP"]


def master(path, target=MASTER_LUFS, tp=MASTER_TP):
    """Static gain to `target` LUFS, then a limiter run at 4x the sample rate (so inter-sample peaks are caught),
    its ceiling starting 0.7 dB under `tp` (AAC adds overshoot); the encoded result is measured (loudness and true
    peak) and the gain or the ceiling corrected until both land. Video copied. No dynamic loudnorm."""
    import audio_measure
    import os
    gain = target - audio_measure.ebur(path)["I"]
    ceil = tp - 0.7
    tmp = str(path) + ".master.mp4"
    for _ in range(6):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-map", "0:v?", "-map", "0:a", "-c:v", "copy",
                        "-af", f"volume={gain:.2f}dB,aresample=192000,alimiter=limit={10 ** (ceil / 20):.4f}:attack=1:release=60:level=false,aresample=48000",
                        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp], check=True)
        m = audio_measure.ebur(tmp)
        miss, over = target - m["I"], m["TP"] - tp
        if abs(miss) < 0.3 and over <= 0:
            break
        if over > 0:
            ceil -= over + 0.1
        gain += miss
    os.replace(tmp, path)


if __name__ == "__main__":
    import argparse
    import gzip
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["plan"])
    ap.add_argument("story")
    ap.add_argument("rec")
    ap.add_argument("--start", type=float, default=None)
    ap.add_argument("--dur", type=float, default=60.0)
    a = ap.parse_args()
    raw = pathlib.Path(a.rec).read_bytes()
    rec = json.loads(gzip.decompress(raw) if a.rec.endswith(".gz") else raw)
    import story_track
    story_track.POSES = rec.get("poses")
    tl = rec["timeline"]
    start = a.start if a.start is not None else min(e["t"] for e in tl if e["event"] == "line") / 1000
    print("moods", mood_of(a.story), "payoff", payoff_time(a.story, tl, start, a.dur))
    print("speech", [(round(x, 2), round(y, 2)) for x, y in speech_spans(a.story, tl, start)])
    print("whoosh cuts", [round(c, 2) for c in scene_cuts(tl, start, a.dur, rec.get("poses"))])
