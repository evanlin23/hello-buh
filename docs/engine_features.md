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

## What still can't show
- Inside a closed container: nothing, as in vanilla. Open it on camera and the screen shows the contents.
- Legs bend at the hip only (Minecraft's player model has no knees): `crouch_sit` and `kneel` are as close as it gets.
