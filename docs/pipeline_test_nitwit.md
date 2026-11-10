# Pipeline test: story_nitwit (premise #11 "The Nitwit Knows"), 2026-11-10

A fresh agent making one story Short with only the documented toolchain (README, docs/worker.md, docs/stories.md,
the story template, lib/story.js, the short-review skill). Times are UTC wall clock.

## Timing

| stage | start | end | duration | kind | notes |
|---|---|---|---|---|---|
| reading docs + repo (README, worker.md, stories.md, template, lib/story.js, short-review, respawn_tax) | 02:09:30 | 02:13:00 | 3.5 min | working | |
| TTS venv: attempt 1 (`apt-get install espeak-ng` as documented) | 02:10:06 | 02:10:14 | 0.1 min | waiting (setup) | failed: `Unable to locate package espeak-ng` (needs `apt-get update` first) |
| TTS venv: attempt 2 (apt-get update + install + venv + pip torch/kokoro) | 02:10:20 | 02:16:17 | 6 min | waiting (setup) | ran in the background while writing; ~2.5 GB of disk (torch) |
| first voice.py run (downloads Kokoro weights + spaCy model) | 02:16:24 | 02:18:10 | 1.7 min | waiting (setup) | 17 lines, 34.3 s of narration: under the 40 s story target |
| script (story.json) | 02:11:10 | 02:13:00 | 2 min | working | 17 lines |
| stunt writing (stunts/story_nitwit.js, first draft) | 02:13:00 | 02:15:50 | 3 min | working | (design thought overlapped the doc reading) |
| script v2: 19 lines (anvil beat, ruin montage) + voice re-run | 02:18:10 | 02:20:11 | 2 min | working 1.5 / waiting 0.5 | 38.6 s of narration |
| stunt: rewrite for 19 lines, ruin layout fix | 02:20:11 | 02:21:42 | 1.5 min | working | |
| fix run.sh RECORD_ONLY skipping rec_check (7bfeecb) | 02:17:00 | 02:17:40 | 0.7 min | working | |
| recording 1a (`TRIES=1`) | 02:21:55 | 02:22:39 | 0.7 min | waiting | the worktree's fresh mtimes made run.sh rebuild the renderer assets (~40 s); bot died in setup: `Timeout waiting for 2 ticks` after the biome teleport (flaky; run.sh's default 5 tries would have retried) |
| publish.js Actions/no-song fix (609a5e1), read publish/add_song | 02:22:40 | 02:24:00 | 1.3 min | working | found by reading, before it bit |
| recording 1b | 02:22:52 | 02:26:03 | 3.2 min | waiting | rec_check: 2 blockers (sneak toggled on the L10/L12 cuts eases the eye height), 1 warning (L03 held 0.68 s) |
| fixes: no sneak, roof nitwit moves, camera walks | 02:26:04 | 02:26:19 | 0.3 min | working | |
| recording 2 | 02:26:19 | 02:29:37 | 3.3 min | waiting | rec_check: 0 blockers, 0 warnings. But setup logged 5x `COMMAND ERROR: That position is not loaded` |
| set check (own script over the recording's chunks) | 02:29:40 | 02:30:20 | 0.7 min | working | terrain left inside the set (snow, stone, dirt): 5 clearSet layers failed |
| stills: render.js `ONLY=` 57 ticks at 320x300 (no preview tool on main) | 02:30:25 | 02:38:28 | 8 min | waiting | ONLY= still steps every frame: 460 s for 57 stills. The sheets showed a broken set: snowy biome, floating terrain, black shadow blotches, unlit villagers. rec_check passed all of it |
| lib/story.js clearSet waits for chunks (6dd5351), stunt camera tweak | 02:38:30 | 02:39:00 | 0.5 min | working | |
| recording 3 | 02:39:02 | 02:42:12 | 3.2 min | waiting | attempt 1 died in setup again (`Timeout waiting for 2 ticks`), attempt 2 OK. rec_check: 1 warning (L04's night cut moved <1 block: read as a time jump mid-shot) |
| stills 2 (66 ticks) | 02:42:20 | 02:49:47 | 7.5 min | waiting | set fixed. Found: camera walking into the nitwit (L01) and a wall (L03), street nitwit gliding through the L03 shot, roof nitwit hidden by the eaves, well nitwit hidden behind the well, golem too far, night ruin near-black, the ending's bolts/blasts behind a house |
| fixes from stills 2 | 02:49:50 | 02:52:20 | 2.5 min | working | |
| recording 4 | 02:52:26 | 02:55:35 | 3.2 min | waiting | rec_check clean |
| Actions render 1 queued | 02:55:40 | 03:15:32 | (superseded) | waiting | cancelled by re-queueing after stills 3 |
| stills 3 (66 ticks) | 02:55:50 | 03:05:18 | 9.5 min | waiting | roof nitwit still hidden (eaves), ruin still dark, a first-person hand showed in every still (hideHand ignored?), golem drawn tilted/lying while it walks round the nitwit |
| fixes (roof edge, brightness 1.0, ending framing) | 03:05:20 | 03:07:16 | 2 min | working | one typo cost a run.sh start (syntax error; run.sh exits after the asset fetch) |
| recording 5 | 03:07:16 | 03:15:21 | 8 min | waiting | attempts 1 and 2 died (`Timeout waiting for 4 ticks`, then a silent bot timeout), attempt 3 OK; rec_check clean |
| lead: preview tool merged to main; merged main into the branch (419fe92). Skipped a preview this round: the Actions render was already 4 min in (~21 min total) and a ~10 min preview would only save ~7 min of the wait, while my own stills had already checked the staging | 03:19:00 | 03:19:20 | 0.3 min | working | trade-off |
| Actions render 2 (`render_on_actions.sh` + `--wait`) | 03:15:32 | 03:57:03 | 41.5 min | waiting | docs say ~21 min. Each slice's actual render is ~2 min; the rest is runner setup: apt-get from the Azure Ubuntu mirror ran at ~119 kB/s on some runners (slice 8: 14 min in `apt-get install ffmpeg`, 3 min in playwright's `--with-deps` apt), and the finish job spent 15.5 of its 21 min in render-setup |
| own look at the Short (2 fps sheets) | 03:57:10 | 03:57:40 | 0.5 min | working | readable; the ending's blasts are small at the right edge |
| independent review round 1 (a new cloud session, `create_session`: no subagent tool here) | 03:57:43 | 04:02:55 | 5.2 min | waiting | NOT READY, 3 blockers: (1) the ruin doesn't read as a burned copy of the village (camera walks into the nitwit, dark wall close-ups), (2) the lava well reads black and villagers hide it, (3) 0.9 s near-still night tree that doesn't look split. Reviewer also found rec_check's set check silently skipped without `npm install` |
| maker checks meanwhile: beat_audit | 03:58:20 | 03:59:00 | 0.7 min | working | flagged the same 0.9 s pause as blocker 3 (I'd judged it acceptable) |
| round 1 fixes (campfires in the ruin, wall-top wide shot, burning room, lantern over the well + rim camera, crown blown off + fire, HMMS 4097) | 04:03:00 | 04:05:13 | 2.2 min | working | |
| recording 6 | 04:05:13 | 04:08:14 | 3 min | waiting | 1 attempt, rec_check clean |
| Actions render 3 queued (old setup) | 04:08:20 | 04:19:54 | (superseded) | waiting | re-queued after merging main's no-apt render setup (lead) |
| Actions render 4 (no-apt setup) | 04:19:54 | 04:40:20 | 20.5 min | waiting | setup now 20-30 s a runner. 11 slices took 2.5-7 min; slice 11 (the ending: blasts, bolts, particles) took 12 min alone, so the split by frame count left the run waiting 6+ min on one slice; finish 6 min (join 1.3, audio+edit 4) |
| independent review round 2 (new session) | 04:40:49 | | | waiting | |
| preview (`scripts/preview.sh`, now on main) in parallel | 04:08:32 | 04:34:31 | 26 min | waiting | slower than the new Actions render: 3 parallel render.js jobs each still step through all 2583 frames (5-12 min each on this 4-CPU box with other work running), edit 3.3 min. Sheets are excellent (every cut ±3 frames, labelled). They showed the ruin and tree fixes reading, the ending's blasts in view, and the new lava still drawing near-black with one orange quarter (engine) |
| Actions render 2 queued + stills 4 (12 ticks) | 03:15:32 | 03:17:36 | 2 min | waiting | stills: roof nitwit visible, ruin readable, no hand (the hand in stills 3 is unexplained; render.js silently ignores a stunt module that fails to load) |

## Counts
- recordings attempted: 5 runs of run.sh (9 bot attempts; 4 died in setup)
- renders: 2 queued on Actions (1 cancelled by a re-queue, 1 finished); 4 local still renders by hand
- review rounds: 1 (NOT READY, 3 blockers)
- tool fixes needed: 0

## Gaps, bugs, confusing docs (running)
1. **docs/stories.md Setup: `apt-get install -y espeak-ng` fails in a fresh container** (`Unable to locate package`):
   the apt lists are empty. Needs `apt-get update` first. (open: doc fix)
2. **The preview tool wasn't on main** (merged at ~03:19, after 4 recordings and 3 still renders by hand): the short-review skill's step 2 says `bash scripts/preview.sh <stunt>`, but
   neither scripts/preview.sh nor scripts/preview.py exists on main (it's WIP on agent/preview). Skipped. (open)
4. **run.sh with RECORD_ONLY=1 skipped rec_check** (it exited before the check), although worker.md says run.sh
   prints the report after every recording. FIXED in 7bfeecb.
5. **publish.js after an Actions render baked no song in**: no work/<name>.frames or .wav locally, so no
   short_nosong.mp4 / game_audio.flac, and add_song.py returned "no short_nosong.mp4 or game_audio.flac". FIXED in
   609a5e1 (a stunt without a reference song: out/<name>.mp4 is the no-song version). Also: publish.js records
   `code.commit` as the last *main* commit before the render, which is wrong for a branch render (open).
6. **clearSet ran before the set's chunks were loaded** (right after the biome teleport): 5 whole-layer fills failed
   ("That position is not loaded"), leaving hills, floating terrain and shadows inside the set. The harness only
   logs `COMMAND ERROR` and carries on; rec_check found nothing. FIXED in 6dd5351 (wait for chunks); open: setup
   command errors should fail the attempt (or rec_check should flag terrain above the set floor).
7. **`ctx.findLand` + "nearest plains" put the set in a snowy area** (white snow layers and snowy grass at the
   set's edges). plainsBiome recolours grass but snow layers stay. (open; see recording 3)
8. **No cheap staging look without the preview tool**: render.js `ONLY=` renders every frame anyway (8 min for 57
   stills at 320 px). The preview tool (agent/preview) is the fix. (open)
9. rec_check passes a recording whose set is visibly broken: it only checks cuts, holds, turns, floating blocks
   and speeds. (open)
10. **Flaky setup: `Timeout waiting for N ticks` right after the biome search teleport** (1 in 2-3 attempts):
    each failed attempt costs 1-3 min. run.sh's retries hide it, but recording 5 took 8 min for 3 attempts. (open)
11. **render.js swallows a failed `require` of the stunt** (`try { STUNT_MOD = require(...) } catch {}`): a broken
    stunt file renders with no hideHand, brightness, fovZoom... silently. (open; probably what put a hand in stills 3)
12. **Twins vs one actor**: the docs say "move cast between scenes with a >64-block hop"; with one nitwit in 9
    places, a twin per place (summoned in setup, idle until its scene) was simpler and never glides. Worth a line in
    the staging lessons. (doc)
13. **Actions render took 41.5 min, not ~21**: the render itself is ~2 min a slice; runner setup (`apt-get install
    ffmpeg fonts-inter` + `playwright install --with-deps`) took 0.7-17 min per runner depending on the Azure apt
    mirror, and the finish job waits for the slowest slice and then does the same setup again (15.5 min). Biggest
    single time sink of the run. Fix: cache the .debs / use a container image with ffmpeg + Chromium deps, or a
    static ffmpeg download; skip `--with-deps` when the cache has Chromium; run finish's setup in parallel with the
    slices (start it with them and wait on artifacts). (open)
14. **No subagent tool in this worker** for the "independent reviewer subagent" the brief and short-review ask
    for: used `create_session` (a separate cloud session on render/story_nitwit) and read its answer with
    `list_events`. Works, but costs a fresh container + setup per round. (open: doc how a worker should do it)
15. **rec_check's set/vanilla checks silently skip when node_modules is missing** (the reviewer's fresh checkout:
    `prismarine-chunk` not found, and the report still said OK). It should say the check didn't run. (open)
16. **scripts/preview.sh took 26 min here** (claimed ~10): render.js renders only the listed frames but still
    simulates every frame, three times over (one per job). With Actions at ~10 min now, a local preview only pays
    when the box is idle; the sheets are the valuable part. (open: a sparse render that skips simulation work)
17. **ENGINE: lava placed with /fill (water -> lava in a 2x2x2 well) draws near-black** with one orange quarter for
    1 s+, even with a lantern above it. Repro: stunts/story_nitwit.js L06 (`/fill ... lava replace water`), output
    ~12.3-13.4 s. Later shots of the same well show it orange. (open, engine)
18. **Slices are split by frame count, not cost**: the explosion-heavy last 3.5 s took 12 min while the other 11
    slices took 2.5-7. Weight slices by a cheap per-tick cost estimate (entities, particles, block changes), or
    split the heavy span finer. ~5 min a render. (open)
3. Worker setup says symlink nothing; the lead's brief had me symlink node_modules, songs, sfx/mixkit and work. The
   docs don't say a worktree needs `work/` (server, assets) linked: without it run.sh would re-download and rebuild
   the server and assets. (open: doc note)
