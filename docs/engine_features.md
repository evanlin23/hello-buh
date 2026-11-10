# Adding to the engine: poses, particles, block entities, mob animations, GUI screens

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

## What still can't show
- Inside a closed container: nothing, as in vanilla. Open it on camera and the screen shows the contents.
- Legs bend at the hip only (Minecraft's player model has no knees): `crouch_sit` and `kneel` are as close as it gets.
