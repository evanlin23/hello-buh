# HelloBuh Shorts (finished renders)

Reviewed Shorts from the pipeline on `main`, each with everything that made it. The code lives on
`main`; this branch only holds packages, so `main` stays small.

Each `shorts/<name>/` has: `short.mp4` (the upload), `metadata.json` (YouTube title, description,
hashtags, song credit and drop, video specs and sha256, recording summary, code commit, exact edit
arguments, rebuild steps), `recording.json.gz` (the bot recording: with the commit it re-renders
the same video), `game_audio.flac`, `source/` (the stunt module as it was) and `build.log`.
Song files are not stored (owner-supplied, `songs/` on main); the metadata names each one and its sha256.

Add or refresh one: `node scripts/publish.js <name> [--notes "..."]` from main, with this branch
checked out at `../hb-videos`.

| Short | Caption | Length | Song | Status | Commit | Notes |
|---|---|---|---|---|---|---|
| [looks_wrong](shorts/looks_wrong/short.mp4) | Bro this looks wrong? | 9.7s | FUNK ABNORMAL (ULTRA SLOWED) | ready | 17ecd2d |  |
| [one_in_a_million](shorts/one_in_a_million/short.mp4) | 1 in a million landing 😳 | 8.3s | misery. · pupsies | ready | 482d834 |  |
| [pearl_clutch](shorts/pearl_clutch/short.mp4) | POV: You Throw an Ender Pearl But... | 7.15s | misery. · pupsies | ready | 46ecd24 |  |
| [villager_job](shorts/villager_job/short.mp4) | POV: THE VILLAGER IS UNEMPLOYED 💀 | 12.4s | Payphone · Radio Top Singers | ready | 17ecd2d |  |
| [water_clutch](shorts/water_clutch/short.mp4) | water bucket clutch 💀 | 7.8s | misery. · pupsies | ready | 17ecd2d |  |
| [wrong_bucket](shorts/wrong_bucket/short.mp4) | POV: you grabbed the wrong bucket 💀 | 9.85s | FUNK ABNORMAL (ULTRA SLOWED) | ready | cf14cb2 |  |
