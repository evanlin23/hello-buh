# Trial report: can a bot make a HelloBuh Short with no human? (2026-11-06)

> **Update (same day): realism pass.** Per the owner ("make sure it's very realistic"), the
> prismarine-viewer bundle was replaced by our own renderer (`renderer/`). Textures, block
> models and environment art now come from the 1.21.11 client jar. It adds vanilla face shading
> and AO, sky, fog, fancy clouds, sun, view bobbing and underwater fog, with the set built in a
> real generated forest. Render ~20 s per video second; world upload 7–14 s. The sections below
> describe the first version where they differ.

**Verdict: go, with caveats.** Measured from scratch in this container (4 CPUs, no GPU): `./run.sh`
took **3 min 31 s** end to end, the clutch landed on the first attempt, and the output is 7.75 s,
1080x1920, 60 fps, audio at -18.2 LUFS (`docs/contact-sheet.jpg`).

 `./run.sh` makes a 1080x1920 60 fps water-bucket-clutch Short with
game audio, from nothing, with no human and no Minecraft account. The picture is a
"close match", not the real game (owner accepted that).

## What worked
- **Private server + bot.** Vanilla server on 127.0.0.1 in offline mode (local only; the bot is
  the only player). A Mineflayer bot builds the set with commands and performs the stunt.
  After the fixes in `clutch-timing.md`, the clutch landed 8 of 8 tries (it was about 1 in 5).
- **Recording without a client.** The bot records a chunk snapshot, its pose on every tick, every
  block change and the event timeline. That is all the renderer and the audio need.
- **Frame-exact 60 fps render.** `render.js` drives prismarine-viewer (three.js) in headless
  Chromium one frame at a time from the recording. Smoothness doesn't depend on CPU speed.
  **Speed: ~18 s of render per second of video** at 1080x1011 on 4 CPUs (SwiftShader, no GPU).
  A 9 s clip renders in ~2.8 min.
- **Edit.** Layout measured on a real HelloBuh Short (equal black bands, caption position and
  size). The HUD is drawn from the game's own sprites, the emoji comes from Twemoji, and the
  audio is normalized to -18 LUFS.
- **Audio.** The server doesn't send a player their own sounds, so `audio.py` plays them the
  way the client would. That covers footsteps, bucket empty and fill, and the high-speed splash,
  using the game's own sound files and their vanilla volume and pitch.

## What didn't (and why the route changed)
- **The real game client + ReplayMod** was the first plan. On 1.21.11, a Fabric server with
  ServerReplay recorded `.mcpr` replays fine. Rendering them needs the real client on the
  owner's Microsoft account, and the owner chose to skip that ("looks decent enough"). The code
  for that route (client fetcher, device-code login, ServerReplay setup) is on
  `evanlin23/buh-explains` branch `claude/hellobuh-trial`, under `hellobuh/trial/`.
- **Live capture** of prismarine-viewer (screenshots while the bot plays) gave ~13–25 uneven fps
  and starved the server of CPU, which made the clutch fail. It was replaced by the offline render.
- prismarine-viewer only understands Minecraft data up to 1.21.4, and its mesher skipped every
  face below y=0, so the world is 1.21.1 and the set floats at y=100 (`scripts/patch_deps.sh`
  also fixes the y=0 bug).

## Fidelity gaps vs real HelloBuh frames
| | HelloBuh | ours |
|---|---|---|
| look | real game: lighting, clouds, particles, held item and hand | prismarine: flat lighting, no clouds/particles/hand, some missing textures (pink specks), snow layers drawn as full blocks |
| HUD | real | drawn from the real sprites: hotbar, hearts, hunger, XP bar (no level number) |
| motion | human mouse | eased bot camera, 60 fps |
| sound | game + a meme song ("do not check the sound") | game sounds rebuilt for the stunt only (no ambience); the song is a manual upload step |
| caption | white bold, one word sometimes red | same (`--red WORD`) |

## Running it on GitHub Actions (`.github/workflows/render.yml`, manual trigger)
- **Minutes:** about 2 min of setup (Java, Node, Chromium, deps), 1 min for the server and
  stunt, ~3–4 min of render on a 4-vCPU runner, 10 s of edit. Roughly 7 min per Short, so a
  daily Short is about 210 min a month: free on a public repo, within the 2,000 free minutes
  on a private one.
- **Caching:** server jar, client jar, asset index, sounds and emoji go under `work/` (cached
  by the hash of `versions.env`), plus the npm cache.
- **Secrets:** none for rendering (no Minecraft account). Uploads will need the owner's YouTube
  OAuth token, following `evanlin23/blocky-stories` (`scripts/upload.py`,
  `docs/youtube-setup.md`, private upload with a scheduled publish). The clock is cron-job.org
  (`docs/external-cron.md` there).
- Not run on Actions yet; the workflow is untested.

## Open questions for the owner
1. The song: which meme song(s), and are you OK adding them by hand in YouTube Studio after the
   scheduled upload? The "(do not check the sound 💀💀)" title bait depends on it.
2. Which next formats to build (see `research/formats.md`): more clutches, "X is so hard 🙄",
   villager bits, "satisfying".
