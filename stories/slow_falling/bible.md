# slow_falling: continuity bible (r1)

## World
- **Vanilla rules the story rests on** (Java 1.21):
  - A bubble column over **soul sand** pushes everything in it **up** (a magma block would pull down). You can't swim
    down it. At the top the rider pops out of the water and steps off sideways.
  - A **potion of slow falling** (awkward potion + phantom membrane, brewed at a **brewing stand** fuelled by blaze
    powder; three bottles a batch) gives Slow Falling for 1:30: the drinker falls slowly and takes **no fall damage**.
    Drinking shows the item-use animation and sound; the effect shows swirl particles (pale peach, the effect colour:
    check it against the jar's MobEffects) and an icon at the top right of the HUD. Selecting an item in the hotbar
    shows its name above the hotbar ("Potion of Slow Falling") for about 2 s.
  - A 23-block fall without it: 20 damage, lethal from full health.
- **Backstory (bible only, the script never says it):** Grandma always wanted to fly. The year they married, Grandpa
  built the fountain (up only) and started brewing. 11,000 jumps = about thirty years of mornings. Grandma has never
  known; she thinks she's light. Grandpa brews a batch most nights and keeps a shelf of spares (~40 bottles) in the
  cellar so she can never run out. The kid's grandparents are his mom's parents; he's staying with them this summer.
- **Scenes and time of day, in story order:**

| scene | lines | when | time (ticks) | light |
|---|---|---|---|---|
| A. a morning (any morning: the routine) | L01-L05 | the day before the birthday | 1000 for every shot (S01-S05) | sun low in the east, behind the windmill from the market; warm |
| B. night in the cellar | L06 (any night), L07 (the birthday night) | night | 18000 (S06, S07) | lanterns only (cellar); the hatch a dark square above |
| C. the next morning | L08-L13 | the morning after the birthday | 1000 for every shot (S08-S13) | as A |

  S01-S02 show the end of the routine (the jump) and S03-S05 its start (the juice, the ride, Grandpa on the bench): all
  "every morning" narration, same light, no clock shown. No time change inside a scene.
- Weather: clear, no fog beyond the render distance haze. Summer.
- **Numbers said and what the picture must show:**
  - "eleven thousand times" (L01, L13): not countable; the routine is shown once (A) and again (C).
  - "ONE" (L07): the stand holds three bottles, the hand takes one, two stay (S07). The shelf of spares is in S06.
  - Heights (not said): balcony floor 23 above the market paving; the drop is 23 blocks in every shot that shows it.
  - Kid's age: not said ("my birthday").

## Places
Coordinates: origin (0,0,0) = the soul sand block at the foot of the fountain, at market-paving level. +x east, +z
south, y up. The market lies west of the cliff; the windmill stands on the ledge above it.

| place | where (x,y,z) | what's there | establishing shot | changes |
|---|---|---|---|---|
| market | piece `market`, centre (-14, 0, 0), x -27..-1, z -13..13 | paving, four striped stalls (flowers at the east entrance by the fountain, fish, bread, books), benches, lamp posts, trees in planters; the piece's own centre fountain replaced by a big planter (only one "fountain" in this story) | S03 (WS from the west side) | none |
| the cliff | x 0..1, y 0..10, the market's east edge | a 10-high stone retaining wall / natural cliff, the glass column set into its face | S03, S04 | none |
| fountain | water column at (1, 1..22, 0); soul sand (1, 0, 0); glass on x 0 and z ±1 the whole height; spruce door at (0, 1..2, 0) facing west into the market | Grandpa's fountain: a glass tube of water with bubbles rising, from the market paving up the cliff and the tower's west face to the balcony | S01 (from above), S03 (from the market), S04 (crane up it) | none |
| windmill | piece `windmill`, `height` 12, facing south, tower centre (6, 10, 0) on the ledge; cap floor y 23; sails on the south face (plane z +5) | stone tower, timber cap, four canvas sails, granary to the east; **no ladder inside** (removed), the ground-floor door stays (the mill room) | S01 | none |
| windmill_top (balcony) | a 1-2 wide spruce walkway round the cap at y 23 with a fence rail; the column's exit hole at (1, 23, 0); **the step**: a 1-block gap in the rail at (0, 24, 1), facing west over the market | where she drinks and steps off | S01 | none |
| the drop | the air from the step down to the paving by the flower stall at about (-1, 0, 1) | she falls almost straight down (slow falling keeps little sideways speed): the landing is 1-2 blocks west of the fountain door | S02 | none |
| cottage | piece `cottage` on the market's north side, door facing south at about (-14, 0, -19) | the grandparents' house | not shown outside (the cellar is entered from it in S06's crane) | none |
| cellar | piece `basement` under the cottage, hatch in the cottage floor, room y -6..-1 | ladder, beams, barrels, chest, cobwebs, dim lanterns; **added**: a brewing stand on a barrel at about (-17, -5, -25) with 3 bottles, a cauldron, a spruce-stair chair beside it facing the stand, a shelf (barrels and trapdoors) of peach bottles in item frames | S06 (crane down through the hatch) | S07: one bottle out of the stand (3 → 2) |

## Cast and costume
| who | mob / skin | outfit, held item | name tag | where in each scene | state changes |
|---|---|---|---|---|---|
| me (N), Milo as a kid | the bot, POV; default Steve skin in camera shots (S08, S12, S13) | hotbar: slot 1 empty (selected), slot 2 the peach potion from S07; no armor; full hearts | none | B: the cellar ladder foot, then the stand (S07); C: in the column (S08), the balcony beside the column's exit (S09), 2 blocks east of the step (S10), through the step (S11), floating 4 blocks above Grandma (S12, S13) | Slow Falling from S11 to the end; no damage |
| Grandma | mannequin, our skin `skins/grandma.png` (grey bun, pink cardigan, flowered skirt; make with scripts/make_skins.py) | the peach potion in her main hand in S01, S03 (taken), S04, S10; empty hand in S02, S12, S13 | none | A: the step (S01), falling (S02), at the fountain door (S03), rising in the column (S04), tiny at the step (S05); C: rising in the column (S08), the step (S10), falling (S11-S13) | Slow Falling in S01-S02 and from S10; lands each time without damage |
| Grandpa | mannequin, our skin `skins/grandpa.png` (white hair and moustache, brown cardigan, purple scarf) | the peach potion in S03 (handing it over); empty otherwise | none | A: at the fountain door (S03), on the bench at the market's south-east (about (-6, 0, 6)), sitting, face up (S05); B: sitting on the chair at the brewing stand, awake (S06), asleep, head dropped (S07); C: at the bread stall, back to the column (S08, off screen), on the same bench, face up (S13) | none |
| the nitwit (easter egg) | villager, nitwit (green coat) | none | none | standing on the fish stall's striped roof (S03, S13 background) | none |
| market villagers (4-6) | plains villagers at the stalls (`buyer_n`/`stall_n` anchors), frozen | none | none | A and C, at the stalls | none |

## Props
| prop | first seen | state | where exactly | later |
|---|---|---|---|---|
| Grandma's bottle | S01 (in hand, being lowered after the drink) | potion of slow falling, peach | her main hand | S03 handed over (full), S04 in hand, gone after her drink (S10) |
| the kid's bottle | S07 (taken from the stand) | potion of slow falling, peach | POV hotbar slot 2 | S09 in the hotbar (not held), S10 selected (the name pops), S11 drunk (gone) |
| brewing stand | S06 | 3 bottles (has_bottle 0-2), blaze powder | on a barrel in the cellar | S07: 2 bottles |
| the shelf of spares | S06 | ~12 peach bottles in item frames on the wall (the rest in the chest) | cellar wall behind the stand | none |
| the fountain | S01 | water, bubbles rising, soul sand at the foot, door shut | (1, 0..22, 0) | always the same |
| the market's centre | S03 | a big planter with a tree (no fountain) | (-14, 0, 0) | none |

## Positions and screen direction
- The market faces east to the cliff; from the market (S03, S05, S08, S13) the column and windmill are **ahead and up**,
  the flower stall at frame right of the fountain door, the fish stall (and the nitwit) at frame left.
- Grandma always steps off **west**, toward the market. In falling shots (S02, S12) the column is at frame right of
  her (the camera is west/south-west of her looking east/north-east); keep it there across S02, S12.
- S03: Grandpa left, Grandma right, the door between them in the background.
- On the balcony (S09-S11) the kid faces **west** over the market; the sails are at frame left (south).
- S12: Grandma near and low in frame, the kid above her, the column behind them at frame right.
- S13: Grandpa from behind at lower left, the two falling figures upper centre, the column right of them.

## The narrator
- POV in S07, S09, S10, S11; camera shots everywhere else (the kid is seen only in S08, S12, S13, small or above).
- Held: S07 empty hand, then the potion goes to slot 2 (the hand shows it as it's taken, then switches back to slot
  1); S09 empty hand selected, the potion visible in slot 2; S10 on "TEA" slot 2 selected (the name pops above the
  hotbar); S11 drunk, empty hand.
- HUD in POV shots: full hearts and hunger, no armor; the Slow Falling icon at the top right from the drink in S11.
- Where I am when each line is said: L07 the cellar; L08 rising in the column (camera); L09-L11 the balcony; L12-L13
  in the air.

## Who knows what (line by line)
| line | the narrator knows | Grandpa knows | Grandma knows | the viewer can know |
|---|---|---|---|---|
| L01-L02 | Grandma floats; she says she's light | everything | she's light (she believes) | players: that looks like slow falling |
| L03-L05 | juice, a fountain that only goes up, born to fly | the juice is the potion | juice is juice | the fountain is a bubble column; the juice matters |
| L06-L07 | Grandpa's stinky tea, off limits; he took one | brewing slow falling (asleep in L07) | nothing | brewing stand = potions |
| L08-L09 | he wanted to fly, and he's stuck | (at the bread stall) | she's riding up | he can't get down without it |
| L10-L11 | her juice looks like his tea; then he knows | | she floats (as always) | "Potion of Slow Falling" |
| L12 | it's the potion | (watching from the bench) | she thinks he got it from her | she doesn't know |
| L13 | Grandpa did this 11,000 times | | (still doesn't know) | the whole truth |

## Clue map
See `beats.md` (the clue map table): the bottle (S01, S03, S10), swirls (S02), "light as a feather" (L02), "juice for
the trip" (L03), the up-only column (S01, S04, L04, S09), "born to fly" (L05), the brewing stand and the shelf (S06,
S07), "not allowed any" (L06), "same color as my tea" (L10), the item name (S10).
