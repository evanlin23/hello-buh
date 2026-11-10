# slow_falling: continuity bible (r2)

r2: the step is on a jetty 2 blocks west of the cliff face, every fall is timed to vanilla Slow Falling, the bench is
24 blocks out, screen direction is fixed (the column is at frame LEFT in the falling shots), there's no bottle in S01,
the cellar is a potion lab, and tomorrow's bottle is in Grandpa's hand in S13. See reviews/r1-response.md.

## World
- **Vanilla rules the story rests on** (Java 1.21):
  - A bubble column over **soul sand** pushes everything in it **up** (a magma block would pull down). You can't swim
    down it. At the top the rider pops out of the water and steps off sideways.
  - A **potion of slow falling** (awkward potion + phantom membrane, brewed at a **brewing stand** fuelled by blaze
    powder, three bottles a batch) gives Slow Falling for 1:30: the drinker falls slowly and takes **no fall damage**.
    Drinking takes 32 ticks (1.6 s) and shows the item-use animation and sound. The effect shows swirl particles in
    its colour (pale peach: check it against the jar's MobEffects) and an icon at the top right of the HUD. Selecting
    an item in the hotbar shows its name above the hotbar ("Potion of Slow Falling") for about 2 s.
  - **How fast she falls.** Vanilla `LivingEntity.travel`: while falling with Slow Falling, gravity is
    `min(gravity, 0.01)` blocks/tick², then vertical speed is multiplied by 0.98 each tick. So the top speed is
    0.01 x 0.98 / 0.02 = **0.49 blocks/tick = 9.8 blocks/s**. Source: minecraft.wiki/w/Slow_Falling ("a terminal
    velocity of 9.8 m/s"); the per-tick numbers are from the vanilla code as described.
    Simulated from standing still, ticked like vanilla:

    | time after the step (s) | 1.1 | 1.55 | 2.2 | 2.65 | 4.3 | **4.4** |
    |---|---|---|---|---|---|---|
    | blocks fallen | 2 | 4 | 7.4 | 10 | 22 | **23** |

    **The drop (feet y 24 to y 1) takes 88 ticks = 4.4 s.** Two people who step off 0.5 s apart are 1.4 blocks apart
    (vertically) at 1.1 s, 2.5 at 2 s, 2.8 at 2.4 s and 4.0 when the first touches down, so the kid also carries ~1
    block further west (he walks off the end; she steps off from standing): keep them at least 0.6 blocks apart
    sideways so his feet never sit in her head and he lands beside her. Record the real curve once (the bot with
    `/effect give @s slow_falling`, stepping off the jetty) and replay it on the mannequins. If the real number
    differs, retime to it.
  - A 23-block fall without it: 20 damage, lethal from full health.
- **Backstory (bible only, the script never says it):** Grandma always wanted to fly. The year they married, Grandpa
  built the fountain (up only) and started brewing. 11,000 jumps is about thirty years of mornings. Grandma has never
  known: she thinks she's light. Grandpa brews a batch most nights and keeps spares (potions in item frames on the wall,
  more in the chest) so she can never run out. The kid is staying with his grandparents for the summer.
- **Scenes and time of day, in story order:**

| scene | lines | when | time (ticks) | light |
|---|---|---|---|---|
| A. a morning (the routine) | L01-L05 | the day before the birthday | 1000 for every shot (S01-S05) | sun low in the east, behind the windmill seen from the market: rim light |
| B. night in the cellar | L06 (any night), L07 (the birthday night) | night | 18000 (S06, S07; `look.time` set on both shots) | lanterns and the stand's flame; the hatch a dark square above |
| C. the next morning | L08-L13 | the morning after the birthday | 1000 for every shot (S08-S13) | as A |

  S01-S02 show the end of the routine (the jump) and S03-S05 its start (the juice, the ride, Grandpa on the bench), all
  "every morning" narration, same light, no clock shown. No time change inside a scene.
- **Fall timing on screen:**
  - **Scene A.** She hops off on "jumped" (~0.4 s into L01) with empty hands; she drank off screen. A vanilla jump
    (0.42 blocks/tick up, normal gravity while rising; Slow Falling only acts while falling) peaks ~1.25 blocks up
    after 0.3 s, then 24.25 blocks of slow falling: she lands 91 ticks = 4.55 s after the hop, ~1.3 s into L02, on "Not one
    SCRATCH". (Scene C she steps off, as L10-L11 say: 4.4 s.)
  - **Scene C.** In S10 she drinks (1.6 s) on "drank her JUICE", then waits at the step. On "TEA" the kid selects his
    bottle and the name pops. On L11's "So I drank MINE" he drinks (1.6 s, the icon appears). She steps off on "we
    stepped" and he steps 0.5 s later on "OFF". L12 plays 1.1-2.4 s into her fall (vertical gap 1.4 to 2.8 blocks, him ~1 block west of her). She touches down
    4.4 s after her step (on L13's "Eleven thousand") and he 0.5 s later. "TIMES" comes ~5.6 s after her step, and
    the cut 0.5 s after that.
- Weather: clear, no fog beyond the render-distance haze. Summer.
- **Numbers said and what the picture must show:**
  - "eleven thousand times" (L01, L13): not countable. The routine is shown once (A) and again (C).
  - "Twenty-three BLOCKS" (L02): feet at y 24 on the jetty, paving top at y 1 in the landing zone: 23, every shot.
  - "ONE" (L07): the stand holds three potions, the hand takes one, two stay (S07).
  - Kid's age: not said ("my BIRTHDAY").

## Places
Coordinates: origin (0,0,0) = the soul sand block at the foot of the fountain, at market-paving level. +x east, +z
south, y up. The market lies west of the cliff, and the windmill stands on the ledge above it.

| place | where (x,y,z) | what's there | establishing shot | changes |
|---|---|---|---|---|
| market | piece `market`, centre (-14, 0, 0), x -27..-1, z -13..13 | natural ground round it (grass, groves, the valley falling west); paving; four striped stalls (flowers by the fountain door, fish at the north-west, bread, books); the piece's centre fountain replaced by a planter with a tree (only one "fountain" in this story); **the bench** at (-22, 0, 6) facing east, 24 blocks from the column | S03 (WS from 10 blocks west of the door) | none |
| the cliff | x 0..1, y 0..10, the market's east edge | a 10-high natural cliff finished with a stone retaining wall, ivy, grass and bushes along its top | S03, S04 | none |
| fountain | soul sand (1, 0, 0); water (1, 1..22, 0); glass on x 0 and z ±1 the whole height (on x 2 above y 18, where the tower narrows); spruce door at (0, 1..2, 0) facing west | Grandpa's fountain: a glass tube of water with bubbles rising, from the paving up the cliff and the tower's west face to the balcony. Built after the windmill piece | S01 (from above), S03, S04 | none |
| windmill | piece `windmill`, `height` 12, facing south, tower centre (6, 10, 0) on the ledge; cap floor y 23; sails on the south face (plane z +5) | stone tower, timber cap, sails, granary to the east, a grove behind (east); **no ladder inside** | S01 | none |
| windmill_top | balcony: spruce walkway round the cap's west side at floor y 23 (feet y 24), x 1..2, with a fence rail; the column's exit hole at (1, 23, 0). **The jetty**: 1 wide, 3 long, from the balcony out west at z 1 over x 0..-2, railed on both sides, open at its west end. **The step**: (-2, 24, 1), the jetty's open end, 2 blocks west of the cliff face (x 0) | where she drinks (C) and steps off | S01 | none |
| the drop | the air from the step straight down to the landing zone at (-2, 0, 1) | slow falling keeps almost no sideways speed: they land under the step, 2 blocks west of the wall, by the flower stall | S02 | none |
| cottage | piece `cottage` on the market's north side, centre about (-14, 0, -24), door facing south to the market | the grandparents' house | not shown outside (S06's crane starts on its floor) | none |
| cellar | piece `basement` under the cottage, hatch in the cottage floor, room y -6..-1 | **dressed as a potion lab**: brewing stand on a stone table at about (-17, -5, -25) with three peach potions and a lit blaze-powder flame; a cauldron; a spruce-stair chair facing the stand; item frames on the wall each holding a peach potion; bookshelves, a chest, cobwebs, three lanterns. **No barrels or casks in S06/S07's frame** (they'd read as booze) | S06 (crane down through the hatch) | S07: one potion out of the stand (3 → 2) |

## Cast and costume
| who | mob / skin | outfit, held item | name tag | where in each scene | state changes |
|---|---|---|---|---|---|
| me (N), Milo as a kid | the bot, POV; default Steve skin in camera shots (S08, S12, S13) | hotbar: slot 1 empty (selected), slot 2 the peach potion from S07; no armor; full hearts | none | B: the foot of the ladder, then at the stand (S07). C: in the column 4 blocks under Grandma (S08); the balcony beside the column's exit at (1, 24, -1), looking north-west (S09); at the balcony edge at (1, 24, 1), the jetty's root, 2.5 blocks behind her, facing west (S10); walks the jetty and steps off its end 0.5 s after her, carrying ~1 block further west (S11); above her and ~1 block west (S12); landing at about (-3, 0, 1) (S13) | Slow Falling from L11 to the end; no damage |
| Grandma | mannequin, our skin `skins/grandma.png` (grey bun, pink cardigan, flowered skirt; make with scripts/make_skins.py) | **S01-S02 empty hands**; the peach potion from S03 (handed over) and in S04; S10 drinks it (1.6 s), then empty hands to the end | none | A: the step (S01), falling (S02), at the fountain door (S03), rising in the column (S04), tiny at the jetty end (S05). C: rising in the column (S08), at the jetty end facing west, her back to the kid (S10), falling (S11-S13), landing at (-2, 0, 1) | Slow Falling in A (drunk off screen) and from S10; lands without damage |
| Grandpa | mannequin, our skin `skins/grandpa.png` (white hair and moustache, brown cardigan, purple scarf) | the peach potion in S03 (handing it over); a loaf of bread in S08; **tomorrow's peach potion in his hand, resting on his knee, in S13** | none | A: at the fountain door (S03), on the bench at (-22, 0, 6), sitting, face up (S05). B: on the chair at the brewing stand, awake (S06), asleep with his head dropped (S07, `doze` pose). C: at the bread stall, facing the baker, his back to the column (S08, on screen at frame left); on the bench, face up (S13) | none |
| the nitwit (easter egg) | villager, nitwit (green coat) | none | none | standing on the fish stall's striped roof (S03, S13 background) | none |
| market villagers (4-6) | plains villagers at the stalls (`buyer_n`/`stall_n` anchors), frozen; the baker at the bread stall faces Grandpa in S08 | none | none | A and C, at the stalls | none |

## Props
| prop | first seen | state | where exactly | later |
|---|---|---|---|---|
| Grandma's potion ("juice") | **S03** (handed over) | potion of slow falling, peach | Grandpa's hand, then hers | S04 in her hand. Scene C: S08 in her hand, S10 drunk (gone) |
| the kid's potion ("tea") | S07 (taken from the stand) | potion of slow falling, peach | POV hotbar slot 2 | S09 in the hotbar (not held), S10 selected on "TEA" (the name pops), S11 drunk (gone) |
| Grandpa's potion (tomorrow's) | S13 | peach, in his hand | on his knee, on the bench | none |
| brewing stand | S06 | 3 potions, flame lit | on a stone table in the cellar | S07: 2 potions |
| the potions in frames | S06 | peach potions in item frames on the wall | cellar wall behind the stand | none |
| the fountain | S01 | water, bubbles rising, soul sand at the foot, door shut | (1, 0..22, 0); `props.fountain` aims at its middle (1, 11, 0) | always the same |
| the market's centre | S03 | a big planter with a tree (no fountain) | (-14, 0, 0) | none |

## Positions and screen direction
- From the market (S03, S05, S08, S13) the column and windmill are **ahead (east) and up**. The flower stall is at
  frame right of the fountain door, the fish stall (and the nitwit) at frame left.
- Grandma always steps off **west**, toward the market. **In the falling shots (S02, S12) the camera is west of her
  looking east, so the column (z 0, north of her at z 1) is at frame LEFT of her.** Keep it there in both.
- S03: Grandpa left, Grandma right, the door between them behind.
- S05 and S13 are shot from behind the bench (24-25 blocks from the column), so the whole windmill (23 blocks up)
  fits in a FOV 55-60 frame with Grandpa in the foreground.
- On the balcony: S09 looks **north-west** over the rail (Grandma is off frame left, out on the jetty). S10 turns
  **south-west** at the jetty's root (1, 24, 1): Grandma ahead, facing west, her back to us, the sails at frame left (south).
- S12: Grandma head to foot in the lower half, the kid above her and ~1 block west (nearer the lens) in the upper half, the column at frame left.
- S13: Grandpa from behind at lower left, the falling pair upper centre, the column left of them.

## The narrator
- POV in S07, S09, S10, S11. Camera shots everywhere else (the kid is seen only in S08, S12, S13: small, or above her).
- Held: S07 empty hand, then the potion goes into slot 2 as it's taken, and the hand switches back to slot 1. S09 the
  empty hand is selected, the potion visible in slot 2. S10 on "TEA" slot 2 is selected (the name pops above the
  hotbar). S11 it's drunk, empty hand.
- HUD in POV shots: full hearts and hunger, no armor; the Slow Falling icon at the top right from the drink in S11.
- Where I am when each line is said: L07 the cellar. L08 rising in the column (camera). L09-L11 the balcony and the
  jetty. L12-L13 in the air, then landing.

## Who knows what (line by line)
| line | the narrator knows | Grandpa knows | Grandma knows | the viewer can know |
|---|---|---|---|---|
| L01-L02 | Grandma floats 23 blocks; she says she's light | everything | she's light (she believes) | something makes her float |
| L03-L05 | juice for the trip, a fountain that only goes up, born to fly | the juice is the potion | juice is juice | the juice matters; there's no way down |
| L06-L07 | Grandpa's tea is off limits; he takes one "for my trip" | brewing slow falling (asleep in L07) | nothing | brewing stand = potions |
| L08-L09 | he's at the top, he isn't light, he can't go back | (at the bread stall) | she's riding up | he needs whatever she has |
| L10-L11 | her juice looks like his tea; then he knows | | she floats (as always) | "Potion of Slow Falling" |
| L12 | it's the potion | (watching from the bench) | she thinks he got it from her | she doesn't know |
| L13 | Grandpa did this 11,000 times | already holding tomorrow's | (still doesn't know) | the whole truth |

## Clue map
See `beats.md` (the clue map table): faint swirls (S02), "light as a feather" (L02), the juice handover (S03), the
up-only column (S01, S04, L04, S09), "born to fly" (L05), the brewing stand and the potions in frames (S06, S07),
"not allowed any" (L06), "For MY trip" (L07), "I'm not LIGHT" (L09), "same color as my tea" (L10), the item name
(S10), tomorrow's bottle (S13).
