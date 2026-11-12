# honey_thief: set plan (r8, 2026-11-12)

Place `honey_meadow` (claimed on this branch in docs/world/map.json, day 4200): the High Meadow's top west of
Larkfield, footprint (-484, -754, -420, -678): natural meadow at y 116-120, Larkfield's box starts 15 blocks east
(x -405), the Cliff House 28 blocks west of the footprint (x -512). Origin O = (-452, 118, -716), the campfire
block; read the real ground y off the survey before building and move O in whole blocks only.

## The picture (top view, head north, all relative to O; x east, z south)
- **52 flower rows**, one per honey bottle, plus three unplanted stripes: the body runs z -32..+28.
- **Body:** a rounded oval 21 wide (x -10..+10) of wildflowers (flat covers) on grass, inside a 2-wide bare podzol
  outline round the whole bee (head, body, tail and wings): the outline carries the shape from above.
- **Stripes:** three bands of bare podzol, 3 rows deep, straight-edged and equal (so they read as design, not
  unfinished dirt): z -8..-6, +3..+5, +14..+16. Flower rows: 61 rows - 9 stripe rows = **52**.
- **Head:** z -32..-22, wildflowers, two 2x2 podzol eyes at x +-4, z -28 (head in wildflowers); two podzol antennae, 1 wide, diagonal out
  to (+-8, -37). **Row 52 is the head's crown, z -32, 9 wide**: the row the giant plants in S10.
- **Wings:** two ovals, left x -30..-11, right +11..+30, z -18..+4: 2-tall lilac (pale purple; reads from above
  better than any single flower), inside the podzol outline.
- **Tail:** z +22..+28 narrows to 3 wide (wildflowers; no separate stinger row).
- **Heart:** a pink heart 11 wide x 10 deep centred on O: pink_petals (flat, the best-reading flower from above),
  with a 1-wide rim of 2-tall rose bushes (it hides the low hive from the wings); the stripe at z +3..+5 stops at the heart's edge.
- **Hive:** the campfire sits in a 1-deep pit at O + (0, -1, 0) (open above), the beehive on a 1-block oak fence post at
  O + (0, 1, 0), 2 above the campfire (vanilla: within 5 below), face south; its top is at ground + 2, the same height
  as the rose-bush ring around it. Four bees home to it.
- Outside the picture: the meadow as generated, but no yellow, pink or purple flowers within 6 blocks of its edge.

## Gates before any recording (the critic's r1 must-fixes 3-4)
- **Readability (r8, from camera_world's test, docs/engine_proofs/camera_world/flower_readability.md):** from 90 up
  every cross-sprite flower (dandelion, poppy, daisy, lily of the valley) vanishes into the grass (dE 1-6); bare
  podzol (52) and pink_petals (35) read, lilac (19) and rose bushes (18) nearly. So the bee is drawn in flat covers,
  2-tall bushes and bare podzol (the plan above). Gate still holds: a 300 px top-down still of the built bee must read
  as a bee to a cold eye before recording; the podzol outline is 2 wide from the start (critic r3: the outline and the pink heart carry the read). Never
  paint the ground (concrete, wool): it's a meadow, and bees must still reach real flowers.
- **Framing:** S10 from ~90 blocks up: a 9:16 frame at vfov 70 is ~71 wide x ~126 tall; the 61-wide wings and the
  69-long bee fit with margin.
- **Sight lines:** a still from S09's eye (left wingtip, O + (-29, 1.5, -6)) shows no hive and no smoke; a still from
  S10's first frame shows the giant at the crown (O + (0, 0, -33)) over the flowers: he is 1.8 tall and on the near
  side of the rise, the hive is low behind the rose ring.

## The narration's claims, and what makes each true
| claim (line) | true because | check |
|---|---|---|
| 52 thefts, a row each (L01, L03) | 52 flower rows (61 rows less 9 stripe rows); S10 is row 52, the head's crown, being planted | count rows on the top-down still |
| smoke makes us sleepy and nice (L02) | a lit campfire within 5 blocks below a hive keeps bees from getting angry at a harvest ([Beehive#Harvesting](https://minecraft.wiki/w/Beehive), [Bee#Attacking](https://minecraft.wiki/w/Bee)); the smoke passes the hive's face | S02: smoke visible over the hive |
| clink, honey gone (L03) | a glass bottle on a full hive gives a honey bottle and resets it to level 0 | S01/S03 item swap |
| pink ones around our door (L07) | the heart's pink petals (and rose-bush rim) ring the post on every side | S07 orbit |
| the flowers never end; she goes to find the edge (L08) | bees roam ~22 blocks from the hive, farther if needed ([Bee#Behavior](https://minecraft.wiki/w/Bee)); the wingtips are 30 blocks out | S08 path length |
| I couldn't see home (L09) | bees hover only a few blocks up (Bee wiki); at the left wingtip (O + (-29, ~1.5, -5)) the meadow's rise and the heart's 2-tall rose bushes hide the 3-block hive; campfire smoke has faded by ~8 blocks up. **Live gate:** if the hive or smoke shows from S09's eye, lower the eye to 1.0 or turn the 180 away from it | a still from S09's eye toward O |
| she flies UP (L10) | the crane leaves from her POV at the wingtip; she is drawn as a yellow dot below the lens | S10 |
| all the flowers made one giant BEE, HOME in its HEART (L11) | the plan above; camera at O + (0, ~90, 0) straight down | top-down still |
| fifty-two bottles, fifty-two rows (L12) | 52 flower rows (61 rows less 9 stripe rows); the giant at row 52, the crown | count rows on the top-down still |

## Build notes
- A lib/sets build (`flower_bee`) from this plan; world.build stamps it from day 4200.
- Flowers are placed as blocks (wildflowers/pink_petals as flat covers, lilac/rose bushes 2 tall); the S03/S04/S10
  rows are placed live by the actor (under his crosshair).
- Render distance: the reveal needs only ~60 blocks; Larkfield's west roofs at the end of S07's orbit are 50-75 blocks east.
