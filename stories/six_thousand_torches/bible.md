# six_thousand_torches: continuity bible (r2)

Built on stories/nine_thousand_torches/bible.md (r2). r2: 14 lines, S01-S14 (one shot per line). The nightly habit
is a WALK HOME with Jonah's own torch (not a torch left by the door: a placed torch burns forever, so it wouldn't need
him every night); "one LAST night" and "grounded" are cut; the kid misreads every clue innocently (STANDARDS 0a); the
ending is Jonah setting his own torch down by our door, waving and walking away, no quit, no chat.

## World
- **Vanilla rules the story rests on** (Java 1.21):
  - A torch is block light 14; light falls 1 per block, so one torch keeps a yard lit (L03 "ONE torch lights a YARD").
  - A torch stands on any sturdy top face and on fence and wall posts; not on dirt paths, farmland, bottom slabs,
    stairs, leaves or glass.
  - Villagers sleep through the night; at dawn they are still in their beds.
  - Players show their name over their head; while sneaking the nameplate is drawn dimmer, never hidden.
  - Players can't kneel or wave: Jonah uses sneak, arm swings and real block placement only.
- **The nightly walk (backstory, S06-S07):** at nightfall Jonah walks the kid home holding a torch (its held light
  lights them both), says "See you tomorrow!" at our door and walks home with it. Nothing is left behind.
- **Why six thousand (implied, never said):** he can't walk the kid home any more, so he lit every block of the
  village. The kid's own L13 ("So I'm NEVER in the DARK!", his happy read of the last torch) carries the gesture. The
  story never says mobs can't spawn (audit #6.2).
- **Why today:** never said. The real-life reason (he's quitting) stays off screen.
- **The ending:** Jonah places his own torch, the last one, on the grass one east of our doorstep (the **door spot**),
  waves, and walks away east empty-handed. **No quit, no chat line, no "left the game"** (audit #6.1). The kid thinks
  he forgot to say "see you tomorrow".
- **The place and the day:** `larkfield` (to claim; see nine_thousand_torches' bible for the claim command, with
  `--story six_thousand_torches`, retiring nine_thousand_torches' claim on the same place and day, and its timeline row "leaves the game" rewritten as "walks away"), day 4500. Narrator: a new baby villager of Larkfield, unnamed, **not Pip** (Pip is Hushwell's kid; this one only shares the brand voice). Jonah: a player,
  not Milo. **Stands alone:** no line names a place or another story. No easter egg: the dog is hidden behind Dog Hill's own ridge from Larkfield (continuity r1); the hill is on S01's skyline as geography only.
- **Canon to record in the claim commit (not done here):** Larkfield glows with ~6,000 torches from day 4500; Jonah's
  plot a 9 x 9 square of torches; Jonah's things in the kid's family chest; timeline row "4500, Larkfield. Six Thousand
  Torches."

## Scenes and time of day (story order)
| scene | lines | when | ticks | light |
|---|---|---|---|---|
| A. this morning | L01-L04 | today, dawn | S01 23000, S02 23060, S03 23120, S04 23185 | before sunrise, torches and bloom strongest |
| B. Jonah (flashback) | L05-L07 | any evening before (the habit) | S05 11600, S06 12000, S07 12050 | golden hour to dusk. **None of the story's torches.** His cottage stands. Two villagers walk in S05 |
| C. the chest, the window, the plot | L08-L10 | today, after A | S08 23250, S09 23296, S10 23328 | dawn brightening |
| D. the row and the door | L11-L14 | minutes later | S11 23450; ~7 s skip at the cut; S12 23652, S13 23688, S14 23720 (continuous) | first gold; S13 and S14 look west-ish, the sun behind the camera |

Inside A, C and D time only moves forward. B reads as a flashback: gold light, people on the street, no torches.
Weather clear, summer, `look.fog: false`.

## Numbers said and what the picture must show
- "six THOUSAND TORCHES" (L01, L03): the dressing script logs **6,000-6,300** placed in the box (set.md).
- "Not ONE DARK block" (L02): block light > 0 everywhere in the box in A/C/D; paths and farmland (no torch possible)
  lit by neighbours.
- "ONE torch LIGHTS a whole HOUSE" (L03): one torch sharp at lower centre of S03, a house beside it all lit.
- "one PLAYER" (L05): Jonah is the only player in every shot.
- "his STUFF" (L08): the chest screen shows 11 items (Props).
- "his HOUSE? GONE." (L10): the plot is 9 x 9 coarse dirt, 81 torches, S05's angle.
- "his LAST torch" (L13): Jonah holds exactly one torch in S13 before placing it, none after (S14 empty-handed).

## Places
Coordinates: the village bell is (0,0); +x east, +z south. Real numbers come from the village placed at Larkfield.

| place | where (x,z) | what's there | establishing | changes |
|---|---|---|---|---|
| village | box about x -45..44, z -45..44 (90 x 90, includes Jonah's plot; one torch per column, so the smaller box can't reach 6,000) | vanilla plains village, 10-14 houses, paths, farms, bell, well, hay, lamp posts, iron golem | S01 | A/C/D: a torch on every sturdy top. B: none (whole-box swap) |
| west_lane | a fenced lane, west side, ending at the meeting point | fence line, ridges, the hay pile at the meeting point where the lane ends | S02 | torched |
| meeting_point | (0,0) | bell, well, hay | S03 | torched |
| village_edge | north edge, on a rise | the last torch row, open grass, dark oak forest 20+ out | S04 | none |
| jonah_house / jonah_plot | west end of the main street, about (-38, 4) | B: birch cottage, two chests (coal, sticks) and a crafting table by the door. A/C/D: 9 x 9 coarse dirt, a torch on every block; street fence in front, torched | S05 (B), S10 (C, same angle) | gone after B |
| our_door / our_house_inside | about (-24, 6), 14 blocks east of Jonah's door, north side of the main street, door facing south | bed under a north-west window, our chest on the west wall; **the door spot** = grass one east of the doorstep | S06 (B), S13 (D, same axis) | D: the door spot empty until S13's last torch |
| village_south / our_street | the house across the street, about x -27..-20, z 10..17, front facing north; a 1-wide grass strip on its east side (x -19, z 11..18) | the row: up the strip (x -19, z 18→10), west along z 9 (x -19→-23), the path gap (-23, 8), the door spot (-23, 7). in S11 the torches at (-19, 10) then (-19, 9) appear on 'GROWING' (Jonah unseen: nothing round the corner is visible from the strip). The dressing skips the row's cells and the door spot | S11, S12 | the row grows in S11; complete to one short of the door spot by S12 |
| our_street, looking west (S14) | from the kid at (-24, 8) west along the main street to Jonah's plot | the torched street, houses both sides, the plot's torch square, the west hills lit by the sunrise behind the camera | S14 | Jonah walks west along it |

## Cast and costume
| who | model / skin | held | name tag | where | state changes |
|---|---|---|---|---|---|
| me (narrator) | baby villager, plains, no profession, `stunt.self` | nothing; no HUD, no hand | none | A: in the village (POV S04). B: walking home beside Jonah (S06, S07, from outside). C: POV inside (S08, on the bed S09), at the plot (S10, off frame). D: POV at the strip (S11), running (S12), on the path frame right (S13), POV from that spot (S14) | none |
| Jonah | player actor `Jonah`, default skin **not Steve** (proposed `kai`; owner to confirm) | S05 empty. S06-S07 a torch (his walk-home torch, held light). S11 unseen. S12 out of frame. S13 crouched, **exactly one torch**, placed right after 'LAST torch', then empty. S14 empty | player name (dim while sneaking) | B: at his gate, walking us home, at our door. D: unseen round the corner, our doorstep, walking west away | never quits on screen |
| iron golem | the village's | | none | S03 | none |
| villagers | the village's, frozen in beds in A/C/D | | none | two walking in S05 only | none |

## Props
| prop | first | state | where | later |
|---|---|---|---|---|
| the 6,000 torches | L01, S01 | on every sturdy top and post in the box | the box | every A/C/D shot; **none in B** |
| Jonah's walk-home torch | L06, S06 | held, lit (held light) | in his hand | S07; S13 placed on the door spot (the last torch); S14 burning there, out of frame beside the kid |
| our chest | L08, S08 | diamond sword, iron helmet, chestplate, leggings, boots, red bed, shield, filled map, fishing rod, 16 bread, bucket | our room, west wall | none |
| Jonah's cottage | L05, S05 | standing, lit | jonah_house | S07 bg (lit windows); gone in C (S10) |
| the plot's torch square | L10, S10 | 81 torches on coarse dirt | jonah_plot | none |
| the growing row | L11, S11 | grows round the corner in S11; one short of the door spot in S12 | strip, house front, across the street | S12, S13 |

## Positions and screen direction
- Our door faces south onto the street. S06 (from about (-15, 9)) and S13 (from about (-18, 9)) look west-north-west at
  it on one axis from the street (a camera due south would be inside the house across the street, continuity r1). The
  kid stands at (-24, 8) in S06, S13 and S14 (his POV). S07 is the MS of S06's moment.
- S06: Jonah and the kid walk in from frame left along the path to the door.
- S14: from the kid's spot (-24, 8), the POV turns west down the main street: Jonah walks away from the lens toward
  his bare plot, empty-handed, the sunrise behind the camera. It rhymes with S07, where he walks home west with his
  torch to a house that exists.
- S11 looks north up the strip; S12 turns left (west) round the corner with the kid, our door ahead; Jonah is out of
  frame until S13 (crouched behind the house-front corner).
- S05 and S10 share an angle (east of Jonah's plot, looking west).

## Who knows what
| line | narrator | Jonah | viewer |
|---|---|---|---|
| L01-L04 | the village is lit; one torch is plenty; a party must be coming | everything | the image, the question |
| L05-L07 | the walk home, "See you tomorrow!" | | the habit; the words |
| L08-L10 | the chest (presents), the plot (he's moving in) | he gave it all away | **he's leaving** (~25 s), not sure |
| L11-L13 | a row is growing; it ends at his door; Jonah's last torch is for him | goodbye | the walk-home torch, left behind |
| L14 | he forgot to say "see you tomorrow" | | he isn't coming back |
