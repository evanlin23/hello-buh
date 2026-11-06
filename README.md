# hello-buh: automated Minecraft stunt Shorts for @HelloBuh

A bot plays a scripted stunt on a private local server, the stunt is rendered offline at 60 fps,
and the clip is edited into the channel's format. No human at the keyboard, no Minecraft account.

```bash
./run.sh                          # -> out/water_clutch.mp4 (1080x1920, 60 fps)
STUNT=pearl_clutch ./run.sh       # any stunt in stunts/
./scripts/run_all.sh              # every stunt, fresh world each
```

## Stunts (`stunts/<name>.js`)
| stunt | caption | song (owner-supplied, `songs/`) | reference |
|---|---|---|---|
| `water_clutch` | water bucket clutch 💀 | misery. (drop on the water placement) | HelloBuh's own MLG Shorts |
| `looks_wrong` | Bro this looks wrong? | FUNK ABNORMAL (ULTRA SLOWED) (drop on the reveal) | SunuCellyClipss, 8.9M |
| `villager_job` | POV: THE VILLAGER IS UNEMPLOYED 💀 | Payphone (Radio Top Singers) (drop on the first hire) | ZyroVaneWasTaken, 827K at 821 subs |
| `pearl_clutch` | POV: You **Throw** an Ender Pearl But... + elytra countdown | misery. (drop on the teleport) | Henyofficial7 14M, Integer_XD 7.5M |
| `wrong_bucket` | POV: you grabbed the **wrong** bucket 💀 | FUNK ABNORMAL (drop on the death) | lava MLG fail, vanilla death screen |
| `one_in_a_million` | 1 in a million landing 😳 | misery. (drop on the splash) | 100-block drop into a 1x1 hole |
| `half_heart` | POV: you're on **half** a heart 💀 | misery. | water clutch at half a heart |
| `tries` | it took me 4 tries 💀 (~30 s, subtitles) | misery. (drop on the landing) | re:zero instant-respawn story |
| `speed_build` | Fastest house build 💀 + timer | FUNK ABNORMAL (drop on done) | RedW1ngs 36M |
| `nether_portal` | POV: your first **nether** portal 😳 | FUNK ABNORMAL (drop on lighting) | |
| `midas_touch` | POV: you got the **midas** touch 🤑 | FUNK ABNORMAL | everything looked at turns gold |
| `lava_rising` | the lava stopped **1 block** below me 😳 | misery. | pillar vs rising lava |
| `sand_tower` | the torch trick never gets old 😭 | | satisfying |
| `cave_reveal` | **never** dig straight down 💀 | misery. (drop on the reveal) | dig into a huge cavern |
| `dig_up` | **never** dig straight up 💀 | FUNK ABNORMAL | lava pocket, death screen |
| `anvil_rain` | minecraft but it rains **anvils** 💀 | FUNK ABNORMAL | death screen |
| `staring_villagers` | why are they all **staring** at me 💀 | FUNK ABNORMAL (drop on the turn) | crowd turns as one |
| `creeper_art`, `skull_art`, `sword_art`, `heart_art` | pixel-art reveals (`lib/pixel_art.js`) | | looks_wrong variants |
| `tnt` | POV: you lit **75** TNT 💀 | FUNK ABNORMAL (drop on the boom) | primed-TNT flash, chain explosion, crater |
| `creeper` | POV: you hear **tssss** 💀 | FUNK ABNORMAL (drop on the hiss) | real creeper AI, vanilla swell, death screen |
| `tnt_run` | POV: the floor is **TNT** 💀 | FUNK ABNORMAL | a TNT wave catches the bot |
| `every_clutch` | rating **every** MLG clutch 💀 (~15 s) | FUNK ABNORMAL | water / slime / hay / cobweb, rated |
| `fortune` | POV: fortune **1000** 💀 (~13 s) | FUNK ABNORMAL | ore fountains fill the hotbar |
| `tnt_scale` | 1 TNT vs 10 TNT vs **100** TNT 💀 (~15 s) | FUNK ABNORMAL | three escalating blasts |
| `drops` | 1 in a million landing... **x3** 😳 (~14 s) | misery. | 30 / 80 / 160 blocks, the last misses |
| `golem` | POV: you **hit** a villager 💀 | FUNK ABNORMAL | the iron golem launches you |
| `pearl_clutch` | (needs a redesign: QA couldn't read the stunt) | | |

## Music (decided 2026-11-06: only music that can't get the channel claimed)
Uploaded Shorts carry **NCS (NoCopyrightSounds) Brazilian phonk** with NCS's official credit in the
description. NCS's usage policy (https://ncs.io/usage-policy) lets independent creators use and
monetize its tracks on YouTube with no claim or strike, provided the credit is there.
- `python3 scripts/ncs.py` refreshes `music/ncs.json` (16 tracks, with the credit block copied
  verbatim from each track's ncs.io page) and downloads the mp3s to `songs/ncs/` (gitignored).
- `python3 scripts/add_song.py <name> --ncs` bakes the least-used track into the package. The drop
  lands on the stunt's `dropAt` event, and the description becomes caption + credit + hashtags.
  `publish.js` runs this for every package it makes. Packages without `short_nosong.mp4` get one
  made from `short.mp4`'s picture and `game_audio.flac`.
- The stunts' `edit.song` (FUNK ABNORMAL, misery., Payphone) is only a reference for the edit in
  `out/`; it never goes up. `youtube_upload.py` skips any package whose `song.licence` isn't NCS
  or original.
- Fallback that's fully ours: `add_song.py <name> --gen montagem|drift|slowed|funk` (synthesized
  phonk, `scripts/phonk.py`).
- Not allowed: Suno/Udio free tiers (non-commercial), MusicGen (non-commercial), any label song
  baked in. Details are in `research/free_music_2026-11-06.md`.
- If a claim ever appears on an NCS Short, check the credit matches `music/ncs.json` and dispute it.

Target length is 10-15 s, or 20-30 s for build-up stories, with the stunt visible in the first
second (`research/music_and_length_2026-11-06.md`).

## Process and QA (every Short, before publishing)
The loop is in `docs/process.md`: make, render, frame QA, independent review, classify each finding as engine or stunt, fix, re-render, publish, freshness check.
- `python3 scripts/qa_frames.py out/<name>.mp4` checks every frame and makes labelled sheets (`docs/qa.md`).
- An independent reviewer agent reads every sheet (`docs/reviewer_prompt.md`).
- Each fix adds a rule to `docs/lessons.md`.

## Uploading (automated)
`.github/workflows/upload.yml` uploads the next ready Short from the `videos` branch 3 times a day
(`scripts/youtube_upload.py`, YouTube Data API v3) with the package's title, description and
hashtags, and records it in `uploads.json` on that branch so nothing goes up twice.
One-time setup by the owner: reuse the existing Google Cloud project (YouTube Data API v3 already
enabled, OAuth client already made). If you don't already have a refresh token with the
`youtube.upload` scope *for the HelloBuh channel*, run `scripts/youtube_auth.py` on your own
computer and sign in as HelloBuh (a token is per channel). Save
`YT_CLIENT_ID`, `YT_CLIENT_SECRET` and `YT_REFRESH_TOKEN` as repo secrets. Optional repo
variables: `YT_AUDIO` (`song` = baked-in NCS track, `nosong`) and `YT_PRIVACY`.
- Uploads carry the baked-in NCS track (see Music). `YT_AUDIO=nosong` uploads game audio only.
- Quota (checked against the official docs 2026-11-06, developers.google.com/youtube/v3/determine_quota_cost):
  uploads have their own bucket, **100 `videos.insert` calls per day per Google Cloud project** at
  1 unit each. It's shared by every channel that uploads through the project (the owner's other
  channels use the same one: 9 uploads a day in total) and resets at midnight Pacific. `videos.update`
  and `thumbnails.set` cost 50 of the separate 10,000 general units. More quota: the YouTube API
  Services audit and quota extension form.
- Per the current `videos.insert` page, uploads from unverified projects are *not* restricted to
  private. The workflow defaults to private to be safe: set the repo variable `YT_PRIVACY=public`
  to publish directly.
- Packages with a metadata `status` other than `ready` (e.g. pearl_clutch) are skipped.

## Parallel workers
The orchestrator session spawns worker cloud sessions (Claude Code `create_session`) that each
build new formats end to end by following `docs/worker.md`. Workers only add `stunts/<name>.js`
and publish no-song packages. The orchestrator bakes the songs in with
`python3 scripts/add_song.py <name>` (songs/ only exists in the orchestrator's container).

Finished, reviewed Shorts live on the **`videos` branch**, one folder per Short with everything
that made it (video, metadata with title/description/hashtags/song credit, the bot recording,
game audio, stunt source, build log). Package one with `node scripts/publish.js <name>`.

A stunt exports `setup(ctx)` (build the set with commands, return its origin), `perform(ctx)`
(do the stunt with real player actions, return success) and `edit` (caption, colours, song,
which recorded event the song's drop lands on, countdown). `lib/harness.js` gives it helpers and
records everything. Titles still follow the channel's formula: lowercase reaction + "(do not check
the sound 💀💀)".
Needs Java 21, Node 22, Python 3 + Pillow + numpy, ffmpeg, and Playwright's Chromium.

## The format (from the channel, 2026-11-06)
- 72 Shorts, 553 subscribers. Most get 20–40K views; the best is "re:zero instant respawn" (`PdcbpRxYKlc`) at 191K.
- First-person Minecraft **Java** survival footage, HUD visible (hotbar, hearts, hunger, XP bar).
- **Layout** (measured on "afk firework save", 720x1280): black band 0–303, gameplay 303–977, black band 977–1280. Caption: white bold, centered, at y≈181, ~68% of the width; sometimes one word red ("I hate this **job** 😭").
- Sometimes an in-world green subtitle ("oh wow that was very close") and a meme image cut-in.
- Titles: short, lowercase, plus bait like "(do not check the sound 💀💀)" or "stop commenting your battery %".
- Mostly **staged stunts**: water-bucket and firework saves, lava tricks, end-portal "job", villagers, x-ray.
- Cover frames: `research/cover-frames.jpg`.

## Owner decisions
- 2026-11-06, **focus on mysteries**: "I think we should focus a lot of mysteries". Mystery/twist stories are the default story genre, with two story workers (5 and 8).
- 2026-11-06, **narrated Minecraft stories** ("like the roblox stories (blocky-stories) but with minecraft"), then the direction: "there have been stories that i've liked that are twists or mystery. like one of them was like why is this town disapearing and its cb they're waking up from a coma. and like another was like my 10th birthday over andover again but its actaully bc he has dementia and forgets. and another was like the mirror shows the state in 24 hours, nad he sees like burning in fire and tries to stop it. etc, i want the stories to be bursty and ridiculous like this with deep lore". Pilot by worker 5; format in `docs/stories.md`.
- 2026-11-06: **"close match is fine"**. HUD and sound don't have to be pixel-exact; a drawn HUD is OK.
- 2026-11-06: **"audio is just the game audio + whatever random viral song"**, and later the same day: **bake recognizable songs in** (the channel's top Shorts already do: their sound shows as "Original Sound"). Rules: keep every Short under 60 s (a Short over 1 min with any active Content ID claim is blocked); under 60 s a match follows the rights holder's policy, usually monetize/track, rarely block. A claim is not a strike. Songs are owner-supplied files in `songs/` (gitignored: never commit copyrighted audio). `edit.py --song FILE --song_start SEC` mixes it under the game sounds at -10 LUFS like the reference; without `--song` the game audio stays at -18 LUFS.
- Monetization note: on a Short that uses music, part of the revenue allocated to that Short goes to music licensing, so the creator gets roughly half on one-track Shorts. Shorts revenue per view is small either way; the trade is more reach vs. a smaller cut.
- 2026-11-06: **skip the real Minecraft client**; the prismarine-viewer render "looks decent enough". So no Microsoft login and no account token anywhere.
- 2026-11-06: this repo (`evanlin23/hello-buh`) is the channel's home. The earlier trial lives on `evanlin23/buh-explains` branch `claude/hellobuh-trial`.

## Pipeline
| step | file | what |
|---|---|---|
| fetch | `scripts/fetch.py` | vanilla 1.21.1 server jar, client jar (HUD sprites), asset index (sounds); sha1-pinned in `versions.env` |
| server | `run.sh`, `server.properties` | offline-mode server on 127.0.0.1, fresh superflat world each run |
| stunt | `bot.js` | Mineflayer bot builds the set with commands, does the stunt, records chunks + per-tick pose + block changes + sounds; exits 1 on a failed clutch so `run.sh` retries |
| assets | `renderer/build_assets.py`, `renderer/prepare.js` | texture atlas, block models and environment textures straight from the version's client jar |
| render | `render.js`, `renderer/` | meshes the recorded world in Node (block models vendored from prismarine-viewer, MIT, with vanilla face shading + AO), draws each frame in headless Chromium with three.js: vanilla FOV 70, sky + fog, fancy clouds, sun, view bobbing, underwater fog. Frame-exact 60 fps, ~20 s of render per video second on 4 CPUs |
| audio | `audio.py` | rebuilds the game sound from the recorded events and the game's own sound files |
| entities | `renderer/entities.js` | mobs from converted entity geometry (prismarine-viewer, MIT) with the jar's textures (villager = base + biome + profession), head tracking, walk cycle; pearls/items as sprites |
| icons | `renderer/icons.js` | 3D inventory icons for block items, rendered with our block mesher at the GUI angle |
| edit | `edit.py` | 1080x1920 layout, caption (Twemoji, per-word colours), HUD from the jar's sprites (3D block icons, stack counts in the game font), countdown overlay, song with its drop on a chosen event (~-10 LUFS like the references; game audio alone -18 LUFS) |

## Known gaps vs real HelloBuh frames
- Our renderer is a re-implementation, not the game: no particles, rain, animated textures, or first-person hand (HelloBuh crops the centre of a 16:9 window, so the hand is mostly out of frame anyway). Mobs: only those with a converted model; no armour/held items on mobs.
- HUD is drawn from the real sprites, not rendered: no level number text, static XP bar.
- The world is real: vanilla 1.21.11 server, real terrain (the set is built in the nearest forest), real physics.

See `docs/trial.md` for the trial report (speed, gaps, Actions costs), `docs/clutch-timing.md` for why the water clutch lands every time, and `research/formats.md` for what to make next.
