# The audio standard (story Shorts)

Owner, 2026-11-10: "the best music to use? Are we rolling our own music? The best sound effects? ... the best
audio? ... everything should be the best and optimized in the process", and "on screen sfx as well, if
needed/maybe". Then, after the story previews: **"The sound effects need work as well, and I dont hear any
music."** and **"the woosh is too jarring and loud"**. The evidence for the first numbers is in
`docs/research/audio_2026-11-10.md`; the music and transition numbers below were measured on the owner's
reference Short (a top Roblox story Short: its voice and music separated with Demucs, measured, then deleted; never
in the repo). It's all automatic: **`edit.py --story` makes the whole mix, the score included** (via
`scripts/story_audio.py`), so the preview the owner reviews is what gets posted. Non-story Shorts are untouched.

## The layers, quietest to loudest
| layer | level | what it does | where |
|---|---|---|---|
| room tone | -47 LUFS | soft air under everything: never digital silence | `story_audio.room_tone` |
| ambience | -38 LUFS (+ the scene's gain), ducked 3 dB under lines | the shot's scene: night crickets, day breeze, a cave's cold wind, vanilla rain / nether / underwater loops | `onscreen_sfx.scenes` + `story_audio.ambience_track` |
| game | -27 LUFS, ducked 4 dB under lines | the recording's sounds **plus every visible event's vanilla sound** | `audio.py` + `scripts/onscreen_sfx.py` |
| score bed | -26 LUFS through a voice-pocket EQ, ducked 2.5 dB under lines: **~14 dB under the voice** while it speaks | the mood track, from frame 1; out 0.45 s before the payoff, nothing after it | `story_audio.score_bed` (in the edit) |
| design | riser peak -24 dBFS, hit peak -6 dBFS (+ sub -12); whooshes off | a soft riser into the drop-out, the impact on the payoff | `story_audio.design_track` |
| voice | -15 LUFS after the clarity chain | the narration leads, always | `story_audio.mix_story` |
| master | -14 LUFS integrated, true peak <= -1 dBTP | static gain + a 4x-oversampled limiter; no dynamic loudnorm (it flattened payoffs). A take with no voice yet (a placeholder) gets at most +2 dB | `story_audio.master` |

**The clarity guard** (`story_audio.clarity_gain`): wherever a line is spoken, the sound effects (game + ambience +
design) are held 9 dB under the voice in the speech band (300 Hz-4 kHz, the voice's level taken as its loudest over
+-0.2 s so the gaps between words don't pump), by at most 8 dB; the bed's swells are caught the same way at 6 dB
(at most 4 dB down). No effect can cover a word, by construction.

## The reference, measured (2026-11-10)
| | reference | ours (Good Boy / Gold re-edits) |
|---|---|---|
| voice | -12.1 LUFS (continuous narration) | -14.0 LUFS (after the -14 master) |
| bed | -25.9 LUFS, constant (3 s loudness p10-p90 within 3.6 dB) | -27.5 LUFS; 3.9 dB p10-p90 |
| bed under the voice while it speaks | 13.8 dB (LUFS), 12.9 dB median per 400 ms | 14.0 / 14.1 dB (LUFS) |
| ducking | none audible: the bed is ~2 dB louder in the 1% of time the voice pauses | 2.5 dB |
| bed spectrum | 60% of its energy at 150-500 Hz, 10% at 1-4 kHz, almost nothing above 4 kHz | the voice pocket: -6 dB over ~650 Hz-3 kHz, -2 dB shelf over 7 kHz |
| speech band (300 Hz-4 kHz): voice over bed | p10 15.8 dB, median 21 dB | guarded at >= 6 dB (bed) / 9 dB (effects) |
| transitions | no whoosh on any cut; one hit on frame 1 | no whoosh by default |
| master | -14.7 LUFS | -14.0 LUFS |

Before this, the bed went in only at publish (`add_song.py`), so the previews the owner reviews had **no music at
all**, and when it did go in it was ducked 7 dB under each line: ~18 dB under the voice, 4.5 dB quieter than the
reference.

## Voice clarity chain
`highpass 80 Hz` -> `-2 dB @ 250 Hz` (TTS boxiness) -> `+2.5 dB @ 3.5 kHz` (consonants) -> `de-esser` ->
`3:1 compression` (threshold -18 dBFS, attack 5 ms, release 60 ms) -> static gain to -15 LUFS.

## Music: the mood score
- **In the edit, every render, previews included.** `edit.py --story` mixes the bed in and stamps the score (track,
  credit, moods, payoff) in the mp4's `comment` tag. Publish (`scripts/add_song.py`) reads the tag and only writes
  the credit and `metadata.json` `song` (`"mixed_in": "edit"`): **never a second bed**. An mp4 edited before this
  (no tag) still gets the bed at publish, the same way (`story_audio.add_score`).
- **Source:** `music/score.json`. 18 Kevin MacLeod tracks (incompetech.com, CC BY 4.0: monetized YouTube OK
  with the credit in the description). The tracks are pre-registered in Content ID, and the system claims
  videos that are missing the credit. Ours always has it, because the upload carries the description. If a
  claim comes anyway, dispute it (incompetech: released within 72 h; the ISRC is logged with each track); a
  claimed Short under 60 s stays up meanwhile. Fetched by `scripts/fetch_music.py` into `songs/score/` (gitignored,
  only the first 150 s kept, Opus) from the logged URL; never committed. The render workflow fetches and caches them.
- **Pick:** story.json `"score": "<track id>"` pins one. Else `"mood": "eerie"` or `["tense", "sad"]` (before /
  after the payoff; without it, a keyword guess, fallback `tense`): the before-mood's bed tracks, skipping any with
  more than 15% of its energy at 1-4 kHz, then a fixed per-Short choice, so a re-render gets the same track. No track
  to be had: the edit prints `score: WARNING ... NO MUSIC` and goes on.
- **The payoff** (story.json `"payoff"`, in the pacing gate's form: `"L13"`, `"boom"`, `"today_word+0.2"`;
  else the edit's endAfter mark, else a `payoff`/`reveal`/`boom` mark):
  - the bed fades out (0.12 s) **0.45 s before** it: silence before the hit
  - a riser (1.9 s, peak -24 dBFS, its first 70% a fade in) ends exactly where the bed stops, only when a hit follows
  - the hit lands on the payoff frame (a cinematic impact plus a sub boom)
  - **nothing after it**: no payoff track, no comeback of the bed (owner, 2026-11-10: Good Boy "Wtf is the beat at
    the end?"; "no music sting after the story is over"). The game, ambience and room tone carry the last second.
  - a story funny before and after gets a record scratch (-18 dBFS) into the silence instead of the riser and hit
  - no payoff named or found: the bed runs through (0.8 s fade at the end)
- **Credits:** the track goes in the description (exactly as `credit` in music/score.json), its id in
  `metadata.json` `song.tracks`.
- Turn a piece off per story with `"audio": {"riser": false, "hit": false, "score": false, "ambience": false}`;
  `"whoosh": true` brings the scene-cut whooshes back (at -32 dBFS peak, low-passed at 5 kHz, a 120 ms fade in). A
  stunt's own `edit.sfx` riser, scratch, boom or impact replaces the automatic one.
- Stunt (non-story) Shorts: their NCS phonk at **-16 LUFS** (`add_song.BED_LUFS`; was -13 until 2026-11-11) against
  the game at -15, under a -10 LUFS master. Owner, 2026-11-11, after guess_sound's "had super loud music": **"fix all
  i think"**: the bed went down ~3 dB on every stunt Short so the game's own hits carry the payoff, and every ready,
  not-yet-uploaded stunt Short was remixed to it from its short_nosong.mp4 (r:r662041). Check: `python3
  scripts/key_sounds.py <name> --hits` (the biggest game hits vs the music).
  The -10 LUFS master's true peak is held at or under -1 dBTP (-2 with key sounds): `loud.master` limits the
  4x-oversampled signal and re-measures the decoded AAC (2026-11-11: stunt packages peaked at +0.4 dBTP with the old
  sample-peak limiter, a clipping risk after YouTube's transcode; forward only, old packages stay). pace WARNs over -1 dBTP.
- **Key sounds** (owner, 2026-11-11, on guess_sound: **"had super loud music"**; a guessing game you can't hear is
  broken): a stunt whose game is a sound names it, edit `keySounds: ['hear']` (lib/guess_sound.js does). At publish
  `scripts/add_song.py` ducks the NCS bed to -24 dB under each clip (from 0.05 s before it to 0.15 s after it ends;
  never over the drop) and masters with a -2 dB limit. **The gate: each key sound >= 8 dB over the music**, else
  BLOCK (add_song.py exits 1; `./hb pace` on the package's short.mp4). Measured: the old mixes had the calls at -1.8
  to -5.4 dB median under/over the music (worst -12.3, best +4.8); ducked, +11.6 dB at worst. `python3
  scripts/key_sounds.py <name>` (`--hits` for any other stunt: its loudest game sounds vs the music, a report only).

## Sound effects
1. **On-screen sounds (the owner's rule):** every visible event that makes a sound in vanilla gets that sound,
   on its frame. `scripts/onscreen_sfx.py` reads the recording's marks, block changes and entity tracks:
   - a dig (a hit every 4 ticks, then the break), a block placed or broken, a door / trapdoor / gate, a **barrel**
     (`block.barrel.open/close`; it used to get the door's sound, and every door read "closed"), a chest, an item
     picked up (by anyone in hearing), a mob hit or killed, a bell, eating or drinking, a lit fuse, thunder, an anvil
   - **mob voices**: the cast is summoned Silent, so no mob made a sound on its own. Each mob within hearing gets
     vanilla's idle timer (Mob.baseTick: a 1/1000 roll rising each tick, reset to -80 after a sound): villager hmm,
     wolf bark / pant (growl when angry), zombie groan, pillager, ravager, piglin, warden, bat, cat, sheep, ...; at
     most one every 1.2 s across the mix, falling off with distance like vanilla
   - **steps** of every walking mob and actor (one per 1/0.6 blocks walked; the mob's own step sound or the block
     underfoot's); the camera's own steps come from the harness
   - **splashes and swimming**: an entity or the camera entering water, then a stroke per 1/0.6 blocks in it
   - only within hearing (16 blocks of the camera) and inside the Short; a recorded `sound` mark of the right kind
     within 150 ms counts as the sound
   - under the narrator's key words (the caption chunks with a CAPITALISED word): a mob's idle voice is dropped,
     a minor sound (pickup, place, step, dig tick, swim) goes in 9 dB down, a causal one (break, door, hit, death,
     fuse) 6 dB down
   - the hotbar switch makes no sound in vanilla Java (only equipping armour does): none is added
2. **The check:** `python3 scripts/onscreen_sfx.py <rec.json[.gz]> [--story stories/<name>] [--strict]` lists every
   visible sound-making event (in view or not) and which ones the recording has no sound for, the ambience per
   shot, and the **visible actions that stay silent after the fills** (a container opened, an item used, a mob hit
   or killed, lightning, with no matching sound close after it): `--strict` exits 1 on any. `rec_check.py` prints
   the count (never a blocker).
3. **Ambience** (`onscreen_sfx.scenes`): one per stretch between `cut` / `time` marks (a flash under 0.8 s keeps
   the scene around it), from the camera: the dimension (nether: vanilla `ambient.nether_wastes.loop`), the block at
   the eye (water: `ambient.underwater.loop`), the weather (vanilla rain, `weather.rain.above` indoors), the 24
   blocks above (8+ solid: a cave, Mixkit "Wind cold interior"; any: indoors, crickets low-passed at 1.4 kHz at night,
   nothing by day) and the clock (13000-23000 night: Mixkit "Summer night crickets loop"; 12000-13000 dusk: the
   same, 5 dB down; day: Mixkit "Breeze through the trees"). A scene that comes back resumes where it was.
4. **Design sounds, sparingly:** no whooshes by default; one riser and one hit per story.
5. **Sources:** vanilla sounds from Mojang's asset CDN (audio.py; never committed); the Mixkit Sound Effects
   Free License for the riser, impact and the ambience beds (`scripts/fetch_sfx.py cinematic/ transition/
   ambience/`); our numpy synths as the fallback for each; Kenney CC0. Freesound is unreachable from the container.

6. **Audible levels** (2026-11-11, thirty_one_raids: the payoff raid horn was silent in the first package). A `sound`
   mark is mixed at its play volume x the event's sounds.json **file** volume, and a few events have tiny file volumes
   because the game plays them far louder than 1: the raid horn's is 0.01 (the game plays it at 64), so the stunt's
   2.2 was 0.022 in the mix. The kit: `ctx.vanillaSound(event)` plays an event at the game's own volume (horn 64, bell
   2, explosion 4, thunder 10000; lib/sound_level.js), `ctx.sound(event, vol, pitch, { key: true })` flags the sound a
   moment hangs on (raised to at least that volume) and `ctx.sound` logs a WARN at record time for anything inaudible.
   **The gate** (`scripts/sound_levels.py`, in rec_check, so `./hb record` stops and `./hb check` fails): any sound mark
   under **0.04 effective (-28 dB)** BLOCKs in a story Short (ambience and file-less events aside; in a HelloBuh stunt it's a WARN:
   chain / cells stunts relay the server's own sounds distance-attenuated, cells_lab's far pistons and mob steps sit at
   0.02-0.04 on purpose, the only hits in all 76 packages); a key sound (edit `keySounds`, the story's `payoff`, a
   flagged one) under 0.15 WARNs. Calibrated on the five stories: the old horns 0.012 / 0.022, the quietest intended
   sound 0.08 (gold's portal trigger), steps 0.15. On a rendered Short, `./hb check`'s "audible sound" step looks for
   each key / payoff sound's own waveform in the mix (a matched filter; a WARN to listen, never a blocker). The table
   is `lib/sound_volumes.json` (`python3 scripts/sound_levels.py --gen` for a new Minecraft version).

## Re-editing only the sound
`python3 edit.py --audio_only out/<name>.mp4 <the stunt's edit args> --timeline work/<name>.rec.json --audio
work/<name>.wav --out <new>.mp4` remixes a story's sound onto a finished mp4's picture (stream copy: the frames,
captions and overlays are reused, nothing re-rendered). On Actions, `./hb render <stunt> --reuse` re-runs the edit
on the last run's frames. `HB_STEMS=<dir>` writes every layer as a wav, for measuring.

## Checks
- `python3 scripts/audio_measure.py out/<name>.mp4`: I, LRA, TP, momentary percentiles, dead air (under
  -50 LUFS) and digital silence (under -70), 1-4 kHz share. Targets: I -14 +-0.5, TP <= -1.0, digital silence 0,
  dead air < 2%. The edit prints every layer's loudness and the deepest clarity-guard cut, and stamps them in the
  mp4's comment tag.
- `python3 scripts/story_audio.py plan stories/<name> work/<stunt>.rec.json`: the moods, the payoff time, the
  speech spans, the ambience per shot and the score track, without any audio.
- `python3 scripts/key_sounds.py <name>`: each edit.keySounds clip vs the music on the package (>= 8 dB, else exit 1);
  `python3 -m unittest scripts/test_key_sounds.py` (in `npm test`).
- `python3 scripts/sound_levels.py <rec> --stunt <name> [--video out/<name>.mp4] [--all]`: every sound mark's effective
  level (BLOCK under 0.04), the key / payoff sounds, and with --video whether each is found in the mix;
  `python3 -m unittest scripts/test_sound_levels.py` (in `npm test`).
- `python3 -m unittest scripts/test_story_audio.py` (in `npm test`): the bed stops before the payoff and never comes
  back, sits ~13.5 dB under the voice, no whoosh by default, the clarity guard, the key-word rule, the silent-action
  check, vanilla's idle timer and step rate.
