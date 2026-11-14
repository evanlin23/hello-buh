# @HelloBuh auto-upload: one-time setup (free, about 15 minutes)

Uploads stay **off** until every step is done. The `upload-short` workflow checks for all of them and otherwise
prints "uploads are off" and does nothing.

What it does once on: every morning the next 4 Shorts from `uploads/queue.txt` go up **private**, each with a
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
  Optional: `YT_PER_DAY` (default 4) to change how many a day.
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
- **Fixed daily cap** (`YT_PER_DAY`, default 4), counting hand uploads, so no bursts.
- **No repeats.** A title already on the channel is refused (series parts have their own titles). Nothing is
  ever deleted or re-uploaded.
- **No same format twice in a row**, at most 1 pixel-art per 3 (`scripts/check_queue.py`).
- **Gated on today's gates.** A non-story Short whose metadata `gates` are older than `lib/hb/gates.json`'s version,
  or blocked without a reviewed waiver, is skipped with the reason in the run log (`scripts/gates.py`; re-gate with
  `python3 scripts/gates.py stamp <name>`; `python3 scripts/gates.py stale` lists what would be skipped). story_*
  Shorts are gated by the story pipeline and the owner's OK instead.
- **Only original, reviewed Shorts.** Status "ready" means all three reviews passed. Only NCS or original music,
  credited. Made for kids: No. No synthetic-media flag (it's rendered gameplay, not realistic altered footage).
- **Circuit breaker.** If the last 3+ auto uploads that have been public 24-96 h all have under 50 views (what the
  BuhExplains suppression looked like), the run pauses uploads itself (`uploads/PAUSED`) and opens an issue
  instead of feeding more videos to a held-back channel.
- Only the HelloBuh channel: the token's channel must match `YT_CHANNEL_ID`.

## A second channel: Buh Stories (the story Shorts; owner 2026-11-10)
Story Shorts go to their own channel, never @HelloBuh. Every package's `metadata.json` names its channel (`channel`:
`buhstories` for `story_*` Shorts, `hellobuh` for everything else; lib/channel.js, written by publish.js), and the
uploader sends a Short only to that channel. Nothing goes up until **all** of this is done, and each story still needs
the owner's OK by name (status "ready" via `publish --owner-ok`). What the owner does, once:
1. **Create the channel.** Done by the owner on 2026-11-11, on its **own Google account** (not a Brand Account under
   the HelloBuh login): name "Buh Stories", handle @BuhStoriesMC. Use that account for everything below.
2. **Branding.** Upload the kit in `brand/buh_stories/` (avatar.png, banner.jpg, watermark.png) and the description in
   docs/brand.md "Buh Stories channel" (YouTube Studio → Customization). Audience: "No, it's not made for kids".
3. **A refresh token for the new channel** (the same OAuth client, so no new Google Cloud project). Because Buh
   Stories is on a separate Google account:
   - first add that account as a **test user** on the OAuth consent screen (Google Cloud → APIs & Services → OAuth
     consent screen → Test users), unless the app is published;
   - then repeat step 2 above signed in as the **Buh Stories account**.
   While the app is in "Testing", Google expires its refresh tokens after 7 days. If HelloBuh's token survives, the
   app is published and this one will too.
   **Scopes:** besides `youtube.upload` and `youtube.readonly`, tick `https://www.googleapis.com/auth/youtube.force-ssl`
   for this token: the uploader adds each Short to the "All Buh Stories" playlist and posts its pinned question, and
   both need it (without it the upload still goes through and the record says `playlist_error` / `comment_error`).
   Check with the `channels?mine=true` call that it shows "Buh Stories", and note its UC... id. The HelloBuh token
   cannot upload there, and vice versa.
4. **GitHub** → Settings → Secrets and variables → Actions:
   - Secret `YT_REFRESH_TOKEN_BUHSTORIES` (the token from step 3). `YT_CLIENT_ID` / `YT_CLIENT_SECRET` are shared.
   - Variables `YT_CHANNEL_ID_BUHSTORIES` = `UC5m8kcDO2cSlXT49VoJjpRw` (Buh Stories' id, from the owner 2026-11-11), `YT_ENABLED_BUHSTORIES` = `true`. Optional
     `YT_PER_DAY_BUHSTORIES` (default 3; stories are fewer, 1 is probably right).
   - Test: Actions → upload-short → Run workflow → channel `buhstories`, mode `dry-run`.
5. **The daily clock:** a second cron-job.org job like step 4 above, at another minute, with the body
   `{"ref":"main","inputs":{"channel":"buhstories"}}`. GitHub's own schedule only runs HelloBuh.

**The upload text is built, never hand-written** (owner: "Stuff should be front loaded"): each story's `story.json`
`upload` block (title from docs/brand.md's table, the pinned question, story tags; a stunt's `edit.youtube` overrides
it) -> lib/buhstories_upload.js -> title, description (hook sentence / question / music credit / `#minecraft #shorts
#minecraftstory #buhstories`), tags (a general base + the story's own), pinned comment (question + " 👇"), playlist
"All Buh Stories", not made for kids, altered content "No". publish.js writes it into the package; the uploader
rebuilds it from main at upload time (a corrected title needs no re-packaging) and skips a package that BLOCKs
(HelloBuh hashtags #minecraftmemes/#funny, no music credit, no title or question). It adds the video to the playlist
on upload and posts the question once the video is public; the API can't pin, so **pin it in Studio**. For a manual
upload: `./hb paste <story>` prints the whole block.

Day to day it is the same as HelloBuh, in `uploads/buhstories/` (queue.txt, uploads.json, PAUSED); the weekly report
and the "nothing left" and "paused" issues are titled "Buh Stories ...". Stop it with `YT_ENABLED_BUHSTORIES` = `false`.

**While uploads are manual:** record each upload with `./hb uploaded <story> <video id or link> [time]` and feed Studio
numbers 48 h after each upload, then weekly; `./hb stories-report` applies the research doc's decision rules
(docs/buhstories-metrics.md).
