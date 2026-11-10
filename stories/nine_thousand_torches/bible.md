# nine_thousand_torches: continuity bible (r1)

## World
- **Vanilla rules the story rests on** (Java 1.21): monsters spawn only where the block light is 0 (since 1.18), and
  only on a block with a sturdy (full) top face, so a torch on a block stops spawning there and all around it. Dirt
  paths, farmland, bottom slabs and stair roofs are not full-topped: nothing spawns on them, and a torch can't stand
  on them either. A torch stands on any sturdy top and on fence and wall posts. Villagers sleep through the night. A
  player who quits a server disappears at once (no animation) and every client's chat prints `<name> left the game` in
  yellow. Players show their name over their head.
- **Why every block (bible backstory; the twist implies it, nobody says it):** Milo is leaving the world for good. With
  nobody to fight at night, the only safe village is one where no zombie can spawn at all. A torch every 12 blocks
  would do; he can't come back to check his maths, so he put one on every block that would take one. The roads and
  fields stay dark because nothing spawns there (S01 shows them as dark lines: deliberate, vanilla-true).
- **Why tonight:** his mom's rule: "one last night" (L07). The real-life reason stays off screen.
- **Zombies from outside** can still walk in; the village's iron golem (S03) handles that, as always.
- **Scenes and time of day, in story order:**

| scene | lines | when | time (ticks) | sun / light |
|---|---|---|---|---|
| A. this morning, the village | L01-L04 | today, dawn | S01 23000, S02 23050, S03 23100, S04 23150 | pre-sunrise blue-grey, the east sky pale; torches and bloom at their strongest; the camera mostly looks east |
| B. Milo (flashback) | L05-L08 | S05-S06: any evening ("every night"); S07-S08: yesterday | S05 11600, S06 12000, S07 12300, S08 12600 | golden hour into sunset into late dusk; **no story torches**: the village as vanilla built it, its own lamp posts only; Milo's cottage standing |
| C. this morning, the chest and the plot | L09-L11 | today, after A | S09 23250, S10 23300, S11 23350 | dawn, brightening; S09-S10 indoors (window light) |
| D. the row and the door | L12-L15 | today, minutes later | S12 23450, S13 23550, S14 23700, S15 23850 | first gold at the horizon (S13), the sun's edge over the east hill (S14), the sun clear of the hill (S15, behind and right of our house) |

  Time never runs backwards inside A, C, D (A→C→D is one morning; B is the only flashback and is a clear time jump:
  gold dusk light and no torches).
- **Weather:** clear throughout. Season: summer (green grass, full leaves). Fog: none beyond the render distance's
  own; the dawn grade (`look: 'auto'`) carries it.
- **Numbers said and what the picture must show:**
  - "NINE THOUSAND torches" (L01): the dressing script counts its placements and must log 9,000-9,400 in the village
    box. S01's crane must see the whole box (about 95 x 95 blocks) at once, so the viewer believes it: thousands of
    points, edge to edge, the dark roads and fields threading through them.
  - "EVERY block" (L03): every sturdy-top block and every fence/wall post in the box has a torch; no lit gap visible in
    any shot today (an unlit grass block in frame is a continuity break) except the strip in S12 that Milo is finishing.
  - "One LAST night" (L07): one.
  - "all his STUFF" (L09): the chest screen shows 9 stacks (bible: Props); his house is empty in S11 to match.
  - "a square of TORCHES" (L11): Milo's plot, 9 x 9, 81 torches (inside the 9,000).
  - "the LAST one" (L14): one torch, placed on screen, on the grass block one east of our doorstep.

## Places
Coordinates: the vanilla village's bell (the meeting point) is (0,0); +x east, +z south. The real numbers come from the
scouted village (set.md); keep the relations.

| place | where (x,z) | what's there | establishing shot | changes during the story |
|---|---|---|---|---|
| village | about x -48..47, z -48..47 | a vanilla plains village (sets.vanilla village_plains): 10-14 houses, dirt paths, 2-3 farms with log borders, the meeting point with the bell, a well, hay piles, lamp posts, the iron golem | S01 (EWS dawn crane) | A, C, D: a torch on every sturdy top in the box. B: none of those torches |
| west_lane | a fenced lane on the west side | a fence line, grass, the hay pile at its end near the meeting point | S02 | torched in A/C/D |
| meeting_point | (0,0) | the bell, the well (the nitwit egg on its roof in S03), hay bales | S03 | torched |
| village_edge | the north edge, on a rise | the last torch row in a clean line, open grass, then a dark oak forest 20+ blocks out | S04 (POV) | none |
| milo_house / milo_plot | the west end of the main street, about (-38, 4) | B: Milo's birch cottage (library `cottage`, palette birch), built by Milo, lit inside, a crafting table and two chests by the door (S07). A/C/D: a bare 9 x 9 plot of grass and dirt (the cottage, plinth and garden gone), a torch on every block | S05 (B), S11 (C) | the house stands in B; gone in A/C/D |
| village_street | the main street from our door west to Milo's | a dirt path (dark), houses either side | S08 | none |
| our_door / our_house_inside | a vanilla plains house on the main street, about (10, 6), door facing south | a 7x7+ room, bed, our family's chest against the west wall, a window looking north-west over the village to the forest; the doorstep is a grass block with a dirt path in front | S06 (B, the door), S14 (D, the reverse) | D: the last torch appears on the grass one east of the doorstep (L14) |
| village_south | the strip of grass between the two houses south-west of ours, round a corner to our street | in D: the last unlit strip; a single row of torches growing across it, then round the corner to our door | S12 | the row grows from 14 blocks to ~30 during S12-S13 |

## Cast and costume

| who | mob / skin | outfit, held item | name tag | where in each scene | state changes |
|---|---|---|---|---|---|
| me (the narrator) | baby villager, plains type, no profession (brown robe), `stunt.self` | nothing held (a villager); no HUD, no hand in POV | none | A: in the village (POV S04); B: at our door (S06, S08 from outside, back to us); C: inside our house (POV S09-S10), then at the plot (S11, not in frame); D: POV S12, running in S13, on the path in S14, POV S15 | none |
| Milo | player actor (mineflayer bot `Milo`), default Steve skin | B: empty hand (S05, S06), a torch (S07, S08); D: a torch (S12, hidden but for the swing; S14); empty hand on the wave (S15) | his vanilla player name `Milo` over his head, always (players can't hide it unless sneaking) | B: by his cottage (S05, S07), our door (S06), walking west (S08); A/C: never seen; D: behind the house corner (S12), our door (S14-S15) | S15: quits; gone from the world |
| the iron golem | iron_golem (the village's own) | | none | A: walking through the torches at the meeting point (S03) | none |
| the nitwit (egg) | villager, nitwit, green coat | | none | A: standing on the well's roof (S03 background) | none |
| villagers | the village's own (frozen, `mobs: 'freeze'`) | professions as generated | none | asleep in beds in A/C/D (it's dawn): none on the streets; B: one or two near doors | none |

## Props

| prop | first seen (line, shot) | state | where exactly | later appearances and their state |
|---|---|---|---|---|
| the 9,000 torches | L01, S01 | lit (torches are always lit), standing (`torch`), on every sturdy top and fence/wall post in the village box; vanilla wall torches on house walls untouched | the box (Places) | every shot in A, C, D; **absent in B** (S05-S08) |
| fence-post torches | L02, S02 | one per post | the west lane fence | S01, S11 (street fence fg) |
| hay-bale torches | L02, S02 | one on every exposed top of the hay pile | the meeting point's hay pile | S03 bg |
| chests of torch makings | L07, S07 | two chests open by Milo's door, coal and sticks inside and on the ground | Milo's plot (B only) | gone in C (S11: the plot is bare) |
| our chest | L09, S09 | holds Milo's things: diamond sword, iron helmet/chestplate/leggings/boots (one slot each), red bed, shield, filled map, fishing rod, 16 bread, bucket, 64 torches | inside our house, west wall | (never seen closed in frame: S09 opens on it) |
| Milo's cottage | L05, S05 | standing, lit (B) | milo_house | S07-S08 (standing); gone in C (S11) |
| the plot's torch square | L11, S11 | 9 x 9 = 81 torches on grass/dirt | milo_plot | S01 (part of the carpet of points, not singled out) |
| the growing row | L12, S12 | grows by one torch every ~0.4 s at its far end during S12; complete to a few blocks short of our door in S13 | village_south, round the corner to our doorstep | S13 (follow), S14 (it ends at the doorstep) |
| the last torch | L14, S14 | placed on 'LAST' on the grass block one east of our doorstep | our_door | S15: burning at the empty doorstep |
| the chat line | L15, S15 | `Milo left the game`, yellow, bottom left of the game view, vanilla chat background | HUD layer | the caption track repeats it during the 0.8 s hold |

## Positions and screen direction
- Our door faces south. S06 and S14 look north at it from the street (the same axis, S14 a little wider and further
  back); the kid is at frame right in S06 and frame left in S14 (he walked up the path from the south-west in S13).
  S15 is the kid's POV on the same axis, so Milo faces the camera.
- S08 looks west down the street from our door: Milo walks away from the lens toward his cottage at the far end.
- S13: the kid runs away from the lens; the row turns left round the corner, and our house is ahead.
- Dawn shots look east where they can (S01, S02): the pale sky is the bright side of frame.

## The narrator
- A baby villager: eye height 0.81 blocks in POV (S04, S09, S10, S12, S15); `hud: false`, `hideHand: true` (no hearts,
  no hotbar, no hand). In camera shots he is drawn from outside (`stunt.self`).
- Where he is when each line is said: L01-L03 (camera shots: he's not in frame; he is in the village), L04 at the north
  edge (POV), L05-L08 flashback (at our door in S06, S08), L09-L10 inside our house (POV), L11 at the plot (camera),
  L12 at the house corner (POV), L13 running (seen), L14 on the path 7 blocks from the door (seen), L15 4 blocks from
  Milo (POV).

## Who knows what (line by line)

| line | the narrator knows | Milo knows | the viewer can know |
|---|---|---|---|
| L01-L03 | the village is covered in torches; the spawn rule | everything | the image and the rule |
| L04 | believes something is coming | nothing is coming | the narrator's guess (and that it's a guess) |
| L05-L06 | Milo is his best friend and the player; "see you tomorrow" every night | | the ritual; the door |
| L07-L08 | Milo said "one last night"; thinks: grounded | it's his last night in the world | "one last night" (first suspicion for some) |
| L09-L10 | all Milo's stuff is in our chest; thinks: hiding it | he gave it away | he gave everything away |
| L11 | his house is gone; no theory | he took it down | **he's leaving** (gets ahead here, ~71%) |
| L12-L13 | one row is still growing, it leads to our door | he's saving our door for last | where the row ends and what happens there |
| L14 | Milo placed the last torch and waved | this is goodbye | it's goodbye |
| L15 | he didn't say "see you tomorrow"; the game says he left | | he's not coming back; the torches were for after |

## Clue map
| clue | where planted (line, shot, time) | how it's misread | what it means after the twist |
|---|---|---|---|
| a torch on every block, fences and hay too | L01-L03, S01-S03, 0-8.5 s | a defence against something coming | nothing will spawn here after he's gone |
| the spawn rule | L03, 5.5 s | why you'd fortify | why it works without him |
| "see you tomorrow" every night | L06, S06, 12 s | a sweet habit | the line he won't say when it's not true |
| "Mom made me promise. One last night." | L07, S07, 15 s | grounded again (L08) | his last night here |
| chests of coal and sticks, torch in hand | S07-S08 (picture) | nothing | he made the 9,000 |
| his stuff in our chest | L09, S09, 20 s | hiding it (L10) | a gift: he's leaving |
| his house gone, a square of torches | L11, S11, 24 s | (no theory) | taken down so no dark room is left |
| the row to my door | L12-L13, S12-S13, 27-30 s | following a mystery | I was his last stop |
