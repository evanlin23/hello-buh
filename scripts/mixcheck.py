"""Gate the FINAL mix before publishing: the NCS bed publish.js will add, then pace on that file.

Why (docs/lessons.md, 2026-11-11): cells_lab, dilemma_mace and race_grass_mycelium each passed pace on the no-song
render, were reviewed READY, and were then blocked by the v3 gates on the published short.mp4 ("payoff: no sound hit
within 0.3 s of the payoff"): the NCS bed buries a payoff hit that is clear without music. Run this before calling a
Short READY; it changes nothing in the videos branch.

    python3 scripts/mixcheck.py <name> [--video out/<name>.mp4] [--song FILE] [--keep]

It copies every package's metadata.json (so pick_ncs picks the same track publish would) into a scratch videos dir,
adds this Short's render as short_nosong.mp4 and work/<name>.rec.json as its recording, runs add_song.main(--ncs)
there, then `./hb pace <name> --video <mix>` exactly as gates.py stamps it. Exit 1 on any pace BLOCK. Fix: land the drop on the payoff (edit.dropAt),
a song dip + impact at the payoff mark (edit.sfx ['dip', mark, 0.4], ['impact', mark, {gain: 1.4}]), no riser over the
dip.
"""
from __future__ import annotations

import argparse
import gzip
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--video", help="the no-song render (default out/<name>.mp4)")
    ap.add_argument("--song", help="force a song instead of the NCS pick")
    ap.add_argument("--keep", action="store_true", help="keep the scratch mix and print its path")
    a = ap.parse_args()
    n = a.name
    src = pathlib.Path(a.video or ROOT / "out" / f"{n}.mp4")
    rec = ROOT / "work" / f"{n}.rec.json"
    for f in (src, rec):
        if not f.exists():
            sys.exit(f"mixcheck: missing {f} (render first, or fetch render/{n}: renders/out/{n}.mp4 and renders/slices/{n}.rec.json.gz)")
    import add_song
    real = add_song.VID
    tmp = pathlib.Path(tempfile.mkdtemp(prefix=f"mixcheck_{n}_", dir=ROOT / "work"))
    try:
        for m in (real / "shorts").glob("*/metadata.json"):
            if m.parent.name == n:
                continue
            d = tmp / "shorts" / m.parent.name
            d.mkdir(parents=True)
            shutil.copy(m, d / "metadata.json")
        d = tmp / "shorts" / n
        d.mkdir(parents=True)
        old = real / "shorts" / n / "metadata.json"
        meta = json.loads(old.read_text()) if old.exists() else {}
        meta.setdefault("youtube", {}).setdefault("hashtags", [])
        meta.setdefault("caption", n)
        (d / "metadata.json").write_text(json.dumps(meta))
        shutil.copy(src, d / "short_nosong.mp4")
        (d / "recording.json.gz").write_bytes(gzip.compress(rec.read_bytes()))
        mix = d / "short.mp4"   # beside short_nosong.mp4, as gates.py runs it: pace then measures the key sounds too
        add_song.VID = tmp
        add_song.main(n, a.song, str(mix), ncs=not a.song)
        if not mix.exists():
            print(f"mixcheck: add_song made no mix (no song for this Short?): pace on the render itself")
            mix = src
        r = subprocess.run(["node", str(ROOT / "hb"), "pace", n, "--video", str(mix)], cwd=ROOT,   # the gate's own call
                           capture_output=True, text=True)
        out = r.stdout + r.stderr
        print(out.rstrip())
        blocked = "BLOCK" in out and "0 blocker" not in out
        print(f"mixcheck {n}: {'BLOCKED on the final mix (fix before calling it READY)' if blocked else 'OK on the final mix'}")
        if a.keep:
            keep = ROOT / "work" / f"{n}.mixcheck.mp4"
            shutil.copy(mix, keep)
            print(f"mix kept: {keep}")
        return 1 if blocked else 0
    finally:
        add_song.VID = real
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
