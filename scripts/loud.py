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


def master(path, target, limit_db=-1.0):
    """Bring a finished file's audio to `target` LUFS: a static gain, then a true-peak limiter at
    `limit_db`; re-measure and correct (the limiter eats some gain on loud payoffs). Video copied."""
    gain = target - measure(path)
    if abs(gain) < 0.3:
        return
    lim = 10 ** (limit_db / 20)
    tmp = str(path) + ".gain.mp4"
    for _ in range(4):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-map", "0:v?", "-map", "0:a", "-c:v", "copy",
                        "-af", f"volume={gain:.2f}dB,alimiter=limit={lim:.3f}:level=false,aresample=48000", "-c:a", "aac", "-b:a", "192k",
                        "-movflags", "+faststart", tmp], check=True)
        miss = target - measure(tmp)
        if abs(miss) < 0.3:
            break
        gain += miss
    os.replace(tmp, path)
