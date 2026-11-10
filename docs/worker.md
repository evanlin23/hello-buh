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
