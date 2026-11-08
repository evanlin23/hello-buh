"""One-time: get a YouTube upload refresh token. Run this on YOUR OWN computer (it opens a browser
for you to sign in to the channel's Google account). Stdlib only.

  1. Google Cloud console: create a project, enable "YouTube Data API v3", set up the OAuth
     consent screen (External; add yourself as a test user), create an OAuth client of type
     "Desktop app".
  2. YT_CLIENT_ID=... YT_CLIENT_SECRET=... python3 scripts/youtube_auth.py
  3. Sign in and allow. The script prints the refresh token. Save these three as GitHub repo
     secrets: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN (Settings -> Secrets and
     variables -> Actions). Never paste them into chat or commit them.
"""
import http.server
import json
import os
import urllib.parse
import urllib.request
import webbrowser

SCOPE = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"
PORT = 8765
cid, secret = os.environ["YT_CLIENT_ID"], os.environ["YT_CLIENT_SECRET"]
redirect = f"http://127.0.0.1:{PORT}"
url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
    "client_id": cid, "redirect_uri": redirect, "response_type": "code", "scope": SCOPE,
    "access_type": "offline", "prompt": "consent"})
code = {}


class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        code["c"] = q.get("code", [None])[0]
        self.send_response(200); self.end_headers(); self.wfile.write(b"Done - you can close this tab.")

    def log_message(self, *a):
        pass


print("Opening", url)
webbrowser.open(url)
srv = http.server.HTTPServer(("127.0.0.1", PORT), H)
while "c" not in code:
    srv.handle_request()
data = urllib.parse.urlencode({"code": code["c"], "client_id": cid, "client_secret": secret, "redirect_uri": redirect, "grant_type": "authorization_code"}).encode()
tok = json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=data)))
print("\nYT_REFRESH_TOKEN =", tok["refresh_token"])
print("Save it as a GitHub repo secret; don't share it.")
