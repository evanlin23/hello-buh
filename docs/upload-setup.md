# @HelloBuh auto-upload: one-time setup (free, about 15 minutes)

Uploads stay **off** until every step is done. The `upload-short` workflow checks for all of them and otherwise
prints "uploads are off" and does nothing.

What it does once on: every morning the next 3 Shorts from `uploads/queue.txt` go up **private**, each with a
scheduled publish at a random time in its own slice of 9:00-21:00 Central (9-13, 13-17, 17-21); YouTube makes
them public on its own. When the queue runs out it
takes any other "ready" Short, still keeping the mix (no format twice in a row, at most 1 pixel-art per 3). Every
Sunday it opens an issue with the views of everything uploaded and how many Shorts are left. A failed run opens
an issue too. GitHub emails you about new issues, so that is the weekly check-in.

## 1. Google Cloud: reuse blocky-stories' OAuth client
The blocky-stories Google Cloud project already has the YouTube Data API v3 enabled, a **published** consent
screen, and a Web OAuth client (buh-explains reuses it too). Use the same Client ID and secret.
- Check its consent screen has the scopes `youtube.upload` and `youtube.readonly`, and that the app is
  **In production** (in "Testing" the token dies every 7 days).

## 2. A refresh token for the HelloBuh channel (browser only)
1. https://developers.google.com/oauthplayground → gear icon → "Use your own OAuth credentials" (the Client ID and
   secret from step 1), Access type **Offline**, Force prompt **Consent**.
2. In "Input your own scopes" paste:
   `https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly`
3. Authorize **as the @HelloBuh channel** (pick it on the channel chooser), exchange the code, copy the
   **refresh token**.
4. Check: `GET https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true` must show "Hello Buh".
   Note its `id` (starts with UC).

## 3. GitHub: evanlin23/hello-buh → Settings → Secrets and variables → Actions
- **Secrets:** `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`. Never paste these into a chat or a commit.
- **Variables:** `YT_CHANNEL_ID` = the UC... id (the upload refuses any other channel), `YT_ENABLED` = `true`.
  Optional: `YT_PER_DAY` (default 3) to change how many a day.
- Actions → General → Workflow permissions: **Read and write**.
- Test: Actions → upload-short → Run workflow → mode `dry-run`. It prints the next Short and its publish time.

## 4. The daily clock (cron-job.org)
GitHub's own `schedule:` has not fired reliably for this owner, so cron-job.org starts the run (the workflow's
schedule stays as a backup; a second run on the same day does nothing).
1. GitHub → Settings → Developer settings → Fine-grained tokens → new token, only the repository
   `evanlin23/hello-buh`, permission **Actions: Read and write**, longest expiry.
2. cron-job.org → new job "hellobuh upload", every day 7:07 AM US Central:
   - URL `https://api.github.com/repos/evanlin23/hello-buh/actions/workflows/upload.yml/dispatches`, method POST
   - headers `Authorization: Bearer <the token>`, `Accept: application/vnd.github+json`
   - body `{"ref":"main"}`

## Day to day
- **Pause:** create `uploads/PAUSED` on main (any text). Delete it to resume. **Stop:** set `YT_ENABLED` to `false`.
- **Uploaded one by hand?** Add it to `uploads/uploads.json` (or tell Claude). The uploader also refuses a title
  that is already on the channel, so a hand upload can't go up twice.
- **Change the order:** edit `uploads/queue.txt`, then `python3 scripts/check_queue.py ../hb-videos`.
- Never delete or re-upload a video that does badly: YouTube treats that as spam.
- If the token dies (issue "upload failed" with "YT_REFRESH_TOKEN no longer works"): repeat step 2 and replace
  the `YT_REFRESH_TOKEN` secret.

## Safeguards against looking like a bot (owner, 2026-11-08)
- **No clockwork.** The daily run starts 0-40 min late at random. Each Short publishes at a random minute in its
  own slice of 9:00-21:00 Central, at least 90 min from the next. The 3 uploads in a run are 4-12 min apart.
- **Fixed daily cap** (`YT_PER_DAY`, default 3), counting hand uploads, so no bursts.
- **No repeats.** A title already on the channel is refused (series parts have their own titles). Nothing is
  ever deleted or re-uploaded.
- **No same format twice in a row**, at most 1 pixel-art per 3 (`scripts/check_queue.py`).
- **Only original, reviewed Shorts.** Status "ready" means all three reviews passed. Only NCS or original music,
  credited. Made for kids: No. No synthetic-media flag (it's rendered gameplay, not realistic altered footage).
- **Circuit breaker.** If the last 3+ auto uploads that have been public 24-96 h all have under 50 views (what the
  BuhExplains suppression looked like), the run pauses uploads itself (`uploads/PAUSED`) and opens an issue
  instead of feeding more videos to a held-back channel.
- Only the HelloBuh channel: the token's channel must match `YT_CHANNEL_ID`.
