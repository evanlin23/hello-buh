# hello-buh: automated Minecraft stunt Shorts for @HelloBuh

A bot plays a scripted stunt on a private local server, the stunt is rendered offline at 60 fps,
and the clip is edited into the channel's format. No human at the keyboard, no Minecraft account.

```bash
./run.sh          # -> out/water_clutch.mp4 (1080x1920, 60 fps)
```
Needs Java 21, Node 22, Python 3 + Pillow, ffmpeg, and Playwright's Chromium.

## The format (from the channel, 2026-11-06)
- 72 Shorts, 553 subscribers. Most get 20–40K views; the best is "re:zero instant respawn" (`PdcbpRxYKlc`) at 191K.
- First-person Minecraft **Java** survival footage, HUD visible (hotbar, hearts, hunger, XP bar).
- **Layout** (measured on "afk firework save", 720x1280): black band 0–303, gameplay 303–977, black band 977–1280. Caption: white bold, centered, at y≈181, ~68% of the width; sometimes one word red ("I hate this **job** 😭").
- Sometimes an in-world green subtitle ("oh wow that was very close") and a meme image cut-in.
- Titles: short, lowercase, plus bait like "(do not check the sound 💀💀)" or "stop commenting your battery %".
- Mostly **staged stunts**: water-bucket and firework saves, lava tricks, end-portal "job", villagers, x-ray.
- Cover frames: `research/cover-frames.jpg`.

## Owner decisions
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
| render | `render.js` | drives prismarine-viewer in headless Chromium **per frame** from the recording: frame-exact 60 fps, ~18 s of render per video second on 4 CPUs |
| audio | `audio.py` | rebuilds the game sound from the recorded events and the game's own sound files |
| edit | `edit.py` | 1080x1920 layout, caption (Twemoji for emoji), HUD drawn from the client jar's sprites, loudness -18 LUFS |

`scripts/patch_deps.sh` (runs on `npm install`) fixes two bugs in the pinned dependencies; see the comments there.

## Known gaps vs real HelloBuh frames
- Renderer is prismarine-viewer, not the game: flatter lighting, no clouds, some missing textures (pink specks), snow layers draw as full blocks, no hand/held item, no particles.
- HUD is drawn, not rendered: no level number text, static XP bar.
- Renderer only supports up to 1.21.4 data, so the server runs 1.21.1.

See `docs/trial.md` for the trial report (speed, gaps, Actions costs), `docs/clutch-timing.md` for why the water clutch lands every time, and `research/formats.md` for what to make next.
