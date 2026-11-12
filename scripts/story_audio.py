"""The story Short's sound: voice clarity, the game under it, the scene's ambience, sound design, room tone, the
mood score, the master. All of it in the edit (edit.py --story), so a preview is what gets posted.

The standard and its evidence: docs/audio.md. In short:
- voice: high-pass 80 Hz, -2 dB at 250 Hz (mud), +2.5 dB at 3.5 kHz (presence), de-ess, 3:1 compression, -15 LUFS
- score: a mood-tagged track (music/score.json) at -26 LUFS through a voice-pocket EQ (-4 dB at 2.5 kHz), ducked
  only 2.5 dB under speech: it sits ~13.5 dB under the voice the whole way, as in the owner's reference Short
  (measured 2026-11-10: bed 13.8 dB under the voice, constant, no audible ducking). It stops 0.45 s before the
  payoff and never comes back: no payoff track, no sting after the story (owner, 2026-11-10)
- game: -27 LUFS, ducked 4 dB while a line is spoken (on-screen sounds land in the gaps)
- ambience: the shot's scene (scripts/onscreen_sfx.scenes: night crickets, day air, a cave's cold wind, vanilla
  rain, the nether's loop, underwater) at -38 LUFS, ducked 3 dB under speech
- clarity guard: wherever a line is spoken, everything that isn't the voice is held >= 9 dB under it in the
  speech band (300 Hz-4 kHz), by at most 8 dB
- design: no whooshes by default (owner, 2026-11-10: "the woosh is too jarring and loud"; the reference has none);
  a soft riser (peak -24 dBFS, slow attack) into the drop-out and the hit on the payoff
- room tone at -47 LUFS under everything: never digital silence
- master: -14 LUFS integrated, true peak <= -1 dBTP (4x oversampled), no dynamic loudnorm

edit.py --story calls mix_story() (the whole mix, score included; it writes the score's credit next to the mix and
edit.py stamps it in the mp4's `comment` tag, which publish reads: scripts/add_song.py). add_score() is the
fallback for an mp4 rendered before the score moved into the edit.
story.json fields: "mood": "eerie" | ["eerie", "sad"] (before / after the payoff), "payoff": "L13" or "event:boom",
"score": "<track id>" to pin a track, "audio": {"whoosh": true, "riser": false, "hit": false, "score": false,
"ambience": false} to change a default.

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

VOICE_LUFS, GAME_LUFS, BED_LUFS, ROOM_LUFS, AMB_LUFS = -15.0, -27.0, -26.0, -47.0, -38.0
BED_DUCK_DB, GAME_DUCK_DB, AMB_DUCK_DB = 2.5, 4.0, 3.0
DUCK_ATTACK, DUCK_RELEASE, DUCK_LEAD = 0.08, 0.35, 0.08
SILENCE_BEFORE_HIT = 0.45
RISER_LEN = 1.9
WHOOSH_MIN_GAP = 6.0
WHOOSH_PEAK, RISER_PEAK, HIT_PEAK, SUB_PEAK, SCRATCH_PEAK = -32.0, -24.0, -6.0, -12.0, -18.0
KEY_DUCK_DB = 24.0   # the score under a key sound (edit.keySounds), as add_song.py ducks a stunt's bed (key_sounds.DUCK): the gate wants the sound >= 8 dB over it
CLEAR_DB, GUARD_MAX_DB = 9.0, 8.0   # the clarity guard: the sfx this far under the voice in the speech band, at most 8 dB down
BED_CLEAR_DB, BED_GUARD_MAX_DB = 6.0, 4.0   # and the bed's swells (the reference's bed sits 16+ dB under in that band 90% of the time)
MASTER_LUFS, MASTER_TP = -14.0, -1.0
# voice clarity (ffmpeg): rumble out, mud down, presence up, sibilance tamed, 3:1 compression
VOICE_CHAIN = ("highpass=f=80:poles=2,equalizer=f=250:t=q:w=1.0:g=-2,equalizer=f=3500:t=q:w=1.2:g=2.5,"
               "deesser=i=0.4:m=0.5:f=0.5:s=o,acompressor=threshold=0.125:ratio=3:attack=5:release=60:knee=2.5:makeup=1")
# the bed's voice pocket: sub rumble out, the speech band 6 dB down over ~650 Hz-3 kHz (the reference's bed has ~10% of its
# energy at 1-4 kHz; a mid-heavy track under a -4 dB pocket still lost 6 dB to the clarity guard)
BED_EQ = "highpass=f=45:poles=2,equalizer=f=1400:t=o:w=2.2:g=-6,highshelf=f=7000:g=-2"
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
AMB = MIXKIT / "ambience"
# the scene's bed (onscreen_sfx.scenes kinds): a Mixkit loop or a vanilla loop event, its gain (dB) and a low-pass (Hz)
AMBIENCE = {
    "night": ("file", AMB / "summer_night_crickets_loop_1789.mp3", 0.0, None),
    "dusk": ("file", AMB / "summer_night_crickets_loop_1789.mp3", -5.0, None),
    "day": ("file", AMB / "breeze_through_the_trees_2427.mp3", -3.0, None),
    "indoor_night": ("file", AMB / "summer_night_crickets_loop_1789.mp3", -10.0, 1400),
    "cave": ("file", AMB / "wind_cold_interior_1172.mp3", -2.0, None),
    "rain": ("vanilla", "weather.rain", 0.0, None),
    "rain_indoor": ("vanilla", "weather.rain.above", -4.0, None),
    "nether": ("vanilla", "ambient.nether_wastes.loop", 0.0, None),
    "underwater": ("vanilla", "ambient.underwater.loop", 0.0, None),
}


# ------------------------------------------------------------------ io
def read(path, ss=0.0, dur=None, af=None):
    """Any audio -> float32 stereo at SR (through an ffmpeg filter chain `af`, if given)."""
    cmd = ["ffmpeg", "-v", "error"] + (["-ss", f"{ss:.4f}"] if ss else []) + ["-i", str(path)] + (["-t", f"{dur:.4f}"] if dur else []) + \
          ["-map", "0:a:0"] + (["-af", af] if af else []) + ["-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
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
    return {"whoosh": False, "riser": True, "hit": True, "score": True, "ambience": True, **(_story(story_dir).get("audio") or {})}


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


def _lib(path, fallback, af=None):
    try:
        return read(path, af=af) if path.exists() else fallback()
    except Exception:
        return fallback()


def design_track(story_dir, timeline, start, dur, stunt_sfx=None, end_after=None):
    """A riser into the drop-out before the payoff and the hit on the payoff (and whooshes on scene cuts only when a
    story asks for them: "audio": {"whoosh": true}). (stereo, notes)

    Owner, 2026-11-10: "the woosh is too jarring and loud". Measured on the previews: each scene-cut whoosh peaked at
    -20 dBFS with a sharp onset, on cuts where the voice often wasn't speaking, and the reference Short has none (its
    only transient is a hit on frame 1). So they are off by default, and when asked for: -32 dBFS peak, low-passed
    at 5 kHz, a 120 ms fade in. The riser is -24 dBFS peak (was -14), low-passed, its attack the first 70% of it."""
    import sfx
    n = int(dur * SR) + SR
    mix = np.zeros((n, 2), np.float32)
    notes = []
    opts = audio_opts(story_dir)
    manual = {s[0] for s in (json.loads(stunt_sfx) if isinstance(stunt_sfx, str) else (stunt_sfx or [])) if s}
    P = payoff_time(story_dir, timeline, start, dur, end_after)
    m1, m2 = mood_of(story_dir)
    comic = m1 == "funny" and m2 == "funny"
    if opts["whoosh"] and "whoosh" not in manual:
        w = _lib(WHOOSH_FILE, lambda: sfx.synth_whoosh(0.6), "lowpass=f=5000")
        pk = peak_index(w)
        w = fades(w[:min(len(w), pk + int(0.5 * SR))], 0.12, 0.3)
        w *= 10 ** (WHOOSH_PEAK / 20) / max(1e-6, np.abs(w).max())
        pk = peak_index(w)
        import story_track
        for c in scene_cuts(timeline, start, dur, story_track.POSES):
            if P is not None and abs(c - P) < 2.5:
                continue
            put(mix, w, c - 0.04 - pk / SR)
            notes.append(f"whoosh {c:.2f}s")
    hit = P is not None and opts["hit"] and not manual & {"boom", "impact"} and not comic
    if P is not None and opts["riser"] and not manual & {"riser", "scratch"}:
        end = P - SILENCE_BEFORE_HIT
        if comic:   # the comic stop: a record scratch into the silence
            s = sfx.synth_scratch() * (10 ** (SCRATCH_PEAK / 20))
            put(mix, s, end - len(s) / SR + 0.05)
            notes.append(f"scratch into {end:.2f}s")
        elif hit and end - RISER_LEN > 0.5:   # a riser only leads into a hit (Good Boy turns the hit off: no riser either)
            r = _lib(RISER_FILE, lambda: sfx.synth_riser(RISER_LEN), "lowpass=f=7000")
            pk = peak_index(r, 0.05)
            r = r[max(0, pk - int(RISER_LEN * SR)):pk]
            r = fades(r, 0.7 * len(r) / SR, 0.03) * (10 ** (RISER_PEAK / 20) / max(1e-6, np.abs(r).max()))
            put(mix, r, end - len(r) / SR)
            notes.append(f"riser {end - len(r) / SR:.2f}-{end:.2f}s")
    if hit:
        h = _lib(HIT_FILE, lambda: sfx.synth_boom(2.0))
        h = h[onset_index(h):]
        h = fades(h, 0.0, 0.6) * (10 ** (HIT_PEAK / 20) / max(1e-6, np.abs(h).max()))
        sub = sfx.synth_boom(1.8, 80, 32, 0.6) * (10 ** (SUB_PEAK / 20))
        put(mix, h, P)
        put(mix, sub, P)
        notes.append(f"hit {P:.2f}s")
    return mix[: int(dur * SR)], notes


# ------------------------------------------------------------------ ambience: the scene under the story
_LOOPS = {}


def _vanilla_loop(event, seconds, seed=7):
    """A vanilla sound event tiled to `seconds` (random variants, 60 ms crossfades), stereo."""
    sys.path.insert(0, str(ROOT))
    import random
    import audio
    defs = json.loads(audio.asset("minecraft/sounds.json").read_text())
    rng = random.Random(seed)
    out = np.zeros((int(seconds * SR) + SR, 2), np.float32)
    i, xf = 0, int(0.06 * SR)
    while i < int(seconds * SR):
        v = rng.choice(defs[event]["sounds"])
        v = {"name": v} if isinstance(v, str) else v
        x = audio.decode(audio.asset(f"minecraft/sounds/{v['name']}.ogg"), v.get("pitch", 1.0)) * v.get("volume", 1.0)
        if len(x) < 2 * xf:
            break
        x = fades(np.repeat(x[:, None], 2, 1), 0.06, 0.06)
        put(out, x, i / SR)
        i += len(x) - xf
    return out[: int(seconds * SR)]


def _amb_source(kind, seconds):
    """The bed for a scene kind, at least `seconds` long, at AMB_LUFS + its gain (cached per kind)."""
    spec = AMBIENCE.get(kind)
    if not spec:
        return None
    if kind in _LOOPS and len(_LOOPS[kind]) >= seconds * SR:
        return _LOOPS[kind]
    how, src, gain, lp = spec
    if how == "file":
        if not pathlib.Path(src).exists():
            return None
        x = read(src, af=f"lowpass=f={lp}" if lp else None)
        if len(x) < SR:
            return None
        while len(x) < seconds * SR:   # loop it with a 0.5 s crossfade
            k = int(0.5 * SR)
            y = x.copy()
            y[:k] = x[-k:] * np.linspace(1, 0, k)[:, None] + y[:k] * np.linspace(0, 1, k)[:, None]
            x = np.concatenate([x[:-k], y])
    else:
        try:
            x = _vanilla_loop(src, seconds + 1)
        except Exception as e:   # noqa: BLE001 (no Mojang assets here: no ambience, never a failed edit)
            print("ambience:", kind, "unavailable:", e)
            return None
    x = to_lufs(x, AMB_LUFS + gain)
    _LOOPS[kind] = x
    return x


def ambience_track(scenes, start, dur):
    """The scenes' beds laid end to end in Short time (scenes in recording seconds), 80 ms crossfades at the cuts; a
    kind that comes back resumes where it was, so a night across several cuts is one continuous night. (stereo, notes)"""
    n = int(dur * SR)
    mix = np.zeros((n, 2), np.float32)
    notes = []
    for a, b, kind in scenes:
        a, b = max(0.0, a - start), min(dur, b - start)
        if b - a < 0.05:
            continue
        src = _amb_source(kind, dur + 1)
        notes.append(f"{a:.2f}-{b:.2f}s {kind}{'' if src is not None else ' (none)'}")
        if src is None:
            continue
        i, j = int(a * SR), int(b * SR)
        seg = src[i:j].copy()
        seg = fades(seg, 0.08 if a > 0 else 0.0, 0.08 if b < dur else 0.0)
        mix[i:i + len(seg)] += seg
    return mix, notes


def _band_db(x, hop, lo=300.0, hi=4000.0, nfft=2048):
    """Energy (dB) in the speech band, one value per `hop` s."""
    mono = x.mean(1) if x.ndim == 2 else x
    h = int(hop * SR)
    m = len(mono) // h + 1
    pad = np.pad(mono, (nfft // 2, nfft + m * h))
    win = np.hanning(nfft)
    f = np.fft.rfftfreq(nfft, 1 / SR)
    band = (f >= lo) & (f <= hi)
    out = np.empty(m)
    for i in range(m):
        sp = np.fft.rfft(pad[i * h:i * h + nfft] * win)
        out[i] = 10 * np.log10(np.sum(np.abs(sp[band]) ** 2) / nfft + 1e-12)
    return out


def clarity_gain(voice, others, spans, clear_db=CLEAR_DB, hop=0.05, max_cut=GUARD_MAX_DB):
    """Per-sample gain for the non-voice layers so the narration stays clear: wherever a line is spoken, their energy
    in the speech band (300 Hz-4 kHz, where they would mask it) is held `clear_db` under the voice's, the voice taken
    as its loudest over +-0.2 s (so the gaps between words don't pump the bed), at most `max_cut` dB down, attack
    30 ms, release 250 ms. Outside the lines: 1. -> (gain (n, 1), the deepest cut in dB)"""
    n = len(voice)
    h = int(hop * SR)
    if not np.any(np.abs(voice) > 1e-4):   # no voice yet (a placeholder take): nothing to keep clear
        return np.ones((n, 1), np.float32), 0.0
    vd, od = _band_db(voice, hop), _band_db(others, hop)
    m = len(vd)
    k = int(0.2 / hop)
    venv = np.array([vd[max(0, i - k):i + k + 1].max() for i in range(m)])
    speak = np.zeros(m, bool)
    for a, b in spans:
        speak[max(0, int(a / hop)):min(m, int(b / hop) + 1)] = True
    want = np.where(speak & (venv > vd.max() - 45), np.clip(venv - clear_db - od, -max_cut, 0.0), 0.0)
    g = np.empty(m)
    acc = 0.0
    ka, kr = 1 - np.exp(-hop / 0.03), 1 - np.exp(-hop / 0.25)
    for i in range(m):
        acc += (ka if want[i] < acc else kr) * (want[i] - acc)
        g[i] = acc
    lin = 10 ** (g / 20)
    return np.interp(np.arange(n) / h, np.arange(m), lin).astype(np.float32)[:, None], float(g.min())


# ------------------------------------------------------------------ edit.py: the whole story mix
def mix_story(narration_wav, game, game_ss, story_dir, timeline, start, dur, out_wav, song=None, song_start=0.0, stunt_sfx=None,
              end_after=None, name=None, rec=None, stems=None, key_marks=None):
    """Voice (clarity chain, -15 LUFS) + game (-27, ducked) + the scene's ambience + design + the mood score (or an
    explicit --song as the bed) + room tone, the clarity guard over everything but the voice. Writes a float wav of
    `dur` s and, next to it, <out_wav>.json: the score's tracks and credit and every layer's loudness (edit.py stamps
    the score into the mp4 for publish). The master (-14 LUFS, -1 dBTP) is applied to the encoded file by master().
    rec: the recording (with "_path") for the ambience; stems: a folder to write each layer to (for measuring).
    key_marks: edit.keySounds: the bed ducks KEY_DUCK_DB under each mark's sound in the game layer, over the clip
    scripts/key_sounds.py measures (its audible part, at most 2.5 s; thirty_one_raids' raid horns, 2026-11-11: the
    score sat 10 dB over the L09 horn and nothing ducked it, since add_song.py's duck only runs on a stunt's NCS bed)."""
    n = int(dur * SR)
    opts = audio_opts(story_dir)
    with tempfile.TemporaryDirectory() as td:
        vp = pathlib.Path(td) / "voice.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(narration_wav), "-af", VOICE_CHAIN, "-ac", "2", "-ar", str(SR), "-c:a", "pcm_f32le", str(vp)], check=True)
        voice = fit(read(vp), n)
    voice = to_lufs(voice, VOICE_LUFS)
    spans = speech_spans(story_dir, timeline, start)
    P = payoff_time(story_dir, timeline, start, dur, end_after)
    layers = {}
    if game:
        g = fit(read(game, game_ss, dur + 0.1), n)
        if np.any(g):
            layers["game"] = to_lufs(g, GAME_LUFS) * duck_gain(n, spans, GAME_DUCK_DB)
    amb_notes = []
    if rec is not None and opts["ambience"]:
        try:
            import onscreen_sfx
            a, amb_notes = ambience_track(onscreen_sfx.scenes(rec, timeline), start, dur)
            if np.any(a):
                layers["ambience"] = fit(a, n) * duck_gain(n, spans, AMB_DUCK_DB)
        except Exception as e:   # noqa: BLE001 (never fail an edit over the ambience)
            print("ambience failed:", e)
    d, notes = design_track(story_dir, timeline, start, dur, stunt_sfx, end_after)
    layers["design"] = fit(d, n)
    score = None
    if song:   # a stunt's own bed (edit.song): quiet and ducked, like the score
        s = fit(read(song, song_start, dur + 0.1, af=BED_EQ), n)
        layers["bed"] = fades(to_lufs(s, BED_LUFS), 0.3, 0.3) * duck_gain(n, spans, BED_DUCK_DB)
        score = {"song": str(song)}
    elif opts["score"] and name:
        bed, score = score_bed(story_dir, name, dur, spans, P)
        if bed is not None:
            layers["bed"] = bed
    key_win = []
    if key_marks and "bed" in layers and "game" in layers:
        import key_sounds
        kt = sorted(e["t"] / 1000 - start for e in timeline if e["event"] in set(key_marks) and 0 <= e["t"] / 1000 - start < dur)
        key_win = key_sounds.windows(layers["game"].mean(axis=1), kt)
        if key_win:
            layers["bed"] = layers["bed"] * duck_gain(n, key_win, KEY_DUCK_DB, attack=0.03, release=0.3, lead=0.0)
    # the clarity guard, in two parts: the sound effects (game, ambience, design) are held CLEAR_DB under the voice in
    # the speech band (a dig or a hit can't cover a word); the bed, already 13.5 dB under the voice and EQ'd, only has
    # its swells caught (BED_CLEAR_DB, at most BED_GUARD_MAX_DB): guarding it like the sfx dragged a mid-heavy track
    # (Darkest Child) 6 dB down, 17 dB under the voice, where the owner hears no music
    sfx = sum(x for k, x in layers.items() if k != "bed") if any(k != "bed" for k in layers) else np.zeros((n, 2), np.float32)
    gains = {}
    g_sfx, deepest = clarity_gain(voice, sfx, spans)
    for k in layers:
        gains[k] = g_sfx
    if "bed" in layers:
        gains["bed"], d_bed = clarity_gain(voice, layers["bed"], spans, BED_CLEAR_DB, max_cut=BED_GUARD_MAX_DB)
        deepest = min(deepest, d_bed)
    mix = voice + sum(x * gains[k] for k, x in layers.items()) + room_tone(n) if layers else voice + room_tone(n)
    write(out_wav, mix)
    levels = {"voice": round(lufs(voice), 1)}
    for k, x in layers.items():
        levels[k] = round(lufs(x * gains[k]), 1)
    meta = {"score": score, "levels_lufs_premaster": levels, "clarity_guard_max_db": round(deepest, 1), "payoff_s": P,
            "ambience": amb_notes, "design": notes, "key_duck": [[round(a, 2), round(b, 2)] for a, b in key_win]}
    pathlib.Path(str(out_wav) + ".json").write_text(json.dumps(meta, indent=1))
    if stems:
        pathlib.Path(stems).mkdir(parents=True, exist_ok=True)
        write(pathlib.Path(stems) / "voice.wav", voice)
        for k, x in layers.items():
            write(pathlib.Path(stems) / f"{k}.wav", x * gains[k])
    m1, m2 = mood_of(story_dir)
    print("story audio:", ", ".join(notes) or "no design sounds", f"(mood {m1}/{m2}, payoff {P or 0:.2f}s)")
    print("  score:", (score or {}).get("title") or (score or {}).get("song") or "NONE", "| ambience:", "; ".join(amb_notes) or "none")
    if key_win:
        print(f"  key sounds ({', '.join(key_marks)}): the score ducked {KEY_DUCK_DB:g} dB over", ", ".join(f"{a:.2f}-{b:.2f}s" for a, b in key_win))
    print("  layers (LUFS, pre-master):", ", ".join(f"{k} {v}" for k, v in levels.items()), f"| clarity guard down to {deepest:.1f} dB")
    return out_wav


# ------------------------------------------------------------------ the mood score
def tracks():
    return json.loads((ROOT / "music" / "score.json").read_text())


def fetch_name(t):
    return f"songs/score/{t['id']}.ogg"


def _presence(path):
    import audio_measure
    return audio_measure.presence_share(path)


def pick(mood, name, role="bed", used=None, avoid=(), pin=None):
    """A track for `mood`: story.json "score" pins one; else beds prefer a free voice band (little energy at 1-4 kHz);
    ties: the least used (`used`, publish's legacy path only), then a fixed per-Short choice, so a re-render picks the
    same track."""
    import fetch_music
    if pin:
        t = next((t for t in tracks() if t["id"] == pin), None)
        p = fetch_music.fetch(t) if t else None
        if p:
            return t, p
        print(f"score: pinned track {pin!r} unavailable; picking by mood")
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


def score_bed(story_dir, name, dur, spans, P, used=None):
    """The mood score under the story: the before-mood's bed track from frame 1, through the voice-pocket EQ, at
    BED_LUFS, ducked BED_DUCK_DB under each line, out 0.45 s before the payoff (0.12 s fade) and silent after it: no
    payoff track, no sting after the story (owner, 2026-11-10: Good Boy "Wtf is the beat at the end?"; "no music
    sting after the story is over"). No payoff: it runs to the end (0.8 s fade). -> (stereo bed, score meta) or
    (None, None) when no track can be had (the edit goes on without music and says so)."""
    n = int(dur * SR)
    m1, m2 = mood_of(story_dir)
    ta, pa = pick(m1, name, "bed", used, pin=_story(story_dir).get("score"))
    if not ta:
        print("score: WARNING no track (python3 scripts/fetch_music.py): this edit has NO MUSIC")
        return None, None
    s0 = lead_in(pa)
    bed = to_lufs(fit(read(pa, s0, dur + 1, af=BED_EQ), n), BED_LUFS)
    if P is not None:
        k = int((P - SILENCE_BEFORE_HIT) * SR)
        bed[:k] = fades(bed[:k], 0.15, 0.12)
        bed[k:] = 0
    else:
        bed = fades(bed, 0.15, 0.8)
    bed *= duck_gain(n, spans, BED_DUCK_DB)
    meta = {"tracks": [ta["id"]], "file": fetch_name(ta), "title": ta["title"], "artist": ta["artist"], "licence": ta["licence"],
            "credit": ta["credit"], "mood": [m1, m2], "payoff_in_short_s": round(P, 2) if P is not None else None,
            "bed_lufs": BED_LUFS, "bed_duck_db": BED_DUCK_DB, "mix": "scripts/story_audio.py (docs/audio.md)"}
    return bed, meta


def add_score(src, out, name, story_dir, timeline, start, used=None, end_after=None):
    """The fallback for a story mp4 edited before the score moved into the edit (its mp4 has no `score` tag): the same
    score_bed() under the finished mix, mastered. Returns (tracks, moods, payoff)."""
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)], capture_output=True, text=True, check=True).stdout)
    n = int(dur * SR)
    spans = speech_spans(story_dir, timeline, start)
    P = payoff_time(story_dir, timeline, start, dur, end_after)
    bed, meta = score_bed(story_dir, name, dur, spans, P, used)
    if bed is None:
        raise SystemExit("no score track: python3 scripts/fetch_music.py")
    mix = fit(read(src), n) + bed
    with tempfile.TemporaryDirectory() as td:
        w = write(pathlib.Path(td) / "mix.wav", mix)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-i", str(w), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], check=True)
    master(out)
    t = next(t for t in tracks() if t["id"] == meta["tracks"][0])
    print(f"{name}: score {meta['mood'][0]}/{meta['mood'][1]}: {t['title']}; payoff {'%.2fs' % P if P is not None else 'none'}")
    return [t], tuple(meta["mood"]), P


def edit_tag(path):
    """The story edit's stamp (edit.py: the mp4's comment tag): {"hb_score": score meta or None, "levels": {...}}, or {}."""
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format_tags=comment", "-of", "default=nw=1:nk=1", str(path)],
                         capture_output=True, text=True).stdout.strip()
    try:
        j = json.loads(out)
    except ValueError:
        return {}
    return j if isinstance(j, dict) else {}


def score_tag(path):
    """The score an edit baked in, or None (an older edit, or one made without a track)."""
    return edit_tag(path).get("hb_score")


# ------------------------------------------------------------------ the master
def true_peak(path):
    import audio_measure
    return audio_measure.ebur(path)["TP"]


NO_VOICE_MAX_GAIN = 2.0   # dB: a placeholder take (no voice yet) is not pushed up to -14 LUFS on its music and hit


def master(path, target=MASTER_LUFS, tp=MASTER_TP):
    """Static gain to `target` LUFS, then a limiter run at 4x the sample rate (so inter-sample peaks are caught),
    its ceiling starting 0.7 dB under `tp` (AAC adds overshoot); the encoded result is measured (loudness and true
    peak) and the gain or the ceiling corrected until both land. Video copied. No dynamic loudnorm.
    An edit with no voice yet (its tag says voice -70) gets at most NO_VOICE_MAX_GAIN: normalizing a placeholder's
    music and hit to -14 lifted them 10 dB over where they sit under a real take (thirty_one_raids' preview)."""
    import audio_measure
    import os
    gain = target - audio_measure.ebur(path)["I"]
    if ((edit_tag(path).get("levels") or {}).get("voice", 0) or 0) <= -69:
        gain, target = min(gain, NO_VOICE_MAX_GAIN), audio_measure.ebur(path)["I"] + min(gain, NO_VOICE_MAX_GAIN)
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
    if audio_opts(a.story)["whoosh"]:
        print("whoosh cuts", [round(c, 2) for c in scene_cuts(tl, start, a.dur, rec.get("poses"))])
    else:
        print("whooshes: off (story.json audio.whoosh)")
    rec["_path"] = a.rec
    import onscreen_sfx
    print("ambience", [(round(x - start, 2), round(y - start, 2), k) for x, y, k in onscreen_sfx.scenes(rec, tl)])
    name = "story_" + pathlib.Path(a.story).name
    t, _ = pick(mood_of(a.story)[0], name, pin=_story(a.story).get("score"))
    print("score", t["id"] if t else None, "-", t["title"] if t else "NO TRACK (python3 scripts/fetch_music.py)")
