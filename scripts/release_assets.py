"""Finished Short mp4s live as GitHub Release assets, not in git (owner rule r:rc5eaf0): the videos branch keeps only
metadata, so the local .git stops growing by 30-80 MB per publish. One release per package, tag pkg-<name>; each asset
name carries the file's sha256, so versions never collide. metadata.json's `video.release` (short.mp4) and
`video.nosong_release` (short_nosong.mp4) hold {tag, asset, url, sha256, bytes}; scripts/youtube_upload.py downloads the
asset and checks its sha256 (a package without `video.release` still uploads its short.mp4 from the branch).

This box has no GitHub token, so the upload runs on Actions (.github/workflows/release-assets.yml): this script pushes
one throwaway commit (origin/main + release-upload/job.json + the mp4s) to upload/<...> from a temporary object store
(the shared .git never holds the mp4 blobs), the workflow uploads the assets and deletes the branch, and this script
waits until each asset answers on its download URL before writing metadata.

  python3 scripts/release_assets.py upload <name>...          # upload shorts/<name>/*.mp4, write metadata, untrack the mp4s
  python3 scripts/release_assets.py upload <name>... --from-videos <commit>   # (migration) the runner takes the mp4s from
                                                               # that videos commit: nothing big is pushed from here
  python3 scripts/release_assets.py commit <name>... -m MSG    # commit ONLY those packages (+ README.md, .gitignore) on
                                                               # the videos branch and push it (other sessions' staged
                                                               # files stay staged, never swept in)
  (videos worktree at ../hb-videos, or --videos DIR)
"""
import argparse
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
REPO = os.environ.get("GITHUB_REPOSITORY", "evanlin23/hello-buh")
FILES = {"short.mp4": ("release", "short"), "short_nosong.mp4": ("nosong_release", "short_nosong")}
IGNORE = "# finished videos live in GitHub Releases (metadata.json video.release), never in git: r:rc5eaf0\n*.mp4\n"


def git(*a, cwd=ROOT, env=None, inp=None):
    return subprocess.run(["git", *a], cwd=cwd, env=env, input=inp, capture_output=True, text=True, check=True).stdout.strip()


def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def tag_of(name):
    return f"pkg-{name}"


def asset_of(name, stem, sha):
    return f"{name}.{stem}.{sha[:16]}.mp4"


def url_of(tag, asset):
    return f"https://github.com/{REPO}/releases/download/{tag}/{asset}"


def wanted(vd, names):
    """[(name, file, entry)] for every package mp4 whose metadata doesn't already point at a release asset of it."""
    out = []
    for n in names:
        d = vd / "shorts" / n
        meta = json.loads((d / "metadata.json").read_text())
        for f, (key, stem) in FILES.items():
            p = d / f
            if not p.exists():
                continue
            s = sha256(p)
            have = (meta.get("video") or {}).get(key) or {}
            if have.get("sha256") == s:
                continue
            a = asset_of(n, stem, s)
            out.append((n, f, {"tag": tag_of(n), "asset": a, "url": url_of(tag_of(n), a), "sha256": s, "bytes": p.stat().st_size}))
    return out


def live(url):
    r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-I", url], capture_output=True, text=True)
    return r.stdout.strip() in ("200", "302")


def push_job(vd, todo, from_videos=None):
    """One commit on top of origin/main: release-upload/job.json (+ the mp4s, unless the runner takes them from a videos
    commit), written to a temporary object store that borrows the shared .git's objects (alternates), pushed to a
    throwaway branch. The shared .git never gets the mp4 blobs."""
    git("fetch", "-q", "origin", "main")
    main = git("rev-parse", "origin/main")
    objects = git("rev-parse", "--git-common-dir")
    objects = str((ROOT / objects).resolve() / "objects") if not os.path.isabs(objects) else os.path.join(objects, "objects")
    job = {"repo": REPO, "packages": {}}
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="release-", dir=os.environ.get("TMPDIR")))
    try:
        git("init", "-q", "--bare", str(tmp))
        (tmp / "objects" / "info" / "alternates").write_text(objects + "\n")
        env = {**os.environ, "GIT_DIR": str(tmp)}
        entries = []
        for n, f, e in todo:
            item = {"asset": e["asset"], "sha256": e["sha256"]}
            if from_videos:
                item["videos"] = {"commit": from_videos, "path": f"shorts/{n}/{f}"}
            else:
                blob = git("hash-object", "-w", str(vd / "shorts" / n / f), env=env)
                entries.append(f"100644 blob {blob}\t{e['asset']}")
                item["path"] = f"release-upload/{e['asset']}"
            job["packages"].setdefault(n, {"tag": e["tag"], "assets": []})["assets"].append(item)
        jb = git("hash-object", "-w", "--stdin", env=env, inp=json.dumps(job, indent=2) + "\n")
        entries.append(f"100644 blob {jb}\tjob.json")
        sub = git("mktree", env=env, inp="\n".join(entries) + "\n")
        top = git("ls-tree", f"{main}^{{tree}}", env=env).splitlines()
        top = [l for l in top if not l.endswith("\trelease-upload")] + [f"040000 tree {sub}\trelease-upload"]
        root = git("mktree", env=env, inp="\n".join(top) + "\n")
        first = todo[0][0]
        commit = git("commit-tree", root, "-p", main, "-m", f"release assets: {', '.join(sorted(job['packages']))}", env=env)
        url = git("remote", "get-url", "origin")
        branch = f"upload/{first}-{commit[:8]}"
        r = subprocess.run(["git", "push", "-q", url, f"{commit}:refs/heads/{branch}"], env=env, capture_output=True, text=True)
        if r.returncode:   # a session that may only push its own prefix (claude/...)
            cur = git("rev-parse", "--abbrev-ref", "HEAD")
            prefix = cur.split("/")[0] if "/" in cur else ""
            if not prefix:
                sys.exit(f"pushing {branch} failed: {r.stderr.strip()[:300]}")
            branch = f"{prefix}/upload-{first}-{commit[:8]}"
            subprocess.run(["git", "push", "-q", url, f"{commit}:refs/heads/{branch}"], env=env, check=True)
        print(f"queued {len(todo)} asset(s) on {branch} (.github/workflows/release-assets.yml)", flush=True)
        return branch
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def wait(todo, minutes):
    left = {e["url"] for _, _, e in todo}
    t0 = time.time()
    while left and time.time() - t0 < minutes * 60:
        left = {u for u in left if not live(u)}
        if left:
            time.sleep(10)
    return left


def upload(vd, names, from_videos=None, minutes=20):
    todo = wanted(vd, names)
    if todo:
        push_job(vd, todo, from_videos)
        missing = wait(todo, minutes)
        if missing:
            sys.exit("these release assets never appeared (see the release-assets run on Actions; the metadata was not "
                     "changed):\n  " + "\n  ".join(sorted(missing)))
    for n in names:
        d = vd / "shorts" / n
        meta = json.loads((d / "metadata.json").read_text())
        for nn, f, e in todo:
            if nn == n:
                meta.setdefault("video", {})[FILES[f][0]] = e
                if f == "short.mp4":   # the file that goes up (add_song.py's mix, not out/<name>.mp4)
                    meta["video"]["sha256"], meta["video"]["bytes"] = e["sha256"], e["bytes"]
        (d / "metadata.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n")
        for f, (key, _) in FILES.items():   # in a release now: out of git (the file stays on disk for local tools)
            if (meta.get("video") or {}).get(key) and (vd / ".git").exists():
                git("rm", "-q", "--cached", "--ignore-unmatch", f"shorts/{n}/{f}", cwd=vd)
        print(f"{n}: " + ", ".join(f"{k} -> {meta['video'][k]['url']}" for k in ("release", "nosong_release") if meta["video"].get(k)))
    gi = vd / ".gitignore"
    if not gi.exists() or "*.mp4" not in gi.read_text().split():
        gi.write_text((gi.read_text() if gi.exists() else "") + IGNORE)


def paths_of(names):
    return [f"shorts/{n}" for n in names] + ["README.md", ".gitignore"]


def commit(vd, names, msg, push=True):
    """Commit only these packages, through a private index: whatever another session has staged in the shared
    hb-videos index is neither committed nor unstaged."""
    for n in names:   # never commit a package whose video is neither in git nor in a release
        d = vd / "shorts" / n
        if (d / "short.mp4").exists() and not (json.loads((d / "metadata.json").read_text()).get("video") or {}).get("release"):
            sys.exit(f"{n}: short.mp4 has no release asset yet: python3 scripts/release_assets.py upload {n} first")
    idx = pathlib.Path(tempfile.mkstemp(prefix="videos-index-")[1])
    env = {**os.environ, "GIT_INDEX_FILE": str(idx)}
    paths = [p for p in paths_of(names) if (vd / p).exists() or git("ls-files", p, cwd=vd)]
    try:
        git("read-tree", "HEAD", cwd=vd, env=env)
        git("rm", "-r", "-q", "--cached", "--ignore-unmatch", *paths, cwd=vd, env=env)
        git("add", "--", *[p for p in paths if (vd / p).exists()], cwd=vd, env=env)   # .gitignore keeps the mp4s out
        if not git("diff", "--cached", "--name-only", "HEAD", cwd=vd, env=env):
            print("nothing new to commit"); return False
        git("commit", "-q", "-m", msg, cwd=vd, env=env)
    finally:
        idx.unlink(missing_ok=True)
    git("reset", "-q", "HEAD", "--", *paths, cwd=vd)   # the shared index now matches the commit for these paths
    if push:
        for i in range(4):
            if subprocess.run(["git", "push", "-q", "origin", "videos"], cwd=vd).returncode == 0:
                break
            if i == 3:
                sys.exit("could not push the videos branch: git -C ../hb-videos pull --rebase --autostash origin videos, then push")
            r = subprocess.run(["git", "pull", "-q", "--rebase", "--autostash", "origin", "videos"], cwd=vd)
            if r.returncode:   # README.md conflict: take theirs, the next publish regenerates it
                subprocess.run(["git", "checkout", "--theirs", "README.md"], cwd=vd)
                subprocess.run(["git", "add", "README.md"], cwd=vd)
                subprocess.run(["git", "-c", "core.editor=true", "rebase", "--continue"], cwd=vd)
        print("pushed videos branch:", git("log", "--oneline", "-1", cwd=vd))
    return True


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["upload", "commit"])
    ap.add_argument("names", nargs="+")
    ap.add_argument("--videos", default=str(ROOT.parent / "hb-videos"))
    ap.add_argument("--from-videos", help="(migration) a pushed videos commit the runner takes the mp4s from")
    ap.add_argument("--wait", type=float, default=20, help="minutes to wait for the assets")
    ap.add_argument("-m", "--message", default="")
    ap.add_argument("--no-push", action="store_true")
    a = ap.parse_args()
    vd = pathlib.Path(a.videos)
    if a.cmd == "upload":
        upload(vd, a.names, a.from_videos, a.wait)
    else:
        commit(vd, a.names, a.message or f"Package {', '.join(a.names)}", not a.no_push)
