# scarecrow: set brief (r1)

Two library pieces on real ground: the `farmhouse` (Grandpa's farm: the fields with the scarecrow anchor, the porch,
the barn, the paddock) and a `cottage` (ours) on the slope just west of the field, its back wall facing the wheat.
The trail between them is the premise, so the yard between them must read as one clean green slope in S01 and S02.
Coordinates as in the bible: origin at the foot of my window's wall outside, +x east, +z south.

## Site and biome (the honest part)
- **The biome must be a meadow, not plains.** Vanilla (Java 1.21): a snow golem only leaves snow where the biome
  temperature is below 0.8. Plains is exactly 0.8, so in a plains village it would leave **no** trail. A meadow is 0.5:
  the golem leaves its trail, and it still never snows (snow falls only under 0.15; a meadow gets rain). Meadows are
  plains-adjacent (high grassy slopes with flowers, and plains-style villages generate in them), so "a plains-style
  village up on the meadows" is true to the game.
- **Do not call `plainsBiome()`** on this set (it would set the biome to plains and make the premise false). If the
  scouted site is plains, run `/fillbiome <box> minecraft:meadow` over the whole set and the yard (a vanilla command)
  and `resendChunks`. A plains site at y 90+ would also work (temperature falls with height), but the meadow is the
  clean answer.
- **Check it on the server once (2 min):** `/summon snow_golem` on the yard and walk it 10 blocks (or let it wander):
  it must leave snow layers on the grass. If it doesn't, the biome is wrong: fix the biome, not the story.
- **The ground:** `sets.planSite(ctx, [{ name: 'cottage', dx: -8, dz: 0, facing: 'west' }, { name: 'farmhouse', dx: 18, dz: -17, facing: 'south' }], { reach: 200 })`
  on meadow ground that falls gently **east** (the cottage higher, the field lower: 2-4 blocks over the 20-block
  yard), with hills and a grove to the west and north behind the cottage and open meadow rolling away to the south and
  east. Real relief, not a clearing; the fit (`lib/sets/terrain.js`) gives the cottage a stone foundation on its
  downhill (east) side, which is what we want.
- `gamerule mobGriefing true` (default) if the golem is ever run live; `difficulty normal` (zombies can't break doors).

## Library pieces
| piece | where | facing | variant | changes after `place` |
|---|---|---|---|---|
| `cottage` | back (east) wall on x 0, the back window centred on z 0 | `west` (door and garden on the far side, back to the field) | `palette: 'spruce'`, `bed: 'red'` | **my window**: the back window over the bed (the piece's north-wall window at `facing: 'south'`, `sill(3, 2, r.pz0)`, which is over `bed`) loses its glass panes and its outside slab sill; two spruce trapdoors fill the opening (`open=true`: vertical, closed shutters; on "OPENED" they're set `open=false, half=top`: flat at the top of the opening). The opening's bottom must be 3 blocks above the outside grass (the foundation): check, and raise the cottage a block if the fit gives less (zombies must have no way in). One lantern on the far (west) wall inside |
| `farmhouse` | piece origin (18, y, -17) so the scarecrow spot is (21, 0) | `south` (porch faces the field) | `palette: 'spruce'`, `crops: ['wheat', 'carrots', 'potatoes', 'beetroots']` | **remove the piece's hay scarecrow** (fence post, hay block, carved pumpkin and the two fence arms at local x 4..6, z 17: it stands over the water channel, where a snow golem would melt); the snow golem stands at local (3, 1, 17) = world (21, 0) instead, in the wheat west of the channel. **Fence gap:** remove the field's west fence at local x 1, z 16..18 (world (19, -1..1)). **Porch pumpkins:** four `carved_pumpkin[facing=south]` along the porch's front edge (local x 3, 5, 8, 10, y 1, z 10). Leave the wheat ripe (age 7) and unharvested |

## Dressing
- **The trail** (morning shots): snow layers (`snow[layers=1]`) along a slightly wandering 1-2 wide line from (18, 0)
  to the patch at (6, -6), drawn as a golem would walk it (a gentle curve, not a ruler line); none on the farmland,
  wheat, dirt path or flowers (vanilla). Clear flowers off the line first (Mom mows the yard: short grass, flowers
  either side). **The patch**: 3x3 at (6, -6) with a few extra layers round it (ragged edge). S03 digs 2 blocks of it
  near (15, -2): set those layers after S01/S02 are recorded, or record S03 last among the mornings.
- **Rotten flesh** (S06): two dropped `rotten_flesh` items at (0.8, 0, 0.5) and (1.2, 0, -0.8), with `PickupDelay`
  32767 and `Age` low so they don't despawn during the take; a 1x2 coarse dirt spot beside them.
- **The yard**: `dress.grass` and `dress.flowers` either side of the trail (S04's foreground), a woodpile at the
  cottage's back corner, a lantern on a post at (0, -8) (S11's light on the wall).
- **The farm**: four cows in the paddock; the porch lantern lit; the barn doors open.
- **Fill to the fog** for each establishing shot:
  - S01 (looking west from the wheat): fg the pumpkin's back and ripe wheat; mid the trail across the yard, the
    cottage's back wall and window; bg the meadow rising behind the cottage, a `grove` of oak and birch 25-40 blocks
    west, hills in the fog.
  - S02 (crane over the farm looking north-east): fg the yard and the trail; mid the field, the farmhouse, barn,
    paddock; bg rolling meadow, groves 30+ blocks north and east, the far hills; the village roofs down the slope to
    the west at the frame edge as the crane rises.
  - S07 (looking north-west at the porch): fg the carrot plot; mid Mom, the porch, its pumpkins; bg the farmhouse
    front, the barn at right, the paddock with the cows and the nitwit, trees behind.
  - S11 (night, looking north-west at the wall): fg the moonlit grass and trail end; mid the wall, the window, the
    zombies, the golem; bg the dark field and the farmhouse's porch lantern, the hill line under the moon.
- **Village**: `sets.vanilla(ctx, 'village_plains', { x: -60, z: 10, mobs: 'freeze' })` down the slope west of the
  cottage (in the meadow), only seen as roofs in S02. Optional if the crane's frame shows enough without it.

## The easter egg
The village nitwit (green coat, `vil(dx, dz, yaw, 'nitwit')`) standing still in the paddock among the cows at (46, 2), facing
the field, in S07's background (8-12 blocks behind Mom). Provisional: re-check against docs/world/canon.md when it lands.

## Cast staging
- **The golem**: `snow_golem` with its pumpkin (default `Pumpkin: 1b`). Mornings: NoAI at (21, 0) facing west.
  Night (S11): either **live** (AI on, three zombies summoned at the wall with AI on, the bot in survival at the
  window 3 blocks up, the golem summoned at the patch: it targets them and throws by itself; vanilla knockback does
  the shoving) or **staged** (golem NoAI at the patch facing the wall, `K.every` summoning a `snowball` with `Motion`
  aimed at a zombie about once a second, with the golem's shoot sound; the knockback is vanilla on impact). Try live
  first (it's the truth); keep the staged version if the zombies wander. Either way the zombies must stay within a
  few blocks of the wall and the golem must stay on the patch for S11's 3.5 s.
- **Mom**: villager, plains farmer, NoAI, on the porch at (25, -8) facing south-west (S07).
- **Milo in camera shots**: S05 the player actor sitting on the bed (`sit` pose), facing into the room; S11 the bot
  (or actor) standing in the window, head and shoulders above the opening's bottom.

## Engine needs
| need | status |
|---|---|
| snow golem with its carved pumpkin head | the model is in `renderer/entity_models.json` (`snow_golem`, materials default + `snow_golem_pumpkin`): **check one frame** that the pumpkin draws (S01's back of the head, S08's face) |
| snow layers on grass, wheat, farmland, carved pumpkins, spruce trapdoors (open and flat), lanterns | blocks: render (check the snow layer reads white and thin at 300 px in S01) |
| meadow grass colour | **check** that the renderer tints grass from the recorded biome (meadow is a cooler green than plains); if it only knows plains, the meadow is still fine to look at; log it, don't fake the biome |
| thrown snowballs | render (`THROWN` in render.js, the item sprite) |
| **snowball hit puffs** (vanilla: a snowball breaking sends 8 `item` particles of the snowball sprite, `Snowball.handleEntityEvent(3)`) | **missing.** `renderer/particles.js` already has `item_break` (BreakingItemParticle, the same particle class): add a `snowball_hit` type, 8 particles with the snowball texture at the impact point, added with zero speed (only the small random spread `Particle`'s constructor gives), fired from a mark at each impact (the harness sees the snowball entity vanish: mark its last position). **~45 min: build it** (it's the reveal's readability: each hit has to read). Gate it on the new mark so old recordings render the same |
| zombie hurt flash on a 0-damage hit | vanilla shows the hurt tilt and sound for a snowball hit; the red flash may or may not draw: check, and don't add one if vanilla doesn't |
| dropped items bob and spin (rotten flesh) | render (`item`) |
| player `sit` on the bed | `sit` pose (docs/engine_features.md) |
| zombie arms up | render (zombies hold their arms out) |

No warden, no lightning, no GUI screens. Nothing here needs more than the snowball puffs.

## Look
- Mornings 1000, clear, `look: 'auto'` (the dawn-warm grade): the trail must be the brightest white in S01/S02; keep
  bloom low enough that the snow layer doesn't blow out into the grass.
- Night 18000, full moon: the night grade; the porch lantern and the corner lantern are the only warm lights. Every
  S11 subject within 14 blocks of the lens. Fog: none needed (`look.fog: false`).
