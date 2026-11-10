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
The full standard and its evidence: docs/audio.md (research: docs/research/audio_2026-11-10.md). All automatic in
`edit.py --story` + `add_song.py` (scripts/story_audio.py); set story.json `mood` and `payoff`, the rest follows.
- **Levels:** voice -15 LUFS after the clarity chain (HPF 80 Hz, -2 dB @ 250, +2.5 dB @ 3.5k, de-ess, 3:1); game -27
  ducked 4 dB under lines; score bed -26 ducked 7 dB under lines (~18 dB under the voice while it talks, ~11 in
  pauses; the old fixed -31 bed never moved); payoff track -24; room tone -47; master -14 LUFS, true peak <= -1 dBTP
  (4x-oversampled limiter; no dynamic loudnorm: it flattened the payoff).
- **Music = mood score, not phonk:** `"mood": "eerie" | ["tense", "sad"]` (eerie / tense / sad / funny / heroic,
  before/after the twist) picks a Kevin MacLeod CC BY track from music/score.json (credit added to the description).
  Beds keep the 1-4 kHz voice band free (pick skips a bed with > 15% there).
- **The payoff (`"payoff": "L13" | "boom"`):** a 1.9 s riser, then the bed drops out **0.45 s before** the payoff
  (silence before the hit: on runaway the drop-out sits 19.8 dB under the hit, 10.9 dB in the old mix), an impact +
  sub on the payoff frame, then the payoff track enters on its own drop (funny: a record scratch and the same tune
  picks up again).
- **On-screen sounds:** every visible event that makes a sound in vanilla gets it on its frame (digs, breaks,
  places, doors, pickups, mob hurt/death, bells, chests, eating, fuses, thunder): audio.py adds the missing ones
  for a story (scripts/onscreen_sfx.py; the check lists them). Not under a key word (minor sounds dropped, causal
  ones -6 dB).
- **Design SFX, sparingly:** whooshes only on scene changes (a clock jump or a > 24-block move), at most one per 6 s,
  peaking 40 ms before the cut. Hand-placed SFX: quiet (gain 0.3-0.6), varied (pitch 0.9-1.2), one per beat at most;
  no SFX under a spoken line's key word.
- **Never digital silence:** the room tone runs under everything (the old nosong mixes were 8-12% below -70 LUFS).
- Check a render: `python3 scripts/audio_measure.py out/<name>.mp4` (I -14 +-0.5, TP <= -1.0, digital silence 0).
- Character voices: docs/story_craft.md section 5 (Gemini cast; contrast in pitch between any two voices that talk:
  pilot narrator Puck ~115 Hz vs the old man Algenib ~75 Hz). Check takes with `scripts/voice_check.py`.

## Captions
- Schibsted Grotesk Black 96 px at 0.70 of the game view, 2-3 words, key words in the story's colour, a character's
  lines in that speaker's cast colour (story.json v2). Word times from Whisper (`voice_check.py --words`).

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
