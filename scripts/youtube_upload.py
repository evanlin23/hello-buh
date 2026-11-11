"""Upload the day's Shorts to @HelloBuh: private, each with a scheduled publish at a varied time, YT_PER_DAY a day
(default 3, owner 2026-11-08: "hello buh should be uploading 3x a day"). One morning run uploads them all.

    python3 scripts/youtube_upload.py            # the daily run (cron-job.org / Actions)
    python3 scripts/youtube_upload.py --dry-run  # say what would go up, upload nothing
    python3 scripts/youtube_upload.py --report   # the weekly report only (views, engagement, retention, watch time, subscribers)

Does NOTHING unless all of these exist (docs/upload-setup.md): the secrets YT_CLIENT_ID, YT_CLIENT_SECRET,
YT_REFRESH_TOKEN, the variable YT_CHANNEL_ID and the variable YT_ENABLED=true. And nothing while uploads/PAUSED
exists. Ported from evanlin23/buh-explains buhexplains/pipeline/upload.py, with what that channel learned:
- each at a random time in its own slice of 9:00-21:00 Central (3 a day: 9-13, 13-17, 17-21), never a fixed
  robotic slot; YT_PER_DAY changes the count;
- never delete or re-upload a video that underperforms (YouTube treats it as spam);
- refuses if the token's channel isn't YT_CHANNEL_ID, if the Short isn't status "ready" on the videos branch,
  if its title is already on the channel (hand uploads too), or if it would break the posting mix
  (scripts/check_queue.py: no format twice in a row, at most 1 pixel-art per 3).

Order (owner 2026-11-09: "post the content that gets the most subscribers"; the goal is 100k): queue lines marked
"# first" go first; then every other ready Short (queue.txt and the rest of the videos branch) ranked by its format's
SUBSCRIBERS PER 1,000 VIEWS (family_scores: YouTube Analytics, lifetime, shrunk toward the channel average so a format
with little data isn't over- or under-rated; a format not posted yet gets the average, so new formats still get tried),
queue order breaking ties, always keeping the mix. The scores are saved to uploads/scores.json each run.
    python3 scripts/youtube_upload.py --scores   # print the ranking only
Every upload is recorded in uploads/uploads.json on main.

Channels (owner 2026-11-10: the story Shorts go to a second channel, "Buh Stories"): YT_CHANNEL picks the channel a run
uploads to, `hellobuh` (the default: everything exactly as above) or `buhstories`. A Short goes only to the channel in
its metadata.json `channel` (default hellobuh; publish.js sets buhstories for story_* Shorts). Each channel has its own
token, channel id, switch and records, as the same names with a suffix: YT_REFRESH_TOKEN_BUHSTORIES,
YT_CHANNEL_ID_BUHSTORIES, YT_ENABLED_BUHSTORIES, YT_PER_DAY_BUHSTORIES, and uploads/buhstories/ (queue.txt,
uploads.json, PAUSED, scores.json). The OAuth client (YT_CLIENT_ID / YT_CLIENT_SECRET) is shared unless a suffixed one
exists. docs/upload-setup.md "A second channel".
"""
from __future__ import annotations

import argparse, datetime as dt, json, os, random, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from check_queue import series, mix_ok   # noqa: E402

CHANNELS = {"hellobuh": "HelloBuh", "buhstories": "Buh Stories"}   # the id a Short's metadata names -> its display name
CHANNEL = (os.environ.get("YT_CHANNEL", "") or "hellobuh").strip().lower()
if CHANNEL not in CHANNELS:
    sys.exit(f"YT_CHANNEL={CHANNEL!r}: not one of {sorted(CHANNELS)}")
NAME = CHANNELS[CHANNEL]
SUFFIX = "" if CHANNEL == "hellobuh" else "_" + CHANNEL.upper()


def env(key: str, default: str = "") -> str:
    """This channel's setting: KEY_<CHANNEL> for a second channel (the OAuth client falls back to the shared one)."""
    v = os.environ.get(key + SUFFIX, "")
    if not v.strip() and key in ("YT_CLIENT_ID", "YT_CLIENT_SECRET"):
        v = os.environ.get(key, "")
    return v if v.strip() else default


def channel_of(meta: dict) -> str:
    return (meta.get("channel") or "hellobuh").strip().lower()


UP = ROOT / "uploads" if CHANNEL == "hellobuh" else ROOT / "uploads" / CHANNEL
QUEUE, RECORD, PAUSED, SCORES = UP / "queue.txt", UP / "uploads.json", UP / "PAUSED", UP / "scores.json"
REPO = os.environ.get("GITHUB_REPOSITORY", "evanlin23/hello-buh")
PER_DAY = int(env("YT_PER_DAY", "3") or 3)
WINDOW = ((9, 0), (21, 0))            # Central; split into PER_DAY equal slices, one publish in each
TZ = "America/Chicago"


def central_now() -> dt.datetime:
    from zoneinfo import ZoneInfo
    return dt.datetime.now(ZoneInfo(TZ))


def enabled() -> tuple[bool, str]:
    need = ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN", "YT_CHANNEL_ID")
    missing = [k + ("" if k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET") else SUFFIX) for k in need if not env(k).strip()]
    if env("YT_ENABLED").strip().lower() != "true":
        missing.append(f"YT_ENABLED{SUFFIX}=true")
    return not missing, ", ".join(missing)


def record() -> dict:
    return json.loads(RECORD.read_text()) if RECORD.exists() else {}


def save_record(done: dict, msg: str) -> None:
    """Write uploads.json, commit and push (rebasing if main moved). An unsaved upload would be retried as a
    duplicate, so this retries hard and fails loudly."""
    UP.mkdir(parents=True, exist_ok=True)
    RECORD.write_text(json.dumps(done, indent=1, ensure_ascii=False) + "\n")
    subprocess.run(["git", "add", str(RECORD)] + ([str(SCORES)] if SCORES.exists() else []), check=True)
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


def pick(vd: Path, done: dict, scores: dict | None = None) -> tuple[str | None, str]:
    """The next Short: queue lines marked "# first", then the rest ranked by their format's subscribers per 1,000
    views (scores["family"], higher first; queue order, then the oldest published, breaking ties), skipping anything
    uploaded or posted by hand, not ready, or that would break the mix after what went up last."""
    history = [k for k, _ in sorted(done.items(), key=lambda kv: kv[1].get("uploaded", ""))]
    lines = QUEUE.read_text().splitlines() if QUEUE.exists() else []
    pinned = [l.split("#")[0].strip() for l in lines if "# first" in l]
    queued = [l.split("#")[0].strip() for l in lines]
    queued = [q for q in queued if q]
    rest = []
    for m in sorted((vd / "shorts").glob("*/metadata.json")):
        meta = json.loads(m.read_text())
        if channel_of(meta) == CHANNEL:
            rest.append((meta.get("published_at", ""), m.parent.name))
    order = queued + [n for _, n in sorted(rest) if n not in queued]
    fam = (scores or {}).get("family", {})
    mean = (scores or {}).get("mean", 0)
    pos = {n: i for i, n in enumerate(order)}
    order = [n for n in pinned if n] + sorted((n for n in order if n not in pinned),
                                             key=lambda n: (-fam.get(series(n), mean), pos[n]))
    why = []
    for name in order:
        if name in done:
            continue
        meta = meta_of(vd, name)
        if not meta:
            why.append(f"{name}: not on the videos branch"); continue
        if channel_of(meta) != CHANNEL:
            why.append(f"{name}: belongs to the {channel_of(meta)} channel, not {CHANNEL}"); continue
        if meta.get("posted"):
            why.append(f"{name}: posted by hand (record it in uploads.json)"); continue
        if meta.get("status") != "ready":
            if name in queued:
                why.append(f"{name}: status {meta.get('status')!r}, not ready")
            continue
        lic = (meta.get("song") or {}).get("licence", "")
        if meta.get("song") and not lic.startswith(("NCS", "original")):
            why.append(f"{name}: its song isn't cleared ({lic or 'no licence'})"); continue
        if not mix_ok(history, name):
            why.append(f"{name}: same format as the last upload, or a 2nd pixel-art in 3"); continue
        return name, "\n".join(why)
    return None, "\n".join(why)


def publish_at(slot: int) -> str:
    """A random minute in slice `slot` of the day's window (kept 45 min from the slice edges, so two publishes are
    at least 90 min apart). If that slice has already passed today, the same slice tomorrow."""
    now = central_now()
    (h0, m0), (h1, m1) = WINDOW
    lo, hi = h0 * 60 + m0, h1 * 60 + m1
    n = max(1, PER_DAY)
    w = (hi - lo) / n
    a, b = int(lo + slot % n * w) + 45, int(lo + (slot % n + 1) * w) - 45
    mins = random.randint(a, max(a, b))
    at = now.replace(hour=mins // 60, minute=mins % 60, second=0, microsecond=0)
    if at < now + dt.timedelta(minutes=45):
        at = at + dt.timedelta(days=1)
    return at.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def credentials():
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from google.auth.exceptions import RefreshError
    creds = Credentials(None, refresh_token=env("YT_REFRESH_TOKEN"), client_id=env("YT_CLIENT_ID"),
                        client_secret=env("YT_CLIENT_SECRET"), token_uri="https://oauth2.googleapis.com/token")
    try:
        creds.refresh(Request())
    except RefreshError as e:
        sys.exit(f"YT_REFRESH_TOKEN no longer works ({e}). If the Google Cloud OAuth consent screen is in 'Testing', "
                 "tokens die after 7 days: publish the app and mint a new token (docs/upload-setup.md step 2).")
    return creds


def youtube():
    from googleapiclient.discovery import build
    return build("youtube", "v3", credentials=credentials(), cache_discovery=False)


def analytics():
    """The YouTube Analytics API (retention, watch time, shares, engaged views, subscribers). The youtube.readonly scope
    the token already has covers these reports; without it the report says so and shows the Data API numbers only."""
    from googleapiclient.discovery import build
    return build("youtubeAnalytics", "v2", credentials=credentials(), cache_discovery=False)


def channel_titles(yt) -> list[str]:
    pl = yt.channels().list(part="contentDetails", mine=True).execute(num_retries=3)["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
    items = yt.playlistItems().list(part="snippet", playlistId=pl, maxResults=50).execute(num_retries=3).get("items", [])
    return [i["snippet"]["title"].strip() for i in items]


def issue(title: str, body: str) -> None:
    if os.environ.get("GITHUB_ACTIONS"):
        subprocess.run(["gh", "issue", "create", "--repo", REPO, "--title", title, "--body", body])
    else:
        print(f"[issue] {title}\n{body}")


def suppressed(yt, done: dict) -> str:
    """The BuhExplains lesson: a channel YouTube stops showing gets ~0 views on every new Short. If the last 3+ auto
    uploads that have been public for 24-96 h ALL have under 50 views, stop and tell the owner instead of feeding
    more videos into a held-back channel. Returns the reason, or "" when all is well."""
    now = dt.datetime.now(dt.timezone.utc)
    recent = []
    for name, e in done.items():
        if e.get("by") != "auto" or not e.get("video_id") or not e.get("publish_at"):
            continue
        age = now - dt.datetime.strptime(e["publish_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)
        if dt.timedelta(hours=24) <= age <= dt.timedelta(hours=96):
            recent.append((name, e["video_id"]))
    if len(recent) < 3:
        return ""
    items = yt.videos().list(part="statistics", id=",".join(v for _, v in recent[:50])).execute().get("items", [])
    views = {it["id"]: int(it.get("statistics", {}).get("viewCount", 0)) for it in items}
    if all(views.get(v, 0) < 50 for _, v in recent):
        return ", ".join(f"{n} {views.get(v, 0)} views" for n, v in recent)
    return ""


def pause(reason: str) -> None:
    UP.mkdir(parents=True, exist_ok=True)
    PAUSED.write_text(reason + "\n")
    subprocess.run(["git", "add", str(PAUSED)], check=True)
    subprocess.run(["git", "commit", "-m", "uploads: paused automatically (possible reach suppression)"], check=True)
    ref = os.environ.get("GITHUB_REF_NAME", "")
    if ref:
        for _ in range(6):
            if subprocess.run(["git", "push", "origin", f"HEAD:{ref}"]).returncode == 0:
                break
            subprocess.run(["git", "pull", "--rebase", "origin", ref], check=True)


def open_issue(title: str) -> bool:
    if not os.environ.get("GITHUB_ACTIONS"):
        return False
    r = subprocess.run(["gh", "issue", "list", "--repo", REPO, "--state", "open", "--search", f'"{title}" in:title', "--json", "number"],
                       capture_output=True, text=True)
    return r.returncode == 0 and r.stdout.strip() not in ("", "[]")


def _pct(x):
    return "-" if x is None else f"{100 * x:.0f}%"


def video_analytics(ya, ids: list, start: str, end: str) -> tuple[dict, str]:
    """Per video, lifetime to date: views, engaged views (the API's nearest thing to Studio's "stayed to watch":
    views that carried on past the first seconds), watch time, average view duration and %, likes, comments, shares,
    subscribers gained. One query per video (filters=video==ID): a dimensions=video query over a list of ids came back
    with no rows (2026-11-09). Returns ({video_id: {...}}, note)."""
    base = ["views", "engagedViews", "estimatedMinutesWatched", "averageViewDuration", "averageViewPercentage",
            "likes", "comments", "shares", "subscribersGained"]
    out, note, metrics = {}, "", base
    for vid in ids:
        for attempt in range(2):
            try:
                r = ya.reports().query(ids="channel==MINE", startDate=start, endDate=end, metrics=",".join(metrics),
                                       filters=f"video=={vid}").execute(num_retries=3)
                cols = [h["name"] for h in r.get("columnHeaders", [])]
                rows = r.get("rows", []) or []
                if rows:
                    out[vid] = dict(zip(cols, rows[0]))
                break
            except Exception as e:
                if "engagedViews" in metrics:   # (not offered for this channel: carry on without it)
                    metrics = [m for m in metrics if m != "engagedViews"]
                    note = "Engaged views aren't offered by the API for this channel, so the stayed-to-watch proxy is blank."
                    continue
                note = f"YouTube Analytics per-video query failed ({str(e)[:160]})."
                break
    if len(out) < len(ids):
        # the documented "top videos" report (dimensions=video, sort=-views, maxResults): a second route in case the
        # per-video filter returns nothing (0 of 9 on 2026-11-09 while the channel totals had views)
        try:
            r = ya.reports().query(ids="channel==MINE", startDate=start, endDate=end, metrics=",".join(metrics),
                                   dimensions="video", sort="-views", maxResults=200).execute(num_retries=3)
            cols = [h["name"] for h in r.get("columnHeaders", [])]
            for row in r.get("rows", []) or []:
                d = dict(zip(cols, row))
                if d.get("video") in ids and d["video"] not in out:
                    out[d.pop("video")] = d
        except Exception as e:
            note = note or f"top-videos query failed ({str(e)[:160]})."
            print(note, flush=True)
    print(f"analytics: {len(out)} of {len(ids)} videos have data ({start} to {end})", flush=True)
    return out, note


PRIOR_VIEWS = 3000   # how many views of evidence a format needs before its own rate outweighs the channel average


def family_scores(ya, done: dict) -> dict:
    """Subscribers gained per 1,000 views for each format family (check_queue.series), lifetime to date, from YouTube
    Analytics. Shrunk toward the channel's average: (subs + mean * PRIOR_VIEWS) / (views + PRIOR_VIEWS), so one lucky
    Short with 300 views doesn't top the ranking. Writes uploads/scores.json and returns it."""
    ids = {v["video_id"]: k for k, v in done.items() if v.get("video_id")}
    end = central_now().date().isoformat()
    start = min([v.get("uploaded", end) for v in done.values()] + [end])
    an, note = video_analytics(ya, list(ids), start, end)
    studio = json.loads((UP / "studio.json").read_text()) if (UP / "studio.json").exists() else {}
    per, fam = {}, {}
    for vid, name in ids.items():
        A = an.get(vid, {})
        v, sg = int(A.get("views", 0) or 0), int(A.get("subscribersGained", 0) or 0)
        S = studio.get(name) or {}
        if S.get("subs", 0) > sg:   # Studio's newer count (uploads/studio.json) beats the lagging API
            v, sg = max(v, int(S.get("views", 0))), int(S["subs"])
        per[name] = {"family": series(name), "views": v, "subs": sg, "avg_pct": A.get("averageViewPercentage"),
                     "stayed": (A["engagedViews"] / v) if A.get("engagedViews") is not None and v else None}
        f = fam.setdefault(series(name), {"views": 0, "subs": 0, "shorts": 0})
        f["views"] += v; f["subs"] += sg; f["shorts"] += 1
    tv, ts = sum(f["views"] for f in fam.values()), sum(f["subs"] for f in fam.values())
    mean = 1000 * ts / tv if tv else 0.0
    rate = {k: round(1000 * (f["subs"] + mean / 1000 * PRIOR_VIEWS) / (f["views"] + PRIOR_VIEWS), 3) for k, f in fam.items()}
    out = {"updated": end, "mean": round(mean, 3), "family": rate, "family_totals": fam, "videos": per,
           "note": note or "subscribers per 1,000 views; YouTube Analytics lags 1-3 days"}
    SCORES.write_text(json.dumps(out, indent=1) + "\n")
    print(f"scores (subs per 1k views, channel {mean:.2f}): " +
          ", ".join(f"{k} {r:.2f} ({fam[k]['subs']} subs / {fam[k]['views']:,} views)" for k, r in sorted(rate.items(), key=lambda kv: -kv[1])), flush=True)
    return out


def retention(ya, vid: str, start: str, end: str) -> dict:
    """The audience retention curve: the share of the audience still watching at 3 points, and how it compares with
    similar-length YouTube videos at the halfway mark (relativeRetentionPerformance, 0.5 = typical)."""
    try:
        r = ya.reports().query(ids="channel==MINE", startDate=start, endDate=end, metrics="audienceWatchRatio,relativeRetentionPerformance",
                               dimensions="elapsedVideoTimeRatio", filters=f"video=={vid}").execute(num_retries=3)
    except Exception:
        return {}
    rows = r.get("rows", []) or []
    if not rows:
        return {}
    def at(x):
        return min(rows, key=lambda row: abs(row[0] - x))
    return {"r10": at(0.1)[1], "r50": at(0.5)[1], "r100": at(1.0)[1], "rel50": at(0.5)[2]}


def channel_summary(ya, start: str, end: str) -> str:
    """The channel over the last 7 days, and where its views came from over the last 28 (the Shorts feed share)."""
    lines = []
    try:
        # how far YouTube Analytics has processed (it lags the public view counts by 1-3 days)
        s14 = (dt.date.fromisoformat(end) - dt.timedelta(days=14)).isoformat()
        r = ya.reports().query(ids="channel==MINE", startDate=s14, endDate=end, metrics="views", dimensions="day", sort="day").execute(num_retries=3)
        days_ = [row[0] for row in (r.get("rows", []) or []) if row[1]]
        lines.append(f"_YouTube Analytics has data through {days_[-1] if days_ else 'no recent day'}; anything newer shows '-' below._")
        r = ya.reports().query(ids="channel==MINE", startDate=start, endDate=end,
                               metrics="views,estimatedMinutesWatched,likes,comments,shares,subscribersGained,subscribersLost").execute(num_retries=3)
        if r.get("rows"):
            v, mins, lk, cm, sh_, sg, sl = r["rows"][0]
            lines.append(f"**Last 7 days:** {int(v):,} views, {mins / 60:.1f} h watched, {int(lk):,} likes, {int(cm):,} comments, "
                         f"{int(sh_):,} shares, subscribers +{int(sg)} / -{int(sl)} (net {int(sg) - int(sl):+d}).")
        s28 = (dt.date.fromisoformat(end) - dt.timedelta(days=28)).isoformat()
        r = ya.reports().query(ids="channel==MINE", startDate=s28, endDate=end, metrics="views",
                               dimensions="insightTrafficSourceType", sort="-views").execute(num_retries=3)
        rows = r.get("rows", []) or []
        tot = sum(x[1] for x in rows) or 1
        if rows:
            lines.append("**Where views came from (28 days):** " + ", ".join(f"{k.replace('_', ' ').lower()} {100 * n / tot:.0f}%" for k, n in rows[:5]) + ".")
    except Exception as e:
        lines.append(f"(channel analytics unavailable: {str(e)[:120]})")
    return "\n\n".join(lines)


def report(yt, done: dict, vd: Path | None, ya=None) -> None:
    """Weekly: every recorded Short's numbers (Data API: views, likes, comments; Analytics API: engaged views, watch
    time, average % viewed, retention at 10/50/100%, shares, subscribers, engagement rate), the channel's week, and how
    many Shorts are left to go up."""
    ids = {v["video_id"]: k for k, v in done.items() if v.get("video_id")}
    stats = {}
    keys = list(ids)
    for i in range(0, len(keys), 50):
        for it in yt.videos().list(part="statistics,status", id=",".join(keys[i:i + 50])).execute(num_retries=3).get("items", []):
            stats[it["id"]] = it
    today = central_now().date()
    end = today.isoformat()
    start = min([v.get("uploaded", end) for v in done.values()] + [end])
    an, note, ret = {}, "", {}
    if ya is not None:
        an, note = video_analytics(ya, keys, start, end)
        for vid in keys:
            if an.get(vid, {}).get("views"):
                ret[vid] = retention(ya, vid, start, end)
    rows, scored = [], []
    for vid, name in ids.items():
        s = stats.get(vid, {}).get("statistics", {}); st = stats.get(vid, {}).get("status", {})
        e = done[name]
        views, likes, comments = int(s.get("viewCount", 0)), int(s.get("likeCount", 0)), int(s.get("commentCount", 0))
        A, R = an.get(vid, {}), ret.get(vid, {})
        shares = int(A.get("shares", 0) or 0)
        eng = (likes + comments + shares) / views if views else None
        stayed = (A["engagedViews"] / A["views"]) if A.get("engagedViews") is not None and A.get("views") else None
        avd = A.get("averageViewDuration")
        avd_s = "-" if avd is None else f"{avd:.0f}s"
        avp = A.get("averageViewPercentage")
        avp_s = "-" if avp is None else f"{avp:.0f}%"
        rel = R.get("rel50")
        rel_s = "-" if rel is None else f"{rel:.2f}"
        subs = A.get("subscribersGained")
        subs_s = "-" if subs is None else str(int(subs))
        cells = [e.get("uploaded", ""), f"[{name}](https://youtube.com/shorts/{vid})", e.get("by", "auto"), f"{views:,}", _pct(stayed),
                 f"{likes:,}", f"{comments:,}", f"{shares:,}", _pct(eng), avd_s, avp_s,
                 f"{_pct(R.get('r10'))} / {_pct(R.get('r50'))} / {_pct(R.get('r100'))}", rel_s, subs_s, st.get("privacyStatus", "?")]
        rows.append((e.get("uploaded", ""), "| " + " | ".join(cells) + " |"))
        if views >= 100:
            scored.append((name, vid, views, stayed, eng, A.get("averageViewPercentage")))
    rows.sort(reverse=True)
    best = []
    for label, k in (("most views", 2), ("best stayed-to-watch proxy", 3), ("best engagement rate", 4), ("highest average % viewed", 5)):
        c = [x for x in scored if x[k] is not None]
        if c:
            x = max(c, key=lambda x: x[k])
            val = f"{x[k]:,}" if k == 2 else (f"{x[k]:.0f}%" if k == 5 else _pct(x[k]))
            best.append(f"{label}: [{x[0]}](https://youtube.com/shorts/{x[1]}) ({val})")
    left = []
    if vd:
        for m in sorted((vd / "shorts").glob("*/metadata.json")):
            meta = json.loads(m.read_text())
            if meta.get("status") == "ready" and m.parent.name not in done and not meta.get("posted") and channel_of(meta) == CHANNEL:
                left.append(m.parent.name)
    days = len(left) / max(1, PER_DAY)
    summary = channel_summary(ya, (today - dt.timedelta(days=7)).isoformat(), end) if ya is not None else ""
    body = ((summary + "\n\n" if summary else "")
            + ("**Best (100+ views):** " + "; ".join(best) + "\n\n" if best else "")
            + "Every Short (newest first). Auto uploads vs hand uploads: compare the `by` column.\n\n"
            "| uploaded | Short | by | views | stayed* | likes | comments | shares | engagement | avg view | avg % | retention 10/50/100% | vs similar | subs + | status |\n"
            "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n"
            + "\n".join(r for _, r in rows)
            + "\n\n*stayed: engaged views / views, the API's nearest thing to Studio's \"stayed to watch\" (Studio's exact "
              "\"viewed vs swiped away\" isn't in the API). engagement: (likes + comments + shares) / views. retention: the "
              "share of viewers still watching at 10%, half and the end (over 100% at the end means rewatches/loops). vs "
              "similar: retention at the halfway mark against similar-length YouTube videos (0.5 = typical, higher is better). "
              "YouTube Analytics lags 1-3 days, so the newest Shorts show '-' until it catches up."
            + (f"\n\n_{note}_" if note else "")
            + f"\n\n**Ready and not uploaded yet: {len(left)}** (about {days:.0f} days at {PER_DAY} a day)"
            + (" - **running low: make more Shorts**" if days < 7 else "")
            + ("\n\n" + ", ".join(left) if left else "")
            + "\n\nTo pause: create `uploads/PAUSED` on main (any text). To stop: set the repo variable YT_ENABLED to anything but `true`.")
    t = f"{NAME} weekly report {central_now().date().isoformat()}"
    if os.environ.get("REPORT_STDOUT"):
        print(t); print(body); return
    if not open_issue(t):
        issue(t, body)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--report", action="store_true")
    ap.add_argument("--scores", action="store_true", help="print the subscribers-per-1k-views ranking only")
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
                report(youtube(), done, vd, analytics())
            return
        if a.scores:
            if ok:
                family_scores(analytics(), done)
            return
        scores = None
        if ok:
            try:
                scores = family_scores(analytics(), done)
            except Exception as e:   # never let the ranking stop an upload: fall back to queue order
                print(f"scores unavailable ({str(e)[:160]}): queue order", flush=True)
        if PAUSED.exists():
            print(f"uploads are paused (uploads/PAUSED: {PAUSED.read_text().strip()}). Nothing done."); return
        today = central_now().date().isoformat()
        n_today = sum(1 for e in done.values() if e.get("uploaded") == today)
        if n_today >= PER_DAY and not a.dry_run:
            print(f"already uploaded {n_today} today ({today} Central; the limit is {PER_DAY}). Nothing done."); return
        yt = None
        for slot in range(n_today, PER_DAY if not a.dry_run else n_today + PER_DAY):
            if a.short and slot > n_today:
                break
            if a.short:
                meta = meta_of(vd, a.short)
                history = [k for k, _ in sorted(done.items(), key=lambda kv: kv[1].get("uploaded", ""))]
                if a.short in done or not meta or meta.get("status") != "ready" or meta.get("posted") or not mix_ok(history, a.short) or channel_of(meta) != CHANNEL:
                    sys.exit(f"{a.short}: already uploaded, not ready, posted by hand, breaks the mix, or belongs to another channel")
                name, skipped = a.short, ""
            else:
                name, skipped = pick(vd, done, scores)
            if skipped:
                print("skipped:\n" + skipped)
            if not name:
                msg = "Nothing left that is ready and keeps the posting mix. The channel goes quiet until more Shorts are published."
                print(msg)
                if not a.dry_run and not open_issue(f"{NAME}: nothing left to upload"):
                    issue(f"{NAME}: nothing left to upload", msg + ("\n\nSkipped:\n" + skipped if skipped else ""))
                return
            meta = meta_of(vd, name)
            yt_meta = meta["youtube"]
            title, desc = yt_meta["title"].strip()[:100], yt_meta["description"]
            if "#shorts" not in (title + desc).lower():
                desc = desc.rstrip() + "\n\n#shorts"
            when = publish_at(slot)
            print(f"next: {name}: {title!r}, publish at {when} UTC (series {series(name)})")
            if a.dry_run:
                done[name] = {"uploaded": today, "video_id": ""}   # only so the next pick follows on
                continue
            if yt is None:
                yt = youtube()
                me = [c["id"] for c in yt.channels().list(part="id", mine=True).execute().get("items", [])]
                if env("YT_CHANNEL_ID").strip() not in me:
                    sys.exit(f"the token belongs to {me}, not YT_CHANNEL_ID{SUFFIX}: refusing to upload to {NAME}")
                why = suppressed(yt, done)
                if why:
                    msg = (f"Every recent auto upload is stuck under 50 views a day or more after going public ({why}). "
                           "That is how the BuhExplains suppression looked, so uploads are paused (uploads/PAUSED) instead "
                           "of feeding more into a held-back channel. Check YouTube Studio (Analytics > Reach, 'Shown in "
                           "feed'; any policy notices), then delete uploads/PAUSED on main to resume.")
                    pause(msg)
                    issue(f"{NAME} uploads paused: recent Shorts get no views", msg)
                    print(msg); return
            elif slot > n_today:
                gap = random.randint(240, 720)   # don't fire 3 uploads back to back within seconds
                print(f"waiting {gap // 60} min before the next upload", flush=True)
                import time; time.sleep(gap)
                # a fresh connection after the wait: the idle one was closed under us and the next call died with
                # BrokenPipeError (2026-11-09: 2 of 3 went up, the run stopped before the third)
                yt = youtube()
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
                st, resp = req.next_chunk(num_retries=5)
                if st:
                    print(f"uploaded {int(st.progress() * 100)}%", flush=True)
            vid = resp["id"]
            f.unlink()   # keep the runner's disk small between uploads
            done[name] = {"video_id": vid, "uploaded": today, "publish_at": when, "title": title, "by": "auto"}
            save_record(done, f"uploads: {name} ({vid}), public at {when} UTC")
            print(f"uploaded {name}: https://youtube.com/shorts/{vid} (private until {when} UTC)")

if __name__ == "__main__":
    main()
