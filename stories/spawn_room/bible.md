# spawn_room: continuity bible

## World
- **Vanilla rules the story rests on** (Java 1.21): a player joining for the first time appears at the world spawn
  (exactly on it with the spawn-radius gamerule at 0); a player with no bed respawns there after dying, without their
  items; "<name> joined the game" is broadcast in yellow on every join; a compass points at the world spawn (in hand and
  in an item frame); breaking the bottom log of a tree leaves the rest hanging. The world spawn is set with
  `/setworldspawn` on the floor block beside the boy's bed (the "bedside block", the north side of the bed).
- **Who the narrator is:** a boy born in this world who lives with his grandpa in the oldest house, which happens to be
  built over the world spawn. He is never seen. He doesn't know what players are; neither the script nor the picture
  says whether he is one.
- **Scenes and time of day, in story order:**

| scene | lines | when | time (ticks) | light |
|---|---|---|---|---|
| A. the strangers (a montage of many nights) | L01-L02 | night | 18000 | moon through the window (east wall), lantern on the west wall |
| | L03 | the next dawn | 23500 | sunrise ahead of the door (the door faces east) |
| | L04 | morning | 1500 | sun high-left of the cottage in S04 |
| | L05 | another night | 18000 | as L01 |
| | L06 | a day, "a year later" | 6000 | daylight through the window |
| B. grandpa | L07 | evening, kitchen | 12500 | lantern |
| C. the compasses | L08-L09 | day, the village | 4000 | |
| D. the journey | L10 | dawn, day 1 | 23500 | |
| | L11 | dusk, day 3, far away | 12500 | sunset behind the ridge |
| | L12 | night, day 3 | 17000 | moon behind the cottage (the hill in silhouette) |
| E. the reveal | L13, S14 | the same night | 17500 | moon + lantern |
| | L14 | the next dawn | 23500 | sunrise behind the cottage |

- Weather: clear throughout. Season: summer.
- **Numbers said and what the picture must show:** "forty-one strangers" (not shown at once; the montage shows 4
  different ones: Kai, Alex, Kai again, Steve); "every tree near our house" (40+ floating trees round the cottage, none
  whole within 25 blocks); "every compass in the village" (8 in item frames at the stall, all pointing the same way, up
  the hill); "three days" (S11 is dusk, far from home); the flood: Noor + 11 = 12 strangers in S14 and S15 (count them).

## Places
| place | where (x,z from origin = the bedside block) | what's there | establishing shot | changes |
|---|---|---|---|---|
| bedroom | (0,0), ground floor, 9 x 9 inside, 4 high | the bed along the north wall (head west), the bedside block south of it (the spawn), a lantern (west wall), window (east wall), bedroom door (south wall, onto the hall; the cottage's front door is at the hall's east end and faces east), a carpet runner from the bedroom door, a chest | S01 (WS) | S06: a cake on the bedside block's east neighbour (not on the spawn block); S14: 12 strangers |
| kitchen | the cottage's other room, (6,0) | table, two chairs, a cartography table, maps, shelves, lantern, window | S07 (MS, inside the cottage already established by S01/S04) | none |
| hilltop_yard | outside the cottage door, (0,8) | a path down the hill, floating trees all round | S03 (WS from the door) | S03: one more oak loses its bottom log; S15: 12 more trees float |
| hill_wide | the slope below, (40,30) to the cottage | the whole hill, the cottage, 40+ floating trees, the valley | S04 (EWS) | S12 at night; S15 at dawn with 12 strangers |
| village_stall | in the valley, (70,90), the market street | Grandpa's cartographer stall: counter, a wall of 8 item frames with compasses facing the street, a cartography table; the hill and cottage visible up the slope behind | S08 (WS) | none |
| far_ridge | far away, a different terrain (another seed area or 1,000+ blocks off) | a rocky ridge, a river valley below, mountains | S11 (EWS) | none |

## Cast and costume
| who | mob / skin | outfit, held item | name | where in each scene | state changes |
|---|---|---|---|---|---|
| me (N) | POV, the bot | empty hand in A-C; compass in hand from S10 to S13 | none shown | doorway of the bedroom (S01, S06, S13), bed foot (S05), cottage door (S03, S10), kitchen table (S07), stall (S08-S09), far ridge (S11), foot of the hill (S12) | none |
| Grandpa | villager, plains, cartographer (monocle) | nothing in hand (maps on the table) | none | B: kitchen table, seated side-on, facing his maps; C: behind the stall counter | none |
| Kai | player, default skin Kai | empty hands | "Kai" (join) | S01-S02 by the bed; S05 by the bed again (respawned) | dies off screen between S03 and S05 |
| Alex | player, default skin Alex | empty, then a log (S03) | "Alex" | S02 appears on the bedside block; S03 outside punching | |
| Steve | player, default skin Steve | empty after placing the cake | "Steve" | S06 walking out of frame right | |
| Noor + 11 | players, default skins (Noor, Zuri, Efe, Sunny, Ari, Makena, a second Steve, Alex, Kai... names differ from the skins: see set.md) | empty hands | their join names | S13-S14 in the bedroom; S15 on the hill, each at a tree | |
| a zombie | zombie | | | S05 only, outside the window under the floating trees | |

## Props
| prop | first seen | state | where exactly | later |
|---|---|---|---|---|
| the bed | S01 | red bed, made | north wall, head to the west | every bedroom shot; never moves |
| the bedside block | S01 (Kai stands on it) | bare oak planks (the carpet runner stops one block short), so the spawn spot reads as "the spot" | south of the bed's middle | S02 Alex, S13 Noor, S14 all appear here |
| the cake | S06 | whole minus one slice | the floor block east of the bedside block | gone after S06 (a different day) |
| floating trees | S01 (window), S03 | oaks and birches with their 1-3 bottom logs gone, canopies hovering | all round the cottage within 25 blocks | S15: 12 more |
| the compass wall | S08 | 8 item frames on the stall's back wall, each with a compass, needles all toward the cottage | stall back wall, facing the street | S09 at frame left |
| the compass | S10 | in hand | | S11 needle pointing behind; S12 straight ahead; S13 at the bedside block |
| chat | S13 | first line ever seen in the story: "Noor joined the game" | lower left of the game view | S14: 11 more lines; gone in S15 |

## Positions and screen direction
- Bedroom: the camera's home is the doorway in the south wall, looking north; the bed runs across the frame, head at
  frame left; the window (east) at frame right; the bedside block in front of the bed's middle. Keep this in S01, S06,
  S13. S05 is from the bed's foot (east end), looking west-south toward the door: the bed at frame right.
- The strangers always leave by the front door and walk **left to right** across the exterior frames (the door faces east,
  the camera in S03 looks out east, they go out and turn right/south toward the trees).
- The journey: S10 he walks **away** from the cottage down the hill (the cottage behind, the valley ahead); S12 he walks
  **toward** it, uphill.
- The compass needle: in S11, pointing back (down the frame) because home is behind him; in S12 straight up the frame
  (ahead); in S13 at the bedside block.

## The narrator
- Empty hand until S10. Compass from S10 to the end of S13; empty in S14-S15 (not seen).
- Hearts full, no armor; the HUD's hotbar shows only the compass in slot 1 from S10.
- Never says his name; the join messages never include him.

## Who knows what
| line | the narrator knows | Grandpa knows | the viewer can know |
|---|---|---|---|
| L01-L06 | strangers appear, punch trees, come back | everything (he's seen thousands) | players: they're new players |
| L07 | grandpa says to leave them be | they start here | "start" is literal |
| L08-L09 | compasses point at his bed; grandpa says "home" | the bed is the world spawn | players: world spawn |
| L10-L12 | the compass points behind him | | everyone: the compass points at his bed, wherever he is |
| L13-L14 | his bed is where they come from | | the whole truth |

## Clue map
See `beats.md` (clue map table): appearing (L01-L02), tree-punching (L03), floating trees (L04), respawning (L05), the
cake (L06), "everybody starts somewhere" (L07), the compass wall (L08), "compasses point home" (L09), the needle (L11).
