# light_sleeper: continuity bible

## World
- **Vanilla rules the story rests on** (Java 1.21): stepping on wool or carpet emits no vibration; wool blocks stop a
  vibration passing through them; a sculk sensor detects vibrations within 8 blocks; a natural ancient-city shrieker
  (`sculk_shrieker[can_summon=true]`) shrieks when a sensor near it picks up a vibration a *player* caused (including
  an item or projectile the player threw), gives Darkness to players within 40 blocks, and raises that player's
  warning level; the fourth warning summons a warden within ~6 blocks vertically of the shrieker. Warnings are at least
  10 s apart, so shrieks 1-4 span 30 s+ of game time (cuts between L11 and L15 cover it). A warden is blind, follows
  vibrations and smell, and its sonic boom gives "obliterated by a sonically-charged shriek".
- **Why the shrieker is there:** the village was built over an ancient city's roof; the well shaft broke into it. The
  bible's backstory only; the script never says it.
- **Scenes and time of day, in story order:**

| scene | lines | when | time (ticks) | sun / light |
|---|---|---|---|---|
| A. the village today | L01-L05 | an evening, then morning in S03 (a montage of the village, not one moment) | S01 12500 dusk, S02 1000, S03 1000, S04 6000 noon, S05 11500 | S01 looks south from the hill: the low sun at frame right (west), long shadows falling to frame left |
| B. the egg (flashback, "Once") | L06-L08 | some afternoon a year ago | S06 9000, S07 (same moment), S08 9100 indoors | warm afternoon; S08 dim by the Darkness, not by night |
| C. the disc ("Then", last week) | L09 | dusk | 13000 | low orange sun over the forest, skeleton daylight-safe in the forest shade (it stands under trees) |
| D. tonight | L10-L15, reveal | night, clear sky, half moon | 18000 all scenes | moonlight + lanterns; no change across cuts |

- Weather: clear throughout. Season: summer (green grass outside the carpet, leaves full).
- **Numbers said and what the picture must show:** "nine thousand carpets" (not countable on screen: the EWS must show
  carpet on every road, roof, stair and the plaza, out to the edge of the village); "three hundred sheep" (not
  countable; the meadow must look like hundreds: ~120 in frame, more implied over the rise); the bell (one); the egg
  (one); the disc (one); the jukebox (one); shrieks: 1 in scene B, 4 in scene D.

## Places
| place | where (x,z from origin) | what's there | establishing shot (first seen) | changes during the story |
|---|---|---|---|---|
| hill_overlook | (0,-60), 12 blocks above the plaza | grassy shoulder of the valley wall behind our house | S01 (EWS) | none |
| plaza | (0,0) | 24x24 square of carpet in 4-colour stripes; the well (centre); the bell post (6 blocks east of the well); 9 house fronts around it | S01 (from above), S04 at ground level | S11: jukebox placed on the well's north rim; S15: the carpet and 3x3 of ground south of the well burst (warden emerges); S16-17: warden standing there |
| carpet_street | from the plaza west, 40 blocks | a road of carpet, houses with carpeted stairs, the doghouse | S02 (WS) | none |
| our_house_door / our_house_inside | (-10,-14), facing the plaza (door faces south-east) | a 9x9 two-storey farmhouse, carpet on every floor, a table with two chairs (one unused), lantern on the wall, window to the plaza | S05 from outside (FS, door), S08 inside | none |
| well | (0,0) | 3x3 shaft inside a 5x5 cobble rim, 5 blocks deep, dry; bottom: sculk blocks, 2 sculk sensors, 1 shrieker (can_summon=true), veins up the walls | S01 from above; S06 looking down | S11: jukebox on the north rim |
| well_bottom | (0,-5,0) | the shrieker in the middle of the floor | S07 (CU, after S06's wide) | none |
| sheep_meadow | (60,20), far slope | fenced meadow, ~120 sheep (white, half sheared), a stack of wool blocks by the gate | S03 (EWS) | none |
| farm_edge | (-45,30) | the last carpet row, then grass, a wheat field (stage 7), the forest edge 20 blocks out | S09 (WS) | S09: creeper dies, disc dropped |

## Cast and costume
| who | mob / skin | outfit, held item | name tag | where in each scene | state changes |
|---|---|---|---|---|---|
| me (N) | POV, the bot; `hideHand: false` (he holds the egg and the disc) | hotbar: egg (B), music disc "cat" (D, slot 1), jukebox (D, slot 2); no armor; full hearts | none | A: hill, street, meadow fence, plaza, our doorstep; B: the well rim, then inside; C: the farm edge; D: our door, then the well's north side, facing south | dies at the end (sonic boom) |
| Mom | villager, plains, farmer (straw hat) | nothing held | none | A: our doorway (S05); B: inside, 1.5 blocks from camera (S08); D: our doorway (S13), frozen, facing the well | none |
| villagers (9) | plains villagers: 2 farmers, shepherd, librarian, cleric, toolsmith, fletcher, 2 nitwits... | nothing held | none | A: walking slowly on carpet (S02), none run; D: one in each doorway around the plaza, motionless from S12 to the end | none |
| the wolf | tamed wolf, red collar, sitting | | none | at the doghouse in S02 only | none |
| skeleton, creeper | vanilla | skeleton holds a bow | none | C only, at the forest edge (skeleton left, creeper right) | creeper dies in S09 |
| warden | warden | | none | absent until S15; S15 emerging south of the well (head and tendrils); S16-S17 standing, roaring, then the sonic boom | |

## Props
| prop | first seen | state | where exactly | later |
|---|---|---|---|---|
| carpet | S01 | everywhere, 4 colours in stripes (white, light grey, cyan, light blue on roads; red/orange on roofs) | every road, roof slope (on top of stairs/slabs), stair, the plaza, house floors | S15: a 3x3 patch south of the well breaks up |
| the bell box | S01 (far), S04 (MS) | bell on an oak post, enclosed by white wool on 3 sides and the top, open to the west (the camera side in S04) | plaza, 6 blocks east of the well | visible in S12, S16 |
| the well | S01 | open, dry; stone rim; the glow visible only when looking down | plaza centre | S11 jukebox on the north rim |
| the egg | S06 | thrown by the narrator | into the shaft | gone |
| music disc "cat" | S09 (dropped) | item on the grass | farm edge | S10 in hand; S13 into the jukebox (off screen, the line covers it) |
| jukebox | S11 | placed, then holding the disc, playing from L13's end | north rim of the well | S14-S17 note particles; still playing on the death screen |

## Positions and screen direction
- The plaza is the stage: the narrator stands **north** of the well facing **south**; our house is **behind-left**
  (north-west) of him; the bell box is to his **left** (east is screen-left when facing south). Keep it: in S11, S14,
  S15 the bell box is at frame left, our door at the far left edge or out of frame.
- S13 is the one reverse: Mom in our doorway, seen from the well's direction. The jukebox's top edge in the bottom of
  frame anchors which way we're looking.
- S16 (camera): behind-left of the boy (north-west, low), so the boy is small in the lower left, the warden at centre,
  the well behind it, the bell box at the right edge.
- The warden emerges **between** the boy and the well (south of the boy, north of the well's centre). Never behind
  the camera in POV.

## The narrator
- POV throughout except S03 (`at` camera on the meadow, no narrator), S07 (camera in the shaft), S12 and S16 (camera,
  the boy small, back to us, default skin).
- Held item: empty in A; the egg in S06; empty in S08; empty in S09 (the disc drops on the ground); the disc in S10;
  the jukebox in S11 (placed); empty after S11 (the disc goes in during S13).
- Hearts: full; no armor; no hunger change.

## Who knows what
| line | the narrator knows | Mom knows | the viewer can know |
|---|---|---|---|
| L01-L04 | the village is carpeted, the bell is wool-wrapped; thinks it's normal | everything | something is being kept quiet |
| L05 | a saying | the ground listens and what lives under it | "the ground" is the thing |
| L06-L08 | the well screamed once; believes "a fox" | it was a shriek; she lied to protect him | players: a sculk shrieker; everyone: the well is not a well |
| L09-L12 | he has a disc; the fox screamed again | (L12) the first shriek tonight | players: warning 1 (and counting) |
| L13 | Mom wants him still (he doesn't listen) | a warden is coming if he makes more noise | everyone: something is coming |
| L14-L15 | the lights are party lights | | players: warnings 3 and 4 |
| reveal | (dies) | | the carpet was for this |

## Clue map
See `beats.md` (clue map table): carpet (L01-L02), 300 sheep (L03), bell box (L04), Mom's line (L05), the glow (S06),
the scream and the dark (L07-L08), "Don't. Move." (L13), lights going dark (L14).
