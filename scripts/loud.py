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
