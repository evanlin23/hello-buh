"""The bed-pumping check on a stunt's final mix (owner 2026-11-12 on desire_town: "the music jumps too much, can we
jsut have it sit underneath the sound effects but still there").

Two numbers, from the final mix, the mix before its master (add_song's pre_out) and the game-only render (the
no-song mp4, which classifies each 50 ms window as a block-sound/hit moment or a music-only moment):
  pump     how much the master's gain (final minus pre-master level, per window) varies: its 5th-95th percentile spread.
           A master that adds +12 dB of makeup gain into a limiter takes it back on every hit, so the bed jumps ~11 dB
           around each block sound. BLOCK over PUMP_MAX dB, or when any run of RUN_S s or more sits RUN_MAX dB under
           the median gain (a few short, heavily limited hits are under 5% of the windows: the spread alone missed them).
  under    how far the music sits under the game sounds: the game's level in the final mix (the block-sound windows'
           power minus the music-only windows' power) over the music-only level. BLOCK under UNDER_MIN dB.
           Block-sound windows: the game within 6 dB of its 95th-percentile level. Music-only windows: the game under
           max(SILENT, that level - QUIET_REL) (so a constant room tone still counts as quiet), and the final mix over
           SILENT there (a late or short song leaves silence, not music, in those windows: they are left out).
Blind spots (not judged, or judged loosely): a game that never goes quiet (under: "not judged"); a Short whose song is
absent for most of it (few music-only windows); short limited hits under RUN_S s each.

    python3 scripts/mix_pump.py <final.mp4> <premaster.mp4> <nosong.mp4>     (mixcheck runs it on every mix)
"""
import subprocess
import sys

import numpy as np

WIN = 0.05          # s per window
PUMP_MAX = 3.0      # dB: the master's gain spread (p5-p95) a mix may have
UNDER_MIN = 3.0     # dB: the game sounds at least this much over the music
SILENT = -45.0      # dBFS: a game window this quiet is music-only
QUIET_REL = 20.0    # dB under the block-sound level: also music-only (a room tone)
RUN_S = 0.5         # s: a run of windows this long ...
RUN_MAX = 6.0       # dB: ... this far under the median gain BLOCKs (a hit limited hard)
MIN_WIN = 10        # windows of each kind needed to judge


def rms_db(path, win=WIN):
    """Per-window RMS (dBFS) of a file's audio, mono."""
    x = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "48000", "-f", "f32le", "-"],
                       capture_output=True).stdout
    a = np.frombuffer(x, np.float32)
    h = int(48000 * win)
    n = len(a) // h
    if not n:
        return np.zeros(0)
    a = a[:n * h].reshape(n, h)
    return 20 * np.log10(np.sqrt((a.astype(np.float64) ** 2).mean(axis=1)) + 1e-9)


def pump(final, pre, tail=0.7, head=0.1, floor=-45.0):
    """(p5-p95 spread of the master's gain in dB, median gain) over the windows where the pre-master mix is audible,
    leaving out the first `head` s and the last `tail` s (the fades)."""
    n = min(len(final), len(pre))
    a, b = int(head / WIN), n - int(tail / WIN)
    g, p = (final[:n] - pre[:n])[a:b], pre[:n][a:b]
    g = g[p > floor]
    if len(g) < MIN_WIN:
        return None, None
    return float(np.percentile(g, 95) - np.percentile(g, 5)), float(np.median(g))


def pump_run(final, pre, tail=0.7, head=0.1, floor=-45.0):
    """The longest run (s) of audible windows whose gain is more than RUN_MAX dB under the median gain."""
    n = min(len(final), len(pre))
    a, b = int(head / WIN), n - int(tail / WIN)
    g, p = (final[:n] - pre[:n])[a:b], pre[:n][a:b]
    ok = p > floor
    if ok.sum() < MIN_WIN:
        return 0.0
    low = ok & (g < np.median(g[ok]) - RUN_MAX)
    best = cur = 0
    for x in low:
        cur = cur + 1 if x else 0
        best = max(best, cur)
    return best * WIN


def under(final, game, tail=0.7):
    """(dB the game sounds sit over the music in the final mix, n block-sound windows, n music-only windows), or
    (None, ..) when the Short has too few of either kind (a game that never stops, or never plays)."""
    n = min(len(final), len(game)) - int(tail / WIN)
    f, g = final[:n], game[:n]
    audible = g[g > SILENT]
    if len(audible) < MIN_WIN:
        return None, 0, 0
    top = np.percentile(audible, 95)
    busy = g >= top - 6
    quiet = (g < max(SILENT, top - QUIET_REL)) & (f > SILENT)
    if busy.sum() < MIN_WIN or quiet.sum() < MIN_WIN:
        return None, int(busy.sum()), int(quiet.sum())
    pb, pq = np.median(10 ** (f[busy] / 10)), np.median(10 ** (f[quiet] / 10))
    if pb <= pq:   # the block-sound moments are no louder than the music alone (a pumped bed): their ratio, negative
        return float(10 * np.log10(pb / pq)), int(busy.sum()), int(quiet.sum())
    return float(10 * np.log10(pb - pq) - 10 * np.log10(pq)), int(busy.sum()), int(quiet.sum())


def stats(final, pre, nosong):
    """{pump, pump_run, under, ok, summary} for a finished mix (add_song writes it into metadata.json `mix`)."""
    f = rms_db(final)
    pr = rms_db(pre) if pre else None
    sp, med = pump(f, pr) if pr is not None else (None, None)
    run = pump_run(f, pr) if pr is not None else 0.0
    u, nb, nq = under(f, rms_db(nosong))
    bad = [k for k, b in (("pump", sp is not None and (sp > PUMP_MAX or run >= RUN_S)), ("under", u is not None and u < UNDER_MIN)) if b]
    r = lambda x: None if x is None else round(float(x), 2)
    return {"pump": r(sp), "pump_run": r(run), "master_gain": r(med), "under": r(u), "windows": [nb, nq], "ok": not bad,
            "summary": (f"BLOCK {'+'.join(bad)}: " if bad else "") + f"master gain spread {r(sp)} dB (max {PUMP_MAX}), run {r(run)} s (max {RUN_S}), "
                       f"game over music {r(u)} dB (min {UNDER_MIN})"}


def check(final, pre, nosong):
    """-> (lines, blocked) for paths (pre may be None: the pump part is skipped)."""
    lines, blocked = [], False
    f = rms_db(final)
    if pre:
        pr = rms_db(pre)
        sp, med = pump(f, pr)
        if sp is not None:
            run = pump_run(f, pr)
            bad = sp > PUMP_MAX or run >= RUN_S
            blocked |= bad
            lines.append(f"{'BLOCK' if bad else 'ok   '} [pump   ] the master's gain varies {sp:.1f} dB (p5-p95, median {med:+.1f} dB; "
                         f"max {PUMP_MAX:.0f}; longest run {RUN_MAX:.0f} dB+ under it {run:.2f} s, max {RUN_S} s){': the bed jumps around every block sound and hit: master the game first (scripts/add_song.py), lower the hits or the target' if bad else ''}")
    u, nb, nq = under(f, rms_db(nosong))
    if u is None:
        lines.append(f"note  [under  ] music vs game: not judged ({nb} block-sound and {nq} music-only windows)")
    else:
        bad = u < UNDER_MIN
        blocked |= bad
        lines.append(f"{'BLOCK' if bad else 'ok   '} [under  ] the game sounds sit {u:+.1f} dB over the music (min {UNDER_MIN:.0f}; "
                     f"{nb} block-sound / {nq} music-only windows){': the music is on top of the game: lower edit.songGain' if bad else ''}")
    return lines, blocked


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    ls, b = check(sys.argv[1], sys.argv[2] if sys.argv[2] != "-" else None, sys.argv[3])
    print("\n".join(ls))
    sys.exit(1 if b else 0)
