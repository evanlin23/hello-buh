# scarecrow: continuity bible (r1)

## World
- **Vanilla rules the story rests on** (Java 1.21):
  - A snow golem places a snow layer in the air cell at its feet as it moves (four points round its feet), where the
    biome temperature there is below 0.8, the cell is empty and the block below has a full top face, with
    `mobGriefing` on. So: no snow in plains (exactly 0.8), snow in a meadow (0.5). No snow on farmland or dirt path
    (not full blocks), none in the wheat (the cell isn't empty), none where flowers stand.
  - Snow layers don't melt in sunlight, only next to block light above 11. So the trail stays until the boy shovels it
    (a shovel on a snow layer drops a snowball).
  - A meadow (0.5) gets rain, never snow (snowfall needs under 0.15). "It does NOT snow here. EVER." is true.
  - A snow golem targets hostile mobs it can see within 16 blocks, walks until it is within 10 blocks with a clear
    line of sight, stops, and throws a snowball about once a second. Snowballs do no damage to zombies, only knockback
    along the throw. Zombies never target snow golems.
  - Zombies hunt players within 35 blocks and press against the wall nearest the player when they can't get in. On
    normal difficulty they can't break doors. They burn in direct sunlight and drop rotten flesh (0-2), which lies on
    the ground for 5 minutes.
  - Rain, water and hot biomes hurt snow golems. **Risk, stated honestly:** in vanilla a meadow does rain every few
    days, and a golem in the open would melt in the first shower. The story never claims it doesn't rain; it shows only
    clear mornings and nights. If the critic or the minecraft-audit asks, the answer is "a dry summer", and the fix if
    needed is cheap: one line of set dressing (Grandpa's field has a lean-to by the scarecrow spot) with no script
    change. Logged here, not hidden.
- **Why it's there (backstory, never said):** Grandpa (a player, like Milo; Dad's side of a mixed family) knew zombies
  came for the boy's wall every night. The week before he died he stacked two snow blocks in his wheat and put one of
  his carved pumpkins on top. Mom thinks he built a scarecrow. Nobody has gone into his field since (the wheat stands
  ripe, unharvested).
- **Scenes and time of day, in story order:**

| scene | lines | when | time (ticks) | sun / light |
|---|---|---|---|---|
| A. the mornings | L01-L04 | a morning (the 63rd) | 1000 for every shot (S01-S04) | sun low in the east, behind S01's camera (it lights our back wall, which faces east) |
| B. some night | L05 | a night in the 63 | 18000 | inside: one lantern on the far wall, moonlight in the shutter slats |
| C. a morning | L06-L08 | the same morning as A (the flesh is there because zombies burned at sunrise) | 1000 | as A |
| D. last night | L09-L11 | last night (the 63rd night) | 18000 for every shot | full moon high; the farmhouse porch lantern; Milo's room lantern **off** from S09 to the end (he waits in the dark), so S11's window is lit by the moon only and his face reads in moonlight; add a lantern on a post at the cottage's back corner (0,-8) if S11 reads too dark at 300 px |

- Weather: clear throughout (`weather: clear`). Season: summer (wheat ripe, flowers, green grass).
- **Numbers said and what the picture must show:** "SIXTY-THREE mornings" (a count; not shown); one trail (one line of
  snow, not 63: he shovels it daily); one scarecrow; "ROTTEN FLESH" (two items in S06); three zombies at the reveal
  (none said); one golem; four carved pumpkins on the porch (none said); "the week before he died" (not shown).

## Places
Coordinates: the origin (0,0,0) is the foot of our cottage's back (east) wall, outside, under the middle of my bedroom
window; y 0 = the grass level there. +x east (toward the field), +z south.

| place | where (x,z) | what's there | establishing shot (first seen) | changes during the story |
|---|---|---|---|---|
| cottage (ours) | x -15..0, z -8..8; back (east) wall at x 0 | the `cottage` piece facing west (door and garden on the far side), its back on the downhill side: stone foundation, interior floor 2 blocks above the outside grass; my bedroom window (the back window) over the bed, glass swapped for two spruce trapdoor shutters, opening at y 3-4, no outside sill (no foothold) | S01 (from the scarecrow), S02 (from above) | S10: the shutters swing up and stay open through S11 |
| bedroom | inside the cottage's back half | the bed under the back window (red blanket), the table and two chairs, a lantern on the far (west) wall | S05 (WS from the `inside` corner) | the lantern on in S05, off in S09-S11 |
| yard / trail | x 0..19, z -8..4 | meadow grass mown short (no flowers on the trail line), flowers either side; the trail: one snow layer wide (1-2 blocks), from the field's fence gap (19,0) to the patch | S01 | morning: the trail and patch present (S01-S04); S03: 2 blocks of it dug out near (15,-2); night: the golem on the patch in S11 |
| the patch | centred (6,-6) | 3x3 snow layers with ragged edges (the golem shuffles while it throws), 8 blocks from the window, facing it | S04 | S11: the golem stands on it |
| field | x 19..38, z -4..11 (the `farmhouse` piece's fields) | four fenced plots: wheat (north-west, where the scarecrow stands), carrots, potatoes, beetroot, water channels; the west fence has a 3-wide gap at z -1..1 (the golem's way out) | S01, S02 | the scarecrow spot (21,0) is empty in S10-S11 |
| scarecrow spot | (21,0), in the north-west wheat plot, west of its water channel | the "scarecrow" (the snow golem) facing west toward our cottage, wheat to its middle | S01 (its back), S07 (small), S08 (its face) | empty at night (S10, S11) |
| farmhouse porch | the farmhouse at x 19..29, z -16..-10; porch z -9..-7 facing south over the field | Grandpa's old farmhouse (Mom works here now): porch with bench, lantern, and a row of four carved pumpkins (faces out) along its front edge | S07 | none |
| barn, paddock | barn x 40..50, z -16..-6; paddock x 42..50, z -4..9 | the piece's barn and paddock with four cows; the nitwit (easter egg) among them in S07 | S02, S07 | none |
| village | 40-70 blocks west, down the slope | plains-style village houses (meadow biome) | S02's background | none |

## Cast and costume
| who | mob / skin | outfit, held item | name tag | where in each scene | state changes |
|---|---|---|---|---|---|
| me (N): Milo, nine | the bot (POV); default Steve skin in camera shots | A: iron shovel (hotbar 1), snowballs land in slot 2 in S03; B, D: empty hand | none | A: S03 on the trail at (15,-2) facing west; B: sitting on his bed (S05); D: sitting on the bed (S09), standing at the window (S10-S11) | none (full hearts throughout) |
| the "scarecrow" | snow golem (pumpkin on: the carved pumpkin head) | none | none | mornings (A, C): standing in the wheat at (21,0), facing west, NoAI for the takes; night D: on the patch at (6,-6) facing the window wall, throwing (S11) | none |
| Mom | villager, plains farmer outfit | nothing held | none | C: on the farmhouse porch at (25,-8) looking south-west at the field (S07) | none |
| zombies (3) | adult zombies, no armour, nothing held | | none | B: heard only (S05); D: at the foot of our back wall at (0.5..1.5, -1..2), arms up, facing the window; knocked south along the wall on each hit, walking back | none die on screen (no damage from snowballs) |
| the nitwit (easter egg) | villager, nitwit (green coat) | | none | C: standing in the paddock among the cows, S07 background | none |
| cows (4) | cows | | | the paddock, S02 and S07 | |
| Grandpa | never seen | | | | |

## Props
| prop | first seen | state | where exactly | later |
|---|---|---|---|---|
| the trail | S01 | one snow layer, 1-2 blocks wide, from (19,0) to the patch | yard | S02 (from above), S03 (2 blocks dug out near (15,-2)), S04, S10 (moonlit), S11 |
| the patch | S01 (left of the window), S04 | 3x3 snow layers, ragged | (6,-6) | S11 under the golem |
| rotten flesh | S06 | two dropped items, bobbing and turning | the foot of the wall at (0.8, 0, 0.5) and (1.2, 0, -0.8), beside a bare coarse-dirt spot | none (gone by night) |
| shutters | S01 (closed, from outside) | two spruce trapdoors filling the window, closed (vertical) | the back window (0, 3-4, -0.5..0.5) | S04, S05, S09 closed; S10 opened on "OPENED" (flat at the top of the opening); open in S11 |
| carved pumpkins | S07 | four, faces out | the farmhouse porch's front edge, x 21..27, z -7 | S08's background |
| shovel | S03 | iron shovel in hand | hotbar 1 | only S03 |
| snowballs | S03 (one pops out of the dug snow and is picked up) | hotbar 2 | | the golem's in S10 (one streak) and S11 |
| the fence gap | S01 | 3 fence posts missing from the field's west fence | (19, -1..1) | none |

## Positions and screen direction
- The axis of the story is the trail: **field east, cottage west.** In S01 we look west from the field (the cottage
  ahead); in S03 west along the trail; in S04 south-west at the patch and wall; in S08 east at the scarecrow's face;
  in S10 east out of the window; in S11 north-west from the yard's south-east at the wall and the golem.
- The patch is north-east of the window (8 blocks out, 6 north): from the window looking straight east, it's off frame
  left. That keeps the golem out of S10's POV ("the scarecrow was GONE") and makes each snowball shove the zombies
  south along the wall, away from the window, in S11.
- S07 looks north-west at the porch with the field at frame left; the barn and paddock at frame right.

## The narrator
- POV in S03, S09, S10; seen from outside in S05 (small, sitting on his bed) and S11 (head and shoulders in the open
  window, from 11-14 blocks).
- Held item: the iron shovel in S03 (hotbar: shovel, snowballs after the dig); empty hand in S09-S10 (the hand flips
  the shutters). Hearts and hunger full; no armour.
- Where he is for each line matches the picture: L03 on the trail; L05 on his bed; L09 on his bed; L10 at the window;
  L11 in the window.

## Who knows what (line by line)
| line | the narrator knows | Mom knows | the viewer can know |
|---|---|---|---|
| L01-L03 | snow comes from the scarecrow every night in a place it never snows | there's frost or snow some mornings, maybe; she doesn't go out back | players: a snow golem leaves snow trails |
| L04 | it ends where someone seems to stand facing his window | | the trail ends at a post |
| L05 | groaning at night; he never looks | | players: zombies outside his wall |
| L06 | rotten flesh under the window | | players: zombies died there (sunrise) |
| L07 | Grandpa built the scarecrow just before he died | that's all she knows | Grandpa made it on purpose |
| L08 | Grandpa promised to keep an eye on him; finds it creepy | | attentive viewers: the scarecrow is Grandpa's watcher |
| L09-L10 | he wants to catch it; the scarecrow isn't in the field | | it's already at his wall |
| L11 | it's Grandpa's guard | | the whole truth |

## Clue map
See `beats.md` (clue map table): the trail from the scarecrow (L01, S01), no snow ever (L02), it comes back (L03), the
patch (L04, S04), the groans (L05), the flesh (L06, S06), Grandpa built it (L07), the porch pumpkins (S07), the promise
(L08), the face (S08), the empty spot (L10, S10).

## Easter egg (shared world)
The village nitwit in his green coat (story_nitwit), standing in our paddock among the cows in S07's background.
**Provisional: re-check against docs/world/canon.md when it lands.**
