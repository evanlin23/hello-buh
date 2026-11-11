# wall_grows: continuity bible (r1)

The script is `story.json`; shots are in `shots.md` (generated from story.json `shots`); the set and the narration's
claims are in `set.md`.

## World
- Where: a plains village in a shallow valley, enclosed by one square stone-brick wall; outside its north side, a
  player's trading hall. A standalone place (each story stands alone, r:rca5363): no canon place, no easter egg.
- Weather: clear throughout. The look: the stunt's `look: 'bright'` + `edit.punchStress` (owner, r:r on the Gold A/B).

| scene | shots | time (ticks) | light | notes |
|---|---|---|---|---|
| A: a morning | S01 | 1000 | sun low east | Tomas placing a block on the north rim |
| B: a night | S02 | 18000 | moon; lanterns in the village | a zombie inside the village, stuck at the farm wall |
| C: an afternoon | S03 | 8000 | the west wall's long shadow over the play area | kids playing |
| D: a dawn | S04, S05 | 23500 | pale sky, sun not yet up | the dirt rises over the north rim; Tomas caps it |
| E: another day | S06 | 2000 then 6000 (a time cut) | daylight through the hole | the hole in the north wall, then patched |
| F: an afternoon | S07, S08 | 9000 | sun | the rail stub, the cart, Tomas hiding |
| G: late afternoon | S09 | 11000 | warm low sun | Tomas and the kid on the rim; the morning's dirt capped (no dirt visible) |
| H: the last dawn | S10-S12 | 23000 -> 23500 | dark, then pale sky | the climb, the hall, the player |

## Every number said vs the picture
| said | line | the picture |
|---|---|---|
| FORTY blocks high | L01, L12 | the wall body is exactly 40 blocks above the village ground (y0+1 .. y0+40); single capping blocks at 41 along the north rim read as a crenellated crown, not as height |
| ONE more every morning | L01, L05 | one stone brick placed by Tomas in S01 and S05 |
| TWO blocks (a zombie can't jump) | L02 | the farm's cobblestone wall is exactly 2 high; the zombie bumps it and stays |
| a HUNDRED of us | L13 | 4 rows x 25 cells = 100 villagers in the hall, all visible through the glass roof in S11 |
| ONE block wide (not said: shown) | S11 | every cell is 1 x 1 x 2, glass-roofed, a workstation in front |

## Places
Coordinates relative to the village origin O (ground y0, the plaza bell at O). +x east, +z south.

| place | where | what's there | establishing | changes |
|---|---|---|---|---|
| village | inside the wall, interior about 64 x 64 (x -32..31, z -32..31) | 10+ houses, plaza with bell and well, a wheat farm along the north wall (x 0..14, z -30..-22) with a 2-high cobblestone wall round it, lanterns, paths; the old rail from the farm north into the wall's foot at (6, y0+1, -32), an empty minecart at its end | S01 (EWS up the north wall from the plaza) | none |
| wall | a square ring 2 thick at x/z = ±32..33, stone bricks: mossy and cracked rows 1-12, plain 13-30, clean new 31-40 | no gate, no door, no window anywhere; Tomas's ladder on the north wall's inner face at x -4 (z -31), rows 1-40 | S01, S03 | the hole (S06) at (10, y0+2, -33): outer row's block missing, daylight through (the inner row also missing there: one through-hole 1 x 1); patched by S06's end |
| rim | the north wall's top at y0+40, 2 wide | capping blocks at y0+41 every few blocks (past mornings); this morning's dirt pillar at (-10, *, -35) outside, its top at y0+41..42 | S04 (from inside, below) | S05: Tomas's new brick at (-10, y0+41, -33) |
| outside | north of the wall | the trading hall: 52 x 12, glass roof at y0+3, 4 rows of 25 cells (1 x 1, 2 high), a villager and a workstation per cell; its door (oak, south side) at (0, y0+1, -46), facing the wall; the rail from the hall south to the wall's outer foot at (6, y0+1, -34); the player's dirt stub (2 high) at (2, y0+1, -45) beside the door; plains to the fog | S11 (from the rim) | none |

## Cast and costume
| who | look | where | notes |
|---|---|---|---|
| me (narrator) | baby villager, plains | S03 play area; S09 on the rim beside Tomas; S10 on the ladder; S11 head in the foreground | never holds anything |
| Tomas | adult villager, plains mason (apron), no name tag | S01, S05, S09 on the rim; S06 his hand; S08 by the farm, then into his house (x -12, z -20) | holds a stone brick in S01, S05, S06, S08 (dropped in S08: an item on the path) |
| village kids | 2 baby villagers | S03, S08 | push the cart in S08 |
| zombie | plain zombie | S02 only, inside the farm's 2-high wall's outer side | never reaches the farm |
| the player | default Steve skin, no armour, dirt in main hand (hotbar slot 1) | S12 only, beside the hall door | turns his head up on 'UP'; never speaks |
| hall villagers | 100 adult villagers, mixed professions, each in a cell | S11, S12 bg | still (cells), heads turning idly |

## Who knows what
| who | knows | when |
|---|---|---|
| the kid | the wall, the dirt, Tomas's habits; thinks the outside is a monster or nothing; at the top thinks the hall is a nice village | to the end; never understands |
| Tomas | came from a hall like it; knows the dirt is a player; never says "player" | from before the story |
| the player | someone is inside the wall; not that the kid is at the top until L14 | S12 |
| the viewer | guesses a monster by L07, players by L08-L11, sees it at L13-L14 | |

## Screen direction
The village is always "below/inside", outside is "north". S04 and S05 look north (up) at the rim from inside; S11 and
S12 look north and down from the rim. The cut S11 -> S12 keeps the hall door in the centre third (eye-trace: S11's
push ends with the door centred; S12 opens on it).

## Continuity risks to watch
- The dirt in S04 must rise outside the rim, never on it; S05's new brick is on the rim in front of it.
- S09 (late afternoon): no dirt visible (capped since dawn).
- S12 dirt stub is 2 high (today's start), not 40: the player towers up later in the morning.
- The rail in S07 (inside) and S11 (outside) are one line cut by the wall: the same x (6).
- Tomas's stone brick dropped in S08 is not carried into S09 (a new day).
