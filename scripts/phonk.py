"""Synthesized phonk, fully ours (no samples, no licences): cowbell lead, distorted 808 bass, kick,
clap, trap hi-hats and a riser into the drop. Deterministic per seed, so every Short can get its
own track, and the drop lands where we want it.

  python3 scripts/phonk.py out.wav [--seed 3] [--style montagem|drift|slowed|funk] [--drop 4.0] [--length 20]

Sound design, briefly (all numpy):
- cowbell: two detuned square-ish partials (~1.48 ratio, like the 808 cowbell), band-passed, fast decay
- 808: sine with a pitch drop at the attack, then tanh distortion (the phonk "growl"), long decay
- kick: 50->150 Hz sweep + click; clap: filtered noise bursts; hats: high-passed noise, 1/16 with rolls
- the drop: everything filtered/sparse before it, a noise riser, a tiny silence, then full mix
"""
import argparse
import subprocess

import numpy as np

SR = 44100


def env_exp(n, decay):
    return np.exp(-np.arange(n) / (decay * SR))


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def cowbell(freq, dur=0.22):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sign(np.sin(2 * np.pi * freq * t)) * 0.6 + np.sign(np.sin(2 * np.pi * freq * 1.48 * t)) * 0.4
    s = highpass(lowpass(s, 4200), 500)
    return s * env_exp(n, 0.07) * 0.5


def bass808(freq, dur, drive=4.0):
    n = int(dur * SR); t = np.arange(n) / SR
    f = freq * (1 + 1.2 * np.exp(-t / 0.02))                     # pitch drop at the attack
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * env_exp(n, dur * 0.6)
    return np.tanh(s * drive) / np.tanh(drive) * 0.75


def kick():
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 50 + 120 * np.exp(-t / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.12)
    s[:200] += np.random.RandomState(1).uniform(-1, 1, 200) * np.linspace(1, 0, 200) * 0.5
    return np.tanh(s * 2.5) * 0.9


def clap(rng):
    n = int(0.25 * SR); s = np.zeros(n)
    for k in range(3):                                           # the three quick bursts of a clap
        o = int(k * 0.011 * SR); m = n - o
        s[o:] += rng.uniform(-1, 1, m) * env_exp(m, 0.05 if k == 2 else 0.008)
    return highpass(lowpass(s, 6000), 900) * 0.6


def hat(rng, open_=False):
    n = int((0.12 if open_ else 0.04) * SR)
    return highpass(rng.uniform(-1, 1, n), 7000) * env_exp(n, 0.04 if open_ else 0.012) * 0.28


STYLES = {   # bpm, root (Hz), scale degrees for the cowbell riff, 808 drive, swing
    'montagem': (130, 55.0, [0, 3, 5, 7, 10, 12], 4.5, 0.0),
    'drift':    (140, 49.0, [0, 1, 5, 7, 8, 12], 6.0, 0.0),
    'slowed':   (92, 46.25, [0, 3, 7, 10, 12, 15], 3.0, 0.0),
    'funk':     (128, 58.27, [0, 2, 4, 7, 9, 12], 2.5, 0.12),
}


def make(seed, style, drop, length):
    rng = np.random.RandomState(seed)
    bpm, root, scale, drive, swing = STYLES[style]
    beat = 60 / bpm; step = beat / 4
    n = int((length + 1) * SR)
    mix = np.zeros(n)

    def put(sig, t, gain=1.0):
        i = int(t * SR)
        if 0 <= i < n:
            m = min(len(sig), n - i); mix[i:i + m] += sig[:m] * gain

    # the riff: a 2-bar cowbell pattern on 1/16 steps, generated from the seed
    steps = 32
    pat = [(k, scale[rng.randint(len(scale))]) for k in range(steps) if rng.rand() < (0.55 if k % 2 == 0 else 0.3)]
    bass_pat = [(k, scale[rng.randint(3)]) for k in (0, 6, 10, 16, 22, 26) if rng.rand() < 0.9]
    bar2 = steps * step
    # align: the drop falls on a bar line at `drop` seconds
    t0 = drop - np.ceil(drop / bar2) * bar2
    cb_lead = 4 * root * 2                                        # cowbell register (~440 Hz)
    t = t0
    while t < length:
        dropped = t >= drop - 1e-6
        for k, deg in pat:
            st = t + k * step + (swing * step if k % 2 else 0)
            f = cb_lead * 2 ** (deg / 12)
            put(cowbell(f), st, 1.0 if dropped else 0.55)
        if dropped:
            for k, deg in bass_pat:
                put(bass808(root * 2 ** (deg / 12), step * 5, drive), t + k * step)
            for k in range(steps):
                st = t + k * step + (swing * step if k % 2 else 0)
                if k % 8 == 0 or (k % 16 == 11 and rng.rand() < 0.7): put(kick(), st)
                if k % 8 == 4: put(clap(rng), st)
                if style != 'slowed' or k % 2 == 0:
                    put(hat(rng, open_=(k % 8 == 6)), st, 0.9 if k % 4 == 0 else 0.6)
                if k in (28, 29, 30, 31) and rng.rand() < 0.5:   # hat roll into the next bar
                    for r in range(3): put(hat(rng), st + r * step / 3, 0.5)
        t += bar2
    # riser into the drop + a beat of near-silence (the "pause before the drop")
    rl = min(2.0, max(0.5, drop - 0.3))
    rn = int(rl * SR); noise = highpass(rng.uniform(-1, 1, rn), 2000) * np.linspace(0, 0.35, rn) ** 2
    put(noise, drop - rl - 0.12)
    gap = slice(int((drop - 0.12) * SR), int(drop * SR)); mix[gap] *= 0.15
    # filtered intro (before the drop everything is muffled)
    pre = int(drop * SR)
    if pre > 0:
        mix[:pre] = lowpass(mix[:pre], 1400) * 1.4
    mix = mix[: int(length * SR)]
    mix = np.tanh(mix * 1.6) * 0.9                                # glue / loudness
    if style == 'slowed':                                         # cheap reverb tail
        for d, g in ((0.11, 0.35), (0.23, 0.22), (0.37, 0.14)):
            k = int(d * SR); mix[k:] += mix[:-k] * g
        mix *= 0.8
    return mix.astype(np.float32)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('--seed', type=int, default=1)
    ap.add_argument('--style', default='montagem', choices=list(STYLES))
    ap.add_argument('--drop', type=float, default=4.0)
    ap.add_argument('--length', type=float, default=20.0)
    a = ap.parse_args()
    x = make(a.seed, a.style, a.drop, a.length)
    st = np.repeat(x[:, None], 2, axis=1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'loudnorm=I=-12:TP=-1', a.out],
                   input=st.tobytes(), check=True)
    print('wrote', a.out)
