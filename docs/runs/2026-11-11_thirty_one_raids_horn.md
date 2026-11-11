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
