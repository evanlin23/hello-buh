---
name: cinematic-style
description: The HelloBuh cinematic look in numbers - lenses, camera heights, push speeds, shot lengths, the grade, bloom, depth of field, captions, mix levels, sharpness - plus the mistakes already solved. Use whenever you write stunt.shots / stunt.look for a story or movie scene, pick a camera, set a grade, or review a cinematic render. Fix this skill when a review note repeats.
---

# Cinematic style (the brand look, in numbers)

Owner, 2026-11-10: "I feel like the cinematic should be the default" and "serious ... super professional and high
quality". Every story renders with this look unless the story says why not. The engine: docs/movie_engine.md;
the story path: docs/stories.md "Cinematic stories". Values marked (pilot) were tuned on `story_good_boy`.

## The frame
- **Story Shorts:** the game view is 1080x1011 between the caption bands (edit.py), nearly square. No letterbox
  (`look.letterbox` only for 16:9 movies). Frame for a square: one subject big, or two side by side.
- **Wide master, cropped:** `wideMaster: true` renders 1797x1011 and crops the 1080x1011 game view (per camera shot
  `cropX` -1..1); `WIDE_DIR=dir` keeps the 16:9 masters. Shot sheets are 16:9: only their middle 60% is the Short.
- **Eyes on the upper third** (y ~0.33 of the game view). Captions sit at 0.70: nothing important below 0.62.
- **First person looks land on the face** (owner, 2026-11-10: "it feels we are looking slightly too low"): aim with
  `K.face(feet, type)` / `K.top(block)`, never a chest, feet or block middle; plain points get a 2 deg lift (docs/look.md 1).
- **Big enough to read on a phone** (the game view is 53 % of the screen): a medium shot's subject >= 45 % of the game
  view's height, a close face >= 25 %, a wide shot's subject >= 12 %.
- **Room in front** of a face or a walk: the subject a third in from the side it comes from.

## Lenses and cameras (render.js shot specs; `fov` is vertical degrees)
| shot | fov | camera height | distance | move |
|---|---|---|---|---|
| establishing / crane (`path` + `lookPath`, `ease: true`) | 55-65 (default) | starts 10-14 above the subject, ends 3-5 | 15-25 -> 6-10 | 2.5-4 s, eased |
| wide (place + people) | 50-55 | 2-3 | 8-14 | push 0.2-0.35 blocks/s |
| medium (`at` + `look`, or `single`) | 45-50 | eye height of the subject (1.5) or 0.5 under it | 3-5 | push 0.25-0.35 |
| close (`single` close) | 35-42 | eye height | 1.5-2.5 | push 0.15 |
| follow (`follow` + `offset` + `lag: 2`) | 50 | 0.25-0.4 over the subject's feet + its height (low and ahead) | 4-5 ahead and 2 to the side | follows |
| low "small character" POV (stunt.self.eye) | 70 (POV) | 0.5-0.7 | - | the bot's own motion |
| reveal pull-out (`path` starting at the POV eye) | 70 -> 50 | eye -> 1.6-2 -> 6 | 0 -> 3 -> 8 | 0.8 s to leave the head, 5 s total, eased (pilot) |
- **Handheld drift** `drift: 1` (default) on every camera shot; `drift: 0` only for stills and locked-off titles.
- **Push-in** default 0.2 blocks/s; dialogue and reaction shots 0.3-0.35 (0.12 read as frozen in review).
- **Shot length** 1.5-4 s in a Short (2-5 s in a movie). Never two cuts in a row at the same size.
- **Establishing rule:** the first time we arrive somewhere (and after a time jump) open wide or with a crane; then
  go medium/close. A run of POV lines resets with one camera shot.
- **POV vs camera:** POV carries what the narrator sees and the clues that live in first person; camera shots carry
  the world, the other characters, and anything the narrator can't see (the hit, the reveal).
- **Cast in place before the shot's first frame:** `K.shot(name)` first, then `K.cut` to put the bot there (the cut
  then lands inside the new camera shot, invisible), and move other cast with a >64-block hop (`putGuy`/`putMob`).

## The look (`stunt.look`)
```js
look: { grade: { lift: [0.02, 0.01, 0.018], gamma: [0.97, 1.0, 1.04], gain: [1.12, 1.02, 0.88], sat: 1.14,
                 contrast: 0.12, exposure: 1.06 },          // warm "golden" (pilot); 'dawn' / 'night' presets exist
        bloom: 0.5, bloomThreshold: 0.72,                    // lights and the sky only (>= 0.7 or walls glow)
        vignette: 0.38, grain: 0.02,                          // grain <= 0.02 (sharpness, below)
        dof: { aperture: 0.9 },                               // camera shots only; 0.7 for the reveal
        shadows: true, rays: 0.5, cloudNight: 0.42 }
```
- **Start from a mood** (renderer/looks.js): `look: 'auto'` (the default: the grade follows the time of day, day ->
  golden -> night, frame by frame), or one mood for all frames `'village_day' | 'golden_hour' | 'eerie_night' | 'tense'`,
  or `look: { mood: 'tense', vignette: 0.5, bloom: 0.3 }` to override; a camera shot's `mood: 'tense'` grades that shot. A mood sets colour only (exposure, contrast,
  saturation, temperature, vignette); add bloom/dof/rays yourself under the sharpness rule. Numbers: "Standards".
- Time of day per scene: golden hour 12000-12600 (sun low in the west: put the camera west of faces to light them,
  east of them to backlight), dusk 12900-13100, night 18000, morning 23400-1000. A time-lapse is a `K.setTime` every
  tick (cheap: no re-mesh while the sky darkening is unchanged).
- Night scenes need light in frame: a lantern within 4 blocks of every face; the camera within 6 blocks.

## Sharpness (owner: "ensure that the output is still sharp and clear")
- Render at the full game size (1080x1011, 60 fps). Stills and thumbnails: `scripts/still.py --ss 1.5-2` (Lanczos).
- The subject in the focal plane: aim the camera's `look` (or `dof.focus`) at the subject, never past it; blur only
  behind. aperture <= 1.0 in Shorts.
- Grain <= 0.02; bloom threshold >= 0.7; no bloom on walls or faces.
- Textures stay nearest-neighbour (the engine does this; never scale a frame up).
- Final encode: crf <= 18.

## Sound
The full standard and its evidence: docs/audio.md (research: docs/research/audio_2026-11-10.md; the owner's reference
Short, measured 2026-11-10). All automatic in `edit.py --story` (scripts/story_audio.py), **the score included**:
every render, previews too, is what gets posted (publish only writes the credit). Set story.json `mood` and `payoff`.
- **Levels:** voice -15 LUFS after the clarity chain (HPF 80 Hz, -2 dB @ 250, +2.5 dB @ 3.5k, de-ess, 3:1); game -27
  ducked 4 dB under lines; ambience -38 ducked 3 dB; score bed -26 through a voice pocket (-6 dB over ~650 Hz-3 kHz),
  ducked only 2.5 dB: **~14 dB under the voice while it talks** (the reference: 13.8 dB, constant; the old -26 ducked
  7 dB sat ~18 dB under, and only went in at publish, so the previews had no music: owner, "I dont hear any music");
  room tone -47; master -14 LUFS, true peak <= -1 dBTP (4x-oversampled limiter; no dynamic loudnorm).
- **Clarity guard:** while a line is spoken the effects are held 9 dB under the voice in the 300 Hz-4 kHz band (the
  bed's swells 6 dB), so nothing covers a word.
- **Music = mood score, not phonk:** `"mood": "eerie" | ["tense", "sad"]` (eerie / tense / sad / funny / heroic,
  before/after the twist) picks a Kevin MacLeod CC BY track from music/score.json (`"score": "<id>"` pins one; credit
  added to the description). Beds keep the 1-4 kHz voice band free (pick skips a bed with > 15% there).
- **The payoff (`"payoff": "L13" | "boom"`):** a soft 1.9 s riser (peak -24 dBFS, slow attack), the bed drops out
  **0.45 s before** the payoff (silence before the hit), an impact + sub on the payoff frame, and **nothing after**:
  no payoff track, no sting (owner: Good Boy "Wtf is the beat at the end?"). Both moods funny: a record scratch
  instead. `"hit": false` drops the riser too.
- **On-screen sounds:** every visible event that makes a sound in vanilla gets it on its frame (digs, breaks,
  places, doors, barrels, chests, pickups, mob hurt/death, mob idle voices, steps, splashes and swimming, bells,
  eating, fuses, thunder): audio.py adds the missing ones for a story (scripts/onscreen_sfx.py; `--strict` fails on
  a visible action left silent). Under a key word: idle voices dropped, minor sounds -9 dB, causal ones -6 dB. The
  hotbar switch is silent in vanilla.
- **Ambience per shot:** night crickets, dusk crickets (-5 dB), day breeze, indoors (crickets muffled at night), a
  cave's cold wind, vanilla rain / nether / underwater loops (onscreen_sfx.scenes).
- **Design SFX, sparingly:** **no whooshes** (owner: "the woosh is too jarring and loud"; the reference has none).
  `"audio": {"whoosh": true}` brings them back at -32 dBFS, low-passed, faded in. Hand-placed SFX: quiet (gain
  0.3-0.6), varied (pitch 0.9-1.2), one per beat at most.
- **Never digital silence:** the room tone runs under everything (the old nosong mixes were 8-12% below -70 LUFS).
- Check a render: `python3 scripts/audio_measure.py out/<name>.mp4` (I -14 +-0.5, TP <= -1.0, digital silence 0).
- Character voices: docs/story_craft.md section 5 (Gemini cast; contrast in pitch between any two voices that talk:
  pilot narrator Puck ~115 Hz vs the old man Algenib ~75 Hz). Check takes with `scripts/voice_check.py`.

## Captions
- Poppins Black 96 px (cap 68) at 0.70 of the game view, max 840 px wide, 2-3 words, key words in the story's colour,
  a character's lines in that speaker's cast colour (story.json v2). Word times from Whisper (`voice_check.py --words`).
  Why each number: "Standards" below.

## Standards (2026-11-10; evidence and stills: docs/look.md)
Owner: "everything should be the best and optimized". Each number with its reason; change one only with evidence.

**Format and captions** (189 frames of top story Shorts + creator safe-zone templates)
| standard | value | why |
|---|---|---|
| layout | title band + game 1080x1011 + black bands (keep) | owner's choice; persistent top titles also on narrow (15M median) and Qubik; no evidence isolates layout |
| subject size in the game view | medium >= 45 % of its height, close face >= 25 %, wide >= 12 % | top channels fill 40-70 % of the frame; our game view is 53 % of the screen |
| caption centre | y = BAND + 0.70 x 1011 = 1163 (60.6 % of the screen) | Ashyyy/Milo & Chip sit at 55-70 %; 280 px above the bottom UI (title, channel, audio: from ~1440) |
| caption width | <= 840 px (x 120-960) | the like/comment column covers x > 960 from ~y 960 |
| caption size | 96 px, cap height 68 (3.5 % of the screen) | Ashyyy ~3.5 %, Xenost ~2.8 %: legible at phone size |
| caption font | Poppins Black (OFL) | most letter ink per width at phone size of 9 candidates (0.88; Schibsted 0.80, Montserrat 0.85, Minecraft font 0.45-0.72) |
| stroke / shadow / pop | 8 px ink, soft shadow, 0.84 -> 1.06 -> 1.0 in 0.1 s | matches the narrator channels' thick dark stroke; one pop per chunk |
| words per chunk | 2-3 (owner question: Xenost/Ashyyy show 1) | phrases suit the cinematic tone; test 1-word on a pair |
| title band | Inter ExtraBold 78, two lines max, y ~185-357 | the channel's look on every Short; clears the top bar (180-200 px) |

**Grade per mood** (renderer/looks.js; measured with scripts/look_stats.py on published stories)
| mood | time | exposure | contrast | sat | gain R/B | vignette | why |
|---|---|---|---|---|---|---|---|
| village_day | 1000-11000 | 1.07 | 0.14 | 1.06 | 1.11 | 0.22 | warm-neutral = safe/home; vanilla is already saturated (0.49-0.57), so only +6 % |
| golden_hour | 12000-12600 / 23200-23600 | 1.06 | 0.12 | 1.08 | 1.27 | 0.32 | the pilot's grade with saturation 1.14 -> 1.08 |
| eerie_night | 18000 | 1.35 + gamma 1.12-1.18 | 0.14 | 0.90 | 0.85 | 0.38 | vanilla night crushes to 0 and leaves the face at 0.18; this lifts it to 0.29, blue lift = moonlight |
| tense | any (night: eerie_night + contrast 0.22, vignette 0.48) | 1.04 | 0.24 | 0.88 | 0.97 | 0.45 | hard contrast and drained colour read as threat |
Targets every shot meets (`python3 scripts/look_stats.py still.png [--night]`): subject luma 0.35-0.70 by day,
>= 0.25 at night (a face must read on a phone); black point p1 >= 0.015 (crushed shadows band in YouTube's encode);
< 2 % clipped outside the sky; contrast p95-p5 >= 0.45 by day, >= 0.30 at night; mean saturation 0.20-0.60.
Try a grade in a second: `LOOK=0 ./hb still <stunt> T --out raw` once, then `scripts/grade_preview.py raw.png out.png --look <mood>`.

**Lighting in the world**
- Night: a lantern/campfire (light 15) within 4 blocks of every face, a torch (14) within 3: block light drops 1 per
  block and brightness falls steeply (15 = 1.0, 12 = 0.50, 10 = 0.33, 8 = 0.22). The light on the camera's side of the
  face (three-quarter), not only behind it. Soul lanterns (10) for an eerie rim, never the key.
- Day: faces out of tree and roof shade (sun_wont_set's zombies under the tree measured 0.18 with any grade). Golden
  hour: camera west of a face to light it, east to backlight. No noon close-ups (top light).
- Prefer cameras along north-south: vanilla shades north/south faces 0.8, east/west 0.6 (a third brighter).

**Sharpness (hard rule; owner on THE KEEP: "some parts with the light are a bit blurry")**
- Glow never blurs block edges or the subject's textures: bloom only on true highlights (threshold >= 0.7).
- No depth of field on wide or establishing shots; DoF on medium/close camera shots only, focus on the subject.
- A sharpen after the grade; crf <= 18. Moods never set bloom/rays/haze/DoF/grain (agent/cinematic owns those defaults).

**Sets** (docs/building_guide.md section 4 checklist) and **cast** (docs/look.md section 5, `scripts/cast_contrast.py`)
- Steve reads against wood, grass, path and sand (dE 39-53); weak on grey stone (16): light him there.
- Villagers are all brown (luma 0.32-0.46, dE 10-18 to spruce): cast by hat silhouette (farmer, fisherman, shepherd,
  fletcher, librarian, butcher, cleric's purple, armorer's mask); stage against grass, sky or light planks.
- Instant reads: creeper, allay, zombie, iron golem (not on sand), sheep. Enderman and witch vanish at night (dE 13/19):
  light them. A second human: Alex (luma 0.62 vs Steve 0.38); two humans differ by >= 0.15 luma.

**Cuts** (docs/cinematic.md "Invisible cuts"; owner: "i keep noticing them"): the eye's point of interest stays put
across a cut (<= 15 % of the frame; render.js eyeTrace re-aims camera shots, give each shot a `subject`), the cut lands
33-150 ms before the line's first word (K.line), cast that would steal the eye (a stray village mob) is cleared from
the set. `./hb cuts <stunt>` measures both.

**On-screen effects**: no onomatopoeia or emoji (0/69 frames on Xenost, Ashyyy, Skytro; common only on kids' comedy
channels). Punch-in 0.06-0.10 at most twice (reveal, payoff), shake 6-10 px only on a visible impact, flash 0.4-0.5 only
on a time jump or the twist (edit.punch/shake/flash). Words in the world are diegetic: signs, chat, the death screen.

## Mistakes already solved (add one every time a review note repeats)
1. A cut, then the camera shot: the POV showed 3 in-between frames (rec_check blocker). Mark the shot first, then cut.
2. A flat clearing (clearSet) reads as low effort: use a real village or natural site (`stunts/scout_village.js`,
   docs/building_guide.md) and fill to the fog.
3. Village animals wander into the set: `/kill @e[type=!player,type=!villager,distance=..40]` around it.
4. The village iron golem hunts story zombies and skeletons: kill it in setup.
5. A bright sun under a warm gain went cyan: fixed in the grade (clamp before the S-curve).
6. An actor bot joining at the world spawn far away stalled the server: `/setworldspawn` on the set first.
7. A POV aimed at a mob it's touching spins (1700 deg): stop aiming inside 1.6 blocks.
8. Long TTS directions get read aloud: one short sentence plus a profile per speaker.
9. A sneaking actor's eye is 1.27: aim at it, not 1.62.
10. Heavy CPU work (Whisper, renders) during a recording stalls the server: the bot times out. Record alone.
11. Placing scenes by eye from a top-down still put a swim on land and a run inside a tower (the still was
    mis-oriented): map the recorded blocks (`./hb map`, or scripts/set_map.js on claude/cinematic-default) and read
    exact ground and water from the map.
12. A ground finder that scans from the sky lands on barrier platforms and roofs: start just above the set.
13. Gemini swaps speakers on short lines in a two-speaker take: one speaker per request for short character lines;
    check pitch and transcript with `scripts/voice_check.py`, re-cut with `--resplit` (Whisper word gaps).
14. A tender, slow, whispered payoff line can read as intimate out of context (owner on "good boy"): payoffs that
    are a character's line are loud, cheerful and physical (a pat, a bark, a hard cut).
15. Walking the narrator into a door to show "I can't open it" reads as stuck: sit and look at it; open it after
    the line.
16. Undead waiting off-set burn in daylight (and the fire shows): roof their waiting room.
17. `render_on_actions.sh --wait` right after queueing can fetch the previous run's result: wait for the new
    commit's run to start (or delete out/<name>.mp4 and check the run URL it prints).
18. "Some parts with the light are a bit blurry" (owner, THE KEEP, 2026-11-10). Measured on the golden-hour still (1080x1920,
    grain off): edge acuity (p99 gradient) 10.0 -> 19.8 and brick texture 1.54 -> 3.53 (x2.3). Causes, biggest first:
    depth of field on a wide shot (aperture 0.35 at 60 blocks blurred towers 20 blocks nearer: off = +43% edges, +77%
    texture; the moat glide, focused past its tower, went from 6.1 to 23.1 p99 edges in the phone copy); a wide bloom (0.55, threshold 0.8, two blur rounds) haloing every silhouette against the sky (0.35 /
    0.9 / `bloomPasses: 1`: +8%); god rays laid over the blocks (`raysOverBlocks: 0.35` keeps them on the sky) and no
    sharpening (`sharpen: 0.4`, an unsharp mask after the grade: together +28%). Then the re-encode: grain 0.035 is
    noise the encoder must keep or smear (CRF 22 smeared it and the bricks with it, SSIM 0.959 at 3.7 Mbps; keeping it
    took 27 Mbps): grain <= 0.012. Rules: no DoF on wide or establishing shots (scripts/cinematic.py makes DoF opt-in
    per shot); bloom <= 0.35 with threshold >= 0.9 and one pass; rays 0.35 over blocks; sharpen 0.4; the phone copy
    is `-preset slow -tune film -crf 20 -x264-params aq-mode=3 -maxrate 14M` (cinematic.py writes `<name>_share.mp4`).
19. Pauses between lines that no take has (gold_for_the_portal: 0.85 s in the opening, 7.6 s of gaps in all): every
    `await K.cut`, `M.place`, `ctx.cmd` or `waitForTicks` between or inside lines adds its ticks to the line. Move the
    narrator during a camera shot that hides him with a /tp that doesn't wait (`jump` in story_gold_for_the_portal: the
    aim rides on the /tp, `look` holds until it lands), start him where the first POV needs him, place the cast in
    setup, and open containers without awaiting. Then the line marks sit exactly `dur + gap` apart.
20. A shot camera inside a block slides toward its subject until clear (render.js): a camera at a villager's "eye
    height" given as 1.6 over the floor block sat in a carpet and slid 2.8 blocks in. Feet stand at dy 1 in a story's
    coordinates: an eye-height camera is dy 2.5-2.7. `./hb describe <stunt> <t>` prints where the camera really is.
21. A NoAI mob idle since setup moves late (~1 s) on its first actor frames, and the Short starts on L01: give a cast
    member who acts in L01 a 20-30 tick `K.preroll` of motion first (the preroll isn't in the Short).
