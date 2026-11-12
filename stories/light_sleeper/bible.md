# light_sleeper: continuity bible (r2)

## World
- **Vanilla rules the story rests on** (Java 1.21): stepping on wool or carpet makes no vibration
  (`#dampens_vibrations`); wool blocks stop a vibration passing through them (`#occludes_vibration_signals`); breaking or
  placing a block, a jukebox taking a disc and a player landing on a bare block all make vibrations; a sculk sensor
  hears within 8 blocks; a natural ancient-city shrieker (`sculk_shrieker[can_summon=true]`) shrieks when a sensor beside
  it hears a vibration a *player* made, and raises that player's warning level (at most once per 10 s); when its
  90-tick shriek ends it answers: Darkness to players within 40 blocks, and on warning 4 a warden emerges near it. A
  warden is blind, follows vibrations, and its sonic boom kills with "obliterated by a sonically-charged shriek".
- **Why the shrieker is there:** the village was built over an ancient city's roof; the well shaft broke into it. Bible
  backstory only; the script never says it.
- **Game time vs screen time:** each shriek follows its cause on screen. The 10 s warning cooldown and the 4.5 s
  answer are carried by the cuts S12→S13→S14 and S15→S16 (game time runs ~50 s across L11-S16; screen time ~16 s). The S11→S12 cut alone carries ~20 s, so shriek 1's Darkness comes and goes off screen.
- **Scenes and time of day, in story order:**

| scene | lines | when | time (ticks) | sun / light |
|---|---|---|---|---|
| A. the village today | L01-L05 | one morning | 1000 for every shot (S01-S05) | sun low in the east; S01 looks north: the sun at frame right |
| B. the lid (flashback, "Once") | L06-L08 | an afternoon a year ago | S06-S07 9000, S08 9100 indoors | warm afternoon; S08 dim from the Darkness, not from night |
| C. the disc ("Then") | L09 | dusk | 13000 | low orange sun behind the forest; the skeleton stands in the trees' shade (daylight-safe) |
| D. tonight | L10-L15, reveal | night, clear, half moon | 18000 for every shot | moonlight + lanterns; no change across cuts |

- Weather: clear throughout. Season: summer (green grass outside the carpet, leaves full).
- **Numbers said and what the picture must show:** "nine thousand carpets" (not countable: S01-S02 must show carpet on
  every road, stair, roof and the plaza, to the edge of the village); "three hundred sheep" (not countable: ~80 in S03's
  frame, more implied over the rise); the bell (one); the disc (one); the jukebox (one); shrieks: 1 in scene B, 4 in
  scene D (table below).

### The Darkness (render: fog closes to 15 blocks and goes black, the picture pulses on a 4 s beat)
| when | from | shots under it | rule |
|---|---|---|---|
| S08 'DARK' to S08 end | flashback shriek (S07) answered | S08 (indoors, Mom 3.5 blocks) | fine |
| S13 'Milo' to the end | shriek 2 answered, renewed by 3-4 | S13 (Mom 5 blocks), S14 (doorways 8-11), S15-S15d, S16 (warden ~8), S17 (warden 5) | every subject within 11 blocks of the lens |
| never | | S01-S07, S09-S12 | shriek 1's answer falls inside the S11→S12 cut (~20 s of game time); S12's crane is clear |

### The shrieks tonight (each after its visible cause)
| # | cause (on screen) | sound | answer (Darkness / warden) |
|---|---|---|---|
| 1 | S11: the lid's middle row sheared off | on L11 "ECHO" | off screen (inside the S11→S12 cut) |
| 2 | S12: the disc goes into the jukebox on "CARE" | "CARE" + 0.5 s | Darkness fades in on L13 "Milo" |
| 3 | S15: he lands on the bare rim on "DANCED" (3 cuts after shriek 2) | on that landing | renews the pulse |
| 4 | S16: another landing on the rim, frame 1 (3 inserts after shriek 3) | S16 frame 1 | the warden bursts up at (0,4), south of the well, with block-break particles |

## Places
Coordinates: the well's centre is (0,0); +x east, +z south. The plaza floor is carpet.

| place | where (x,z) | what's there | establishing shot (first seen) | changes during the story |
|---|---|---|---|---|
| plaza | x -10..10, z -8..11 | carpet in 3-wide stripes (white, light grey, cyan, light blue); the well (centre); the bell post (6,0); 9 house fronts around it, ours on the north edge | S01 (street level), S02 (from above) | S12: doors open, villagers step into doorways; S16: carpet south of the well bursts (3x3 at (0,5)) |
| street_top | the south street climbs 3 carpeted steps from the plaza's south edge (2,11) to (2,14) | carpet road, houses with carpeted front stairs | S01 from the top step (2,14), looking north: the well just left of centre, the bell right of centre, our door behind the well, the north slope beyond | none |
| carpet_street | from the plaza's north-west corner (-10,-8) up the north slope to the doghouse at (-18,-26) | carpet road, houses with carpeted stairs on both sides | S02 (the crane's start) | none |
| hill_overlook | the north slope, 12 blocks above the plaza | grass and trees, the doghouse at the top of carpet_street | S02's crane end, looking south over the whole village | none |
| well | (0,0) | 5x5 cobblestone rim, 1 high, around a 3x3 dry shaft 5 deep; **the lid**: 3x3 white wool flush with the rim's top, filling the shaft's top layer; walls mossy cobble with sculk veins in the bottom 2 blocks; floor: sculk, 2 sensors (corners), 1 shrieker (can_summon=true) in the middle | S01 (14 blocks, from the steps above: the lid reads as a white square on the grey rim) | S06 (flashback): middle row (z=0, x -1..1) of the lid off; **between B and D the lid is whole again** (re-laid: S10 and S11 open on a whole lid); S11: middle row off again, jukebox on the rim's north-east block (1,-2); S15-S17: the boy on the north rim at (0,-2) |
| our_house_door / our_house_inside | front wall on the plaza's north edge, door at (0,-8) facing south, 2 steps above the plaza (steps at (0,-7) and (0,-6)), a lantern post by the steps | a 9x9 two-storey house, carpet on every floor, a table with two chairs (one unused), lantern on the wall, a window to the well; a lantern post by the steps | S05 (FS, the door, from the plaza); inside first seen in S08 (FS, the whole 7x7 room) | none |
| sheep_meadow | (55,25), the far (south-east) slope | fenced meadow 40 x 30, ~80 sheep in frame, half sheared, a stack of wool blocks by the gate | S03 (WS) | none |
| farm_edge | (-45,25) | the last carpet row, then grass, a wheat field (stage 7), the forest edge 20 blocks out | S09 (WS) | S09: creeper dies, disc dropped |

## Cast and costume
| who | mob / skin | outfit, held item | name tag | where in each scene | state changes |
|---|---|---|---|---|---|
| me (N), Milo as a kid | POV, the bot; default Steve skin in camera shots (S07, S12 crane start, S16) | hotbar: shears (slot 1) in B and D, music disc "cat" (slot 3) from S10, jukebox (slot 2) in D; no armor; full hearts | none | A: the top of the south steps, (crane), meadow fence, west of the well walking east, 3 blocks from our door; B: the well's north rim, then inside; C: the farm edge; D: our doorway (S10), north of the well (0,-4)→(0,-3) facing south (S11-S14), on the rim (0,-2) facing south (S15-S17) | dies at the end (sonic boom) |
| Mom | villager, plains, farmer (straw hat) | nothing held | none | A: our doorway (S05); B: inside, 3.5 blocks from camera (S08); D: our doorway (S13), frozen, facing the well | none |
| villagers (8) | plains villagers: farmer, shepherd, librarian, cleric, toolsmith, fletcher, 2 nitwits | nothing held | none | A: walking slowly on carpet in S01/S02 (none run); D: doors shut in S10-S11, stepping into the doorways in S12, motionless to the end | none |
| the wolf | tamed wolf, red collar, sitting | | none | in front of the doghouse in S02 only | none |
| skeleton, creeper | vanilla | skeleton holds a bow | none | C only: skeleton at the forest edge (frame left, in shade) aiming at the camera; the creeper walking toward the camera between them | creeper dies in S09 (the skeleton's arrow) |
| warden | warden | | none | absent until S16; bursts up through the carpet at (0,4), facing north at the boy across the well; roars; S17 takes two steps to the south rim edge (0,3), 5 blocks from the boy, then the sonic boom | |

## Props
| prop | first seen | state | where exactly | later |
|---|---|---|---|---|
| carpet | S01 | everywhere: stripes on roads and the plaza, red/orange on roofs (stepped full blocks), on every step (full-block steps, never on stair blocks) and floor; **none on the well rim** | every road, roof, step, the plaza, house floors | S16: the carpet and block at (0,4) burst |
| the bell box | S01 (right of centre), S04 (MS) | a vanilla-style bell frame (two oak posts and a beam, 3 wide and 4 high) wrapped in white wool, open to the west so the gold shows | (6,0) | S02, S07 (just left of centre), S12 (frame left), S14 (27° right at the end of the turn), S15c |
| the well lid | S01 | 3x3 white wool, whole | the shaft's top layer | S04 the rim edge-on at frame left; S06 middle row sheared; Mom re-laid the middle row the day after the flashback (bible reason; never shown), so it is whole by S10; S11 middle row sheared; open to the end |
| sculk under the lid | S06 | sculk, sculk veins and glow lichen on the top 2 blocks of the shaft wall, right under the lid, so the slot shows dark teal (the bottom itself is never seen) | the shaft's walls, 1-2 below the rim | S11 |
| shears | S06 | in hand | hotbar slot 1 | S07 in his hand (camera); S11 in hand |
| music disc "cat" | S09 (on the grass) | dropped item | farm edge | S10 in hand; S12 into the jukebox on "CARE" (POV, on screen) |
| jukebox | S11 | placed on the rim's north-east block (1,-2), right of the slot (never between the eye and the slot) | | S12 takes the disc, playing to the end; note particles S13-S17 |

## Positions and screen direction
- Tonight the boy stands **north** of the well facing **south**; our house is **behind** him (north); the bell box is
  to his **left** (east = screen-left when facing south). S12: the bell box at frame left; S14 ends facing east with the bell box about 27° right of centre.
- S13 is the one reverse: from beside the boy, looking north at Mom in our door 5 blocks away (the boy just out of frame
  left). The song carries from behind the camera.
- S16 (camera): low, 2-3 blocks north-west of the boy, looking south: the boy's back large at frame left on the rim, the warden
  centre beyond the open well (~8 blocks from the lens). No bell (outside the crop).
- The warden emerges **south** of the well, across the open shaft from the boy; never behind the camera in POV.
- S01 looks north (the well left of centre, the bell right, our house behind); S02 ends looking south from the north slope (the meadow on the far south-east slope).

## The narrator
- POV throughout except S02 (crane), S03 (`at` on the meadow), S07 (camera, the boy from behind, from the north-west), S12 (crane from above our roof, yaw south, that
  lands in his head), S13 (reverse, he's out of frame), S15b-c (inserts), S16 (camera, the boy's back, close).
- Held item: empty in A; shears in S06-S07; empty in S08; empty in S09 (the disc is on the grass); the disc in S10;
  shears then the jukebox in S11; the disc in S12 until it goes in on "CARE"; empty hand S13-S17.
- Hearts full; no armor; no hunger change. Sneaking (child's eye height) in S05 and S08 only. S09: the low dusk sun is behind the skeleton: check the skeleton, the arrow and the creeper's death at 300 px wide.

## Who knows what
| line | the narrator knows | Mom knows | the viewer can know |
|---|---|---|---|
| L01-L04 | the village is carpeted, the bell and the well are wrapped; thinks it's normal | everything | something is being kept quiet |
| L05 | a saying | the ground listens and what lives under it | "the ground" is the thing |
| L06-L08 | the well screamed once when he pulled the wool; believes "a fox" | it was a shriek; she lied to protect him | players: a sculk shrieker; everyone: the lid is there for a reason |
| L09-L12 | he has a disc; wells echo; the fox screamed again | (L12) the first shriek tonight | players: warning 1 (and counting) |
| L13 | Mom wants him still (he doesn't listen) | a warden is coming if he makes more noise | everyone: something is coming |
| L14-L15 | the lights are party lights; dancing is fun | | players: warnings 2 and 3; carpet is silent, stone isn't |
| reveal | (dies) | | the carpet was for this |

## Clue map
See `beats.md` (clue map table): carpet (L01-L02), 300 sheep (L03), bell box (L04), the lid (S01, S04, L06), Mom's line
(L05), the scream (L07), the dark (L08), the sculk under the lid (S06, S11), "Don't. Move." (L13), the lights going dark (L14), the
step off the carpet (L15).

## r5 changes (2026-11-10, built)
- Narrator-first (owner rule on main): Milo (cast `narrator`, Leda, natural tempo) tells it all; Mom's saying is quoted
  ("Mom says, walk soft..."); Mom speaks only L13 "Milo. Don't. MOVE." while on screen (Sulafat).
- L16 over the death screen: "Oh. THAT'S why we have nine thousand CARPETS." (endings explain themselves).
- As built: the doghouse sits at the top of the carpet street at (-27..-25, -26..-24), about 6 above the plaza (the
  hill behind it is too steep for a camera NW of a doghouse 12 up); S02's crane ends over it looking south-east.
  The south street climbs 6 steps (not 3) so S01's eye is ~7 above the plaza. The farm edge is west of the plaza on
  level ground (carpet stops at x -24). Our door's step is where Mom stands (z -7.35), outside the open door.
- The jukebox song is an original note-block tune (no C418 track in the Short).
