# Agent guide: read this first

One page for an agent making or fixing a HelloBuh Short. Everything goes through one command, `./hb` (run from the
repo root; `./hb help` lists it). Each command prints plain results (paths, counts, a `next:` line), `--json` prints one
JSON object instead, and a failure exits non-zero with the reason on stderr. Deeper docs, only when a step needs them:
`docs/stories.md` (story rules and owner quotes, which outrank everything), `docs/story_craft.md` (writing, shots,
continuity bible), `docs/worker.md`, `docs/qa.md`, `docs/movie_engine.md` (camera shots and looks, on its branch).

## Start of a session (1 minute)
```bash
./hb doctor          # packages, Chromium, Java, ffmpeg, assets, server jar, songs, TTS venv, Gemini, disk, server free
./hb status          # every story stunt: voice / recording / preview / Actions render / reviews / published / queue,
                     # and the next step for each; also whether the Minecraft server is in use and the free disk
```
In a git worktree, link the shared files first (never commit the links: they show as untracked, so `git add` files by
name): `ln -s /home/user/hello-buh/{node_modules,songs,work} .`

## The commands
| command | what | time |
|---|---|---|
| `./hb doctor` | is this box ready; each failure has its fix | 5 s |
| `./hb status [stunt]` | what exists and what's next | 2 s |
| `./hb voice <stunt> [--only L03]` | the narration (Kokoro, v1 stories); v2 cast voices: `docs/story_craft.md` 5-6 | 30 s |
| `./hb record <stunt>` | server + bot -> `work/<stunt>.rec.json`, then rec_check; stops on blockers (`--no-strict` to keep going); refuses while another server batch runs | 3 min a try (5 tries) |
| `./hb check <stunt>` | rec_check + the movie engine's lint (when present) + continuity + framing + owner | 10-40 s |
| `./hb owner <stunt>` | the owner's review notes as checks (lib/hb/owner.js): superflat shots (and the set's footprint, the plain, the relief), the camera off what the line names (`lines[].look`), the picture ahead of / against the words, an uncaused fall, glitches (doors by themselves, stuck on a door, jitter, one-tick snaps, stutter, fog/night/rain missing); `--shots` prints each shot's fill, `--story DIR` reads another story dir | 5-15 s |
| `./hb describe <stunt> [T...]` | a moment as text (below); no T = the middle of every shot | 1-2 s |
| `./hb continuity <stunt>` | per shot: time, weather, held item, camera, cast; flags pops, time jumps, cast that moved or vanished across a cut | 2 s |
| `./hb framing <stunt>` | per shot: size (EWS/WS/FS/MS/CU), place; flags too-tight shots (subject over 60% of the frame height), cameras against a wall, new places with no wide shot, sizes tighter than story.json v2 planned | 2 s |
| `./hb still <stunt> T [T...]` | renders only those moments in one render.js -> PNGs + a labelled sheet (`--cam back:4`, `--size 360`) | ~30 s + 3-15 s each |
| `./hb sheet <stunt>` | one labelled frame per shot (`--at first,mid,last` adds the cut edges) | 3-10 min |
| `./hb preview <stunt>` | the whole edited Short at 360x640 + sheets of every cut and caption | 10-25 min |
| `./hb render <stunt>` | queues the full render on GitHub Actions; `--wait` / `--fetch` brings back `out/<stunt>.mp4` | 10-20 min |
| `./hb pace <stunt>` | the pacing gate on the finished `out/<stunt>.mp4`: visual + audio hook, dead spots, the same picture held, build-up over thirds, the payoff (a hit + a picture change, the end ≤1 s after), length; BLOCK/WARN with output times and the cheapest fix, exit 1 on blockers (`scripts/pace.py`; `--payoff L18`, `--video`, `--rec`). Needs the render, so it isn't in `hb check` | 20-40 s |
| `./hb review <stunt>` | qa_frames + beat_audit + pace, counts the round; `--verdict "READY"` records the reviewer's answer | 2-4 min |
| `./hb publish <stunt> --notes "..."` | to the videos branch (needs a READY verdict) | 1 min |

**Times (T)**, the same in every command: `12.5` = seconds of the finished Short (trims, speed spans, slow-mo and the
hook applied, exactly as `edit.py` cuts it); `L03`, `L03+1.2`, `L03-0.3` = a story line's mark plus seconds; `cut#3`,
`flash`, `story_end-0.5` = any timeline mark (`#n` = the nth); `end`; `tick:450` / `src:22.5` = source time. A name
that matches nothing fails and lists the marks that exist.

`<stunt>` reads `work/<stunt>.rec.json`, or the published `../hb-videos/shorts/<stunt>/recording.json.gz`; `--rec PATH`
picks another one. The tools say when the stunt file is newer than the recording (re-record) or differs from a
published package's copy.

## See a shot without rendering: `hb describe`
```
$ ./hb describe story_nitwit L08+0.5
== 16.80 s of the Short (source tick 358)
camera: pov, at 380.2 73.62 -18.5 (set -1.8 2.6 32.5), facing south (yaw -168, pitch -4), fov 70
time: noon (6000), weather clear; HUD: health 20, held nothing (hand hidden)
caption: L08 "villagers" | The other / villagers / WALK AWAY / when he comes.
shot: FS full on villager (nitwit) (25% of the frame height)
in frame (7):
  villager (nitwit) #2122: 6.6 blocks, 8% across, 53% down, 25% tall (FS full)
  villager (farmer) #2115: 12.1 blocks, 59% across, 49% down, 12% tall (WS wide)
  ...
  iron_golem #2125: 23.1 blocks, 58% across, 46% down, 8% tall (EWS extreme wide)
view: 14% sky, median depth 6 blocks, 0% within 3 blocks; crosshair on grass_block 23.7 blocks; fills: grass_block 27%, dirt_path 18%, ...
props/lights in view: lantern (19.1)
marks within 2 s: cut -0.85s, line L08 -0.50s, cut +1.70s, line L09 +1.95s
```
Screen positions are of the game view (1080x1011, under the caption band); "HIDDEN behind X" means blocks cover the
entity's head and body from the camera. It is geometry from the recording: it can't judge lighting, textures,
how a model looks or the edit's overlays. Use it to aim and stage (is the subject in frame, how big, what's behind it,
which caption is up), then confirm with `hb still`. Cinematic stunts (`shots`, `self`): the cameras come from
render.js itself (`CAM_PROBE=all`, ~2 s, the same director the frames use), and a camera shot lists the narrator's
body in frame too. Shot names show in `hb framing` as `[camera est]`; `hb check` adds the movie engine's lint.

## Making a story, end to end
Measured on story_nitwit (docs/pipeline_test_nitwit.md: 2 h 40 min start to publish, ~50 min of it work).
1. **Write** with `/story-write` (writers' room: pitch, beat sheet, story.json v2, shot list, bible, table read).
   ~30-60 min, no renders.
2. **Voice**: `./hb voice <stunt>` (v1 Kokoro) or the cast voices (`docs/story_craft.md` 5). Re-voice after any script
   change: the scene lengths come from voice.json, so a new voice means a new recording.
3. **Stage**: `cp stunts/_story_template.js stunts/story_<name>.js` and build every set and cast in `setup`
   (`docs/stories.md` "Make one", the kit table). ~5-15 min.
4. **Record**: `./hb record story_<name>` (~3 min a try; the flaky `Timeout waiting for N ticks` in setup retries).
5. **Check before any render** (seconds): `./hb check story_<name>` (rec_check blockers mean re-record), then read
   `./hb framing` and `./hb continuity` and `./hb describe` the moments you're unsure of. Fix, re-record, re-check.
6. **Look**: `./hb sheet story_<name>` (one frame per shot) and `./hb still` at anything describe or check flagged.
   Skip `./hb preview` by default: on this shared 4-core box it takes 12-26 min, longer than the ~10 min Actions render
   of the real thing. Use `./hb sheet` / `./hb still` for staging and `./hb render` (Actions) to see it move.
7. **Render on Actions**: commit what the render reads (`render.js`, `renderer/`, `edit.py`, `scripts/`: hb refuses
   otherwise), `./hb render story_<name>`, then `./hb render story_<name> --wait` (~10-20 min). Look at sheets meanwhile.
8. **Review**: `./hb review story_<name>` (includes `./hb pace`: its blockers are blockers), then an independent reviewer with `.claude/skills/short-review/SKILL.md`
   (a subagent, or a fresh session: docs/worker.md). Record its answer: `./hb review story_<name> --verdict "NOT READY:
   2 blockers" --notes "..."`. Fix blockers only, re-record/re-render, review again. **Two rounds at most.**
9. **Publish**: `./hb publish story_<name> --notes "one line: what, rounds, nitpicks"`. Then delete
   `work/story_<name>.frames`, `work/preview_story_<name>` and `work/hb/` (disk).

A stunt Short is the same from step 3 (no script, no voice).

## Rules
- **One server batch at a time.** The Minecraft server has a fixed port and the work/ folder is shared by every
  worktree: `hb record` refuses while a server or bot runs anywhere (`hb status` shows whose). Never start one by hand
  next to it, never edit `run.sh` while it runs.
- **Render on Actions**, not here: a local full render is 25+ min of 4 CPUs other agents share and ~4 GB of frames on a
  nearly full disk. `hb render --local` exists and checks the disk first.
- **Never commit licensed or generated media**: `songs/`, `sfx/mixkit/*/`, `work/`, `out/`, `node_modules`, renders,
  voices of other people. In a worktree the links show as untracked files: always `git add` by name.
- **Review cap: 2 rounds** (short-review skill). Round 3 means: fix only blockers and ship, or ask the lead.
- **Owner notes outrank everything** (docs/stories.md, README "Owner decisions"); add a new owner quote there, dated.
- Commit as `git -c user.name=evanlin23 -c user.email=113861384+evanlin23@users.noreply.github.com commit`, on your
  own branch; push `main` only when told.
- Clean up what you made: previews, frames, stills (`work/hb/`), scratch recordings.

## Troubleshooting
| symptom | cause and fix |
|---|---|
| `Timeout waiting for N ticks` in setup | flaky right after the biome teleport (1 in 2-3 tries); run.sh retries 5 times (`--tries`) |
| `COMMAND ERROR: That position is not loaded` in the bot log | a `/fill` before the chunks arrived: `clearSet` waits for them now; wait in your own setup too. The recording still "passes", so look at a sheet |
| render.js exits 2: `stunts/x.js failed to load` | the stunt has an error: `node -e "require('./stunts/x')"`. It used to render silently without hideHand, brightness, fovZoom |
| `hb still` is slow (15+ s a frame) | each still re-lights and re-meshes the world for the blocks and time of day since the last one; a busy box (load > 4) doubles it. Fewer stills, or `hb describe` first. (agent/test-gaps is cutting the re-mesh cost) |
| rec_check says a check was skipped | `node_modules` missing (a fresh checkout): `npm ci` or link it; `hb check` lists skipped checks |
| `apt-get install espeak-ng` can't find it | `apt-get update` first |
| an Actions render takes 40 min | a slow apt mirror on a runner; the setup is cached now (~20 s). `hb render --wait` keeps polling |
| `hb review` refuses: output older than the recording | you re-recorded: render again before reviewing (freshness, docs/qa.md step 4) |
| a v2 story (cast voices) | voiced by hand with `tts.py` until the adapter lands (docs/story_craft.md 6): write `voice/voice.json` |

## Knobs, if you really need them
`hb` covers these; the raw environment variables still work for the scripts underneath:
`FRAMES=`/`ONLY=` (render.js sparse frames/ticks: `hb still`), `CAM=` (`--cam`), `CAM_PROBE=` (cameras as JSON), `SHOTS_JSON=` (try a camera spec), `LOOK_JSON=`/`DAY_TIME=` (movie engine:
`--look`/`--day-time`), `RECORD_ONLY=1` + `REC_CHECK_STRICT=1` (`hb record`), `TRIES=` (`--tries`), `RESUME=1`
(`scripts/resume.sh`), `PREVIEW_FPS`/`PREVIEW_W`/`PREVIEW_JOBS`/`KEEP` (preview.py), `EDIT_EXTRA='{...}'` (try an edit
change in a preview), `STUNT_OPTIONAL=1` (render without a broken stunt module), `PROFILE=1` (render.js timings),
`MESH_WORKERS`, `BRIGHTNESS`, `WEATHER`, `DIMENSION`, `RENDER_DISTANCE`, `SKIN`, `SHOW_PLAYER` (render.js overrides).

## How it's built (for changing hb)
`hb` -> `lib/hb/cli.js` (commands), `lib/hb/scene.js` (a recording without rendering: chunks + block changes,
the POV camera, entities, time, weather, HUD, ray casts), `lib/hb/analyze.js` (describe, continuity, framing),
`scripts/pace.py` (the pacing gate on the mp4: picture motion/cuts at 20 fps, the sound's level, ebur128 short-term
loudness, plus hb_time's marks and story_track's caption chunks), `scripts/hb_time.py` (the Short's clock, from `scripts/preview.py`'s frame plan), `scripts/hb_sheet.py` (labelled
sheets). The movie engine: `hb check` runs `LINT=1` (renderer/lint.js), `hb lint` runs it alone, `hb still`/`sheet`
render its shots and looks, `--look`/`--day-time` pass `LOOK_JSON`/`DAY_TIME`, and describe/continuity/framing read
every camera from `CAM_PROBE=all node render.js <rec>` (one JSON line per tick: mode, position, yaw, pitch, fov).
`scripts/shot_sheet.py` / `scripts/try_shots.py` stay the tools for tuning a camera spec, and `scripts/still.py` for key
art (any camera, look and size).
