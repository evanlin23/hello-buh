---
name: minecraft-audit
description: Audit a HelloBuh Short for Minecraft correctness - would this look and behave like real vanilla 1.21 survival gameplay? Covers mechanics, mobs, physics, HUD and the renderer's look. Use on every Short before `publish.js --pass`, alongside retention-audit and the frame review, and when a reviewer claims something is "un-vanilla".
---

# Minecraft correctness audit (approximately vanilla)

Our viewers play Minecraft every day: one wrong detail ("that's not how water works") becomes the top comment
and the Short loses trust. The bar is **approximately correct**. Every mechanic, mob and number has to
be something real vanilla 1.21 survival could show. Pixel-exact rendering is not required, but anything a
player would notice is.

## Allowed by design (not findings)
- Our layout: the caption band, the game view and the black band.
- Commands used only to build the set or for a scale nobody could do by hand (a 100-block pillar, 75 TNT). The *player's*
  actions on camera must be survival-legal.
- The death screen's red tint over the HUD and particles, and the small death roll.
- Biome tint gradients across a biome border.

## Checks (each PASS / FAIL with frame numbers)

**1. Mechanics: could this really happen?**
- Damage numbers: fall damage = blocks - 3 (water, hay, slime, powder snow and cobweb change it), TNT,
  anvils, lava, drowning. The hearts and death screen must match the event. For example: 1-deep water cancels fall
  damage, and on peaceful difficulty TNT does no damage to the player.
- Item use: what's in the hotbar is what gets used; counts go down by one per placement, and the slot switches
  before use. The tool has to be able to break that block in the time shown (crack stages advance at
  that tool's speed).
- Block rules: sand and gravel fall; dirt, water and lava flow and stop as in vanilla (fluid
  spread, the source/flowing look, lava + water = obsidian or cobble). Portals need a valid frame.
- Physics: fall time (100 blocks takes about 2.9 s), knockback, a pearl's arc, a boat or ladder clutch window.
  `docs/clutch-timing.md` has the measured numbers.
- Mob behaviour: villagers take and lose professions from job sites (no angry particles on losing a job;
  those come from being hit). Creepers swell with a white flash before they explode, and their legs stop. Mobs
  look at the player with the head within 75° of the body, and don't walk through blocks or the player.

**2. Look (the renderer).**
- Held items: lower right, solid (1 px thick), swing and equip the vanilla way. Blocks are
  held as 3D cubes and tools as extruded sprites.
- Lighting: daylight is bright, and block light (torches, lava) is warm orange. Caves are dark but not black
  holes, and nothing is unlit in the open.
- Water and lava: translucent water with its biome tint, the right surface heights, and an underwater fog only when
  the eye is underwater.
- Particles: the right kind, colour and size for the event (splash droplets are light blue and there are
  many; glass shards are pale, not dark slabs; explosion smoke is grey and puffy).
- Entities: correct models, textures, walk animation, no popping in or out, no clipping into blocks.
- The HUD: hotbar, hearts, hunger, XP, crosshair and the selection outline on the targeted block,
  with counts that match the action.

**3. Survival plausibility.**
- Could a skilled player do exactly this in survival? Flag anything only possible in creative
  (flying, instant breaking, infinite items) unless the caption says so.
- The world looks natural: no command-built artefacts visible (a stray barrier, a cleared box with sharp edges,
  floating terrain the stunt didn't make).

**4. "Is it actually a bug?"** Before reporting something as un-vanilla, check it:
- `docs/lessons.md` lists behaviour already verified as vanilla. For example: water's alpha is 180/255, the checkerboard
  draining pattern is real, fast slot switches keep the hand down, and you can't see your own pillar's sides
  from on top of it.
- Exact rendering maths are in the jar:
  `unzip -p work/client/1.21.11.jar assets/minecraft/shaders/core/<name>.fsh` (shaders), and
  `assets/minecraft/models/...` (models and display transforms).
- If you're not sure, say "unsure" and why rather than guessing.

## Report
Findings by frame, each with:
- severity: **blocker** (a player would call it fake), **visible** (noticeable), or **nitpick**;
- what's wrong;
- what vanilla would show;
- where the fix belongs: **engine** (`render.js`, `renderer/`, `edit.py` - it would show in every Short) or **stunt**.

Verdict: **ready** or **not ready** (any blocker or visible finding means not ready).
