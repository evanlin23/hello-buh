"""Music under a live sample or stream chunk (docs/livestream.md; owner 2026-11-14: "much fancier (arena, music, sound
design)"). Live formats only: a Short's music goes through scripts/add_song.py at publish, unchanged.

    python3 scripts/live_music.py out/<name>.mp4 --track the_redeemer.mp3 [--out out/<name>_music.mp4] [--bed -21]

The NCS track (music/ncs.json, songs/ncs/) loops under the whole video at one steady level (--bed LUFS, measured, a
static gain: no ducking, no pumping, the steady-music rule r:r6ae905), the game and the sound design over it as they
are, then the whole mix to -14 LUFS (YouTube's reference) with a static gain and a -1 dBTP limiter. Prints the
track's official NCS credit for the description (the stream description takes "Music provided by
http://spoti.fi/NCS" plus the track credit: docs/research/livestream.md A5). The picture is copied untouched.
"""
import argparse
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent.parent


def lufs(path, extra=()):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), *extra, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)
    return float(m[-1]) if m else None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--track", required=True, help="a file in songs/ncs/ (music/ncs.json)")
    ap.add_argument("--out")
    ap.add_argument("--bed", type=float, default=-21.0, help="the music's own level under the game, LUFS")
    a = ap.parse_args()
    meta = json.loads((HERE / "music" / "ncs.json").read_text())
    tracks = meta["tracks"] if isinstance(meta, dict) and "tracks" in meta else meta
    tr = next((t for t in tracks if t["file"] == a.track), None)
    if not tr:
        sys.exit(f"live_music: {a.track} is not in music/ncs.json (only NCS tracks: no claims, credit in the description)")
    song = HERE / "songs" / "ncs" / a.track
    if not song.exists():
        sys.exit(f"live_music: {song} missing (scripts/ncs.py downloads it; songs/ is never committed)")
    dur = float(json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", a.video],
                                          capture_output=True, text=True, check=True).stdout)["format"]["duration"])
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="live_music_"))
    try:
        bed = tmp / "bed.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-stream_loop", "-1", "-i", str(song), "-t", f"{dur:.3f}", "-ac", "2", "-ar", "48000",
                        "-af", f"afade=t=in:d=0.5,afade=t=out:st={max(0, dur - 1.0):.3f}:d=1.0", str(bed)], check=True)
        g = a.bed - lufs(bed)
        game = tmp / "game.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.video, "-vn", "-ac", "2", "-ar", "48000", str(game)], check=True)
        mix = tmp / "mix.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(game), "-i", str(bed), "-filter_complex",
                        f"[1:a]volume={g:.2f}dB[m];[0:a][m]amix=inputs=2:normalize=0:duration=first[a]", "-map", "[a]", str(mix)], check=True)
        g2 = -14.0 - lufs(mix)
        out = pathlib.Path(a.out or a.video)
        dst = tmp / "out.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.video, "-i", str(mix), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                        "-af", f"volume={g2:.2f}dB,alimiter=limit=0.89:level=false", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(dst)], check=True)
        shutil.move(str(dst), str(out))
        print(f"live_music: wrote {out} (music bed {a.bed:g} LUFS, mix {lufs(out):.1f} LUFS)")
        print("credit for the description:\n" + tr["credit"] + "\nMusic provided by http://spoti.fi/NCS")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
