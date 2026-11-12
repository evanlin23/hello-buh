"""Key sounds over the music: a sound the Short's game hinges on (guess the mob: the mob's call) must be heard.

Owner, 2026-11-11, on guess_sound (59 % stayed, 17 % at the end, the channel's weakest): "had super loud music".
The stunt bed (scripts/add_song.py: NCS at -13 LUFS over the game at -15, static) sat level with the calls: measured
per call (below), guess_sound -1.8 dB median (worst -10.7, best +4.8), guess_sound_2 -5.4 (the allay -12.3),
guess_sound_3 -1.6. A guessing game you can't hear is broken.

A stunt names its key sounds by mark: edit `keySounds: ['hear']` (each occurrence of each mark is one clip).
- the mix (add_song.py, at publish): the song ducks to -24 dB (DUCK) from 0.05 s before each clip to 0.15 s after
  its audible end (the no-song stem's 50 ms level above the clip's peak - 20 dB, up to its first 0.3 s of quiet, at
  most CLIP_MAX s), never past the song's drop (it lands on its event un-ducked)
- the gate (BLOCK, KEY_MIN_DB = 8): over each clip's audible part, the clip must be >= 8 dB louder (RMS) than the
  music. The music is the mix minus the no-song stem (cross-correlated lag, a short least-squares FIR per 25 ms: the
  master's limiter rides on the music), so it runs on any package with a short_nosong.mp4. add_song.py exits 1 on a
  blocker (publish stops); pace.py BLOCKs on a package's short.mp4. After the duck the three guess_sound mixes measure
  +11.6 dB at worst (median +16 to +20), the rebuilt stems agree within ~1 dB; before, no call was over +4.8 dB.
  8 dB sits between the two.

  python3 scripts/key_sounds.py <name> [--video short.mp4 --nosong short_nosong.mp4] [--hits] [--json]   # exit 1 on a BLOCK
  (--hits: a stunt with no keySounds: measure its loudest game hits instead; a report, never a BLOCK)
"""
import gzip
import json
import os
import pathlib
import subprocess
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
VIDEOS = pathlib.Path(os.environ.get("HB_VIDEOS", ROOT.parent / "hb-videos"))
SR = 48000
BLOCK_S = 0.05
KEY_MIN_DB = 8.0      # the key sound over the music, RMS over its audible part
DUCK = 0.06           # the song's level under a key sound (-24 dB): sfx.duck_filter's depth
CLIP_MAX = 2.5        # s: a clip's audible end is looked for this far after its mark
LEAD, TAIL = 0.05, 0.15
GAP_S = 0.3           # s of quiet that ends a clip


def pcm(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def key_times(edit, timeline, start, shift=0.0):
    """Short-time starts of the key sounds: every occurrence of each edit.keySounds mark (timeline already warped)."""
    names = set(edit.get("keySounds") or [])
    return sorted(e["t"] / 1000 - start + shift for e in timeline if e["event"] in names and e["t"] / 1000 - start + shift >= -LEAD)


def _blocks_db(x):
    n = len(x) // int(BLOCK_S * SR) * int(BLOCK_S * SR)
    if n == 0:
        return np.array([-120.0])
    b = x[:n].reshape(-1, int(BLOCK_S * SR))
    return 10 * np.log10(np.mean(b ** 2, axis=1) + 1e-12)


def clips(game, times, stop=None):
    """[(t, a, b, mask)] per key mark: a..b the duck window (s), mask the clip's audible 50 ms blocks from a. Nothing
    past `stop` (the song's drop: it lands on its event, un-ducked)."""
    out = []
    for t in times:
        a = max(0.0, t - LEAD)
        if stop is not None and a >= stop - LEAD:
            continue
        end = t + CLIP_MAX if stop is None else min(t + CLIP_MAX, stop - LEAD)
        seg = game[int(a * SR):int(end * SR)]
        lv = _blocks_db(seg)
        mask = lv > max(lv.max() - 20, -70)
        if not mask.any():
            continue
        on = np.nonzero(mask)[0]   # the clip ends at its first GAP_S of quiet (the torch, the next sound: not the clip)
        cut = np.nonzero(np.diff(on) > GAP_S / BLOCK_S)[0]
        if len(cut):
            mask[on[cut[0]] + 1:] = False
        b = a + (np.nonzero(mask)[0].max() + 1) * BLOCK_S + TAIL
        out.append((t, a, b if stop is None else min(b, stop), mask))
    return out


def windows(game, times, stop=None):
    """Merged duck windows [(a, b)] in Short time."""
    w = []
    for _, a, b, _ in clips(game, times, stop):
        if w and a <= w[-1][1]:
            w[-1] = (w[-1][0], max(w[-1][1], b))
        else:
            w.append((a, b))
    return w


def align(mix, nosong, max_lag=4800):
    """(mix, the no-song stem moved onto the mix's clock): the lag (AAC priming, edit offsets) by cross-correlation."""
    n = min(len(mix), len(nosong))
    a, b = mix[:n].astype(np.float64), nosong[:n].astype(np.float64)
    N = 1 << int(np.ceil(np.log2(2 * n)))
    xc = np.fft.irfft(np.fft.rfft(a, N) * np.conj(np.fft.rfft(b, N)), N)
    lags = np.r_[np.arange(0, max_lag + 1), np.arange(-max_lag, 0)]
    lag = int(lags[np.argmax(np.abs(xc[lags]))])
    y = np.zeros(n)
    if lag >= 0:
        y[lag:] = b[:n - lag]
    else:
        y[:n + lag] = b[-lag:]
    return a, y


def _fit(a, b, taps=4):
    """The game's part of a mix segment: a least-squares FIR of the stem (the master's gain, a fractional-sample delay,
    the codec). Fitted per clip, since the master's limiter rides on the music and changes the game's gain over time."""
    X = np.stack([np.roll(b, j) for j in range(-taps, taps + 1)], 1)
    w = np.linalg.lstsq(X, a, rcond=None)[0]
    return X @ w


def margins(game, music, times, mix=None, stop=None):
    """Per key clip: its RMS over the audible blocks vs the music's over the same blocks. With mix: `game` is the
    aligned no-song stem and the clip's game/music split is fitted from the mix (music = None)."""
    rows = []
    for t, a, b, mask in clips(game, times, stop):
        i0, m = int(a * SR), np.repeat(mask, int(BLOCK_S * SR))
        g = game[i0:i0 + len(m)]
        m = m[:len(g)]
        if mix is not None:   # fitted per 25 ms (the limiter's gain moves within a clip; 100 ms left a ~10 dB floor)
            seg, st = mix[i0:i0 + len(g)], g
            k = int(0.025 * SR)
            g = np.concatenate([_fit(seg[j:j + k], st[j:j + k]) for j in range(0, len(st), k)])
            mu = seg - g
        else:
            mu = music[i0:i0 + len(g)]
        kd = 10 * np.log10(np.mean(g[m] ** 2) + 1e-12)
        md = 10 * np.log10(np.mean(mu[m] ** 2) + 1e-12)
        rows.append({"t": round(t, 2), "audible_s": round(float(mask.sum() * BLOCK_S), 2), "key_db": round(float(kd), 1), "music_db": round(float(md), 1), "margin_db": round(float(kd - md), 1)})
    return rows


def measure(video, nosong, times, stop=None):
    """Per key clip margins measured on a finished mix and its no-song version."""
    mix, stem = align(pcm(video), pcm(nosong))
    return margins(stem, None, times, mix=mix, stop=stop)


def check(video, nosong, times, stop=None):
    """(rows, blockers): a blocker per key clip less than KEY_MIN_DB over the music."""
    rows = measure(video, nosong, times, stop)
    return rows, [r for r in rows if r["margin_db"] < KEY_MIN_DB]


def stunt_edit(name):
    r = subprocess.run(["node", "-e", f"console.log(JSON.stringify(require('./stunts/{name}').edit||{{}}))"], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def package_clock(name, edit):
    """(warped timeline, start, hook length) of a published package, the way add_song.py lines the song up."""
    sys.path.insert(0, str(ROOT / "scripts"))
    from timewarp import edit_timeline
    from retention import hook_len
    rec = json.loads(gzip.decompress((VIDEOS / "shorts" / name / "recording.json.gz").read_bytes()))
    tl = edit_timeline(edit, rec["timeline"])
    ev = {}
    for e in tl:
        ev.setdefault(e["event"], e["t"] / 1000)
    start = float(edit.get("start", 0))
    if edit.get("startAt"):
        k, off = edit["startAt"].rsplit(":", 1)
        if k in ev:
            start = max(0.0, ev[k] + float(off))
    da, doff = edit.get("dropAt"), 0.0
    if da and da not in ev and ":" in str(da):   # 'EVENT:OFFSET_S' (as add_song)
        k_, _, o_ = str(da).rpartition(":")
        try:
            da, doff = k_, float(o_)
        except ValueError:
            pass
    drop = ev[da] + doff - start + hook_len(edit) if da in ev else None
    return tl, start, hook_len(edit), drop


def hit_times(game, n=6, gap=1.0):
    """The loudest game onsets (for a stunt with no keySounds): up to n, at least gap s apart."""
    lv = _blocks_db(game)
    on = np.r_[0, np.diff(lv)]
    order = np.argsort(-(lv + 0.5 * on))
    out = []
    for i in order:
        t = i * BLOCK_S
        if lv[i] > lv.max() - 15 and all(abs(t - u) >= gap for u in out):
            out.append(t)
        if len(out) >= n:
            break
    return sorted(out)


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--video")
    ap.add_argument("--nosong")
    ap.add_argument("--hits", action="store_true", help="no keySounds: measure the loudest game hits (a report, no BLOCK)")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    d = VIDEOS / "shorts" / a.name
    video, nosong = pathlib.Path(a.video or d / "short.mp4"), pathlib.Path(a.nosong or d / "short_nosong.mp4")
    if not nosong.exists():
        print(f"key sounds: no {nosong} (the no-song stem): can't separate the music", file=sys.stderr)
        return 2
    edit = stunt_edit(a.name)
    mix, stem = align(pcm(video), pcm(nosong))
    drop = None
    if edit.get("keySounds"):
        tl, start, hook, drop = package_clock(a.name, edit)
        times, kind = key_times(edit, tl, start, hook), "key"
    elif a.hits:
        times, kind = hit_times(stem), "hit"
    else:
        print(f"{a.name}: no edit.keySounds: nothing to check (--hits measures its loudest game sounds)")
        return 0
    rows = margins(stem, None, times, mix=mix, stop=drop)
    bad = [r for r in rows if r["margin_db"] < KEY_MIN_DB]
    if a.json:
        print(json.dumps({"name": a.name, "kind": kind, "rows": rows, "blockers": bad if kind == "key" else []}))
    else:
        for r in rows:
            print(f"  {kind} {r['t']:6.2f} s  audible {r['audible_s']:.2f} s  sound {r['key_db']:6.1f} dB  music {r['music_db']:6.1f} dB  margin {r['margin_db']:+5.1f} dB")
        ms = [r["margin_db"] for r in rows]
        print(f"{a.name}: {len(rows)} {kind} sounds, margin median {np.median(ms):+.1f} dB, worst {min(ms):+.1f} dB" if rows else f"{a.name}: none found")
        if kind == "key":
            for r in bad:
                print(f"BLOCK [keysound] {r['t']:6.2f} s: the music is {KEY_MIN_DB - r['margin_db'] + 0:.1f} dB too loud under this key sound (margin {r['margin_db']:+.1f} dB, need >= {KEY_MIN_DB:.0f}): re-run scripts/add_song.py {a.name} --song <its track> (it ducks the song under edit.keySounds)")
    return 1 if bad and kind == "key" else 0


if __name__ == "__main__":
    sys.exit(main())
