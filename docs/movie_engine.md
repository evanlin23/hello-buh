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
| record only | `scripts/record.sh` | run.sh's server + bot half (no Shorts render) |
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

## What's left, in the order BUILD LIMIT needs it
1. **Voices.** The owner disliked the Kokoro narrator. Options in the movie doc: the owner and friends record
   lines, or a directable TTS (the environment has a Gemini API connection) after an audition. Placing a voice
   on a `line` mark is the narration code in `longform_build.py` keyed by line instead of by piece offset.
2. **Poses.** `sneak` is recorded for actors but `renderer/entities.js` `posePlayer` has no crouch yet. Also
   missing: sitting, sleeping, swimming, gliding, eating. Acting needs more than `nod` and `swing`: a head shake,
   a look-away, a step back.
3. **More actors.** `server.properties` has `max-players=4`. Raise it for a bigger cast. Crowds (Drop Day) should
   be Mannequins (the player-shaped mob from 1.21.9; check it exists on 1.21.11 and that mineflayer's
   minecraft-data names it) or NoAI villagers, not dozens of bots.
4. **A saved movie map.** Every run still generates a fresh world and builds the set with commands (the reel's
   ~200 commands take ~45 s). For a 31-scene movie, build Highfall once (structure files and `/place template`, or
   a saved world copied per scene) so every scene shares one world.
5. **Cameras.** Paths are smoothstep per key pair (a stop at every key). Add Catmull-Rom for multi-key moves, and a
   check that keeps a camera out of blocks.
6. **The Below.** The fog sea is only tested from above and falling through. Check it from underneath (the Below's
   ceiling) and in daylight.
7. **The saga's world features:** the world border wall, lightning, hanging signs, banners and heads.
8. **Render cost:** ~0.5-0.8 s per 1080p frame on 4 CPUs. A 45-minute Book 1 is ~15 hours, split by scene across
   workers.

## Decisions waiting on the owner
- Approve the BUILD LIMIT script (the doc's questions section: title, twist 4, voices, chapters, sequel hook, skin).
- Stay on this renderer, or try the real client + Replay Mod (real animations, any number of players, shaders;
  needs the owner's Microsoft account and probably a computer with a GPU). Judge from this reel.
- Book 1 as four ~12-minute chapters, then the full movie, with Shorts cut from it.
