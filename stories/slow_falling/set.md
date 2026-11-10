# slow_falling: set brief (r2)

r2: the step is now the end of a 3-block jetty, 2 blocks west of the cliff face. The bench is at (-22, 0, 6). The
cellar is a potion lab, with no barrels in frame. Natural ground is named in every exterior shot.

Owner, 2026-11-10: "the sets are all so small, and in a superflat." This story's picture is height: a windmill on a
cliff over a market, a 23-block drop, and a glass column of water running from the market paving to the top. The relief
is the premise, so the site is chosen for it. Every set follows `docs/building_guide.md` and scores 7+ on its checklist.

## Site
- A real slope: a ledge or hill shoulder that stands ~10 blocks over a flatter area right below it (natural relief,
  forest round it, hills behind). `sets.planSite(ctx, [{ name: 'market', dx: -14, dz: 0 }, { name: 'windmill', dx: 1,
  dz: -5, facing: 'south', variant: { height: 12 } }, { name: 'cottage', dx: -14, dz: -26, facing: 'south' }], { reach,
  stride })` scoring for a **height difference** of 8-12 between the windmill footprint and the market footprint (the
  default score punishes it: add a `minRange`-style bonus for the windmill-to-market step, or search with
  `sets.findSite(ctx, { w: 15, d: 15, minRange: 8 })` for the windmill and put the market at the foot of its west slope).
- The `fit` banks at most 5 blocks. Where the natural step between ledge and market is under ~10, finish it by hand:
  a stone retaining wall (stone bricks, mossy and cracked, cobble) along x 0..1 from the market paving up to the ledge,
  with ivy (vines) and a stair path up its north end (Grandpa's path; not used on screen). The column is set into the
  wall's face.
- Water: none needed; a stream in the valley below the market is a bonus for the S09/S13 depth.

## Library pieces
| piece | variant | facing | where (origin = the soul sand at the fountain's foot) | changes after placing |
|---|---|---|---|---|
| `windmill` | `height: 12` (cap floor 13 above its ground) | south (sails on the south face) | tower centre (6, 10, 0) on the ledge: cap floor at y 23 | **remove the inside ladder** (`/fill` the ladder column to air; the ground-floor mill room stays): the fountain is the only way up. Add the balcony (below) |
| `market` | `goods`: flowers (east entrance, by the fountain), fish, bread, books | west-east axis: its east entrance faces the cliff | centre (-14, 0, 0) | replace the centre fountain with a 3x3 planter and a fancy oak (one "fountain" in this story) |
| `cottage` | `palette: 'spruce'`, `garden: true`, `seed` fixed | south (door to the market) | about (-14, 0, -24) | cut a hatch in its floor over the basement's hatch |
| `basement` | `hatch: true`, `eyes: 0` | under the cottage | room about (-20..-8, -6..-1, -29..-19) | dress the corner as a potion lab: a lit brewing stand (3 peach potions) on a stone table, a cauldron, a spruce-stair chair facing the stand, item frames with peach potions on the wall, bookshelves, a chest. **Move the piece's barrels out of S06/S07's frame** (barrels and bottles read as moonshine) |

## Built by hand (the story's own pieces)
- **The fountain** (build it after placing the windmill): soul sand at (1, 0, 0); water source blocks (1, 1..22, 0),
  which turn into a bubble column; glass (plain or light-blue stained) on x 0 and on z -1 and z 1 the whole height,
  the back against the cliff wall, then the tower's west shell (x 2), and glass on x 2 too above y 18, where the
  tower narrows. A spruce door at (0, 1..2, 0) facing west into the market (water doesn't flow through a
  door: vanilla). The top: the water ends at y 22; the air block (1, 23, 0) is a hole in the balcony floor. Copper
  trim or stone-brick bands every 5 blocks so it reads as built, not a glitch. It must read as "a fountain" in S03 at
  12-25 blocks: bubbles, water and glass catching the morning sun.
- **The balcony and the jetty:** a spruce plank walkway at floor y 23 round the cap's west side (x 1..2, on spruce
  brackets: stairs upside down) with a fence rail. **The jetty**: 1 wide and 3 long, at z 1 from the balcony out west
  over x 0..-2, railed on both sides, open at its west end, on two diagonal log braces down to the tower. **The
  step** is that open end, (-2, 24, 1), 2 blocks west of the cliff face, so the drop clears the wall and the glass.
  A lantern on each end post so it reads in S01 and S10. Keep the south side clear of the sails (plane z +5).
- **The landing zone:** paving at about (-3..-1, 0, 0..2), between the fountain door and the flower stall. Nothing on
  it (no stall roof, no tree), so the fall is never blocked. Slow falling keeps almost no sideways speed: they land
  straight under the step.
- **The bench** at (-22, 0, 6), facing east, 24 blocks from the column: S05 and S13 frame Grandpa and the whole
  windmill from just behind it.

## Dressing
- Market: lamp posts, flower planters at the fountain's door, a crate stack, 4-6 frozen villagers at stalls; the bench
  (above) with a clear line to the step.
- The ledge: a wheat patch, hay bales and the granary from the windmill piece; a grove of fancy oaks and spruces
  20-40 blocks behind the windmill (east) so the cap never sits on bare sky in S01's tilt.
- Valley: groves round the market's west and south, the `rocks` boulders, flowers and grass at camera feet (S03, S05,
  S13 foregrounds).

## What fills each establishing shot, out to the fog
| shot | fg | mid | bg |
|---|---|---|---|
| S01 (in the air SW of the step, tilting down) | a canvas sail tip at frame right | Grandma at the jetty end (empty hands), the cap, the tower with the glass column down its face | first sky and the eastern grove; after the tilt the cliff and the market's striped roofs 23 below |
| S03 (market, 10 blocks west of the door) | a planter | Grandpa and Grandma at the fountain door | the column up the cliff and tower, the sails, the grove behind the windmill, the fish stall with the nitwit at frame left |
| S06 (crane down through the hatch) | the ladder, the hatch frame | Grandpa at the lit brewing stand | bookshelves, the potions in item frames, cobwebs (no barrels) |
| S12 (in the air, 7 blocks west) | air | Grandma and the kid above her, ~1 block west | the column at frame left, the cliff with grass along its top, the forested hill behind the windmill |
| S09 (POV over the rail) | the rail, the hand | the cliff and the market from above | the valley, forests and hills to the fog (needs ~100 blocks of real terrain west) |
| S13 (behind the bench, 25 blocks from the column) | Grandpa from behind, tomorrow's potion in his hand | the two floating figures, the column | the windmill on the cliff, sails, the eastern grove, hills |

## The easter egg
The village nitwit in his green coat (story_nitwit) standing on the fish stall's striped roof (stall_0 or whichever
holds fish), frozen, facing the windmill: background of S03 and S13 at frame left. Provisional: re-check against
docs/world/canon.md when it lands.

## Lighting and look
- Morning, `look: 'auto'` (dawn-warm grade). Night shots S06 and S07 carry `look.time: 18000`. The market looks east into the sun in S03, S05, S13: faces are rim-lit.
  If Grandpa and Grandma read dark at 300 px, move scenes A and C to time 3000 (higher sun), both scenes together.
- Night cellar: 3 lanterns at different heights, one right over the stand so Grandpa's face and the potions read, plus the stand's own flame.

## Engine status (does it render?)
| need | status | plan |
|---|---|---|
| brewing stand block (3 bottles, then 2) | a plain block model (multipart, `has_bottle_0..2`): the renderer handles multipart states and block changes, and published stunts (every_job, villager_fired) placed one. Not checked in a still of ours | `./hb still` on the cellar before recording; if the bottles don't show, it's a model bug to fix (<1 h) |
| bubble column (the water) | drawn as water (`bubble_column` in renderer/models.js WATER_PLANTS) | check through glass in a still |
| bubble column bubbles (BubbleColumnUpParticle rising, the pops at the top) | **missing**: no ambient bubble-column particles in renderer/particles.js (it has `bubble` and `bubble_pop`) | **build** (~1 h): a render.js scan for `bubble_column` blocks like the campfire smoke scan, spawning `bubble` rising and `bubble_pop` at the surface; gate on `rec.engine >= 2`. The column is the S01/S03/S04 picture, so it's needed |
| potion effect swirls on an entity | **missing**: only the splash `potion` burst exists | **build** (~1 h): an `effect_swirl` particle (vanilla entity_effect, tinted with the effect colour) round any entity with a staged `effect` mark (actors) or the bot's recorded `effect` marks |
| held drinkable potion tinted (hand, actors, hotbar) | thrown potions are tinted (`potionTexture`); held/hotbar potions probably draw the untinted bottle | **build** (~30 min): reuse `potionTexture` for `potion` in hand and in the hotbar, the colour from the item's potion contents |
| HUD: the selected-item name over the hotbar; the effect icon top right | **missing** in edit.py | **build** (~1.5 h): `gui/sprites/hud/effect_background` + `mob_effect/slow_falling` from the jar; the item name in the vanilla font over the hotbar, faded after 2 s, from a stunt mark. Also on the caption track: "Potion of Slow Falling" |
| drink pose, sit pose | built (renderer/poses.js: `drink`, `sit`) | Grandma `drink` in S01/S10; Grandpa `sit` S05/S06/S13 |
| Grandpa asleep in the chair | `sit` plus a dropped head | add a `doze` pose in poses.js (`sit` + `head: { set: [0.6, 0, 0] }`), ~10 min |
| custom skins (grandma, grandpa) | supported: `skins/` beside the jar's, `scripts/make_skins.py` | make two skins (~30 min); fall back to jar skins only if needed |
| riding a bubble column, the slow-falling descent | actors are /tp'd every tick | stage both on vanilla curves: record the bot riding a real column and stepping off the jetty with a real `/effect give @s slow_falling`, and replay those y(t) curves on the mannequins. Expected: 23 blocks in 4.4 s (bible, World). The POV fall in S11 can be real |

All the missing pieces are under 2 h each: build them (docs/engine_features.md, rule zero: existing Shorts render
unchanged). If anything slips, log it in docs/engine_requests.md and stage around it: the caption track carries the
item name and the effect regardless.
