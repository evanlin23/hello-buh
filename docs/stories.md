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
look: 'auto',   // the grade follows the time of day (docs/look.md); or a mood, or { mood, ...overrides }, or the full form:
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
- **The format is always the Short** (owner, 2026-11-10: "the same title and then gameplay in the middle"): the
  channel's 1080x1920 layout from edit.py, the game view 1080x1011. Set `wideMaster: true` on the stunt to render
  each frame as a 16:9 master at the game view's height (1797x1011) and crop the game view from it: the centre, or a
  camera shot's `cropX` (-1 = the master's left edge, 1 = its right) to keep a subject in. The crop is the same picture
  (scale, field of view, the hand) as a plain 1080x1011 render (checked: 0 pixels differ). `WIDE_DIR=dir` also keeps
  the masters for trailers and 16:9 cuts. Compose for the crop: the shot sheet is 16:9, so judge its middle 60%.
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
- **The pilot's whole recipe** (`story_good_boy`, 2026-11-10; stage timings in its commit log):
  1. Script as story.json v2 (docs/story_craft.md): a narrator plus voiced characters, `requests` pairing speakers.
  2. Voices: `python3 scripts/voice_cast.py stories/<name>` (Gemini via scripts/tts.py, one request per pair of
     speakers, short directions; takes cached in voice/*_take.f32, `--only r2 --fresh` re-asks one), then
     `~/.hb-tts/bin/python scripts/voice_check.py stories/<name>` (Whisper transcript + pitch per line: catches a word
     split into the wrong line and two voices too alike) and `--words` + `voice_cast.py --timing` (captions on
     Whisper's word times). Pilot: 2 requests, 57 s of lines, one split fixed by hand.
  3. Site: a real generated place, not a clearing. `STUNT=scout_village ./scripts/record.sh` records the nearest
     plains village (seed fixed: centre (-304, -384)); `scripts/still.py` top-down plus a grid to plan positions;
     build only the focal set (the cottage, docs/building_guide.md) on a levelled pad; read ground heights at run time.
  4. `RECORD_ONLY=1 STUNT=story_<name> ./run.sh` (rec_check runs), `scripts/shot_sheet.py` for every camera
     (~1 min), fix cameras in `stunt.shots` without re-recording, `scripts/render_on_actions.sh story_<name>`.
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
| edit | `edit.py --story stories/<name>` (from `edit.story`) | lays each line's wav on its `line` mark (snapped to the camera cut), draws the captions (`scripts/story_track.py`), and mixes by the audio standard (docs/audio.md, scripts/story_audio.py): voice -15 LUFS through a clarity chain, game -27 ducked under the lines (with every visible event's vanilla sound: scripts/onscreen_sfx.py), whooshes on scene changes, a riser + silence + hit on the payoff, room tone, master -14 LUFS / -1 dBTP. Optional: a rule meter (story.json `"meter": {"label": "VILLAGERS"}` + `ctx.mark('meter', { value })`), white flashes (`ctx.mark('flash')`). |
| stunt options | top level of the stunt module | `hideHand: true` (no first-person hand: a narrator who isn't Steve), `time`, `weather` ('rain'/'thunder'), `brightness`; mid-stunt `ctx.setTime(n)`, `ctx.setWeather(w)`. Set `/gamerule log_admin_commands false` for per-tick `execute as` moves. |
| song | `scripts/add_song.py` (via publish.js) | a story gets the **mood score** (docs/audio.md), not NCS phonk: story.json `mood` picks a Kevin MacLeod CC BY track (music/score.json, fetched by scripts/fetch_music.py, credited in the description) at -26 LUFS ducked 7 dB under each line, out 0.45 s before `payoff`, then the payoff track. Stunt Shorts keep NCS at -13. |

Captions: Poppins Black (OFL, `assets/fonts/`; chosen by a font A/B, docs/look.md) at 96 px, max 840 px wide (clear of
the Shorts action column), white with a dark outline and a soft shadow,
key words in the story's colour, centred at 70% of the game view's height (under the crosshair, above the
hearts), each chunk popping in on its own first word. The top band keeps the channel's caption (the hook).

## House rules (from blocky-stories RULES.md, the ones that transfer)

- **Owner, 2026-11-10: "i think gemini is really bad with the voices drifting. can you ensure theres a gate or some way
  to audit this? The voices for the people seem to change like all the time take to take and even within take."**
  Until the drift gate (agent/voice-drift: `scripts/voice_drift.py`, per line and per 1.5 s window against a locked
  reference voiceprint) lands: **one model per character per story** (never fall back to another model on a 429
  mid-story: wait, or re-take all of that character's lines on the new model); **short requests** (one character,
  at most ~6 lines); **identical direction text** for a character every time; re-take a line that sounds like a
  different person. Drift is a review blocker.
- **Owner, 2026-11-10 (Good Boy session), on the narrator: "this voice is so high pitched and annoying lowkey"**
  (Leda, ~350 Hz) / **"it should still be like a kid/child? idk"** / **"kinda like the roblox shorts but more
  refined?"** / after five auditions: **"kid puck is fine"**. So: a kid narrator that isn't squeaky: Gemini Puck,
  directed "Read this as a twelve-year-old boy telling his friends a funny story: quick, excited, mid-pitch, not
  squeaky; full volume, not whispery or breathy. Take a short breath between sentences." (~235 Hz, natural tempo,
  no post filter). Audition 3-5 voices on the same two lines before voicing a whole story.
- **Owner, 2026-11-10: "why does it be like ive tried ot leave this guy 37 ti*? something wierd gets cut off"**: a
  line cut at Whisper's word end clipped "times". Cut at the quietest point between lines (`voice_check.py
  --resplit`), and ask for a breath between sentences so a quiet point exists; check with `scripts/voice_edges.py`.
- **Owner, 2026-11-10 (Good Boy session): Leda is "so high pitched and annoying"; wants a kid "like the roblox shorts but
  more refined"; picked "kid puck is fine".** The narrator is now **Puck** directed as a twelve-year-old boy (quick,
  excited, mid-pitch, not squeaky, full volume, a short breath between sentences), no post filter. Then: "what about pip? i liked
  the audio i sent earlier": **Pip keeps his voice** (cast `pip`: Leda, the bubbly nine-year-old direction, natural
  tempo) in Dog on the Hill and for Pip-like young narrators; **Puck** (`narrator`) is the default elsewhere.
- **Owner, 2026-11-10: "the voices seem to be edited in a way that cuts stuff off".** The Gemini takes are cut apart
  per line and their pauses shortened; our published Kokoro takes start and end in true silence (-83 dB), the
  Gemini splits at -36 to -50 dB, i.e. inside breaths and soft word ends. Until `./hb voice` cuts safely:
  - cut each line at the quietest point between lines, never at Whisper's word start (it lands late, on the
    consonant); keep >= 80 ms before the first word and >= 200 ms after the last, with a 10-20 ms fade at each edge;
  - never splice a pause out of the middle of a line: if a pause is too long, re-take the line (or shorten only the
    silent middle of the pause with a 30 ms crossfade, never within 60 ms of speech);
  - check every take: `python3 scripts/voice_edges.py stories/<name>` (edges), a listening pass asking "is any word
    cut off?", and `./hb pace` now blocks a line still speaking when the video ends or two lines overlapping.
- **Owner, 2026-11-10: "I see a lot of sessions getting caught on the 4.5 words/second, what are your thoughts?"**
  4.5 words/s is **not a target**. It was the research median, but the owner then chose Pip's natural tempo (~4.1
  while speaking, ~2.85 overall) over every sped-up take. Speed comes from the direction and the script (short
  sentences), never from stretching, and never from re-take loops chasing a number. What matters is no dead air:
  the opening in one breath, short gaps, holds with something happening, the end right after the payoff. `./hb pace`
  only warns on a rate clearly slower than Pip and never blocks on rate.
- **Owner, 2026-11-10: "do 1 at a time if the top do it 1 at a time. the font is ok yes just whatever is best".**
  Story captions show **one word at a time** (Xenost and Ashyyy: one word in all 48 sampled frames), timed by
  voice/words.json word starts, in Poppins Black. Each word pops in (0.1 s, the existing `POP`) and cuts out hard
  on the next word: no fade or slide out, which top channels don't use either. story.json `"captions": "chunk"`
  brings back the 2-3 word chunks.
- **Owner, 2026-11-10: "you choose for the audio mix, im not an expert there".** The lead picked the new story mix
  (docs/audio.md): mood score with ducking, a drop-out and hit at the payoff, room tone, vanilla on-screen sounds,
  -14 LUFS. It's measured, not listened to by the owner, so a story's review checks the mix by ear-proxy
  (scripts/audio_measure.py) and any owner note on a track or level overrides it.
- **Owner, 2026-11-10, after the kid-narrator audition: "all of the current ones seem to be too sped up. i kinda like
  the pip here"** (Dog on the Hill v3: Leda, natural tempo, no pitch shift; measured ~4.1 words/s while speaking,
  ~0.45 s between sentences, 2.85 words/s overall). The narrator is Leda as voiced there: **no time-stretch and no
  pitch shift**. Speed comes from the direction (quick, bright, one breath per sentence), never from the 1.5x filter;
  atempo 1.1 at most if a take drags. `voices/cast.json` narrator `post` is now empty.
- **Owner, 2026-11-10 (in the Dog on the Hill session): "the start should be delivered all at once right?" / "we can
  have pauses later, the opening must be in one breath"; "is milo a woman?"; "what does the day one mean bro".**
  - Line 1 is one quick breath, no internal pause (`./hb pace` blocks one over 0.2 s). Re-take it; trimming silence
    doesn't fix a dragged word.
  - **No "..." anywhere in a script.** Gemini turns an ellipsis into a stop and drops dramatic lines into a breathy
    whisper. Use short sentences, and direct dramatic lines "full volume, excited".
  - A kid narrator is **Leda** (cast `child`), unshifted (the +2 semitone filter warbles). Erinome reads as an adult
    woman: she's the storyteller, never a kid.
  - Endings explain themselves: a sting the viewer has to decode doesn't land ("Day one." failed, "Day one. Again."
    worked).
  - TTS models (2026-11-10): gemini-2.5-flash/pro-preview-tts hit the shared daily quota first; gemini-3.8-flash-tts
    works (keep bracketed directions short or it reads them aloud); gemini-3.1-flash-tts-preview can refuse with SAFETY.
    Listening checks: gemini-3.5-flash (retry 502/503).
- **Owner, 2026-11-10: "sure 4.5 is fine bc that matches the best. also, we should have absolutely no pauses in like
  the first few seconds right, bc those are the most critical? Like the other this dog has been sitting there has a
  brief pause right in the first few seconds."** (Superseded on speed: see the newer "not a target" rule; Pip's natural tempo is the reference.)
  No "..." in any line spoken in the first 5 s (Gemini turns it into a half-second stop: Dog on the Hill's L01 had
  0.53 s and L02 0.54 + 0.71 s), and the gap between opening lines stays at one breath (runaway's 0.37-0.40 s).
  `./hb pace` blocks a pause inside an opening line over 0.35 s or a gap between opening lines over 0.6 s.
- **Owner, 2026-11-10: "why does the narrator keep whispering? is the narrator the child or like a woman? i think it
  should be like a child most of the time right? like bubbly happy" and "the audio must land like start talking the
  first moment the video starts, same with the visual hook".** The whispering was ours: the library narrator was
  directed "a little hushed", Good Boy's "earnest and hushed", and Gemini leans soft and breathy unless told otherwise.
  So: **the default narrator is a kid (about 10-12), bubbly, happy and fast**, curious, a little funny, deadpan on
  the absurd lines, and only drops to scared (never whispery) for real danger. Every style prompt says "fast,
  bright, energetic; not whispery, breathy or soft". The first word lands on frame 0-5 and the first frame is already
  moving (`./hb pace` blocks a first word after 0.4 s or a frozen first 0.3 s for stories, and warns on narration
  slower than runaway's pace).
- **Owner, 2026-11-10: "we can keep posting, to get more data."** The 5 older-style stories stay in the upload queue.
  On caption colours: "It should generally just "match" the vibe of the character thats supposed to be speaking." And on
  craft: "everything should be the best and optimized in the process" (format, font, music, sound effects, grade,
  audio, sets, characters, lighting). Each of those has a measured standard in the `cinematic-style` skill, with the
  evidence behind it; change a standard only with evidence (our numbers or what works on top channels).
- **Owner, 2026-11-10, on engine gaps (no sitting, no drink pose, no off-hand item, chests not showing their contents,
  campfire smoke): "why cant we build the renderer out to allow all of these? and more when they come up?"** So the
  story decides and the engine follows. When a script needs something the renderer can't draw yet, **build the feature**
  (docs/engine_features.md: poses, particles, block-entity animations, GUI screens, mob animations), test it so existing
  Shorts render unchanged, and merge it to main for every story. Don't rewrite the scene around the gap. Only if the
  feature would take more than about 2 hours: stage around it this time, and log it in docs/engine_requests.md so it
  gets built next.
- **Owner, 2026-11-10, on voices: "maybe we should have a narrator?" … then, on narrator-first with a few character
  lines: "i think that makes the most sense yeah".** Our best story (runaway: one first-person narrator, 3.2 subs per
  1k views, the channel's best) and the cinematic pilots (several voices: "mixed up", one read as ASMR) point the same
  way. So: **one first-person narrator (Milo, or whoever's POV it is) carries the whole story**; other characters get
  at most 1-3 short lines, only at key beats (the hook, the turn, the payoff), each in a clearly different voice
  (age/sex/pitch apart) and a colour-coded caption. No back-and-forth dialogue scenes. The narrator is never hushed
  for warmth (see the ASMR rule); he's quick, curious and a little funny, and goes quiet only for fear. The narration research
  (docs/research/narration_2026-11-10.md: 26 channels, ~11.5k Shorts) backs it: first-person narrator channels had a
  3.4M median per Short and 3.09 views per subscriber, against 0.45-0.56 for dialogue-only or multi-voice. So, tuned:
  **other characters' lines are quoted by the narrator with a "said" tag by default** (Mom said, "He's just shy.");
  a second voice is allowed for at most 1-3 punchlines of 6 words or fewer, only while that character is on screen,
  very different from the narrator (other age or sex), never two extra voices of the same sex, never exposition.
  The narrator: fast and deadpan (speed: Pip's natural tempo, see the "not a target" rule), never whispery or breathy:
  say so in the Gemini style prompt. Line 1 is the title: an absurd premise stated flatly in first person, then quick
  escalating examples, the twist, the loop. Test A vs A+ (one extra voice) on the next 4 stories.
- **Owner, 2026-11-10, on Good Boy: "i dont really like this framing lowkey it feels a bit like "good boy" like
  sensual asmr."** Read every script for how it could be misheard, out of context, by a stranger scrolling past. A
  hushed, breathy first-person voice plus lines about obeying, sitting when told, waiting all day for someone, or a
  slow tender "good boy" reads as intimate or kink, whatever the twist. Hushed and whispered is for fear and mystery,
  never for affection or obedience. When the twist is "you're an animal", play the narrator bright, quick and goofy
  (pet energy), and make the reveal physical and funny (a bark, a head pat, a wagging tail), not a whispered line.
  Good Boy is held (not published) until it's reworked.
- **Owner, 2026-11-10: "we still need to ensure that the pacing is good, and theres still a good visual and audio
  hook and build up and a good payoff."** Cinematic doesn't mean slow. Every story still needs: a hook in the first
  1-2 s that works both muted (a striking picture or motion) and with sound (a sound or line that makes you ask "why?");
  something new on screen or in the ear every ~3 s; build-up that escalates (stakes, music and cut rate rise toward the
  payoff); a payoff that lands in one clear picture plus a sound hit; the end ≤1 s after it. The `pacing` gate
  (`./hb pace`) measures these and short-review treats its blockers as blockers.
- **Owner, 2026-11-10: "We don't need the character's name to be Buh" / "sure milo is fine".** The hero is **Milo**
  (default Steve skin, voice `milo` in voices/cast.json). HelloBuh is the channel, not the character; in-game names
  on death screens and chat say Milo.
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
  or build a big set (structures, paths, fields, lighting) that fills the whole frame out to the fog. The set library
  (`lib/sets`, catalog and anchors in docs/sets.md) does both: `sets.findSite`, `sets.place(ctx, 'cottage', {...})`
  (17 dressed pieces that land on the terrain and return door/bed/window anchors), `sets.vanilla` and `sets.dress`.
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
- Block entities render now (beds, bells, chests with their lids, signs, banners, skulls, shulkers), and an opened chest, barrel or shulker box shows its container screen with the contents (docs/engine_features.md). Anything else the renderer lacks: build it (docs/engine_features.md), don't stage around it.
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
| 13 | **Good Boy** (cinematic pilot) | "I've tried to run away from this guy thirty-seven times." | every time I get 12 blocks away I'm right back next to him; raw porkchops; I sit when he says sit; everyone is tall; sheep look delicious; I can't open doors; skeletons run from me; a dog is always exactly where I am (every camera shot shows it) | I'm his dog: a tamed wolf (vanilla: tamed wolves teleport to their owner from 12 blocks, sit on command, can't open doors, scare skeletons, attack whatever hurts their owner). Revealed when the camera pulls out of my head | "Tomorrow I'm leaving for real." loops into line 1 | building: cinematic-default worker (`story_good_boy`, branch claude/cinematic-default; v2: voiced cast, real village) |
| 14 | **Light Sleeper** | "My village is covered in nine thousand carpets." | the bell boxed in wool and the well under a white wool lid; Mom: "walk soft, the ground's a light sleeper"; he pulled the wool off the well and the bottom screamed ("a fox"); the lights go dark with the music | the village sits on an ancient city: carpet makes no vibration, and the bottom of the well is a sculk shrieker. He puts a jukebox on the well ("wells echo") and steps off the carpet onto the bare stone rim to dance; the warden rises out of the square | "obliterated by a sonically-charged shriek"; loops by cause into line 1 | script approved, ready to build (r2: `agent/scripts-revised`, `stories/light_sleeper/`) |
| 15 | **Thirty-One Raids** | "Grandpa has saved our village from thirty-one raids." | 31 totems and one empty frame; every raid started the night he came home; villagers throw him bread; grey bottles from the tower, "his courage", drunk at the gate; "Lock the door, kid. They're coming."; since Grandma died it's the only time anyone's glad to see him | the courage is an ominous bottle (Bad Omen starts a raid in a village): he brings every raid himself. Tonight he's too tired, so the boy drinks it; the horn, pillagers and a ravager up the road | Grandpa beside him, loading his crossbow: "Now they'll love you too, kid." (the 32nd frame) | built, recorded and rendered; waiting for 3 narrator lines (L10-L12) on the 3.1 quota: `stories/thirty_one_raids/NEXT.md` (claude/story-thirty-one-raids) |

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
