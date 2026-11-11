"""The owner's per-Short OK for YouTube (owner 2026-11-11: "dont let anything go to youtube anymore without an OK from
me"). scripts/youtube_upload.py uploads a Short only when uploads[/<channel>]/owner_ok.txt has a line for it naming the
sha256 prefix of the exact video the owner watched (video.release.sha256 in its metadata.json); a re-published Short
needs a new OK.

    python3 scripts/owner_ok.py list [--channel buhstories]          # ready Shorts not uploaded: OK'd or waiting
    python3 scripts/owner_ok.py add <name>... --note "owner: ..."    # record the owner's OK for the CURRENT cut
    python3 scripts/owner_ok.py revoke <name>...

Only run `add` after the owner said OK to that Short by name (or to a list/folder that names it). Reads the videos
branch from origin (git show), so it needs no worktree. Commit uploads/.../owner_ok.txt to main afterwards.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def up_dir(channel: str) -> pathlib.Path:
    return ROOT / "uploads" if channel == "hellobuh" else ROOT / "uploads" / channel


def videos_meta() -> dict:
    subprocess.run(["git", "-C", str(ROOT), "fetch", "-q", "origin", "videos"], check=False)
    names = subprocess.run(["git", "-C", str(ROOT), "ls-tree", "--name-only", "origin/videos", "shorts/"],
                           capture_output=True, text=True).stdout.split()
    out = {}
    for p in names:
        r = subprocess.run(["git", "-C", str(ROOT), "show", f"origin/videos:{p}/metadata.json"], capture_output=True, text=True)
        if r.returncode == 0:
            try:
                out[p.split("/")[-1]] = json.loads(r.stdout)
            except json.JSONDecodeError:
                pass
    return out


def channel_of(meta: dict) -> str:
    return meta.get("channel") or "hellobuh"


def read(path: pathlib.Path) -> list[str]:
    return path.read_text().splitlines() if path.exists() else []


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["list", "add", "revoke"])
    ap.add_argument("names", nargs="*")
    ap.add_argument("--channel", default="hellobuh")
    ap.add_argument("--note", default="")
    a = ap.parse_args()
    up = up_dir(a.channel)
    okf = up / "owner_ok.txt"
    lines = read(okf)
    done = json.loads((up / "uploads.json").read_text()) if (up / "uploads.json").exists() else {}
    metas = videos_meta()
    if a.cmd == "list":
        oked = {l.split()[0]: l.split()[1] for l in lines if l.split("#")[0].split()[1:]}
        for n, m in sorted(metas.items()):
            if channel_of(m) != a.channel or m.get("status") != "ready" or n in done:
                continue
            sha = ((m.get("video") or {}).get("release") or {}).get("sha256", "")
            s = oked.get(n)
            state = "OK" if s and sha.startswith(s) else ("OK'd an older cut" if s else "waiting for the owner")
            print(f"{n:28} {sha[:16]:16}  {state}")
        return 0
    if not a.names:
        sys.exit("which Shorts?")
    keep = [l for l in lines if not (l.split() and l.split()[0] in a.names)]
    if a.cmd == "add":
        if not a.note:
            sys.exit("--note: quote the owner's OK (who said it, when)")
        for n in a.names:
            m = metas.get(n) or sys.exit(f"{n}: not on the videos branch")
            sha = ((m.get("video") or {}).get("release") or {}).get("sha256") or sys.exit(f"{n}: no video.release sha256")
            keep.append(f"{n}  {sha[:16]}  # {dt.date.today()}: {a.note}")
            print(f"{n}: OK for {sha[:16]}")
    up.mkdir(parents=True, exist_ok=True)
    okf.write_text("# The owner's OK per Short, bound to the exact cut they watched (scripts/owner_ok.py; youtube_upload.py)\n"
                   + "\n".join(l for l in keep if l and not l.startswith("# The owner")) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
