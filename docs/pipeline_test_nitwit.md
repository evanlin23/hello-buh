# Pipeline test: story_nitwit (premise #11 "The Nitwit Knows"), 2026-11-10

A fresh agent making one story Short with only the documented toolchain (README, docs/worker.md, docs/stories.md,
the story template, lib/story.js, the short-review skill). Times are UTC wall clock.

## Timing

| stage | start | end | duration | kind | notes |
|---|---|---|---|---|---|
| reading docs + repo (README, worker.md, stories.md, template, lib/story.js, short-review, respawn_tax) | 02:09:30 | 02:13:00 | 3.5 min | working | |
| TTS venv: attempt 1 (`apt-get install espeak-ng` as documented) | 02:10:06 | 02:10:14 | 0.1 min | waiting (setup) | failed: `Unable to locate package espeak-ng` (needs `apt-get update` first) |
| TTS venv: attempt 2 (apt-get update + install + venv + pip torch/kokoro) | 02:10:20 | | | waiting (setup) | ran in the background while writing |
| script (story.json) | 02:11:10 | 02:13:00 | 2 min | working | 17 lines |
| stunt writing (stunts/story_nitwit.js, first draft) | 02:13:00 | 02:15:50 | 3 min | working | (design thought overlapped the doc reading) |

## Counts
- recordings attempted: 0
- renders: 0
- review rounds: 0
- tool fixes needed: 0

## Gaps, bugs, confusing docs (running)
1. **docs/stories.md Setup: `apt-get install -y espeak-ng` fails in a fresh container** (`Unable to locate package`):
   the apt lists are empty. Needs `apt-get update` first. (open: doc fix)
2. **The preview tool isn't on main**: the short-review skill's step 2 says `bash scripts/preview.sh <stunt>`, but
   neither scripts/preview.sh nor scripts/preview.py exists on main (it's WIP on agent/preview). Skipped. (open)
3. Worker setup says symlink nothing; the lead's brief had me symlink node_modules, songs, sfx/mixkit and work. The
   docs don't say a worktree needs `work/` (server, assets) linked: without it run.sh would re-download and rebuild
   the server and assets. (open: doc note)
