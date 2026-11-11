# honey_thief: set plan (r3, 2026-11-11)

Place `honey_meadow` (claimed on this branch in docs/world/map.json, day 4200): the High Meadow's top west of
Larkfield, footprint (-484, -754, -420, -678): natural meadow at y 116-120, Larkfield's box starts 15 blocks east
(x -405), the Cliff House 28 blocks west of the footprint (x -512). Origin O = (-452, 118, -716), the campfire
block; read the real ground y off the survey before building and move O in whole blocks only.

## The picture (top view, head north, all relative to O; x east, z south)
- **52 flower rows**, one per honey bottle, plus three unplanted stripes: the body runs z -32..+28.
- **Body:** a rounded oval 21 wide (x -10..+10) of dandelions on grass.
- **Stripes:** three bands of bare podzol, 3 rows deep, straight-edged and equal (so they read as design, not
  unfinished dirt): z -8..-6, +3..+5, +14..+16. Flower rows: 61 rows - 9 stripe rows = **52**.
- **Head:** z -32..-22, dandelions, two 2x2 podzol eyes at x +-4, z -28; two podzol antennae, 1 wide, diagonal out
  to (+-8, -37). **Row 52 is the head's crown, z -32, 9 wide**: the row the giant plants in S10.
- **Wings:** two ovals of white, left x -30..-11, right +11..+30, z -18..+4: oxeye daisies and lilies of the valley.
- **Tail:** z +22..+28 narrows to 3 wide (dandelions; no separate stinger row).
- **Heart:** a red heart 11 wide x 10 deep centred on O, rose bushes (2 tall, they read from above) with poppies
  between; the stripe at z +3..+5 stops at the heart's edge.
- **Hive:** the campfire sits in a 1-deep pit at O + (0, -1, 0) (open above), the beehive on a 1-block oak fence post at
  O + (0, 1, 0), 2 above the campfire (vanilla: within 5 below), face south; its top is at ground + 2, the same height
  as the rose-bush ring around it. Four bees home to it.
- Outside the picture: the meadow as generated, but no yellow, red or white flowers within 6 blocks of its edge.

## Gates before any recording (the critic's r1 must-fixes 3-4)
- **Readability:** cross-shaped flower sprites thin out from straight above. Build a 20 x 20 test patch and take a
  top-down still at 300 px wide: if the colours don't read, (a) tilt S10's settle to ~75 deg down, (b) thicken with
  the flat 1.21.5+ covers (wildflowers for yellow-white, pink_petals) where bees can still reach real flowers, in that
  order. Never paint the ground (concrete, wool): it's a meadow.
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
| red ones around our door (L07) | the heart's poppies and rose bushes ring the post on every side | S07 orbit |
| the flowers never end; she goes to find the edge (L08) | bees roam ~22 blocks from the hive, farther if needed ([Bee#Behavior](https://minecraft.wiki/w/Bee)); the wingtips are 30 blocks out | S08 path length |
| I couldn't see home (L09) | bees hover only a few blocks up (Bee wiki); at the left wingtip (O + (-29, ~1.5, -5)) the meadow's rise and the heart's 2-tall rose bushes hide the 3-block hive; campfire smoke has faded by ~8 blocks up. **Live gate:** if the hive or smoke shows from S09's eye, lower the eye to 1.0 or turn the 180 away from it | a still from S09's eye toward O |
| the giant still planting, way out there (L10) | he's at row 52, the crown (O + (0, 0, -33)), ~40 blocks from the wingtip | S10 first frame |
| from above, a bee (reveal) | the plan above; camera at O + (0, ~90, 0) looking straight down (or ~75 deg, the readability gate) | top-down still |

## Build notes
- A lib/sets build (`flower_bee`) from this plan; world.build stamps it from day 4200.
- Flowers are placed as blocks; the S03/S04/S10 rows are placed live by the actor (under his crosshair).
- Render distance: the reveal needs only ~60 blocks; Larkfield's west roofs in S08 are 30-50 blocks east.
