# stand_up: set brief

A server town that grew around a dog. It must look like years of many different players building (mixed styles,
sizes and materials), not a generated village. Origin (0,0) = the dog's block; +X east (up the hill), +Z south.

## Site
- **Natural terrain:** a valley with a real hill on its east side (about 22 blocks above the square, a 40-50 block
  climb), forest on the west side (spruce and oak, a few 2x2 giant spruces), a river crossing the south of the town.
- The square sits on the valley floor at the foot of the hill; the hill path starts from the square's east edge,
  right behind the dog. The dog's plot is where the forest edge and the hill met ten years ago.
- Fill to the fog: S01 looks E (town → hill → sky), S06 looks E from the west forest (whole valley), S14 looks E/NE up
  the hill (hilltop, sky, the ridges beyond). Build or keep terrain in all three directions.

## The square
- About 30 x 24, a mix of paving (stone bricks, cobble, some coloured concrete someone added), worn into path near the
  queue.
- **The dog's plot** (0,0): 5 x 5 grass with poppies, dandelions and cornflowers (players brought them), an oak fence
  round it, a gate on the south side. A little spruce-slab roof on four fence posts directly over the dog, 2 lanterns
  hanging from it. A ring of path worn round the outside of the fence.
- **The sign** on the gate post: `MAKE HIM STAND` / `ONE TRY EACH` / `TRIED: 400`.
- **Pia's barrel** beside the gate (she stands on it).
- **The queue fence:** an oak fence along z=+4 running 30 blocks west from the gate, like a theme-park line, with a
  couple of switchbacks so the line snakes in S01.
- **The crater house** at 0,-6: a brick house with a creeper-sized bite out of its south side and roof, mossy and
  overgrown, kept as it is (a monument); a sign on it would be a nice touch but not needed.
- Around the square: 10-15 player builds in different styles: a medieval inn, a modern glass shop, a pixel-art wall,
  a half-finished castle tower, a bakery, a map wall, a rail station with a minecart track along the north side, a
  fountain, a few market stalls, trees planted in a row.

## The town edge (S06)
- About 90 blocks west: the old forest road (cobble) coming out of the last stand of big spruces, with the whole town
  visible below in the valley and the hill beyond it. The camera follows me from behind as I walk in.

## The hill and the hut
- A natural hill east of the square; the dirt path climbs it in a straight line (a kid's path: straight, no stairs,
  a few dirt blocks placed as steps).
- **The dirt hut** at the top (+48,0): 5 x 4 x 3 of dirt, a **lime wool** roof, one door hole facing west (toward the
  square and the dog), one torch inside, a crafting table and a chest visible through the hole. Nothing around it has
  been touched: grass, a single birch, wildflowers. The lime roof must read as a lime dot from the square (S01) and as
  a hut in S07/S14.

## Cast and effects the build needs
| need | how | status |
|---|---|---|
| a tamed wolf owned by the recording bot, sitting, facing east | `/summon wolf ~ ~ ~ {Owner:[I;...bot uuid...],Sitting:1b,CollarColor:5b,CustomName:'"BESTFREND"',Rotation:[-90f,0f]}` | vanilla |
| **the wolf's sitting pose** | WolfModel sitting pose (body lowered, hind legs folded, tail down) | **engine work: renderer/entities.js has no sitting pose today** |
| **the lime collar** | the wolf collar layer (wolf_collar.png tinted by CollarColor) | **engine work: check; not found in renderer/entities.js** |
| the nameplate BESTFREND | entity nameplates render (renderer/entities.js) | exists |
| the stand-up | the bot right-clicks the wolf (vanilla toggles `Sitting`); record the pose change | vanilla; recorded as a metadata change |
| Pia + ~30 queue players | movie engine actors (`spawnActors`) for Pia and me; `/summon mannequin` with default skins for the queue (docs/movie_engine.md, `agent/cinematic`) | exists on the movie branch |
| Pia smaller (optional) | `/attribute Pia minecraft:scale base set 0.75` | check the renderer honours the scale attribute; fine without |
| the dropped steak | an item entity spawned at S12b | exists |
| one wolf whine at the stand | vanilla wolf whine sound | exists |
