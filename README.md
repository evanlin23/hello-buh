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
| [anvil_rain](shorts/anvil_rain/short.mp4) | minecraft but it rains anvils 💀 | 10.05s | FUNK ABNORMAL (ULTRA SLOWED) | pending-qa | 799e77f | not yet passed the frame-by-frame review (docs/qa.md);  |
| [cave_reveal](shorts/cave_reveal/short.mp4) | never dig straight down 💀 | 7.85s | THE REDEEMER · BVSSL7ON, ANIZYZ | pending-qa | 799e77f | not yet passed the frame-by-frame review (docs/qa.md); QA2: still dark; lavafall render gaps |
| [creeper](shorts/creeper/short.mp4) | POV: you hear tssss 💀 | 6.85s | Intranet Crush · hiræth, Willix | needs-fix | 502c8b2 | frame QA: creeper not on screen until 4.2 s, no fuse flash; re-render queued |
| [creeper_art](shorts/creeper_art/short.mp4) | rate my pixel art 1-10 😭 | 31.85s | INDUSTRY KISS · DIPIENS, HRXSTAL | pending-qa | 68b05c5 | worker: held for re-render (owner: remove the mid-build glance) |
| [guess_sound_3](shorts/guess_sound_3/short.mp4) | guess the mob from its sound pt 3 🔊 | 32.55s | MONTAGEM FAVELA · CHASHKAKEFIRA | ready | 1b8823d | worker 13: guess the mob from its sound pt 3 (chicken, sniffer, magma cube, skeleton, blaze, then a real creeper after two parrot fake-outs); independent review r5 ready on retention, minecraft and frame review |
| [half_heart](shorts/half_heart/short.mp4) | POV: you're on half a heart 💀 | 5.9s | VEM LENTA! · KPHK, Eluvo, Sayfalse | pending-qa | f655187 | not yet passed the frame-by-frame review (docs/qa.md);  |
| [heart_art](shorts/heart_art/short.mp4) | my gf asked what I was building 😭 | 32.2s | Royalty Funk · LXNGVX | pending-qa | 2f05934 | worker: held for re-render (owner: remove the mid-build glance) |
| [house_sizes](shorts/house_sizes/short.mp4) | building a house in 5s vs 10s vs 20s 💀 | 18.65s | FUNK ABNORMAL (ULTRA SLOWED) | pending-qa | 9d412b3 | not yet passed the frame-by-frame review (docs/qa.md); worker: dirt hut vs plank cottage vs two-colour house, real block placements, ends on all three |
| [ladder_clutch](shorts/ladder_clutch/short.mp4) | ladder clutch 😳 | 31.53s | Fearless Funk · DR MØB, Chris Linton | ready | 0ec69ab | worker 4: independent review READY (no blockers, no visible). Eight walls 20-80 blocks on natural terrain, real ladder placements within reach 3.4-4.2, first one deliberately late (17 dmg, natural regen after). Nitpicks left: same clutch repeats 7x; ladder briefly out of frame right after landing; long falls mostly wall. |
| [lapse_castle](shorts/lapse_castle/short.mp4) | building a castle in 1 second vs 1 minute vs 1 hour 💀 | 31.28s | INDUSTRY KISS · DIPIENS, HRXSTAL | posted | ab6f024 | worker (time-lapse): 7 review rounds; frame review, retention and minecraft audits ready. Nitpicks: clock holds 0:00.00 for ~6 frames before the first block; wool-cube flags; horizon fog band from high shots; 3x first-person whip-pans in the minute |
| [lava_crossing](shorts/lava_crossing/short.mp4) | every way to cross lava (rated) 💀 | 19.85s | Sky Verse · Lieless, Luuna, Yarimov | pending-qa | 62b7c60 | not yet passed the frame-by-frame review (docs/qa.md); worker: bridge 6/10, water bucket->obsidian 9/10, pearl 10/10, walking in 0/10 (death screen) |
| [lava_rising](shorts/lava_rising/short.mp4) | the lava stopped 1 block below me 😳 | 12.5s | X2 · MUPP | pending-qa | 799e77f | not yet passed the frame-by-frame review (docs/qa.md); QA2: payoff framing of the 1-block gap could be clearer |
| [looks_wrong](shorts/looks_wrong/short.mp4) | Bro this looks wrong? | 32s | VEM LENTA! · KPHK, Eluvo, Sayfalse | pending-qa | 7fc53ee | worker: held for re-render (owner: remove the mid-build glance) |
| [midas_touch](shorts/midas_touch/short.mp4) | POV: you got the midas touch 🤑 | 10.15s | AYUDA · MXRCVRY | pending-qa | 90afab9 | not yet passed the frame-by-frame review (docs/qa.md);  |
| [nether_portal](shorts/nether_portal/short.mp4) | POV: your first nether portal 😳 | 6.95s | MONTAGEM FAVELA · CHASHKAKEFIRA | needs-fix | 38ccca9 | frame QA pass (reviewer 2026-11-06): nitpicks only (0.55 s still opening, portal particles column) |
| [one_in_a_million](shorts/one_in_a_million/short.mp4) | 1 in a million landing 😳 | 6.85s | Sky Verse · Lieless, Luuna, Yarimov | pending-qa | f655187 | not yet passed the frame-by-frame review (docs/qa.md);  |
| [pearl_clutch](shorts/pearl_clutch/short.mp4) | POV: You Throw an Ender Pearl But... | 7.15s | Intranet Crush · hiræth, Willix | needs-fix | 46ecd24 | QA: the stunt (breaking elytra -> pearl) does not read; redesign before uploading |
| [pickaxe_race](shorts/pickaxe_race/short.mp4) | ranking every pickaxe ⛏️ 💀 | 19.9s | X2 · MUPP | pending-qa | 0bb3147 | not yet passed the frame-by-frame review (docs/qa.md); worker: 5 pickaxes mine 3x3 stone sections, real dig times as subs (Haste V, netherite eff V instamine) |
| [rainbow_wool](shorts/rainbow_wool/short.mp4) | dyeing it until it's a rainbow 🌈 | 14.25s | FAVELA · MXZI, Deno | needs-fix | 38ccca9 | worker re-render (new engine, frame QA): no blockers; nitpicks: held dye pops in at the right edge on swings, band labels sit over the dyed spot |
| [sand_tower](shorts/sand_tower/short.mp4) | the torch trick never gets old 😭 | 5.85s | Montagem Toma · X972, sk3tch01, MXZI | pending-qa | c4cd22e | not yet passed the frame-by-frame review (docs/qa.md);  |
| [skull_art](shorts/skull_art/short.mp4) | why is he building THIS 😨 | 30.45s | Fearless Funk · DR MØB, Chris Linton | pending-qa | c02f2a8 | worker: held for re-render (owner: remove the mid-build glance) |
| [speed_build](shorts/speed_build/short.mp4) | Fastest house build 💀 | 30.7s | Mortals Funk Remix · Warriyo, LXNGVX | ready | 112dab3 | worker: 30.7 s two-storey speed build with timer; frame review + retention + minecraft audits passed. Nitpicks: final look clips the roof ridge under the timer, 0.7 s length margin |
| [story_runaway](shorts/story_runaway/short.mp4) | why does everyone run from me 💀 | 38.46s | Montagem Toma · X972, sk3tch01, MXZI | pending-qa | 15b75d7 | PENDING: owner asked to end on the boom (cut L15-L17); re-edit and re-audit in progress. |
| [sword_art](shorts/sword_art/short.mp4) | can you guess what I'm building? 🤔 | 32.1s | MONTAGEM FAVELA · CHASHKAKEFIRA | pending-qa | ecab008 | worker: held for re-render (owner: remove the mid-build glance) |
| [tnt](shorts/tnt/short.mp4) | POV: you lit 75 TNT 💀 | 15.4s | Mortals Funk Remix · Warriyo, LXNGVX | needs-fix | 1cb03ec | user: ground dark + bot stuck; re-render queued with the fixed stunt |
| [villager_crowd](shorts/villager_crowd/short.mp4) | 1 villager vs 10 vs 100 staring at me 💀 | 13.5s | Feel Good Funk · Syn Cole, Nakama | needs-fix | 8889968 | worker frame QA (fresh engine, independent review): ready. Nitpicks: held emerald mostly off the right edge of the crop; ~0.7 s pause after the 100-crowd turn; packed-ice mound on the horizon in beat 1 |
| [villager_job](shorts/villager_job/short.mp4) | POV: THE VILLAGER IS UNEMPLOYED 💀 | 9.6s | Fearless Funk · DR MØB, Chris Linton | pending-qa | 99d866a | not yet passed the frame-by-frame review (docs/qa.md);  |
| [water_clutch](shorts/water_clutch/short.mp4) | water bucket clutch 💀 | 5.9s | INDUSTRY KISS · DIPIENS, HRXSTAL | pending-qa | f655187 | not yet passed the frame-by-frame review (docs/qa.md);  |
| [water_vs_lava](shorts/water_vs_lava/short.mp4) | pouring water on a lava lake 😳 | 18.55s | VEM LENTA! · KPHK, Eluvo, Sayfalse | pending-qa | de075fa | worker frame QA: NOT ready, engine blockers: water drains as a checkerboard (f780-792, f902-918 of this cut-1 render offset; i.e. during the drain after the scoops); water near-opaque so the obsidian forming under it never shows until the drain; flowing-water front drawn as thick stepped slabs with lava seams between steps (f60-560). Stunt side OK. |
| [wrong_bucket](shorts/wrong_bucket/short.mp4) | POV: you grabbed the wrong bucket 💀 | 9.85s | Royalty Funk · LXNGVX | pending-qa | cf14cb2 | not yet passed the frame-by-frame review (docs/qa.md);  |
