# gold_for_the_portal: set brief (r3)

Two places: a spruce cottage on a ridge on real terrain (S02, S05), and the cellar under it (library `basement`) with
a Nether portal in its east wall (every other shot). The cellar is the story; the ridge and the garden sell where it is
and carry the easter egg. Every set follows `docs/building_guide.md` and scores 7+ on its checklist.

## Site
- **The canonical place** (docs/world/canon.md): The Portal Cottage (`portal_cottage`, to claim; bible "World"), a
  forested ridge in the Green's north forest north-east of Hushwell, origin about (-110, 85, -990). Built with
  `world.build(ctx, { story: 'gold_for_the_portal' })`: no `planSite`/`findSite`/`/locate`. The ridge should stand
  15-20 blocks above a valley floor with a stream below and forest on both slopes, the cottage door facing **south**
  over the valley. Read the ground y off the survey grid before claiming; if the spot has no ridge, slide the place
  along the north forest, keeping Hushwell's plaza in S05's view at frame right.
- From the garden, Hushwell's plaza (about 140 blocks south-south-west, a little lower) must be in line of sight for
  the easter egg (S05); check it with `sets.frame(ctx, home, 'front')`. Dog Hill (west-south-west of the plaza) stays
  out of S05's frame, and the cottage stays out of Dog on the Hill's east-facing frames (check that Short's stills).
- Biome: plains, meadow or a taiga edge (spruce suits the cottage); `plainsBiome` only if the grass colour clashes.

## Pieces
| piece | variant | facing | where | notes |
|---|---|---|---|---|
| `cottage` | `{ palette: 'spruce', garden: true, bed: 'red', seed: 7 }` | south | on the ridge | its inside floor gets the hatch (below) |
| `basement` | `{ hatch: true }` + the new `portal: 'nether'` variant (below) | south | directly under the cottage, the hatch under the cottage's floor by the hearth | 13 x 7 x 11, y -6..-1 under the cottage's floor |

## Dressing
- **The Nether portal** (east wall of the cellar, inner face x=11, sheet z 5..6): obsidian frame 4 wide x 5 tall, lit
  (`/setblock <x y z> fire` inside, or place `nether_portal[axis=z]` blocks directly). Sink the frame's bottom row to y -6 (into the floor):
  the 5-high frame then fits under the ceiling with no dip in front of it; check the sheet reads 2 x 3 in S01. First
  clear what the piece puts on the east wall at x=11 (the bookshelf, the brewing stand and the cauldron).
- **Gifts barrel** at (10,F+1,3), named "Grandpa's Gifts" (`/data merge block <x y z> {CustomName:'"Grandpa\'s Gifts"'}`
  or the 1.21 `custom_name` component) and filled per the bible's Props table (`/item replace block <x y z> container.N`).
  Check the title in the barrel screen (`contTitle` reads custom names).
- **Gold chest** at (8,F+1,1) (prop `gold_chest`): a few gold blocks inside (never opened, never in frame: set dressing).
- **The garden for S05**: confirm it is at least 6 blocks deep north of the gate (the camera sits 5 blocks north of it), else move the camera along the fence.
- **Old gifts in use**: obsidian and crying obsidian blocks patching the north-east wall, soul sand blocks under a shelf.
- Candles on the barrel tops (S01 foreground), a lantern above the gold chest, one hung near the portal: three warm
  lights against the purple.
- Move the piece's centre table out of S01's line (camera at about x7, z5.5), the lantern at (4,_,5) out of S10's
  frame, and the cobweb at the ladder's foot (Grandma climbs there in S12-S13).
- The hatch: a spruce trapdoor in the cottage floor over the ladder; open in scene C (morning light falls in), shut at
  night.
- The flashback (E): the same cellar with the gifts barrel, the obsidian patches and the candles removed (swap them out
  between scenes, or build a second copy of the cellar far away and record E there: >64 blocks, a free cut).
- Outside: garden flowers and grass at the camera's feet for S05 (`dress.flowers`, `dress.grass`), a `grove` of spruce
  and fancy oak 20-40 blocks behind the cottage, lamps on the path down to the valley (`dress.lamp`), a worn path
  (`dress.path`) from the gate down the slope.

## What fills each establishing shot out to the fog
| shot | fg | mid | bg |
|---|---|---|---|
| S01 cellar (full figure, 4 blocks west of the portal) | the stone floor | Grandma full-figure beside the purple portal, the ingot crossing the sheet on frame 1 | the gold chest under a lantern at frame left, the obsidian-patched wall (the ladder is behind the camera) |
| S02 ridge (ews crane, night, time 14500: the moon low, not overhead) | the garden fence and gate lanterns (crane end) | the cottage: lit window, chimney smoke, the open door with a faint purple glow from the hatch | the dark valley, the stream catching moonlight, forest on the far slope, hills |
| S05 garden (wide, morning, camera north of the gate looking south) | fence, gate lanterns, flowers | the grandson at the gate drinking, the cottage's corner at frame right | across the valley: Hushwell's plaza at frame right with its boxed bell (the easter egg), forest, hills into the haze |
| S07 cellar 25 years ago (wide; camera about (0.5,z2.8) aimed 95 degrees) | the ladder's bottom rungs on the left edge | Grandpa walking into the portal, Grandma beside it | the bare cellar wall, one lantern |

## The easter egg
Canon cameo `boxed_bell` (since day 1400, for good): Hushwell's bell in its white wool box, in S05's background at
frame right, about 140 blocks south-south-west across the valley, a white speck among the plaza's roofs. Nothing to
build or dress: `world.build` puts Hushwell's `boxed_bell` stamp back (map.json `stories.gold_for_the_portal.cameos`).
It is never the subject, never named, and on screen only for S05's ~2 s. No carpets: Hushwell took them up on day 3400.

## Engine needs
| need | status | estimate | plan |
|---|---|---|---|
| **Armour on mobs** (the piglin's gold helmet) | missing: `lib/harness.js` records `extra.armor` for players only; `renderer/entities.js` `addArmor` puts armour on player bones only | ~1 h: record `extra.armor` for every living mob with equipment (rule zero: a new key, old recordings unchanged); call `addArmor` for humanoid mobs (piglin, zombified piglin, zombie, skeleton) on their bones; for the piglin, copy the head cube from vanilla `PiglinModel` / `PiglinRenderer`'s armour layer (the helmet sits on the wider snout-head) | **under 2 h: build it** |
| **Armour trims** (the lapis stripe on the gold helmet) | missing for players and mobs | ~1 h: the trim pattern texture (`trims/entity/humanoid/<pattern>`, greyscale) recoloured with the material palette (`trims/color_palettes/lapis` against `trim_palette`), drawn as a second layer on the helmet cube; the helmet is pinned to trim pattern `sentry`, material `lapis` (bible: Grandpa and the piglin); render S06 and S14 stills side by side | **under 2 h: build it**. Fallback if it slips: none good (a plain gold helmet on a piglin is just a piglin); do not render without it |
| **Piglin shaking in the Overworld** (vanilla `isConverting` → `LivingEntityRenderer.isShaking`) | missing | ~20 min: `extra.shaking` (staged mark, or every piglin/hoglin outside the Nether when `rec.engine >= 2`), the body yaw += cos(age x 3.25) x PI x 0.4 degrees | **build it** |
| basement `portal: 'nether'` variant | missing (the piece's `portal` is an end portal frame) | ~30 min: the obsidian frame in the east wall, the floor dip, lit sheet | **build it** (or dress it after `place`) |
| a cottage over a basement (hatch through the cottage floor) | not wired: the pieces are separate | ~30 min: place both on the same x/z, cut a trapdoor into the cottage floor over the basement's ladder | **build it** |
| an item coming out of a portal / a villager throwing an item | staged: `/summon item` at the sheet (or at Grandma's hand) with `Motion`; vanilla items do cross portals and villagers do throw items | 0 | stage |
| the piglin stepping out of the portal | staged: `K.actor` (NoAI piglin /tp'd every tick) from inside the sheet to the floor; portal particles render? check | 0-15 min | stage; check portal particles on a still |
| the grandson sitting (S13; camera at about (1.3,F+2.0,9.7), FOV 70, yaw 40, pitch -10; the grandson on the bed's north-east corner, about x2.9 z9.0) and drinking (S05) | drink: the recorded use flag plays it; sit: `M.pose` is for player actors/mannequins | check whether the recording bot can take a `pose` mark in camera shots; if not, ~30 min | build if needed, or seat the grandson on a stair-block "seat" with a mannequin in his skin |
| barrel screen with a custom title | exists (`container_png`, `contTitle`) | 0 | check the title renders |
| the flashback grade (S06-S07) | per-shot look: check `stunt.shots[name].look` overrides the grade | 0-30 min | build if missing (a shot-level `grade`) |

Total build: ~3-3.5 h, every item under 2 h. The piglin's helmet with its stripe is the reveal: test S14 on the shot
sheet at 300 px before anything else is recorded.
