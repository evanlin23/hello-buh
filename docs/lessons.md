# Lessons learned (2026-11-06)

Everything that cost real debugging time, so nobody has to rediscover it. Newest first within
each section.

## Owner preferences and format
- Owner decisions live in README "Owner decisions". Highlights: "close match is fine"; skip the
  real Minecraft client (no account/login anywhere); bake recognisable songs in (Shorts stay
  under 60 s); the owner dislikes "Help Me Win 😒" (wezokki).
- **Layout** (measured on real HelloBuh Shorts): equal black bands top and bottom (~23.7% each),
  gameplay 1080x1011 in the middle. That's a centre crop of a 16:9 game window, so the
  first-person hand is mostly out of frame.
- **Caption size:** reference text is ~62 px tall at 1080 wide (Inter ExtraBold 78), ~68% of the
  width. Long captions wrap to two lines at that size; they never shrink to a tiny single line.
- **Loudness:** reference Shorts are -10 to -16 LUFS with the song in. Our mix is ~-10.5 with a
  song, -18 for game sounds alone.
- **What works on the channel:** titles ending "(do not check the sound 💀💀)", question/reaction
  titles, the "job" running gag, and sarcastic boss captions. Plain stunt titles flop (<1.2K).
  See `research/formats.md`, `research/breakdowns.md` and `research/shorts_research_2026-11-05.md`.
- **Songs:** 118/120 top Minecraft Shorts show "Original Sound" (the song is baked in), so song
  names can't be scraped; they came from the research agent's sound-page counts. We never rip
  audio; the owner supplies files into `songs/` (gitignored).

## Bot (mineflayer 4.39 on vanilla 1.21.11)
- **1.21.11 renamed every game rule** to snake_case ids: `advance_time`, `advance_weather`,
  `send_command_feedback`, `spawn_mobs`, `immediate_respawn`, `keep_inventory`,
  `natural_health_regeneration`, `fire_spread_radius_around_player` (instead of `doFireTick`).
  The old names fail silently. The harness now logs `COMMAND ERROR:` for any error the server
  returns, so check the logs for it.
- `physicsTick` fires **before** mineflayer sends that tick's position. An action sent from
  the handler is checked against the previous position (2.3 blocks off when falling), so defer
  it with `process.nextTick`.
- `bot.elytraFly()` sends `start_elytra_flying`; 1.21.11 calls it `start_fall_flying` and the
  server kicks you ("Failed to decode packet player_command"). Send the packet yourself.
- `bot.placeBlock()` snaps the camera; for natural footage send `block_place` yourself and drive
  the camera with eased looks (the server checks reach, not where you look).
  `/attribute @s minecraft:block_interaction_range base set N` lets the bot build from far enough
  back to frame the shot (invisible on screen).
- Villagers: `/data merge` a profession onto an unclaimed level-1 villager and its AI reverts it
  next tick unless it has `Xp:1`. Peaceful difficulty removes hostile mobs (zombies).
- Teleports can be undone by a stale move packet: check the position stuck (`ctx.tpCheck`).
- `/fill` is capped at 32,768 blocks and fails **silently** in a bot's view. Clear big volumes
  in slabs.
- Water flows toward any drop within 4 blocks: keep the landing pad edge far from the landing.
- MLG water timing: see `docs/clutch-timing.md` (snow-cap phase trick).
- Ender pearls inherit the thrower's velocity; aim by simulating vanilla flight (1.5 b/t, drag
  0.99, gravity 0.03). An elytra loses 1 durability per second of flight and stops at 1 left,
  so `elytra[damage=431-N]` gives about N seconds of glide.
- A stunt's camera choices matter as much as the stunt: a target directly below fills the screen
  with one texture. Place things so the key object stays in frame.

## Renderer (our own; `renderer/`)
- **Death, as vanilla shows it** (owner: "the death is kinda odd and delayed"): the camera does
  NOT drop or keel over. Pose.DYING keeps eye height 1.62; `GameRenderer.bobHurt` rolls the view
  by `40 - 8000/(deathTime+200)` degrees (0 to 3.6 over 20 ticks). Each hit rolls
  `-sin(h^4 pi) * 14` degrees with h = hurtTime/10. The body keeps falling or sinking (lava:
  velocity x(0.5, 0.8, 0.5), gravity 0.02) until the respawn. mineflayer teleports the bot to the
  respawn point on the death tick, so render.js simulates the body from the death pose.
- **Death screen** opens on the death tick (no delay): the death message at y 85, "Score" at y
  100, and buttons greyed out for 20 ticks. The HUD stays drawn under it with empty, shaking hearts.
  mineflayer reports the respawn health (20) on the death tick, so force health 0 until `respawn`.
- **Hearts** (`Gui.renderHearts`): a health drop blinks the row for 20 ticks, alternating every 3
  (white = health just lost, kept for 1 s). Health <= 4 shakes each heart by 0-1 px, using
  java.util.Random seeded with tick*312871. edit.py renders the HUD per tick through an ffconcat
  list.
- Hurt sounds come from the `damage_event` packet (damage type → `data/minecraft/damage_type/*.json`
  `effects` → hurt / hurt_on_fire / hurt_drown...). The killing hit plays `entity.player.death`
  instead. Don't hand-place hurt sounds in stunts.
- Visible lines across the ground were **atlas padding spilling into neighbour tiles**. With
  alpha test, sampling a neighbour's transparent texels punched 1 px holes. Build each padded
  cell on its own. To find holes, render with `DEBUG_MAGENTA=1`.
- Some lines were **tearing**: wait two animation frames after drawing before each screenshot.
- Don't trust light from the bot: chunks arrive unlit and relights after `/fill` are missed.
  `light.js` recomputes sky and block light with vanilla's propagation rules (0.5 s).
- Mesh down to the lowest visible surface (ocean floors). A fixed cutoff showed the sky through
  the water.
- Kelp, seagrass and waterlogged blocks contain water: render water in them, and no water walls
  against them. Use vanilla's weighted corner-height averaging for fluids.
- Colour management off: Minecraft multiplies texture × tint × shade in sRGB. three.js
  colour management washes out the grass.
- Biome colours: colormap by temperature and downfall×temperature, dark_forest/swamp modifiers,
  fixed spruce/birch/mangrove leaves, 5×5 blend. All data is in the client jar
  (`data/minecraft/worldgen/biome/*.json`, `textures/colormap`).
- Pushing meshes to the page as JSON took 85 s; binary typed arrays fetched over HTTP take 7 s.
- three.js `CanvasTexture` defaults to `flipY=true`: entity skins came out scrambled until set to false.
- Converted entity models lack some vanilla rest poses and layers: villager arms rest at
  xRot 0.75 (crossed in front), and villagers have a hat layer at uv (32,0) inflated 0.5.
  Check every new mob from the side (`CAM=` debug camera).
- Entity data is numeric registry IDs (villager type and profession). Map them with the vanilla
  server's data report (`--reports`).
- Inventory icons: items whose `assets/minecraft/items/<name>.json` points at `block/...` get a
  3D icon (GUI rotation 30/225, scale 0.625), drawn with the default plains tint.

## Pipeline / ops
- **Finished Shorts live on the `videos` branch** (worktree at `../hb-videos`), one package per
  Short with everything that made it, plus metadata (see that branch's README). After reviewing a
  Short: `node scripts/publish.js <name>`. `out/` and `work/` stay gitignored on main.
- mineflayer auto-respawns on the death tick by default (`respawn: true`), so every death lasted 0
  ticks. The harness uses `respawn: false`: it respawns at once only when the server says
  doImmediateRespawn (game_state_change `immediate_respawn`), otherwise a stunt calls `ctx.respawn()`.
  mineflayer's physicsTick stops while dead; the harness ticks on its own so recording and
  `waitForTicks` continue. A retry can log in as the dead player, so respawn it at login.
- Particle light: light is computed before the stunt's block changes, so use the brightest of the
  cell and its six neighbours (crumbs of a broken block came out black).
- Writing to the server console FIFO blocks forever if the server is gone: always `timeout`.
- YouTube search pages (not downloads) are readable from the cloud: `research/yt_survey.py`
  gets view counts without an API key.
- The GitHub Actions workflow (`.github/workflows/render.yml`) is manual and has not been run
  yet. Expect about 7 to 8 minutes per Short on a 4-vCPU runner.
- Never edit `run.sh` (or any bash script) while it is running: bash reads scripts incrementally and the running copy breaks mid-file.
