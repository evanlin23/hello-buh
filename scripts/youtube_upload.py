"""Upload the next unuploaded Short from the videos branch to YouTube (Data API v3, resumable upload).

Picks the oldest package in shorts/ whose metadata status is "ready" and isn't in uploads.json,
uploads it with the title, description and hashtags from metadata.json, and records it in
uploads.json (commit that file back to the videos branch so nothing goes up twice).

Credentials come from the environment, never from files in the repo:
  YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN   (get the refresh token once with
                                                     scripts/youtube_auth.py on your own machine)
Options (environment):
  YT_AUDIO=song|nosong      which file to upload (default song: the baked-in track; see README
                            "Music and length" - picker audio can't be added through the API)
  YT_PRIVACY=private|public|unlisted   (default private)
  YT_PUBLISH_AT=ISO time    schedule (requires privacy private; YouTube makes it public then)
  YT_DRY_RUN=1              show what would be uploaded

  python3 scripts/youtube_upload.py ../hb-videos
"""
import json
import os
import pathlib
import sys
import urllib.parse
import urllib.request

TOKEN_URL = "https://oauth2.googleapis.com/token"
UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status"


def access_token():
    data = urllib.parse.urlencode({
        "client_id": os.environ["YT_CLIENT_ID"], "client_secret": os.environ["YT_CLIENT_SECRET"],
        "refresh_token": os.environ["YT_REFRESH_TOKEN"], "grant_type": "refresh_token"}).encode()
    with urllib.request.urlopen(urllib.request.Request(TOKEN_URL, data=data), timeout=30) as r:
        return json.load(r)["access_token"]


def next_package(vid):
    done = json.loads((vid / "uploads.json").read_text()) if (vid / "uploads.json").exists() else {}
    cands = []
    for d in sorted((vid / "shorts").iterdir()):
        m = d / "metadata.json"
        if not m.exists() or d.name in done:
            continue
        meta = json.loads(m.read_text())
        if meta.get("status", "ready") != "ready":
            continue
        lic = (meta.get("song") or {}).get("licence", "")
        if os.environ.get("YT_AUDIO", "song") != "nosong" and meta.get("song") and not lic.startswith(("NCS", "original")):
            print(f"skip {d.name}: its song isn't cleared ({meta['song'].get('file')}); run scripts/add_song.py {d.name} --ncs")
            continue
        cands.append((meta.get("published_at", ""), d, meta))
    cands.sort()
    return (cands[0][1], cands[0][2], done) if cands else (None, None, done)


def upload(path, meta, token):
    yt = meta["youtube"]
    body = {
        "snippet": {"title": yt["title"][:100], "description": yt["description"], "tags": [h.lstrip("#") for h in yt.get("hashtags", [])], "categoryId": "20"},   # 20 = Gaming
        "status": {"privacyStatus": os.environ.get("YT_PRIVACY", "private"), "selfDeclaredMadeForKids": bool(yt.get("made_for_kids", False))}
    }
    if os.environ.get("YT_PUBLISH_AT"):
        body["status"]["privacyStatus"] = "private"
        body["status"]["publishAt"] = os.environ["YT_PUBLISH_AT"]
    data = path.read_bytes()
    req = urllib.request.Request(UPLOAD_URL, data=json.dumps(body).encode(), method="POST", headers={
        "Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(len(data))})
    with urllib.request.urlopen(req, timeout=60) as r:
        session = r.headers["Location"]
    put = urllib.request.Request(session, data=data, method="PUT", headers={"Authorization": f"Bearer {token}", "Content-Type": "video/mp4"})
    with urllib.request.urlopen(put, timeout=600) as r:
        return json.load(r)


def main(vid):
    vid = pathlib.Path(vid)
    d, meta, done = next_package(vid)
    if not d:
        print("nothing left to upload"); return
    audio = os.environ.get("YT_AUDIO", "song")
    f = d / ("short_nosong.mp4" if audio == "nosong" else "short.mp4")
    if not f.exists():
        f = d / "short.mp4"
    print(f"next: {d.name} ({f.name}) - {meta['youtube']['title']}")
    if os.environ.get("YT_DRY_RUN"):
        return
    res = upload(f, meta, access_token())
    done[d.name] = {"video_id": res["id"], "file": f.name, "privacy": res["status"]["privacyStatus"], "uploaded_at": res["snippet"]["publishedAt"]}
    (vid / "uploads.json").write_text(json.dumps(done, indent=2) + "\n")
    print(f"uploaded {d.name}: https://youtube.com/shorts/{res['id']} ({res['status']['privacyStatus']})")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "../hb-videos")
