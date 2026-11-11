# Adding to the engine: poses, particles, block entities, mob animations, GUI screens, skins

The owner (2026-11-10): "why cant we build the renderer out to allow all of these? and more when they come up?"
A story that needs something the renderer can't draw is a story the renderer should learn, not a scene to rewrite.
Each recipe below is the files to touch, the vanilla class to copy the numbers from, and how to prove it works
without breaking a published Short. Budget: under an hour each.

## How a frame is made (the 2-minute version)
- The **harness** (`lib/harness.js`) records what the server tells the bot: blocks (`rec.blocks`), entities per tick
  (`rec.entities`: `[tick, id, name, x, y, z, yaw, pitch, headYaw, extra]`, the `extra` object carries entity data:
  held items, poses, armour...), and timeline marks (`ctx.mark(event, {...})`: sounds, particles, poses, GUI).
  A stunt can add marks itself for anything the server can't do (`ctx.mark('pose', ...)`).
- **render.js** (node) reads the recording, works out per tick what each entity looks like (`e.extra`, `e.player`)
  and which particles live, and sends it to the **page** (`renderer/page.js` + `renderer/entities.js`,
  `renderer/blockentities.js`, three.js in headless Chromium), which draws the game view.
- **edit.py** cuts the frames into the Short and draws the 2D overlays: HUD, death screen, container screens,
  captions. Its images come straight from the client jar (`sprite(jar, "gui/...")`).
- Names and numbers come from the decompiled vanilla client (the comments say which class): keep doing that.

## Rule zero: existing Shorts render identically
A new feature is off unless the recording asks for it: a new mark, a new `extra` key, or `rec.engine >= 2` (set by
the harness from 2026-11-10) for effects vanilla always had but older recordings never showed (campfire smoke). A
published Short re-rendered from its recording must come out pixel for pixel the same.

**The test recipe** (do it for every change):
```bash
git worktree add --detach /home/user/wt-base origin/main && ln -s /home/user/hello-buh/{node_modules,songs,work} /home/user/wt-base/
cp stunts/_poses_test.js /home/user/wt-base/stunts/                    # (any untracked test stunt you need)
# the same stills, before (wt-base) and after (your worktree):
(cd /home/user/wt-base && ./hb still story_nitwit tick:120 tick:450 tick:800 --out $S/base/nitwit)
./hb still story_nitwit tick:120 tick:450 tick:800 --out $S/after/nitwit
#   ...and one non-story Short (creeper: tick:40 tick:150) and one with player actors (story_good_boy)
python3 - <<'EOF'   # every PNG pixel-identical?
import sys, pathlib, numpy as np; from PIL import Image
a, b = pathlib.Path('$S/base'), pathlib.Path('$S/after')
for p in sorted(a.rglob('*.png')):
    d = np.abs(np.asarray(Image.open(p).convert('RGB'), int) - np.asarray(Image.open(b / p.relative_to(a)).convert('RGB'), int))
    print(p.relative_to(a), int((d.max(axis=2) > 0).sum()), 'px differ')
EOF
git worktree remove --force /home/user/wt-base
```
Rendering is deterministic: the same code renders the same PNG twice (checked on story_good_boy). Then show the
new feature: `node scripts/pose_fixture.js --staged --out $S/staged.rec.json` writes a tiny recording (a still
camera on story_nitwit's street, five player actors, a warden, a campfire, no server needed) and
`./hb still $S/staged.rec.json tick:2 tick:40 tick:120 --out $S/staged` renders it. Add your case to the fixture.
Delete your stills afterwards (the disk is small).

## Add a pose (player actors and mannequins)
Data only: `renderer/poses.js`. A pose is per-limb angles plus an optional drop, pivot moves and a whole-body turn:
```js
salute: {
  blend: 3,                                                  // ticks to ease in (and out after the pose_off)
  limbs: { rightArm: { set: [-2.3, -0.5, 0] },               // radians, HumanoidModel's xRot/yRot/zRot signs
           head: { add: [0.1, 0, 0] } },                     // `set` replaces the walk swing, `add` adds to it
  // drop: 0.3,  pos: { rightLeg: [-1.9, 12, 3] },  root: { rot: [-PI / 2, 0, 0], off: [0, 0.2, -0.9] }
}
```
A value can be a function of `c` (`c.age` ticks, `c.head.x/y` the head's look, `c.q` the mark's params) for
moving or aimed poses (`wave`, `point`, `drink`). Use it from a stunt:
`M.pose(ctx, 'Grandpa', 'salute')` ... `M.poseOff(ctx, 'Grandpa')` (`lib/movie.js`; layered: `['sit', 'drink']`;
`{ off: true }` mirrors it to the off hand). render.js warns about a pose name it doesn't know.
Built in: sit, sit_ground, crouch_sit, drink, eat, use, point, wave, hands_up, look_item, kneel, crouch, lie.
The recorded "using an item" flag (an actor really drinking) plays `drink`/`eat`/`use` by itself.
Main hand (`M.give`), off hand (`M.giveOff`) and armour (`/item replace entity <name> armor.head with iron_helmet`)
are recorded as equipment and drawn (`extra.held`, `extra.offhand`, `extra.armor`).

## Add a particle
1. `renderer/particles.js` `spawn(ev, blockTex)`: a new `ev.type` block that pushes particles with
   `P({ x, y, z, vx, vy, vz, g, drag, life, size, tex | anim, color, alpha?, fade?, collide?, bright? })`. Copy the
   numbers from the vanilla `*Particle` class (lifetime, gravity, friction, quadSize, sprite set). `alpha` makes it
   translucent (sorted, blended: `campfire_smoke`); textures are `particle/<name>` from the jar.
2. Where it comes from: a stunt's `ctx.particles(type, pos, extra)` mark, a harness mark for a server event, or
   render.js finding the source itself (the campfire scan before `PARTS.sort`: a block state in the chunks and the
   recording's block changes; the warden dig crumbs from its animation runs).
3. Gate it for old recordings if vanilla always showed it (see rule zero).

## Add a block-entity animation
`renderer/blockentities.js` draws chests, bells, signs, banners, skulls, shulkers, beds; render.js
`blockEntitiesAt` finds them by block state (`beKind`) and passes per-frame state (a chest's lid `open`, a bell's
`swing`) from timeline marks (`block_action`). New one: add the block name to `beKind`, its per-frame fields in
`blockEntitiesAt`, and its model in `blockentities.js` (BlockEntityRenderer + the model's `createBodyLayer`).

## Add a mob animation
`renderer/entities.js`: each mob's pose function (`poseWarden`, `poseEnderman`, `posePlayer`, ...) reads
`s.extra`. Get the state into `extra` one of two ways:
- recorded: in `lib/harness.js` `onEntities`, read the entity data (`e.metadata[i]`, indexes from the entity's
  `DATA_*` fields; `metadata[6]` is the Pose: 11 ROARING, 13 EMERGING, 14 DIGGING) into `extra`;
- staged: `ctx.mark('pose', { ids: [id], <flag>: true })` ... `ctx.mark('pose_off', { ids })`, parsed in render.js
  next to `STAGED` / `WARDEN_ANIM` (a run [start, end] per entity, the start tick passed on so the animation plays
  from it).
Then animate the bones from the start tick (the warden's emerge: three heaves out of the ground over 6.68 s).
If the flag changes during a run, add it to the `ensure()` key's skip list in entities.js so the model isn't rebuilt.

## Add a GUI screen
`edit.py` draws screens as overlays on the game area, from timeline marks: the death screen (`death_screen_png`) and
the container screen (`container_png`: chest, large chest, barrel, ender chest, shulker box, from the harness's
`container` / `container_close` marks, which carry every slot). For a new one (a furnace, a crafting table, a sign
editor, the inventory):
1. harness: on `bot.on('windowOpen')`, mark its type and slots (it does for `generic_9x*` and `shulker_box`; widen
   the type filter) and on `windowClose`;
2. edit.py: `<name>_png(jar, state, path)` with the texture `gui/container/<name>.png`, the `AbstractContainerScreen`
   subclass's `imageWidth/imageHeight`, the title at (8, 6) in 0x404040, and the menu's slot positions
   (`*Menu` class: `new Slot(..., x, y)`), items via `item_icon(jar, name)`;
3. edit.py `main`: one overlay per state window, like the container block next to the death screens.
Test without a full edit: run `edit.py` on a few `ffmpeg -f lavfi -i testsrc` frames and a hand-written timeline
with your marks (`--caption test --fps 20 --out_fps 20`), and look at a frame.

## Light in the shader: smooth dusk, lightning, held torches (engine-2)
By default the light is baked into the block vertex colours, and a change of the sky factor (time of day, rain)
re-meshes the whole world (`DAY_LIGHT_STEP` rounds a sunset to a few steps). `look.smoothLight: true` (or
`SHADER_LIGHT=1`) moves the lightmap into the block material instead: the mesher writes each vertex's (sky, block)
light level as an attribute `lt` (`renderer/models.js` `setLightAttr`, a 5th array per part in `Mesher.pack`) and the
page runs `models.lightmap()` per vertex in GLSL (`renderer/page.js` `lightMaterial`) from uniforms render.js sends
every frame (`cam.lm` = `models.lightParams()`). With no held lights it renders **pixel-identical** to the baked light
(checked at midnight on the pose fixture), and the world is meshed once:
- **dusk and dawn are smooth**: a `time` mark every tick drew 59, 57.7, 56.4, 55.0, 53.7... mean luma instead of the
  baked 59, 59, 59, 55, 55, 52.4..., and 8 stills took 31 s instead of 98 s (no re-meshes);
- **lightning lights the world** (LightTexture: sky darken 1 while `skyFlashTime` > 0): a bolt (`lightning_bolt`
  entity or a stunt's `ctx.mark('lightning', {x, y, z})`) flashes the blocks and the mobs, fading with the sky flash;
- **held light** (`look.heldLight: false` turns it off): a player, actor or mob holding a torch (14), lantern (15),
  soul torch/lantern (10), glowstone, sea lantern, lava bucket... in either hand (`extra.held` / `extra.offhand`), and
  the narrator's own held item, light blocks and entities around them to `level - distance` (the 8 nearest the
  camera). Vanilla Java has no held light (the LambDynamicLights mod and Bedrock do): it's a look choice;
- `look.moonlight` (0.2-1): the night's darkest sky factor (vanilla 0.2), for night scenes that read black;
- `look.torchGlow` (x, default 1): scales lightmap.fsh's block-light factor 1.5, so lanterns and torches throw
  more light on the faces round them at night.
Placed torches, lanterns, campfires, lava already light their surroundings through the block light engine
(`renderer/light.js`), baked or shader. Try it on any recording: `./hb still <stunt> T --look '{"smoothLight":true}'`
(a look turns the cinematic post pass on: compare against `--look '{}'`), or `SHADER_LIGHT=1 ./hb still ...` with
no post pass. The pose fixture has the cases: `node scripts/pose_fixture.js --staged --lights --time 18000 --bolt 40`.

## Sky: moon phases, drifting fog
- `stunt.moonPhase`: `'new_moon'`, `'waxing_crescent'`, ... or 0-7 (DimensionType.moonPhase order, 0 = full). A
  recording with `rec.engine >= 2` and a time past day 0 gets its day's phase (`(time / 24000) % 8`); anything else
  draws the full moon as before. `MOON_PHASE=` overrides. The sun, moon and stars were already drawn (`placeSun`).
- `stunt.fogSea.drift` (blocks a tick: a number along +x, or `[dx, dz]`), `fogSea.wisps` (0..1, how patchy, default
  0.6) and `fogSea.wispSize` (blocks, default 40): the sheets thin in soft patches that stay put in the world and
  slide with the wind, each sheet a little faster than the one below, so the fog rolls. Test: `stunts/_light_test.js`
  (`node scripts/pose_fixture.js --stunt _light_test --time 18000`).

## Motion blur (look.motionBlur)
`look.motionBlur: 0.5` (the shutter: 0.5 = a 180-degree shutter) or `{ shutter, trail }` blurs the camera's own motion
per pixel (renderer/page.js `makePost`: depth reprojected through the previous frame's camera, 12 taps), so whips,
fast pans and cranes smear instead of strobing on a phone; the first-person hand stays sharp. `trail` (0..0.85) mixes
in the previous frames too, for time-lapses whose blocks pop. It needs the frame before: a cut, a gap over 2 ticks or
a big jump resets it, and a single `./hb still` shows none (give it two consecutive ticks: `tick:24 tick:25`, the
second is blurred). Moving mobs aren't blurred (camera motion only). Test: `node scripts/pose_fixture.js --staged
--whip`. Off unless the look asks.

## Smooth digging (rec.smoothDig)
Owner, 2026-11-10: "can we make the movement smoother when we are breaking blocks? right now it looks very jerky".
The cause, measured on pickaxe_race / fortune / villager_fired / story_torch (camera through every run of digs at
60 fps, `CAM_PROBE`): the bot aims at each block's centre in 1-2 ticks (`bot.dig(b, true)` snaps; `ctx.easeLookAt(p,
100)` is 7 degrees a tick for 2 ticks), holds dead still while it digs, then snaps to the next block. Each snap is a
burst of 2-3 degrees a frame between frozen holds: speed kicks of 2000-9000 deg/s^2, 130 of them in pickaxe_race. The
held pickaxe stuttered too: mineflayer swings once per dig and every 350 ms, so the arm stopped at rest between
swings (55 frames in pickaxe_race) and the 3-tick restart rule snapped it from half-swung back to the start (24-30
per Short). Crack stages and the fall into a dug-out hole are vanilla and stay.

The fix (render.js, after `SMOOTH`):
- **Aim**: through each run of digs (the harness's `dig`/`dig_end` marks, windows 8 ticks either side, runs closer
  than 20 ticks merged, split at cuts) yaw and pitch are a Gaussian average of the recorded aim (sigma 2.5 ticks),
  eased in and out over the window's ends. The crosshair must stay on the block being dug (vanilla cancels a dig
  that leaves it): per tick, the largest share of the smoothing that keeps the ray inside the block (shrunk 0.1 a
  side, 6-block reach) is found by bisection, and that share is eased over +-4 ticks so a pull back is never a kink.
  The mouse starts moving before a block breaks and glides onto the next one. Between ticks the camera follows a
  Catmull-Rom curve (no speed step at each tick), falling back to the straight line where the curve would bulge off
  the block.
- **Hand**: through a run (digs under 6 ticks apart) the swing is vanilla's held-attack chop: `continueAttack` swings
  every tick, `LivingEntity.swing` restarts at swingTime 3 of 6, and `getAttackAnim` wraps forward (0.5 -> 1, not
  back to 0). When the run ends the swing in progress plays out. (`digHandAt`)

Measured, before -> after, frames inside runs of digs (`peak/p99/rms` angular acceleration in deg/s^2, kicks =
frames over 2000):
| recording | peak accel | p99 | rms | kicks | arm stalls / back-snaps |
|---|---|---|---|---|---|
| pickaxe_race (45 digs) | 9010 -> 4130 | 8467 -> 1487 | 2042 -> 365 | 80 -> 7 | 55 / 24 -> 0 / 0 |
| fortune (10 digs) | 5194 -> 652 | 3142 -> 461 | 558 -> 201 | 12 -> 0 | 0 / 30 -> 0 / 0 |
| villager_fired (3 digs) | 2063 -> 744 | 2063 -> 744 | 379 -> 308 | 1 -> 0 | 4 / 0 -> 0 / 0 |
story_torch's digging was already smooth (looking straight down, a slow sway); there the change is the scripted
whip onto the first block, which gets rounded (whole windows: rms 1561 -> 912, p99 8597 -> 3433). The crosshair stays
on the block in every frame of every dig except 1 frame in pickaxe_race (the last third of a tick before a break
whose next dig starts the same tick).

**Turning it on**: recordings made from 2026-11-10 carry `rec.smoothDig: true` (lib/harness.js), so every new story or
stunt gets it with nothing to do. An older recording stays as it was (Rule zero): opt it in with `smoothDig: true`
in the stunt module (a re-render of an unpublished Short), or `SMOOTH_DIG=1` for one render; `SMOOTH_DIG=0` turns it
off. Stories need no change to their dig code: `K.dig(block)` / `bot.dig(b, true)` / `ctx.easeLookAt` all come out
smooth. Measuring tool: CAM_PROBE at 60 fps (`CAM_PROBE=t1,t2,...` with fractional ticks) through the dig windows,
before and after.

## Motion by construction (the story kit), the renderer's motion fixes (engine 3), and the safety net
Owner, 2026-11-10, on five story Shorts: "The movement sometimes still feels jerky and botlike", then: "the movement
shouldn't be caught... the processes should be such that the movement is [smooth] in the first place. Like we of
course we can still have the check later on, but this check later on shouldn't be the main way". So, in that order:

**1. Built in: the story kit moves like a player** (`lib/story.js` on `lib/motion.js`; every new recording, no flag)
- **Looks are targets, the camera turns to them like a hand on a mouse.** A governor runs every tick: the aim moves
  along the shortest line to its target at up to 180 deg/s, speeding up at 900 deg/s^2 and braking in time to stop
  on it (no overshoot): a 50-degree turn takes 0.45 s. `K.look`, `K.aim`, `K.turnTo`, `K.cut`'s arrival, and raw
  `bot.look` / `bot.lookAt` (overridden by the kit, so mineflayer's own lookAt in openContainer/placeBlock too) all
  set the target. A teleport (a cut, a respawn) puts the aim where the server says, at rest. `stunt.motion
  { turnSpeed, turnAccel }` (deg/s, deg/s^2) tunes it per story. `await K.aimAt(p)` turns and waits until it has
  landed (`{ block: true }`: until the crosshair is on that block).
- **The view holds still while a container window is open** (`bot.currentWindow`): from open to close nothing turns
  (vanilla: the mouse drives the cursor), then the aim eases back into motion from rest. Marks `gui_freeze` /
  `gui_thaw`. `const w = await K.open(pos)` turns onto the chest first; `K.close(w)`.
- **Digging**: `K.dig(block)` waits vanilla's destroyDelay (5 ticks after a break: back to back, light_sleeper's 3 wool
  blocks broke in 15 ticks and read "sped up"), glides onto the block (`K.aimAt`), then digs at vanilla speed.
  `rec.smoothDig` stays on for every recording.
- **Placing**: `K.place(pos, block)` waits the 4-tick use delay, turns onto the block it goes against, swings, sets it
  and plays its sound (light_sleeper's jukebox went down mid-whip: "the head jerking around").
- **Walking**: `K.walkTo([p1, p2, ...], { sprint })` checks every leg first (a 0.6-wide player pushing into a block:
  it throws, naming the block, "add a point around it"), then walks with the camera looking ~3 blocks ahead along the
  path, the forward key only while facing the way, a jump for a full-block step (slabs, carpets, stairs step up by
  themselves). Any walk (K.go too) that stalls against a block is marked `stuck` and logged at once.
- **The cast walks, it doesn't pop**: `K.actor` sends each cast member toward where the scene put it at <= 0.3 blocks
  and 20 deg (yaw) a tick. A jump happens at once only while a `K.cut` lands (the warp window stays open a tick past
  the landing), on the first placement, or after `K.warp(tag)` (off screen only); any other jump is walked and marked
  `motion_warn` with a log line. `K.hurt(entity)` marks a staged hit's red flash (Invulnerable cast send no damage
  event).
- **The lint, before recording** (`lib/hb/motion_lint.js`): `./hb motion <stunt>`, step 0 of `./hb check`, and
  `./hb record` refuses a story until it's clean. It names raw `bot.look`/`bot.lookAt`, `bot.entity.yaw/pitch =`,
  raw `bot.dig` / `placeBlock` / `activateBlock` / `openContainer`, `/tp @e` and `K.tp` of the cast, `/tp @s`, raw
  movement keys and `-S.gap` timing hacks in `perform`, each with the primitive to use. A line that must stay raw says
  why: `// motion-ok: <reason>`. `stunts/_story_template.js` is clean; the older stories are not (re-recording one
  means porting its moves to the primitives).

**2. The renderer's motion fixes** (`render.js MOTION_FIXES`): on for `rec.engine >= 3` (the harness writes 3 from
2026-11-10), `stunt.motionFixes: true` or `MOTION_FIXES=1` for an older recording (`MOTION_FIXES=0`: off). Rule zero:
engine-2 recordings render pixel-identical (story_nitwit tick 120/450 and creeper tick 40/150, base vs after: 0 px).
- **Container windows**: from the `container` mark to `container_close` the view's aim and position hold the opening
  tick's, then ease (smoothstep, 8 ticks) to the recording. thirty_one_raids / gold_for_the_portal /
  names_in_the_woods: the view drifted 5.8 / 6.0 / 6.4 deg under the chest screen -> 0.00.
- **A cast member moved with a cut lands on the cut**: the mob's teleport reaches the client with its next update (1-3
  ticks late), so the new shot showed it in its old spot, then the client's 3-tick lerp dashed it across (Grandma, 3.2
  blocks, gold_for_the_portal 31.7 s). A jump over a block within 6 ticks after a cut/shot/respawn mark is moved back
  onto the cut's tick.
- **Dropped items** stand on the ground as their own model (the 1/16-thick extruded sprite with its `ground` display),
  right side up, bobbing sin(age/10) x 0.1 + 0.1 and spinning age/20 rad (ItemEntityRenderer), like block items always
  did. The camera-facing sprite drew the entity texture upside down ("String is upsidedown on the floor"); thrown
  eggs, snowballs and pearls (ThrownItemRenderer, still sprites) are flipped upright too.
- **Camera shots through foliage**: world fragments within 0.5 blocks of the lens are discarded, 1.6 when leaves are
  within ~2 blocks of it (`renderer/page.js nearCutMaterial`, `cam.nearCut`): good_boy's crane through the oak canopy
  filled the frame with single leaf faces a block wide (7.7-7.9 s). POV frames are never cut.
- **Projectile hits on mobs**: the flight simulation of a thrown egg/snowball tests mobs' hitboxes (inflated 0.3,
  ProjectileUtil) and, on a hit, ends the projectile and flashes the mob red for 10 ticks (hurtTime). The cast is
  Invulnerable, so the server sends no damage event (names_in_the_woods: two eggs on Hugo and Pia, no red).

**3. The safety net** (`lib/hb/motion.js`, in the owner gate `./hb owner` / `./hb check`): the view moving under an
open container (BLOCK; a NOTE where the renderer's fix holds it), a mob jumping over 1.5 blocks in a tick with no cut,
or landing late after one (BLOCK in view, WARN out of it), first-person whips over 240 deg/s or turn-speed kicks over
140 deg/s in a tick (WARN), the forward key held while the player slides along a block at under 60% of its walk
(WARN), and the kit's own `stuck` / `motion_warn` marks. Tests: `lib/hb/test/motion.test.js`.

## Life: heads that turn, sleeping and head-shaking mobs, name tags
- **Look at the speaker**: `stunt.lookAtSpeaker: true` (or a range in blocks, default 10): while a `line` mark's speaker
  talks (lib/movie.js `M.line`/`M.say`), every other actor and mob within range eases its head to them over 8 ticks
  and back 8 ticks after the line; past 75 degrees the body follows (BodyRotationControl). The narrator (`selfName`)
  counts as a speaker at the camera's eye.
- **Look at a mark**: `M.headTo(ctx, who, at)` ... `M.headOff(ctx, who)` (marks `look_at` / `look_at_off`): `at` is an
  actor's name, an entity id or `[dx, dy, dz]` from the set origin. Renderer-side, so no-AI mobs turn too.
- **Asleep**: `ctx.mark('pose', { ids: [id], sleep: true })` ... `pose_off`: any mob lies on its side on the floor
  (Pose.SLEEPING; player actors have the `lie` pose). **Shaking its head no**: `{ shake: true }` (VillagerModel's
  unhappy head shake, zRot 0.3 sin(0.45 age)) on any mob with a head.
- Vanilla villagers have no work or panic animation (a panicking villager just runs: record it running), and mob
  idle variety is `stunt.idleLife` (a slow look-around, docs/movie_engine.md).
- **Name tags**: `stunt.nameTags: true` (every actor and named mob) or a list of names draws the vanilla nameplate
  over their heads (EntityRenderer.renderNameTag, 0.5 above the hitbox), as CustomNameVisible does.
- **Player names** (Six Thousand Torches, 2026-11-10): `stunt.playerNames: true` draws every other player's name over
  their head, as vanilla always does (within 64 blocks). While the player crouches the plate sits on the 1.5-tall
  hitbox and draws at reduced opacity (renderNameTag: isDiscrete, 0x80FFFFFF, no see-through pass), still readable.
  Opt-in: recordings without the flag render unchanged.
- **Chat lines** (Six Thousand Torches): `ctx.mark('syschat', { text: '<Jonah> see you tomorrow', color: 'white' })`
  and `{ text: 'Jonah left the game', color: 'yellow' }` (vanilla ChatFormatting.YELLOW #FFFF55); `ctx.mark('syschat_clear')`
  empties it on a cut. edit.py draws the closed chat (ChatComponent: a 320-GUI-px translucent strip a line, newest at
  the bottom, 40 GUI px above the bottom of the game view) for 10 s a line. Nothing changes without the marks.
Test: `node scripts/pose_fixture.js --stunt _life_test --life` (stunts/_life_test.js).

## Held items on mobs: villagers' crossed arms, mob off hands; the narrator's nameplate; the selected item's name
From names_in_the_woods (2026-11-10). All off for older recordings (rule zero: nitwit, thirty_one_raids and the pose
fixture re-rendered pixel-identical).
- **A villager holding an item** (`equipment:{mainhand:{...}}` on the summon, or `/item replace entity ... weapon.mainhand`)
  shows it over its crossed arms (CrossedArmsItemLayer: VillagerModel.translateToArms, T(0, 0.4, -0.4), Rx(180), the item's
  `ground` display). Recordings with `rec.engine >= 2` only.
- **A mob's off-hand item** (a zombie villager still holding a potion in its left hand) is recorded (`extra.offhand`, as for
  player actors) and drawn on the left arm (ItemInHandLayer, T(-1/16, 0.125, -0.625), the left-hand display).
- **The narrator's player nameplate** in camera shots: list `stunt.selfName` in `stunt.nameTags`
  (`selfName: 'Remy', nameTags: ['Remy']`).
- **The selected item's name over the hotbar** (Gui.renderSelectedItemName): `edit.itemNames: { splash_potion: 'Splash
  Potion of Weakness' }` (`{}` for title-cased ids) draws the name for 2 s whenever the selected stack changes, fading over
  the last 0.5 s, in its rarity colour (a golden apple is aqua). Off without `itemNames`.

## The story's hotbar (story.json "hotbar")
Owner, 2026-11-10: "Can we also fill our hotbar with like ridiculous items? like buckets of milk for example", and
"make it 67 eggs" (docs/STANDARDS.md 3.6). Built in, not hand-rolled per stunt:
- **story.json `"hotbar"`**: up to 9 entries, slot 0 first: `"milk_bucket"`, `["egg", 67]`, `["iron_pickaxe", 1, true]`
  (the glint: `enchantment_glint_override`) or `["diamond_sword", 1, "sharpness:5"]` (real enchantments), `{ "item":
  "cake", "count": 1 }`, `null` (an empty slot). The story's own tools first, then 1-3 ridiculous items that fit the world.
- **Counts over the item's stack size** (67 eggs; eggs stack to 16, buckets and cake to 1): the kit adds the 1.21
  `max_stack_size=99` component (`egg[max_stack_size=99] 67`), so the server takes it and the HUD reads "67". 1-99; a tool
  with durability can't stack (1.21 refuses the component on a damageable item).
- **Applied once, before the first recorded frame**: lib/harness.js calls `applyStoryHotbar` (lib/story.js) for any
  stunt with `edit.story`, right after `stunt.setup` and the item sweep, before the chunk refresh and the recording; it
  runs `ctx.hotbar(items)` (`/clear`, `/item replace`), so the recording's first `hotbar` mark is already full. A story
  without `"hotbar"` is untouched. The selected slot is never changed: `ctx.select` / the stunt decides what is held.
- **A stunt's own `ctx.hotbar` wins from its moment** (it clears first). To keep the story's items around the stunt's
  own: `await ctx.hotbar(mergeHotbar(ctx.storyHotbar, ['iron_shovel']))` (lib/story.js; its non-empty slots win).
- **Checks**: `./hb check story_<name>` works before the first recording too (the motion lint and the hotbar only):
  BLOCK on an id that isn't in minecraft-data for versions.env's version, a count outside 1-99, a stacked tool, more
  than 9 entries, or an item the HUD has no icon for yet (shield, decorated pot, player/dragon/piglin heads, copper
  chests and golem statues: 3D special models); WARN on no `"hotbar"` or fewer than 7 filled. `./hb record` refuses
  to start on a blocker. After recording, rec_check (`hotbar`) WARNs when fewer than 7 slots are filled on more than
  20% of the first-person frames where the HUD shows (camera shots, F1, the death screen and open containers don't count).
- **Icons**: edit.py draws every 1.21.11 item now. Items whose texture isn't named after them (compass, clock,
  recovery compass, crossbow, enchanted golden apple, tipped arrow, debug stick, the waxed copper bars/chains/doors/
  lanterns) drew an empty slot; `item_def_icon` reads the item definition (assets/minecraft/items/<name>.json: a
  condition's on_false, a select/range_dispatch's fallback or first case) and composites its layers with their default
  tints. Only reached where the old name lookups found nothing: no published recording holds any of those items (all
  100 published and work/ recordings scanned), so every published Short renders as before.
- Test: `./hb record _hotbar_test && ./hb still _hotbar_test t_full+0.5 t_milk+0.5 t_eggs+0.5 t_own+0.5` (the fixture
  lib/hb/test/fixtures/hotbar_story: an enchanted pickaxe, 67 eggs, milk and water buckets, a cake; slot 6 and 7 held;
  then the stunt's own sword over slot 0). `npm test` (lib/hb/test/hotbar.test.js) covers the kit on a fake ctx and both checks.

## Potions, phone-readable screens, on-screen teleports, the Darkness phase, lightning light
The engine items of the visual audit (docs/runs/visual_audit_2026-11-10/README.md "Engine items reported, not fixed").
Rule zero holds for all of them: story_nitwit (tick 120, 450, and its bolts at 180, 628) and creeper (tick 40, 150),
base vs after, 0 px differ; edit.py's container screens and HUDs of gold_for_the_portal and thirty_one_raids, 0 px.
Before/after stills: `docs/runs/visual_audit_2026-11-10/engine2_*.jpg`. Live test: `stunts/_engine2_test.js`
(`./hb record _engine2_test --no-strict`, then stills at t_bar, t_chat, t_bolt, t_blink, t_dark). `npm test`:
lib/hb/test/engine2.test.js.
- **Potions are tinted in the HUD and container screens.** The harness records each potion, splash and lingering
  potion and tipped arrow with its `potion_contents` colour as the slot's 6th element: `[name, count, glint, damage,
  maxDamage, 0xRRGGBB]` (hotbar marks and container marks). mineflayer's shape, checked on a live 1.21.11 server:
  `components: [{ type: 'potion_contents', data: { potionId: 11, customEffects: [] } }]` (`customColor` for a custom
  colour). `lib/potion_color.js` is PotionContents.getColor: the custom colour, else the effects' colours averaged by
  amplifier + 1, else 0x385DC6 (fire resistance 0xFF9900). edit.py `potion_icon` draws the item model: layer0
  `potion_overlay` multiplied by the colour under the bottle (a tipped arrow: the head under the shaft). Older
  recordings have no 6th element and draw as before. The first-person held potion is still the renderer's own sprite.
- **Phone-readable container screens and chat** (opt-in; the default stays GUI 3): `edit.guiScale: 4` draws chests,
  barrels and shulker boxes at GUI 4 (704 px wide: inside the caption-safe width; vanilla's largest scale at this
  window), `edit.chatScale: 5` draws the chat lines ("Buh left the game") at 5 (it defaults to guiScale). A scale too
  big for the view falls back to the largest that fits; the chat's strip stops at the frame's edge. The HUD stays at 3.
- **`await K.blink(tag | 'self', to?)`: a teleport that is the story** (vanilla: a tamed wolf more than 12 blocks from
  its owner teleports to within 1-2 blocks of him, no particles; good_boy L01/L03). `to` is set-relative `{ x, y?, z,
  yaw? }` or `[dx, dy, dz]`; left out, 1.5 blocks to the player's right, facing his way. An actor jumps on its next
  tick (no walking, no `motion_warn`); `'self'` /tp's the player keeping its aim. It writes no cut mark, and a
  `teleport_ok` mark `{ tag, self, x, y, z }` (absolute): the owner gate's teleport rule accepts a jump landing within
  3 blocks of it within 6 ticks, the motion lint has nothing to say (a kit verb), and the renderer snaps the entity
  there with no client lerp at any distance (a 2-block blink would otherwise glide over 3 ticks); a `'self'` blink is a
  camera jump like a cut. Recordings without the mark: unchanged.
- **The Darkness pulse on the word: `K.darkPeak(offset = 0)`** marks `darkness_phase`: the pulse (cos(t x PI x 0.025),
  LightTexture.calculateDarknessScale) peaks on the mark's tick + offset and every 80 ticks either side, instead of on
  absolute recording ticks that are multiples of 80 (vanilla's tickCount, which nobody can see). The latest mark at or
  before a tick rules; before the first, the first does. `lib/darkness.js`. Without a mark: bit for bit as before.
- **Lightning lights the world without `look.smoothLight`.** The flash needs the shader light (the baked light can't
  change for 2-4 ticks without re-meshing the world), so a recording with a bolt (a `lightning_bolt` entity or a
  `lightning` mark) turns it on for the flash alone: no held lights, no moonlight or torchGlow (those stay look keys).
  Outside the flash the frame is the baked light's (the _engine2_test night frame: 1 px of 546k differs). On for
  `rec.engine >= 3` (new recordings), `stunt.lightningLight: true` or `LIGHTNING_LIGHT=1` for an older one
  (`LIGHTNING_LIGHT=0` / `SHADER_LIGHT=0`: off). `lib/lightning_light.js`. On the test, a night bolt lifts the frame's
  mean luma from 62 to 81 (the grass, the barrel and the hand lit as LightTexture does).
- **`./hb owner` flags only jumps in or near view** (dog_hill: villagers 40-60 blocks away behind the hill "teleported"
  2 blocks, the server's sparse updates at that range). `MO.viewClass`: in the frame, under 48 blocks and not behind
  blocks: BLOCK; just off the frame (a quarter each side) or behind blocks under 32 blocks, or within 8 blocks of the
  camera: WARN; anything else is no finding.

## Trade screen, tooltip, caption chunks, hidden name tags
From The Walk (S10: the librarian's book reads Frost Walker II) and The Honey Thief (Jonah: "no name tag"), 2026-11-11.
All off unless a recording has the new marks or a story asks: story_nitwit (tick 120, 450), creeper (40, 150) and
story_torch (L02, L05, L08) render pixel-identical before/after; the caption PNG streams of gold_for_the_portal, nitwit
and torch and the chest screens of gold_for_the_portal and thirty_one_raids are byte-identical.
- **The villager trade screen** (MerchantScreen, 1.21.11): `const v = await K.trade(villagerEntity)` turns onto its
  face and opens it (bot.openVillager; the view holds still while it's open, as for chests), `await K.pick(v, i)`
  selects offer i (the server moves the price into the payment slots: a whole stack, as vanilla), `await
  K.takeResult(v)` completes it once (a plain click into the inventory; `{ shift: true }` trades as often as the
  payment lasts; mineflayer's `v.trade` would fail after K.pick), `K.close(v)`. The harness marks `merchant` (the
  trade_list offers: costs with demand/special price, results, xp, out-of-stock; the trader's level and xp; every slot;
  each item's tooltip lines from `lib/tooltip.js`) on open and every slot change, and `merchant_close`. edit.py
  `merchant_png` draws gui/container/villager.png at 276 x 166, "Librarian - Novice" (the level names for a villager),
  "Trades" / "Inventory", the experience bar (with the selected offer's xp as the result part), up to 7 offer buttons
  (a discount struck through), arrows, the scroller, the payment/result slots and the inventory (MerchantMenu slot
  positions), enchanted items glinting, leather armour in its default dye (the merchant screen only).
- **Tooltips**: `K.hover('result')` (or `'a'`, `'b'`, `'trade:N'`, a window slot number; `null` to move off; a
  `{ tooltip: [[text, '#RRGGBB']] }` option overrides the lines) marks `gui_hover`: the slot's 1.21.6 highlight sprites
  and the tooltip box (tooltip/background + tooltip/frame nine-slices, +12/-12 from the cursor, flipped left at the
  screen's edge as DefaultTooltipPositioner does, 2 px under the title line). Lines (`lib/tooltip.js`, ItemStack
  tooltips): the name in its rarity colour (an enchanted book yellow, an enchanted sword aqua), then the enchantments
  (stored ones on a book) gray, curses red, no numeral for a max-level-1 enchantment. The cursor itself isn't drawn.
- **A non-spoken caption chunk**: `K.onscreen('Frost Walker II', { hold: 1.3 })` (mark `onscreen`; no hold: to the next
  cut or line, 1.5 s at most; `caption_y` as for lines) draws the words in the story's word-chunk caption style
  (scripts/story_track.py), every word in the key colour, from the mark's frame (no lead); a spoken caption under it
  is cut back for its window. The default height (0.70) sits over the merchant screen's lower inventory: The Walk can
  set `caption_y`.
- **A hidden name tag**: a story.json cast entry with `"name_tag": false` (matched by its cast id, `user`, `tag`, and
  its `name`'s first word: The Honey Thief's "Giant" / "Jonah ...") or `stunt.hideNameTags: ['Jonah']`
  (`lib/name_tags.js`): render.js never draws that entity's plate, not with `playerNames`, `nameTags` or the
  crosshair on it (vanilla: a team with nametagVisibility never).
Test: `./hb record _test_gui_tags --no-strict && PREVIEW_W=1080 PREVIEW_FPS=20 scripts/preview.sh _test_gui_tags`
(the fixture lib/hb/test/fixtures/gui_tags_story: Pia's plate shows, Jonah's doesn't; a librarian's Frost Walker II
trade opened, picked, hovered, captioned and taken). Stills: docs/engine_proofs/gui_tags/. `npm test`:
lib/hb/test/gui_tags.test.js.

## Faster stills: the mesh cache
`./hb still` (any `ONLY=`/`FRAMES=` render) keeps the first mesh of the world in `work/hb/meshcache/` and the next
still of the same recording loads it instead of meshing (story_nitwit, two stills: 56 s -> 25 s; the PNGs are
identical). The key is the recording (path, size, mtime), the visible depth, Brightness, the time and weather at tick
0, the dimension, shader light and the source of the mesher files, so an edit to the mesher or a re-record misses.
One entry is kept (~180 MB for story_nitwit; `MESH_CACHE_KEEP=n`), `MESH_CACHE=0` turns it off, and full renders
never touch it. Delete the folder to free the space.

## Mob coverage (scripts/mob_audit.js)
`node scripts/mob_audit.js` lists every living entity in minecraft-data and what the renderer has for it (a converted
model, a hand-built one, a pose function). 2026-11-10: 89 living entities (1.21.11), 71 drawn before and 76 now. Added for engine-2 recordings
(older ones never showed them and must stay as published): **bogged, parched** (skeleton model), **illusioner**
(illager model), **glow squid** (squid model, lit 15), **trader llama** (llama + the trader blanket); line-up:
`node scripts/pose_fixture.js --mobs`. Still not drawn (each needs its model built from the vanilla `*Model` class,
by value for stories): **goat, camel, axolotl, armadillo** (common animals), **breeze, creaking** (1.21 threats),
glow squid's tentacle glow, tadpole, copper golem, happy ghast, nautilus / zombie nautilus, camel husk, giant (unused).
A mob with no model is skipped, not drawn wrong: `render.js` prints nothing for it, so check the audit before casting.

## Hiding the cast's waiting room (stunt.hideBoxes)
A cast parked out of view (a barrier floor and a stone roof 60 blocks up: story_good_boy) is a real build: looking up,
vanilla draws its roof too (a dark slab in the dusk sky over the librarian, L06 19.9 s). `stunt.hideBoxes:
[[dx0, dy0, dz0, dx1, dy1, dz1], ...]` (from the set origin, corners inclusive) leaves those blocks out of the drawn
world and its light (render.js and the mesh workers, `renderer/hidebox.js`) and skips entities while they're inside.
List every waiting room a stunt builds. `./hb describe` shows mobs parked far above the set as "EWS extreme wide".

## Armour on mobs, armour trims, a piglin shaking in the Overworld
- **Armour on mobs** (gold_for_the_portal, 2026-11-10): the harness records `extra.armor` ([feet, legs, chest, head]
  item names) for every living entity that wears something, not only players (a new key: older recordings have
  none). `addMobArmor` (renderer/entities.js) draws HumanoidArmorLayer on the converted geometry's own bones (zombie,
  husk, drowned, skeleton family, piglin, zombified piglin...): the armour cubes come from each bone's first cube,
  the helmet is the 8x8x8 humanoid head on the head's pivot (a piglin's 10-wide head gets the plain helmet, grown
  1.02 like vanilla's PIGLIN_OUTER_ARMOR). Dress a mob with `/item replace entity <uuid|@e[...]> armor.head with
  golden_helmet`.
- **Armour trims** on players and mobs: the harness records `extra.trims` (per slot, `pattern/material`, from the
  item's `trim` component; the trim registries come from the server's registry_data). The renderer draws
  `trims/entity/humanoid[_leggings]/<pattern>` recoloured from `trims/color_palettes/trim_palette` to the material's
  palette (`<material>_darker` on armour of the same metal), composited over the armour texture
  (`armorLayers`). `renderer/build_assets.py` now copies `textures/trims/`. Give one with
  `/item replace entity @s armor.head with golden_helmet[trim={pattern:"sentry",material:"lapis"}]`.
- **Shaking** (Piglin/Hoglin.isConverting -> LivingEntityRenderer.isShaking): a staged mark
  `ctx.mark('pose', { ids, converting: true })` (until `pose_off`) turns the whole body by
  cos(age x 3.25) x PI x 0.4 degrees each frame. A NoAI mob never converts in vanilla, so stage it.
- Test: `node scripts/pose_fixture.js --armor` (a trimmed-helmet piglin, shaking; a zombie in iron with a trimmed
  chestplate; a skeleton in a chain helmet; the Grandpa actor in the trimmed helmet).

## Original player skins (scripts/make_story_skins.py)
Every jar skin (steve, alex, ari, efe, kai, makena, noor, sunny, zuri) and `hellobuh` already belongs to a character
(STANDARDS 7a: one look per character), so new player characters get skins we draw ourselves. They are pixel data in
`scripts/make_story_skins.py` (an 8x8 face string per skin plus hair, clothes and shoe parameters; no Mojang or
skin-site pixels), written to `skins/<name>.png` (64x64, wide arms). render.js already serves `skins/` beside the
jar's skins, so a stunt casts one by name like a jar skin: `cast: { Grandpa: 'grandpa_gullwick' }`. No renderer change.
- The ten (canon notes in docs/world/canon.md "Original skins"): `grandpa_gullwick`, `grandma_island`, `walk_kid`,
  `pulled_man`, `hall_player`, `miner_girl`, `neighbour`, `barter_player`, `spare_boy`, `spare_girl`.
- A new one: add a spec to `SKINS` (copy the closest), run `python3 scripts/make_story_skins.py` (same bytes every
  run: the shading noise is seeded by the name), and check it beside the others and the taken skins:
  `node scripts/pose_fixture.js --skins --stunt _test_skins --src ../hb-videos/shorts/creeper/recording.json.gz --out work/_test_skins.rec.json`
  then `./hb still _test_skins tick:5 tick:25 tick:145 --size 1080x1011` (ticks 0-19 all new ones facing, 20-39 at
  3/4, 40-119 five at a time, 120-139 the neighbour with and without diamond armour and the barter player in iron,
  140-159 the taken skins). Add its name to `NAMES` in both the fixture and `stunts/_test_skins.js`.
- Faces carry identity under armour: a story whose player wears a chestplate (Singing Box's neighbour, Saving Up's
  barter player) must still read from the head alone (glasses, moustache, beanie). Avoid a jar skin's colour scheme
  (Steve's cyan shirt and blue trousers read as Buh).
- Proofs: docs/engine_proofs/skins/ (line-ups at 1080 and 300 px, phone stills, armour, taken vs new).

## Flying-mob POV, the crane, the Nether (camera_world, 2026-11-11)
Brief: docs/engine_briefs/camera_world.md (The Honey Thief's bee, The Singing Box's allay, Saving Up for a Bastion).
Proof: docs/engine_proofs/camera_world/ (stills, the flower readability table, the Nether survey).

**A flying narrator** (`lib/mobpov.js`, the rusher: the narrator's client position driven a tick at a time; stunt.self
gives the model and eye: a bee `{ model: 'bee', eye: 0.3 }`)
- `R.hover('bee' | 'allay' | { rate, amp, nod, drift }, { scale, nod, drift, ramp })`: from now on every hold, turn,
  dash and fly bobs like the model's body (BeeModel.setupAnim: bone.y -= cos(age x 0.18) x 0.9 px, xRot 0.1 + cos x
  PI x 0.025; AllayModel: root.y += cos(age x 9 deg) x 0.25 px), with a slow horizontal drift. Defaults: height x1.6
  (the bee's own 0.056 blocks read as still), nod x0.35 (+-1.6 deg; the body's +-4.5 tipped the whole frame), drift
  0.05 blocks; it ramps in over 10 ticks. `R.hover(null)` stops it. While hovering the narrator is not on the ground,
  so the renderer adds no walking view-bob.
- `await R.fly([p1, p2, ...], o)`: a centripetal Catmull-Rom curve through the points (no stops, no loops or cusps),
  `speed` blocks a tick (0.5 = 10 blocks/s; a bee's real cruise is ~0.3-0.5), eased in over `accel` ticks and out over
  `decel` (0: arrive at speed and go on into the next leg; `v0` is the last leg's speed, so legs join). The view looks
  `lead` blocks ahead along the curve (`pitchFollow` 0.5 of the climb), or at `look: Vec3` (flying at someone), easing
  from the view it had over `blend` ticks. `above: 1.5` keeps it 1.5 over the ground (read under the path and `lead`
  ahead, smoothed over 7 ticks: it lifts before a rise; flowers and grass are not ground). It throws before flying when
  a turn would pass `R.maxTurn` (150 deg/s): widen the curve, slow down, look further ahead, or cut. The planner is
  pure (`flightPlan`, tests in lib/hb/test/camera_world.test.js).

**The crane off a view** (render.js camera director, a shot spec; opt-in, nothing else changes)
```js
crane: { crane: { from: 'pov', to: [0, 90, 0], yaw: 0, pitch: -90, fov: 70, secs: 2.5 } }
```
Mark the shot where the lift starts (`R.shot('crane')` on 'TELL'). Its first frame IS the view before it (the POV, with
its stunt.fovZoom fov and stunt.self eye; `from: 'prev'` takes the camera shot before), and a cubic Hermite carries
that view's own motion (position, yaw, pitch, tan of the fov) into the end pose at rest: no stop on take-off, no
snap, no overshoot. `pitch: -90` is straight down with `yaw` the frame's up (0 = north up), the turn done in the first `tilt` (0.6) of the move so it finds the ground early; `to` is set-relative or a
TARGET. No eye-trace (it starts on the frame before it) and no handheld drift. The narrator flies on below (stunt.self
draws its model in camera shots: the bee is the yellow dot). Also on any camera shot: `fovPath: [[sec, deg], ...]`
(keyed like `path`, eased in tan space).
- Render distance: a top-down from 90 up sees ground 90-115 blocks from the lens; `renderDistance: 8` (chunks) fogs
  its edges. Use 12.
- The narrator's own model is not drawn while a crane's lens is within 2.5 blocks of its eye (it leaves from inside
  the bee's head; the first frames were all bee).
- **Flowers from straight above** (90 up, fov 70, 7x7 patches, CIE76 delta E against the grass round each patch, on a
  300 px-wide thumbnail; docs/engine_proofs/camera_world/flower_readability.md): bare podzol 52, pink_petals 35,
  lilac 19, rose_bush 18, wildflowers 11, peony 11, sunflower 8; every cross-sprite flower (dandelion, poppy, oxeye
  daisy, lily of the valley, tulips, cornflower, allium, bluet, orchid, torchflower) 1-6: seen edge-on they vanish into
  the grass. A picture meant to read from above is drawn in flat covers (pink_petals, wildflowers), 2-tall bushes
  (rose bush red, lilac) and bare ground stripes, not in single flowers. The ~75 degree alternative (`tilt75` in the
  test) reads the bushes a little better and the single flowers no better.

**The Nether in the world tools** (`lib/world.js`, `scripts/world.js`)
- A place says `"dimension": "the_nether"` (or `"the_end"`; none = the Overworld); its `at`/`footprint` are that
  dimension's coordinates. `world.check` only clashes footprints in the same dimension (and checks the name);
  `world.at(x, z, dim)`; `./hb world where X Z --dimension the_nether`; `./hb world claim ... --dimension the_nether`;
  the world map skips other dimensions' places.
- `world.build` takes the bot there first (`world.enter(ctx, dim, x, y, z)`: `/execute in minecraft:<dim> run tp`,
  waits for the client's respawn into it and the chunks), forceloads the footprint there, and reads the ground under
  the roof: `ctx.groundTop` (place y + 24) makes `lib/sets/site.js` column read the first floor with open space over
  it (netherrack, soul sand, basalt, blackstone, nylium...) instead of the bedrock roof. Pieces, stamps and the ground
  check then work as in the Overworld. Every command after it runs in the Nether, and the harness records
  `rec.dimension` from the bot (render.js draws the Nether's sky, fog and light).
- The survey round the Portal Cottage's Nether side (-16, -118): **basalt deltas** (basalt and blackstone floors broken
  by lava pools at every height, the lava sea at y 31; at the origin the floors are y 82 and y 33); the nearest
  bastion remnant is at (-160, -608), 510 blocks off, the nearest fortress at (-320, -144). A bastion "across the lake"
  has to be placed (`/place structure minecraft:bastion_remnant`) or built.
- `HB_WORLD_MAP=file` points lib/world at a test map (lib/hb/test/fixtures/world_nether_map.json).
- Test: `./hb record _test_camera_world_nether` (builds the fixture's Nether place, surveys the Nether round it:
  `/locate` bastion and fortress, every column's floors and lava -> work/nether_survey.json ->
  `python3 scripts/nether_survey.py`), and `./hb record _test_camera_world` (the bee: hover, low curving flight, the
  fov narrowing, the crane to 90 straight down; the meadow is the flower readability patch:
  `python3 scripts/flower_readability.py <top still> --set X,Y,Z`).

## Boats, leads and passengers (2026-11-11, engine-boats-leads)
For Pulled Away (a boat led over grass and water) and The Walk (Grandma rowing away). Everything goes through the real
server; the numbers are from the 1.21.11 client jar (Mojang mappings, `javap` on the classes named below) and measured on
the server. `lib/riding.js` holds the shared numbers, `lib/boats.js` the kit.
- **Passengers move with their vehicle** (the recorder): the server sends no moves for passengers, so mineflayer left a
  rider where it mounted (stories/runaway's workaround: teleport both). The harness now tracks `set_passengers` itself
  and records each rider where `Entity.positionRider` puts it: vehicle + `AbstractBoat.getPassengerAttachmentPoint`
  ((0, height / 3, f), f 0.2 / -0.6 for two riders, + 0.2 for an animal; a bamboo raft height x 0.889) - the rider's
  vehicle attachment (a player 0.6, a villager 0: measured, kid y = boat y + 0.1875, a player boat y - 0.4125), with
  `extra.ride = vehicle id`. Boats and rafts only (other vehicles, a jockey's spider, a horse, record as before). render.js eases rider and boat the same way (the client's 3-tick lerp), so they stay
  together. A rider doesn't walk (its leg swing is 0); a player rider takes HumanoidModel's riding limbs (pose `ride`,
  under any staged pose) and faces where it looks. (mineflayer reads `attach_entity` as a mount: since 1.9 it is the
  LEAD packet, so the harness keeps its own maps; don't trust `entity.vehicle`.)
- **Leads** (`LeashFeatureRenderer`): the harness marks `leash` { id, holder } from `attach_entity` (holder `'self'` for the
  recording bot, null when untied; the leads already tied when the recording starts are marked on tick 0), and the
  renderer draws the rope each frame from the leashed entity's lead point (a boat's bow: (0, 0.88 h, 0.64 w); others
  (0, eyeHeight, 0.4 w), turned by its yaw) to the holder's (`Player.getRopeHoldPosition`: the right hand, 0.8 up, 0.07
  forward, crouching 0.5 / -0.2; a knot 0.2 over its centre): two crossed ribbons 0.05 wide of 24 segments, brown
  (0.5, 0.4, 0.3) x 0.7 on every other one, sagging dy t^2 (flat at the lower end), lit by the light levels lerped from
  end to end (`cam.leashes` -> page.js `drawLeashes`). The fence **knot** (`LeashKnotModel`, a 6x8x6 cube over the post,
  `entity/lead_knot`) is drawn in recordings that have lead marks (older ones never drew one: rule zero). The holder's
  first-person hand isn't a rope end (a narrator holding a lead shows it only in camera shots).
- **A leashed boat follows** (vanilla 1.21: boats can be leashed, the server pulls them, `Leashable.tickLeash`): on grass
  at a walk (0.24 blocks/tick: it followed at 0.24, ~6 blocks back) and on water behind a rowing holder. At the full 0.4
  row it lags then catches up in a yank (0.65 blocks/tick for a few ticks): row at `speed: 0.3` for a steady tow. Leads
  break past 10-12 blocks.
- **The kit** (`lib/boats.js`, on K):
  - `K.leash('Man', K.entity('oak_boat', [dx, dy, dz]))`: the actor right-clicks the boat holding a lead (vanilla: within
    3 blocks; survival uses the lead up). `K.leash('Man', 'tag')` ties it by the server's leash NBT (any time, any
    distance under 10), `K.leash([x, y, z], 'tag')` to a fence post (the server ties a knot there).
  - `K.board('Man', 'boat_tag')` / `K.board('kid', 'boat_tag')`: `/ride`. An actor the kit was walking (K.actor) stops
    being moved and its client stops simulating. Summon a boat at the water's surface (it settles 0.48 under it); summoned
    under the surface it sinks and throws its riders out. A mob can be summoned in it (`Passengers:[{...}]`).
  - `await K.row('Man', [[x, z], ...], { speed, stop, look, sound })` (or `K.rowing(...)` to row while the scene goes on):
    the first rider steers. The row is planned (`planRow`, unit-tested): a smooth curve through the points, the bow along
    its tangent (at most 9 deg a tick: a sharper corner is logged), vanilla's speed (a held key in water: v = 0.9 v +
    0.04, 0.4 blocks/tick top; the oars shipped 9 v before the end, gliding onto it). It is sent the way a player's client
    sends it (`vehicle_move` + `steer_boat`): the server moves the boat and sets its paddle states, so the oars animate in
    the recording (`BoatModel.animatePaddle`, already drawn) and a lead tied to the rower pulls its boat behind. Each
    stroke plays `entity.boat.paddle_water` (pitch 0.8-1.2). `speed` under 0.4 scales the thrust (a steady row; the oars
    keep their stroke).
- Checks: rec_check's mob ground-speed check skips riders, and the visible-jump check doesn't flag getting into or out of
  a boat (vanilla's mount is a one-tick move).
- Test: `./hb record _test_boats_leads && ./hb still _test_boats_leads t_walk+2 t_board+0.3 t_row+2.5 t_row+5` (a man
  leads a boat with a baby villager in it over grass, boards his own boat and rows an S-bend, the led boat following;
  a third boat tied to a fence; proof stills in docs/engine_proofs/boats_leads/). `node --test lib/hb/test/boats.test.js`.

## Mob poses and held items (skeleton bow draw, evoker spellcasting, piglin admiring, allay held item)
For the Buh Stories batch (The Bell in the Window, Red Sheep, Saving Up for a Bastion, The Singing Box Next Door).
Code: `renderer/entities.js` (the bone angles), `lib/mob_poses.js` (the node side: spell ids and colours, the bow's pull,
the piglin_loved tag, the recorded runs), `render.js` (marks -> `extra`), `lib/harness.js` (the recorded flags),
`renderer/particles.js` (`spell`). Rule zero: every key is new (a staged mark or a new recorded `extra` key), and the
evoker's crossed arms change only from engine 2; the published Shorts with skeletons (light_sleeper, guess_sound_3,
interrupt_lamps), the allay (guess_sound_2), piglins (gold_for_the_portal), pillagers (thirty_one_raids) and sheep
render pixel-identical (docs/engine_proofs/mob_poses/README.md).
- **A skeleton drawing its bow** (stray, bogged, parched too): staged `ctx.mark('pose', { ids: [id], bow: true })` ...
  `ctx.mark('pose_off', { ids })`, or recorded (a skeleton with AI aiming: Mob flags bit 4 aggressive -> `extra.aggressive`,
  LivingEntity flags bit 1 using -> `extra.usingItem`). SkeletonModel's BOW_AND_ARROW: both arms straight out along
  the head's look (right yRot -0.1, left +0.5, xRot -90 deg + head pitch) with bobModelPart's idle sway; the bow pulls
  over the mark's first second (items/bow.json: `bow_pulling_0`, `_1` from 13 ticks, `_2` from 18 = full draw). `{ bow:
  true, drawn: true }` starts fully drawn. The arms follow the head: aim a NoAI skeleton with its `Rotation` pitch.
  For The Bell in the Window: mark `pose { bow }` 18 ticks before the story's `draw` mark, so `draw` lands on full draw.
- **An evoker casting** (IllagerArmPose.SPELLCASTING): recorded from SpellcasterIllager metadata 17 (`extra.spell`: 1 vex,
  2 fangs, 3 wololo, 4 disappear, 5 blindness), or staged `ctx.mark('pose', { ids: [id], spell: 'wololo' })`. Both
  free arms up and out (zRot +-135 deg) waving with cos(age 0.6662) x 0.25, and two ENTITY_EFFECT particles a tick at
  the hands (SpellcasterIllager.tick: 1.8 up, 0.6 either side; SpellParticle effect_7 -> effect_0, rising) in the
  spell's colour (wololo 0.7 0.5 0.2, fangs 0.4 0.3 0.35). Vanilla's wololo (EvokerWololoSpellGoal) lasts 60 ticks and
  turns the sheep red 40 ticks in, so the arms drop 1 s after the change: a staged spell with no `pose_off` ends 60
  ticks after its mark. Stage it as vanilla times it: the mark (and `entity.evoker.prepare_wololo`) at T, `/data merge
  entity <sheep> {Color:14b}` at T + 40 ticks (and `entity.evoker.cast_spell`), nothing else. A real cast needs
  `mob_griefing` on, a blue sheep within 16 blocks and no target (a player in survival in its sight is targeted first).
  The crossed arms: IllagerModel draws the crossed `arms` OR the free arms, never both; recordings from engine 2 on
  draw an idle evoker with only its crossed arms, tilted -0.75 on IllagerModel's pivot (the converted model drew both).
- **A sheep changing colour mid-shot** (white -> blue, blue -> red) already worked: the colour is recorded per sample,
  and a change rebuilds the model with the undercoat in the new colour (checked on the fixture).
- **A piglin admiring** (baby or adult): vanilla's own client rule, nothing to stage: a piglin with a piglin_loved item
  (a gold ingot, gold block, golden tools...) in its OFF hand takes PiglinArmPose.ADMIRING_ITEM: head down (xRot 0.5,
  yRot 0), the left arm up to the face (xRot -0.9, yRot 0.5) holding the item. `/summon piglin ~ ~ ~ {IsBaby:1b,
  IsImmuneToZombification:1b,equipment:{offhand:{id:"minecraft:gold_ingot",count:1}}}` (Overworld: immune, or it
  zombifies in 15 s), or `/item replace entity <piglin> weapon.offhand with gold_ingot` on cue. Piglins' main-hand and
  off-hand items now draw at all (the converted bones are lower case: `rightarm`, `leftarm`).
- **An allay holding an item** (AllayRenderer's ItemInHandLayer): `/summon allay ~ ~ ~ {equipment:{mainhand:{id:
  "minecraft:diamond",count:1}}}` or a real pickup. The arms take AllayModel's holding pose (reaching forward, xRot
  -60 deg, spread round the item) and the item sits in front of the chest (AllayModel.translateToHand: the body,
  T(0, 1/16, 3/16), Rx(arm), S(0.7), then the third-person right-hand display). An empty allay is unchanged.
- Test: `node scripts/pose_fixture.js --mobposes` (a staged and a recorded skeleton, three evokers, two sheep changing
  colour, three piglins, two allays) and `./hb still _poses_test tick:5 tick:30 tick:52 --cam 1.5,1.4,1.2,180,0`; live:
  `./hb record _test_mob_poses --no-strict` (an AI skeleton shooting a golem, a real wololo, the staged draw, the allay
  and the baby piglin). Stills: docs/engine_proofs/mob_poses/. `npm test` (lib/hb/test/mob_poses.test.js).
- Not done: the evoker's fangs (EvokerFangsModel's rise and bite; no story shows them), the vex, a pillager's crossbow
  (its converted bones are lower case too: published pillagers show none, so it stays off), the allay's body tilt
  while flying fast.

## What still can't show
- Inside a closed container: nothing, as in vanilla. Open it on camera and the screen shows the contents.
- Legs bend at the hip only (Minecraft's player model has no knees): `crouch_sit` and `kneel` are as close as it gets.
