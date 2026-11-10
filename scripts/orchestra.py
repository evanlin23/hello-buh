"""A small synthesised orchestra for the AI-dilemma scores (scripts/ai_short.py): an ensemble of strings, a choir, a pipe
organ, timpani, taiko, brass hits and the game's own note-block harp. Everything is stereo float32 at SR, built from
numpy and the trailer kit (scripts/trailer.py: reverb, braam, note). Made, not licensed (docs/ai_dilemma.md).
"""
import numpy as np

import sfx
import trailer as T

SR = T.SR
RNG = np.random.default_rng(7)


def _saw(f, n, vib=0.003, rate=5.2, drift=0.0):
    """A naive saw at f with vibrato and a slow random drift (aliasing is filtered away downstream)."""
    t = np.arange(n) / SR
    ph0 = RNG.uniform(0, 1)
    fr = f * (1 + vib * np.sin(2 * np.pi * (rate + RNG.uniform(-0.6, 0.6)) * t + RNG.uniform(0, 6.28)) + drift * np.sin(2 * np.pi * 0.13 * t))
    ph = (ph0 + np.cumsum(fr) / SR) % 1.0
    return 2 * ph - 1


def strings(freqs, dur, level=0.2, attack=1.2, release=1.5, bright=0.5, voices=7):
    """A string section: each note as `voices` detuned saws, panned across the stereo field, through a low-pass that
    opens with `bright` (0..1) and a slow swell."""
    n = int((dur + release) * SR); t = np.arange(n) / SR
    env = np.minimum(1, t / attack) ** 1.5 * np.where(t < dur, 1.0, np.exp(-(t - dur) / (release / 3)))
    out = np.zeros((n, 2), np.float32)
    for f in freqs:
        for v in range(voices):
            det = (v - (voices - 1) / 2) * 0.07 / voices * 2
            y = _saw(f * 2 ** (det / 12), n, vib=0.0035, drift=0.002)
            pan = (v / max(1, voices - 1)) * 0.9 + 0.05
            out[:, 0] += y * (1 - pan); out[:, 1] += y * pan
    cut = 600 + 3800 * bright * np.minimum(1, t / max(0.5, attack * 1.5))
    for c in (0, 1):
        out[:, c] = sfx.onepole(sfx.onepole(out[:, c], cut), cut)
    return (out * env[:, None] * level / (len(freqs) * voices) * 6).astype(np.float32)


def choir(freqs, dur, level=0.15, attack=1.6, release=1.8, vowel="ah"):
    """Wordless voices: detuned saws through three vowel formants (ah: 750 / 1150 / 2600 Hz), a slow vibrato."""
    F = {"ah": (750, 1150, 2600), "oo": (320, 800, 2400), "mm": (280, 900, 2300)}[vowel]
    n = int((dur + release) * SR); t = np.arange(n) / SR
    env = np.minimum(1, t / attack) ** 2 * np.where(t < dur, 1.0, np.exp(-(t - dur) / (release / 3)))
    src = np.zeros((n, 2))
    for f in freqs:
        for v in range(5):
            y = _saw(f * 2 ** ((v - 2) * 0.05 / 12), n, vib=0.006, rate=4.6)
            src[:, v % 2] += y
    out = np.zeros((n, 2))
    for c in (0, 1):
        out[:, c] = sum(sfx.band(src[:, c], fo * 0.85, fo * 1.15) * g for fo, g in zip(F, (1.0, 0.6, 0.25)))
    return (out * env[:, None] * level / len(freqs) * 2.5).astype(np.float32)


def organ(f, dur, level=0.2, attack=0.06, release=0.9, bright=1.0):
    """A pipe organ note: additive ranks (16' 8' 4' 2 2/3' 2' 1 3/5' 1'), a tremulant, wind noise in the attack."""
    n = int((dur + release) * SR); t = np.arange(n) / SR
    ranks = ((0.5, 0.55), (1, 1.0), (2, 0.6 * bright), (3, 0.28 * bright), (4, 0.32 * bright), (5, 0.12 * bright), (8, 0.14 * bright))
    y = sum(w * np.sin(2 * np.pi * f * r * t * (1 + 0.0009 * np.sin(2 * np.pi * 5.6 * t))) for r, w in ranks if f * r < 9000)
    env = np.minimum(1, t / attack) * np.where(t < dur, 1.0, np.exp(-(t - dur) / (release / 3)))
    y = y * env * (1 + 0.05 * np.sin(2 * np.pi * 5.6 * t))
    y += sfx.onepole(RNG.standard_normal(n), 2500) * np.exp(-t / 0.05) * 0.04
    return T.st(y / 3.0 * level)


def timpani(f=55.0, level=0.8, dur=2.4):
    """A struck kettle: a pitched membrane (fundamental + inharmonic partials, a small pitch drop) and a felt thud."""
    n = int(dur * SR); t = np.arange(n) / SR
    fr = f * (1 + 0.08 * np.exp(-t / 0.05))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    y = np.sin(ph) * np.exp(-t / 0.9) + 0.5 * np.sin(1.5 * ph) * np.exp(-t / 0.5) + 0.3 * np.sin(1.98 * ph) * np.exp(-t / 0.35)
    y += sfx.onepole(RNG.standard_normal(n), 700) * np.exp(-t / 0.03) * 1.2
    return T.st(np.tanh(y * 1.2) * level)


def roll(f, dur, level=0.6):
    """A timpani roll swelling over dur (strokes every 55 ms, louder toward the end)."""
    out = np.zeros((int((dur + 2.5) * SR), 2), np.float32)
    k, t = 0, 0.0
    while t < dur:
        g = 0.15 + 0.85 * (t / dur) ** 2
        x = timpani(f, level * g * RNG.uniform(0.8, 1.0), 1.6)
        i = int(t * SR); out[i:i + len(x)] += x[: len(out) - i]
        t += 0.055; k += 1
    return out


def taiko(level=0.9):
    """A big drum: a deep sweep, skin noise, a long room."""
    n = int(1.4 * SR); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * 62 * t * (1 + 0.9 * np.exp(-t / 0.02))) * np.exp(-t / 0.28)
    y += sfx.band(RNG.standard_normal(n), 120, 2200) * np.exp(-t / 0.05) * 0.9
    return T.st(np.tanh(y * 1.6) * level)


def harp(pitch, level=0.5):
    """The game's note-block harp (block.note_block.harp), pitched like a note block (0.5..2.0)."""
    return T.st(T.note("block.note_block.harp", pitch, level))


def place(mix, x, at, gain=1.0):
    i = int(at * SR)
    if i < 0:
        x, i = x[-i:], 0
    n = min(len(x), len(mix) - i)
    if n > 0:
        mix[i:i + n] += x[:n] * gain


# D minor note frequencies used by the scores
NOTE = {"D2": 73.42, "F2": 87.31, "A2": 110.0, "Bb1": 58.27, "C2": 65.41, "G2": 98.0,
        "D3": 146.83, "E3": 164.81, "F3": 174.61, "G3": 196.0, "A3": 220.0, "Bb2": 116.54, "C3": 130.81,
        "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.0, "A4": 440.0, "Bb3": 233.08, "C4": 261.63,
        "D5": 587.33, "E5": 659.26, "F5": 698.46, "A5": 880.0}
HARP = lambda name: NOTE[name] / 369.99   # note-block pitch for a frequency (pitch 1.0 = F#4)


def epic(total, hero_at, quiet=None):
    """The thin_ice score. Before the turn: the clock (harp A/E ostinato), a low string pad and a hum of choir growing.
    The silence. Then the turn: brass, a timpani hit, strings and choir and organ in Dm - Bb - F - C, the ostinato on
    organ, taiko on every bar, a roll into the last chord, which rings out over the end."""
    mix = np.zeros((int((total + 8) * SR), 2), np.float32)
    q0, q1 = quiet or (hero_at - 0.01, hero_at)
    beat = 60 / 66 / 2   # eighths at 66 bpm
    # --- the cold: the clock, the pad, the hum
    t, k = 0.3, 0
    tops = ["E5", "E5", "F5", "E5", "D5", "E5", "F5", "C4"]
    while t < q0 - 0.15:
        n = "A4" if k % 2 == 0 else tops[(k // 8) % len(tops)]
        place(mix, harp(min(2.0, max(0.5, HARP(n))), 0.16 + 0.08 * (t / max(1, q0))), t)
        k += 1; t += beat
    place(mix, strings([NOTE["D3"], NOTE["A3"]], q0 - 0.6, 0.12, 3.0, 0.4, 0.25), 0.0)
    place(mix, strings([NOTE["D2"]], q0 - 0.6, 0.12, 4.0, 0.4, 0.2, 5), 0.0)
    if q0 > 14:
        place(mix, choir([NOTE["D4"], NOTE["F4"], NOTE["A4"]], q0 - 12.5, 0.07, 4.0, 0.4, "mm"), 12.0)
    for tt in np.arange(max(0, q0 - 8), q0 - 0.4, 0.92):   # a heartbeat under the last answers
        place(mix, T.heartbeat(0.35), tt)
    # --- the silence: a reversed swell into the turn
    place(mix, T.reverse_swell(1.2, 0.5), hero_at - 1.2)
    # --- the turn
    place(mix, T.braam(3.6, 36.71), hero_at, 0.6)
    place(mix, timpani(NOTE["D2"] / 1.0 * 0.75, 1.0), hero_at)
    place(mix, taiko(1.0), hero_at)
    prog = [("D3", "F3", "A3", "D4"), ("Bb2", "D3", "F3", "Bb3"), ("F2", "C3", "F3", "A3"), ("C3", "E3", "G3", "C4")]
    bass = ["D2", "Bb1", "F2", "C2"]
    rest = total - hero_at
    bar = rest / (len(prog) + 0.6)
    for i, ch in enumerate(prog):
        st = hero_at + 0.1 + i * bar
        last = i == len(prog) - 1
        L = bar + (4.0 if last else 0.25)
        fr = [NOTE[n] for n in ch]
        place(mix, strings(fr, L, 0.16 + 0.05 * i, 0.5 if i else 0.25, 3.0 if last else 0.6, 0.5 + 0.15 * i), st)
        place(mix, strings([f * 2 for f in fr[1:]], L, 0.06 + 0.04 * i, 0.8, 3.0 if last else 0.6, 0.6 + 0.12 * i, 5), st)
        place(mix, choir([f * 2 for f in fr[:3]], L, 0.07 + 0.035 * i, 0.8, 3.0 if last else 0.8, "ah"), st)
        place(mix, strings([NOTE[bass[i]], NOTE[bass[i]] / 2], L, 0.14, 0.3, 3.0 if last else 0.5, 0.3, 5), st)
        for f in fr:
            place(mix, organ(f, L, 0.035 + 0.015 * i, 0.2, 3.5 if last else 0.4, 0.5 + 0.15 * i), st)
        place(mix, taiko(0.55 + 0.12 * i), st)
        place(mix, timpani(NOTE[bass[i]] * (1 if NOTE[bass[i]] > 60 else 2) * 0.75, 0.5 + 0.1 * i), st)
        tt = st
        while tt < st + bar - 0.05:   # the ostinato, now on the organ, an octave up in the last two bars
            o = 2 if i >= 2 else 1
            place(mix, organ(NOTE["A4"] * o, beat * 0.85, 0.045 + 0.02 * i, 0.015, 0.3, 0.8), tt)
            place(mix, organ(NOTE["E5"] * o / 2 * 2, beat * 0.85, 0.04 + 0.02 * i, 0.015, 0.3, 0.8), tt + beat)
            tt += 2 * beat
        if last:
            place(mix, roll(NOTE["D2"] * 0.75, bar * 0.9, 0.35), st)
    # the last chord: D major (the Picardy third: he held on), everything, ringing out
    end_at = hero_at + 0.1 + len(prog) * bar
    fin = [NOTE["D3"], 185.0, NOTE["A3"], NOTE["D4"]]
    place(mix, strings(fin, 3.0, 0.3, 0.3, 4.5, 0.85), end_at)
    place(mix, choir([f * 2 for f in fin[:3]], 3.0, 0.14, 0.4, 4.5, "ah"), end_at)
    for f in fin:
        place(mix, organ(f, 3.0, 0.07, 0.1, 4.5, 1.0), end_at)
    place(mix, timpani(NOTE["D2"] * 0.75, 1.0), end_at)
    place(mix, T.braam(4.5, 36.71), end_at, 0.4)
    mix = T.reverb(mix, 3.8, 0.4)[: len(mix)]
    # total silence before the turn
    i0, i1 = int(q0 * SR), int((hero_at - 1.2) * SR)
    if i1 > i0:
        fade = np.linspace(1, 0, min(int(0.3 * SR), i1 - i0))
        mix[i0:i0 + len(fade)] *= fade[:, None]; mix[i0 + len(fade):i1] = 0
    return mix


# ---------------------------------------------------------------- real instruments (scripts/sampler.py, VSCO-2 CE, CC0)
def _fit(inst, m):
    """Octave-shift a note into an instrument's mapped range."""
    import sampler as S
    rows = S._map(inst); lo, hi = min(r["lo"] for r in rows), max(r["hi"] for r in rows)
    while m < lo: m += 12
    while m > hi: m -= 12
    return m


def epic_real(total, hero_at, quiet=None):
    """thin_ice's score on recorded instruments (same plan as epic(): the clock, the silence, the turn, D major)."""
    import sampler as S
    M = S.midi
    N = int((total + 9) * SR)
    buses = {}
    last = ["fx"]
    hum = np.random.default_rng(11)
    def bus_of(inst):
        for key, b in (("Violin", "hi"), ("Viola", "hi"), ("Cello", "lo"), ("Contrabass", "lo"), ("Horn", "brass"), ("Trombone", "brass"),
                       ("Tuba", "brass"), ("Organ", "organ"), ("Timpani", "perc"), ("Piano", "keys"), ("Bells", "keys")):
            if key in inst:
                return b
        return "fx"
    def put(x, at, g=1.0, bus=None):
        b = bus or last[0]
        if b in ("hi", "lo"):   # strings swell through every note, and long notes breathe (an expression ride)
            tt = np.arange(len(x)) / SR
            x = x * (np.linspace(0.82, 1.08, len(x)) * (1 + 0.16 * np.sin(2 * np.pi * tt / 5.5 + hum.uniform(0, 6.28))))[:, None]
        buf = buses.setdefault(b, np.zeros((N, 2), np.float32))
        place(buf, x, at + hum.uniform(-0.012, 0.012), g)
    def nt(inst, m, dur, vel, rel=0.8, att=0.0, rr=0):
        last[0] = bus_of(inst)
        v = int(np.clip(vel + hum.integers(-7, 8), 1, 127))
        return S.note(inst, _fit(inst, M(m) if isinstance(m, str) else m), dur, v, rel, att, rr)
    def chd(inst, ms, dur, vel, rel=0.8, att=0.0):
        last[0] = bus_of(inst)
        return S.chord(inst, ms, dur, int(np.clip(vel + hum.integers(-5, 6), 1, 127)), rel, att)
    q0, q1 = quiet or (hero_at - 0.01, hero_at)
    beat = 60 / 66 / 2
    # --- the cold
    t, k = 0.3, 0
    tops = ["E5", "E5", "F5", "E5", "D5", "E5", "F5", "C5"]
    while t < q0 - 0.2:
        n = "A4" if k % 2 == 0 else tops[(k // 8) % len(tops)]
        g = 0.5 + 0.5 * min(1, t / max(1, q0))
        put(nt("OrganQuiet", n, beat * 0.9, 60, 0.35, rr=k), t, 0.55 * g)
        if k % 4 == 0:
            put(nt("UprightPiano", n, 1.2, 38, 1.0, rr=k), t, 0.5 * g)
        k += 1; t += beat
    put(nt("ContrabassSusVB-Quiet", "D2", q0 - 0.5, 55, 0.4, 3.0), 0.0, 0.9)
    put(chd("CelloEnsSusVib-Quiet", [_fit("CelloEnsSusVib-Quiet", M("D3")), _fit("CelloEnsSusVib-Quiet", M("A3"))], q0 - 0.5, 55, 0.4, 4.0), 0.0, 0.7)
    if q0 > 12:
        put(nt("ViolinEnsSusVib-Quiet", "D5", q0 - 10.5, 50, 0.4, 5.0), 10.0, 0.55)
        put(nt("ViolinEnsSusVib-Quiet", "A4", q0 - 16.0, 45, 0.4, 5.0), 15.5, 0.45)
    tr0 = max(0, q0 - 7.0)
    put(nt("ViolinEnsTrem", "A5", q0 - tr0, 70, 0.25, q0 - tr0), tr0, 0.5)    # tremolo swelling into the silence
    put(nt("CelloEnsTrem", "D3", q0 - tr0, 70, 0.25, q0 - tr0), tr0, 0.45)
    for i, tt in enumerate(np.arange(max(0, q0 - 9), q0 - 0.4, 0.92)):   # the heartbeat: soft low timpani
        put(nt("Timpani", "D2", 0.6, 35 + 2 * i, 0.8, rr=i), tt, 0.8)
    # --- the silence: a timpani roll, reversed, pulling into the hit
    rollx = nt("TimpaniRolls", "D2", 1.4, 100, 0.2)
    rev = rollx[::-1].copy(); rev *= np.linspace(0, 1, len(rev))[:, None] ** 2
    put(rev, hero_at - len(rev) / SR, 0.7)
    # --- the turn: the hit
    put(nt("Timpani", "D2", 2.5, 127, 2.0), hero_at, 1.3)
    for inst, notes, g in (("TubaSus", ["D2"], 0.8), ("TromboneSus", ["D3", "A3"], 0.7), ("FHornSus", ["D4", "A4", "D5"], 0.7)):
        for j, n in enumerate(notes):
            put(nt(inst, n, 1.6, 120, 1.2, rr=j), hero_at, g)
    put(nt("OrganLoudPedal", "D2", 2.0, 110, 1.5), hero_at, 0.6)
    put(T.braam(3.0, 36.71), hero_at, 0.25, 'fx')   # (a little synth sub under the real hit, for weight)
    # --- the climb
    prog = [("D3", "F3", "A3", "D4"), ("Bb2", "D3", "F3", "Bb3"), ("F2", "C3", "F3", "A3"), ("C3", "E3", "G3", "C4")]
    bass = ["D2", "Bb1", "F2", "C2"]
    horn = [("A3", "D4"), ("Bb3", "F4"), ("C4", "A4"), ("C4", "G4")]
    rest = total - hero_at
    bar = rest / (len(prog) + 1.3)   # (the last chord lands with ~3 s to ring inside the video)
    for i, ch in enumerate(prog):
        st = hero_at + 0.25 + i * bar
        L = bar + 0.3
        v = 85 + 12 * i
        ms = [M(n) for n in ch]
        put(chd("ViolinEnsSusVib", [_fit("ViolinEnsSusVib", m + 24) for m in ms[1:]], L, v, 0.7, 0.35), st, 0.55)
        put(chd("ViolaEnsSusVib", [_fit("ViolaEnsSusVib", m + 12) for m in ms[:3]], L, v, 0.7, 0.35), st, 0.5)
        put(chd("CelloEnsSusVib", [_fit("CelloEnsSusVib", m) for m in ms[:2]], L, v, 0.7, 0.3), st, 0.6)
        put(nt("ContrabassSusVB", bass[i], L, v, 0.7, 0.2), st, 0.8)
        put(chd("OrganLoud", [_fit("OrganLoud", m + 12) for m in ms], L, 100, 0.6, 0.15), st, 0.28 + 0.06 * i)
        put(nt("OrganLoudPedal", bass[i], L, 100, 0.6, 0.1), st, 0.45)
        for j, n in enumerate(horn[i]):
            put(nt("FHornSus", n, L, 70 + 15 * i, 0.8, 0.4, rr=j), st, 0.55)
        if i >= 1:
            put(nt("TromboneSus", ch[0], L, 70 + 15 * i, 0.8, 0.5), st, 0.45)
        tmp = {"D2": "D2", "Bb1": "Bb2", "F2": "F2", "C2": "C3"}[bass[i]]
        put(nt("Timpani", tmp, 1.5, 100 + 8 * i, 1.6, rr=i), st, 1.0)
        tt, kk = st, 0
        while tt < st + bar - 0.05:   # the ostinato on the loud organ, an octave up in the last two bars
            o = 12 if i >= 2 else 0
            put(nt("OrganLoud", M("A4") + o, beat * 0.85, 100, 0.25, rr=kk), tt, 0.22 + 0.05 * i)
            put(nt("OrganLoud", M("E5") + o, beat * 0.85, 100, 0.25, rr=kk + 1), tt + beat, 0.2 + 0.05 * i)
            tt += 2 * beat; kk += 2
        if i == len(prog) - 1:
            put(nt("TimpaniRolls", "D2", bar * 0.95, 90, 0.3, bar * 0.8), st, 0.7)
    # --- the last chord: D major, everything, the bell
    end_at = hero_at + 0.25 + len(prog) * bar
    fin = [M("D3"), M("F#3"), M("A3"), M("D4")]
    ring = 5.5
    put(chd("ViolinEnsSusVib", [_fit("ViolinEnsSusVib", m + 24) for m in fin[1:]], 2.5, 120, ring, 0.2), end_at, 0.6)
    put(chd("ViolaEnsSusVib", [_fit("ViolaEnsSusVib", m + 12) for m in fin[:3]], 2.5, 120, ring, 0.2), end_at, 0.5)
    put(chd("CelloEnsSusVib", [_fit("CelloEnsSusVib", m) for m in fin[:2]], 2.5, 120, ring, 0.2), end_at, 0.6)
    put(nt("ContrabassSusVB", "D2", 2.5, 120, ring), end_at, 0.8)
    put(chd("OrganLoud", [_fit("OrganLoud", m + 12) for m in fin], 2.8, 110, ring), end_at, 0.45)
    put(nt("OrganLoudPedal", "D2", 2.8, 110, ring), end_at, 0.55)
    for j, n in enumerate(("D4", "F#4", "A4")):
        put(nt("FHornSus", n, 2.5, 120, ring * 0.7, rr=j), end_at, 0.55)
    put(nt("TubaSus", "D2", 2.5, 120, ring * 0.6), end_at, 0.6)
    put(nt("Timpani", "D2", 2.0, 127, 2.5), end_at, 1.2)
    put(nt("TubularBells", "D5", 0.5, 110, ring), end_at, 0.6)
    # the silence is cut in the dry buses, so the hall's tail dies into it naturally
    i0, i1 = int((q0 - 0.3) * SR), int((hero_at - len(rev) / SR) * SR)
    for b, buf in buses.items():
        if b != "perc" and i1 > i0:
            fade = np.linspace(1, 0, min(int(0.7 * SR), i1 - i0)) ** 1.5
            buf[i0:i0 + len(fade)] *= fade[:, None]; buf[i0 + len(fade):i1] = 0
    # seating and bus EQ: violins and violas left, cellos and basses right, brass right of centre (rolled off above
    # ~3.5 kHz: the review heard "ice-pick" horns), the timpani with a sub under them, the organ wide
    def pan(x, p):
        a = (p + 1) * np.pi / 4
        return np.stack([x[:, 0] * np.cos(a) * 1.41, x[:, 1] * np.sin(a) * 1.41], 1)
    out = np.zeros((N, 2), np.float32)
    for b, buf in buses.items():
        y = buf
        if b == "hi": y = pan(y, -0.45)
        elif b == "lo": y = pan(y, 0.4)
        elif b == "brass":
            y = np.stack([sfx.onepole(sfx.onepole(y[:, c], 3600), 5000) for c in (0, 1)], 1)
            y = y - 0.35 * np.stack([sfx.band(y[:, c], 250, 500) for c in (0, 1)], 1)   # (the climax's low-mid mud)
            y = pan(y, 0.3)
        elif b == "organ":
            y = y - 0.4 * np.stack([sfx.band(y[:, c], 220, 520) for c in (0, 1)], 1)
        elif b == "perc":
            sub = np.stack([sfx.onepole(sfx.onepole(y[:, c], 110), 110) for c in (0, 1)], 1)
            y = y + sub * 1.6
        elif b == "keys": y = pan(y, -0.15)
        out += y.astype(np.float32)
    out = T.reverb(out, 3.2, 0.24)[:N]
    return out
