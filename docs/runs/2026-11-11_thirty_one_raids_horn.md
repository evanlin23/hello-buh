# thirty_one_raids: the raid horn (2026-11-11, after packaging)

The lead ruled the reviewer's "no clear horn on the reveal cut" a blocker (the horn is the payoff: the drink started
raid 32). Root cause: vanilla's sounds.json gives `event.raid.horn` a file volume of 0.01 (the game plays the horn at
64 so it carries across the village); the stunt played it at 2.2 (0.022 in the mix: silent), and L09's horn at 1.2.
- Fix (a 2.5-min re-record, same voice takes): the reveal horn at 64, L09's at 40 (farther off), a `horn` mark on
  both, `edit.keySounds: ['horn']` (the song ducks under it; the key-sound gate: >= 8 dB over the music: OK).
- pace then measured the real payoff (it had guessed 36.45 s while it couldn't find the recording) and blocked "no
  picture change at the payoff": `flash: ['raidbar']` (edit-only, frames reused).
- Renders: Actions 43010614983 (full), 43014567000 (edit-only). Package: videos ae8349f8, held, buhstories,
  release asset story_thirty_one_raids.short.68936f0c0590a42b.mp4 (sha256 68936f0c..., 60.5 MB, uploaded).
- Lesson for every story: a sound event with a tiny vanilla file volume (raid horn 0.01) needs the volume the game
  itself uses; check a story's payoff sound by measuring the final mix, not the timeline mark.

## Round 2 (evening): the L09 horn (owner: "fix the horn in raids")
The 64/40 package (68936f0c) still buried L09's horn. Measured on the package (the voice / game / design stems rebuilt
from the recording with HB_STEMS, the mp4 fitted from them per 25 ms; the residual is the score; the published
short_nosong.mp4 is the same file as short.mp4, so key_sounds.py has nothing to separate on a story):
- L09 horn: **-10.0 dB under the score, -17.8 dB under the narrator** (sound_levels' matched filter: 0.13 vs 0.10
  elsewhere, NOT FOUND). Why: it fired inside L09's speech (the game ducks 4 dB there and the clarity guard cuts sfx up
  to 8 dB under the voice), and nothing ducked a story's score under a key sound: add_song.py's keySounds duck only runs
  on a stunt's NCS bed, the story score is mixed in the edit (scripts/story_audio.py).
- reveal horn: matched filter 0.60 (heard); against the score about +1 dB, and ~15 dB under the riser/hit.

Fix (same voice takes, no TTS requests):
- stunt: a 0.9 s hold after Grandpa's "They're COMING." (K.line('L08', ..., 0.9)); the horn at 64 (as the reveal's) on
  its first tick, alone; it blares on under "Then a HORN goes OFF"; Grandpa turns back to the road on it. The reveal
  horn is unchanged (64, on the S13 cut). The Short is 42.75 s (+0.85).
- scripts/story_audio.py: mix_story(key_marks=) ducks the score 24 dB (key_sounds.DUCK) over each edit.keySounds clip
  (key_sounds.windows on the game layer); edit.py --key_sounds, from edit_args.js for a story. Test:
  test_story_audio.py test_the_score_ducks_under_a_key_sound.

After (render 43104055584, edit-only on 43100052227's frames), the same measurement:
- L09 horn: **+11.2 dB over the score** over key_sounds' 2.4 s clip; alone in the hold (29.5-30.5 s) +13.1 over the
  score and +27 over the voice; under the words that follow +8.2 over the score, -17.4 under the voice (the clarity
  guard, by design). Matched filter 0.98.
- reveal horn: matched filter 0.97; the score is ducked under it now (+29 dB on the stems); still ~15 dB under the
  riser/hit, as before.
- Lesson: a story's key sound needs air (no line over its attack) and a ducked score; measure a story's key sounds on
  stems (HB_STEMS), since its package has no separate no-song mix.
