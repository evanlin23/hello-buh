# honey_thief: set plan (r2, 2026-11-11)

Place `honey_meadow` (claimed on this branch in docs/world/map.json, day 4200): the High Meadow's top west of
Larkfield, footprint (-484, -746, -420, -686): natural meadow at y 116-120, Larkfield's box starts 15 blocks east
(x -405), the Cliff House 28 blocks west of the footprint (x -512). Origin O = (-452, 118, -716), the campfire
block; read the real ground y off the survey before building and move O in whole blocks only.

## The picture (top view, head north, all relative to O; x east, z south)
- **Body:** a rounded oval 21 wide (x -10..+10), z -26..+25 = **52 rows**, of dandelions (yellow), on grass.
- **Stripes:** three bands of bare podzol (no flowers), 4 rows deep each, at z -6..-3, +4..+7, +14..+17 (dark).
- **Head:** z -26..-17 of dandelions with two 2x2 podzol eyes at x +-4, z -22; two podzol antennae 1 wide running
  diagonally out to (+-8, -32) (inside the footprint).
- **Wings:** two ovals of white, left x -30..-11, right +11..+30, z -16..+6: oxeye daisies and lilies of the valley.
- **Tail:** z +18..+25 narrows to 3 wide (the stinger, podzol on the last 2 rows). Row 52 (z +25) is the one the
  giant plants in S10.
- **Heart:** a red heart 11 wide x 10 deep centred on O (z -5..+4 overlapping a stripe: the stripe stops at the
  heart's edge), poppies on the ground and rose bushes (2 tall) on its outer ring.
- **Hive:** beehive on an oak fence post at O + (0, 2, 0) (face south), the campfire at O. Four bees home to it.
- Outside the picture: the meadow as generated (grass, a few vanilla flowers ok but none yellow/red/white inside 6
  blocks of the picture's edge, so the outline reads).

## The narration's claims, and what makes each true
| claim (line) | true because | check |
|---|---|---|
| 52 thefts, a row each (L01, L03) | the picture has exactly 52 rows (z -26..+25); S10 is row 52 being planted | count rows on the top-down still |
| smoke makes us sleepy and nice (L02) | a lit campfire within 5 blocks below a hive keeps bees from getting angry at a harvest ([Beehive#Harvesting](https://minecraft.wiki/w/Beehive), [Bee#Attacking](https://minecraft.wiki/w/Bee)); the smoke passes the hive's face | S02: smoke visible over the hive |
| clink, honey gone (L03) | a glass bottle on a full hive gives a honey bottle and resets it to level 0 | S01/S03 item swap |
| red ones round our door (L07) | the heart's poppies and rose bushes ring the post on every side | S07 orbit |
| we fly farther every day (L08) | bees roam ~22 blocks from the hive, farther if needed ([Bee#Behavior](https://minecraft.wiki/w/Bee)); the wingtips are 30 blocks out | S08 path length |
| I couldn't see home (L09) | bees hover only a few blocks up (Bee wiki); at the left wingtip (O + (-29, ~1.5, -5)) the meadow's rise and the heart's 2-tall rose bushes hide the 3-block hive; campfire smoke has faded by ~8 blocks up. **Live gate:** if the hive or smoke shows from S09's eye, lower the eye to 1.0 or turn the 180 away from it | a still from S09's eye toward O |
| the giant still planting, way out there (L10) | he's at row 52 (O + (0, 0, +25)), ~38 blocks from the wingtip | S10 first frame |
| from above, a bee (reveal) | the plan above; camera at O + (0, ~55, 0) looking straight down, vertical frame: 52 rows tall fills ~70 % of the frame height | top-down still |

## Build notes
- A lib/sets build (`flower_bee`) from this plan; world.build stamps it from day 4200.
- Flowers are placed as blocks; the S03/S04/S10 rows are placed live by the actor (under his crosshair).
- Render distance: the reveal needs only ~60 blocks; Larkfield's west roofs in S08 are 30-50 blocks east.
