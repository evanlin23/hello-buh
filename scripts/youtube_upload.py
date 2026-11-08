"""Upload the next Short to @HelloBuh: private, with a scheduled publish at a varied time, at most YT_PER_DAY a day.

    python3 scripts/youtube_upload.py            # the daily run (cron-job.org / Actions)
    python3 scripts/youtube_upload.py --dry-run  # say what would go up, upload nothing
    python3 scripts/youtube_upload.py --report   # the weekly report only (views of everything uploaded)

Does NOTHING unless all of these exist (docs/upload-setup.md): the secrets YT_CLIENT_ID, YT_CLIENT_SECRET,
YT_REFRESH_TOKEN, the variable YT_CHANNEL_ID and the variable YT_ENABLED=true. And nothing while uploads/PAUSED
exists. Ported from evanlin23/buh-explains buhexplains/pipeline/upload.py, with what that channel learned:
- one a day at a random time (11:00-19:30 Central), not a fixed robotic slot; YT_PER_DAY=2 for two;
- never delete or re-upload a video that underperforms (YouTube treats it as spam);
- refuses if the token's channel isn't YT_CHANNEL_ID, if the Short isn't status "ready" on the videos branch,
  if its title is already on the channel (hand uploads too), or if it would break the posting mix
  (scripts/check_queue.py: no format twice in a row, at most 1 pixel-art per 3).

Order: uploads/queue.txt first; when that runs out, any other "ready" Short on the videos branch (oldest
published first) that keeps the mix. Every upload is recorded in uploads/uploads.json on main.
"""
from __future__ import annotations

import argparse, datetime as dt, json, os, random, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from check_queue import series, mix_ok   # noqa: E402

UP = ROOT / "uploads"
QUEUE, RECORD, PAUSED = UP / "queue.txt", UP / "uploads.json", UP / "PAUSED"
REPO = os.environ.get("GITHUB_REPOSITORY", "evanlin23/hello-buh")
PER_DAY = int(os.environ.get("YT_PER_DAY", "1") or 1)
WINDOW = ((11, 0), (19, 30))          # Central; with 2 a day: the first in 11:00-14:30, the second in 16:00-19:30
TZ = "America/Chicago"


def central_now() -> dt.datetime:
    from zoneinfo import ZoneInfo
    return dt.datetime.now(ZoneInfo(TZ))


def enabled() -> tuple[bool, str]:
    need = ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN", "YT_CHANNEL_ID")
    missing = [k for k in need if not os.environ.get(k, "").strip()]
    if os.environ.get("YT_ENABLED", "").strip().lower() != "true":
        missing.append("YT_ENABLED=true")
    return not missing, ", ".join(missing)


def record() -> dict:
    return json.loads(RECORD.read_text()) if RECORD.exists() else {}


def save_record(done: dict, msg: str) -> None:
    """Write uploads.json, commit and push (rebasing if main moved). An unsaved upload would be retried as a
    duplicate, so this retries hard and fails loudly."""
    RECORD.write_text(json.dumps(done, indent=1, ensure_ascii=False) + "\n")
    subprocess.run(["git", "add", str(RECORD)], check=True)
    subprocess.run(["git", "commit", "-m", msg], check=True)
    ref = os.environ.get("GITHUB_REF_NAME", "")
    if not ref:
        return
    for _ in range(6):
        if subprocess.run(["git", "push", "origin", f"HEAD:{ref}"]).returncode == 0:
            return
        subprocess.run(["git", "pull", "--rebase", "origin", ref], check=True)
    sys.exit("could not push uploads/uploads.json after 6 tries: record the upload by hand before the next run")


def videos_checkout(d: Path) -> Path:
    """The videos branch with only the metadata on disk (the mp4s are fetched for the one Short that goes up)."""
    url = f"https://github.com/{REPO}.git"
    subprocess.run(["git", "clone", "-q", "--filter=blob:none", "--no-checkout", "--depth", "1", "--branch", "videos", url, str(d)], check=True)
    subprocess.run(["git", "-C", str(d), "sparse-checkout", "set", "--no-cone", "shorts/*/metadata.json"], check=True)
    subprocess.run(["git", "-C", str(d), "checkout", "-q", "videos"], check=True)
    return d


def fetch_short(vd: Path, name: str) -> Path:
    subprocess.run(["git", "-C", str(vd), "sparse-checkout", "add", f"/shorts/{name}/short.mp4"], check=True)
    f = vd / "shorts" / name / "short.mp4"
    if not f.exists() or f.stat().st_size < 1_000_000:
        sys.exit(f"shorts/{name}/short.mp4 is missing on the videos branch")
    return f


def meta_of(vd: Path, name: str) -> dict | None:
    p = vd / "shorts" / name / "metadata.json"
    return json.loads(p.read_text()) if p.exists() else None


def pick(vd: Path, done: dict) -> tuple[str | None, str]:
    """The next Short: queue.txt order, then any other ready one, skipping anything uploaded or posted by hand,
    not ready, or that would break the mix after what went up last."""
    history = [k for k, _ in sorted(done.items(), key=lambda kv: kv[1].get("uploaded", ""))]
    queued = [l.split("#")[0].strip() for l in QUEUE.read_text().splitlines()] if QUEUE.exists() else []
    queued = [q for q in queued if q]
    rest = []
    for m in sorted((vd / "shorts").glob("*/metadata.json")):
        meta = json.loads(m.read_text())
        rest.append((meta.get("published_at", ""), m.parent.name))
    order = queued + [n for _, n in sorted(rest) if n not in queued]
    why = []
    for name in order:
        if name in done:
            continue
        meta = meta_of(vd, name)
        if not meta:
            why.append(f"{name}: not on the videos branch"); continue
        if meta.get("posted"):
            why.append(f"{name}: posted by hand (record it in uploads.json)"); continue
        if meta.get("status") != "ready":
            if name in queued:
                why.append(f"{name}: status {meta.get('status')!r}, not ready")
            continue
        if not mix_ok(history, name):
            why.append(f"{name}: same format as the last upload, or a 2nd pixel-art in 3"); continue
        return name, "\n".join(why)
    return None, "\n".join(why)


def publish_at(slot: int) -> str:
    now = central_now()
    (h0, m0), (h1, m1) = WINDOW
    lo, hi = h0 * 60 + m0, h1 * 60 + m1
    if PER_DAY >= 2:
        mid = (lo + hi) // 2
        lo, hi = (lo, mid - 60) if slot == 0 else (mid + 30, hi)
    mins = random.randint(lo, hi)
    at = now.replace(hour=mins // 60, minute=mins % 60, second=0, microsecond=0)
    if at < now + dt.timedelta(minutes=45):   # a late run: today's window has passed, so tomorrow's
        at = at + dt.timedelta(days=1)
    return at.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def youtube():
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from google.auth.transport.requests import Request
    from google.auth.exceptions import RefreshError
    creds = Credentials(None, refresh_token=os.environ["YT_REFRESH_TOKEN"], client_id=os.environ["YT_CLIENT_ID"],
                        client_secret=os.environ["YT_CLIENT_SECRET"], token_uri="https://oauth2.googleapis.com/token")
    try:
        creds.refresh(Request())
    except RefreshError as e:
        sys.exit(f"YT_REFRESH_TOKEN no longer works ({e}). If the Google Cloud OAuth consent screen is in 'Testing', "
                 "tokens die after 7 days: publish the app and mint a new token (docs/upload-setup.md step 2).")
    return build("youtube", "v3", credentials=creds, cache_discovery=False)


def channel_titles(yt) -> list[str]:
    pl = yt.channels().list(part="contentDetails", mine=True).execute()["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
    items = yt.playlistItems().list(part="snippet", playlistId=pl, maxResults=50).execute().get("items", [])
    return [i["snippet"]["title"].strip() for i in items]


def issue(title: str, body: str) -> None:
    if os.environ.get("GITHUB_ACTIONS"):
        subprocess.run(["gh", "issue", "create", "--repo", REPO, "--title", title, "--body", body])
    else:
        print(f"[issue] {title}\n{body}")


def open_issue(title: str) -> bool:
    if not os.environ.get("GITHUB_ACTIONS"):
        return False
    r = subprocess.run(["gh", "issue", "list", "--repo", REPO, "--state", "open", "--search", f'"{title}" in:title', "--json", "number"],
                       capture_output=True, text=True)
    return r.returncode == 0 and r.stdout.strip() not in ("", "[]")


def report(yt, done: dict, vd: Path | None) -> None:
    """Weekly: views/likes/comments of everything recorded, and how many Shorts are left to go up."""
    ids = {v["video_id"]: k for k, v in done.items() if v.get("video_id")}
    stats = {}
    keys = list(ids)
    for i in range(0, len(keys), 50):
        for it in yt.videos().list(part="statistics,status", id=",".join(keys[i:i + 50])).execute().get("items", []):
            stats[it["id"]] = it
    rows = []
    for vid, name in ids.items():
        s = stats.get(vid, {}).get("statistics", {}); st = stats.get(vid, {}).get("status", {})
        e = done[name]
        rows.append((e.get("uploaded", ""), f"| {e.get('uploaded', '')} | [{name}](https://youtube.com/shorts/{vid}) | {e.get('by', 'auto')} | "
                     f"{int(s.get('viewCount', 0)):,} | {int(s.get('likeCount', 0)):,} | {int(s.get('commentCount', 0)):,} | {st.get('privacyStatus', '?')} |"))
    rows.sort(reverse=True)
    left = []
    if vd:
        for m in sorted((vd / "shorts").glob("*/metadata.json")):
            meta = json.loads(m.read_text())
            if meta.get("status") == "ready" and m.parent.name not in done and not meta.get("posted"):
                left.append(m.parent.name)
    days = len(left) / max(1, PER_DAY)
    body = ("Views so far (newest first). Auto uploads vs hand uploads: compare the `by` column.\n\n"
            "| uploaded | Short | by | views | likes | comments | status |\n|---|---|---|---|---|---|---|\n"
            + "\n".join(r for _, r in rows)
            + f"\n\n**Ready and not uploaded yet: {len(left)}** (about {days:.0f} days at {PER_DAY} a day)"
            + (" - **running low: make more Shorts**" if days < 10 else "")
            + ("\n\n" + ", ".join(left) if left else "")
            + "\n\nTo pause: create `uploads/PAUSED` on main (any text). To stop: set the repo variable YT_ENABLED to anything but `true`.")
    t = f"HelloBuh weekly report {central_now().date().isoformat()}"
    if not open_issue(t):
        issue(t, body)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--report", action="store_true")
    ap.add_argument("--short", default="", help="upload this Short now (still checks ready, mix and the daily limit)")
    a = ap.parse_args()
    ok, missing = enabled()
    if not ok and not a.dry_run:
        print(f"uploads are off (missing: {missing}). Nothing done."); return
    done = record()
    with tempfile.TemporaryDirectory() as td:
        vd = videos_checkout(Path(td) / "videos")
        if a.report:
            if ok:
                report(youtube(), done, vd)
            return
        if PAUSED.exists():
            print(f"uploads are paused (uploads/PAUSED: {PAUSED.read_text().strip()}). Nothing done."); return
        today = central_now().date().isoformat()
        n_today = sum(1 for e in done.values() if e.get("uploaded") == today)
        if n_today >= PER_DAY and not a.dry_run:
            print(f"already uploaded {n_today} today ({today} Central; the limit is {PER_DAY}). Nothing done."); return
        if a.short:
            meta = meta_of(vd, a.short)
            history = [k for k, _ in sorted(done.items(), key=lambda kv: kv[1].get("uploaded", ""))]
            if a.short in done or not meta or meta.get("status") != "ready" or meta.get("posted") or not mix_ok(history, a.short):
                sys.exit(f"{a.short}: already uploaded, not ready, posted by hand, or breaks the mix")
            name, skipped = a.short, ""
        else:
            name, skipped = pick(vd, done)
        if skipped:
            print("skipped:\n" + skipped)
        if not name:
            msg = "Nothing left that is ready and keeps the posting mix. The channel goes quiet until more Shorts are published."
            print(msg)
            if not a.dry_run and not open_issue("HelloBuh: nothing left to upload"):
                issue("HelloBuh: nothing left to upload", msg + ("\n\nSkipped:\n" + skipped if skipped else ""))
            return
        meta = meta_of(vd, name)
        yt_meta = meta["youtube"]
        title, desc = yt_meta["title"].strip()[:100], yt_meta["description"]
        if "#shorts" not in (title + desc).lower():
            desc = desc.rstrip() + "\n\n#shorts"
        when = publish_at(n_today)
        print(f"next: {name}: {title!r}, publish at {when} UTC (series {series(name)})")
        if a.dry_run:
            return
        yt = youtube()
        me = [c["id"] for c in yt.channels().list(part="id", mine=True).execute().get("items", [])]
        if os.environ["YT_CHANNEL_ID"].strip() not in me:
            sys.exit(f"the token belongs to {me}, not YT_CHANNEL_ID: refusing to upload")
        if title in channel_titles(yt):
            sys.exit(f"a video titled {title!r} is already on the channel: give {name} a new title on the videos branch, "
                     "or record it in uploads/uploads.json if it was uploaded by hand")
        f = fetch_short(vd, name)
        body = {"snippet": {"title": title, "description": desc, "categoryId": "20",
                            "tags": [h.lstrip("#") for h in yt_meta.get("hashtags", [])]},
                "status": {"privacyStatus": "private", "publishAt": when, "selfDeclaredMadeForKids": False,
                           "containsSyntheticMedia": False}}
        from googleapiclient.http import MediaFileUpload
        req = yt.videos().insert(part="snippet,status", body=body,
                                 media_body=MediaFileUpload(str(f), mimetype="video/mp4", chunksize=16 << 20, resumable=True))
        resp = None
        while resp is None:
            st, resp = req.next_chunk()
            if st:
                print(f"uploaded {int(st.progress() * 100)}%", flush=True)
        vid = resp["id"]
    done[name] = {"video_id": vid, "uploaded": today, "publish_at": when, "title": title, "by": "auto"}
    save_record(done, f"uploads: {name} ({vid}), public at {when} UTC")
    print(f"uploaded {name}: https://youtube.com/shorts/{vid} (private until {when} UTC)")


if __name__ == "__main__":
    main()
