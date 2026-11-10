# light_sleeper: set brief

Owner, 2026-11-10: "the sets are all so small, and in a superflat ... looks really bad and low effort." This set is
the premise: the carpet has to read as *a whole village* from the hill, so it is built big and on real ground.

## Site
- A real valley (`scripts/scout.sh` on the movie branch, or a generated plains/meadow village in a valley): a river
  or stream on one side, forest on both slopes, a hill shoulder 10-15 blocks above the village on the north side for
  S01. No clearing: build into the terrain; the village follows the ground (stairs, terraces, retaining walls).
- Biome: plains or meadow (green grass outside the carpet makes the carpet's edge readable in S09). `plainsBiome` is
  fine for one grass colour; no superflat, no `clearSet` flat plain.

## The village (12-14 buildings, 70 x 70 blocks)
- **Plaza** (24 x 24) in carpet stripes: white / light grey / cyan / light blue in 3-wide bands, so the stripes read
  from the hill. 9 house fronts face it.
- **The well**: 5 x 5 cobblestone rim, 1 high, around a 3 x 3 dry shaft 5 deep. Walls mossy cobble with sculk veins
  creeping up the bottom 2 blocks. Floor: sculk blocks, 2 sculk sensors (corners), 1 sculk shrieker
  (`can_summon=true`) in the middle. From the rim, the shaft must look dark with a faint teal glow at the bottom
  (sculk's glow + the sensor tendrils); check the frame at S06's angle.
- **The bell post**: oak post with a bell hanging from it, 6 blocks east of the well. Box it in white wool on 3 sides
  and the top (5 wool blocks), open to the west so the gold bell shows in S04.
- **Houses**: varied heights and woods (spruce, oak, birch), every roof covered in carpet on its stairs/slabs
  (red and orange carpet on roofs, so roofs read warm against the cool plaza), carpeted stairs to every door, carpet on
  every floor inside our house. Lanterns on posts (not torches: lanterns are softer and read at night).
- **Our house** (north-west of the plaza): 9 x 9, two storeys, door facing the plaza, window toward the well; inside:
  table and two chairs (one never used), a bed, a lantern, a chest, carpet on the floor.
- **The doghouse** on carpet_street: a 2 x 2 x 2 hut with a carpet roof, a sitting wolf with a red collar in front.
- **Sheep meadow** on the far (south-east) slope: fenced, 40 x 30, ~120 sheep (white, half sheared), a pile of wool
  blocks by the gate. Distant sheep beyond the rise imply more.
- **The edge**: the carpet stops at a clean line on the west side, then grass, a wheat field (stage 7), the forest 20
  blocks out (S09 needs the line in the foreground).
- **Fill to the fog**: from the hill (S01) the camera sees the whole valley: forest on both slopes, the meadow, the
  stream, hills behind. From the plaza (S11-S16) every direction ends in house fronts, then roofs, then the slopes.

## Lighting and look
- Night scenes (S10-S17): half moon, lanterns on every house and around the plaza; the jukebox lit by a lantern on a
  post beside the well so the warden's face catches light. The Darkness effect must still leave the warden readable:
  check S16 at the darkest pulse.
- Dusk (S01, S09) and noon/morning (S02-S05) as in the bible's time table.

## Effects and engine status
| need | status |
|---|---|
| carpet, wool, bell, lanterns, sculk, sensors, shrieker | blocks: render (check the shrieker and sensor models in one frame before building) |
| warden (walk, roar, heartbeat) | renders (`renderer/entities.js` WardenModel, roar pose) |
| warden emerging (Pose.EMERGING, dig particles) | **not drawn**: stage it by rising the warden through the burst carpet with `K.actor` over ~2 s, or add WardenAnimation.WARDEN_EMERGE (engine ask, optional) |
| Darkness effect | renders (`render.js` darknessAt from the harness's effect marks) |
| shrieker soul-ring particles, sonic boom ring | probably not drawn: check; the sound carries both, the Darkness is the picture |
| jukebox note particles | check; if missing, the music on the track and the villagers' frozen faces carry it |
| egg projectile | renders (`egg` in entity_models) |
| skeleton killing a creeper, disc drop | skeleton, creeper, arrow, dropped items render |
| death screen with the sonic-boom message | the death screen and message text come from `edit.py` (death messages from en_us.json): check `death.attack.sonic_boom` |

## Staging notes
- Shrieks need a player cause: S06 the thrown egg; tonight the jukebox placed (1), the disc inserted (2), and the
  boy's jumps on the stone rim (3, 4). Warnings are 10 s+ apart in game time: record S11-S15 with real gaps and cut.
  If the server's warden spawn is unreliable, `/summon warden` at the burst spot on shriek 4 (the vanilla rule is the
  story's; the build may stage it).
- Every villager is NoAI and silent (the premise is silence: no villager "hmm" in the mix at all).
- Sound: no music bed. The whisper, the wind, sheep, then the jukebox's song "cat" from the end of L13 (the disc goes in), the shrieks, the
  warden's heartbeat and roar. The song keeps playing under the death screen.
