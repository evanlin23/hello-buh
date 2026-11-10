"""Download the story score tracks listed in music/score.json into songs/score/<id>.ogg.

The repo is public, so the audio is never committed (songs/ is gitignored): every machine fetches it from
the URL logged in music/score.json. Only the first --keep seconds are kept (a Short needs ~75 s at most),
re-encoded to Opus 128k (~1 MB a track), and the mp3 is deleted. Already-fetched tracks are skipped.

  python3 scripts/fetch_music.py                 # every track
  python3 scripts/fetch_music.py --mood eerie    # one mood
  python3 scripts/fetch_music.py --id stay_the_course
"""
import json
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
LIST = ROOT / "music" / "score.json"
DIR = ROOT / "songs" / "score"


def tracks():
    return json.loads(LIST.read_text())


def path_of(t):
    return DIR / f"{t['id']}.ogg"


def fetch(t, keep=150.0):
    dst = path_of(t)
    if dst.exists() and dst.stat().st_size > 0:
        return dst
    DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        mp3 = pathlib.Path(td) / "t.mp3"
        r = subprocess.run(["curl", "-sS", "-f", "-L", "-A", "Mozilla/5.0", "-m", "120", "-o", str(mp3), t["url"]])
        if r.returncode:
            print("failed:", t["id"], t["url"])
            return None
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp3), "-t", f"{keep:.0f}", "-ar", "48000", "-ac", "2",
                        "-c:a", "libopus", "-b:a", "128k", str(dst)], check=True)
    return dst


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--mood")
    ap.add_argument("--id")
    ap.add_argument("--keep", type=float, default=150.0)
    a = ap.parse_args()
    got = 0
    for t in tracks():
        if (a.mood and t["mood"] != a.mood) or (a.id and t["id"] != a.id):
            continue
        if fetch(t, a.keep):
            got += 1
    print(f"{got} tracks in {DIR}")
