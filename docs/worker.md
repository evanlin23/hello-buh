# Worker brief: building a new Short in a parallel session

You are one of several parallel sessions building HelloBuh Minecraft Shorts. The orchestrator
session assigned you formats. Read `README.md` and `docs/lessons.md` first: they cover how
everything works and every gotcha found so far.

## Setup (fresh container)
```bash
cd hello-buh
git config user.name evanlin23
git config user.email 113861384+evanlin23@users.noreply.github.com
npm ci                                  # mineflayer, three, playwright (Chromium is pre-installed)
pip install pillow numpy 2>/dev/null || true
which ffmpeg java                       # need both (Java 21+)
git fetch origin videos && git worktree add ../hb-videos videos
```
`./run.sh` downloads the 1.21.11 server and client jar on first use. Then it starts a server,
runs the bot, renders, mixes the audio and edits: `STUNT=<name> ./run.sh` -> `out/<name>.mp4`.
`songs/` is not in git, so your outputs have game audio only. That's expected: the orchestrator
adds songs.

## Rules
- **Only add new files** (`stunts/<name>.js`, and helpers under `lib/` only if new). Do NOT edit
  shared files (`render.js`, `renderer/*`, `edit.py`, `lib/harness.js`, `run.sh`, other stunts)
  unless your assignment says you own them (the engine worker owns its renderer features, the
  retention worker owns its edit.py features). Pull main often; commit small.
  If you find an engine bug, describe it with a reproduction in your final report instead.
- One run at a time in your container (the server port is fixed). Never edit `run.sh` while it runs.
- Copy the patterns of existing stunts: `tnt_scale.js`, `every_clutch.js`, `creeper.js`,
  `drops.js`, `fortune.js`. Use `edit.startAt` / `edit.endAfter` to trim to the action, `subs`
  for beat labels (no emoji in subs), `deathScreen` + `expectDeath` for deaths.
- 1.21.11 game rules are snake_case (`immediate_respawn`, `spawn_mobs`...). `/fill` is capped
  at 32768 blocks. Check logs for `COMMAND ERROR:`.
- **30 s minimum** (owner rule, 2026-11-06), reached with MORE escalating beats, never by stretching
  one. The stunt reads in the first second; something new every ~2 s; no frozen 0.5 s+ pause; the
  Short ends <= 1.0 s after the final payoff. Owner: "We don't want any deadspace and we should end
  as soon as the payoff comes" / "I would prefer like 30 seconds at least".
- Creative freedom (owner): "We can have creative freedom as well to make it more eye catching or
  anything for retention". Ridiculous, escalating, eye-catching beats beat safe ones.

## Check the recording before rendering (scripts/rec_check.py)
Run rec_check before rendering, and fix blockers by re-recording. The render takes 25+ minutes; most of what reviews send
back is already in the recording. `./run.sh` runs the check after every successful recording and prints the report
(set `REC_CHECK_STRICT=1` to stop before the render on a blocker). By hand:
```bash
python3 scripts/rec_check.py <stunt> [work/<name>.rec.json]        # exit 1 on a blocker
python3 scripts/rec_check.py <name> --package ../hb-videos/shorts/<name>   # a published Short, with its own edit
```
It works in output time (the edit's speed/cut/slow-mo spans, startAt/endAfter, the hook) and gives each finding as
seconds of the Short, the source time and the marks nearby. Checks, most-flagged first:
1. **cuts**: around every hard cut the first frames are already the new shot (no second jump, no aim or position snap
   in the first 3 frames, no stand-up/crouch: sneak held across the cut), no whip in the old shot's last frames, a
   time-of-day change lands on the cut tick, and no 1.2-4 block hop without a `cut` mark (it renders as a glide).
2. **held**: 0.6 s+ where the camera barely moves and nothing in view changes (mobs, blocks, particles, captions,
   cards): a warning, a blocker from 1 s. The ending: <= 1.0 s after the endAfter mark, 1.8 s for a text payoff.
3. **turns**: beat_audit's big camera turns; name the on-screen reason for each.
4. **set**: floating sand/gravel/concrete powder and liquids that should have flowed, in view within 16 blocks.
5. **vanilla**: digs under half the vanilla time for the held tool, mobs faster than vanilla, the player faster than
   sprint-jumping (outside cuts and F1 drone shots).
Blockers are what reviews always flagged; warnings need a reason ("planned: the turn follows the creeper") or a fix.
A clean check doesn't replace the frame review: lighting, models, the HUD and the joke still need eyes.

## Render on GitHub Actions (parallel slices)
A long render (a 60 s story is ~25 min here) can run on GitHub's runners instead: 12 runners each render a slice of
the frames, one more joins them and does audio, replay/slow-mo and the edit. Expect ~12 min end to end (the same split renders the
movies on claude/ai-dilemma), and the container's hourly restart can't kill it. Record here, render there:
```bash
RECORD_ONLY=1 STUNT=story_<name> ./run.sh                 # just work/story_<name>.rec.json (no local render)
scripts/render_on_actions.sh story_<name>                  # queue: pushes branch render/story_<name>, starts the run
scripts/render_on_actions.sh --wait story_<name>           # polls (git only), then -> out/story_<name>.mp4
```
- **What gets pushed:** a commit on top of your HEAD with your working copies of `stunts/`, `lib/` and `stories/`
  (uncommitted edits too: the edit must use the stunt as recorded), the recording gzipped at
  `renders/slices/<name>.rec.json.gz` and the job `renders/slices.json`, force-pushed to `render/<name>`
  (`RENDER_BRANCH=` to change it, e.g. if your session may only push its own branch prefix). Commit changes to
  anything else the render reads (`render.js`, `renderer/`, `edit.py`, `scripts/`) before queueing.
- **The run** (`.github/workflows/render-slices.yml`, setup in `.github/actions/render-setup`): `plan` counts the
  frames (render.js: `(poses - 1) / 20 * FPS`); `slice` x N renders its range with `render.js` `FRAMES=` (frames keep
  their real numbers) and stores it as a lossless RGB video; `finish` decodes them back into
  `work/<name>.frames/`, checks every frame is there, and runs `scripts/finish_render.sh` (= the tail of `run.sh`:
  `audio.py`, `render_replay.py` for `edit.replay`/`slowmo`, `edit.py` with the stunt's `edit` args). The Short is
  the run's `short` artifact and is committed back to the branch as `renders/out/<name>.mp4` with
  `renders/result.json` (`done` or `failed`, with the run's URL), so fetching needs no gh token.
- `SLICES=` (default 12, at most 32, never under ~30 frames a slice) and `FPS=` (60) go in the job. Re-queueing the
  same name force-pushes and cancels the run in progress. A manual run: Actions -> render-slices -> Run workflow on
  the `render/<name>` branch (inputs name, stunt, slices override the job file).
- Songs aren't in git, so as with run.sh here the output has the game audio and voice only (publish.js adds the song).
- The slices are lossless and join into the same frames, except particles on a slice's first frames (their history
  starts with the slice): on pickaxe_race 0.2% of pixels differed from a render started 60 frames earlier.
- Never merge a `render/*` branch. Delete it once you have the MP4 if your git allows it (`git push origin --delete render/<name>`; the session proxy refuses deletes, so it may stay: harmless, re-queueing force-pushes it).
- Tested 2026-11-10: story_respawn_tax (44.4 s) rendered on Actions in ~21 min end to end, frame-identical to the published Short (mean pixel difference 0-0.4 of 255).

## Iterate on previews; render full-res once
A full render is 15-35 min (every frame at 1080x1011, 60 fps). Staging problems (framing, a cut that
glitches, captions over the subject, set edges, dead air) show just as well in a preview:
```bash
scripts/preview.sh <stunt> [work/<name>.rec.json]     # ~10 min for a 30-45 s Short (vs ~30 min render + edit)
#  -> work/preview_<name>/preview.mp4   360x640, 12 fps, with the real edit: caption, subs/story captions, cards,
#                                        HUD, speed spans and cuts, hook, replay, song. Times match the final.
#  -> work/preview_<name>/sheets/*.jpg  every cut (3 frames either side), every subs/cards/story-line mark,
#                                        the hook, the payoff and the last second, labelled with time + nearest mark
EDIT_EXTRA='{"subsY":0.15}' scripts/preview.sh <stunt>  # try an edit change without touching the stunt
```
It needs only the recording (no server). Re-record and preview until the sheets look right, then render
full-res once (`run.sh`, or `scripts/resume.sh` on the kept recording) and do the QA below on that.
Details and knobs (`PREVIEW_FPS`, `PREVIEW_W`, `PREVIEW_JOBS`, `KEEP`): `docs/qa.md`, `scripts/preview.py`.
Delete `work/preview_<name>/` when you're done (disk is tight).

## QA before publishing (required)
0. Both audits must say ready: `.claude/skills/retention-audit/SKILL.md` (with `python3 scripts/beat_audit.py <name>`)
   and `.claude/skills/minecraft-audit/SKILL.md`. Then the frame review below.
1. `python3 scripts/qa_frames.py out/<name>.mp4`, then read every sheet and flag image (docs/qa.md): no unexplained flags.
2. Look at the frames yourself: `ffmpeg -i out/<name>.mp4 -vf "fps=2,scale=270:480,tile=8x2" sheet_%02d.jpg`,
   read every sheet, and check full-res frames at anything suspicious. Look for rendering glitches,
   lighting, camera (staring at nothing, jerky), the bot stuck, the HUD, pacing, and whether the
   joke reads in the first 1-2 s.
3. Fix and re-run until it's good. Be strict.

## Publish
```bash
git add stunts/<name>.js && git commit -m "New format <name>: ..." && git pull --rebase origin main && git push origin main
node scripts/publish.js <name> --pass --notes "worker: <one line>"   # only after the frame review passes; without --pass it stays pending-qa
```
If the videos push is rejected (another worker pushed), run `cd ../hb-videos && git pull --rebase
origin videos && git push origin videos`.

End every commit message with:
```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Report back
Finish with a short report: each format's name, caption, length, QA verdict, anything you couldn't
fix, and any engine bugs found (with how to reproduce them).
