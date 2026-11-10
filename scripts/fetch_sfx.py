"""Download the Mixkit sound effects listed in sfx/mixkit/manifest.json into sfx/mixkit/<category>/.

The repo is public and Mixkit's Sound Effects Free License forbids redistributing the files on their
own, so the audio is not committed (gitignored); every machine fetches it from Mixkit instead.
Already-downloaded files are skipped.

  python3 scripts/fetch_sfx.py                     # all of them
  python3 scripts/fetch_sfx.py cinematic/ transition/transition_windy_swoosh_1474.mp3   # only these files / folders
"""
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / "sfx" / "mixkit"
items = json.loads((ROOT / "manifest.json").read_text())
if sys.argv[1:]:
    items = [it for it in items if any(it["file"].startswith(a) for a in sys.argv[1:])]
got = 0
for it in items:
    dst = ROOT / it["file"]
    if dst.exists() and dst.stat().st_size > 0:
        continue
    dst.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(["curl", "-s", "-f", "-A", "Mozilla/5.0", "-m", "30", "-o", str(dst), it["url"]])
    if r.returncode == 0:
        got += 1
    else:
        print("failed:", it["title"], it["url"])
print(f"{got} downloaded, {len(items)} listed")
