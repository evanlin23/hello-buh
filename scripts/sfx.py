"""Post-render sound effects for the edit (the stunt's `edit.sfx`), mixed under the game audio.

  sfx: [
    ['whoosh', 'cut1b'],              // peak on the mark (teleport cuts, tier changes)
    ['riser', 'drop5', 'splash5'],    // rising sweep over a span, ending exactly on the second mark
    ['wind', 'drop5', 'splash5'],     // fall wind, rising with the fall
    ['air', 'start', 'fall'],         // a steady ambient wind bed (high places, night), faded in and out
    ['impact', 'splash5'],            // sub-bass boom + a punchy hit, layered under the game audio
    ['boom', 'splash5'],              // the big one: deep boom with a long tail
    ['heart', 'beat0h'],              // a heartbeat: two low thumps (tension under a slow-motion freeze)
    ['dip', 'splash5', 0.3],          // the SONG ducks to near silence for 0.3 s before the mark
    ['gamedip', 'splash5', 0.3],      // the GAME audio ducks the same way (a loud game sound over the dip)
    ['pop', 'look2'], ['ding', 'x'],  // UI pop / ding on a mark
    ['pops'],                         // a pop on every impact card and counter change
    ['scratch', 'twist'],             // record scratch stinger (story twists)
    ['file', 'mark', 'sfx/kenney/...ogg', 0.8],
  ]
Every entry can end with an options dict: {"gain": 0.7, "nth": 1} (nth = which occurrence of the event).

Sources (sfx/SOURCES.md): Kenney CC0 packs (committed) and Mixkit SFX (fetched by scripts/fetch_sfx.py,
gitignored; each Mixkit sound has a synthesized fallback, so a container without them still works).
Everything else is synthesized here with numpy (ours). `python3 scripts/sfx.py demo out.wav` writes a
demo reel of every synth sound.
"""
import json
import math
import pathlib
import subprocess
import sys
import wave

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent.parent
SR = 48000
RNG = np.random.default_rng(7)

# library sounds: (path, gain); Mixkit first where it's better, else the synth fallback is used
LIB = {
    "whoosh": ["sfx/mixkit/transition/fast_whoosh_transition_1490.mp3"],
    "pop": ["sfx/mixkit/cartoon/hard_pop_click_2364.mp3", "sfx/kenney/interface-sounds/drop_002.ogg"],
    "ding": ["sfx/kenney/interface-sounds/confirmation_001.ogg"],
    "hit": ["sfx/kenney/impact-sounds/impactPunch_heavy_000.ogg"],
}
GAIN = {"heart": 0.9, "whoosh": 0.55, "riser": 0.45, "wind": 0.35, "air": 0.12, "impact": 0.9, "boom": 1.0, "pop": 0.5, "ding": 0.45, "scratch": 0.6, "file": 0.7}


def _load(x):
    return (json.loads(x) if isinstance(x, str) else x) or []


def read_audio(path):
    """Any audio file -> float32 stereo at SR (ffmpeg)."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def stereo(m):
    return np.stack([m, m], 1).astype(np.float32)


def norm(x, peak=0.9):
    p = np.abs(x).max()
    return x * (peak / p) if p > 0 else x


def onepole(x, cut):
    """Low-pass with a per-sample cutoff (Hz): y += a * (x - y)."""
    cut = np.broadcast_to(np.asarray(cut, float), x.shape)
    a = 1 - np.exp(-2 * np.pi * cut / SR)
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc); y[i] = acc
    return y


def band(x, lo, hi):
    """Band-pass (12 dB/oct each side): low-pass(hi) twice, minus its low-pass(lo) twice; lo/hi can be per-sample arrays."""
    y = onepole(onepole(x, hi), hi)
    return y - onepole(onepole(y, lo), lo)


# ---------------------------------------------------------------- synth
def synth_boom(dur=1.6, f0=95, f1=34, tail=0.55):
    """Sub boom (a vine-boom-like thump): a sine sweeping down, a click on top, soft clipping, a tail."""
    n = int(dur * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.09)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / tail) + 0.35 * np.sin(2 * ph) * np.exp(-t / (tail * 0.4))
    click = band(RNG.standard_normal(n), 200, 3000) * np.exp(-t / 0.012) * 1.5
    x = np.tanh(2.2 * (body + click))
    x *= np.minimum(1, t / 0.002)
    return stereo(norm(x))


def synth_riser(dur):
    """Noise through a rising band plus a gliding tone, swelling to the end (cut off on the mark)."""
    n = max(1, int(dur * SR)); t = np.arange(n) / SR; k = t / max(dur, 1e-3)
    hi = 400 + 7000 * k ** 2
    noise = band(RNG.standard_normal(n), hi * 0.4, hi)
    f = 180 * (2 ** (3 * k))                       # three octaves up
    tone = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.01 * np.sin(2 * np.pi * 6 * t))) / SR)
    x = (0.7 * noise / (np.abs(noise).max() + 1e-9) + 0.3 * tone) * (0.05 + 0.95 * k ** 2.2)
    x[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR)) if n > 400 else 1
    return stereo(norm(x, 0.8))


def synth_wind(dur):
    """Fall wind: low-passed noise with gusts, louder and brighter as the fall speeds up."""
    n = max(1, int(dur * SR)); t = np.arange(n) / SR; k = t / max(dur, 1e-3)
    gust = 1 + 0.35 * np.sin(2 * np.pi * 0.7 * t) + 0.2 * np.sin(2 * np.pi * 1.9 * t + 1)
    l = band(RNG.standard_normal(n), 80, (300 + 1800 * k) * gust)
    r = band(RNG.standard_normal(n), 80, (300 + 1800 * k) * gust)
    env = (0.15 + 0.85 * k ** 1.5) * np.minimum(1, t / 0.15)
    return norm(np.stack([l * env, r * env], 1).astype(np.float32), 0.8)


def synth_air(dur, fade=0.8):
    """Ambient wind: dark, slowly gusting noise at a steady level, faded in and out (no rise)."""
    n = max(1, int(dur * SR)); t = np.arange(n) / SR
    gust = 1 + 0.3 * np.sin(2 * np.pi * 0.13 * t) + 0.18 * np.sin(2 * np.pi * 0.31 * t + 2)
    l = band(RNG.standard_normal(n), 60, 420) * gust
    r = band(RNG.standard_normal(n), 60, 420) * (2 - gust)
    env = np.minimum(1, np.minimum(t / fade, (dur - t) / fade).clip(0, None))
    return norm(np.stack([l * env, r * env], 1).astype(np.float32), 0.8)


def synth_whoosh(dur=0.55):
    """Band-passed noise sweeping up then down, loudest in the middle (the peak is the mark)."""
    n = int(dur * SR); t = np.arange(n) / SR; k = t / dur
    env = np.sin(np.pi * k) ** 2
    hi = 600 + 5000 * env
    l, r = (band(RNG.standard_normal(n), hi * 0.3, hi) for _ in range(2))
    pan = 0.5 + 0.4 * (k - 0.5)
    return norm(np.stack([l * env * (1 - pan) * 2, r * env * pan * 2], 1).astype(np.float32), 0.8)


def synth_scratch(dur=0.42):
    """Record scratch: a buzzy tone with its pitch dragged back and forth."""
    n = int(dur * SR); t = np.arange(n) / SR
    f = 260 + 900 * np.abs(np.sin(2 * np.pi * 3.2 * t)) * np.exp(-t / 0.5)
    ph = np.cumsum(f) / SR
    saw = 2 * (ph % 1) - 1
    x = band(saw + 0.4 * RNG.standard_normal(n), 150, 4000) * np.minimum(1, t / 0.005) * np.exp(-t / 0.3)
    return stereo(norm(x))


def synth_pop(dur=0.08):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (900 - 4000 * t) * t) * np.exp(-t / 0.02)
    return stereo(norm(x))


SYNTH = {"whoosh": synth_whoosh, "pop": synth_pop, "ding": lambda: synth_pop(0.3), "hit": lambda: synth_boom(0.4, 180, 60, 0.08)}


def library(kind):
    for p in LIB.get(kind, []):
        if (HERE / p).exists():
            return read_audio(HERE / p)
    return SYNTH[kind]()


# ---------------------------------------------------------------- track
def plan(spec, timeline, start, cards=None, counter=None):
    """[(kind, t0, t1, opts)] in Short time (timeline already warped)."""
    out = []

    def at(ev, nth=0):
        ts = [e["t"] / 1000 for e in timeline if e["event"] == ev]
        off = 0.0
        if not ts and ":" in str(ev):   # 'EVENT:OFFSET_S', as flash/punch take it (retention.event_at)
            k, _, o = str(ev).rpartition(":")
            try:
                off = float(o)
                ts = [e["t"] / 1000 for e in timeline if e["event"] == k]
            except ValueError:
                pass
        return ts[nth] + off - start if len(ts) > nth else None
    for s in _load(spec):
        s = list(s)
        opts = s.pop() if s and isinstance(s[-1], dict) else {}
        kind = s[0]
        nth = int(opts.get("nth", 0))
        if kind == "pops":            # one pop per impact card and counter change
            for c in _load(cards):
                t = at(c[0], int(c[4]) if len(c) > 4 else 0)
                if t is not None:
                    out.append(("pop", t, t, opts))
            c = _load(counter)
            for ev in (c["at"] if isinstance(c, dict) else c)[1:] if c else []:
                t = at(ev[0] if isinstance(ev, list) else ev)
                if t is not None:
                    out.append(("pop", t, t, {**opts, "gain": opts.get("gain", 0.3)}))
            continue
        t0 = at(s[1], nth) if len(s) > 1 else None
        if t0 is None:
            print(f"sfx {kind} {s[1:]} skipped (event missing)")
            continue
        if kind in ("riser", "wind", "air"):
            t1 = at(s[2], nth) if len(s) > 2 else None
            if t1 is None or t1 <= t0:
                print(f"sfx {kind} {s[1:]} skipped (span empty)")
                continue
            out.append((kind, t0, t1, opts))
        elif kind in ("dip", "gamedip"):
            out.append((kind, t0 - float(s[2] if len(s) > 2 else 0.3), t0, opts))
        elif kind == "file":
            out.append((kind, t0, t0, {**opts, "path": s[2], "gain": s[3] if len(s) > 3 else opts.get("gain", GAIN["file"])}))
        else:
            out.append((kind, t0, t0, opts))
    return out


def dips(spec, timeline, start, shift=0.0):
    """[(a, b)] song-duck windows in Short time (+shift: a hook preview in front)."""
    return [(a + shift, b + shift) + ((float(o["depth"]),) if "depth" in o else ()) for k, a, b, o in plan(spec, timeline, start) if k == "dip"]


def game_dips(spec, timeline, start):
    """[(a, b)] windows where the GAME audio ducks ('gamedip', like 'dip' for the song): the hit after it reads as a hit
    over a loud game sound (end_portal_job: the portal's hum ran through the dip before IT NEVER ENDS)."""
    return [(a, b) for k, a, b, _ in plan(spec, timeline, start) if k == "gamedip"]


def duck_filter(windows, depth=0.06):
    """An ffmpeg volume filter that ducks to `depth` inside each window (20 ms ramps). A window (a, b, d) ducks only
    to its own depth d (an sfx 'dip' with {depth}: a gentle dip that keeps the song under the hit, owner 2026-11-12
    on desire_town: "the music jumps too much"); where windows overlap the deepest wins."""
    if not windows:
        return ""
    ramp = lambda a, b: f"clip((t-{a - 0.02:.3f})/0.02,0,1)*clip(({b:.3f}-t)/0.02,0,1)"
    if all(len(w) == 2 for w in windows):
        terms = "+".join(ramp(a, b) for a, b in windows)
        return f",volume='1-{1 - depth:.3f}*min(1,{terms})':eval=frame"
    terms = [f"{1 - (w[2] if len(w) > 2 else depth):.3f}*{ramp(w[0], w[1])}" for w in windows]
    expr = terms[0]
    for t in terms[1:]:
        expr = f"max({expr},{t})"
    return f",volume='1-{expr}':eval=frame"


def build_track(spec, timeline, start, dur, out_wav, cards=None, counter=None):
    """Mix every sfx event into one stereo wav of `dur` seconds. Returns the path, or None."""
    events = [e for e in plan(spec, timeline, start, cards, counter) if e[0] not in ("dip", "gamedip")]
    if not events:
        return None
    n = int(math.ceil(dur * SR)) + SR
    mix = np.zeros((n, 2), np.float32)

    def put(x, t, gain):
        i = int(round(t * SR))
        a, b = max(0, i), min(n, i + len(x))
        if b > a:
            mix[a:b] += x[a - i:b - i] * gain
    for kind, t0, t1, opts in events:
        g = float(opts.get("gain", GAIN.get(kind, 0.7)))
        if kind == "riser":
            put(synth_riser(t1 - t0), t0, g)
        elif kind == "wind":
            put(synth_wind(t1 - t0 + 0.15), t0, g)
        elif kind == "air":
            put(synth_air(t1 - t0 + 0.4), t0, g)
        elif kind == "impact":
            put(synth_boom(1.1, 110, 40, 0.3), t0, g)
            put(library("hit"), t0, g * 0.7)
        elif kind == "heart":   # a heartbeat (lub-dub): two low thumps 0.22 s apart (the dilemma format's frozen beats)
            x = synth_boom(0.4, 75, 45, 0.12)
            put(x, t0, g)
            put(x * 0.7, t0 + 0.22, g)
        elif kind == "boom":
            put(synth_boom(2.2, 90, 30, 0.8), t0, g)
            put(library("hit"), t0, g * 0.6)
        elif kind == "whoosh":
            x = library("whoosh")
            env = np.abs(x).mean(1)
            peak = int(np.argmax(np.convolve(env, np.ones(960) / 960, "same")))
            put(x, t0 - peak / SR, g)
        elif kind == "scratch":
            put(synth_scratch(), t0 - 0.05, g)
        elif kind == "file":
            put(read_audio(HERE / opts["path"]), t0, g)
        elif kind in ("pop", "ding"):
            put(library(kind), t0, g)
        else:
            print(f"sfx: unknown kind {kind}")
    mix = mix[:int(math.ceil(dur * SR))]
    peak = np.abs(mix).max()
    if peak > 0.98:                                  # never clip: overlapping layers scale down together
        mix *= 0.98 / peak
    write_wav(out_wav, mix)
    print(f"sfx: {len(events)} sounds ({', '.join(sorted({e[0] for e in events}))})")
    return out_wav


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "demo":   # every synth sound in a row, 0.4 s apart
        parts = [synth_whoosh(), synth_riser(2.0), synth_boom(), synth_wind(2.0), synth_scratch(), synth_pop(), synth_boom(1.1, 110, 40, 0.3)]
        gap = np.zeros((int(0.4 * SR), 2), np.float32)
        write_wav(sys.argv[2], np.concatenate([p for x in parts for p in (x, gap)]))
        print("wrote", sys.argv[2])
    else:
        print(__doc__)
