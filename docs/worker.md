# Worker brief: building a new Short in a parallel session

You are one of several parallel sessions building HelloBuh Minecraft Shorts. The orchestrator
session assigned you formats. Read `docs/agent_guide.md` first (the `./hb` command: every step below as one command,
with `./hb doctor` for the setup), then `README.md` and `docs/lessons.md`: they cover how
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
  `drops.js`, `fortune.js`. Use `edit.startAt` / `edit.endAfter` to trim to the action (a payoff that is a blast or
  a fall ends on `endAfter: 'settle:0.5'`: 0.5 s after the harness's `settle` mark, once the TNT, falling blocks
  and deaths are over; smoke doesn't count; lib/settle.js; see "Ending a beat fast" below), `subs`
  for beat labels (no emoji in subs), `deathScreen` + `expectDeath` for deaths.
- 1.21.11 game rules are snake_case (`immediate_respawn`, `spawn_mobs`...). `/fill` is capped
  at 32768 blocks. Check logs for `COMMAND ERROR:`. During set-up (before the recording starts) a command error
  fails the attempt ("SETUP FAILED", exit 6, run.sh retries), except benign ones (/kill with nothing to kill, a /setblock
  to the same block); a command that may fail on purpose: `ctx.cmd(c, { mayFail: true })` (or `allowSetupErrors: true`
  on the stunt, `ALLOW_SETUP_ERRORS=1`).
- **No fixed minimum length** (owner, 2026-11-12: "no fixed minimum, just don't pad them"; the 30 s rule of
  2026-11-06 is retired). Never pad: no beat added or stretched to reach a length. The stunt reads in the first second; something new every ~2 s; no frozen 0.5 s+ pause; the
  Short ends <= 1.0 s after the final payoff. Owner: "We don't want any deadspace and we should end
  as soon as the payoff comes".
- **Gate the final mix, not the no-song render**: `./hb mixcheck <name>` builds the exact NCS mix publish makes and
  runs the publish gate's `./hb pace` on it (`./hb review` runs it too, as a blocker). Under the music, game sounds
  stop counting as hits: a payoff with no hit and a stretch carried only by game sounds both BLOCK at publish. Fixes:
  the drop on the payoff, a 0.4 s dip + an impact (edit.py caps the edit sfx at +4 dB of the game track's loudness, so an
  impact can no longer drag a quiet game track ~28 dB down as on mislabel_grandma), a picture or caption beat in any quiet
  stretch; re-run ./hb check after. (lessons 2026-11-11)
- **The music sits under the game, steady** (owner 2026-11-12 on desire_town: "the music jumps too much, can we jsut have
  it sit underneath the sound effects but still there"): add_song masters the game + sfx first (to -12.5 LUFS, the gain
  capped so the limiter takes <= 3 dB off its peaks: scripts/loud.py tame_gain), lays the song under it at its fixed
  offset, then only limits the peaks (no makeup gain: the old -10 LUFS master added ~+13 dB to a sparse game track and
  took it back on every hit, so the bed pumped ~11 dB). A peaky Short now comes out quieter than -10 LUFS. mixcheck
  BLOCKs a master whose gain varies > 3 dB (p5-p95) or music < 3 dB under the block sounds (scripts/mix_pump.py). Lower
  a loud bed with edit.songGain (dB); a gentle dip is ['dip', mark, 0.4, {depth: 0.5}] (-6 dB, not -24).
- Creative freedom (owner): "We can have creative freedom as well to make it more eye catching or
  anything for retention". Ridiculous, escalating, eye-catching beats beat safe ones.

## Ending a beat fast (owner r:r188b46, 2026-11-11)
"After the stunt is done, we just cut... it can't be too fast, but it can't be so slow either... right now, we blow up
the TNT, wait for what feels like forever, then we cut... boom, boom, boom, fast pace." Cut about 0.3-0.6 s after an
action's result reads and go straight to the next beat; the end lands 0.5-0.8 s after the payoff's result. Only the
action holds a cut (a block mid-fall, a mob mid-death, a blast's first 0.3 s); smoke, particles and drifting debris
never do. `./hb pace` measures it (scripts/dwell.py): every result (a place, break, blast, hit, death, landing, and
each mark the edit hangs an impact/boom/hit/ding sound, a flash or a shake on) to the next new thing (a cut, the next
beat or mark, a line, a caption, a build block) or to the action going on (a fuse, a falling block, a mob walking up,
the player falling: from the recording, never the pixels). WARN over 1.0 s mid-video; the end WARN over 0.9 s, BLOCK
over 1.2 s (a text payoff, a death screen or a card, keeps its 1.2-1.8 s reading time).
- **When does a result read?** A place, break or hit at once; a blast 0.3 s after it (its frame); a death 1.0 s after
  it (the fall-over and poof); a reveal on its mark. So: a blast payoff ends ~0.9-1.1 s after the blast, a death ~1.6 s.
- **The end: lower the endAfter offset**, never past the action: `crater:1.0` -> `crater:0.6`; a blast payoff on a new
  recording `settle:0.5` (the mark is 0.3 s after the last blast). On a recording made before 2026-11-11 23:00 the
  `settle` mark still sits ~1.9 s after the last blast (the old smoke wait): use `settle:-1.3` to `-1.1` there (pace's
  dwell finding prints the time to end at; its fix says how much to take off).
- **Mid-video: cut the wait out with a speed span.** `speed: [['boom:0.9', 'crater', 'cut']]` drops everything from
  0.6 s after a blast's result to the next beat (offsets are source seconds after the mark). Inside one continuous
  camera move (a tilt or a sweep), speed it up instead of a hard cut (`['boom:2.8', 'crater:-0.1', 4]`), so the view
  doesn't jump (r:r52f94c). A cut between two tiers or piles can start sooner: `['crater1:0.8', 'cut2b', 'cut']`.
- **In the stunt**, don't wait on smoke: no `waitForTicks(44)` or `L.hold(36)` "for the debris and smoke to settle";
  the harness's settle already waits for falling blocks and deaths. A look into a crater is fine, but cut 0.5-0.8 s
  into it.
- An edit-only change (endAfter, speed spans, sfx) re-renders with `./hb render <stunt> --reuse` (frames reused).

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
4. **set**: floating sand/gravel/concrete powder and liquids that should have flowed, in view within 16 blocks; and
   terrain (stone, dirt, snow, gravel, ores...) still standing inside a box `clearSet` emptied (it records the box in the
   recording), in view within 48 blocks: a blocker from 64 blocks / 0.5 s. If the set check can't run (no `npm ci`)
   the verdict says "OK, BUT THE SET CHECK DID NOT RUN" (exit 2 with `--strict` / `REC_CHECK_STRICT=1`).
5. **vanilla**: digs under half the vanilla time for the held tool, mobs faster than vanilla, the player faster than
   sprint-jumping (outside cuts and F1 drone shots).
6. **flat / subject / sync / glitch** (the owner's 22 notes of 2026-11-10, from `./hb owner`, lib/hb/owner.js; `--no-owner`
   skips them): a story shot whose visible world is mostly a flat cleared plain; the camera off what the line names
   (`lines[].look`, else inferred from TORCH / MOM / LIBRARIAN...: a warning); an action before the word that announces
   it, already in the hole when the line says "dug", a fall with no dig/hit/edge before it, "never X" over X; a door
   that moves with nobody using it, the player stopped dead against a door, jitter, one-tick aim snaps (often the
   landing tick of a /tp with yaw 0), a fall-stop-fall stutter, and fog/night/rain the story promises but the recording
   lacks. In the camera shots of a wide master, the subject and flat checks judge the cropped middle frame.
Blockers are what reviews always flagged; warnings need a reason ("planned: the turn follows the creeper") or a fix.
A clean check doesn't replace the frame review: lighting, models, the HUD and the joke still need eyes.

## Render on GitHub Actions (parallel slices)
A long render (a 60 s story is ~25 min here) can run on GitHub's runners instead: 16 runners each render a slice of
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
  frames (render.js: `(poses - 1) / 20 * FPS`) and cuts them into ranges of about equal render *time*
  (`scripts/render_cost.py`: frame size, relights after block changes, whole-world re-meshes when the sky light
  changes (time of day, rain), each slice's start-up; `python3 scripts/render_cost.py work/<name>.rec.json 16`
  prints the profile and the split); `slice` x N renders its range with `render.js` `FRAMES=` (frames keep
  their real numbers) and stores it as a lossless RGB video; `finish` decodes them back into
  `work/<name>.frames/`, checks every frame is there, and runs `scripts/finish_render.sh` (= the tail of `run.sh`:
  `audio.py`, `render_replay.py` for `edit.replay`/`slowmo`, `edit.py` with the stunt's `edit` args). The Short is
  the run's `short` artifact and is committed back to the branch as `renders/out/<name>.mp4` with
  `renders/result.json` (`done` or `failed`, with the run's URL), so fetching needs no gh token.
- `SLICES=` (default 16, at most 32; a heavy stretch such as a sunset gets slices of a few dozen frames) and `FPS=` (60) go in the job. Re-queueing the
  same name force-pushes and cancels the run in progress. A manual run: Actions -> render-slices -> Run workflow on
  the `render/<name>` branch (inputs name, stunt, slices override the job file).
- Songs aren't in git, so as with run.sh here the output has the game audio and voice only (publish.js adds the song).
- The slices are lossless and join into the same frames, except particles on a slice's first frames (their history
  starts with the slice): on pickaxe_race 0.2% of pixels differed from a render started 60 frames earlier.
- Never merge a `render/*` branch. Delete it once you have the MP4 if your git allows it (`git push origin --delete render/<name>`; the session proxy refuses deletes, so it may stay: harmless, re-queueing force-pushes it).
- Tested 2026-11-10: story_respawn_tax (44.4 s) renders on Actions in **~10 min** end to end (21 min before the no-apt setup; 41 min when the Ubuntu mirror was slow), matching the published Short frame for frame.

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

## Working in a git worktree
A worktree (`git worktree add ../wt-x -b my-branch origin/main`) has no game files, packages or licensed media.
Link them from the main checkout, or run.sh re-downloads and rebuilds the server and assets:
`ln -s /home/user/hello-buh/{node_modules,songs} . && mkdir -p sfx && ln -s /home/user/hello-buh/sfx/mixkit sfx/mixkit && ln -s /home/user/hello-buh/work work`
(never commit these links). Only one Minecraft server can run at a time: `pgrep -af "server.jar|bot.js"` first.

## An independent reviewer when you have no subagent tool
Start a fresh cloud session on your branch (`create_session` with the repo and your branch or `render/<name>`),
give it `.claude/skills/short-review/SKILL.md` and the video path, and read its verdict with `list_events`
(story_nitwit's two rounds worked this way; each needs a fresh container, ~5 min).
