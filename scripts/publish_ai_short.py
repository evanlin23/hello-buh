"""Put a finished AI-dilemma Short on the upload line (docs/ai_dilemma.md): writes shorts/<name>/{short.mp4,
metadata.json, recording.json.gz} on the videos branch (status "ready": only after its reviews passed) and, with
--first, moves it to the front of uploads/queue.txt on main, so the next daily upload run takes it first.

    python3 scripts/publish_ai_short.py episodes/thin_ice out/ai_thin_ice.mp4 --title "Which AI Goes In? 🧊💔" --first
The video must be under GitHub's 100 MB per file. Pushes both branches (git push), so run it only when the owner said so.
"""
import argparse
import datetime as dt
import gzip
import hashlib
import json
import pathlib
import shutil
import subprocess
import tempfile

HERE = pathlib.Path(__file__).resolve().parent.parent


def sh(*a, cwd=None):
    return subprocess.run(a, cwd=cwd, check=True, capture_output=True, text=True).stdout.strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode"); ap.add_argument("video")
    ap.add_argument("--title", required=True)
    ap.add_argument("--first", action="store_true")
    ap.add_argument("--notes", default="")
    o = ap.parse_args()
    import gates   # never from a stale checkout; the package records the gates it ran (scripts/gates.py)
    gates.fresh_or_exit("publish_ai_short.py")
    ep = pathlib.Path(o.episode); cfg = json.loads((ep / "episode.json").read_text())
    name = cfg["stunt"]
    vid = pathlib.Path(o.video)
    size = vid.stat().st_size
    if size >= 100 * 1024 * 1024:
        raise SystemExit(f"{vid} is {size / 1e6:.0f} MB: GitHub refuses files over 100 MB")
    probe = json.loads(sh("ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,r_frame_rate,codec_name", "-select_streams", "v:0", "-of", "json", str(vid)))
    st = probe["streams"][0]
    url = sh("git", "remote", "get-url", "origin", cwd=HERE)
    tags = ["#minecraft", "#shorts", "#ai", "#grok", "#chatgpt"]
    desc = (f"{cfg.get('logline', '')}\n\n"
            "A parody: what the AIs say here is written for the story, not real chatbot answers.\n"
            "Music: original score, made for this Short (VS Chamber Orchestra 2 Community Edition samples, CC0).\n\n" + " ".join(tags))
    meta = {
        "name": name, "caption": o.title,
        "youtube": {"title": f"{o.title} #minecraft #shorts", "description": desc, "hashtags": tags, "made_for_kids": False},
        "song": {"title": f"{name} score", "artist": "HelloBuh", "licence": "original: composed for this Short (scripts/orchestra.py, VSCO-2 CE samples, CC0)"},
        "video": {"file": "short.mp4", "duration_s": round(float(probe["format"]["duration"]), 2), "width": st["width"], "height": st["height"],
                  "fps": st["r_frame_rate"], "codec": st["codec_name"], "bytes": size, "sha256": hashlib.sha256(vid.read_bytes()).hexdigest()},
        "recording": {"file": "recording.json.gz", "minecraft": "1.21.11", "stunt": f"stunts/{name}.js", "episode": str(ep)},
        "code": {"repo": "evanlin23/hello-buh", "branch": sh("git", "rev-parse", "--abbrev-ref", "HEAD", cwd=HERE), "commit": sh("git", "rev-parse", "HEAD", cwd=HERE)},
        "rebuild": [f"./scripts/queue_render.sh {ep.name} && git push   (renders on Actions: .github/workflows/render-movie.yml)"],
        "status": "ready",
        "notes": o.notes,
        "published_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
    }
    with tempfile.TemporaryDirectory() as t:
        vd = pathlib.Path(t) / "videos"
        sh("git", "clone", "-q", "--filter=blob:none", "--no-checkout", "--depth", "1", "--branch", "videos", url, str(vd))
        sh("git", "sparse-checkout", "set", "--no-cone", f"/shorts/{name}/*", "/.gitignore", cwd=vd)
        sh("git", "checkout", "-q", "videos", cwd=vd)
        d = vd / "shorts" / name; d.mkdir(parents=True, exist_ok=True)
        shutil.copy(vid, d / "short.mp4")
        (d / "metadata.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n")
        g = gates.stamp(name, vd, str(d / "short.mp4"), by="publish_ai_short.py")
        print(f"gates v{g['version']}: pace {g['pace'].get('summary')}" + (f" (the uploader will skip it: {gates.stale(meta | {'gates': g})})" if gates.stale(meta | {"gates": g}) else ""))
        (d / "recording.json.gz").write_bytes(gzip.compress((HERE / "work" / f"{name}.rec.json").read_bytes(), 9))
        import release_assets   # the mp4 goes to a GitHub Release, metadata gets video.release (r:rc5eaf0)
        release_assets.upload(vd, [name])
        sh("git", "add", "-A", f"shorts/{name}", ".gitignore", cwd=vd)
        sh("git", "commit", "-q", "-m", f"{name}: ready ({o.title})", cwd=vd)
        sh("git", "push", "-q", "origin", "videos", cwd=vd)
        print(f"videos branch: shorts/{name} ready ({size / 1e6:.0f} MB)")
        if o.first:
            md = pathlib.Path(t) / "main"
            sh("git", "clone", "-q", "--depth", "1", "--branch", "main", url, str(md))
            q = md / "uploads" / "queue.txt"
            lines = q.read_text().splitlines()
            head = [l for l in lines if l.startswith("#")]
            body = [l for l in lines if not l.startswith("#") and l.split("#")[0].strip() != name]
            q.write_text("\n".join(head + [f"{name}   # first: owner, {dt.date.today().isoformat()}"] + body) + "\n")
            sh("git", "add", "uploads/queue.txt", cwd=md)
            sh("git", "commit", "-q", "-m", f"uploads: {name} first in the queue (owner)", cwd=md)
            sh("git", "push", "-q", "origin", "main", cwd=md)
            print("main: first in uploads/queue.txt")


if __name__ == "__main__":
    main()
