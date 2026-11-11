# six_thousand_torches: continuity bible (r1)

Built on stories/nine_thousand_torches/bible.md (r2); what changed: the ending (Jonah walks away, no quit, no chat),
the line and shot numbers (16 lines, S01-S16), Jonah's voiced line (L07, S07), and no Mom named.

## World
- **Vanilla rules the story rests on** (Java 1.21):
  - A torch is block light 14; light falls 1 per block, so one torch keeps a yard lit (L03 "ONE torch lights a YARD").
  - A torch stands on any sturdy top face and on fence and wall posts; not on dirt paths, farmland, bottom slabs,
    stairs, leaves or glass.
  - Villagers sleep through the night; at dawn they are still in their beds.
  - Players show their name over their head; while sneaking the nameplate is drawn dimmer, never hidden.
  - Players can't kneel or wave: Jonah uses sneak, arm swings and real block placement only.
- **The nightly torch (backstory, S06-S07):** at nightfall Jonah puts a torch on the grass block one east of the
  kid's doorstep (the **door spot**), "so I'm never in the DARK", says "See you tomorrow!" and walks home. He picks it
  back up next morning (players reuse torches), so by day the spot is empty.
- **Why six thousand (implied, never said):** he can't do the nightly torch any more, so he did every night at once,
  everywhere. The story never says mobs can't spawn; the kid's own L06 ("So I'm never in the DARK") carries the
  gesture. (Audit #6.2: nothing spawns with no player online, so "no zombie ever again" would be a pedant's catch.)
- **Why tonight:** "he ONLY had one LAST night" (L08). The real-life reason stays off screen and unnamed.
- **The ending:** Jonah places the last torch, waves, and walks away down the street. **No quit, no chat line, no
  "left the game"** (audit #6.1). Whether he logs off after is off screen.
- **The place and the day:** `larkfield` (to claim; see nine_thousand_torches' bible for the claim command, with
  `--story six_thousand_torches`), day 4500. Narrator: a new baby villager of Larkfield, unnamed. Jonah: a player,
  not Milo. **Stands alone:** no line names a place or another story. The Dog Hill cameo in S01 is a speck, never named.
- **Canon to record in the claim commit (not done here):** Larkfield glows with ~6,000 torches from day 4500; Jonah's
  plot a 9 x 9 square of torches; Jonah's things in the kid's family chest; timeline row "4500, Larkfield. Six Thousand
  Torches."

## Scenes and time of day (story order)
| scene | lines | when | ticks | light |
|---|---|---|---|---|
| A. this morning | L01-L04 | today, dawn | S01 23000, S02 23060, S03 23120, S04 23185 | before sunrise, torches and bloom strongest |
| B. Jonah (flashback) | L05-L09 | S05-S07 any evening (the habit); S08-S09 yesterday | S05 11600, S06 12000, S07 12050, S08 12300, S09 12600 | golden hour to late dusk. **None of the story's torches.** His cottage stands. Two villagers walk in S05 |
| C. the chest and the plot | L10-L12 | today, after A | S10 23250, S11 23296, S12 23328 | dawn brightening |
| D. the row and the door | L13-L16 | minutes later | S13 23450; ~7 s skip at the cut; S14 23652, S15 23688, S16 23720 (continuous) | first gold; S15 looks north (sun out of frame, light from the right); S16 looks east (sun just off frame right) |

Inside A, C and D time only moves forward. B reads as a flashback: gold light, people on the street, no torches.
Weather clear, summer, `look.fog: false`.

## Numbers said and what the picture must show
- "six THOUSAND TORCHES" (L01, L03): the dressing script logs **6,000-6,300** placed in the box (set.md).
- "Not ONE DARK block" (L02): no unlit block in any A/C/D shot. Paths and farmland carry no torch but are lit by their
  neighbours (block light > 0 everywhere in the box: check on the light map, set.md).
- "ONE torch lights a YARD" (L03): one torch in sharp focus at lower centre of S03 on 'ONE torch'.
- "one PLAYER" (L05): Jonah is the only player in every shot.
- "one LAST night" (L08): said only.
- "his STUFF" (L10): the chest screen shows 11 items (Props).
- "Just TORCHES" (L12): the plot is 9 x 9 coarse dirt, 81 torches (counted in the 6,000).
- "ONE torch LEFT" (L15): Jonah holds exactly one torch in S14-S15 before the placement, none after.

## Places
Coordinates: the village bell is (0,0); +x east, +z south. Real numbers come from the village placed at Larkfield.

| place | where (x,z) | what's there | establishing | changes |
|---|---|---|---|---|
| village | box x -39..38, z -39..38 | vanilla plains village, 10-14 houses, paths, farms, bell, well, hay, lamp posts, iron golem | S01 | A/C/D: a torch on every sturdy top. B: none (whole-box swap) |
| west_lane | a fenced lane, west side | fence line, ridges, the hay pile at its end | S02 | torched |
| meeting_point | (0,0) | bell, well, hay | S03 | torched |
| village_edge | north edge, on a rise | the last torch row, open grass, dark oak forest 20+ out | S04 | none |
| jonah_house / jonah_plot | west end of the main street, about (-38, 4) | B: birch cottage, two chests (coal, sticks) and a crafting table by the door. A/C/D: 9 x 9 coarse dirt, a torch on every block; street fence in front, torched | S05 (B), S12 (C, same angle) | gone after B |
| our_door / our_house_inside | about (-24, 6), 14 blocks east of Jonah's door, north side of the main street, door facing south | bed under a north-west window, our chest on the west wall; **the door spot** = grass one east of the doorstep | S06 (B), S15 (D, same axis) | S06: the nightly torch (gone by morning). D: empty until S15's last torch |
| village_south / our_street | the house across the street, about x -27..-20, z 10..17, front facing north; a 1-wide grass strip on its east side (x -19, z 11..18) | the row: up the strip (x -19, z 18→10), west along z 9 (x -19→-23), the path gap (-23, 8), the door spot (-23, 7). Jonah in S13 pinned at (-22, 9) facing east, placing (-20, 9) then (-21, 9), body hidden by the east wall | S13, S14 | the row grows in S13; complete to one short of the door spot by S14 |
| our_street, looking east (S16) | from the door spot east along the main street to the village's east edge | the torched street, houses both sides, the east hills and the sunrise | S16 | Jonah walks east along it |

## Cast and costume
| who | model / skin | held | name tag | where | state changes |
|---|---|---|---|---|---|
| me (narrator) | baby villager, plains, no profession, `stunt.self` | nothing; no HUD, no hand | none | A: in the village (POV S04). B: at our door (S06, S07, S09, from outside). C: POV inside (S10, on the bed S11), at the plot (S12, off frame). D: POV at the strip (S13), running (S14), on the path frame right (S15), POV by the door (S16) | none |
| Jonah | player actor `Jonah`, default Steve | S05 empty. S06 a torch, placed on 'TORCH', then empty. S07 empty (waves). S08 a torch (crafting). S09 a torch. S13 a torch (arm only). S14-S15 crouched, **exactly one torch**, placed after 'LEFT', then empty. S16 empty | player name (dim while sneaking) | B: gate, our door, his chests, walking west. D: round the corner, our doorstep, walking east away | never quits on screen |
| iron golem | the village's | | none | S03 | none |
| villagers | the village's, frozen in beds in A/C/D | | none | two walking in S05 only | none |

## Props
| prop | first | state | where | later |
|---|---|---|---|---|
| the 6,000 torches | L01, S01 | on every sturdy top and post in the box | the box | every A/C/D shot; **none in B** |
| the nightly torch | L06, S06 | placed on 'TORCH' | the door spot | S07 at Jonah's feet; removed at the S07→S08 cut |
| chests of coal and sticks + crafting table | L08, S08 | open | by Jonah's door (B) | gone in C |
| our chest | L10, S10 | diamond sword, iron helmet, chestplate, leggings, boots, red bed, shield, filled map, fishing rod, 16 bread, bucket | our room, west wall | none |
| Jonah's cottage | L05, S05 | standing, lit | jonah_house | S08-S09; gone in C (S12) |
| the plot's torch square | L12, S12 | 81 torches on coarse dirt | jonah_plot | none |
| the growing row | L13, S13 | grows round the corner in S13; one short of the door spot in S14 | strip, house front, across the street | S14, S15 |
| the last torch | L15, S15 | placed after 'LEFT' on the door spot | door spot | S16 burning at frame bottom left |
| easter egg: the dog on Dog Hill | S01 bg, frame right | a speck on the dawn band | Dog Hill's top, ~80 blocks ESE | none |

## Positions and screen direction
- Our door faces south. S06, S07 and S15 look north at it on one axis; the kid at frame right, nearer the lens than
  the door spot. S07 is closer on the same side (the MS of S06's moment).
- S09 looks west down the main street: Jonah walks away from the lens toward his cottage.
- S16 looks east down the main street from beside the door: Jonah walks away from the lens toward the sunrise. The
  two "walking away" shots rhyme: in S09 there's a house to go to; in S16 there isn't.
- S13 looks north up the strip; S14 turns left (west) round the corner with the kid, our door ahead.
- S05 and S12 share an angle (east of Jonah's plot, looking west).

## Who knows what
| line | narrator | Jonah | viewer |
|---|---|---|---|
| L01-L04 | the village is lit; one torch is plenty; something's coming | everything | the image, the question |
| L05-L07 | the nightly torch, "never in the dark", "See you tomorrow!" | | the habit; the words |
| L08-L09 | "one last night"; thinks grounded | it's his last | first suspicion |
| L10-L12 | the chest, the plot; thinks hiding | he gave it all away | **he's leaving** (~30 s), not sure |
| L13-L15 | a row is growing; it ends at his door; Jonah with one torch | goodbye | the nightly spot |
| L16 | no "see you tomorrow" (doesn't understand it) | | he isn't coming back; the torches are every night's |
