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
  shared files (`render.js`, `renderer/*`, `edit.py`, `lib/harness.js`, `run.sh`, other stunts).
  If you find an engine bug, describe it with a reproduction in your final report instead.
- One run at a time in your container (the server port is fixed). Never edit `run.sh` while it runs.
- Copy the patterns of existing stunts: `tnt_scale.js`, `every_clutch.js`, `creeper.js`,
  `drops.js`, `fortune.js`. Use `edit.startAt` / `edit.endAfter` to trim to the action, `subs`
  for beat labels (no emoji in subs), `deathScreen` + `expectDeath` for deaths.
- 1.21.11 game rules are snake_case (`immediate_respawn`, `spawn_mobs`...). `/fill` is capped
  at 32768 blocks. Check logs for `COMMAND ERROR:`.
- Target 12-20 s with something happening the whole time: the stunt visible in the first
  second, several beats that escalate, the payoff at the end.

## QA before publishing (required)
1. `python3 scripts/qa.py out/<name>.mp4`: no unexplained stuck, dark or black stretches.
2. Look at the frames yourself: `ffmpeg -i out/<name>.mp4 -vf "fps=2,scale=270:480,tile=8x2" sheet_%02d.jpg`,
   read every sheet, and check full-res frames at anything suspicious. Look for rendering glitches,
   lighting, camera (staring at nothing, jerky), the bot stuck, the HUD, pacing, and whether the
   joke reads in the first 1-2 s.
3. Fix and re-run until it's good. Be strict.

## Publish
```bash
git add stunts/<name>.js && git commit -m "New format <name>: ..." && git pull --rebase origin main && git push origin main
node scripts/publish.js <name> --notes "worker: <one line>"     # pushes the package to the videos branch
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
