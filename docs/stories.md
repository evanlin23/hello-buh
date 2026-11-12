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

## Cinematic story Shorts (movie engine + Gemini cast): `dog_hill` is the worked example
The 2026-11-10 direction (real voices, cinematic sets) on the channel's story edit (edit.py --story: black bands, the
title on top, the 1080x1011 game view cropped from a `wideMaster` 16:9 render):
```bash
# 1. stories/<name>/story.json v2 (docs/story_craft.md section 6) + bible.md; run the story-critic before voicing
# 2. voices: one Gemini request per speaker pair (scripts/tts.py). Its auto-split cuts at the longest pauses, which land
#    INSIDE lines written with "..." pauses: cut by Whisper word timings instead (scripts/align.py on main, or
#    faster-whisper base.en): cut at the silence before each line's first word. -> stories/<name>/voice/<id>.wav +
#    voice.json ({lines: {id: {text, who, dur, onset, end, chunks: [[start, end]...], captions: [...]}}})
# 3. the stunt: movie-engine `shots` (hand-placed `path` cameras), NoAI mobs moved by /tp per tick, `line` marks {id},
#    `chat` marks {text, hold} for "X joined the game" (edit.py draws the chat line), `time` marks on cuts and
#    `weather` marks with `cut: true` (render.js lands them at once); `wideMaster: true`; edit.story
STUNT=story_<name> ./scripts/record.sh && ./hb check story_<name>
# 4. check frames: two per shot at 360x640 (render.js FRAMES=, ~2-4 min); fix cameras without re-recording
# 5. render on Actions (~15 min): RENDER_BRANCH=<your branch> scripts/render_on_actions.sh story_<name> (+ --wait)
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
A made score instead of the NCS bed: `python3 scripts/story_short.py stories/<name> --score-only stories/<name>/score.wav`
(a note-block lullaby in a hall, silent over `hush`..`hush_end`, a swell on `swell`; encode to .ogg), then
`edit.song: 'stories/<name>/score.ogg'` (edit.py lays it as the -31 LUFS bed) and `edit.ownScore: true` (publish.js /
add_song.py then add no NCS track). `scripts/story_short.py` without `--score-only` is a standalone full-frame 9:16
editor (render-story workflow); the channel layout above is the one that ships.
Lessons from dog_hill:
- **Scout a real place:** a village scout (/locate village_plains from 10 starts, the highest ground 20-70 blocks
  out) found a village with a 28-block hill; `stunts/probe_dog_hill.js` prints a heightmap and renders test cameras.
  Level only a small disc (r 9) and fill holes deep (`replace air` down 14), or the disc's rim floats.
- **Park cast in loaded chunks:** a park 300 blocks away is unloaded (every /tp "No entity was found"). In the sky
  ~70 blocks away is loaded and far enough (>64) that hops through it don't glide. Mobs parked inside stone in a chunk
  that the harness refreshes crashed the server twice (LongOpenHashSet in chunk ticking). Zombies burn in a daytime
  park: summon them in their own night shot and kill them after (park first, so the death fall isn't on screen).
- **A retried attempt reruns setup in the same world:** kill the cast by tag at the top of setup, or the duplicates stay.
- **Low cameras sit in the flowers:** keep cameras 2.3+ blocks up in a meadow, or keep the blocks under them clear.
- **Wolves:** renderer/entities.js draws WolfModel (standing, sitting, tame skin, dyed collar) from `extra`; the harness
  now records a real wolf's `sitting`, `tame` and `collar` from its metadata. `/data merge entity @e[tag=dog,limit=1]
  {Sitting:0b}` stands a NoAI wolf up.

## Setup (once per container)
```bash
apt-get update && apt-get install -y espeak-ng   # Kokoro's phonemizer for unknown words (a fresh container's apt lists are empty)
python3.11 -m venv ~/.hb-tts
~/.hb-tts/bin/pip install --extra-index-url https://download.pytorch.org/whl/cpu torch kokoro soundfile numpy
~/.hb-tts/bin/pip install transformers && ~/.hb-tts/bin/pip install --no-deps resemblyzer   # Whisper word cuts + the speaker check
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
| edit | `edit.py --story stories/<name>` (from `edit.story`) | lays each line's wav on its `line` mark (snapped to the camera cut), draws the captions (`scripts/story_track.py`), and makes the whole mix by the audio standard (docs/audio.md, scripts/story_audio.py): voice -15 LUFS through a clarity chain, the **mood score** ~14 dB under it (out 0.45 s before the payoff, nothing after), the game -27 ducked under the lines (with every visible event's vanilla sound, mob voices and steps: scripts/onscreen_sfx.py), the scene's ambience, a soft riser + silence + hit on the payoff, no whooshes, room tone, the clarity guard, master -14 LUFS / -1 dBTP. `--audio_only <mp4>` re-edits only the sound onto a finished picture. Optional: a rule meter (story.json `"meter": {"label": "VILLAGERS"}` + `ctx.mark('meter', { value })`), white flashes (`ctx.mark('flash')`). |
| stunt options | top level of the stunt module | `hideHand: true` (no first-person hand: a narrator who isn't Steve), `time`, `weather` ('rain'/'thunder'), `brightness`; mid-stunt `ctx.setTime(n)`, `ctx.setWeather(w)`. Set `/gamerule log_admin_commands false` for per-tick `execute as` moves. |
| song | `scripts/add_song.py` (via publish.js) | a story's **mood score** is already in its edit (docs/audio.md: a Kevin MacLeod CC BY track from story.json `mood` or `score`, stamped in the mp4's comment tag): publish writes its credit in the description and never adds a second bed (an mp4 edited before 2026-11-10 gets it here). Stunt Shorts keep NCS at -13. |

Captions: Poppins Black (OFL, `assets/fonts/`; chosen by a font A/B, docs/look.md) at 96 px, max 840 px wide (clear of
the Shorts action column), white with a dark outline and a soft shadow,
key words in the story's colour (in a v2 story a character's words are in that character's colour, key words
underlined; docs/voices.md "Caption colours"), centred at 70% of the game view's height (under the crosshair, above the
hearts), each chunk popping in on its own first word. The top band keeps the channel's caption (the hook).

**The current rules, de-duplicated by stage with their checks: `docs/STANDARDS.md` (`./hb rules`).** The house rules
below are the dated history (newest first, some superseded); a new owner rule goes at the top here and into
STANDARDS.md in the same commit.

## House rules (from blocky-stories RULES.md, the ones that transfer)

- **Owner, 2026-11-10: "it should sound happy, bubbly. maybe like a child that doesnt understand teh wrold? like theyre
  figuring it out? I kinda like pip. The no pause only works if tis clear what is beign said. like here it gets. abit
  confusing. but somehow in the ohter ones i never get lost. why is that?"**
  - The narrator: a happy, bubbly kid (Pip is the base) who doesn't understand the world and is figuring it out out
    loud; the viewer understands what the kid doesn't (the kid misreads, the viewer works it out: that gap is the
    mystery).
  - No-pause only works when it's clear: (1) the script is written for the ear: one short simple thought per
    sentence, in time order, each joined to the last ("So I... Then she... But..."), no stacked clauses, names and
    numbers spaced out; (2) the take is PERFORMED continuously (directed "one breath, keep going", each new sentence
    lifts, the key word hit), not cut afterwards: cutting pauses out of a paused performance leaves sentence-final
    falls running into the next line and reads as confusing; pause capping is only a safety net; (3) each sentence
    lands on its one key word (the CAPS word in its caption chunk).
  - Check: a cold listener follows the narration on one listen (audio only), before the picture.
- **Owner, 2026-11-10 (on the brand narrator candidates, all adult): "i think it should still sound like a child".** The
  brand narrator is a kid: our own distinctive child voice (as Pip was), at the fast, no-pause pace, not an adult and not
  a copy of anyone. docs/brand.md's "twenties" narrator is superseded on age.
- **Owner, 2026-11-10 (later): "Im thinking we do the unique voices", "Instead of the sped up trying to copy", "We need
  a brand identity", "I think the narrator does all of it essentially, plus short lines from other characters".**
  Supersedes the Orus x1.45 narrator (an imitation of the Roblox-story Adam sound). The narrator gets OUR OWN distinctive
  voice, part of a channel brand identity (docs/brand.md), not a copy of anyone's sound. The narrator tells almost
  everything; other characters say short lines (about 6 words or fewer) in their own distinct voices.
- **Owner, 2026-11-10: "Can we also fill our hotbar with like ridiculous items? like buckets of milk for example".** The
  player's hotbar is full (all 9 slots), like a real player's: the story's own tools first (Light Sleeper: carpets,
  wool, shears), then 1-3 ridiculous ones that fit the world (milk buckets, a stack of cake, 67 eggs, a pufferfish,
  a name tag...; the eggs are 67, owner: "make it 67 eggs"). It never contradicts the story, and it stays consistent between shots. Set in story.json "hotbar".
- **Owner, 2026-11-10 (on Light Sleeper's bare cobblestone well in the all-carpet village): "whyisnt the well covered in
  carpet too".** The set must match every claim the narration makes about it ("everything is carpeted" means every
  block in shot is, except a deliberate, planted exception). Each story's set.md lists its claims and the set is checked
  against them on stills from every shot angle before recording.
- **Owner, 2026-11-10 (asked to approve the arc rewrites of the held stories): "Yes. Okay. Rewriting the stories is
  fine. Whatever you think is best, whatever is best based on what you've seen before"; on Good Boy: "Yeah, we can
  rework it."** Light Sleeper, Dog on the Hill, Thirty-One Raids and Gold for the Portal adopt their script_vNext;
  Good Boy gets a new premise. Each story's finished cut is still held for the owner's OK before it posts.
- **Owner, 2026-11-10 (told the s3 sample he liked had every gap cut to ~0.06 s): "its fine to have those cuts, i didnt
  even notice".** For the narrator, silences inside a take are shortened to 0.12 s (tts.shorten_pauses, cast
  `pause_cap`): only the silent middle, never within 40 ms of a word, crossfaded. Words are never cut or spliced; a
  take with a wrong, clipped, breathy or whispered word is still re-taken.
- **Owner, 2026-11-10 (choosing the narrator from the voice-match samples): "s3_gemini_orus.mp3 is good"; then, after
  hearing it at 1.30x-1.60x: "we can just do 1.45 thats fine".** The narrator is `narrator_roblox` (the default
  `narrator`): Gemini Orus on gemini-3.8-flash-tts with the voice-match direction, and every take played tempo 0.95
  then 1.45x faster by resampling (pitch and formants rise with it), the way the Roblox-story voice is ElevenLabs Adam
  sped up (docs/voice_search.md "Closest match"). This is the one owner-approved exception to "never pitch-shift a
  voice", for the narrator's speed-up only; it supersedes "the voice's natural speed (not a sped-up file)". The
  speed-up goes on the whole raw take before the trim, the slices and the take gate, so the gate judges the pauses as
  heard; a take with pauses is re-taken, never cut.
- **Owner, 2026-11-10: "I have a lot of pauses for like dramatics, but the ones i've watched the narrator just yaps on
  and on".** No dramatic pauses anywhere: the narrator talks continuously from the first frame to the cut, sentence
  after sentence, the way the reference Short does; drama comes from the words and the picture, never from silence.
  The take gate's pause limits and the line spacing are set from the reference Short's measured gaps.
- **Owner, 2026-11-10 (on the reference Roblox Short's captions): "the captions can be 2-3 words thats fine".**
  Captions are 2-3 word chunks again (the script's " / " splits), one CAPS key word per chunk in the key colour
  (supersedes "one word at a time"); quotes keep their quote marks.
- **Owner, 2026-11-10 (on the reference Roblox Short at ~5.5 words/s): "the fast pace is good".** The narration runs
  fast, about 5-5.5 words per second while speaking (supersedes "4.5 is not a target, Pip's natural tempo"): short
  sentences, little air between them, the voice's natural speed (not a sped-up file).
- **Owner, 2026-11-10 (sending a top Roblox story Short as the model): "this one also has a loop. can we look at the
  story arcs for the best stories in this area? we can try to make our stories based on those then".** Our stories
  follow the arcs of the top stories in the niche (docs/story_arcs.md, being written). The reference Short: a paradox
  hook in line 1, a rule-of-three escalation, a reversal, and it ends mid-sentence on the climax so the last words run
  straight into line 1 (a loop); one narrator says every quote; about 5.5 words/s.
- **Owner, 2026-11-10: "the movement shouldn't be caught... the processes should be such that the movement is [smooth]
  in the first place. Like we of course we can still have the check later on, but this check later on shouldn't be
  the main way that we're doing it. Stuff should be front loaded."** Smooth, player-like motion comes from the story
  kit's primitives (eased turns, pathing walks, vanilla-speed NPCs, a still camera in GUIs), which are the only way a
  stunt moves anything; a pre-recording lint rejects raw look/teleport calls. Checks after the render are the safety
  net, never the method. The same goes for every quality rule: build it into the tool first, check it second.
- **Owner, 2026-11-10: "the villager keeps teleporting" ... "right at the 'i even begged' line. Also the cuts don't
  seem to be correct, because i keep noticing them. Something i learned is about cuts that you don't notice the cuts
  beucase the focus of attention stays int eh same location between cuts? Also idk if our timigns for the cuts are
  correct?"** (dog_hill: the stunt hopped its villager with its own `/tp` every few ticks, a stepped "teleport", and
  placed cast 1-2 ticks AFTER the cut, so they jump on screen.) Cast move only through the kit (`K.actor`, smooth at
  20 Hz, placed before the cut), never a stunt's own `/tp @e`. Cuts are invisible by construction: the subject the eye
  is on sits at about the same place in the frame on both sides of the cut (eye-trace), and the cut lands where an
  editor would put it, not just on the line start.
- **Owner, 2026-11-10: "for the looking and the breaking, something i noticed is that sometimes there will be a block
  int eh way. we need to ensure there is a clear line fo sight to teh stuff we are placing or breaking."** Every dig
  and place has a clear line of sight from the eye to the face being hit (vanilla can't reach through blocks either):
  the kit picks a stand spot and a face the eye can see, and refuses a dig/place through a block.
- **Owner, 2026-11-10 (kid narrator round 2): "i kidna like the sleepover"; "no pitch adjustmnet, maybe minor like 0 vs
  +1"; "i kinda like the 1.1 pace with no pitch adjumsnet. But it sounds a little bit like artificial at times? can we
  try to make it more realisitc?"; "maybe 1.1 with +1 pitch".** The narrator is the Leda "sleepover" take direction
  (brand/voice_samples/kid k4) at 1.1x, pitch 0 or +1 (being decided), never more processing than that; the next
  takes are performed continuously so no pause has to be cut (a 0.12 s gap cap made it sound spliced).
- **Owner, 2026-11-10: "C and D feel like they have weird artifacts in them, so A sounds the best here"** (A = the
  sleepover take, rubberband tempo 1.1, +1 semitone; C = formant-preserving speech mode, D = a room added). The
  narrator recipe is A exactly: `voices/cast.json` `narrator` (Leda, sleepover direction, tempo 1.1, semitones 1,
  stretch rubberband, no pause cap), nothing else on top.
- **Owner, 2026-11-10, on the same take made from the raw Gemini output with no pause cut: "this is fine".** The
  narrator ships uncut (no pause cap); a take with long pauses is re-performed, never trimmed.
- **Owner, 2026-11-10: "can we use this voice actually, the one used in dog on the hill v2 (held: needs your OK) in
  the preview? Im so sorry, i just cant land on somthing that sounds good and decide."** The narrator is Pip exactly as
  in Dog on the Hill v2: Leda, "A bubbly nine-year-old kid, fast, bright and energetic, telling a friend an amazing
  story; not whispery, breathy or soft" in plain sentence case, natural tempo, no speed-up, no pitch shift, no pause cap (`voices/cast.json` `narrator`). This replaces the
  sleepover 1.1x +1 pick (kept as `narrator_sleepover`). Tell the owner when a new take drifts from that sound.
- **Owner, 2026-11-10, on the daily story producer (the scheduled task that starts one new story a day): "keep off
  until more are done".** The producer is switched off until the held stories are finished; switch it back on only
  when the owner says so.
- **Owner, 2026-11-10: "Is it really okay to have the two formats? They feel like they have very different audiences.
  I meant above buh stories as like a second channel."** The story Shorts go to a second channel, "Buh Stories", not
  @HelloBuh (which keeps its Minecraft shitposts and "spot what's wrong"). Nothing is uploaded to either until the
  owner creates the channel, authorises uploads to it, and OKs each story by name.
- **Owner, 2026-11-11, on the Buh Stories brand kit: "Dont need the "one world" one dog wo waits every story connects
  etc".** No shared-world / connected-stories framing anywhere in the channel's copy or art (banner tagline, promise,
  descriptions, release-order reasoning): each story stands alone.
- **Owner, 2026-11-11, on the revised Buh Stories kit (banner "short minecraft / mysteries", promise "mysteries ...
  with a twist"): "just do stories".** The channel calls itself plain "stories": "short minecraft stories", no
  "mysteries" or "twist" pitch in the banner, promise, descriptions or cross-promo.
- **Owner, 2026-11-11, clarifying: "Short minecraft stories, but these can be mysteries, i think thats what works. But
  the name of the channel should be generally stories".** The channel's name and tagline stay general ("Buh Stories",
  "short minecraft stories"); the stories themselves stay mysteries (the mystery test is what works). A story's own
  title, description or pinned question may set up its mystery.
- **Owner, 2026-11-11, on the cover's gold "BUH STORY #5" pill: "Do we need BUH STORY #5? It can just be in the title?
  or idk".** No series pill or number on the video (frame 1 is the thumbnail: only the story's hook). No number in the
  title either (each story stands alone, r:rca5363); the channel name under the Short and `#buhstories` carry the brand.
- **Owner, 2026-11-11: "I dont like the channel description, specifcally the "each told by someone who lived it:"".** No
  "told by someone/the kid who lived it" framing in the channel description or the promise.
- **Owner, 2026-11-11: "BuhStoriesMC"** (after "Buh Stories is taken"). The second channel is named "Buh Stories", handle
  @BuhStoriesMC (names needn't be unique on YouTube, handles must).
- **Owner, 2026-11-11: "I can do the uploads manually for the first few for buh stories, then we can set it up later."**
  Buh Stories uploads are manual for now: when the owner OKs a story by name, the lead sends them the final mp4 plus a
  ready-to-paste block (title, description, tags, pinned comment). The Buh Stories uploader stays off
  (YT_ENABLED_BUHSTORIES unset) until the owner asks to automate it.
- **Owner, 2026-11-11, looking at the biggest Minecraft story channels (Kamui Animation, Michazike, Skytro, Milo and
  Chip...): "All of them seem to have very bright, exagerated movements".** Being tested: a bright, saturated look
  (no moody grade, little vignette or blur, day-lit where the story allows) and bigger, punchier motion within
  Minecraft (camera punches on key words, hops and quick turns on beats, faster pushes), shown next to the current
  cinematic look for the owner to pick.
- **Owner, 2026-11-11, on following up a hit (research: a Short at 5x the channel median gets 2-3 new standalone
  stories in the same premise family, different outcomes, within 7 days): "yes thats fine we should capitalize on
  whatever is good. Also we dont know what is good yet tho".** Until the numbers say what works, the early stories
  explore: different premise families, arcs and outcomes (no two in a row the same). Once a Short clearly beats the
  channel median (5x), follow it up fast with standalone stories in its family. Judge by engaged views, stayed-to-watch,
  average % viewed and subs per 1k (docs/research/buhstories_growth_2026-11-11.md).
- **Owner, 2026-11-11: "Do we need the grandpa and grandma stories? That feels too specific. Maybe like if we start
  doign series these could be good."** One playlist ("All Buh Stories") at launch; a series playlist only once a family
  has 3+ stories.
- **Owner, 2026-11-11: "channle is already created. I lwokey made a new google account fro this, si that fine?"** Buh
  Stories is on its own Google account, not a Brand Account under HelloBuh's login. That's fine: uploads use a refresh
  token from that account (docs/upload-setup.md "A second channel"); manual uploads for now.
- **Owner, 2026-11-11, on the channel description ("Short Minecraft stories: a village that carpets every road... More
  Minecraft chaos on @HelloBuh. NOT AN OFFICIAL MINECRAFT PRODUCT..."): "this descirption is too specific i think ight?
  idk how to write scriptions. also we dont need to tag hello buh. we also dont need NOT AN OFFICIAL..."** The channel
  description is short and general ("Short Minecraft stories. New ones every week."), with no @HelloBuh tag or link and
  no Mojang disclaimer.
- **Owner, 2026-11-11, on the cells format: "for the cells, it only works bc its forcing mobs specifically to do
  it".** Every cell traps a MOB (never the player, never a block machine) in its loop; the joke is the mob being made
  to do one thing forever.
- **Owner, 2026-11-11, sharing KRIZZIT's "Clear winner" (a huge square of dirt, grass spreading from one corner and
  mycelium from another, a top-down time-lapse race; caption "Grass vs Fungus"): "timelapse grass vs fungus".**
  HelloBuh adds a spread-race format (family `race`): two vanilla things that spread (grass, mycelium, moss, sculk,
  vines, fire...) race across one big field in a top-down time-lapse; viewers pick a side and wait for the winner.
- **Owner, 2026-11-11, on the "cooked" format's music and picture: music "A similar NCS track"; the image "The real
  meme photo".** cooked Shorts use an NCS track chosen to match the reference's dramatic mood (no claims), and the real
  war-movie soldier meme photo as the end still: fetched at render from a logged URL into the cache, never committed.
- **Owner, 2026-11-11, on hide_seek: "the camera moves around so quickly some of the time. It's a little bit confusing
  to try and follow."** Camera and view turns stay followable on a phone: no whip pans; looks ease in and out at a
  capped speed (searching or glancing included), and the view settles on something long enough to read it.
- **Owner, 2026-11-11, on desire_town and inside_library: "For the desired town, it should show like the path, like
  breaking the obstacles that it's being put in. Not what we have right now. Then also for the inside library, like
  the cut is very, very obvious, because one, it shifts, and two, we like pause before we open the door. It'd be as if
  we just like walk straight out, and it's like without like stopping."** desire: the path visibly breaks through each
  obstacle the town puts in its way (it doesn't reroute around them). inside: the walk never stops: no pause before
  the door, the door opens mid-stride, and the view must not jump or shift at the hidden cut (position, look and speed
  identical on both sides).
- **Owner, 2026-11-11, asked whether the HelloBuh lead should publish Shorts that the separate format sessions
  build and review (their permission check blocks the GitHub Release upload): "Yes".** Format sessions stop at
  "independently reviewed READY"; the HelloBuh lead publishes them from its session and adds them to the queue.
- **Owner, 2026-11-11, Review Room notes on the ready Shorts: "still says hellobuh" / "all of these still say hellobuh
  instead of 56e" (cave_reveal, creeper, half_heart, lava_crossing, tnt_1000, which_door); pickaxe_race: "why is there a
  cut when we are using the wooden pick?" "actually theres a cut for all." "Also, we should have like a timer...";
  guess_sound_2: "when we look over at the mob, we arent looking directly at it."; fortune: "The items are all
  upsidedown?? Also we should have more drop."; mega_sponge: "the cuts are too jarring, it looks like we get stuck";
  tnt_1000: "the title could be like vs SECRET or smth idk bc i wouldve swiped after 1000".** Every Short shows the player
  as 56e (death messages, chat, command feedback), re-renders of older recordings included. No cut in the middle of an
  action (a dig, a place, a use): cut between actions. When the view turns to a mob or thing, it lands centred on it.
  Dropped items render the right way up (an engine bug). Cuts never look like the player got stuck. A title promises
  something past the obvious end point, so the viewer stays for it.
- **Owner, 2026-11-11: "make everything, then put all of it into a review folder. dont let anything go to youtube
  anymore without an OK from me"; "the \"review folder\" is the review artifact"; "show what i need to review there,
  then archive the rest (still available)".** Nothing uploads without the owner's OK for that exact cut:
  scripts/youtube_upload.py skips any Short without a line in uploads/owner_ok.txt naming the sha256 of the video the
  owner watched (scripts/owner_ok.py add, only after the owner says OK); a re-published Short needs a new OK. Every
  ready Short goes on the review artifact; what is already decided is archived there, still viewable.
- **Owner, 2026-11-11, on the skin stills: "i want it to be regular arms, the slim dont look good".** The player 56e
  renders with regular (wide, classic) arms; the slim-painted arm art is widened to the wide layout (a duplicated column
  per arm face) so no black stripes show. Supersedes the slim-arm auto-detect for 56e.
- **Owner, 2026-11-11: "maybe we should use my real minecraft username: 56e".** HelloBuh stunts play as `56e` (the
  harness's default bot name; it shows in death messages, chat and command feedback). Stories keep their character
  names (botName 'Buh', 'Milo'). Already-uploaded Shorts are unchanged; Shorts re-recorded from now on carry it.
- **Owner, 2026-11-11, on the time-lapse Shorts (lapse_statue, lapse_rocket): "for the time lapse stuff, like we should
  have more angles when we're showing the last thing, and then also... the second one, like I think our smoother camera
  movement is like too slow. I think it's okay to have like a really fast movement here because it's like, what, a
  time lapse, right? Like right now, it's like I places and I take forever to turn."** In a lapse_* Short the 1-hour
  build is shown from several clearly different angles (hard cuts between steady shots: a new angle, not a small jump
  of the same view). In the sped-up 1-minute round the player turns fast between placements, as a sped-up player would;
  the followable-camera speed cap does not apply inside a time-lapse's sped-up build spans (it still applies at normal
  speed). Supersedes, for lapse_* builds, the 220/speed turn cap added to lib/time_lapse.js today.
- **Owner, 2026-11-11, after the lead sent every Short it called ready (and asked whether the clutch Shorts' quick
  look-down flick counts as a whip, and whether to hold four approved story Shorts the new whip check flags): "All
  ok".** The Shorts sent today are approved as they are; the new formats (cells, dilemma, race, mislabel, hack, desire,
  inside, interrupt, mega) go first in the queue. A clutch Short's single quick look-down at the landing is allowed
  (the genre's look; boat_clutch, clutch_harder); every other turn keeps the followable-camera rule. The approved
  story experiments (sun_wont_set, respawn_voice, chunk_next_door, sheep_stares) ship as they are.
- **Owner, 2026-11-11, reviewing the ready Shorts by hand: "when we're building the statue, so I guess lapsed
  statue, we pause for some reason when we're building the second one. Like for like what seems like more than just a
  while."** A build never stalls on screen: while a build is unfinished, blocks keep going on (in a time-lapse, every
  output second shows new blocks); no hold between stages or builds unless it is a beat with a caption.
- **Owner, 2026-11-11: "The sound effect at the end of boat clutch sounds like a fart, change it out".** No sound
  that can read as a fart (low, buzzy, pitched-down blurts, squelches, low brass): the payoff hit is a clean impact,
  splash or vanilla sound. A sound the owner calls out is banned for every Short, not only that one.
- **Owner, 2026-11-11: "the timer should reset every single time like we start a new ender portal."** An on-screen
  timer times ONE attempt: it resets to 0 at the start of each new build or attempt (each portal in end_portal_job),
  never runs on across them.
- **Owner, 2026-11-11: "The rocket time lapse has a ton for jerking around between shots".** A time-lapse holds one
  steady camera (or one smooth move) across its shots: no jumps in angle, distance or height between consecutive
  shots of the same build; the viewer's eye stays on the build.
- **Owner, 2026-11-11: "for the torch sand falling, we should let the last pillar of sand all fall before we
  end/cut"; "our processes must cover all of these."** A Short never cuts or ends while its payoff is still moving:
  every falling block has landed, the blast debris has settled, the mob's death puff is done. The payoff moment is when
  the motion settles, and the 1 s end limit counts from there. Every owner note like these becomes an automatic check
  in ./hb check / pace, not only a review note.
- **Owner, 2026-11-11, on the newly published Shorts: "for the torch, we need to look where we are placing/breaking,
  its fine to be fast but right now it just looks like hacking. also, the lava lake lowkey like ragebait but thats ok.
  the rainbow sheep we are not looking at the right sheep when we dye..."** Every place, break, use and dye happens
  under the crosshair, on every stunt: speed is fine, but the view must be on the block or mob being acted on when it
  happens (no acting off-screen or off-aim; that reads as hacking). sand_tower's torch trick and rainbow_sheep's dyeing
  get fixed to this; water_vs_lava's black-lake ending stays.
- **Owner, 2026-11-11, on the re-made pixel-art Shorts: "here the creeper tracks where we're placing the blocks the
  best, which I think is good, but it does this weird thing where it walks all the way back into like the other one,
  and it's like halfway against the wall when it's like building the last one, which I think is a little bit
  weird."** Pixel-art builds follow creeper_art's look: the view tracks where each block lands. The player never backs
  into an earlier wall: the set leaves enough clear room behind every build position, and the camera is never pressed
  against or inside another build.
- **Owner, 2026-11-11, sharing Beazle's "BRO" (caption "Genuinely gotta check if everything is okay at home after ts",
  subtitle "the type of house that your one actually psycho homie builds": a front door ringed by fire, a burning
  wheat field, then inside a nether-brick mansion whose floors are open lava, a bed and furnaces perched on one-wide
  walkways over it): "fake psycho house".** HelloBuh adds a psycho-house format (family `psycho`): a base tour that
  looks almost normal from the door and turns out insanely dangerous inside (lava floors, fire, one-wide walkways),
  played straight as a house tour.
- **Owner, 2026-11-11, via the Buh Connects operator (forwarded at the owner's request): a "Fastest Speedrun Ever"
  Short the owner called "obviously fake, badly made, with typos and everything".** (Music only, one banner, 67 s:
  an impossible speedrun in jump cuts: a portal missing obsidian lit anyway, full netherite already on the way back,
  an end portal full of lava, typo'd item labels.) HelloBuh adds a fake-speedrun format (family `fakerun`): an
  obviously impossible "speedrun" told in jump cuts with a deliberately wrong detail or two, built as comment bait
  (viewers call out the cheats); measure comments per 1k views as well as viewed % and subs per 1k.
- **Owner, 2026-11-11, sharing Technoblade's "Sand Art" Short: "huge sand art".** (A giant pixel picture made of
  concrete powder poured from the sky: the blocks fall and pile into pyramids, the camera rides down the slopes of
  colour, a subscriber-counter overlay ticks to 1,000,000.) HelloBuh adds a sand-art format (family `sandart`): a
  HUGE picture made of falling concrete powder (or sand and gravel) dropped from above, so it builds itself by gravity;
  the camera sits close in the falling blocks, then pulls up to reveal the whole picture. Our own picture and caption;
  no other creator's name, likeness or overlay. The settle rule holds: never cut or end while blocks still fall.
- **Owner, 2026-11-11, sharing Necroncore's "what was your favorite version?" time-lapse (a crater dug in a real
  landscape, a giant grass block rising in it, then a giant iron golem holding Steve and Alex, a wolf beside it):
  "huge mega build, like ridiculously big".** The `mega` time-lapse variant goes BIGGER: the build must dwarf the
  landscape (hundreds of blocks across, a real terrain around it for scale), shown from high up so the scale reads,
  ending on a close pass that shows how small the player is next to it.
- **Owner, 2026-11-11, sharing a "fananimation" dropper Short (a yellow shaft, "Attempt #1", "#3", "#15" captions,
  a red-and-green target far below, the landing on #15): "Huge dropper?"** HelloBuh adds a dropper format (family
  `dropper`): a HUGE, tall dropper fallen in first person, an attempt counter on screen, quick failed attempts cut
  together, then the clean landing as the payoff. Our own shaft, obstacles and target; failed attempts end on a cut
  before the death (no death puff left on screen), and the landing must be true vanilla (water, slime, hay, etc.).
- **Owner, 2026-11-11, sharing "Minecraft Dirt Moment" (caption "bro found dirt for ONCE": a whole world where the
  ground, hills and everything are one other block, and the player digs a lone patch of real dirt under a tree like
  it's treasure): "fake world?"** HelloBuh adds a fake-world format (family `fakeworld`): a world where everything is
  one wrong block (planks, glass, gold, sponge...) shown as normal survival, and the one ordinary block found in it
  is treated like a rare treasure. Built by generating the world from our own block swap, never a copied map.
- **Owner, 2026-11-11, sharing NoschiTech's "#memeanimation" (caption "a diabolical trap that made my friend hate
  me...": a lake with a glass-roofed underwater base, the friend dives for it, the real base is a fake, a tunnel
  and a hidden drop end in a glass cage): "trapping friend".** HelloBuh adds a friend-trap format (family `trap`):
  build an irresistible bait (a base, loot, a portal), show how it works, then the friend walks into it; the trap
  must really work in vanilla (minecraft-audit) and the friend is a second bot, never the owner's name.
- **Owner, 2026-11-11, sharing struxo's "Beginner Friendly Nether Boss Build Timelapse" (a drone time-lapse of a
  mangrove swamp cleared and a huge crimson/warped boss statue rising, with block counters ticking in a corner):
  "another megabuild example".** For the `mega` time-lapse: a running count of blocks used, ticking up, is a good
  overlay; the build stays our own design, at a ridiculous scale.
- **Owner, 2026-11-11, Review Room note on mega_lapse_fountain: "can we make the build more complicated, it looks a
  bti flat right now. also we should put it in a real world, not superflat..."** Mega builds need depth and detail
  (layers, overhangs, varied heights and materials, not flat tiers), and they sit in a real generated world (terrain,
  trees, water) instead of superflat, so the scale reads against real land.
- **Owner, 2026-11-11, Review Room note on cooked_bedrock: "need to have the ominous music".** The `cooked` payoff
  plays an ominous, dread-building track on the drop (dark NCS or a low drone and hit), not an upbeat bed.
- **Owner, 2026-11-11: "We should focus on making our opening phrase more eye-catching. And you do research on how
  the other opening frames, like on big YouTubers ... Minecraft shorts specifically?" then, after the queue review,
  "Fix everything, please."** Every Short's frame 0 shows the thing the video is about (the subject or the payoff's
  setup: the creeper, the trap, the TNT, the build), already in motion by 0.5 s; never an empty field, plain grass, a
  bare wall or a still room. The caption reads like a person reacting ("I hate this job 😭", "Am I cooked?", "bro
  found dirt for ONCE 💀"), not a label ("ladder clutch"). Measured on the owner's 32 references: all show the subject
  at frame 0, nearly all with a reaction-style caption in the top band.
- **Owner, 2026-11-11: "Generally, I think we need to have faster cuts. Like, after the stunt is done, we just cut.
  After we have done something, like, we just cut, go to the next thing. ... it can't be too fast, but it can't be so
  slow either. It's like, right now, we blow up the TNT, wait for, like, what feels like forever, then we cut. We
  should need to, like, go boom, boom, boom, fast, fast pace."** Cut as soon as an action's result reads: about
  0.3-0.6 s after the hit (the block lands, the boom's flash and blast), then straight to the next beat. Never wait
  for smoke, particles or drifting debris to clear. This narrows the settle rule (r:r24d99a): still no cut while the
  thing itself is happening (a block mid-fall, a mob mid-death, the blast still going off), but smoke and particles
  no longer hold a cut or the end. The end comes about 0.5-0.8 s after the payoff's result.
- **Owner, 2026-11-11, on underdog_heal: "For the one where we're feeding like the health, like we started to show
  like their health overhead, like with like hearts and like empty hearts and stuff."** In the `underdog` (healing)
  format, each hurt mob shows its health above its head as a row of Minecraft hearts (full, half and empty, the HUD
  heart style), and the row fills up as it's healed, so the heal reads at a glance. The hearts track the mob's real
  health from the recording.
- **Owner, 2026-11-11, on fakemod_permission: "Also, for the fake mod thing, I think the pop-up should be in the middle
  of the screen rather than at the top."** In the `fakemod` format, the permission popup sits centred in the game view
  (like a real modal dialog over the action), not at the top.
- **Owner, 2026-11-12, asked whether to keep the 30 s minimum (2026-11-06) or drop it: "no fixed minimum, just don't
  pad them".** A Short is as long as its beats need. There is no minimum length for a stunt (the 30 s rule of
  2026-11-06 is retired). Padding is the blocker instead: a beat added or stretched only to reach a length, a beat
  that could be cut without losing anything, or dwell after a result (r:r188b46).
- **Owner, 2026-11-11, Review Room notes: on tnt (9.5 s) "This needs to be longer, this is low-key a no op reel. Every
  one we make must give the viewer satisfaction"; on logic_minecraft "We spend too long looking at the fire after the
  TNT"; on tnt_1000 "Need faster cuts generally between shots.."** Every Short must pay the viewer off with a real,
  satisfying result: big enough to be worth the watch, never a setup with a small or quick fizzle ("no-op"). Short is
  fine (r:r064ca4), but a Short whose payoff doesn't land needs a bigger payoff, not padding. The two cut notes are
  r:r188b46.
- **Owner, 2026-11-12, on mislabel_grandma v2: "Need to be like left right doubel extensions not this going up. Also
  the cuts need to be cleaner, we should do into a hole 1x1 and then come out of the sky? need cleaner"** The
  `mislabel` parkour uses sideways (left/right) double extensions, the classic bridge-out move, not blocks placed
  upward. The transition is one clean move: drop into a 1x1 hole, cut, come out of the sky.
- **Owner, 2026-11-12: "We need to be optimizing our hook as well as the viewer satisfaction. They need to look at the
  reel, and when they're done watching it, be like, I got something out of that. It can't be a no-op, bro. It
  absolutely cannot be a no-op."** Every Short is judged on two things before anything else: the hook (r:r0f3da0) and
  the takeaway. The takeaway test: in one sentence, what did the viewer get out of it (a laugh at a clear joke, a
  "whoa" at a big result, a satisfying finish, a thing they didn't know)? If the honest answer is "nothing much", a
  small result, or "it just ends", the Short is a no-op and does not ship: make the payoff bigger or drop it.
- **Owner, 2026-11-12, on the no-op audit: "We should not ship any no ops. we should fix all of them or just drop or
  redo or anyhting yk" and "Also fix the borderline as well. All of them need to 'make sense' and leave teh viewer
  happy and satisfied."** No Short ships unless an independent reviewer's takeaway says it makes sense and pays off.
  No-ops are redone or dropped; borderline Shorts get one bigger, clearer last beat. The audit and every fix:
  docs/noop_audit_2026-11-12.md.
- **Owner, 2026-11-12, Review Room notes:** on mislabel_grandma "wtf is this parkour. the double extension is like
  you jump, place 2 blocks, and then land etc (without the blocks, the jump would hav ebeen impopssile)", "we should
  move our camera... like the art should be vertical, and we look at it tracking it as we fall", "we should have the
  name whenver the number pops up, like 4. lime jello for the full time, not 4 before", "the loop needs ot work too";
  on trap_free_diamonds "We should have more setup for the trap. Like go all the way down and then lava or fire etc";
  on mega_lapse_fox "the beaet drops before the ears appear"; on lapse_house "make the house more fancy, and it doesnt
  need to be superflat"; on guess_sound "nothing really happens this first bit, people will scroll". The general
  rules: a double extension is a mid-air clutch (jump a gap you can't make, place 2 blocks under you in the air,
  land on them); a list item's number and name appear together and stay up for the whole item; a Short that loops
  must loop seamlessly (the last frame leads into the first); a build sits in a real world, not superflat, and is
  detailed; the music drop lands on the payoff's reveal, never before it; and something happens from the first
  frame (r:r0f3da0).
- **Owner, 2026-11-11: "moral dillema? like i just saw one that shows someone falling, about to lose hardcore, and
  they have a mace, and their dog is there, they can hit the dog and survive, or die. and it drags on for a while,
  fall in slow motion from multiple angles. and then he survives without doing anything bc of feather falling 4"**
  HelloBuh adds a moral-dilemma format (family `dilemma`): a life-or-death choice frozen mid-moment (hardcore hearts,
  a sacrifice that would save you), stretched out in slow motion from several angles to build the tension, then a
  twist that makes the choice unnecessary. The twist must be true vanilla (minecraft-audit): e.g. the fall height is
  chosen so Feather Falling IV really saves a full-health player.
- **Owner, 2026-11-11, sharing NoschiTech's "#memeanimation" (caption "POV: the 3 stages of playing with friends",
  with chapter titles: "1. Betrayal" (your friend knocks you into lava, you scrape out on half a heart), "2. Rise"
  (a portal, the Nether, ancient debris, a netherite upgrade), "3. Revenge" (a TNT cannon flattens the friend's
  mansion); 85 s): "and this too".** HelloBuh saves a chaptered "stages of" format (family `stages`): a relatable
  arc told in 3 titled chapters, each fast and escalating, ending on a big payoff.
- **Owner, 2026-11-11, sharing hazypapa's "The Most Bullied mob Ever in Minecraft" (caption "we can repair them
  but...": a quick list of every mob the player can heal or fix (a wolf with meat, a cat with fish, a horse with
  hay, a camel with cactus, an iron golem with iron, a copper golem, a zombie villager cured), then the caption flips
  to "...but what about him?" over a lone snow golem in the sun, with a soft sung track): "whatever this is".**
  HelloBuh saves it as a but-what-about-him format (family `underdog`): a fast list where the game treats every mob
  one way, then the one mob it forgot, played for sympathy and laughs.
- **Owner, 2026-11-11, sharing Galaxscat's "Minecraft Baby Zombie Moment" (caption "POV: A baby zombie found you",
  31 s: a blur-fast chase that tears straight through stone walls, a pen of pigs and a row of mobs, through a village
  house, out the other side and down into the Nether; nothing slows it): "whatever even is this".** HelloBuh saves it as
  an exaggerated-mob-POV format (family `mobpov`): a mob players find annoying (the baby zombie's speed, the
  creeper's sneak, the phantom's timing) blown up into an unstoppable, absurdly fast POV chase through everything.
- **Owner, 2026-11-11, sharing Silly Willies' "We all have that one bro" (10 s, caption "That one friend when you
  start a new world": you're still standing at the first tree while your friend strips it in a blink and a whole house
  is already up behind you): "i think this is like hacking friend? like its a relatable beat, just exagerated".**
  HelloBuh adds a that-one-friend format (family `friend`): a relatable multiplayer moment ("that one friend
  who..."), shown from your point of view with the friend's part exaggerated to the absurd; short and punchy.
- **Owner, 2026-11-11, sharing Galaxscat's "Minecraft meme" (caption "I thougt he was just lagging": a bridge fight
  over the void with a Steve-looking player who stutters and rubber-bands like lag; his bridge breaks under him and
  he just keeps standing on air, the white-eyed reveal, then he drifts off into the sky): "secret herobrine".**
  HelloBuh adds a secret-Herobrine format (family `herobrine`): an ordinary-seeming player whose "lag" (stutters,
  rubber-banding, standing on nothing) grows until the reveal that it was never lag; the caption plays it as a normal
  complaint.
- **Owner, 2026-11-11, sharing YalkyGM's "Who tf is doing this" (one fixed top-down shot of two houses either side
  of a road: a dirt shortcut keeps wearing across the grass, the "town" answers with a crosswalk, a bush, a tree,
  railway tracks, walls, barriers, a boulder, a pond, then lava, and the path comes back around every one): "desire
  paths format".** HelloBuh adds a desire-paths format (family `desire`): one locked camera, an escalating back-and-forth
  between an unseen walker's shortcut and ever more absurd obstacles, each round a beat; the path always wins.
- **Owner, 2026-11-11, sharing "Every Time I Snap" (caption "Why does my house always end up like this?", 11 s: from
  inside a stone chimney past the campfire into a cosy wooden room, out the door, and the house outside is a small,
  plain box that can't hold what was inside): "this one lends to replays, since its short and the inside differs from
  the outside so its confusing and the cut is not obvious."** HelloBuh adds a bigger-on-the-inside format (family
  `inside`): one continuous-looking walk from a detailed interior out to an exterior that can't contain it, the
  cut hidden in a door or a dark frame, short (about 8-12 s) so viewers replay to find the trick.
- **Owner, 2026-11-11, sharing an "aura" Short (caption "Bro just used all the luck left in his life": digging
  straight down hits diamonds, then lava saved by a water bucket, then an emerald vein, then breaks straight into a
  stronghold's end portal room beside the spawner; 19 s): "fake super lucky".** HelloBuh adds a staged-luck format
  (family `lucky`): a dig, fall or run where every next block is impossibly lucky, each luckier than the last, all
  vanilla mechanics, staged by the set.
- **Owner, 2026-11-11: "another one i saw is like fake secret chest in desert pyramid that takes like the entire
  video to get to and theres like parkour and tunnels etc."** HelloBuh adds a quest format (family `quest`): a
  "secret chest" hidden under a desert pyramid (or similar), and the whole Short is the escalating way down to it:
  hidden buttons, tunnels, parkour, traps, each stage harder, the chest opened only at the very end.
- **Owner, 2026-11-11, sharing a "Send This To Someone You Love Most 😍💗" Short (a redstone-and-lamp heart laid out
  in a cherry grove, the night falls, the heart lights up and fireworks burst around it in a ring): "This is another
  one thats like a heart and its cute and lovey".** HelloBuh adds a love format (family `love`): a cute, wholesome
  build with a heart reveal at night (lamps, fireworks), captioned to be sent to someone; made to be shared.
- **Owner, 2026-11-11, sharing ThreexyMC's "Yeah its over bro" (caption "Am i cooked?": the player mines down through
  a diamond vein and through bedrock into the dark, then the chat fills with "[Notch] joined the game", "[Microsoft]",
  "[Mojang]", "[FBI]", "[Interpol]", "[IRS]", "[Herobrine]", "[NASA]"... over a war-movie soldier image with a
  dramatic track): "this one is like doing something impossible, and then having like creators of minecraft join on
  like the war image in the backgorund, and this is music speciifc too, need to sue their music".** HelloBuh adds a
  "cooked" format (family `cooked`): an impossible feat, then an escalating flood of "X joined the game" as the
  consequences arrive, over a dramatic still, cut to one specific dramatic track.
- **Owner, 2026-11-11, sharing KingTEC's "POV: You Made FUNCTIONAL Cabinets in Minecraft" (caption "POV: You
  realized you can use doors and cushions to make functional gates and cabinets"; a quick first-person demo of the
  trick in a real kitchen and library, 16 s): "another format, cool minecraft gimmicks".** HelloBuh adds a build-hack
  format (family `hack`): one clever, real block trick per Short, a "POV: you realized..." caption, shown working in
  a lived-in build within the first 1.5 s.
- **Owner, 2026-11-11, on moving finished videos out of git history to GitHub Releases (permanent, no expiry, only
  metadata in the repo) and dropping anvil_rain / lava_rising (they repeat it_rains and worse_lava): "sure we can do
  that".** Finished Short mp4s live as GitHub Release assets; the videos branch keeps metadata; the uploader downloads
  from the release. anvil_rain and lava_rising are dropped (status `dropped`), never uploaded.
- **Owner, 2026-11-11: "please tell me ur saving all of the formats im sending you".** Every format the owner sends
  is saved in docs/formats.md (what the reference does, the owner's words, our family name, status), alongside its
  house rule here.
- **Owner, 2026-11-11, sharing ItsMeMx's Minas Tirith time-lapse (caption "We need a small castle to mark the
  spawn", then a drone-style time-lapse as arches, a plateau and a whole tiered white city rise over 21 s): "this
  gimmick is like ridiculous megabuild".** Part of the `mega` family (r:r8bb1e3): the second variant is a time-lapse
  build-up, an understated request in the caption and the build escalating far past it, ending on the full reveal.
- **Owner, 2026-11-11, sharing hazypapa's "Monsters can't sleep, I am nearby" (a slow walk down a white lab corridor
  of glass cells, each holding a mob stuck in a contraption doing one thing forever; caption "i think bro is doing it
  for fun"): "here is another format. its like a bunch of cells where mobs are forced to do things repeitively
  forever."** HelloBuh adds a cells format (family `cells`): a walk-past of glass cells, each a mob in its own endless
  loop (vanilla mechanics: minecart loops, pistons, water streams, redstone clocks), a deadpan caption.
- **Owner, 2026-11-11, sharing Mevys's "Maddest End Ever" ("Nobody Knows That! 😱": a lit nether portal carried
  around by pistons and redstone, then refitted into a gold-block frame, all impossible in vanilla but shown as a
  secret trick): "this is like fake minecraft gimmick".** HelloBuh adds a fake-trick format (family `faketrick`): an
  impossible "secret" played completely straight as if it were real. The fake is the bait (comments say "this doesn't
  work"), so the minecraft-audit's vanilla rule is waived for the trick itself only; everything around it stays
  vanilla-correct.
- **Owner, 2026-11-11: "I think hello buh should use the bright grading as well."** HelloBuh's stunt Shorts get the
  bright look by default (a stunt with no `look`), tuned so the daytime sky doesn't blow out to white (the story
  'bright' grade, unchanged on a plain stunt, washed the sky out in the first A/B).
- **Owner, 2026-11-11, sharing Glowe's "Makes no sense" ("Minecraft logic 💀": a minute of rapid vanilla quirks, one
  after another): "Do we have any formats like this? like 'minevraft logic'".** We had the ideas (docs/ideas.md
  "Physics and minecraft logic") but no format; HelloBuh adds one (family `logic`): real vanilla quirks, fast, one
  caption, each quirk set up and paid off in a few seconds.
- **Owner, 2026-11-11, sharing reo's "Low control minecraft" (a fake mod: "The best mod i've ever downloaded", a
  creeper walks up and a GUI asks "A creeper is asking for permission to explode" with Allow / Deny / Roll): "this
  could be like a fake mod".** HelloBuh adds a fake-mod format (family `fakemod`): normal gameplay, an absurd fake mod
  menu or popup appears at the key moment, the choice plays out. Our own mods and menus, drawn in the edit.
- **Owner, 2026-11-11, sharing a "Top 5 things I found under ur dad's bed" Short (a parkour + dropper fall as the hook,
  then giant builds seen on the way down, each with a wrong, innocent-sounding label): "the gimmick with thsi one is
  that it starts with a very trick like parkour and dropper, so its very hook grabbing. but then it shows things that
  are mislabeled, but here its. alittle bit innapropirate so i dont like that, but its itneresting."** HelloBuh tries
  an original, CLEAN take (family `mislabel`): a parkour/dropper hook in the first second, then a numbered list of
  giant builds with funny wrong labels. No innuendo, nothing sexual or crude; the joke is the label, kid-safe.
- **Owner, 2026-11-11, sharing TECHSIN PLAYZ's "Finally, a CRAZY Minecraft illusion" Short: "the gimmick with this is
  its a normal video with a skeleton shooting and he goes over and eats it and then pretneds nothing happened and goes
  back tot eh video".** HelloBuh tries an original take (family `interrupt`): a Short that plays straight as a normal
  video, a mob interrupts, the player deals with it in an absurd way, then carries on as if nothing happened.
- **Owner, 2026-11-11, sharing KRIZZIT's "Daylight Edition" Short (a giant fractal pyramid, an elytra fly-around
  and dive inside, captioned "7 seconds of my life went into this build"): "new format to try".** HelloBuh tries an
  original take on the format (family `mega`): an absurdly big generated build shown from frame 1, an understated
  ironic caption on top the whole time, an elytra fly-around that ends diving inside. Our own structures, caption
  wording and music; never a copy of that Short.
- **Owner, 2026-11-11, on the music sitting over the game sounds in most queued Shorts (music 1-12 dB above the
  biggest game sounds; only 3 of 18 had the game on top): "fix all i think".** The music bed comes down for every
  stunt Short (about 3 dB, so the game's own hits carry the payoff), and every ready, not-yet-uploaded Short is
  remixed to the new level.
- **Owner, 2026-11-11: "We should be trying for high views and high conversion right?" (yes to ranking formats by
  expected subscribers per upload); "low views might be the format, but it could also just be us not doing it well.
  for example the guess the mob had super loud music..."** The uploader ranks formats by expected subscribers per
  upload (typical views x subs per 1k views, both shrunk toward the channel average, so one weak Short doesn't sink a
  format). A Short that flops gets a cause before its format is blamed: check its execution first (music over the
  voice or the key sound, a slow first 1.5 s, an unreadable stunt), fix the same fault in its queued siblings.
- **Owner, 2026-11-11, on HelloBuh's views stalling under ~3k after the first three Shorts: "Check numbers... Maybe we
  can have an exnteion gather all of the metrics you need?"** Studio numbers the API lacks (viewed vs swiped away, the
  retention curve, traffic sources, busiest hours) come from Claude in Chrome with docs/studio-metrics-prompt.md, every
  2-3 days; `scripts/studio_import.py` loads the answer into uploads/studio.json for the scores and the numbers check.
- **Owner, 2026-11-11: "wait why cant hello buh still post these stories? we can use it sorta like experimentation?"**
  @HelloBuh may post story Shorts too, as experiments: the older ready stories (chunk_next_door, nitwit, respawn_voice,
  sheep_stares, sun_wont_set) stay on HelloBuh's queue (`channel: hellobuh`). A story package with no channel field
  defaults to Buh Stories; the lead sets `channel` per story. Story subs per 1k views on HelloBuh are data for both
  channels.
- **Owner, 2026-11-11, after the Gold A/B (A cinematic, B bright with zoom punches): "I think that bright looks
  better".** Story Shorts use B: the stunt's `look: 'bright'` and `edit.punchStress: true` (main 6632d43), on every
  story from now on.
- **Owner, 2026-11-11 (review page, Thirty-One Raids and Good Boy): "The woosh is wierd and jarring. We should have
  better soudn effects and sounde ngineering."; "the sound effect here is weird".** No whoosh or transition SFX on any
  cut, and every sound in a story is one the viewer would expect from what's on screen (vanilla sounds, the mood score,
  the payoff hit), mixed so none of them jumps out over the voice. A sound that makes the owner stop is a blocker.
- **Owner, 2026-11-11 (review page, Good Boy at 0:00.6): "here the camera is inside of the block, so we can see inside
  of it."** The camera never sits inside or clips through a block in any shot; the eye is always in air.
- **Owner, 2026-11-11 (review page, Gold for the Portal): "grandma's voice is also gravelly, i think it can read as
  like a woman more?"** Every character's voice reads as that character at first hearing: a grandma sounds like an
  older woman, not gravelly or sexless. Cast from the voice list to the character's age and sex.
- **Owner, 2026-11-11 (review page, Dog on the Hill at 0:27.9): "we should cut as soon as the guy leaves. end of
  short".** The Short ends the moment its last story beat lands (in Dog on the Hill: Buh leaving); no shots after it.
- **Owner, 2026-11-11, asked whether "Buh joined the game" / "Buh left the game" should be in the middle of the screen
  (recommended: centred, vanilla chat style, off the dog): "sure".** In story Shorts the join/leave chat lines (and any
  payoff system chat) are centred horizontally near the caption height, in the vanilla yellow chat font and strip at
  `chatScale` size, placed so they never cover the shot's subject.
- **Owner, 2026-11-11, on the bright previews' zoom punch on every sentence: "what are all of these bouncy zooms?";
  offered all / smaller / big moments only / none: "only the big ones i think".** `edit.punchStress` punches only the
  big moments: the hook, the turn and the reveal (story.json `"punch": true` on those lines, at most 4; none marked:
  the first and last line), one punch each on the line's stressed word. Supersedes one punch per sentence.
- **Owner, 2026-11-11, after listening to Light Sleeper's raw Pip one_take (sentence breaks 0.62-0.91 s, rejected by
  the 0.6 s gate; the v2 cut the voice was picked from measures 0.62-0.80 s inside its lines): "This is fine".** That
  pacing is the voice the owner chose: the narrator's take gate allows sentence breaks up to 0.95 s (cast `narrator`
  `max_pause.rest`). Takes are still never trimmed, and a longer pause, a breath or a wrong word is still re-taken. The
  opening rule (no gap over 0.6 s in the first 5 s) is unchanged.
- **Owner, 2026-11-11, after watching the held cuts: "The moms voice is too similar to narrator, need a new voice.
  Grandma sounds like a dude still. Can you explore options?"** A character voice must be told apart from the narrator
  (Pip, a bright kid) at first hearing, and must read as its character's age and sex: Mom is recast (Sulafat sounds too
  close to Pip) and Grandma recast again (Vindemiatrix still reads as a man), each chosen by the owner from an audition
  of candidates saying the story's real line, measured against Pip (pitch and speaker distance).
- **Owner, 2026-11-11, on Gold for the Portal: "when we say "string" in the piglin short, no string is on screen".**
  Every thing the narration names is on screen, readable, while its words are said (the string on "a little string",
  the pearls on "ender pearls"). Each line lists what it names (story.json `shows`), and the recording is checked for
  each one in frame during that line.
- **Owner, 2026-11-11, from the Mom/Grandma audition (brand/auditions/2026-11-11_mom_grandma, branch
  claude/audition-mom-grandma): "mom D / grandma J".** Mom is **Pulcherrima** (was Sulafat, too close to Pip);
  Grandma is **Autonoe** (was Vindemiatrix, read as a man). Each is directed with one short bracketed clause and
  voiced on the story's character model; Light Sleeper's two Mom lines and Gold's Grandma line are re-voiced.
- **Owner, 2026-11-11, after watching the held cuts (Light Sleeper 52 s, Gold 50 s, Dog on the Hill 50 s): "i think the
  current length is fine, we shouldnt harp too much on length".** About 50 s at Pip's natural pace is fine. Length is
  not a reason to cut lines or re-voice; a line goes only if it doesn't move the question. pace keeps only its floor
  BLOCK; anything over 45 s is a note, never a blocker or a fix request.
- **Owner, 2026-11-11, on Good Boy's voiced preview: "The opening scene is not very exciting? Also not centered."**
  Its first 4 s were Buh walking a dirt road with the dog (the narrator, the story's subject) small at the right edge.
  The opening shot puts the story's subject (the shot's `subject`, else line 1's) in frame from frame 1, in the middle
  third of the frame and big enough to read at phone size, with something story-relevant already moving (the subject,
  the cast, an action or a camera push) in the first 0.5 s; never a static or empty establishing frame.
- **Owner, 2026-11-11, asked whether the narrator heard as a girl by the viewer panel is OK: "narrator is fine".** Pip
  stays as is; the viewer panel's girl/boy read of the narrator is not a finding.
- **Owner, 2026-11-11: "keep the producer off. We should be doing the stories more manually just for now until our
  process is good... try and get the premises first. I want good premises. And then good premises can turn into good
  scripts and good stories. And then once we audit those... we can start writing the scripts for them. One session
  per script."** The daily story producer stays off. New stories go in owner-audited stages: a premise shortlist first
  (the owner picks), then one session per picked premise writes its script (the writers' room, critic, cold read),
  and the owner audits the scripts before any voice or build.
- **Owner, 2026-11-11, on the batch-2 premise audit (docs/pitches/batch2_premise_audit_2026-11-11.md): "Whatever is
  suggested".** Batch 2 is the critic's five: The Wall Grows, The Bell in the Window, The Walk, Six Thousand Torches
  (in place of Goat Horn, which needs a goat model), Red Sheep (Grandpa becomes Dad). One session writes each script,
  with the audit's "must change" notes applied; the owner audits the scripts before voice or build.
- **Owner, 2026-11-11, on batch 2's scripts: "We need to have that sense of mystery. And naivety".** Every script
  is told by a kid who doesn't understand what they're seeing and says so plainly, with full trust: the kid explains
  each clue the wrong, innocent way (the wall keeps us safe, the bell is just loud, Grandpa is being silly), and the
  viewer starts to see what the kid can't. The kid never hints, foreshadows, sounds scared too early or explains the
  twist; the gap between what the kid believes and what the viewer suspects is the mystery. Every clue in the clue
  map has its innocent misreading in the kid's own words.
- **Owner, 2026-11-11, auditing batch 2's scripts:**
  - The Wall Grows: "ok for villagers to place blocks and climb ladders"; leaving "why doesn't the player dig in?"
    unanswered: "sure for that, we can have it as arguing in the comments".
  - Six Thousand Torches: "ok for the goodbye thats fine" (about 65% guess it at the midpoint; dramatic irony is
    fine); "Jonah is fine" (a new character, not Buh); his voice: "we should test. we need to keep track of our
    characters".
  - The Bell in the Window: the implied death is fine ("we dont actually show it"); "whole village runs inside is
    fine"; L10 takes "so he could see me".
  - The Walk: "sea freezes is good" (Grandma: "Come back when the sea FREEZES." N: "Mom says it NEVER freezes
    here."); "3 hundred is fine"; asked why its grandpa can't reuse a grandpa voice.
  - Red Sheep: "new kid is fine"; ending on the evoker's look with no fangs: "sure".
  Every speaking character is tracked in one place, docs/world/canon.md "Recurring characters" (who, look, cast id
  and voice, stories), and a new character's voice is auditioned against Pip before it's cast.
- **Owner, 2026-11-11, on Dog on the Hill (already OK'd): "maybe we can have buh say 'i just wanted to see you again,
  but I need to go already' or smth bc its kinda jarring to join then immediately leave".** A player who appears and
  leaves at once needs a word on why: Buh says why he came and that he can't stay before "Sit, BOY. Be right BACK."
  (L15 "Hey, BUDDY! I just wanted to SEE you again." L17 "But I gotta GO already. Sit, BOY. Be right BACK."). The
  OK'd package goes back to held until the owner re-OKs it.
- **Owner, 2026-11-11, on The Bell in the Window's Mom (Saltmouth, not Buh's Mom), candidates A Kore / E Callirrhoe
  from the Mom/Grandma audition: "A is fine".** Saltmouth's Mom is cast `mom_saltmouth`, Kore.
- **Owner, 2026-11-11, on The Walk's Grandma (not Gold's Grandma), candidate E Callirrhoe: "calirrhoe is fine".**
  The island Grandma is cast `grandma_island`, Callirrhoe, directed as an old woman; the first take must still read as
  an old woman to the blind listener (reads_as 60-85), or it comes back to the owner.
- **Owner, 2026-11-11, on the world: "i really liked how the hill and the place the dog was left was the same place and
  people watching both will be able to see its connected".** The strongest link between stories is the same exact
  place, seen again: the same spot, the same build, the same thing left behind (Good Boy's last login is Dog on the
  Hill's first frame). Every new story looks for one: set it where an earlier story happened, or leave something
  that a later story will show on the skyline.
- **Owner, 2026-11-11, on batch 3's first premise round: "theyre all ok, but we should review further... im not exactly
  sure how these were created, but i want to be more creative".** Premises are made in two phases: diverge first
  (several writers, each with one lens: strange narrators, player habits seen from the other side, game systems as
  mysteries, new moods; no other rules), then a cold-read gate (keep only ideas a fresh player can't guess at the
  midpoint, or guesses wrong), and only then the house rules, vanilla, place and build checks and the critic. The
  owner sees a ranked top 8 plus a wild-cards list, and how each idea was made.
- **Owner, 2026-11-11, on the batch-3 premises (round 1 and round 2): "do whatever you think is the best".** Batch 3's
  scripts: Pulled Away (round 1), Saving Up for a Bastion, The Singing Box Next Door, The Honey Thief (round 2), one
  session each (briefs: docs/pitches/batch3_script_briefs/); a round 3 of premises from the moods lens only (the lens
  readers couldn't predict). A Ghost for Five Minutes (hardcore, outside the shared world) is banked, not made.
- **Owner, 2026-11-11, auditing The Honey Thief: "giant can be jonah. no name tag".** The giant is Jonah (Six
  Thousand Torches' player, kai skin, his voice), 300 days before Torches; never named, his name tag hidden (the bees
  don't know his name; fans know the skin).
- **Owner, 2026-11-11, auditing Saving Up for a Bastion (cold read 60-65 %, dramatic irony; the second piglin-gold
  story, at Gold for the Portal's portal with the helmet piglin in the background): "ok all".** Approved as written;
  the player's voice is auditioned (Umbriel vs Zubenelgenubi; whichever Jonah doesn't take).
- **Owner, 2026-11-11, auditing Pulled Away and The Singing Box Next Door, and on the lead's note that the bottleneck is now
  building (voices, renderer pieces, skins) rather than pitching: "ok all".** Both scripts approved as written (with the
  lead's calls: Bramble Hollow, one egg, original skins); next, the engine work the approved scripts need, one
  session per piece.
- **Owner, 2026-11-11, auditing Seventy Below (the general is Ravenford's Grandpa in his `elder` voice, never named;
  one zombie burns in the sun, no gore): "Ok".** Approved as written.
- **Owner, 2026-11-11, relaying a friend's reaction to Gold for the Portal (upload #1): "im confsued bro, feel like i
  just wasted 10 seconds of my life bro".** A real first viewer didn't get it. Gold's twist takes several unspoken
  steps (piglins barter; Grandpa died there; a piglin wears his helmet; Grandma knows) and an unexplained name
  (Nico). From now on every script's cold read includes a CASUAL viewer (plays a little, not a Java expert, watching
  once at phone speed): the twist must land for them in one step from the picture, with no name or mechanic they
  weren't shown. A script the casual viewer can't explain in one sentence goes back to the writer.
- **Owner, 2026-11-11, asking how the Roblox story Shorts set up the mystery, then: "Yes, please rewrite all the
  stories as needed. We should be following the format, the tried and true format that already works for the Roblox
  stories, but now we're doing Minecraft stories instead."** Every script follows docs/story_format.md: the impossible
  fact and its "why?" said out loud in line 1, 3-5 two-way clues, the narrator as the one who wants to know, someone
  loved at stake, the rule turned against itself, the reveal SAID in one plain sentence (the naive narrator says what
  they see), one beat, cut, the last line echoing line 1. All 10 approved scripts are rewritten to it, one session
  each, and come back to the owner.
- **Owner, 2026-11-12: "What i want is more roblox style. Like the premise. Like in my town, nobody etc. Or in my
  world. Or my twin etc. its a crazy premise. it doesnt necessarily need to be minefrcaft themed yk?"** The premise is
  a crazy Roblox-story premise ("In my town, nobody...", "In my world...", "My twin...", "This man adopted 10 kids
  and..."): a strange rule or impossible fact about people, families, towns. Minecraft is the look (the world, the
  blocky characters, the places), not the twist: the twist no longer has to be a vanilla mechanic. Premises can come
  straight from blocky-stories (the owner's Roblox-style channel) and the Roblox hits. Everything else holds: the
  format (docs/story_format.md), naivety, the casual viewer gets it, the shared world as background.
- **Owner, 2026-11-12, asked "Should we do the likle 'in my world,... ' sort of intro or 'in my town'", then on the
  lead's plan (In my village / In my world / My [family member]): "sure lets do this, for all of them".** Line 1 opens
  with the genre's frame: "In my village..." (a local rule), "In my world..." (a rule for everyone), or "My twin / my
  grandpa / my best friend..." (a family premise), then the impossible fact and the "why?". All 10 approved scripts
  take it.
- **Owner, 2026-11-12: "Do we need to say and nobody will tell me why?"** No: the opener makes the viewer ask why
  without saying it. After the frame and the fact comes a short clause that makes it stranger ("...and not a single one
  came out alive"; "Only MY window."), different every story; no stock "nobody will tell me why" tag.
- **Owner, 2026-11-12: "I just heard a hook 'in the beginning, god was non binary' we need to make our hooks absurd".**
  Line 1 is absurd: a sentence nobody expects to hear, said flatly, that makes you stop scrolling ("I live under an
  old man's bed. With sixty-nine of my brothers."). Still true to the story, naive, and never a joke at a real group's
  expense. The casual cold reader judges it first: "would you stop scrolling?"
- **Owner, 2026-11-12, on the absurd hooks: "contraversial to a point".** A hook may be edgy and provocative inside the
  story's world (kidnapping, robbing, a kid "in love" with a bell, a grandpa "dumped"), the kind that makes people
  comment. It stops short of real-world flashpoints (religion, gender, politics, real people or groups), which risk the
  channel and aren't needed: the shock comes from the story's own absurd fact.
- **Owner, 2026-11-12, relaying a friend on the absurd hooks: "my friend said he didnt like the wall, and didnt knwo
  waht the grandpa one".** An absurd hook must still parse on first hearing (The Walk's "got DUMPED. Now he breaks
  LECTERNS" didn't) and carry tension (The Wall's "forty blocks high, still growing" had none). Each hook is gated by
  two fresh casual readers: understood instantly, a clear question, would keep watching.
- **Owner, 2026-11-12: "ask the buhtown what its found with its shorts metrics stuff, and what we can do to apply it
  to our content. We dont necessarily need them to all be grounded in minecraeft like topic sin my option."** Buhtown's
  Studio data (20 story Shorts, Nov 2-11; evanlin23/blocky-stories metrics/studio/2026-11-12.md, RULES.md): the stop
  rate (viewed vs swiped) is the gate: every Short at >= 81% viewed passed 10k views, every one under 80% stayed under
  2.6k even with great retention. The biggest drop is at 0:04-0:08, the beat after the hook. What we apply:
  - the first frame and the title are ONE strange, checkable fact, stated plainly ("The Elevator Mirror Shows FIVE",
    "Everyone's Born With HALF a Mark"); warning titles ("Never...", "...is DANGEROUS") did worse;
  - seconds 4-8 escalate: no setup, no backstory, no who's-who;
  - the reveal is one plain line that recasts the rule (confusion kills: "where did lemonade go?");
  - 30-45 s and loopable is the sweet spot; longer only with a very strong hook;
  - give viewers something to answer or argue in the comments;
  - premises that won: a rule with a number or mark, a person who changed overnight, warm twists; weaker: dark sets,
    monsters, sad family losses, warnings. Topics needn't be about Minecraft.
- **Owner, 2026-11-10: "some of the pacing is a little bit slow. Also, there's no like mystery. There's no like
  question to the user... the mystery is like what draws them in to keep them watching"; "need to cut right when the
  reveal"; "the best one I think is the carpet one, but the delivery is off"; "there's a delicate balance between being
  like too obvious and being confusing, and like trying to create a mystery out of that".**
  Every story opens a question to the viewer in the first 3 s that only the ending answers; a cold reader can guess at
  the midpoint but not be sure, and can explain the reveal in one sentence after it; the Short cuts within ~1 s of the
  reveal; nothing that doesn't move the question. Light Sleeper is the new bar (with runaway). story-critic blocks on all
  four.
- **Owner, 2026-11-10: "it should be like a first person narrator, maybe with something like the Roblox voice, just
  like higher quality, more expressive, but have like the same pace, tone, etc. And then we can have like other
  characters use like 11 Labs for just like super duper short sort of things."** Narrator-first stays; the narrator's
  voice changes to a Roblox-story-style voice (being chosen: docs/voice_search.md); other characters only in very short
  lines, voiced separately. Owner, later the same day: "not 11 labs. We can use like the Gemini voices for the short
  ones, but we should definitely try and find like a better like voice for like the Roblox like first person
  narrator." Characters stay on Gemini; the narrator is the search.
- **Owner, 2026-11-10 (review page): "I think we don't need the grandpa labeling, just the color"; "Gandma doesnt need
  the label"; "dont need the mom tag".** No speaker name tags: the caption colour alone says who speaks
  (story_track: off by default).
- **Owner, 2026-11-10 (review page): "The background shouldnt move while the chest is open" (also the barrel, and
  Names in the Woods' chest).** While a container GUI is open the camera holds still, as in vanilla.
- **Owner, 2026-11-10 (review page): "We dont need to say "Oh thats why we have 9000 carpets""; Good Boy: "Wtf is
  the beat at the end?"; "Pacing needs to be faster"; Gold: "Who is nico?"; Names in the Woods: "I dont understand
  this one".** Cut the explaining punchline too when the picture already lands the twist; no unexplained names (every
  name on screen or in a line is set up first); no music sting after the story is over; and a story must be
  understood on one watch by someone who hasn't read the script.
- **Owner, 2026-11-10: "none of these new stories should go out until i've OKed them".** Every story is packaged
  **held** (`publish.js --pass` gives a story_* status "held"), and only the owner's own OK, by story name, makes it
  ready (`--owner-ok`, run by the lead). "Proceed without my review" never covers posting a story to YouTube.
- **Owner, 2026-11-10: "I lowkey dont think we need the "Good boy" or the "day 1, again" i feel like both are implied?"**
  Don't say what the picture already says. When the last shot shows the ending (the dog back on the hill, the farmer
  with the dog), end on the picture and the sound, no closing line naming it. Supersedes "endings explain themselves":
  the ending must be *readable*, from what's on screen, not narrated. Good Boy drops "Good boy."; Dog on the Hill
  drops "Day one. Again." (the loop is shown: the same shot as line 1).
- **Owner, 2026-11-10: "I think part of the reason the voice pacing feels off is because we are cutting it bc of silence
  and stuff. but i think instead we should be ensuring the voice we get back is all like continuous already without the
  stuff we dont want."**
  Get takes right, don't edit them into shape. One beat = one continuous take used whole: the gaps between its
  sentences are the take's own. A take with a long pause, a breath, a whisper, a wrong word or a clipped word is
  re-taken (with a tighter direction), not trimmed. Cuts happen only between beats, at the take's own ends.
- **Owner, 2026-11-10: "The captions actually seem behind".** Captions lead the spoken word by 0.1 s
  (`story_track.CAPTION_LEAD`; Whisper's word times measured on time, but picture behind sound reads as late from
  ~45 ms and picture ahead of sound is tolerated to ~125 ms, ITU-R BT.1359). Never before the line's own cut.
- **Owner, 2026-11-10, after that lead: "The captions are a bit early now" (Dog on the Hill), "The captions are still
  not lined up correclty" (Thirty-One Raids), "captions not lined up" (Good Boy at 7 s), "Captions not lined up..."
  (Gold for the Portal at 22.1 s), "Some of them are earlier, some of them are after... is there no better model that
  we can use for captions?"** Captions land on the word: each caption appears on the frame in which its word starts,
  measured on the finished Short. Word times come from forced alignment of the caption words (scripts/ctc_align.py),
  not Whisper, whose word starts were 0.12 s early on median and up to 0.3 s off (the 0.1 s lead on top put all 5 held
  cuts 0.19-0.22 s early); no lead (`CAPTION_LEAD = 0`); caption words are matched to timed words by their text, not by
  index. `scripts/caption_av_check.py` (in `./hb review`) blocks a Short whose median is more than 33 ms off or with
  over 10% of words more than 100 ms off. Supersedes the 0.1 s lead. (docs/voices.md "Caption timing".)
- **Owner, 2026-11-10: "Can we have the main character be called buh, and just not have anyone say his name?"**
  The hero is **Buh** again (supersedes Milo): in-game text only (chat "Buh joined the game", death screens, name tags;
  stunt `botName: 'Buh'`). **No line ever says his name aloud**: not the narrator, not any character. The critic
  treats a spoken hero name as a must-fix; characters address him without it ("kid", "buddy", or nothing). Voice
  `milo` and `buh` are the same cast entry. Canon and STANDARDS use Buh.
- **Owner, 2026-11-10: "can we make the movement smoother when we are breaking blocks? right now it looks very
  jerky" and "when we 'look' at things, it feels we are looking slightly too low."** Digging moves the camera the
  way a real player's mouse does (smooth, no snaps between blocks: agent/smooth-dig), and a look puts the subject's
  face, or the named object's visible top, at eye level with headroom, never centred low (agent/aim). Until those
  land: aim at faces (eye height), not feet or block centres.
- **Owner, 2026-11-10, on the published Dog on the Hill: "the captions are not lined up correctly. Day 1 again is not
  delivered correctly, it seems too excited..."** (Held on `videos` until fixed.)
  - **Captions:** a re-cut moved the speech 0.2-0.37 s into every wav but voice.json still said onset 0.0, so every
    caption ran early. `voice_check.py --resplit` now re-runs align.py itself, and `scripts/caption_sync.py` (in
    `./hb review`) blocks a caption more than 0.12 s off the speech onset.
  - **Delivery follows the line, not just the character:** one bubbly direction for all of Pip's lines made the sad
    ending sound excited. Split the narrator's lines by emotional beat: the same voice, model and character profile,
    but each beat (the bubbly setup, the scared turn, the quiet or bittersweet ending) in its own request with a
    one-line scene direction for that feeling ("quiet, sad, a small breath before AGAIN; not whispery, not excited").
    Drift still checks they're the same person. The critic and the viewer panel check that the ending's delivery
    matches its emotion.
- **Owner, 2026-11-10, comparing Pip (Dog on the Hill v3) with kid Puck: "i like this one a lot a lot better" (Pip);
  Puck: "er that does not sound right".** **The default narrator is Pip's voice again** (cast `narrator` = Leda, the
  bubbly nine-year-old direction, gemini-3.8-flash-lite-tts, single speaker, natural tempo; recipe in
  voices/recipes/pip.md). Kid Puck is kept as `puck_kid`, alternative only. Supersedes the Puck rule below.
- **Owner, 2026-11-10: "i think gemini is really bad with the voices drifting. can you ensure theres a gate or some way
  to audit this? The voices for the people seem to change like all the time take to take and even within take."**
  The drift gate: `./hb drift <stunt>` (`scripts/voice_drift.py`; docs/voices.md "Drift gate") compares every line
  and every 1.5 s window with the character's locked reference voiceprint (`voices/refs/`) and with its other lines,
  and blocks DRIFT, OFFREF, WOBBLE and MODELS; `./hb voice` runs it and re-takes a drifting line (max 2, the closest
  take kept). tts.py enforces the rest: **one model per character per story** (voice.json `models`; on a 429 it stops
  and waits instead of switching, or `--relock` re-takes all of that character's lines on the new model; the model is
  in the take cache's key, so a fallback take can't pass as the first model's), **short requests** (at most 6 lines),
  **identical direction text** (a story that overrides a library character's profile gets a warning). Drift is a
  review blocker.
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
- **Owner, 2026-11-10: "wouldnt the lore be crazy if all of the sets were the same world".** Every story happens in
  **one persistent world** (seed `hellobuh`): `docs/world/canon.md` (the places, the timeline, the recurring characters,
  the links between stories) and `docs/world/map.json` (every place's canonical coordinates and the set pieces it uses).
  - Pitch inside the world: use a place from the map or claim a new one (`node scripts/world.js claim`), give the
    story a day on the world timeline, and check the canon for that place and day.
  - Build at the canonical spot: `world.build(ctx, { story })` (lib/world.js) rebuilds the places on the seed's own
    terrain every run; no site searches, no clearings, no `/locate`.
  - **Every Short still stands alone.** No line or clue needs another Short; links live in the background.
  - One easter egg per story (the dog on his hill on the skyline, the boxed bell, the totem frames...), background
    only, true on the story's day, never spoken.
  - Facts a story creates (a grave, a building, someone gone) go into canon.md and map.json in the same commit; a
    published Short's facts are never contradicted (canon.md lists them and how earlier conflicts are read).
- **Owner, 2026-11-10: "the voices seem to be edited in a way that cuts stuff off".** The Gemini takes are cut apart
  per line and their pauses shortened; our published Kokoro takes start and end in true silence (-83 dB), the
  Gemini splits at -36 to -50 dB, i.e. inside breaths and soft word ends. `./hb voice` now cuts by these rules and
  checks every line (speaker_check EDGE and CLIPPED are blockers, re-taken automatically; docs/voices.md "The cut"):
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
- **Owner, 2026-11-10: "can you make sure the voices are distinct and correct? It felt like stuff was getting mixed
  up... Maybe we can have color coded captions?"** and, on the colours: **"It should generally just "match" the vibe
  of the character thats supposed to be speaking."** Every voiced line is checked for the right speaker and the
  right words before anything is recorded (`./hb voice` runs `scripts/speaker_check.py` and re-takes failures); a
  line in the wrong voice is a blocker. Each character's captions are in its own colour, matched to its look and role
  (`color` in voices/cast.json: the narrator white, Milo Steve's cyan, the elder amber...), with a small name tag
  over its first line; the word colour only ever says who is talking, and a key word is a bar under it (docs/voices.md
  "Caption colours").
- **Owner, 2026-11-10: "do 1 at a time if the top do it 1 at a time. the font is ok yes just whatever is best".**
  Story captions show **one word at a time** (Xenost and Ashyyy: one word in all 48 sampled frames), timed by
  voice/words.json word starts, in Poppins Black. Each word pops in (0.1 s, the existing `POP`) and cuts out hard
  on the next word: no fade or slide out, which top channels don't use either. story.json `"captions": "chunk"`
  brings back the 2-3 word chunks.
- **Owner, 2026-11-10: "you choose for the audio mix, im not an expert there".** The lead picked the new story mix
  (docs/audio.md): mood score with ducking, a drop-out and hit at the payoff, room tone, vanilla on-screen sounds,
  -14 LUFS. It's measured, not listened to by the owner, so a story's review checks the mix by ear-proxy
  (scripts/audio_measure.py) and any owner note on a track or level overrides it.
- **Owner, 2026-11-10, on the story previews: "The sound effects need work as well, and I dont hear any music." and
  "the woosh is too jarring and loud".** The music goes in the edit, not at publish: every render, previews included,
  carries its mood score, so what the owner reviews is what gets posted. The bed sits ~14 dB under the voice the whole
  way (the owner's reference Short: 13.8 dB, constant, no audible ducking), stops 0.45 s before the payoff and never
  comes back. No whoosh on cuts (the reference has none); the riser is soft. Every visible action has its vanilla
  sound (mob voices, steps, splashes, barrels too) and every shot its ambience; nothing but the voice may cover a
  word (the clarity guard). Numbers: docs/audio.md.
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
    worked). (Superseded 2026-11-10 by "both are implied": the picture carries the ending, not a closing line.)
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
| 13 | **Good Boy** (cinematic pilot) | "I've tried to run away from this guy thirty-seven times." | every time I get 12 blocks away I'm right back next to him; raw porkchops; I sit when he says sit; everyone is tall; sheep look delicious; I can't open doors; skeletons run from me; a dog is always exactly where I am (every camera shot shows it) | I'm his dog: a tamed wolf (vanilla: tamed wolves teleport to their owner from 12 blocks, sit on command, can't open doors, scare skeletons, attack whatever hurts their owner). Revealed when the camera pulls out of my head | "Tomorrow I'm leaving for real." loops into line 1 | building: cinematic-default worker (`story_good_boy`, branch claude/cinematic-default; v2: voiced cast, real village); **reworked 2026-11-10, script approved** (critic r2 8.0): the dog narrates; Buh tried to lose him 37 times so he'd forget him; ends on Buh's last login on Dog Hill (`stories/good_boy/script_vNext.md`) |
| 14 | **Light Sleeper** | "My village is covered in nine thousand carpets." | the bell boxed in wool and the well under a white wool lid; Mom: "walk soft, the ground's a light sleeper"; he pulled the wool off the well and the bottom screamed ("a fox"); the lights go dark with the music | the village sits on an ancient city: carpet makes no vibration, and the bottom of the well is a sculk shrieker. He puts a jukebox on the well ("wells echo") and steps off the carpet onto the bare stone rim to dance; the warden rises out of the square | "obliterated by a sonically-charged shriek"; loops by cause into line 1 | script approved, ready to build (r2: `agent/scripts-revised`, `stories/light_sleeper/`) |
| 15 | **Thirty-One Raids** | "Grandpa has saved our village from thirty-one raids." | 31 totems and one empty frame; every raid started the night he came home; villagers throw him bread; grey bottles from the tower, "his courage", drunk at the gate; "Lock the door, kid. They're coming."; since Grandma died it's the only time anyone's glad to see him | the courage is an ominous bottle (Bad Omen starts a raid in a village): he brings every raid himself. Tonight he's too tired, so the boy drinks it; the horn, pillagers and a ravager up the road | Grandpa beside him, loading his crossbow: "Now they'll love you too, kid." (the 32nd frame) | made (`story_thirty_one_raids`, 2026-11-10: 1 review round, READY; narrator Pip, Grandpa Charon) |
| 16 | **Gold for the Portal** | "My grandma has thrown NINE THOUSAND gold ingots into a PORTAL." | a gift by the portal every morning (obsidian, string, a pearl: the barter list); "gold keeps you safe down there"; Grandpa in his trimmed gold helmet; Grandma: "Just one, Milo. One's plenty." | the gifts are a piglin's barters; Grandpa fell over there long ago and the piglin wears his helmet; Grandma has known for years | Nico throws a whole stack, the piglin steps through in the helmet, shaking; Grandma tosses one more ingot and sends it home | **made** 2026-11-10 (`story_gold_for_the_portal`, published `--pass`, 2 review rounds; `claude/story-gold-portal`) |
| 17 | **The Broken Rail** | "My grandpa has waited for the SAME MINECART for TWENTY-TWO YEARS." | the pig in our yard stuck in its minecart ("He LOVES it"); Mom says Grandma left him; Grandpa: "She's on her WAY"; the line runs 3,000 blocks into the hills | a creeper crater cut the line 22 years ago; Grandma's cart stopped at the gap and mobs can't get out of a minecart: she has sat there facing home ever since | Ezra bridges the crater, the cart rolls home to the buffer stop where Grandpa waits: "Sorry I'm LATE, dear." | script approved, ready to build (critic r2 8.0/10; `claude/writers-room`, `stories/broken_rail/`); **mystery re-check 2026-11-10: revise** (exact fixes in `docs/pitches/banked_recheck_2026-11-10.md`) |
| 18 | **Names in the Woods** | "Every night THREE zombies named TOMAS, GRETA and OLD BEN walk out of the WOODS." | the named zombies stop at our fence and stare at Mom; everyone gets a name tag at birth, Mom's says ROSA; Mom: "Our neighbors moved to the CITY."; she carries a golden apple and a splash potion of weakness to "the neighbors" | a named villager keeps its name when a zombie converts it: the zombies are the neighbors, and Mom has tried to cure them, but villagers can't throw | tonight a fourth zombie walks out wearing ROSA, still holding the apple; she drops the potion; Remy throws it: "I CAN. Potion, then APPLE." | building (claude/story-names-in-the-woods; script critic r2 8.0/10, `stories/names_in_the_woods/`) |
| 19 | **Slow Falling** | "My grandma has jumped off our WINDMILL ELEVEN THOUSAND times." | the only way up is Grandpa's "fountain" (a soul-sand bubble column: it only lifts); Grandma's morning "juice"; Grandpa's smelly night tea at the brewing stand | the juice is slow falling Grandpa has brewed every night for thirty years; she thinks she can fly | Kit takes one, rides the fountain up, can't get down, drinks and floats down beside her: "Nope. Grandpa BREWED her wings. Eleven thousand TIMES." | script approved, build-ready RESERVE: critic r2 approve at 7.9/10, under the room's 8/10 bar; build after the 8+ scripts (`claude/writers-room`, `stories/slow_falling/`); **mystery re-check 2026-11-10: revise** (exact fixes in `docs/pitches/banked_recheck_2026-11-10.md`) |
| 20 | **Six Thousand Torches** | "Someone put SIX THOUSAND TORCHES on my village last NIGHT." | every night Jonah (the village's player) put a torch by my door and said "see you TOMORROW"; he gave away his things (chest screen); his house is dark and bare; the last row of torches runs to my door | nothing is coming: Jonah is leaving the world for good and did every night's torch at once, so no zombie can ever spawn here; "Jonah left the game" | the last torch at my door: "He didn't say, see you TOMORROW." | script approved, build-ready RESERVE: critic r2 approve at 7.8/10, under the 8/10 bar (`claude/writers-room`, `stories/nine_thousand_torches/`) |
| 21 | **The Scarecrow** | "SIXTY-THREE mornings in a row, a trail of SNOW runs from our SCARECROW to my WINDOW." | the trail ends in a trampled patch facing my window; groaning at night; rotten flesh under the window "a GROSS little GIFT"; Mom said Grandpa built that scarecrow out of snow, the week before he died | the scarecrow is a snow golem Grandpa built: every night it walks to my wall and knocks the zombies off it with snowballs; they burn at dawn | Toby opens the shutters on the stalker and sees the golem holding the line: "It wasn't STARING at me. It was keeping an EYE OUT for me." | script approved, build-ready RESERVE: critic r2 approve at 7.7/10, under the 8/10 bar (`claude/writers-room`, `stories/scarecrow/`); **mystery re-check 2026-11-10: revise** (exact fixes in `docs/pitches/banked_recheck_2026-11-10.md`) |
| 22 | **Red Sheep** | "Every SHEEP in our village is BLUE. All SIXTY of them." | Grandpa dyes every lamb at birth; "They're our EYES, kid."; "Blue. Blue. BLUE."; one came back from the woods RED; a snap like teeth in the trees | an evoker turns blue sheep red: the blue flock is Ravenford's evoker alarm | Buh's lamb turns red in front of him as the evoker lowers its arms; the fangs; cut | **script approved** (critic r2 8.0, H/T/F 8/8/8), build-ready after its set.md pre-build checklist (`stories/red_sheep/`); not voiced: waits for the new narrator voice |
| 23 | **The Bell in the Window** | "Every time I open my WINDOW, the whole village RUNS inside." | the bell rings, nobody's there; "Shutters SHUT, honey."; an arrow in the bell post every morning; the only lit window; something white under the oak on the cliff | a skeleton in the oak's shade shoots at the only player's window; the bell hangs in the way and every arrow rings it | from behind the skeleton: the arrow rings the bell, doors slam, it draws again at him; cut | **script approved** (critic r2 7.7, 8/8/8), build-ready after its pre-build checklist (`stories/bell_window/`); not voiced |
| 24 | **Forty-One Cats** | "My grandma keeps FORTY-ONE cats on the WALL. All facing OUT." | none allowed inside; "They keep the QUIET ones out."; the first came "the week I CAME here"; nobody locks a door; a hiss Grandma said was a cat | creepers hunt only players and flee cats: the wall is for him | he takes his window's cat to bed; a creeper walks through the gap, past the villagers, to his window; cut on the hiss | **parked** (critic r2 7.4, Twist 7: Light Sleeper's shape with runaway's creeper; cold read 65 %) (`stories/forty_one_cats/`) |
| 25 | **The Walk** | "My grandpa has broken the same LECTERN three thousand TIMES." | "Not THAT one."; Grandma's lit window on the island; no boat, "that's CHEATING"; she said "WALK the WATER to me, or don't COME" | he's re-rolled the librarian for Frost Walker to keep her word literally | the tooltip reads Frost Walker II; he walks off the dock and the sea freezes toward her window; cut | **script approved** (critic r2 7.9, 8/9/8, the critic's top pick; its one text fix applied) (`stories/the_walk/`); not voiced |
| 21 | **The Scarecrow** | "SIXTY-THREE mornings in a row, a trail of SNOW runs from our SCARECROW to my WINDOW." | the trail ends in a trampled patch facing my window; groaning at night; rotten flesh under the window "a GROSS little GIFT"; Mom said Grandpa built that scarecrow out of snow, the week before he died | the scarecrow is a snow golem Grandpa built: every night it walks to my wall and knocks the zombies off it with snowballs; they burn at dawn | Toby opens the shutters on the stalker and sees the golem holding the line: "It wasn't STARING at me. It was keeping an EYE OUT for me." | script approved, build-ready RESERVE: critic r2 approve at 7.7/10, under the 8/10 bar (`claude/writers-room`, `stories/scarecrow/`) |
| 15 | **Thirty-One Raids** | "Grandpa has saved our village from thirty-one raids." | 31 totems and one empty frame; every raid started the night he came home; villagers throw him bread; grey bottles from the tower, "his courage", drunk at the gate; "Lock the door, kid. They're coming."; since Grandma died it's the only time anyone's glad to see him | the courage is an ominous bottle (Bad Omen starts a raid in a village): he brings every raid himself. Tonight he's too tired, so the boy drinks it; the horn, pillagers and a ravager up the road | Grandpa beside him, loading his crossbow: "Now they'll love you too, kid." (the 32nd frame) | script approved, ready to build (r2: `agent/scripts-revised`, `stories/thirty_one_raids/`) |
| 22 | **The Dog on the Hill** | "The dog on the hill hasn't moved in NINE HUNDRED days." (a tamed wolf sitting on a hilltop above a village, facing one empty patch of grass) | my bone every morning and he never looks (he's already tamed: the red collar); an overgrown dirt starter hut beside him; the empty patch the villagers never build on; Grandpa: "He said he'd be RIGHT back." | a sitting dog only stands for its owner, and its owner is a player who logged out on that patch 900 days ago: "Milo joined the game", the player appears on the patch, the dog stands for the first time | "Sit, boy. I'll be RIGHT back." "Milo left the game." The dog sits. Loops into line 1 | made (`story_dog_hill`, 2026-11-10: cinematic engine, Gemini cast with Pip = the reference narrator, own score; review 2 rounds; docs/runs/2026-11-10_dog_hill.md) |

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
