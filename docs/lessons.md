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
- **Deaths**: mineflayer's default `respawn: true` ended every death on the same tick (the death
  screen never showed). The harness uses `respawn: false`, respawns at once only with
  `immediate_respawn` (the stunt also sets `ctx.immediateRespawn = true`), and ticks on its own
  while dead. The `respawn` mark has its own flag: a stunt's `revive()` can come before
  mineflayer's spawn event, and the death camera then held across two attempts.
- A purposely failed clutch must stop at the impact. The ground can register a tick before the
  death does, and the clutch's "look up the pillar" ending then played after the respawn.
- Command-block timing is unreliable (it started ticking seconds late). For per-tick commands the
  bot sends them itself: ops aren't chat-rate-limited.
- TNT and explosions next to an ocean flood the crater, and knockback can push the bot in: fill
  deep solid ground under the set.
- Stray item drops from the set-up get picked up mid-stunt (mystery hotbar stacks): the harness
  kills item entities before recording.
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
- **Frames are read from the WebGL buffer** (`canvas.toDataURL`), not `page.screenshot`: on a busy machine the compositor screenshot sometimes returned the previous frame, and walks juddered with repeated ticks. `SCREENSHOT=1` brings back the old capture. Also: a teleport adds no walk distance to the view bob (cuts used to sway the frame for a few ticks).
- **Item models come from `items/<name>.json`** (1.21.4+). Many block items (lectern) have no `models/item/<name>.json`, and guessing that path gave them the flat-item transform. **Block outlines use outline shapes**: fences, walls and gates are 1 tall (collision 1.5); crops, plants and torches are targeted and outlined even though you walk through them.
- **Enchantment glint** (worker 11): hotbar entries `[name, count, 1]` are enchanted (the harness checks the stack's enchantments), and dropped items carry `extra.glint`. Items that always shine (enchanted golden apple, XP bottle, nether star, enchanted book...) glint by name. The page adds RenderType.glint as glint² (SRC_COLOR, ONE) with GLINT_TEXTURING's scrolled, 10°-rotated uv, faded by fog. Load the glint texture at init: a texture still loading when a frame is drawn samples black, so the glint silently vanished on single-frame renders. Item sprites now follow the item model's layer0 when the name has no png (enchanted_golden_apple -> golden_apple).
- **Weather** (worker 11): a stunt sets `weather: 'rain'` or `'thunder'` (the harness runs `/weather`, records `rec.weather`, logs vanilla's rain sounds), or calls `ctx.setWeather(w)` mid-stunt (the level fades 0.01 a tick like ClientLevel). `WEATHER=` overrides at render time. The renderer draws WeatherEffectRenderer's columns (rain.png, 10-block radius, from the MOTION_BLOCKING heightmap, particle.fsh's alpha < 0.1 discard), snow in cold biomes, splash particles (100 x rain^2 a tick), the darker lightmap (getSkyDarken x (1 - rain x 5/16)), and the greyer sky, fog and clouds. The sun, moon and stars fade by 1 - rain.
- **Sunrise/sunset glow**: SkyRenderer's triangle fan surrounds the camera, and its centre lies in the camera plane when you look sideways. swiftshader then smeared the centre colour over half the screen (a hard orange edge looking north at dawn). Cutting each triangle into radial strips draws the same surface correctly. If one big triangle shows a single flat colour, check whether a vertex is at w≈0.
- **Third-person player** (worker 11): any `CAM=` override (or `SHOW_PLAYER=1`) draws the bot as wide Steve (`SKIN=alex` etc. for the other default skins) and drops the first-person hand. `CAM=back[:dist]` / `CAM=front[:dist]` are vanilla's two F5 views (4 blocks, pulled in out of walls); `CAM=dx,dy,dz,yaw,pitch` is a fixed camera. The model is built in Java model space (PlayerRenderer: Ry(180-bodyYaw), S(-1,-1,1), scale 0.9375, T(0,-1.501,0)) so HumanoidModel.setupAnim, the attack swing, ArmPose.ITEM and ItemInHandLayer + the item's `thirdperson_righthand` display (read from the jar's model parents) apply as written. The body yaw follows LivingEntity.tickHeadTurn (0.3 toward the walk direction, at most 50° from the head). Hurt = red overlay (mix 0.302), death = Rz flip to 90° and gone at deathTime 20. The Bedrock-geometry mobs were drawn x-mirrored (Bedrock x used as world x) until entities.js mirrored the model group (and negated the head yaw inside it).
- **Lava is opaque** in vanilla (solid render type). In the translucent pass with depthWrite off, a
  lava top face under stone (lit 0, so black) painted over nearer lava: the black square seen
  from below. Lava goes in the opaque pass, and fluid faces against a full opaque block are culled
  (`isFaceOccludedByNeighbor`).
- **Big block changes need a relight** (explosion craters stayed black): when 24 or more blocks
  change in one frame, render.js recomputes light (~1 s) and re-meshes the sections around the
  change. Small changes use the neighbour-light fallback in `world.getLight`.
- **Falling blocks**: the server sends their position about once a second (they hovered, then
  jumped). render.js simulates the fall from where each appeared (gravity 0.04, drag 0.98, stops
  on solid blocks).
- **Mob rotation from /tp** reaches mineflayer's entity yaw seconds late. Stunts that turn mobs by
  command mark `face_on`/`face_off`, and the renderer faces them at the camera between the marks.
- **First-person held item** follows vanilla ItemInHandRenderer: (0.56, -0.52, -0.72), block
  display 45° at 0.4 scale, flat items with the `generated` firstperson transform, a 6-tick swing,
  a 3-tick equip. In our crop of the 16:9 window it only shows partly at the bottom right. That
  is correct: reviewers called the swing "a stick across the screen", but it is vanilla's.
- Dropped block items are quarter-size spinning blocks (ItemEntityRenderer). Primed TNT flashes
  white every 5 ticks and swells over the last 10. Creeper swell comes from the explosion time.
- Explosion particles: explosion_emitter (6 huge sprites a tick for 8 ticks), full bright.
- Nether portal is translucent, with ambient portal particles from the stunt.
- Lava fog when the eye is in lava: 0.25 to 1.0 blocks. The fire overlay draws *under* the HUD.
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
- **One batch at a time.** Two runs fight over the server port ("FAILED TO BIND TO PORT", "server
  did not start") and every later run fails. Don't chain queued `run_all.sh` waiters (they
  overlapped when the same stunt was queued twice). Run one `STUNTS="a b c" ./scripts/run_all.sh`
  and start the next only after it ends. TODO: a lock in run.sh (edit it only when nothing is running).
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

## 2026-11-06 (worker reports + frame QA)
- **Teleports are cuts.** If the pose moves more than 4 blocks in one tick, the camera and the entities snap to the new spot. Blending them showed 2 frames of empty field halfway between the two spots.
- **`face_on` can name its mobs:** `ctx.mark('face_on', { near: [x, z, r] })` or `{ ids: [...] }`. Without either, every villager turns, which is how older recordings behave.
- **Bedrock `bind_pose_rotation` turns only that bone's own cubes,** never its children. Pig, cow and sheep bodies lie flat while their legs and head stay upright.
- **Sheep:** the base uses the `sheared` geometry with `sheep.png`. The wool layer uses the `default` geometry with its UVs shifted 32 rows up, textured with `sheep_wool.png` and tinted with the dye colour × 0.75 (white × 0.9). A sheep named jeb_ blends through all 16 colours, 25 ticks each. The harness records the colour, sheared, baby and jeb.
- **Water meets lava** gives the `smoke` particle (large_smoke, big_smoke_0..11). Never use `explosion` for steam: it draws white rings.
- **Falling things need the camera on them for the whole fall.** Anvils dropped 3-10 blocks away start outside the 35° half-FOV and seem to pop onto the ground. Drop them 9-15 blocks out and pitch the camera up.
- **Mob walk animation runs per game tick, not per frame** (WalkAnimationState). Quadrupeds swing `leg0`-`leg3` in diagonal pairs. Positions ease over 3 ticks like `Entity.lerpTo`. Mobs are kept 0.85 blocks from the camera.
- **`ctx.tpCheck` with whole-number x/z:** vanilla `/tp` centres those on the block (+0.5), so the check compares against the centred value.
- **One batch at a time, really:** a helper started a run while a batch was going. Its server died and orphaned another server, and every later stunt failed with "FAILED TO BIND TO PORT". Before any run, check `ps` for `server.jar`.
- **Falling blocks are simulated per frame,** including the fraction of the next tick. Whole ticks only made sand hang for 3 frames and then jump.
- **Captions can put emoji next to each other** ("⛏️💀"): edit.py splits them, since Twemoji has one file per emoji.
- **Crumbs in a hole dug into a wall** found no lit neighbour and drew black. They now take the brightest light within 2 blocks, minus the distance.
- **mineflayer `bot.dig` throws "enchantments is not iterable" with an enchanted tool on 1.21.11.** Send the start-digging packet yourself, as pickaxe_race does.
- **Clear a big area around a crater:** tnt's crater reached the ocean beyond a 41-block field and flooded with seagrass. The field is now 61 x 81, with 14 blocks of dirt underneath.
- **Never leave a shot frozen.** Waiting for a fuse needs small glances, and endings need a slow drift: the reviewer read 1.2 s without motion as a stuck bot.
- **Overlay windows are half-open,** `gte(t,a)*lt(t,b)`, never `between()`, which includes both ends. The death screen's two images overlapped for one frame at the 1 s mark and showed a doubled red flash.
- **A falling block that reaches the camera isn't drawn** (vanilla culls its inside faces). Otherwise the screen shows a few frames of the block's dark underside.
- **A render that started before an engine fix doesn't have it.** Check the frame mtimes against the fix commit time before blaming the fix. anvil_rain at 17:32 predated the 17:36 smoothing fix.
- **anvil_rain:** keep the rain falling through the finale and keep the bot moving (side-steps and glances). An empty sky before the last anvil read as staged, and 1.75 s of standing still read as a frozen video.
- **Dropped items at the camera are hidden.** A death scatters the inventory from the eyes, and with 3-tick easing the item textures filled the death screen for 0.7 s.
- **A "wrong bucket" death has to be a lava death.** From 60 blocks the fall itself killed the bot ("doomed to fall") and the lava was on screen for one frame. From 21 blocks the landing leaves 2 HP and the lava kills. Any stunt's punchline has to be what actually kills it: check the death message.
- **The held item mostly sits off the right edge** in our near-square game view, because vanilla hand placement assumes 16:9. The reference Shorts crop 16:9 the same way, so it's expected. Don't build a joke that depends on seeing the held item.
- **First passes under the new process** (2026-11-06): nether_portal (orchestrator) and speed_build (worker 2). Engine nitpicks reviewers raised that are still open:
  - there's no equip animation when the held item changes (the old item should lower and the new one rise);
  - portal particles rise in a column above the frame instead of drifting over the portal face;
  - a standing bot gets no idle hand sway, so even short waits look frozen.
- **Translucent quads are one-sided (outward), like vanilla.** The only exception is a water top surface, which also gets its back face so it shows from underwater. Both windings everywhere made a lone water block show its inside walls from above, like a glass box.
- **Landing splashes spread wide** (count ≥ 30 → 2.6 blocks). The eye sits right above the splash, and particles within 1 block of it are culled.
- **Clutch openings look straight down the pillar** (pitch -1.35). At -0.6 from 60 blocks up, the first second was ocean horizon, and nobody could tell you were on a pillar.
- **A reviewer's "physics" finding can be a camera finding.** The half_heart "hover above the water" was the bot already landed (the recording shows y=70 from the next tick) with the eye 1.6 above the water. The real problem was what the water looked like. Check the recording before changing physics.
- **Equip animation is simulated per tick** (ItemInHandRenderer.tick). The height moves at most 0.4 a tick toward 1 (shown = wanted) or 0, and the item swaps under 0.1, so the old item lowers and then the new one rises. Before this, the old item vanished and the hand sat empty for about 6 frames on every slot switch (found by worker 2 on speed_build and creeper_art).
- **Relight after every block change** (batched: at once for 24+ changes, otherwise at most every 4 ticks, around the changed area). Before, only 24+ changes in one frame relit: a dug shaft stayed pitch black, lava placed during a stunt lit nothing, and break crumbs looked like black cracks.
- **A fluid with the same fluid above has every corner at full height** (vanilla). Averaging with the air beside the column left a dark seam at each block of a lavafall or waterfall.
- **Brightness is a stunt option:** `brightness: 1` is Options > Brightness: Bright (default 0.5; `BRIGHTNESS=` overrides it). Use it for caves. At the default, an ore-filled cavern lit only by lava read as black walls.
- **Identical neighbouring frames on water or lava are vanilla.** Fluid textures change every 2 ticks (6 video frames). Don't "fix" them.
- **Forced facing (face_on) eases in** over 3 ticks for the body and 2 for the head, like Entity.lerpTo. A whole crowd flipping 180° in one frame read as a glitch (found by worker 2 on staring_villagers).
- **lava_rising redesign (frame review):** the lava popped in over the whole plain 2 s in, the pillaring happened with the camera on the horizon (no block ever seen under the feet), and the lava stopped level with the top block. Now:
  - the bot starts on a 2-high pillar already in lava;
  - it pillars looking down the column (pitch -1.3);
  - the lava rises a layer every 0.7 s and stops one cobblestone face below the top block;
  - it ends on that downward view, drifting.
- **General rule: show the mechanic.** If the caption is about a block, the gap or the placement has to be on screen. Pitch the camera at it.
- **Portal particles of a lit portal** spawn on the portal face (`face: true`) and drift just off it. Passing a point plus the pearl-landing column offset pushed them up to 2 blocks above the frame.
- **Enchanted tools on 1.21.11:** `Item#enchants` is patched in the harness to always return `[{ name, lvl }]`, since the component isn't a plain list. That fixes `bot.dig` / `digTime` throwing "enchantments is not iterable".
- **pearl_clutch redesign:** the breaking-elytra glide buried the joke. It's now a block vanishing over a lava lake, a look down at the lava, a look up at the island, the pearl mid-fall and the teleport.
- **The held item as a sliver at the right edge is deliberate.** The reference Shorts are centre crops of 16:9 footage, where the hand sits at the edge of the crop. Reviewers flag it every time: treat it as a nitpick, not a bug.
- **Block outline and crack overlay** (found by worker 2 on dig_up). The black outline is drawn on the block under the crosshair within 4.5 blocks, at alpha 0.4, using the block's shape. While digging, destroy_stage_(floor(progress·10)−1) is drawn over the block with DST×SRC×2 blending plus an alpha test; without the alpha test the transparent pixels turned the block white. The harness records digs from every `block_dig` packet (`dig` and `dig_end` marks with the dig time), so both `bot.dig` and raw-packet digs get cracks. Recordings made before this have the outline but no cracks.
- **`face_on` with `head: true`** turns only the head (LookAtPlayerGoal). A villager that never looked at the player read as frozen.
- **villager_job:** the lectern goes beside the pen, since in front its slanted top hid the outfit change. Trim the still start and end with `endAfter`. Angry particles when a villager loses its job site are vanilla; keep them.
- **End portal and end gateway surfaces** have no block model (vanilla draws them with TheEndPortalRenderer). The mesher emits a plane at 0.75 (gateway: 1.0), and the page draws it with a screen-space starfield shader: 15 layers of end_portal.png, rotated, scaled and drifting, with the vanilla shader's colour table.
- **Boats (all woods), cows and chickens render.** The converted chicken model lost its body's 90° turn, so it's restored as a rest pose.
- **Peaceful difficulty does no TNT damage** (the explosion damage type scales with difficulty; fall damage doesn't). Any stunt where a blast should hurt or kill needs `/difficulty normal` (found by worker 3: tnt_run's bot was flung to y≈110 unharmed).
- **Dropped items move smoothly between server syncs.** The server sends an item's position about every 20 ticks, so the recording froze each item and then jumped it. The renderer now eases between synced positions, with an arc when the item comes down.
- **Cross-session messages can arrive over an hour late.** Workers must `git pull` before every render anyway; never rely on a message to deliver an engine fix.
- **Back away from danger facing it**, never sprint away facing elsewhere (tnt: the TNT was off screen for 1.7 s of a 4 s fuse). Glances need ±0.25–0.35 rad to read; ±0.08 looked like a locked camera. "Look into the crater" needs pitch around -0.9 from the rim.
- **A swelling creeper stands still**, because SwellGoal stops its navigation, so the limb swing settles. It's also hidden from the tick it explodes, since the entity's removal reaches the recording a tick or two later.
- **The hook for sound-led formats** ("you hear tssss"): show the threat early with a glance over the shoulder, then go back to work. Opening on 1.5 s of building with nothing coming read as no hook.
- **Check the run's exit code before QA.** A failed stunt leaves the old out/<name>.mp4 in place, and the chain re-QA'd the stale video (anvil_rain). Chain scripts only run qa_frames when run.sh exits 0. Also: an anvil does 2 HP a block by default (FallHurtAmount), so a short drop doesn't kill.
- **Run `node --check` on every file you edit** (`for f in stunts/*.js lib/*.js render.js renderer/*.js scripts/*.js; do node --check $f || echo BROKEN $f; done`). A trailing comment swallowed a closing brace in water_clutch.js (18:05–19:20), and every clutch stunt failed 5/5 until the run logs were read. Shell-script edits skipped the check.
- **The held item is placed for our frame:** x = 0.56 × min(1, aspect ÷ 16:9), the same fraction of the half-width as vanilla in 16:9. Unscaled, tools and torches were a sliver at the edge, and every review flagged it. This replaces the earlier "sliver is deliberate" note.
- **Swings follow LivingEntity.swing:** a new swing restarts only once the current one is at least half done, at 3 of 6 ticks. Swinging every tick while placing strobed the hand (worker 2).
- **Pixel art reveal:** the finished picture held still for about 1.5 s. Now the camera pulls back as the last block lands and the Short ends 1.0 s after completion (owner 2026-11-06).
- **Bare arm when the hand is empty** (ItemInHandRenderer.renderPlayerArm, wide Steve skin, PlayerModel.rightArm). PoseStack translations are in blocks; model geometry is in pixels and y-down, so the skin's sleeve rows go on the shoulder end, and the texture loads with flipY off. Empty slots used to show no hand at all. Needed for "every tool vs one ore" (the fist beat).
- **Every death gets its own death screen** (`--death_screen`). It runs from that death to the next respawn, with the death message nearest that death. Before, only the first death was drawn, which multi-death formats (rated deaths, tries) need.
- **Particle culling near the eye depends on size:** small particles (splash drops, crumbs) are culled only within 0.25 blocks, big sprites within 1 block. A 1-block cull for everything removed a splash right under the eye.
- **Clutch openings keep pitch -1.45 through the jump.** At -1.0 the pillar under the feet was out of shot, and the review read "high up" but not "on a pillar".
- **Vehicles are never pushed away from the camera.** The mob push-out (0.85 blocks) shoved a boat the camera was riding sideways, and its wall filled the screen (worker 4). Note: mineflayer 4.39 never clears `bot.vehicle` on dismount and pauses physicsTick while mounted; boat_clutch works around both.
- **Check the light values before "fixing" dark lighting:** dump `world.getLight` around the source (cave_reveal: the air next to the lava was 14, so the engine was right). Vanilla light 0 is near-black even on Bright, so a cave needs enough light sources in the set (lava pits spread to the walls), and the camera should end on the lit part.
- **Fast slot switching keeps the hand down, and that is vanilla.** The equip height moves at most 0.4 a tick, so a full lower plus raise takes about 6 ticks (0.3 s). Switching every 2 ticks leaves the height oscillating 0 ↔ 0.4, i.e. the item sits at the bottom edge and never rises (verified against ItemInHandRenderer.tick). The fix belongs in the stunt: group placements by material so switches are rare. A known limitation: we track the held item by name only, so switching between two stacks of the same item never dips, where vanilla dips when the stacks differ.
- **Check the recording before blaming the renderer.** Three water "bugs" in water_vs_lava were all faithful: the checkerboard drain is in the recorded block changes (each tick's changes sit on one (x+z) parity, because vanilla's fluid tick propagates one ring per update); water hiding obsidian is the real 180/255 texture alpha; and the flowing fronts come from correct levels 3-7 (heights 5/9 down to 1/9). Dump `rec.blocks` by tick, and the block properties through the mesher, before changing anything.
- **Pixel art pull-back starts on the completing tick**, with the result check after it. A 6-tick wait before the move left a 0.6 s dead hold (worker 2). Clocks with a fractional or sub-second target keep their hundredths when done ("0:00.50", not "0:00").
- **You can't see your own pillar's sides from first person.** Standing in the middle of a 1x1 column, its side faces point away from the eye. lava_rising's "1 block below" gap existed in the recording (lava y72, top block y73) but never showed. To show it: sneak to the edge (prismarine-physics does vanilla sneak edge protection, and lava has no collision box) and look down past it. Pillar at about 60° down, not 75°.
- **Reviewers also report vanilla as bugs:** "no player arm while holding a block" (vanilla draws only the item), and "the held block looks big" (our near-square view makes the same angular size a larger share of the width). Check against vanilla before acting.

## Story Shorts (worker 5, 2026-11-06; the format is in docs/stories.md)
- **A cut has to carry its aim.** Put yaw/pitch in the `/tp` itself and don't `bot.look` until it lands. Aiming after the teleport showed the new place at the old angle and then a snap. Looking before it lands turned the old shot for a tick (the renderer eases yaw between ticks), giving 2-3 frames spinning through other scenes, which spoiled later ones (story_runaway frames 159, 294, 495, 651, 951).
- **A mob that hasn't moved for a long time reaches the client ~1 s late** once it starts moving, and then jumps there: 19-51 ticks with no position updates, then 5-14 blocks at once. A few ticks of tiny moves first (a lean-in) bring it down to 1-2 ticks. Pre-roll any motion that has to start on a word.
- **Never park the camera inside a group of mobs.** In story_runaway the party camera walked into the ring, and those villagers' updates froze until they were 15 blocks away.
- **`execute as <mob> run tp ...` every tick broadcasts "[Mob: Teleported ...]" to ops**, the bot included (7 mobs = 140 chat packets a second). Set `/gamerule log_admin_commands false`.
- **mineflayer doesn't move passengers:** a villager riding a boat stays where he mounted. Teleport boat and "passenger" side by side.
- **Boats draw ~1.1 blocks above their entity y** (converted geometry: hull bottom at +1.0, sides to +1.7). Workaround: a NoGravity boat at water level minus 1.1, teleported every tick (a submerged boat floats up even with NoGravity). Reported to the orchestrator.
- **Chickens render in pieces** (body, wings and head apart). Use sheep, pigs or cows until it's fixed. Reported.
- **A house lit by one hanging lantern renders its inside black** through an open door. Put glowstone in the ceiling.
- **Single-pass `loudnorm` lands ~2 dB short** on a narrated mix (-16.4 for a -14 target). `story_track.master_gain` measures and corrects (gain, then a -1.5 dBTP limiter, repeated until it lands within 0.3 dB).
- **Captions switch on the cut,** not on the first word. The old line held 0.17 s over the new scene and read as lagging.
- **A still death screen is a still shot.** Bring something on screen: the villagers creep back to look at the crater.
- **A dead player can't be targeted** by `facing entity <name>`. Use where they stood.
- **Mob updates stop reaching a dead player ~0.9 s after the death** (the server stops tracking for it after the death animation). The recording loses every mob and item then, even with the camera at the crater, so they pop out behind the death screen (reported to the engine: hold the last rows until the respawn). Don't stage mob motion behind a long death screen; use particles (smoke, happy).
- **`/fill ... hollow` from y1 makes a room with one air layer** (a plank floor at y1, the ceiling at y3). Villagers "inside" stood in planks and drew black. Fill the shell from y0 to the ceiling, then the floor.
- **mineflayer ignores the `chunk_biomes` packet,** so a `/fillbiome` never reaches the recording. Teleport ~600 blocks away and back after it so the chunks come again. `/fillbiome` is capped like `/fill` but counts whole biome cells: an 81x81 slab two blocks thick was refused as 32,805. `lib/story.js` `plainsBiome` fills 3x3 tiles, 4 rows at a time.
- **`/spawnpoint` takes whole numbers** ("Invalid integer '400.35'").
- **Don't run a bot while a render is going.** The render takes all 4 CPUs, chunk loading stalls, and mineflayer times out ("Timeout waiting for 3 ticks"). Record first, then render (`work/chain_*.sh`: one sequential batch).
- **Clear story sets to r 64, not 40.** The clearing cuts natural hills at its edge; at r 40 one stood behind the party as a flat-sided dirt tower (`lib/story.js` `clearSet`).
- **Hide a reveal's cast until its scene.** Mom (a creeper) stood at her spot from the start and showed behind a house in the door scene, giving away the twist. Bury them under their spot and teleport them up a scene early (warm them so the first move isn't late).
- **Story captions snap to the camera cut** (`story_track` finds the pose jump within 4 ticks before each `line` mark); the mark itself lands 1-2 ticks after the cut.
- **Throw a pearl early in a fall.** The pearl inherits the player's velocity, so about 20 ticks into a fall (-1.3 blocks/tick) it dives short of the target (pearl_clutch: aim error 17–21 blocks, failed 5/5). Throw within about 10 ticks, and check feasibility with `simulate()` before rendering.
- **Boats sit at the entity's feet:** the Bedrock boat geometry puts its hull bottom 15 px up, so the model is shifted down 1 block (worker 5: a villager "hung under" the hull). Chickens rendered in pieces until 55b5e50 (cube pivot fix); they're fine now. Sheep, cows and pigs are fine.

## Engine, round 3 (orchestrator)
- **Check vanilla shaders straight from the jar.** `unzip -p work/client/1.21.11.jar assets/minecraft/shaders/core/<name>.fsh` gives the exact maths. Our lightmap had been a guess (one grey scalar); the real one keeps sky and block light apart and makes block light warm.
- **Scale every part of a transform you rescale.** HAND_X moved the held item's rest position inward but not the swing's sideways lunge, so placements ballooned to the centre of the view.
- **Items are 1 pixel thick** (ItemModelGenerator). A flat plane goes edge-on mid-swing and vanishes.
- **Bedrock cube rotation without a pivot turns about the cube's centre.** The chicken was the only model that used it, and it rendered broken until this was fixed.
- **Test entity models with a hand-made recording**: copy any .rec.json, inject entity rows at t=0..5 in front of the camera, and render with `ONLY=1`.
- **A trailing `//` comment can swallow code on the same line.** It happened twice: water_clutch's brace, and page.js's fog `else` chain, which left underwater fog dead and lava fog stuck on from 15:26 onward. Never put code after a `//` comment on one line; `node --check` doesn't catch this.
- **One death = one death window.** Duplicate death marks and an instant "respawn" mark split the window, and the death screen blinked off for 2 frames (dig_up). `edit.py death_windows()` and render.js now merge them the same way, and the screen starts 1 frame early to cover rounding in the frame start. The hotbar empties on death (the inventory drops).
- **Licences cover hosting, not just use.** The repo is public, so committing licensed assets is redistribution. Mixkit SFX allow use in videos but not standalone redistribution, so the audio is fetched with `scripts/fetch_sfx.py` and gitignored. CC0 (Kenney) can be committed. Check a licence's redistribution clause before committing any third-party asset.
- **Time-lapse edits (`edit.speed`, scripts/timewarp.py):** pick source frames with `Warp.frame` (floor). After a 2x span the source times sit on half frames, and Python's round-half-to-even repeated every other frame in the real-time stretches that followed (77 dup flags on lapse_castle). Sparse renders (`scripts/render_needed.py`) must use the same mapping as the edit, or the frames the edit wants aren't rendered.
- **Don't freeze a flying camera on the build loop:** a tick whose /fill pass ran long skipped `setCam` and froze the shot for a tick (dup frames). A rail driven from `physicsTick` moves every tick whatever the loop is doing (lib/time_lapse.js).
- **Big /fill builds:** `/forceload add` the whole field first: its far corners were not loaded yet, and a /fill touching an unloaded chunk fails whole ("That position is not loaded"), leaving terrain where the builds go (the "lost placements" on first attempts). Set `random_tick_speed 0`. Moat water froze to ice on a plains site next to a cold biome, and grass under fresh fills decayed to dirt mid-shot. The first attempt after a cold server start can lose a few placements while the server catches up on light ("Can't keep up"): check every block and let run.sh retry.
- **A full render of a sped-up stunt wastes most of its time:** a 3x span keeps 1 frame in 3. Use `scripts/run_sparse.sh` (render.js FRAMES=), which cut lapse_castle from ~4800 frames to ~1900. Background jobs stop at 1-2 h, so long renders need the sparse path.
- **Clocks go on before the action:** the first clock shows 0:00.00 for 0.3 s before the first block, or the block lands before the clock reads. Clock frames render at 60 fps (at 30 fps the hundredths stepped unevenly).
- **Terrain fog is cylindrical** (vanilla FogShape.CYLINDER): it fades by horizontal distance only. Our view-depth fog turned every fall from 200+ blocks into a blank sky colour. Fixed in page.js (fog_vertex override).
- **Clouds sit at y 192.** Falls from build limit go through a white cloud wall, and from above the clouds hide the target. Use `clouds: false` on the stunt module (Video Settings > Clouds: OFF, a real vanilla option) for high drops.
- **A multi-set stunt must switch to creative before each mid-air teleport.** Each reused setup() ends in survival, so the next set's tp dropped the bot to its death (clutch_harder, 5/5 failed).
- **Big /fills can leave ghost terrain in mineflayer's world** (worker 4). The harness now does a far-tp refresh before recording (`noChunkRefresh: true` opts out), and "not loaded" counts as a command error.

## Retention toolkit (worker 10: scripts/retention.py, scripts/sfx.py)
- **Overlays share the game view's corners.** The counter sits top left, blocks-fallen top right; cards and stamps go at 36% of the game height and the hook text in the lower third. At 27% the "1 IN A MILLION" stamp covered "5/5".
- **The game area is 1011 px tall (odd).** A scale to `trunc(h/2)*2` came out 1 px short of the crop that followed it, and ffmpeg failed. Round up instead (`trunc(h/2+1)*2`).
- **xfade needs matching timebases.** The mp4 is 1/15360 and a looped PNG is 1/fps: put `fps=..,settb=1/fps` on both inputs.
- **atempo takes 0.5-2 per stage.** A freeze frame is a 1-frame span stretched ~36x, so its audio is silence padded to length, not atempo.
- **Blend in-between frames only inside slow spans.** A 2.5x speed-up also lands on half frames, and blending there smeared it.
- **A long fall above the clouds (night) is a still frame.** beat_audit read 1.1-1.7 s STILL on one_in_a_million's build-limit drops. Fix it in the edit: speed up the empty high stretch (`speed: [['drop5:0.5', 'drop5:3.3', 2.5]]`), and keep a live counter (`fallen`) and wind on the fall.
- **Bit-identical check:** with no new keys, an edit must match the pre-change code byte for byte. Compare against a worktree of the old commit on the same frames, not against an mp4 made before a pull (the HUD/encoder can change in between).
- **Worker 7, 1.21.11 server behaviour** (world_delete, die_rating):
  - `/fill` around 90-100 blocks from the bot fails silently (the harness's error regex misses the message). Keep a set within ~80 blocks of where the bot stands, e.g. centre a row of stations on it.
  - `/spawnpoint @s x y z` takes **two** numbers for the angle (yaw pitch). The respawn still came back at the world spawn: use `/setworldspawn x y z yaw pitch` plus `/gamerule respawn_radius 0` for each station.
  - `doTileDrops` is `block_drops`. `keep_inventory true` keeps a death-chain's tools (the anchor's glowstone was dropped at the first death).
  - mineflayer applies gravity in spectator and creative too: a bot hovering over ground that's being deleted falls into the void and dies. Set `bot.physicsEnabled = false` and emit `physicsTick` yourself (waitForTicks counts it).
  - Hollowing a big area under the surface lets outside oceans and aquifers pour in at the edges: wall it with barrier outside the recorded area, clear twice, and verify each chunk.
  - Big `/fill` waves reach the client 1-2 s late (server lighting). Send them as the bot starts aiming and break the block only when the deletion arrives. A camera awaiting one look per tick stutters while the client catches up on ticks; drive it from a physicsTick handler instead.
  - Walking right after a respawn sometimes goes nowhere: wait ~6 ticks, and walk until a position or death condition rather than for a fixed number of ticks. Sweet berry bushes never hurt the bot (dripstone/fall damage is reliable).
