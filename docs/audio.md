# The audio standard (story Shorts)

Owner, 2026-11-10: "the best music to use? Are we rolling our own music? The best sound effects? ... the best
audio? ... everything should be the best and optimized in the process", and "on screen sfx as well, if
needed/maybe". The evidence for every number below is in `docs/research/audio_2026-11-10.md`. It's all
automatic: `edit.py --story` (via `scripts/story_audio.py`) and `scripts/add_song.py` (at publish) apply it.
Non-story Shorts are untouched.

## The layers, quietest to loudest
| layer | level | what it does | where |
|---|---|---|---|
| room tone | -47 LUFS | soft air under everything: never digital silence (it was 8-12% of every nosong mix) | `story_audio.room_tone` |
| score bed | -26 LUFS, ducked 7 dB under each spoken line (~18 dB under the voice, ~11 dB in pauses) | the mood track; out 0.45 s before the payoff | `story_audio.add_score` (publish) |
| game | -27 LUFS, ducked 4 dB under lines | the recording's sounds **plus every visible event's vanilla sound** | `audio.py` + `scripts/onscreen_sfx.py` |
| design | whoosh peak -20 dBFS, riser peak -14 dBFS, hit peak -5 dBFS (+ sub) | whooshes on scene changes, a riser into the drop-out, the impact on the payoff | `story_audio.design_track` |
| payoff track | -24 LUFS from the payoff on, ducked under any line | the after-twist colour, entering on its own loudest moment | `story_audio.add_score` |
| voice | -15 LUFS after the clarity chain | the narration leads, always | `story_audio.mix_story` |
| master | -14 LUFS integrated, true peak <= -1 dBTP | static gain + a 4x-oversampled limiter; no dynamic loudnorm (it flattened payoffs) | `story_audio.master` |

## Voice clarity chain
`highpass 80 Hz` -> `-2 dB @ 250 Hz` (TTS boxiness) -> `+2.5 dB @ 3.5 kHz` (consonants) -> `de-esser` ->
`3:1 compression` (threshold -18 dBFS, attack 5 ms, release 60 ms) -> static gain to -15 LUFS. It lifted the
1-4 kHz share of our mixes from 13-16% to 21%.

## Music: the mood score
- **Source:** `music/score.json`. 18 Kevin MacLeod tracks (incompetech.com, CC BY 4.0: monetized YouTube OK
  with the credit in the description). The tracks are pre-registered in Content ID, and the system claims
  videos that are missing the credit. Ours always has it, because the upload carries the description. If a
  claim comes anyway, dispute it (incompetech: released within 72 h; the ISRC is logged with each track); a
  claimed Short under 60 s stays up meanwhile. Tagged eerie / tense / sad / funny / heroic, with `role`: `bed`
  (little in the voice band) or `payoff`. Fetched by `scripts/fetch_music.py` into `songs/score/` (gitignored,
  only the first 150 s kept, Opus) from the logged URL. Never committed.
- **Pick:** story.json `"mood": "eerie"` or `["tense", "sad"]` (before / after the payoff). Without it, a keyword
  guess from the premise and twist (fallback `tense`); write it in the script instead. Beds: the least-used
  track of the mood across the packages, skipping any with more than 15% of its energy at 1-4 kHz.
- **The payoff** (story.json `"payoff"`, in the pacing gate's form: `"L13"`, `"boom"`, `"today_word+0.2"`;
  else the edit's endAfter mark, else a `payoff`/`reveal`/`boom` mark):
  - the bed fades out (0.12 s) **0.45 s before** it: silence before the hit
  - a riser (1.9 s) ends exactly where the bed stops; funny stories get a record scratch instead
  - the hit lands on the payoff frame (a cinematic impact plus a sub boom; funny: none)
  - if 2 s or more is left, the **payoff track** enters on its own drop (song_drop.py), 2 dB over the bed. A
    funny story's bed picks up again where it stopped instead
  - no payoff named or found: the bed runs through, with no stinger and no switch
- **Credits:** every track used goes in the description (exactly as `credit` in music/score.json), and its id
  goes in `metadata.json` `song.tracks`.
- Turn a piece off per story with `"audio": {"whoosh": false, "riser": false, "hit": false}`. A stunt's own
  `edit.sfx` riser, scratch, boom or impact replaces the automatic one.
- Stunt (non-story) Shorts keep their NCS phonk at -13 LUFS under a -10 LUFS master (unchanged).

## Sound effects
1. **On-screen sounds (the owner's rule):** every visible event that makes a sound in vanilla gets that sound,
   on its frame. `scripts/onscreen_sfx.py` reads the recording's marks and block changes: a dig (a hit every
   4 ticks, then the break), a block placed or broken, a door / trapdoor / gate, an item pickup, a mob hit or
   killed, a bell, a chest, eating or drinking, a lit fuse, thunder, a falling anvil landing. It takes the
   sound group from the block's name, and counts an event only within hearing (16 blocks of the camera) and
   inside the Short. If the recording already has a matching `sound` mark within 150 ms, nothing is added.
   For a story, audio.py adds the rest. **Not under the narrator's key words** (the caption chunks with a
   CAPITALISED word): a minor sound there (pickup, place, dig ticks) is dropped; a causal one (break, door,
   hit, death, fuse) goes in 6 dB down.
   - The check: `python3 scripts/onscreen_sfx.py <stunt or rec.json>` lists every visible event with no sound;
     `rec_check.py` prints the count (never a blocker).
   - Measured on the published stories: story_torch had 34 silent events (15 digs, 14 pickups), sheep_stares
     6, nitwit 5.
2. **Design sounds, sparingly:** whooshes only on scene changes (the clock jumps or the camera moves more than
   24 blocks), at most one per 6 s, never within 2.5 s of the payoff. One riser and one hit per story.
3. **Sources:** vanilla sounds from Mojang's asset CDN (audio.py; never committed); the Mixkit Sound Effects
   Free License for the cinematic whoosh, riser and impact (`scripts/fetch_sfx.py cinematic/ transition/`);
   our numpy synths as the fallback for each; Kenney CC0. Freesound is unreachable from the container.

## Checks
- `python3 scripts/audio_measure.py out/<name>.mp4`: I, LRA, TP, momentary percentiles, dead air (under
  -50 LUFS) and digital silence (under -70), 1-4 kHz share. `--story <name>` adds voice-to-bed for a package.
  Targets: I -14 +-0.5, TP <= -1.0, digital silence 0, dead air < 2%.
- `python3 scripts/story_audio.py plan stories/<name> work/<stunt>.rec.json`: the moods, the payoff time, the
  speech spans and the cuts that get a whoosh, without any audio.
- A/B against the published mix: `python3 scripts/audio_ab.py story_<name>` -> `out/audio_ab/`.
