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
| [anvil_rain](shorts/anvil_rain/short.mp4) | minecraft but it rains anvils 💀 | 10.05s | FUNK ABNORMAL (ULTRA SLOWED) | ready | 799e77f |  |
| [cave_reveal](shorts/cave_reveal/short.mp4) | never dig straight down 💀 | 7.85s | misery. · pupsies | ready | 799e77f | QA2: still dark; lavafall render gaps |
| [creeper](shorts/creeper/short.mp4) | POV: you hear tssss 💀 | 6.85s | FUNK ABNORMAL (ULTRA SLOWED) | ready | 99d866a |  |
| [creeper_art](shorts/creeper_art/short.mp4) | rate my pixel art 1-10 😭 | 8.8s | misery. · pupsies | ready | 46cab20 |  |
| [half_heart](shorts/half_heart/short.mp4) | POV: you're on half a heart 💀 | 5.9s | misery. · pupsies | ready | f655187 |  |
| [heart_art](shorts/heart_art/short.mp4) | built this for my girlfriend 🥺 | 6.85s | Payphone · Radio Top Singers | ready | 5617e57 |  |
| [lava_rising](shorts/lava_rising/short.mp4) | the lava stopped 1 block below me 😳 | 12.5s | misery. · pupsies | ready | 799e77f | QA2: payoff framing of the 1-block gap could be clearer |
| [looks_wrong](shorts/looks_wrong/short.mp4) | Bro this looks wrong? | 9.7s | FUNK ABNORMAL (ULTRA SLOWED) | ready | 17ecd2d |  |
| [midas_touch](shorts/midas_touch/short.mp4) | POV: you got the midas touch 🤑 | 10.15s | FUNK ABNORMAL (ULTRA SLOWED) | ready | 90afab9 |  |
| [nether_portal](shorts/nether_portal/short.mp4) | POV: your first nether portal 😳 | 6.3s | FUNK ABNORMAL (ULTRA SLOWED) | ready | e657d18 |  |
| [one_in_a_million](shorts/one_in_a_million/short.mp4) | 1 in a million landing 😳 | 6.85s | misery. · pupsies | ready | f655187 |  |
| [pearl_clutch](shorts/pearl_clutch/short.mp4) | POV: You Throw an Ender Pearl But... | 7.15s | misery. · pupsies | ready | 46ecd24 |  |
| [sand_tower](shorts/sand_tower/short.mp4) | the torch trick never gets old 😭 | 5.85s | FUNK ABNORMAL (ULTRA SLOWED) | ready | c4cd22e |  |
| [skull_art](shorts/skull_art/short.mp4) | the skull emoji irl 💀 | 8.75s | FUNK ABNORMAL (ULTRA SLOWED) | ready | 46cab20 |  |
| [speed_build](shorts/speed_build/short.mp4) | Fastest house build 💀 | 8.85s | FUNK ABNORMAL (ULTRA SLOWED) | ready | 9a5edf2 |  |
| [sword_art](shorts/sword_art/short.mp4) | can you guess what I'm building? 🤔 | 5.2s | misery. · pupsies | ready | d95a743 |  |
| [tnt](shorts/tnt/short.mp4) | POV: you lit 75 TNT 💀 | 15.4s | FUNK ABNORMAL (ULTRA SLOWED) | ready | 1cb03ec | walk to the crater could be shorter (sprint) |
| [villager_job](shorts/villager_job/short.mp4) | POV: THE VILLAGER IS UNEMPLOYED 💀 | 9.6s | Payphone · Radio Top Singers | ready | 99d866a |  |
| [water_clutch](shorts/water_clutch/short.mp4) | water bucket clutch 💀 | 5.9s | misery. · pupsies | ready | f655187 |  |
| [wrong_bucket](shorts/wrong_bucket/short.mp4) | POV: you grabbed the wrong bucket 💀 | 9.85s | FUNK ABNORMAL (ULTRA SLOWED) | ready | cf14cb2 |  |
