# goat_horn: continuity bible (r1)

## World
- **Vanilla rules the story rests on** (Java 1.21): a goat lowers its head and stamps before a ram (the "prepare ram"
  sound), then charges in a straight line at where its target stood, a ram that hits a player knocks them back hard
  in the charge direction, a goat that rams a block in `#snaps_goat_horn` (logs, stone, ores, packed ice) drops one of
  its two horns as a `goat_horn` item and is drawn without that horn afterwards, it never drops a horn from hitting a
  player or mob, and a dead goat drops none. A player landing in water 2+ deep takes no fall damage. A goat horn's
  call is heard 256 blocks away.
- **Where:** the mountain lake north of the carpeted village of Light Sleeper, at the start of the road to the far
  mines (provisional: re-check against docs/world/canon.md when it lands).
- **Scenes and time of day, in story order:**

| scene | lines | when | time (ticks) | light |
|---|---|---|---|---|
| A. yesterday's tries | L01-L04 | yesterday, noon | 6000 for S01-S04 | sun high, short shadows, the lake bright blue |
| B. this morning, home | L05-L07 | today | 1000 for S05-S07 | low sun in the east (frame left looking south, frame right looking north) |
| C. Dad leaves | L08 | today | 1500 for S08 | morning |
| D. the shelf, the road | L09-L13 | today | 2000 for S09-S13 | morning, no change across cuts |

- Weather: clear throughout. No fog wanted (`look.fog: false`), but S13 needs the cliff 125 blocks away drawn: render
  distance 12 chunks (192 blocks) or more. Season: late summer (green meadow, full leaves).
- **Numbers said and what the picture shows:**
  - "212 TIMES" (L01): not countable, S01 shows one knock (the 212th). S03 is the 213th, which Dad calls out in L04
    ("Two hundred THIRTEEN!"). No try after that: Dad leaves this morning without trying again (L08), so the count
    stops at 213, which is the number the kid has watched.
  - One goat, two horns until S11, one horn from S11 on. One goat horn dropped (S11), picked up (S11b), blown (S12).
  - One horn on Ida's wall (S05), a different horn.
  - One donkey with two chests. One map.
  - The road distance: Dad at S13 is ~125 blocks from the oak (horizontal 122, vertical 28): under the horn's 256.

## Places
Coordinates: the oak trunk's north-west corner is (0, 0, 0) at the shelf's ground level, +x east, +z south. The lake
is south of the cliff, its surface at y -28.

| place | where (x,z) | what's there | establishing shot (first seen) | changes during the story |
|---|---|---|---|---|
| shelf (cliff top) | x -8..12, z -14..2 | a meadow shelf on a natural mountain spur: grass, flowers, a mossy boulder at (-5,-3), stone outcrops behind, **the big oak** on the lip, 2x2 oak-log trunk (x 0..1, z 0..1), 13 high, broad canopy reaching out over the drop, the lip runs east-west at z 2, sheer below | S01 (from over the lake), S09 (crane up) | none (the oak is not dented: vanilla rams leave no mark) |
| cliff face | z 2..4, y 0 down to -28 | sheer stone (stone, andesite, a little moss), slightly overhanging so a knocked player clears it, the switchback stairs cut into its west end (stone-brick stairs, 3 flights, a rail of fence) from the shore at (-14,-28,8) to the shelf at (-7,0,-2) | S02 (from the shore, tilting up) | none |
| lake | south of the cliff, z 4..60, x -40..60 | deep water, 10+ deep under the cliff (Dad lands at about (2,-28,9)), shallows and reeds on the west shore | S01 (below), S02, S04 | splashes S01-S03 |
| west shore / lake_shore | (-20,-28,15) | reeds, gravel, the nitwit knee-deep at (-18,-28,13) | S02 | none |
| our cottage and gate | the slope on the lake's west shore, door at (-42,-24,26) facing east, gate at (-37,-24,26) | library `cottage`, spruce palette, garden, gate lanterns, chimney smoke | S06 | the donkey at the gate (S06-S07), gone in S08 |
| Ida's porch | next door, 12 blocks north-west of ours, door at (-52,-23,22) facing east | library `cottage`, plaster palette, an item frame with a goat_horn beside the door, south of it, at eye height (-52,-22,23) | S05 | none |
| shore road | from our gate east along the lake's south shore, then up the far slope to the mine, dirt path 3 wide, lamp posts | | S06 (bg), S08, S09 (bg) | Dad and the donkey on it in S08 and S13 |
| far road (S13) | (100,-20,70) on the road | road edge, a lamp post, the cliff and oak in the background (to the west-north-west) | S13 | Dad turns |
| the mine | the far ridge, portal at (190,-5,95) | library `mine` piece | S06 (upper right), S08 (bg) | none |

## Cast and costume
| who | mob / skin | outfit, held item | name tag | where in each scene | state changes |
|---|---|---|---|---|---|
| me (N), Milo as a kid | the bot, POV, default Steve skin in camera shots | empty hand until S11b, then the goat horn (hotbar slot 1), no armour, full hearts | none | A: not on screen (he watches from below), B: the lane past Ida's (S05), the gate (S06 on the doorstep, S07 at the gate), D: the dad spot (2.35,0,-1) facing north (S09-S10), one block east of it after the step (3.35,0,-1) (S11-S12) | none (never rammed) |
| Dad | player actor, jar skin `kai` (check it reads as a grown man beside Milo's Steve on the shot sheet, fallback `sunny`) | iron helmet, leather chestplate in every scene, empty hand in A, a filled map in his main hand in B-D | none | A: the dad spot (2.35,0,-1) facing north (S01, S03), the lake (S02, S04), B: beside the donkey at the gate (S06), 2 blocks from me (S07), C: on the shore road walking east (S08), D: on the far road (100,-20,70), walking east toward the camera, then turned west (S13) | none (soaked is not drawn) |
| the goat | goat (adult, not screaming), NoAI, staged | both horns until S11's ram, the left horn gone after it | none | the shelf, goat spot (2.35,0,-7) facing south (S01, S03, S09, S10), at the trunk after the ram (S11), peering round the trunk's west side (S12), small on the empty shelf in S08 | loses one horn in S11 |
| the donkey | donkey with chests (two saddlebag chests), NoAI, led beside Dad | | none | B: tied at our gate (S06-S07), C: beside Dad on the road (S08), D: beside Dad (S13) | none |
| Ida | villager, plains shepherd (an old lady by the story, no voice) | | none | B: her doorway (S05) only | none |
| the nitwit | villager, nitwit (green coat): the easter egg | | none | A: knee-deep in the shallows at (-18,-28,13), facing the cliff (S02) only | none |

## Props
| prop | first seen | state | where exactly | later |
|---|---|---|---|---|
| the big oak | S01 (frame 1) | whole | trunk x 0..1, z 0..1 on the lip | S02 skyline, S03, S07 skyline, S08, S09-S12, S13 (bg, small) |
| Ida's goat horn | S05 | in an item frame, fixed | (-52,-22,23), beside Ida's door | none |
| the map | S06 | in Dad's hand | | S07, S08, S13 |
| the donkey's chests | S06 | strapped on | | S08, S13 |
| the dropped goat horn | S11 ("Out popped") | an item on the grass, spinning | (1.5,0,-1.5), by the trunk's north face | S11b picked up, S12 in Milo's hand, raised and blown |
| the mine portal | S06 | | (190,-5,95) | S08 |

## Positions and screen direction
- The ram line runs north to south: the goat at (2.35,0,-7), Dad (or Milo) at (2.35,0,-1), the trunk's east edge at x 2,
  the lip at z 2. Dad stands a third of a block east of the trunk's edge: his 0.6-wide body is launched clear past the
  trunk's east face and off the lip, the goat's 0.9-wide body overlaps the trunk, so with nobody there it hits it.
- S03 and S11 are the same side-on camera from the west (7 blocks west of the ram line, looking east): the goat enters
  from frame left (north), the drop is at frame right (south). Kept the same for the rewatch: same frame, different
  result.
- S10 (POV) faces north at the goat, the step is to the east (the frame slides right).
- S12 looks north at Milo from over the drop: the oak behind him, the goat at frame left (west of the trunk).
- S13 looks west back along the road: Dad faces the camera, then turns his back to it to face the cliff in the
  background. The horn's call comes from the cliff's direction.
- S01 looks north-west at the cliff from over the lake, S08 looks east from above our cottage (the cliff at frame left).

## The narrator
- POV in S05, S07, S10, S11b. Seen from outside: S06 (small, on the doorstep), S09 (from the crane, front), S11 (small,
  beside the trunk), S12 (MS, front).
- Not present in scene A on screen, the narration is his memory of watching from the shore.
- Held item: empty until S11b, the goat horn from S11b, the horn to the mouth (the `use` pose, ArmPose.TOOT_HORN) in S12.
- Hearts full, no armour, hunger full. Never sneaking.

## Who knows what
| line | the narrator knows | Dad knows | the viewer can know |
|---|---|---|---|
| L01-L03 | Dad gets knocked off a lot and tries to dodge so it hits the oak | he's after a horn | Dad wants the goat to hit the tree |
| L04 | Dad keeps count | how many tries | it's a project, not a fight |
| L05 | Ida has a horn and "a goat missed her" (thinks it's a fib) | | players: horns come from goats hitting blocks |
| L06-L07 | Dad's leaving all winter and "can't go without one thing" (thinks: revenge) | the one thing is a horn for his kid | the attentive viewer: the horn is for the kid |
| L08 | Dad left anyway | he failed and had to go | |
| L09-L10 | he's finishing the grudge for Dad, he knows the tell | (on the road) | everyone: the goat will hit the oak |
| L11-L12 | the horn was what Dad wanted, for him | | the horn is for calling |
| L13 | Dad heard it | his kid has the horn | it worked, from 125 blocks |

## Clue map
See `beats.md` (clue map table): the oak behind Dad (S01-S03), the dodge (L03, S03), the tell (S03, S10), the count
(L04), Ida's horn (S05, L05), the donkey, map and mine (S06, L06), "one thing" (L07), Dad gazing at the cliff (S07),
the road seen from the cliff (S08, S09).
