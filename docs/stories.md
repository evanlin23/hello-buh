# Story Shorts: narrated, ridiculous first-person Minecraft stories

The owner (2026-11-06): "can we try to ridiculous stories? like the roblox stories (blocky-stories) but with
minecraft instead?" A story Short is a 40-75 s first-person story, told by a fast narrator with big word-chunk
captions, over scenes the bot acts out on the real server. The renderer is POV only, so the narrator is the
camera, and that is the format's best trick: the viewer never sees who "I" am (pilot: `runaway`, where the
narrator turns out to be the creeper).

## Make one
**Write it first:** `/story-write` (`.claude/skills/story-write/SKILL.md`) takes a story from ten pitches to a
script with a voiced cast, a shot list and a continuity bible, checked by the `story-critic` and `story-continuity`
agents and a cold reader, before anything is built. Craft guide: `docs/story_craft.md`.
The build steps below are `./hb` commands, with time estimates, in `docs/agent_guide.md`. Before any render, `./hb check`,
`./hb framing` (shot sizes: the owner's "too zoomed in") and `./hb continuity` (time, cast and props across cuts) read
the recording in seconds, and `./hb describe <stunt> L05` tells you what a moment shows without rendering it.
```bash
# 1. the script: stories/<name>/story.json (lines, chunks, key words), see stories/put_back
# 2. the narration (Kokoro TTS venv, CPU only, set up once per container: see Setup)
~/.hb-tts/bin/python scripts/voice.py stories/<name>        # -> stories/<name>/voice/<id>.wav + voice.json
# 3. the scenes: start from the template, then fill in one set per scene and one block per line
cp stunts/_story_template.js stunts/story_<name>.js          # replace every <name>
STUNT=story_<name> REC_CHECK_STRICT=1 ./run.sh             # -> out/story_<name>.mp4; stops before the render on a rec_check blocker
#    (or record here and render on Actions in 12 slices: docs/worker.md "Render on GitHub Actions")
# 4. QA (docs/qa.md) as for every Short, then
node scripts/publish.js story_<name> --pass
```
**Run rec_check before rendering; fix blockers by re-recording.** Story Shorts took 4-12 review rounds, each a full
render, and most findings were in the recording: the aim snapping a tick after a cut, the sneak dropping for a tick
at a cut (a `stopAll()` before the teleport: the eye height bobs 0.2 blocks into every shot), two jumps in one cut,
a time-of-day change a tick off its cut, held pauses, a long tail. `run.sh` prints the report after the recording;
by hand: `python3 scripts/rec_check.py story_<name>` (docs/worker.md has the list of checks).

Re-run `voice.py` after any script change (`--only L03,L07` redoes single lines), then re-run the stunt: the scene
lengths come from voice.json, so a new voice means a new recording.

**Use the kit, don't re-write it.** `stunts/_story_template.js` is a working skeleton (setup, a cast, two lines, the
ending) on `lib/story.js`. Every story so far hand-rolled the same helpers (`c`, `A`, `vil`, `go`, `setTime`, `ease`,
`yawOf`, `tp`, `groan`, `setMeter`, a wrapped `line`, a wrapped `cut`); they are all in the kit now:

| want | kit |
|---|---|
| build in `setup` | `const { c, A, P, mob, vil } = setKit(ctx, { X, Z, F })`: `mob(type, dx, dy, dz, yaw, tags, nbt)`, `vil(dx, dz, yaw, prof, tags, { type, y })` (NoAI, silent, invulnerable, persistent) |
| a clearing | `clearSet(ctx, A, 64, top)` (also sweeps the gravel and sand a cut hill leaves hanging: `clearHanging`), `plainsBiome`, `resendChunks`, `house` |
| a cut | `await K.cut(dx, dz, target, dy, { time, during, after, stop })`, or `K.cutTo(dx, y, dz, target)` with an absolute y. Arrives aimed; waits for the landing (position and angle: a cut on the spot works); the old shot keeps swaying while it lands; movement keys released (sneak kept); `time` changes the light on the cut's own frame |
| a line | `await K.line(id, (k, at, n) => {...}, extra, { tail })`; `K.preroll(10, fn)` for motion already going on the first frame; `K.T(id)` = a line's ticks |
| the camera | `K.look(k)` every tick (sway on the recording clock), `K.base = K.aim(p)`, `K.turnTo(from, p, u)` (eased, clamped) |
| the cast | `K.actor(tag, {x, z, yaw})` (a mob /tp'd every tick from the object; `K.step(a, dx, dz)` walks and faces it, `K.bury(tag)`), `K.tp(tag, dx, dy, dz, yaw)`, `K.flee(tag, speed)`, tag idle mobs `warm` (nudged every tick), `K.every(fn)` for ambient motion |
| the rest | `K.go(on)`, `K.ctl(key, on)`, `K.stop()`, `K.setTime(n)` (no 4-tick stall), `K.setMeter(v)`, `K.groan()`, `K.knockback(() => attackerPos)` (mineflayer drops hit knockback on 1.21.11), `K.dig(block)` (vanilla dig speed; mineflayer's is a bare hand's), `ease`, `mcYaw` |

## Cinematic stories (the default look from 2026-11-10)
Owner, 2026-11-10: "I feel like the cinematic should be the default." The movie engine (docs/movie_engine.md) is on
main, so a story stunt gets it by exporting a few fields; nothing else in the pipeline changes (voice.py, edit.py
--story, rec_check, preview.sh, render_on_actions.sh all work as before). Pilot: `story_good_boy`.
```js
look: { grade: {...} | 'dawn' | 'night', bloom: 0.5, vignette: 0.38, grain: 0.02, dof: { aperture: 0.9 }, shadows: true, rays: 0.5 },
shots: { pov: { pov: true }, est: { path: [[0, dx, dy, dz], [2.4, ...]], lookPath: [...], ease: true }, ... },
self: { model: 'wolf', eye: 0.68, extra: { tame: true, collar: 14 } },   // only for a narrator who isn't a player
hud: false,                                                               // ...who has no HUD either
```
- **The look on every frame** (POV too): grade, bloom, vignette, grain, sun shadows, god rays. No letterbox (the game
  view is the frame). Depth of field applies to camera shots. Costs ~0.25 s a frame at 1080: fine on Actions.
- **Camera shots** with `K.shot(name)` (lib/story.js): from this tick the picture is `stunt.shots[name]`, a pure
  function of time, so a camera is re-tuned and re-rendered without re-recording (`scripts/shot_sheet.py` for one
  frame per shot in ~30 s, `scripts/try_shots.py` for candidates). `K.shot('pov')` goes back to first person.
  Camera shots hide the HUD and draw the narrator from outside (the player with `cast.self`'s skin, or
  `stunt.self.model`). Specs: `path`/`lookPath` (cranes, pull-outs), `follow` + `offset` + `lag`, `orbit`,
  `at` + `look` (+ `push`), the auto-framed `two`/`single`/`ots` (movie_engine.md has them all).
- **Which shots, when** (from the pilot):
  - POV carries the narrator's experience and the mystery (what "I" see, the low eye, the clues that live in the
    first person). Camera shots carry the world and the truth: the establishing crane, the follow, the night wide.
  - **The camera can show what the narrator can't.** In good_boy every camera shot shows the "dog" beside the guy:
    that's the narrator. The POV hides who I am, the cameras show it all along, and the reveal is the first shot
    that starts inside my head and pulls out (`reveal`: a path whose first key is the POV eye). Rewatchable.
  - An establishing shot after a run of POV lines resets the viewer (where we are, what time it is); a camera shot
    on a story beat (the zombie hits him) reads better than POV, which can't see the hit.
  - Keep camera shots 1-3 s, one per line at most; the 9:16-ish game view (1080x1011) is nearly square: frame two
    subjects side by side or one big; keep the faces in the upper half (the captions sit at 70%).
  - Cuts between POV and camera shots are free (the camera director switches on the mark's tick), but the cast
    still has to be in place before the shot's first frame: move them in the line before, or with a >64-block hop.
- **rec_check** skips its POV checks (cuts, held, turns, set) inside camera shots and says so; check those cameras
  with `LINT=1 node render.js work/<name>.rec.json` (camera in a block, subject hidden or too small, frozen shots).
- **A narrator who isn't a player** (`stunt.self`): `eye` puts the POV camera at that height (a wolf 0.68, sitting
  0.5), `model`/`extra` draw them in camera shots; `K.self({ sitting: true }, 0.5)` changes it on a word.
  The wolf model is Java-accurate (sitting, tail, tame/angry eyes, dyed collar); other mobs draw from their
  converted models.
- **Channel art and thumbnails** from any recording: `scripts/still.py REC out.png --at S --size WxH --shot '{...}'
  [--look '{...}'] [--time N] [--ss 2]`, text with `scripts/channel_art.py`.

## Setup (once per container)
```bash
apt-get update && apt-get install -y espeak-ng   # Kokoro's phonemizer for unknown words (a fresh container's apt lists are empty)
python3.11 -m venv ~/.hb-tts
~/.hb-tts/bin/pip install --extra-index-url https://download.pytorch.org/whl/cpu torch kokoro soundfile numpy
```
CPU torch only (no CUDA download). The first run fetches the Kokoro-82M weights (Apache 2.0) and spaCy's small
English model. A 17-line story synthesizes in about 30 s on 4 CPUs.

## How it fits together
| piece | file | what |
|---|---|---|
| script | `stories/<name>/story.json` | `lines`: `{"id": "L03", "text": "I tell / the farmer / his wheat / looks GREAT."}`. ` / ` splits caption chunks (2-3 words), CAPS words are key words (drawn in `key_color`, read lower-case so Kokoro doesn't spell them). `gap`: seconds of air after each line. |
| narrator | `scripts/voice.py` | Kokoro `am_adam`, tempo 1.03, sped up 1.45x (pitch up with it): the blocky-stories narrator, ~290 wpm. Writes each line's wav and `voice.json` (each line's `dur`, and every chunk's start/end from Kokoro's word timestamps). |
| kit | `lib/story.js` | `storyLines(dir)`: `line(id).dur`, `line(id).at(k)` (tick where chunk k starts), `gap`. `storyKit(ctx, S, {X, Z, F})`: cuts, lines, the camera, the cast (table under "Make one"). `setKit` for `setup`. Set helpers: `clearSet(ctx, A, 64)` (a wide flat clearing, hanging gravel swept), `plainsBiome(ctx, A)` + `resendChunks(ctx, X, Z)` (one grass colour; mineflayer needs the chunks again), `house(...)` (a real lit room). |
| scenes | `stunts/story_<name>.js` | sets every scene up front in `setup` (all mobs NoAI, tagged per scene), then for each line: a cut (teleport), `ctx.mark('line', { id })`, and a per-tick scene function for exactly `dur + gap` seconds. Actions land on a chunk with `at(k)` ("They SLAM" closes the door on that word). |
| edit | `edit.py --story stories/<name>` (from `edit.story`) | lays each line's wav on its `line` mark (snapped to the camera cut), draws the captions (`scripts/story_track.py`), and mixes: voice -15 LUFS, game -27, song bed -31, master corrected to -14 LUFS. Optional: a rule meter (story.json `"meter": {"label": "VILLAGERS"}` + `ctx.mark('meter', { value })`), white flashes (`ctx.mark('flash')`). |
| stunt options | top level of the stunt module | `hideHand: true` (no first-person hand: a narrator who isn't Steve), `time`, `weather` ('rain'/'thunder'), `brightness`; mid-stunt `ctx.setTime(n)`, `ctx.setWeather(w)`. Set `/gamerule log_admin_commands false` for per-tick `execute as` moves. |
| song | `scripts/add_song.py` (via publish.js) | for a story stunt the NCS track is a quiet bed under the voice (-31 LUFS), not the -13 lead the stunt Shorts use. |

Captions: Schibsted Grotesk Black (OFL, `assets/fonts/`) at 96 px, white with a dark outline and a soft shadow,
key words in the story's colour, centred at 70% of the game view's height (under the crosshair, above the
hearts), each chunk popping in on its own first word. The top band keeps the channel's caption (the hook).

## House rules (from blocky-stories RULES.md, the ones that transfer)

- **Owner, 2026-11-10: "The voice is definitely an issue. And also the sets. I think we can be more creative with the
  story telling, and better with the delivery and the plots and using other voices for the other characters. I think
  we don't necessarily need to use this sped up voice. this voice i dont think does a good job of playing different
  parts."** So, from now on: a cast of voices (narrator plus a distinct voice per character, e.g. Gemini TTS
  multi-speaker with acting direction, as the AI-dilemma Shorts do), no 1.45x sped-up narrator by default, real
  delivery (emotion, pauses, emphasis), built sets that look designed (not a clearing in the wild), and plots with
  more invention. The cinematic engine (shots, looks) is the direction for the look.
- **Owner, 2026-11-10: "i think i kinda believe in this sort of storytelling minecraft thing. it feels somewhat
  serious, and if we can do actual voices and make it seem super professional and high quality, that would be
  amazing."** This is the channel's direction: serious, professional, high-quality Minecraft storytelling with real
  character voices. Judge every story against a polished animated short, not against other Minecraft Shorts.
- **Owner, 2026-11-10, on the stories so far:** "Like the creeper was good. i think the respawn tax is somewhat mid. I
  like the sheep thing (at least it feels like a mystery, I was hooked, the delivery was just kinda bad). Like the sheep
  worked bc its like why tf is this sheep staring at this block? I also think we need to work on like continuity and
  stuff. And also stuff might be too zoomed in at times? Theres just a ton of micro and macro to work on." So: the
  hook is ONE strange, concrete image that makes the viewer ask "why?" (a sheep staring at a block); the twist must
  re-explain everything (the creeper); fix continuity (props, time of day, positions, who is where across cuts);
  use wider shots so the viewer sees the place and the action, not just a close-up. Craft guide: docs/story_craft.md.
- **Owner review, 2026-11-10 (22 notes on the review page, all six published stories).** Patterns, now hard rules:
  1. **Superflat is banned** (8 notes: "the hill is just a 3x3 and the rest is super flat", "the library's store seems
     to be right next to the hill"). Sets are built into real terrain with relief and depth; places that are far apart
     in the story are far apart on screen.
  2. **Look at what the line names** ("when we say 'another torch' we should look at the torch not around it", "why
     are we staring down instead of at the librarian's face"): the named subject is in frame, near centre, readable.
  3. **The picture never runs ahead of the words or contradicts them** ("when we say 'dug under it' we are already in
     the hole", "why do we start falling without us digging?", "you dig straight down when you say 'never dig straight
     down'").
  4. **The plot must survive "why?"** ("this story don't make sense, wtf does it even mean?", "why would grampa say to
     do that if the main character is the one that's slow", "why does he even think he's the one who pulled the lever"):
     every character's action has a reason the viewer can state; the critic interrogates every line with "why?".
  5. **Delivery** ("too quickly delivered", "the voice's delivery doesn't work"): no sped-up narrator; acted voices from
     voices/cast.json; key lines get room (a pause before, slower pace); "who do you trust" style lines land slowly.
  6. **No glitches** ("the door closes automatically", "we keep getting stuck on the door", "it looks like it's
     glitching", "there's no fog" in the fog story): what the title promises is on screen.
- **Owner, 2026-11-10: "the sets are all so small, and in a superflat, so when we watch it looks really bad and low
  effort."** Sets must feel like a real, lived-in world: built at full scale on natural terrain (hills, trees, water,
  a real village or a big build), with depth in every shot (something in the foreground, the mid-ground and the
  distance), never a few blocks on a flat cleared plain. `clearSet`'s wide flat clearing is the look to avoid: pick a
  site that already looks good (`scripts/scout.sh` on the movie branch; or a generated village) and build into it,
  or build a big set (structures, paths, fields, lighting) that fills the whole frame out to the fog.
- **Owner, 2026-11-10: "our builds are not particularly good looking or creative, are there guidelines online about
  good minecraft building we could look at?"** Every set follows `docs/building_guide.md` (depth, pitched roofs with
  overhang, foundations into the terrain, a style palette, landscaping, building for the camera) and scores 7+ on its
  checklist before recording. Sources: `docs/research/building_research.md`.

- **Owner, 2026-11-10: "the creeper story is much better than the current one. bc you can't really 'Trip' in
  minecraft, so it just looks like him intentionally walking into the lava."** (respawn_tax vs runaway.) Every
  accident needs a cause the viewer can SEE and that exists in the game: knocked in by a creeper blast or a mob hit,
  a block breaking under you, falling through powder snow or a trapdoor, an arrow, lag. Never "I tripped", "I
  slipped", "I fell asleep" played as the bot simply walking in. If the bot has to walk into danger, the story
  must say why it chose to. The creeper story (runaway) is the bar: one simple premise and a twist you can rewatch.
- **The first line is a concrete mystery or threat to me, with something countable** ("All FOURTEEN villagers
  in my village RUN when they see ME."), over the picture it describes, in the first second.
- **The twist turns the whole story over,** planted at least twice where a rewatch catches it, and said plainly
  in one short line, or shown by the game itself. Owner, 2026-11-07, on runaway: "the big reveal ... just boom,
  ending ... don't say I'm the creeper, it's just the explosion." So the creeper twist ends on the blast and the
  death message "blown up by Creeper" (held ~1.3 s to read, the world pushing in behind it), no spoken reveal after it. The POV
  camera is the twist machine: who "I" am is never shown.
- **The last line loops into the first:** as one sentence, or as cause and effect (runaway now ends "...when I'm
  HAPPY?" [BOOM] -> "All FOURTEEN villagers RUN when they see ME").
- **Something new on screen every 1-2 s, nothing still over 1 s.** One scene per line, a cut on almost every
  line, and inside each scene the camera sways, walks or turns and the cast moves on the line's key word.
- **One quotable line** that's short enough to type ("Even the CHICKENS pack up and LEAVE.").
- **Write like a person:** short sentences, no em dashes or semicolons, US English, no AI words. Fiction,
  never "true story". Nothing aimed at kids in the title or description.
- **Captions 2-3 words, key words in CAPS and colour,** never more than two lines.
- **Leave 0.2-0.3 s between the last word and the end** so the loop cut lands clean.

## Staging lessons (pilot)
- Every scene is built and cast in `setup` and the per-line code only moves things, so a cut costs 1-3 ticks.
  Cast mobs are `NoAI:1b,Silent:1b,Invulnerable:1b` and moved by `/tp` every tick (ops aren't chat-limited).
- Run away from the camera: `execute as @e[tag=T] at @s facing entity <bot> feet rotated ~180 0 positioned ^ ^ ^SPEED
  run tp @s ~ <y> ~ facing ^ ^ ^5`. The recorded yaw follows, because the mob moves every tick.
- Entity moves reach the client a few ticks late: start a scene's motion ~10 ticks before the line's mark if it
  has to be moving on the first frame.
- **mineflayer doesn't move passengers:** a villager riding a boat stays where it mounted in the recording.
  Teleport the boat and the "passenger" side by side instead.
- `face_on` windows are sequential (one open at a time): `face_off` before the next `face_on`.
- A summoned TNT with `fuse:0s` at the camera gives "HelloBuh blew up" on the death screen (a creeper would
  say "was blown up by Creeper"). Set `/difficulty normal` before summoning a creeper, or it's refused.
- No block entities render (beds, bells, chests, signs): build sets without them.
- Cuts carry their aim in the `/tp` (`storyKit.cut` does it); never look before the teleport lands. Keep sneak (and
  any other key the next shot needs) held through the cut (`K.cut` does): a stunt that clears its controls before the
  teleport stands the camera up for a tick and it eases back down on screen. `scripts/rec_check.py` flags both.
- A time-of-day change belongs on the cut's own frame: `K.cut(..., { time })` (set before, the new sky showed on the
  old shot; marked after, it came a tick late). Don't use `ctx.setTime` mid-scene: its 4-tick wait freezes the shot.
- Hits on the bot need `K.knockback` and digs need `K.dig`: mineflayer drops the knockback and times digs as a bare hand.
- Pre-roll motion that must start on a word (mobs idle for a while update ~1 s late), keep the camera out of
  crowds, and set `/gamerule log_admin_commands false` for per-tick `execute as` moves.
- Captions switch on the cut. A death screen needs something moving behind it.
- Chickens render broken and boats draw ~1.1 blocks high (both reported); see docs/lessons.md "Story Shorts".
- Move cast between scenes with a >64-block hop (`put`): shorter teleports glide on camera like the vanilla client.
- After a death, the next shot can be the respawn itself: `/spawnpoint` there with yaw and pitch before the death.
- Don't put a death on a teleport's landing tick; carry aims as numbers on every `/tp`.
- `punch` nth counts from 0. A push-in on the payoff word keeps a death-screen ending moving.

## Premise bank: mysteries (owner 2026-11-06: "I think we should focus a lot of mysteries")
Each one: **a mystery stated plainly in line 1, clues that build, a twist that makes every clue click, a sting, and
a last line that loops into line 1.** Original premises only. Never remake the owner's examples (the coma town, the
repeating birthday, the mirror showing tomorrow). No coma or dream twist, no door to the past.
**Claiming:** put your worker number in the status (`building: worker 8`) and push before you start. One premise,
one worker. When it ships, mark it `made` with the Short's name.

| # | premise | hook (line 1) | clues | twist | sting / loop | status |
|---|---|---|---|---|---|---|
| 1 | **Respawn Tax** | "Every time I respawn, one villager in my village disappears." | a VILLAGERS meter counting down; empty doorways; the librarian keeps giving me bread "just in case"; the iron golem always stands on my spawn | they volunteer: a respawn costs one life, and the village has paid for mine since I was born; the golem keeps the line | the last one left is the librarian who raised me, already on my spawn; I die again; "go on. Respawn." loops into line 1 | building: worker 5 (`respawn_tax`) |
| 2 | **The First Player in 3,000 Years** | "The farmer has harvested the same wheat for 3,000 years. Today he dropped his hoe and cried when he saw me." | villagers frozen mid-step until I get close; cobwebs in every house; a road that ends in fog | a world only runs while a player is in it; nobody has loaded this one since its maker left, and the village has been stuck in one tick | I have to log off; they freeze mid-wave, waiting again | next: worker 5 |
| 3 | **The Sheep That Stares** | "My sheep has stared at the same dirt block for 412 days." | the block won't break; villagers call me "the new one"; torches I never placed | that block is where the last player died; I'm his respawn after the world forgot him, and the sheep was his | I dig: his things, my name on them | open |
| 4 | **The Chunk Next Door** | "Every night the chunk next to my house unloads, and something walks out of the fog." | footsteps at render distance; my trades get done for me; the golem lets it pass | it's my best friend who quit two years ago; players who stop logging in wait at the edge of render distance | I log out: now I'm the one in the fog | open |
| 5 | **Every Block I Place** | "Every block I place, a villager forgets one thing." | a ridiculous castle going up; villagers forgetting jobs, names, the way home | the last block makes my mom forget me | I start breaking the castle one block at a time | open |
| 6 | **The Torch I Didn't Place** | "There's a torch on the hill behind my house. I don't remember placing it." | under it, another torch; under that, another; 40 of them in a column going down | each one is mine: every time I die I forget, and every time I dig here something at the bottom kills me, so I leave a torch | I place the 41st torch... and start digging | open |
| 7 | **One More Eye** | "Every morning, the end portal in my basement has one more eye in it." | 11 of 12 eyes; ender pearls on my doorstep; scratches on the frame from the inside | my brother jumped in years ago and has been filling it from the other side to come home | the 12th eye is in tonight, and what climbs out isn't him | open |
| 8 | **More Golems Every Morning** | "Every morning there's one more iron golem in my village. Nobody builds them." | villagers won't look at me; doors barred at sunset; a golem waiting outside my door | golems spawn when villagers are scared: at night I'm a zombie, and I don't remember | tonight there are twenty of them at my door | open |
| 9 | **One Block Higher** | "Every time I sleep, I wake up one block higher." | a dirt pillar under my bed; muddy villager footprints; the sea looks closer every day | the sea is rising; every night the villagers lift me above it, one block at a time, while they stay below | I look down for the first time | open |
| 10 | **The Sun Won't Set** | "The sun hasn't set in my world for 300 days." | villagers yawning; a bed nobody sleeps in; my grandpa asks every day if tonight's the night | I froze the time (`advance_time false`) because zombies come at night and grandpa is too slow to run | grandpa asks me to let the night come | open |
| 11 | **The Nitwit Knows** | "The nitwit in my village has said 'hmm' 4,096 times. Today he said my name." | he always stands where something bad is about to happen; the other villagers avoid him | he's a villager from a world that already ended, sent back to warn this one, and "hmm" is all the game lets him say | he says the date of the end, and it's today | made (`story_nitwit`, pipeline test 2026-11-10: 2 h 40 min, 2 review rounds; docs/pipeline_test_nitwit.md) |
| 12 | **Last Seen** | "My friend's armor stand has stood at the village gate for 900 days. Today it turned around." | his armor gets one more scratch a day; a bed still warm; the golem salutes it | (armor stands don't render yet: needs an engine model) | | parked: engine |
| 13 | **Good Boy** (cinematic pilot) | "I've tried to run away from this guy thirty-seven times." | every time I get 12 blocks away I'm right back next to him; raw porkchops; I sit when he says sit; everyone is tall; sheep look delicious; I can't open doors; skeletons run from me; a dog is always exactly where I am (every camera shot shows it) | I'm his dog: a tamed wolf (vanilla: tamed wolves teleport to their owner from 12 blocks, sit on command, can't open doors, scare skeletons, attack whatever hurts their owner). Revealed when the camera pulls out of my head | "Tomorrow I'm leaving for real." loops into line 1 | building: cinematic-default worker (`story_good_boy`, branch claude/cinematic-default) |

## Format: "Who do you trust?" (interactive mystery). Owner, 2026-11-06
Owner, describing a Short he liked: someone turns 13 and gets a call from themselves 10 years in
the future. Others' calls saved them. His call says "don't go to the basement", Mom smiles, but
they've never had a basement. He locks himself in, and a second call says the opposite. "you pose
the question for the user to figure out, and ask them who to trust. I think this sort of
interactive is good. And the clues are in all different directions so its ambigous."

We build **original** stories in this structure. Don't retell the one he watched.

**Beats (30-50 s, narrated, with clues on screen):**
1. **The rule, line 1, in under 2 s.** A strange law of this world, stated plainly ("Every player
   gets one sign from their future self on their first night.").
2. **Proof the rule is real: 2-3 bursts of about 3 s each.** Other people's messages came true
   and saved them. This builds trust in the rule, so the betrayal lands.
3. **Our message.** It warns us, and one detail contradicts reality (the creepy hook: "we never had
   a basement"). Someone close reacts wrong (Mom smiles).
4. **We hide.** Tension, a locked room, a sound outside.
5. **A second message, also "from us", saying the opposite** and giving a reason to doubt the
   first.
6. **The question card:** "WHO DO YOU TRUST? 1 = the first message, 2 = the second. Comment." End
   on the card, under 1 s after the question (the question is the payoff).

**The clue rule:** plant at least 2 clues for each side, each visible on screen. The best clue
supports both readings (e.g. the second message knows something only we know: proof it's us, or
proof something has been watching us). Write down the intended answer and why in the stunt file,
in case a part 2 answers it. The Short itself never answers.
**Part 2** (optional, later): "you voted 2..." resolves it and loops back to line 1.
**Retention tools:** worker 10's `cards` for the question card, `dip` + `scratch` SFX on the
contradiction, `counter` not needed, `hook` can flash the question card at the start.

**Original premises (Minecraft-native):**
- **The Sign by the Bed.** *(worker 8, building as `sign_by_bed`: a barrel instead of the chest)* Every player finds a sign from their future self on their first night.
  Proof: Steve's said "don't dig down" (lava under him); Alex's said "pet the wolf" (it saved her).
  Ours: "DON'T OPEN THE CHEST UNDER YOUR BED." We never placed a chest. Our villager mom watches
  from the doorway, not blinking. We lock the door. A new sign appears INSIDE the locked room, in
  our handwriting: "OPEN IT. THAT ISN'T MOM. SHE'S IN THE CHEST." Clues for 1: sign 2 appeared
  through a locked door (who can do that?), and it misspells our name. Clues for 2: sign 1 is placed
  where only mom could reach, and mom's shadow is wrong / she never blinks. Ask: which sign do you
  trust?
- **The Respawn Voice.** On your first death you hear one sentence from your future self. Proof:
  two players whose sentence saved them. Ours: "Don't sleep in the new bed." Dad just built us a
  new bed. That night a second voice (also us, but we're alive): "Sleep in the bed, or you'll
  respawn somewhere that isn't home." Clues both ways: the bed's respawn point (vanilla mechanics!),
  dad nailing the door shut "for safety", the first voice sounding older than 10 years.
- **Two Ender Pearls.** On your 13th birthday an ender pearl lands at your feet with a note from
  future you. Proof bursts. Ours: "Don't follow the enderman home." There are no endermen in our
  village... until tonight, when one stands at the window holding our house's door. A second pearl
  lands inside the house: "Follow him. He's the only one who remembers you." Clues both ways.

## Format: "The rule that erases you" (twist ending). Owner, 2026-11-07

The owner's reference (someone else's story, so never retold, only its shape): a town where a rumor
comes true once 500 of its 900 people believe it. The rule is shown with fun examples (a monster, a
twin), then a rumor says the hero is dead. He fails several times, then wins with a loophole: he
makes everyone believe "rumors don't come true anymore", and every rumor reverses. But he keeps
fading. His grandma, there from the start, admits that years ago she told everyone she had a good
grandson. He was a rumor too.

The shape, beat by beat (30-45 s narrated, like story_runaway):
1. **The rule, plainly and countably** in the first 3 s ("500 of 900 believe it, it's true"). Numbers make it real.
2. **Proof**: 2-3 quick, fun examples that teach the rule and plant things that come back later.
   The person who delivers the twist is introduced here, as background (grandma watering flowers).
3. **The rule turns on the hero**: the fun rule is now the threat.
4. **Escalating attempts that fail**, each one teaching one more thing about the rule.
5. **The clever loophole that wins**: the rule is used to kill the rule. Payoff montage: the
   earlier examples reverse (the monster gone, the twin gone).
6. **The twist that turns the win into the loss**: the fix itself dooms him, through the clue planted
   in beat 2. End on the reveal line, no explanation after it (the owner's "end as soon as the payoff comes").

What makes it work: the twist follows from the rule the viewer already learned, and the clue was on
screen from the start ("it was there the whole time" = rewatches). Check every draft against that:
if the twist needs new information, it's the wrong twist.

Original premises in this shape (ours; never retell the reference):
- **"Every sign is law."** On this server, anything written on a sign comes true once three players
  read it: diamonds rain, sheep turn gold. Someone writes "HelloBuh was banned" and he loses his
  permissions block by block (can't break, can't place, can't open doors). He wins with a sign: "signs
  do nothing". Twist: his best friend on the server (shown building with him in beat 2) was a sign
  someone wrote years ago, and now he's fading too.
- **"Respawn has a price."** Each respawn costs one memory, written in the village ledger. He dies
  again and again saving the village, then burns the ledger so nobody pays again. Twist: the ledger
  was the only record he ever lived there, and the librarian (stamping its pages in beat 2) doesn't
  know him anymore.
- **"The villager who trades in truths."** Whatever you trade this villager becomes true: a creeper
  attack traded away, the rain traded away. Someone trades "HelloBuh never existed". He wins by trading
  away the villager's power. Twist: he was the first thing the villager ever traded into being (the
  "first trade" sign on the stall in beat 2).

Staging notes: the rule needs a visible count (a sign or scoreboard "beliefs: 512/900", or a
ledger), so the viewer can track it without narration. Fading = a staged vanilla effect we can render:
invisibility-potion particles around a vanishing player (only what the engine draws: check with worker 11
before scripting a "fade"). The montage of reversals is cuts between the beat-2 locations.
