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
| [cave_reveal](shorts/cave_reveal/short.mp4) | never dig straight down 💀 | 7.85s | THE REDEEMER · BVSSL7ON, ANIZYZ | ready | 799e77f | QA2: still dark; lavafall render gaps |
| [creeper](shorts/creeper/short.mp4) | POV: you hear tssss 💀 | 6.85s | Intranet Crush · hiræth, Willix | needs-fix | 502c8b2 | frame QA: creeper not on screen until 4.2 s, no fuse flash; re-render queued |
| [creeper_art](shorts/creeper_art/short.mp4) | rate my pixel art 1-10 😭 | 8.8s | Take The Sky · crysstales, DJ YHR, HRXSTAL | ready | 46cab20 |  |
| [half_heart](shorts/half_heart/short.mp4) | POV: you're on half a heart 💀 | 5.9s | VEM LENTA! · KPHK, Eluvo, Sayfalse | ready | f655187 |  |
| [heart_art](shorts/heart_art/short.mp4) | built this for my girlfriend 🥺 | 6.85s | Royalty Funk · LXNGVX | ready | 5617e57 |  |
| [house_sizes](shorts/house_sizes/short.mp4) | building a house in 5s vs 10s vs 20s 💀 | 18.65s | FUNK ABNORMAL (ULTRA SLOWED) | ready | 9d412b3 | worker: dirt hut vs plank cottage vs two-colour house, real block placements, ends on all three |
| [lava_crossing](shorts/lava_crossing/short.mp4) | every way to cross lava (rated) 💀 | 19.85s | Sky Verse · Lieless, Luuna, Yarimov | ready | 62b7c60 | worker: bridge 6/10, water bucket->obsidian 9/10, pearl 10/10, walking in 0/10 (death screen) |
| [lava_rising](shorts/lava_rising/short.mp4) | the lava stopped 1 block below me 😳 | 12.5s | X2 · MUPP | ready | 799e77f | QA2: payoff framing of the 1-block gap could be clearer |
| [looks_wrong](shorts/looks_wrong/short.mp4) | Bro this looks wrong? | 9.6s | Feel Good Funk · Syn Cole, Nakama | ready | 97bba2b | worker QA (qa_frames + independent review): ready. Nitpicks: last stone-brick gap renders very dark f444-459; held yellow block covers the lower mouth during the fill |
| [midas_touch](shorts/midas_touch/short.mp4) | POV: you got the midas touch 🤑 | 10.15s | AYUDA · MXRCVRY | ready | 90afab9 |  |
| [nether_portal](shorts/nether_portal/short.mp4) | POV: your first nether portal 😳 | 6.95s | MONTAGEM FAVELA · CHASHKAKEFIRA | ready | 38ccca9 | frame QA pass (reviewer 2026-11-06): nitpicks only (0.55 s still opening, portal particles column) |
| [one_in_a_million](shorts/one_in_a_million/short.mp4) | 1 in a million landing 😳 | 6.85s | Sky Verse · Lieless, Luuna, Yarimov | ready | f655187 |  |
| [pearl_clutch](shorts/pearl_clutch/short.mp4) | POV: You Throw an Ender Pearl But... | 7.15s | Intranet Crush · hiræth, Willix | needs-fix | 46ecd24 | QA: the stunt (breaking elytra -> pearl) does not read; redesign before uploading |
| [pickaxe_race](shorts/pickaxe_race/short.mp4) | ranking every pickaxe ⛏️ 💀 | 19.9s | X2 · MUPP | ready | 0bb3147 | worker: 5 pickaxes mine 3x3 stone sections, real dig times as subs (Haste V, netherite eff V instamine) |
| [rainbow_wool](shorts/rainbow_wool/short.mp4) | dyeing it until it's a rainbow 🌈 | 14.25s | FAVELA · MXZI, Deno | ready | 38ccca9 | worker re-render (new engine, frame QA): no blockers; nitpicks: held dye pops in at the right edge on swings, band labels sit over the dyed spot |
| [sand_tower](shorts/sand_tower/short.mp4) | the torch trick never gets old 😭 | 5.85s | Montagem Toma · X972, sk3tch01, MXZI | ready | c4cd22e |  |
| [skull_art](shorts/skull_art/short.mp4) | the skull emoji irl 💀 | 8.75s | COM BOTA · cape, crysstales | ready | 46cab20 |  |
| [speed_build](shorts/speed_build/short.mp4) | Fastest house build 💀 | 8.35s | AYUDA · MXRCVRY | ready | 97bba2b | worker QA (qa_frames + independent review): ready. Nitpicks: 0.37 s still opening before the timer, last ~0.5 s nearly still; held item pops on slot switches (engine: no lower/raise animation) |
| [sword_art](shorts/sword_art/short.mp4) | can you guess what I'm building? 🤔 | 5.2s | INDUSTRY KISS · DIPIENS, HRXSTAL | ready | d95a743 |  |
| [tnt](shorts/tnt/short.mp4) | POV: you lit 75 TNT 💀 | 15.4s | Mortals Funk Remix · Warriyo, LXNGVX | needs-fix | 1cb03ec | user: ground dark + bot stuck; re-render queued with the fixed stunt |
| [villager_crowd](shorts/villager_crowd/short.mp4) | 1 villager vs 10 vs 100 staring at me 💀 | 13.5s | Feel Good Funk · Syn Cole, Nakama | ready | 8889968 | worker frame QA (fresh engine, independent review): ready. Nitpicks: held emerald mostly off the right edge of the crop; ~0.7 s pause after the 100-crowd turn; packed-ice mound on the horizon in beat 1 |
| [villager_job](shorts/villager_job/short.mp4) | POV: THE VILLAGER IS UNEMPLOYED 💀 | 9.6s | Fearless Funk · DR MØB, Chris Linton | ready | 99d866a |  |
| [water_clutch](shorts/water_clutch/short.mp4) | water bucket clutch 💀 | 5.9s | INDUSTRY KISS · DIPIENS, HRXSTAL | ready | f655187 |  |
| [water_vs_lava](shorts/water_vs_lava/short.mp4) | pouring water on a lava lake 😳 | 19.05s | VEM LENTA! · KPHK, Eluvo, Sayfalse | ready | 19b1cc9 | worker: 5 water buckets turn a 15x15 lava lake to obsidian, scooped back up to reveal the field |
| [wrong_bucket](shorts/wrong_bucket/short.mp4) | POV: you grabbed the wrong bucket 💀 | 9.85s | Royalty Funk · LXNGVX | ready | cf14cb2 |  |
