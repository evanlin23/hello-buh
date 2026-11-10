# scarecrow: continuity bible (r2)

## World
- **Vanilla rules the story rests on** (Java 1.21):
  - A snow golem lays a snow layer in the empty cells under its feet as it moves, where the biome temperature is below
    0.8, the block below has a full top face, and `mobGriefing` is on.
    - Plains is exactly 0.8, so it lays nothing there. A meadow is 0.5, so it lays snow.
    - It lays none on farmland or dirt path, none in the wheat, and none on flowers.
  - Snow layers melt only next to block light above 11, never in sunlight. The trail stays until it is shoveled, and a
    shovel on a snow layer drops a snowball.
  - A meadow gets rain, never snow, because snow needs a temperature under 0.15.
  - A snow golem:
    - targets hostile mobs it can see within 16 blocks,
    - walks until it is within 10 blocks and has a clear line of sight,
    - then stops and throws a snowball about once a second.
  - Snowballs do no damage to zombies, only knockback along the throw. Zombies never target snow golems.
  - Zombies:
    - hunt players within 35 blocks,
    - crowd the wall nearest a player they can't reach (normal difficulty: no door breaking),
    - burn in sunlight and drop 0-2 rotten flesh, which lies for 5 minutes.
- **Known stretches** (stated honestly for the minecraft-audit, never claimed on screen):
  1. **Rain.** Rain hurts snow golems, and a meadow rains every few days.
     - The story shows only clear mornings and nights. The answer is "a dry summer".
     - The cheap fix if asked: a lean-to roof by the scarecrow spot (set dressing, no script change).
  2. **Back at its spot by dawn.** Vanilla gives a snow golem no home.
     - After the last zombie burns at dawn it wanders.
     - We show one morning (the 63rd) with it at its spot, which a wander can produce. Nothing says it returns there
       every day.
- **Backstory (never said).**
  - Grandpa was a player like Milo (a mixed family).
  - He knew zombies came for the boy's wall at night.
  - The week before he died he stacked two snow blocks in his wheat, beside a lantern post, and put one of his carved
    pumpkins on top.
  - Mom calls it his snow scarecrow.
  - Nobody has gone into his field since: the wheat stands ripe and unharvested.
- **Scenes and time of day, in story order:**

| scene | lines | when | time (ticks) | light |
|---|---|---|---|---|
| A. the morning | L01-L03 | yesterday morning (the 63rd) | 1000 (S01-S04) | sun low in the east, behind S01's camera, lighting our east-facing back wall |
| B. every night | L04 | any night of the 63 | 18000 (S05) | inside: the hanging lantern and the hearth campfire both lit; moonlight in the shutter slats |
| C. the same morning | L05-L07 | yesterday morning (as A) | 1000 (S06-S08) | as A |
| D. last night | L08-L11 | last night (the 63rd night) | 18000 (S09-S11) | full moon; the lantern post in the wheat (22, 1, 3), the farmhouse porch lantern, the post at the cottage's back corner (1, -9). **Milo's room is dark**: the hanging lantern taken down, the hearth `campfire[lit=false]` |

- Weather: clear throughout. Season: summer (ripe wheat, flowers, green grass). No fog (`look.fog: false`): the
  distance is haze and hills.
- **Numbers.** Said: "SIXTY-THREE mornings" (a count, not shown). Shown but never said:
  - one trail (shoveled daily),
  - one scarecrow,
  - two rotten flesh in S06,
  - three zombies and one golem in S11,
  - four carved pumpkins on the porch (S07),
  - four shutters.

## Places
Coordinates: the origin is the foot of our cottage's back (east) wall, outside, under the middle of my window. +x is
east (the field), +z south. **Every y is height above the local ground at that x,z.** The ground falls 2-4 blocks
from the cottage (x 0) to the field (x 19+).

| place | where (x,z) | what's there | establishing shot | changes |
|---|---|---|---|---|
| cottage (ours) | x -15..0, z -8..8; back wall on x 0 | The `cottage` piece facing west, with its back on the downhill side. That gives it a stone foundation, and the floor sits 2 above the outside grass. My window is the back window over the bed: **2 wide x 2 high**, at z -1..0, y 3-4 above the outside grass. Its glass is replaced by **four spruce trapdoors**, and there is no outside sill. Along the back wall, south of the window, are the piece's rain barrel, water cauldron and composter (z 4..6), in S06 and S11 | S01, S02 | S10: the four shutters open (the lower pair `half=bottom`, the upper pair `half=top`, all `open=false`) and stay open in S11 |
| bedroom | the cottage's back half | the bed under the window (red blanket), table and chairs, the hanging lantern, the hearth campfire | S05 (FS) | S05 lantern and campfire lit; S09-S11 lantern removed and the campfire out |
| yard / trail | x 0..19, z -9..4 | Mown meadow grass with flowers either side. The trail is one snow layer, 1-2 blocks wide, curving from the fence gap (19, 0) to the patch | S01 | A/C: the trail is there (S03 digs 2 blocks near (15, -2)). D: the golem has laid it again by S10 |
| the patch | 3x3 centred (6, -6) | snow layers with ragged edges, 8 blocks from the window, facing it | S04 | S11: the golem on it |
| field | x 19..38, z -4..11 (the `farmhouse` piece) | Four fenced plots on channels. The west fence has a 3-wide gap at (19, -1..1) | S01, S02 | none |
| scarecrow spot | (21, 0): a 1x1 coarse-dirt gap in the north-west wheat plot, west of its channel | The golem stands in the gap, facing west. A fence post with a lantern stands at (22, 1, 3) | S01 (from behind), S07 (small), S08 (its face) | D: the gap is empty and lit by the lantern (S10b) |
| farmhouse porch | the farmhouse at x 19..29, z -16..-10; the porch at z -9..-7 | Grandpa's farmhouse: a bench, a lantern, and four carved pumpkins on the porch's front edge, faces out | S07 | none |
| barn, paddock | barn x 40..50, z -16..-6; paddock x 42..50, z -4..9 | four cows; in S02 the nitwit stands among them | S02 | none |

The village itself is off screen, down the south slope. Nothing in a frame claims it.

## Cast and costume
| who | mob / skin | held item | where in each scene | state changes |
|---|---|---|---|---|
| me (N): Milo, nine | the bot (POV); default Steve skin in camera shots | Hotbar: 1 iron shovel, 2 snowballs (already a stack; S03 adds one), 3 empty. Selected: slot 1 in S03, slot 3 (an empty hand) in S09-S10 | A: on the trail at (15, -2), facing west (S03). B: sitting on his bed facing into the room (S05). D: sitting on the bed facing the shutters (S09); standing at the window (S10, S11: head and shoulders in the opening) | none |
| the "scarecrow" | snow golem with its carved pumpkin | none | A/C: in the gap at (21, 0), facing west (NoAI for the takes), the white body inside the wheat up to its middle. D: on the patch at (6, -6), facing the wall, throwing (S11) | none |
| Mom | villager, plains farmer | none | C: on the porch at (25, -8), looking south-west at the field (S07) | none |
| zombies (3) | adult zombies, no armour | none | B: heard only. D: at the foot of the back wall, (0.5..1.5, -1..2), arms up, facing up at the window; shoved south along the wall on each hit, walking back | none die on screen |
| the nitwit (easter egg) | villager, nitwit | none | A: standing among the cows in the paddock (S02) | none |
| cows (4) | cows | | the paddock (S02) | |
| Grandpa | never seen | | | |

## Props
| prop | first seen | state | where | later |
|---|---|---|---|---|
| the trail | S01 | one snow layer, 1-2 wide | (19, 0) to the patch | S02, S03 (2 blocks dug), S04, S10 (moonlit) |
| the patch | S01 (right of centre), S04 | 3x3, ragged | (6, -6) | S11 under the golem |
| the lantern post | S01 (frame left) | a fence post with a lantern on top, lit | (22, 1, 3) | S07, S08, S10 (distant), S10b (lights the gap) |
| the corner lantern post | S11 | a fence post with a lantern, lit | (1, -9) | S11 only |
| rotten flesh | S06 | two dropped items, bobbing and turning | (0.8, 0, 0.5) and (1.2, 0, -0.8) | gone by night |
| shutters | S01 (closed, from outside) | four spruce trapdoors, closed (vertical) | the window (0, 3-4, -1..0) | S04, S05, S09 closed; S10 open on "OPEN"; S11 open |
| carved pumpkins | S07 | four, faces out | the porch edge, x 21..27, z -7 | none |
| shovel | S03 | iron, in hand | hotbar 1 | S03 only |
| barrel, cauldron, composter | S06 (frame left) | the cottage piece's, along the back wall | z 4..6 at x 0 | S11 (the wall) |

## Positions and screen direction
- The trail runs east-west: the field is east, the cottage west.
  - S01 and S03 look west.
  - S04 looks south-west.
  - S07 looks north-west at the porch.
  - S08, S10 and S10b look east.
  - S11 starts looking down from the window, then looks north-west at the wall.
- The patch is north-east of the window (6 north, 6 out). From the window looking east it sits about 45 degrees left,
  outside S10's frame, so the yard ahead reads empty. Each snowball shoves the zombies south along the wall, away
  from the window.
- In S11's end frame: the window and the zombies are at frame left, the golem at frame right.

## The narrator
- POV in S03, S09 and S10. In camera shots in S05 (sitting on his bed) and S11 (head and shoulders in the window).
- Hearts and hunger full, no armour.
- Where he is for each line: L02 on the trail (from "I shovel"), L04 on his bed, L08 on his bed, L09 at the window,
  L11 in the window.

## Who knows what (line by line)
| line | the narrator knows | Mom knows | the viewer can know |
|---|---|---|---|
| L01-L02 | snow comes from the scarecrow every night, in a place it never snows | | players: snow golems leave trails |
| L03 | it ends where someone seems to stand staring at him | | the trail ends at a post |
| L04 | groaning every night; he never looks | | players: zombies at his wall |
| L05 | rotten flesh under the window | | players: zombies died there at sunrise |
| L06 | Grandpa built it out of snow, just before he died | that's all she knows | the snow comes from the scarecrow |
| L07 | Grandpa promised to keep an eye on him; finds it creepy | | attentive viewers: a golem, a guard |
| L08-L10 | he wants to catch it; it's gone from the field | | it's somewhere near him |
| L11 | the zombies were the danger, the scarecrow his guard | | the whole truth |

## Clue map
The full table is in `beats.md`.

## Easter egg (shared world)
The village nitwit in his green coat (story_nitwit), standing among the cows in our paddock, in S02's background.
**Provisional: re-check against docs/world/canon.md when it lands.**
