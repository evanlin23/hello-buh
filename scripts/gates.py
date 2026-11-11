"""The publish gates, recorded on each package, and the stale-checkout guard (docs/lessons.md, process lessons 2026-11-11).

1. Re-gate on gate changes. lib/hb/gates.json holds the gates' version: bump it (with a history row) whenever a gate is
   added or tightened. Every publish (publish.js, publish_ai_short.py) runs the gates on the finished package and writes
   metadata.json `gates`: {version, at, package {ok: short.mp4 runs as long as the reviewed render}, pace {ok, blockers,
   warnings, ...}, check {ok, label, at}, key_sounds, waived}.
   scripts/youtube_upload.py skips a non-story "ready" package whose gates are older than the current version, or
   whose gates blocked without a waiver, with the reason in the run log. story_* packages are gated by the story
   pipeline (story check, caption sync, table read, the owner's in-person OK before "held" becomes "ready"): the gates
   are recorded for them too, but never stop their upload.
2. A stale checkout never publishes: fetch origin main, then HEAD must contain it (git merge-base --is-ancestor).

    python3 scripts/gates.py version                      # the current gates version
    python3 scripts/gates.py fresh                        # exit 1 (with the fix) when HEAD doesn't contain origin/main
    python3 scripts/gates.py stamp <name>... [--waive "who: why"] [--video MP4] [--videos DIR]
        run pace (+ key sounds) on the package's short.mp4 (downloaded from its release asset when not on disk) and the
        latest ./hb check report, and write metadata.json `gates` (the videos worktree; commit + push it yourself,
        or let publish.js do it). --waive records a reviewed decision to ship over a blocker (e.g. a lead's short cut
        under pace's 25 s floor).
    python3 scripts/gates.py stale [--videos DIR]         # the ready packages the uploader would skip, and why
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
GATES = ROOT / "lib" / "hb" / "gates.json"
VIDEOS = pathlib.Path(os.environ.get("HB_VIDEOS", ROOT.parent / "hb-videos"))
STORY_NOTE = "a story: gated by the story pipeline (story check, caption sync, table read, the owner's OK)"


def spec() -> dict:
    return json.loads(GATES.read_text())


def current() -> int:
    return int(spec()["version"])


def exempt(name: str) -> str | None:
    """Why this package's upload never waits on the stunt gates (None: it does)."""
    return STORY_NOTE if str(name).startswith("story_") else None


def stale(meta: dict, cur: int | None = None) -> str | None:
    """Why the uploader must skip this ready package (None: its gates are current and passed, or waived)."""
    name = meta.get("name", "")
    if exempt(name):
        return None
    cur = current() if cur is None else cur
    g = meta.get("gates") or {}
    v = int(g.get("version") or 0)
    if v < cur:
        new = [h["what"] for h in spec().get("history", []) if v < int(h["version"]) <= cur]
        return (f"gated at v{v or 'none'}, the gates are v{cur} now (since then: {'; '.join(new) or 'see lib/hb/gates.json'}): "
                f"re-gate it (python3 scripts/gates.py stamp {name}, fix any blocker, push the videos branch)")
    if g.get("waived"):
        return None
    bad = [k for k in ("package", "pace", "check") if isinstance(g.get(k), dict) and g[k].get("ok") is False]
    if isinstance(g.get("key_sounds"), dict) and g["key_sounds"].get("ok") is False and "pace" not in bad:
        bad.append("key_sounds")
    if bad:
        return (f"its v{v} gates blocked ({', '.join(f'{k}: ' + str(g[k].get('summary') or g[k].get('label') or 'failed') for k in bad)}): "
                f"fix and publish again, or record a reviewed waiver (gates.py stamp {name} --waive \"who: why\")")
    return None


# ---------------------------------------------------------------- the stale-checkout guard
def git(*a, cwd=None):
    return subprocess.run(["git", *a], cwd=cwd or ROOT, capture_output=True, text=True)


def fresh(root: pathlib.Path | None = None, remote: str = "origin") -> str | None:
    """None when HEAD contains <remote>/main (after fetching it), else what's wrong and the fix."""
    root = root or ROOT
    f = git("fetch", "-q", remote, "main", cwd=root)
    if f.returncode:
        return (f"could not fetch {remote} main ({(f.stderr or '').strip()[:200]}): can't tell whether this checkout has "
                "the current publish code. Fix the network, then publish again")
    r = git("merge-base", "--is-ancestor", f"refs/remotes/{remote}/main", "HEAD", cwd=root)
    if r.returncode == 0:
        return None
    if r.returncode != 1:
        return f"git merge-base failed: {(r.stderr or '').strip()[:200]}"
    head = git("rev-parse", "--short", "HEAD", cwd=root).stdout.strip()
    br = git("rev-parse", "--abbrev-ref", "HEAD", cwd=root).stdout.strip()
    om = git("rev-parse", "--short", f"refs/remotes/{remote}/main", cwd=root).stdout.strip()
    return (f"stale checkout: HEAD ({br} {head}) doesn't contain {remote}/main ({om}), so this publish code may be old "
            f"(an old publish.js left a Short with no video). Rebase on origin/main first: git fetch origin && "
            f"git rebase origin/main (in the main checkout: git pull --ff-only), then publish again")


def fresh_or_exit(what: str) -> None:
    """For a script that publishes on its own; publish.js checks once and sets HB_FRESH_OK=1 for its children."""
    if os.environ.get("HB_FRESH_OK") == "1":
        return
    why = fresh()
    if why:
        sys.exit(f"{what}: refusing to publish: {why}")


# ---------------------------------------------------------------- running the gates on a package
def latest_check(name: str) -> dict | None:
    cands = [ROOT / "out" / f"{name}.check.json", ROOT / "work" / "hb" / f"{name}.check.json"]
    cands = [p for p in cands if p.exists()]
    if not cands:
        return None
    p = max(cands, key=lambda p: p.stat().st_mtime)
    try:
        c = json.loads(p.read_text())
    except Exception as e:   # noqa: BLE001
        return {"ok": False, "label": f"unreadable {p.name}: {e}"}
    return {"ok": bool(c.get("ok")), "label": c.get("label", ""), "blockers": c.get("blockers", 0),
            "at": c.get("when") or dt.datetime.fromtimestamp(p.stat().st_mtime, dt.timezone.utc).isoformat(timespec="seconds"),
            "report": str(p.relative_to(ROOT))}


def run_pace(name: str, video: pathlib.Path) -> dict:
    """./hb pace --json on the package video (it finds the recording; key sounds when short_nosong.mp4 sits beside it)."""
    def go(cmd):
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=900)
        out = (r.stdout or "").strip()
        try:
            res = json.loads(out[out.index("{"):]) if "{" in out else None
        except ValueError:
            res = None
        return (res if isinstance(res, dict) and "findings" in res else None), r
    res, r = go(["node", str(ROOT / "hb"), "pace", name, "--video", str(video), "--json"])
    marks = True
    if res is None:   # (e.g. an AI short whose recording pace can't read): the picture and sound alone
        res, r2 = go(["python3", str(ROOT / "scripts" / "pace.py"), name, "--video", str(video), "--json"])
        marks = False
        if res is None:
            return {"ok": False, "summary": f"pace could not run (exit {r.returncode}/{r2.returncode}): {((r.stderr or '') + (r2.stderr or '')).strip()[-300:]}"}
    F = res["findings"]
    blocks = [f for f in F if f["level"] == "BLOCK"]
    warns = [f for f in F if f["level"] == "WARN"]
    return {"ok": not blocks, "blockers": len(blocks), "warnings": len(warns), **({} if marks else {"marks": "none (picture and sound only)"}),
            "summary": "; ".join(f"{f['check']}: {f['msg'][:120]}" for f in blocks) or "OK",
            "keysound": [f for f in F if f["check"] == "keysound"], "notes": res.get("notes", [])}


def key_sounds_of(name: str, pace: dict) -> str | dict:
    try:
        r = subprocess.run(["node", "-e", f"const s=require({json.dumps(str(ROOT / 'stunts' / (name + '.js')))});"
                            "console.log(JSON.stringify(((s.edit||{}).keySounds)||[]))"], capture_output=True, text=True, timeout=60)
        keys = json.loads(r.stdout or "[]")
    except Exception:   # noqa: BLE001
        keys = []
    if not keys:
        return "n/a"
    measured = [n for n in pace.get("notes", []) if n.startswith("key sounds over the music")]
    return {"ok": not pace.get("keysound"), "keys": keys, "summary": measured[0] if measured else "not measured (no short_nosong.mp4 beside the video)"}


def duration(video: pathlib.Path) -> float | None:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return None


def package_match(meta: dict, video: pathlib.Path) -> dict:
    """The upload is the reviewed render: short.mp4 (song added at publish) runs as long as metadata video.duration_s
    (probed from out/<name>.mp4). 2026-11-11: five packages' short.mp4 were 3-10 s off their reviewed cut (a stale
    short_nosong.mp4 or old local frames under the new song)."""
    want, got = (meta.get("video") or {}).get("duration_s"), duration(video)
    if want is None or got is None:
        return {"ok": True, "summary": "not measured"}
    ok = abs(got - float(want)) <= MATCH_S
    return {"ok": ok, "summary": f"short.mp4 {got:.2f} s vs the reviewed render {float(want):.2f} s" +
            ("" if ok else ": the package isn't the reviewed cut (a stale short_nosong.mp4 or old frames): publish it again from the current render")}


MATCH_S = 0.25


def block(name: str, video: pathlib.Path, waive: str = "", by: str = "", meta: dict | None = None) -> dict:
    pace = run_pace(name, video)
    ks = key_sounds_of(name, pace)
    pace.pop("keysound", None); pace.pop("notes", None)
    g = {"version": current(), "at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
         "by": by or "scripts/gates.py", "package": package_match(meta or {}, video), "pace": pace,
         "check": latest_check(name) or {"label": "no ./hb check report on this box"}, "key_sounds": ks}
    if waive:
        g["waived"] = waive
    return g


def sha256_of(p: pathlib.Path) -> str:
    import hashlib
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def download(url: str, dest: pathlib.Path, sha: str | None) -> None:
    import urllib.request
    req = urllib.request.Request(url, headers={"User-Agent": "hello-buh-gates"})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as out:
        shutil.copyfileobj(r, out, 1 << 20)
    if sha and sha256_of(dest) != sha:
        raise SystemExit(f"{dest.name}: sha256 mismatch with metadata")


def stamp(name: str, vd: pathlib.Path, video: str = "", waive: str = "", by: str = "") -> dict:
    d = vd / "shorts" / name
    mf = d / "metadata.json"
    meta = json.loads(mf.read_text())
    tmp = None
    try:
        rel_sha = ((meta.get("video") or {}).get("release") or {}).get("sha256")
        if video:
            v = pathlib.Path(video)
        elif (d / "short.mp4").exists() and (not rel_sha or sha256_of(d / "short.mp4") == rel_sha):
            v = d / "short.mp4"   # (publish.js, before the release upload; or the release's own file left on disk)
        else:   # since r:rc5eaf0 the mp4s are release assets: fetch short.mp4 (+ short_nosong.mp4 for the key sounds)
            tmp = pathlib.Path(tempfile.mkdtemp(prefix=f"gates-{name}-"))
            vid = meta.get("video") or {}
            for key, fn in (("release", "short.mp4"), ("nosong_release", "short_nosong.mp4")):
                rel = vid.get(key) or {}
                if rel.get("url"):
                    download(rel["url"], tmp / fn, rel.get("sha256"))
            v = tmp / "short.mp4"
            if not v.exists():
                raise SystemExit(f"{name}: no short.mp4 and no video.release in metadata.json")
        g = block(name, v, waive=waive, by=by, meta=meta)
    finally:
        if tmp:
            shutil.rmtree(tmp, ignore_errors=True)
    meta = json.loads(mf.read_text())   # (re-read: never overwrite a field written meanwhile)
    meta["gates"] = g
    mf.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n")
    return g


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["version", "fresh", "stamp", "stale"])
    ap.add_argument("names", nargs="*")
    ap.add_argument("--waive", default="")
    ap.add_argument("--video", default="")
    ap.add_argument("--by", default="")
    ap.add_argument("--videos", default=str(VIDEOS))
    a = ap.parse_args()
    vd = pathlib.Path(a.videos)
    if a.cmd == "version":
        print(current()); return 0
    if a.cmd == "fresh":
        why = fresh()
        if why:
            print(why, file=sys.stderr); return 1
        print("fresh: HEAD contains origin/main"); return 0
    if a.cmd == "stale":
        up = set()
        for f in (ROOT / "uploads").glob("**/uploads.json"):
            try:
                up |= set(json.loads(f.read_text()))
            except Exception:   # noqa: BLE001
                pass
        for m in sorted(vd.glob("shorts/*/metadata.json")):
            meta = json.loads(m.read_text())
            if meta.get("status") == "ready" and m.parent.name not in up:
                why = stale(meta)
                print(f"{m.parent.name}: {why or 'ok (v%s%s)' % ((meta.get('gates') or {}).get('version', '-'), ', ' + exempt(m.parent.name) if exempt(m.parent.name) else '')}")
        return 0
    rc = 0
    for n in a.names:
        g = stamp(n, vd, a.video if len(a.names) == 1 else "", a.waive, a.by)
        p = g["pace"]
        print(f"{n}: gates v{g['version']}: package {g['package']['summary']}; pace {'OK' if p.get('ok') else 'BLOCK: ' + p.get('summary', '')} "
              f"({p.get('warnings', 0)} warning(s)); check {g['check'].get('label') or '-'}; key sounds "
              f"{g['key_sounds'] if isinstance(g['key_sounds'], str) else ('OK' if g['key_sounds']['ok'] else 'BLOCK')}"
              f"{'; waived: ' + a.waive if a.waive else ''}")
        why = stale({"name": n, "gates": g})
        if why:
            print(f"  the uploader will skip {n}: {why}"); rc = 1
    return rc


if __name__ == "__main__":
    sys.exit(main())
