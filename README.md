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
| [creeper_art](shorts/creeper_art/short.mp4) | rate my pixel art 1-10 😭 | 8.8s | misery. · pupsies | ready | 46cab20 |  |
| [half_heart](shorts/half_heart/short.mp4) | POV: you're on half a heart 💀 | 7.75s | misery. · pupsies | ready | e657d18 |  |
| [heart_art](shorts/heart_art/short.mp4) | built this for my girlfriend 🥺 | 6.85s | Payphone · Radio Top Singers | ready | 5617e57 |  |
| [looks_wrong](shorts/looks_wrong/short.mp4) | Bro this looks wrong? | 9.7s | FUNK ABNORMAL (ULTRA SLOWED) | ready | 17ecd2d |  |
| [midas_touch](shorts/midas_touch/short.mp4) | POV: you got the midas touch 🤑 | 10.15s | FUNK ABNORMAL (ULTRA SLOWED) | ready | 90afab9 |  |
| [nether_portal](shorts/nether_portal/short.mp4) | POV: your first nether portal 😳 | 6.3s | FUNK ABNORMAL (ULTRA SLOWED) | ready | e657d18 |  |
| [one_in_a_million](shorts/one_in_a_million/short.mp4) | 1 in a million landing 😳 | 8.3s | misery. · pupsies | ready | 482d834 |  |
| [pearl_clutch](shorts/pearl_clutch/short.mp4) | POV: You Throw an Ender Pearl But... | 7.15s | misery. · pupsies | ready | 46ecd24 |  |
| [skull_art](shorts/skull_art/short.mp4) | the skull emoji irl 💀 | 8.75s | FUNK ABNORMAL (ULTRA SLOWED) | ready | 46cab20 |  |
| [speed_build](shorts/speed_build/short.mp4) | Fastest house build 💀 | 8.85s | FUNK ABNORMAL (ULTRA SLOWED) | ready | 9a5edf2 |  |
| [villager_job](shorts/villager_job/short.mp4) | POV: THE VILLAGER IS UNEMPLOYED 💀 | 12.4s | Payphone · Radio Top Singers | ready | 17ecd2d |  |
| [water_clutch](shorts/water_clutch/short.mp4) | water bucket clutch 💀 | 7.8s | misery. · pupsies | ready | 17ecd2d |  |
| [wrong_bucket](shorts/wrong_bucket/short.mp4) | POV: you grabbed the wrong bucket 💀 | 9.85s | FUNK ABNORMAL (ULTRA SLOWED) | ready | cf14cb2 |  |
