"""Loudness without squashing the dynamics.

ffmpeg's single-pass loudnorm is a dynamic compressor: on a build-up Short it lifted the quiet start
by ~45 dB and left the 486-TNT payoff no louder than the bells before it (worker 17, chain_reaction).
So stems get a static gain from their measured integrated loudness, and the finished mix gets a
static gain plus a true-peak limiter, measured again until it lands on the target.
"""
import os
import re
import subprocess


def measure(path, ss=0.0, dur=None):
    """Integrated loudness (LUFS) of a file's audio, from ss for dur seconds (ffmpeg ebur128)."""
    cmd = ["ffmpeg", "-nostats", "-ss", f"{ss:.3f}"] + (["-t", f"{dur:.3f}"] if dur else []) + \
          ["-i", str(path), "-map", "0:a", "-af", "ebur128", "-f", "null", "-"]
    err = subprocess.run(cmd, capture_output=True, text=True).stderr
    vals = re.findall(r"I:\s+(-?[\d.]+) LUFS", err)
    v = float(vals[-1]) if vals else -70.0
    return v if v > -69 else -70.0


def static(path, target, ss=0.0, dur=None, max_gain=30.0):
    """A `volume=..dB` filter that brings the segment's integrated loudness to `target` (no compression)."""
    g = max(-40.0, min(max_gain, target - measure(path, ss, dur)))
    return f"volume={g:.2f}dB"


def true_peak(path):
    """The true peak (dBTP, ebur128 peak=true: 4x oversampled) of a file's audio as decoded (after the AAC encode)."""
    err = subprocess.run(["ffmpeg", "-nostats", "-i", str(path), "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    vals = re.findall(r"Peak:\s+(-?[\d.]+|-inf) dBFS", err)
    return float(vals[-1]) if vals and vals[-1] != "-inf" else -70.0


def master(path, target, limit_db=-1.0):
    """Bring a finished file's audio to `target` LUFS with its true peak at or under `limit_db` dBTP: a static gain,
    then a limiter on the 4x-oversampled signal (inter-sample peaks), encoded, re-measured (loudness and the decoded
    true peak: the AAC encode overshoots) and corrected. Video copied. 2026-11-11: the stunt masters (-10 LUFS) peaked
    at +0.4 dBTP with a sample-peak limiter at -1, a clipping risk after YouTube's transcode."""
    gain = target - measure(path)
    if abs(gain) < 0.3 and true_peak(path) <= limit_db:
        return
    ceil = limit_db - 0.5   # the encode's overshoot, corrected below from the measured peak
    tmp = str(path) + ".gain.mp4"
    for _ in range(6):
        lim = 10 ** (ceil / 20)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-map", "0:v?", "-map", "0:a", "-c:v", "copy",
                        "-af", f"volume={gain:.2f}dB,aresample=192000,alimiter=limit={lim:.4f}:level=false:attack=1:release=50,aresample=48000",
                        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp], check=True)
        miss, over = target - measure(tmp), true_peak(tmp) - limit_db
        if os.environ.get("LOUD_DEBUG"):
            print(f"master: gain {gain:+.2f} dB, ceiling {ceil:.2f}: {target - miss:.2f} LUFS, {over + limit_db:+.2f} dBTP")
        if abs(miss) < 0.3 and over <= 0:
            break
        if over > 0:
            ceil -= over + 0.1
        gain += miss
    os.replace(tmp, path)


# The stunt mix (scripts/add_song.py, 2026-11-12): master the game + sfx first, then lay the song under it at a fixed
# level. A sparse, peaky game track (a few block sounds and hits over silence) needed ~+13 dB of makeup gain to reach
# -10 LUFS, and the limiter then took ~12 dB back on every hit: with the song in the mix, the bed PUMPED ~11 dB on
# every block placement (desire_town, owner 2026-11-12: "the music jumps too much"). So the game's gain is capped where
# its true peak would need more than MAX_REDUCTION dB of limiting, the song follows the game at a fixed offset, and the
# finished mix only gets a true-peak limiter (no makeup gain).
MAX_REDUCTION = 3.0


SILENT_GAME = -45.0   # LUFS: a game stem this quiet is (near) silent: nothing is raised, the song sits at its plain bed
GAIN_RANGE = 20.0     # dB: the most the game stem is raised or lowered


def stunt_levels(stem_lufs, stem_peak, bed, target, limit_db=-1.0, max_reduction=MAX_REDUCTION, raw_lufs=None):
    """(game gain dB, song LUFS) for the stunt mix from the game stem's measured loudness and true peak: the game toward
    `target`, capped so its peak needs <= max_reduction dB of limiting (and to +-GAIN_RANGE), the song at its fixed
    offset under the game as it measures (bed is the song's level for a game at -15 LUFS: song = bed + 15 + stem + g).
    A near-silent game (<= SILENT_GAME, measure() says -70 for silence) raises nothing and the song sits at `bed`: the
    old tame_gain read silence as +57 dB of headroom and the song came in ~30 dB hot (review of e78b8f1).
    raw_lufs: the game's loudness BEFORE the stem's static pre-gain (add_song raises it toward -15 LUFS by up to +30 dB):
    near-silence is judged on that, and a near-silent game's gain undoes the pre-gain (its hiss is never raised: a -60
    LUFS game became a -30.8 stem and got +48 dB in all, review of 920679d)."""
    raw = stem_lufs if raw_lufs is None else raw_lufs
    if raw <= SILENT_GAME:
        return (raw - stem_lufs if raw > -69 else 0.0), bed
    g = min(target - stem_lufs, limit_db + max_reduction - stem_peak)
    g = max(-GAIN_RANGE, min(GAIN_RANGE, g))
    return g, bed + 15.0 + stem_lufs + g


def tame_gain(path, target, limit_db=-1.0, max_reduction=MAX_REDUCTION, ss=0.0, dur=None):
    """The static gain (dB) for a stem: toward `target` LUFS, but at most enough to put its true peak `max_reduction`
    dB over `limit_db` (so the limiter never takes more than that off its loudest moment)."""
    return min(target - measure(path, ss, dur), limit_db + max_reduction - true_peak(path))


def limit_peaks(path, limit_db=-1.0):
    """master() without the makeup gain: a true-peak limiter at `limit_db` dBTP (the ceiling corrected for the AAC
    encode's overshoot), the loudness left as mixed."""
    if true_peak(path) <= limit_db:
        return
    ceil = limit_db - 0.5
    tmp = str(path) + ".lim.mp4"
    for _ in range(4):
        lim = 10 ** (ceil / 20)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-map", "0:v?", "-map", "0:a", "-c:v", "copy",
                        "-af", f"aresample=192000,alimiter=limit={lim:.4f}:level=false:attack=1:release=50,aresample=48000",
                        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp], check=True)
        over = true_peak(tmp) - limit_db
        if over <= 0:
            break
        ceil -= over + 0.1
    os.replace(tmp, path)
