# light_sleeper: set brief (r2)

Owner, 2026-11-10: "the sets are all so small, and in a superflat ... looks really bad and low effort." This set is
the premise: the carpet has to read as *a whole village* at street level (S01) and from the hill (S02's crane), so it
is built big and on real ground. Every set follows `docs/building_guide.md` and scores 7+ on its checklist.

## Site
- A real valley (`scripts/scout.sh` on the movie branch, or a generated plains/meadow village in a valley): a stream on
  one side, forest on both slopes, a north slope rising 12-15 blocks above the plaza (S02's crane ends there) and a
  south street that steps down into the plaza (S01's camera is on its top step, ~3 blocks above the plaza floor). No
  clearing: build into the terrain; the village follows the ground (stairs, terraces, retaining walls).
- Biome: plains or meadow (green grass outside the carpet makes the carpet's edge readable in S09). `plainsBiome` is
  fine for one grass colour; no superflat, no `clearSet` flat plain.

## The village (12-14 buildings, 70 x 70 blocks)
- **Plaza** (21 x 20, x -10..10, z -8..11 from the well) in carpet stripes: white / light grey / cyan / light blue in
  3-wide bands, so the stripes read from S01's step and from the hill. 9 house fronts face it, ours in the middle of
  the north edge.
- **The well** at the centre: 5 x 5 cobblestone rim, 1 high, **bare stone (no carpet on the rim: S15 depends on it)**,
  around a 3 x 3 dry shaft 5 deep. **The lid**: 3 x 3 white wool filling the shaft's top layer, flush with the rim's
  top; from S01's step (eye ~4.5 above the plaza, 14 blocks away) it must read as a white square on the grey rim: check
  the frame and, if it reads thin, raise S01's step a block. Walls mossy cobble with sculk veins creeping up the bottom
  2 blocks. Floor: sculk blocks, 2 sculk sensors (corners), 1 sculk shrieker (`can_summon=true`) in the middle. Through
  the open slot (the lid's middle row) the shaft looks dark with a faint teal glow at the bottom: check at S06's and
  S11's angles. The lid is re-laid whole between the flashback and tonight.
- **The bell post**: oak post with a bell, 6 blocks east of the well. Boxed in white wool on 3 sides and the top
  (5 wool blocks), open to the west so the gold shows in S04.
- **Houses**: varied heights and woods (spruce, oak, birch), pitched roofs with overhang, every roof covered in carpet
  (red and orange carpet on the roofs, so they read warm against the cool plaza), carpeted stairs to every door,
  carpet on every floor inside our house. Lanterns on posts (not torches). Doors on every plaza house (S10-S11 shut,
  S12 open with a villager in each).
- **Our house** on the plaza's north edge: 9 x 9, two storeys, the door at (0,-8) facing south, **8 blocks from the
  well's centre** (S13 is shot from the boy's spot north of the well, 5 blocks from it); a window toward the well; a
  lantern post by the steps; inside: table and two chairs (one never used), a bed, a lantern, a chest, carpet floor.
- **Carpet street** from the plaza's north-west corner up the north slope, carpeted stairs to the houses on both sides;
  **the doghouse** at its top (-18,-26): a 3 x 3 x 3 hut (big enough to read lower-centre in S02's last frame from ~6
  blocks) with a carpet roof, a sitting wolf with a red collar in front.
- **The south street** with 3 carpeted steps down into the plaza (S01): houses with carpeted front stairs on both sides,
  one at frame left in S01's foreground.
- **Sheep meadow** on the far (south-east) slope: fenced, 40 x 30, ~80 sheep in S03's frame (white, half sheared), a
  pile of wool blocks by the gate. Distant sheep beyond the rise imply more.
- **The edge**: the carpet stops at a clean line on the west side, then grass, a wheat field (stage 7), the forest 20
  blocks out (S09 needs the line in the foreground).
- **Fill to the fog**: from the hill (S02) the camera sees the whole valley: forest on both slopes, the meadow, the
  stream, hills behind. From S01's step: the plaza, our house, roofs, then the north slope. From the plaza at night
  (S11-S17) the Darkness fog (15 blocks, black) is the edge: every subject is within 12 blocks of the lens.

## Lighting and look
- Night scenes (S10-S17): half moon, lanterns on every house and around the plaza; a lantern on a post beside the well
  so the jukebox and the warden's face catch light. The Darkness must still leave the warden readable: check S16 at the
  darkest pulse, shrunk to 300 px wide (should-fix from r1).
- Morning (S01-S05, time 1000), afternoon (S06-S08), dusk (S09) as in the bible's time table.

## Effects and engine status
| need | status |
|---|---|
| carpet, wool, bell, lanterns, sculk, sensors, shrieker, jukebox | blocks: render (check the shrieker, sensor and jukebox in one frame before building) |
| warden (walk, roar) | renders (`renderer/entities.js` warden, roar pose) |
| warden emerging (Pose.EMERGING, dig particles) | **not drawn**: stage it by rising the warden through the burst carpet with `K.actor` over ~2 s; test that rise on the shot sheet at 300 px |
| Darkness effect | renders (`render.js` darknessAt from the harness's effect marks): fog to 15 blocks, black, 4 s pulse |
| shrieker soul-ring particles, sonic boom ring | probably not drawn: check; the sound carries both, the Darkness is the picture |
| jukebox note particles | check; if missing, the music on the track and the villagers' frozen faces carry it |
| shears breaking wool, the disc going into the jukebox | first-person swing + block break (mark `place`/break ticks); the disc: a `use_item` on the jukebox (the hand empties, the song starts) |
| skeleton shooting, creeper dying, disc drop | skeleton, creeper, arrow, dropped items render |
| death screen with the sonic-boom message | from `edit.py` (death messages from en_us.json): check `death.attack.sonic_boom` |

## Staging notes
- Shrieks need a player cause, shown first (the bible's shriek table): the lid sheared (1), the disc in (2), landings on
  the bare rim (3, 4). Stage the shrieks as sound + Darkness effect marks on those beats; if the server's warden spawn is
  unreliable, `/summon warden` at (0,5) on shriek 4 (the vanilla rule is the story's; the build may stage it).
- Every villager is NoAI and silent (the premise is silence: no villager "hmm" in the mix at all).
- Sound: no music bed. The hush, the wind, sheep, then the jukebox's song "cat" from "CARE" (S12), the shrieks, the
  warden's heartbeat and roar. The song keeps playing under the death screen.
