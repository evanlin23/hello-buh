# bed_in_the_square: set brief

Owner, 2026-11-10: "the sets are all so small, and in a superflat". This one is a whole village with a square in the
middle and a road that runs east to the fog. Origin (0,0) = the bed's head block; +X east, +Z south.

## Site
- **Natural terrain:** a plains or meadow village site on a gentle rise with hills to the east (2-3 ridges stepping
  away toward the fog, so the torch line can climb over them), a river or lake to the south for depth, birch and oak
  stands at the edges. A generated plains village is a good start: replace its centre with the square.
- The square is the flattest place; everything around it follows the ground (houses step up the slope, paths bend).
- Render distance: every establishing shot (S01, S05, S09) sees out to the fog. S01 looks NE, S05 looks E, S09 looks
  N from 16 blocks S: those three directions must be filled (houses, trees, hills), not void.

## The square (the main set)
- 21 x 21, cobblestone and path blocks with moss and a few coarse-dirt patches (forty years of feet), a slightly lower
  ring of worn path round the bed at radius 3: the one place nobody walks.
- **The bed:** a vanilla red bed, head north, alone in the exact centre. Nothing taller than a carpet within 3 blocks
  (the vanilla stand-up space must be valid for the respawn: keep the west side, -1,0, open and solid underfoot).
- **The well** (cobble walls, water, an oak roof) shoved off-centre to -7,+2, with a visibly newer patch of cobble
  where it used to be at 0,+4 (the "moved the well" proof in S02).
- 6 lantern posts on the square's edge (fence + lantern); they carry scene C.
- Grandma's stool: an oak stair at +2,0 facing east.
- **Market stalls (scene B on):** 6 stalls in a ring at radius 5-6: fence-post frames with red and white wool awnings,
  barrels and a composter as counters. They stop exactly outside the clear ring, so the bed is the empty hub of a
  wheel: readable from above in S08.

## The village (8-15 buildings round the square)
- Grandma's house (north side, door facing the bed): old oak, mossy cobble base, flower boxes, the oldest-looking
  building.
- Dad's house (west side, door facing east): 2-storey spruce, newer.
- A bakery, a library (lectern visible through the window), a smithy, a church tower (NE corner, a landmark in S01),
  4-6 houses up the slope, wheat and carrot fields at different growth stages on the south side, a dock and boat on
  the river.
- Two or three "who lives here" details: a half-built shed, a pumpkin patch, laundry (white wool) on a fence line.
- Villagers: ~10 (librarian, farmer, cleric, a nitwit, two babies), NoAI, moved per shot. They path round the bed's
  ring in S01-S02.

## The east gate and the torch line
- A stone-brick arch at +12,0 (two 5-high posts, slab lintel), the square's east exit.
- The road east: a dirt path leaving the arch and climbing the first ridge.
- **The torch line:** a torch on a fence post every 8 blocks from +16,0, straight east over the ridges as far as the
  fog. The posts get mossier (mossy cobble base) close to the village (oldest) and plainer further out. It must read
  in S05 as a line of light points shrinking to the horizon; also catch its first posts in S01's background.

## Lighting
- Scene A morning (tick 1500): the sun low in the east lights the square from frame right in S01.
- Scene C night (tick 18000): the square's 6 lanterns are the only light; the bed is in the brightest spot; houses dark
  with one or two lit windows (lanterns indoors). The grade must keep the bed readable on a phone.
- Scene D dawn (tick 23300+): gold light from the east; S13 has the sun behind the camera so Walt and Grandma are lit
  front-on.

## Actors and effects the build needs
| need | how | status |
|---|---|---|
| three player actors with default skins (Ada alex, Hal kai, Walt steve) + the recording bot (noor) | `lib/movie.js` `spawnActors`, `cast` skins (docs/movie_engine.md on `agent/cinematic`) | exists on the movie branch |
| nameplates over the player actors ("Walt" must be readable in S13-S14) | vanilla draws player names; check render.js draws actor nameplates (renderer/entities.js has nameplates for mobs) | **check / small engine work** |
| Walt's death: the real vanilla message | teleport the Walt bot outside a small `/worldborder` placed far away in a separate area (or `/damage Walt 1000 minecraft:outside_border`), with his spawn set to the bed beforehand (`/spawnpoint Walt` at the bed or have him use the bed once in setup) | vanilla |
| the chat line on screen + in the caption track | the HUD chat line ("Walt left the confines of this world") and a caption | **check:** edit.py draws death screens and typed chat (`--chat`); a system chat line may need a small addition |
| Walt's respawn at the bed | the bot clicks Respawn; vanilla places him on the bed's stand-up spot (keep -1,0 clear so he lands on the west side, toward camera in S13) | vanilla; position it with `/tp` on the same tick if needed |
| market stalls, bed, lanterns, well | blocks; beds render | exists |
| one zombie in scene C | `mob('zombie', ...)` NoAI, turned away | exists |
