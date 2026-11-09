# Movie engine: handoff (2026-11-08)

Owner, 2026-11-08: build out the movie test reel and document it, "the orchestrator is currently out of usage,
so ensure it is handoffable". The movie is BUILD LIMIT (Claude doc: https://claude.ai/artifact/4BphcbVEduwc4HmV8tbcpJ).
Nothing is voiced or uploaded: the owner wants to approve the script first, and asked for this engine work
alongside it.

**Status:** the test reel (the cold open, scenes 2-3) records and renders end to end: two actors, seven camera
shots, real first-person physics for the fall, and the fog sea. Everything here is on branch
`claude/nice-fermi-0y7ejs`, not `main`. The engine changes are additive: a stunt without `cast`, `shots` or
`fogSea` renders as before (three boat_clutch frames re-rendered: two pixels differ by at most 9 of 255, the
known draw-order specks). Merge to `main` after a look; workers get it on their next pull.

## Run it
```bash
STUNT=movie_reel ./scripts/record.sh                 # server + bots -> work/movie_reel.rec.json (~3 min)
python3 scripts/longform.py plan   episodes/reel     # its marks (shots, lines, fall, slide, fog) in scene time
python3 scripts/longform.py render episodes/reel     # 1920x1080 30 fps -> work/lf/movie_reel.mp4 (~10 min)
python3 scripts/longform.py build  episodes/reel     # + subtitles + the title card -> out/lf_movie_reel.mp4
python3 scripts/qa_landscape.py out/lf_movie_reel.mp4 --step 15
```
Quick looks without a full render: `FRAMES=15,50,80 node render.js work/movie_reel.rec.json /tmp/x 10 960 540`
renders those frames (frame n = n / 10 s at fps 10).

## What's built
| piece | where | what |
|---|---|---|
| actors | `lib/movie.js` `spawnActors` | one extra mineflayer bot per cast member (offline usernames), moved by the recording bot's `/tp NAME`, equipped with `/item`, turned with `lookAt`, `nod`, `swing`, `walkTo` (real physics) |
| actor recording | `lib/harness.js` | other players get `extra = { user, held, sneak }` on every entity row; their arm swings are `ent_swing` marks; `ctx.stunt` is the module |
| actor drawing | `render.js` (ACTOR, actors block in the frame loop) | skin from `stunt.cast[username]` (the jar's wide skins: steve alex ari efe kai makena noor sunny zuri; `cast.self` for the recording bot), body turn and walk from the recorded positions (the same tickHeadTurn and WalkAnimationState as the player's own), the attack swing, the main-hand item, the red hurt flash |
| camera director | `render.js` (SHOTS, shotAt, shotCam) + `lib/movie.js` `shot` | `stunt.shots = { name: spec }`, switched by `shot` marks while recording. Specs: `{ pov: true }`, `at: TARGET`, `path: [[sec, dx, dy, dz], ...]`, `follow: TARGET` + `offset` + `lag`, with `look: TARGET` / `lookPath` / `yaw`+`pitch`, `fov`, `roll`. TARGET = `[dx, dy, dz]` from the set origin, `'self'`, `'actor:NAME'`, `{ of: TARGET, offset }`. A pure function of time: re-tune a camera and re-render, no re-record. Camera shots hide the HUD and hand (`shot` marks `f1_on`/`f1_off`) and draw the player's body |
| fog sea | `renderer/page.js` `makeFogSea` | `stunt.fogSea = { y0, y1, layers, density, fade, color, night }`: stacked translucent sheets (a fog sea from above, a ceiling from below), a white-out when the camera is inside it, colour following daylight |
| dialogue | `lib/movie.js` `line` + `scripts/longform_build.py` `dialogue` | `line` marks `{who, text, dur?}` become white bottom subtitles in the 16:9 build. Voices go on the same marks later |
| the look | `renderer/page.js` makePost / runPost, `stunt.look` | `{ grade, bloom, bloomThreshold, vignette, grain, letterbox, dof, shadows, rays }`: renders into an off-screen target, then bloom, depth of field and one finishing pass. Costs ~0.25 s a 1080p frame (bloom and grade ~0.15, depth of field ~0.1). `LOOK=0` renders without it, `NO_DOF=1` without depth of field, `LOOK_JSON='{...}'` tries a look on any recording, `DAY_TIME=n` renders at another hour |
| acting | `lib/movie.js` | `nod`, `shake`, `lookAway`, `point`, `stepBack`, `walkTo`; `shotIn(ctx, name, ticks)` cuts a few ticks into an action; render.js adds idle life (head drift while standing), a talking head while that actor's line is up (`selfName` for the POV character), and the crouch pose |
| extras | `/summon minecraft:mannequin ... {CustomName:"Mira"}` | drawn as players with `cast[name]`'s skin, idle life included |
| cameras | render.js `shotCam` | Catmull-Rom paths through several keys, `orbit`, a camera pulled out of any block, handheld `drift` (default 1) |
| shot sheet | `scripts/shot_sheet.py rec.json [out.jpg]` | one labelled frame per shot in ~30 s, the look included: check cameras before a full render |
| record only | `scripts/record.sh` (`KEEP_WORLD=1` keeps the world) | run.sh's server + bot half (no Shorts render) |
| local scenes | `scripts/longform.py` (`"local": true`) | a segment from `work/<name>.rec.json` with its stunt module's own `edit` block, instead of a `videos` package |
| the reel | `stunts/movie_reel.js`, `episodes/reel/` | the BUILD LIMIT cold open (see the file header for the set and the trick) |

### How the reel's set works (copy these tricks)
- **Over deep ocean** (`biome: 'minecraft:deep_ocean'`), with the fog sea from y 60 to 140 hiding the water:
  no terrain is cut, so no "cut hillside" findings at all.
- **`/tick freeze`** in setup: fluids and mobs stop, players still move. One block of water stays one block.
- **One command per beat at speed:** the Well slides with `/clone ... replace move` sent with `bot.chat` on a
  physics tick (`ctx.cmd` waits 4 ticks, and at terminal velocity that's 15 blocks).
- **The fall is steered** onto the Well with `lib/air_steer.js` (from one_in_a_million): it passed 0.01 blocks
  from the target, so the slide exposes the gap beside the Needle every time.
- **Sneak on the plank** so the walk to the edge can't fall off; then hold forward until he actually drops
  (three ticks left him balanced on the edge, his box still 0.08 blocks over the plank).

## Making a scene (the worker recipe)
The goal is a scene that's right on its first render. Every re-take on reels 1-2 was something a tool now catches
or prevents (see "Shots an agent can trust" below), so follow the loop and trust the lint.
1. Copy `stunts/movie_reel.js` (night, a built set, two actors, a fall) or `stunts/movie_below.js` (dawn, terrain, a
   camp of Mannequin extras). Set `cast`, `selfName`, `shots`, `look`, `fogSea`, `idleLife: true`, and for a
   conversation `coverage: { line: ['self', 'actor:NAME'], side: 'south' }`.
   Natural terrain: `./scripts/scout.sh` first and set `near: [x, z]` (the seed is fixed: the plains nearest spawn
   is a quarter snow).
2. `setup`: build the set (`/tick freeze` if water or fire must stay put), spawn the actors (`M.spawnActors`), place
   and equip them, summon the extras, put the POV character at their start.
3. `perform`: start the motion first, then cut (`M.shotIn(ctx, name, ticks)` lands a cut a few ticks into an action).
   Dialogue with `await M.say(ctx, who, text)`: it acts the line (speaker turns and nods, listeners turn to the speaker
   and nod) and waits its reading time. `M.track(actor, () => point)` keeps a head on someone walking away.
   A set piece the viewer must see: `M.slideBlocks` (blocks glide instead of popping) plus
   `ctx.mark('beat', { at: [x, y, z], size: 1, what: 'the Well' })` so the lint checks it's big enough on screen.
4. Shots: prefer the auto-framed ones (`{ two: [A, B] }`, `{ ots: S, over: A }`, `{ single: S, toward: A }`): no
   coordinates to tune. Hand-placed cameras (`at`, `path`, `follow`) for establishing shots and set pieces; add
   `subject: ['self']` so the lint checks them.
5. `./scripts/scene.sh <name>`: records, lints, makes the shot sheet. Fix every PROBLEM. Camera-only fixes:
   `NO_RECORD=1 ./scripts/scene.sh <name>`; try framings on the recording with `scripts/try_shots.py` (about 30 s).
6. Add it to an episode (`"local": true`), `longform.py render`, `build`, `qa_landscape.py`, and an independent review
   with `docs/movie_reviewer_prompt.md`. Fix, then re-render.

### Shots an agent can trust
| Tool | What it does | Why (the re-take it removes) |
|---|---|---|
| `renderer/framing.js`: `two`, `ots`, `single` shot specs | the camera is placed from where the actors stand at the shot's start (or every frame with `anchor: 'live'`), on the `coverage.side` of the line, swung or raised until nothing solid or no other actor is between it and the faces; sizes close / medium / wide | cameras inside roofs and behind posts, a head hiding the other actor, the 180-degree line crossed (reels 1-2) |
| `LINT=1 node render.js work/<s>.rec.json` (`renderer/lint.js`) | replays the recording through the render's own cameras and block changes: camera in a block; subject hidden, covered by an actor, out of frame, under the letterbox, too small; line crossed; same-framing cuts; shots too short or frozen; nobody moving for 1 s+; `beat` marks too small to see; lines across cuts. Exit 1 on problems | every finding of review v2 that geometry can answer, before a 15-minute render |
| `M.say(ctx, who, text, { to, gesture, hold })` | a line with its acting, timed to its reading time | dialogue shots where nobody moved |
| `M.track(actor, pointFn)` | a head that follows someone | the Highkeeper stared at the deck while Ash walked out |
| `M.slideBlocks(ctx, box, by, names, ticks)` + render.js `slide_blocks` | blocks moved by `/clone ... move` glide over `ticks` | the Well's slide was a 2 px pop |
| `scripts/try_shots.py REC '{json}' --at SEC` | candidate cameras on an existing recording, one sheet | re-recording to move a camera |
| `scripts/scout.sh` (`stunts/scout.js`) | ranks `near` start points per biome: green, cold, water, height spread | the snowy plains under the Below |
| `scripts/scene.sh <stunt>` | record, lint, shot sheet in one go | forgetting a step |
| `look.handLift`, `fogSea.night` | a first-person item readable at night; a moonlit fog sea | the empty bucket read as a dark sleeve |

**Cinematography rules** (what the reviewers check):
- Every shot opens on motion: an actor already moving, or the camera already drifting. Never a still cast.
- Change the shot size at every cut (wide, medium, close). Two cuts in a row on the same framing read as a jump cut.
- Two people talking: keep every camera on one side of the line between them (the 180-degree rule). Over-the-shoulder
  shots sit behind the listener with the speaker in focus.
- Hold a shot 2-5 s and cut on action (a turn, a step, a hand-over).
- Eyes on the upper third of the frame, with room in front of a face or a walk.
- A cut that hides a teleport is fine; a teleport inside a shot is a pop.
- First-person (POV) shots carry the clues that live on the HUD (the empty bucket); camera shots carry the acting.

## Roadmap (step by step; [x] done, [ ] to do)
Owner, 2026-11-08: "did a full step by step for the roadmap for what we need to build out, and then build it out
please and audit". And on the story Shorts: "the scenes would start with everyone motionless, then perform the
motion, but i dont think there should be that pause". Each phase ends with a reel that proves it and an audit.

**Phase 0: the foundation**
- [x] 0.1 Actors: extra bots, recorded and drawn with skins, walk, body turn, swing, held item
- [x] 0.2 Camera director: shots switched by marks; at / path / follow / look; POV shots keep the HUD
- [x] 0.3 Fog sea
- [x] 0.4 Dialogue marks and subtitles; record-only script; local scenes in longform.py
- [x] 0.5 Reel 1 (the cold open) and its audit (below)

**Phase 1: no dead frames** (the owner's note)
- [x] 1.1 Idle life: standing actors and mobs keep breathing (slow head drift, the vanilla arm bob), deterministic per entity
- [x] 1.2 Talking: a speaking actor's head moves with their line (a small pitch and yaw rhythm while the subtitle is up)
- [x] 1.3 Handheld drift on camera shots (spec `drift`, on by default, `drift: 0` for a locked-off shot)
- [x] 1.4 Scenes start mid-action: a scene's actors move before its first shot mark (lib/movie.js `preroll`);
      story Shorts: the same rule, written up for lib/story.js (their cast are no-AI mobs whose first move is late)
- [x] 1.5 Subtitles timed to their text (reading speed), not to the next line

**Phase 2: acting**
- [x] 2.1 Crouch pose (actors and the player seen from outside); recorded already
- [x] 2.2 More gestures in lib/movie.js: head shake, look away, point, step back, turn to camera
- [x] 2.3 Mannequins for extras and crowds (1.21.9+ mob; in minecraft-data 1.21.11): summoned, moved by /tp,
      drawn as players with skins from stunt.cast by their name

**Phase 3: cameras**
- [x] 3.1 Catmull-Rom paths through several keys (no stop at every key)
- [x] 3.2 Orbit shots (`orbit: TARGET, radius, height, degPerSec`)
- [x] 3.3 Cameras never inside a block (pulled toward the subject)
- [x] 3.4 `scripts/shot_sheet.py`: one low-res frame per shot, labelled, in a minute (camera checks before a full render)

**Phase 3b: the cinematic look** (owner, 2026-11-08: "can we make it more cinematic? like the renderer")
- [x] 3b.1 Post chain in renderer/page.js (`stunt.look`): bloom, colour grade presets (night, dawn, day, neutral, or
      your own lift/gamma/gain/sat/contrast/exposure), vignette, film grain
- [x] 3b.2 Letterbox bars on camera shots (`look.letterbox: 2.39`); POV shots stay full frame for the HUD
- [x] 3b.3 Depth of field on camera shots (`look.dof`, per shot `dof: false | { aperture, focus }`), focused on the
      subject a shot follows or looks at; gathered at half size (~0.1 s a 1080p frame)
- [x] 3b.4 Sun and moon shadows (`look.shadows: true | { radius, size, strength }`): a 2048 shadow map over the block
      sections, re-rendered only when blocks change, the time changes or the camera crosses a 16-block cell (a still
      scene pays once). Strong in the morning and afternoon, nothing at noon (straight down) or at the horizon (dawn
      scales it to ~0), faint by moonlight. Next: entities cast shadows too (needs a per-frame pass for movers)
- [x] 3b.5 God rays (`look.rays: 0.5-1`): the sun's glow streaked past whatever is in front of it, quarter size. Subtle by
      design (the whole sky as the source washed a clear day out white); strongest with the sun low and partly hidden
- [ ] 3b.6 Motion blur on fast moves (the fall): render 2-4 sub-frames and average them, on marked spans only

**Phase 4: worlds**
- [x] 4.1 `KEEP_WORLD=1 scripts/record.sh`: keep the world between scenes; movie sets built once
- [ ] 4.2 Reel 2 (the Below, scenes 16-17): the fog from inside and below, daylight, terrain, a ladder descent, an actor fishing
- [ ] 4.3 Later, for the saga: the world border wall, lightning, hanging signs, banners, heads

**Phase 5: voices and sound**
- [x] 5.1 Voices on line marks: `longform.py lines` writes lines.csv (who, text, timing, file name); the build places
      `episodes/<ep>/lines/<scene>_<n>.wav` on its mark, ducked like narration. The voices themselves wait on the owner
- [ ] 5.2 Auditions for the owner (a few voices per character on 3 lines), only once he picks a route
- [ ] 5.3 Music bed per chapter (exists in longform_build)

**Phase 6: production**
- [ ] 6.1 Scene breakdown: the 31 scenes as stunt modules (set, cast, shots, beats), split into worker jobs
- [x] 6.2 Shorts from scenes: `scripts/scene_short.py <stunt> --from EV --to EV --caption ...` re-renders a window in
      the Shorts layout from the same recording (its cameras and look, no letterbox)
- [ ] 6.3 Per-reel QA: qa_landscape.py, a shot sheet, and an independent reviewer agent (docs/reviewer_prompt.md)

## Reel audits
**Reel 1 (cold open), v1, 2026-11-08:** works end to end: two actors with their own skins and the bucket, seven shots,
the subtitles, the fall steered past the Needle (0.01 blocks off), the fog. Problems: the first 1.5 s are Ash standing
still (the owner's pause); the wide shot is a speck of tower for 4 s; the two-shots are far and the gold rim fills
their foreground; "Four." stays up 3 s; the walk-out camera passes through the Highkeeper's head.

**Reel 1, v2 (independent review, docs/movie_reviewer_prompt.md): not ready.** Blockers: the Well's slide was a 2 px
pop 30 blocks away; the empty bucket read as a dark sleeve at night; a navy frame as the eye grazed the Well. Plus dead
dialogue, a broken hand-over, the 180-degree line crossed, no sense of height, black night clouds.
**Reel 1, v3 (out/lf_movie_reel.mp4):** all three blockers fixed (slideBlocks + slow motion, look.handLift, aim 0.75
off the Well), coverage on one side, the edge shot over the plank, "Which floor?" / "Forty.", look.cloudNight. Its
dialogue predates M.say, so the lint still flags 2-9 s as still: re-stage it with M.say when the cold open is redone
for draft 2.1 (the Well should blink, not glide: dispensers).

**Reel 2 (the Below), v1-v3 (out/lf_movie_below.mp4):** v1 opened on 2.2 s of white, was set on snowy plains, held a
3 s frozen two-shot at the end and framed the reveal on a house wall. v2: Ash walks Buh into the camp (M.say,
coverage), but the camp sat in a pit (the plains rolled 50-97); an 80x80 flatten made a quarry. v3: a flat sunflower
plain found with scripts/scout.sh (near [2400, 0]), the fog fading out of its floor, fog sheets fading as the camera
crosses them, the white-out ramping from the full distance. Lint clean; QA flags only the four cuts.

## Decisions waiting on the owner
- The script is being rebuilt for about 60 minutes (owner: "we should be aiming for the 1 hour length mark"; "do the full
  overall story arc first with acts"). Draft 1 (20 min) went through a blind audit (docs/blind_audit/); the one-hour
  arc is the doc's "Draft 2" tab, in round-2 blind audit now. Owner choices listed there: Rook for Dace, the climax
  (stone MLG vs taking the empty bucket), Hollis, how dark the Cradle rule is. Then the screenplay, chapter by
  chapter, each audited before the next.
- Approve the BUILD LIMIT script (the doc's questions section: title, twist 4, voices, chapters, sequel hook, skin).
- Stay on this renderer, or try the real client + Replay Mod (real animations, any number of players, shaders;
  needs the owner's Microsoft account and probably a computer with a GPU). Judge from this reel.
- Book 1 as four ~12-minute chapters, then the full movie, with Shorts cut from it.
