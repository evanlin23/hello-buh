"""A sampler for VS Chamber Orchestra 2 Community Edition (CC0; work/samples/x/<Instrument>/, unpacked from
VSCO-2.1-XRNI-20170216.zip by scripts/get_samples.sh): real recorded strings, brass, organ, timpani, piano, bells.
Picks the sample by key and velocity from the instrument's Renoise map, repitches it, loops long notes with crossfades
and fades the release. Stereo float32 at SR (48 kHz).

    import sampler as S
    x = S.note('CelloEnsSusVib', 50, 4.0, vel=90)      # D3 for 4 s, loud
    x = S.chord('OrganLoud', [50, 53, 57], 3.0, vel=100)
"""
import pathlib
import subprocess
import xml.etree.ElementTree as ET

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent.parent
ROOT = HERE / "work" / "samples" / "x"
SR = 48000
_maps, _audio = {}, {}


def midi(name):
    """'D3' -> 50 (C4 = 60), 'Bb2' -> 46, 'F#4' -> 66."""
    n = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[name[0]]
    rest = name[1:]
    while rest and rest[0] in "#b":
        n += 1 if rest[0] == "#" else -1
        rest = rest[1:]
    return 12 * (int(rest) + 1) + n


def _map(inst):
    if inst not in _maps:
        root = ET.parse(ROOT / inst / "Instrument.xml").getroot()
        files = sorted((ROOT / inst / "SampleData").glob("Sample*"), key=lambda p: int(p.name[6:p.name.index(" ")] if " " in p.name else p.stem[6:]))
        rows = []
        for i, s in enumerate(root.findall(".//Samples/Sample")):
            m = s.find("Mapping")
            if i >= len(files) or m is None:
                continue
            rows.append(dict(file=files[i], base=int(m.findtext("BaseNote")), lo=int(m.findtext("NoteStart")), hi=int(m.findtext("NoteEnd")),
                             vlo=int(m.findtext("VelocityStart")), vhi=int(m.findtext("VelocityEnd")),
                             vol=float(s.findtext("Volume") or 1.0), tune=float(s.findtext("Transpose") or 0) + float(s.findtext("Finetune") or 0) / 128))
        _maps[inst] = rows
    return _maps[inst]


def _load(p):
    if p not in _audio:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
        _audio[p] = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    return _audio[p]


def _pick(inst, m, vel, rr=0):
    rows = _map(inst)
    cands = [r for r in rows if r["lo"] <= m <= r["hi"] and r["vlo"] <= vel <= r["vhi"]]
    if not cands:
        cands = [r for r in rows if r["lo"] <= m <= r["hi"]] or rows
        if not [r for r in cands if r["lo"] <= m <= r["hi"]]:
            cands = sorted(rows, key=lambda r: abs(r["base"] - m))[:1]
        cands = sorted(cands, key=lambda r: min(abs(vel - r["vlo"]), abs(vel - r["vhi"])))[:3]
    return cands[rr % len(cands)]


def note(inst, m, dur, vel=80, release=0.6, attack=0.0, rr=0):
    """One note: midi m (int or 'D3'), held dur s, then a release fade. Longer than the sample: crossfaded loops."""
    if isinstance(m, str):
        m = midi(m)
    r = _pick(inst, m, vel, rr)
    x = _load(r["file"])
    ratio = 2 ** ((m - r["base"] - r["tune"]) / 12)
    if abs(ratio - 1) > 1e-4:
        idx = np.arange(0, len(x) - 1, ratio)
        x = np.stack([np.interp(idx, np.arange(len(x)), x[:, c]) for c in (0, 1)], 1).astype(np.float32)
    n = int((dur + release) * SR)
    if len(x) < n:   # loop the sustained middle with a 0.25 s crossfade
        a, b = int(len(x) * 0.35), int(len(x) * 0.85)
        xf = int(0.25 * SR)
        out = x[:b].copy()
        while len(out) < n:
            seg = x[a:b]
            w = np.linspace(0, 1, xf)[:, None]
            out[-xf:] = out[-xf:] * (1 - w) + seg[:xf] * w
            out = np.concatenate([out, seg[xf:]])
        x = out
    x = x[:n].copy()
    t = np.arange(len(x)) / SR
    env = np.ones(len(x), np.float32)
    if attack > 0:
        env *= np.minimum(1, t / attack)
    i = int(dur * SR)
    if i < len(x):
        env[i:] *= np.exp(-(t[i:] - dur) / max(0.02, release / 4))
    # gain: the sample's own volume, a gentle velocity curve where one sample covers every velocity
    g = r["vol"] * (0.35 + 0.65 * (vel / 127) ** 1.4 if r["vlo"] == 0 and r["vhi"] >= 126 else 1.0)
    return (x * env[:, None] * g).astype(np.float32)


def chord(inst, ms, dur, vel=80, release=0.8, attack=0.0, spread=0.0):
    """Several notes together (spread: seconds between them, a strum)."""
    outs = [note(inst, m, dur - k * spread, vel, release, attack, rr=k) for k, m in enumerate(ms)]
    n = max(len(o) + int(k * spread * SR) for k, o in enumerate(outs))
    out = np.zeros((n, 2), np.float32)
    for k, o in enumerate(outs):
        i = int(k * spread * SR); out[i:i + len(o)] += o
    return out
