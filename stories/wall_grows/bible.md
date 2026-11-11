# wall_grows: continuity bible (r2)

The script is `story.json`; shots are in `shots.md` (generated from story.json `shots`); the set and the narration's
claims are in `set.md`.

## World
- Where: a plains village in a shallow valley, enclosed by one square stone-brick wall; outside its north side, a
  player's trading hall. A standalone place (each story stands alone, r:rca5363): no canon place, no easter egg.
- Weather: clear throughout. The look: the stunt's `look: 'bright'` + `edit.punchStress` (owner, r:r on the Gold A/B).

| scene | shots | time (ticks) | light | notes |
|---|---|---|---|---|
| A: a morning | S01, S01b | 1000 | sun low east | Tomas placing a block on the north rim |
| B: a night | S02 | 18000 | moon; lanterns in the village | a zombie inside the village, stuck at the farm wall; the great wall out of frame |
| C: an afternoon | S03 | 8000 | afternoon light along the west wall | kids playing |
| D: a dawn | S05, S06 | 23500 | pale sky, sun not yet up | the dirt's top block sits just over the north rim (still); Tomas caps beside it one higher |
| E: another day | S04 | 2000 then 6000 (a time cut) | daylight through the hole | the hole in the north wall, then patched |
| F: an afternoon | S07, S08 | 9000 | sun | the rail stub, the cart, Tomas hiding |
| G: late afternoon (the day before the last dawn) | S09 | 11000 | warm low sun | at the ladder's foot: Tomas comes down past the kid, hands empty (arms crossed) |
| H: the last dawn | S10-S12 | 23000 -> 23500 | dark, then pale sky | the climb, the hall, the player |

## Every number said vs the picture
| said | line | the picture |
|---|---|---|
| FORTY blocks high | L01 | the wall body is exactly 40 blocks above the village ground (y0+1 .. y0+40); single capping blocks at 41 along the north rim read as a crenellated crown, not as height |
| ONE more every morning | L02, L08 | one stone brick placed by Tomas in S01b and S06 |
| TWO blocks (a zombie can't jump) | L03 | the farm's wall of full cobblestone blocks (not cobblestone-wall blocks, 1.5 high) is exactly 2 high; the zombie bumps it and stays |
| a HUNDRED of us | L14 | 4 rows x 25 cells = 100 villagers in the hall, all visible through the glass roof in S11 |
| ONE block wide (not said: shown) | S11 | every cell is 1 x 1 x 2, glass-roofed, a workstation in front |

## Places
Coordinates relative to the village origin O (ground y0, the plaza bell at O). +x east, +z south.

| place | where | what's there | establishing | changes |
|---|---|---|---|---|
| village | inside the wall, interior about 64 x 64 (x -32..31, z -32..31) | 10+ houses, plaza with bell and well, a wheat farm against the north wall (x 0..14, z -31..-22): a 2-high ring of full cobblestone blocks on its west, south and east sides (x -1, x 15, z -21) with no gap, the great wall its north side, one oak door at (-1, y0+1, -24) (villagers open it; zombies can't, difficulty Normal); the old rail only inside the farm (x 6, z -31..-24), an empty minecart at its north end (6, y0+1, -31) against the wall; the kid's house at (14, -12), its window looking north-west over the farm (S02); Tomas's house at (-12, -20) | S01 (EWS up the north wall from the plaza) | none |
| wall | a square ring 2 thick at x/z = ±32..33, stone bricks: mossy and cracked rows 1-12, plain 13-30, clean new 31-40 | no gate, no door, no window anywhere; Tomas's ladder on the north wall's inner face at x -4 (z -31), rows 1-40 | S01, S03 | the hole (S04) at (10, y0+2, -33): outer row's block missing, daylight through (the inner row also missing there: one through-hole 1 x 1); patched by S04's end |
| rim | the north wall's top at y0+40, 2 wide | capping blocks at y0+41 every few blocks (past mornings); the dirt pillar flush against the outer face at (-10, y0+1..y0+41, -34), its top block one over the rim, still in S05; an old cap at (-11, y0+41, -33); no cap at x -10 | S05 (from inside, level with the rim) | S06: Tomas's new brick on the old cap at (-11, y0+42, -33), one above the dirt's top, on 'HIGHER' |
| outside | north of the wall | the trading hall: 12 wide (x -6..5) x 52 deep (z -46..-97), running north away from the wall; glass roof at y0+3, 4 rows of 25 cells along its length (1 x 1, 2 high), a villager and a workstation per cell; its door (oak, south end) at (0, y0+1, -46), facing the wall; the rail from the hall south to the wall's outer foot at (6, y0+1, -34); no dirt stub (the player digs his pillar back down after each look, so no dirt shows in S09 or S11); lanterns inside under the glass; the ground outside the north wall at y0 (level with the village), rising into hills with oak trees and a river north of the hall to the fog | S11 (from the rim) | none |

## Cast and costume
| who | look | where | notes |
|---|---|---|---|
| me (narrator) | baby villager, plains; in S03 the kid nearest the camera | S03 play area; S09 at the ladder's foot (never on the rim before S10: L04 'never seen outside' holds); S10 on the ladder; S11 head in the foreground | never holds anything |
| Tomas | adult villager, plains mason (apron), no name tag | S01b, S06 on the rim; S04 at the frame's right edge by the patched spot (arms crossed: no hand is drawn); S07 at the frame's right edge watching the cart; S09 down the ladder past the kid; S08 by the farm door, runs off frame left (west) to his house (-12, -20) on 'RUNS' | holds a stone brick over crossed arms in S01b, S06, S08 (dropped in S08: an item on the path); hands empty in S04's second half, S09 |
| village kids | 2 baby villagers | S03, S08 | push the cart in S08 |
| zombie | plain zombie | S02 only, outside the farm ring's south side | never reaches the farm |
| the player | default Steve skin, no armour, dirt in main hand (hotbar slot 1) | S12 only, beside the hall door, framed on his face from 39 blocks up (FOV 5); his pillar is S05's dirt on an earlier dawn | turns his face up on 'UP'; never speaks |
| hall villagers | 100 adult villagers, mixed professions, each in a cell | S11, S12 bg | still (cells), heads turning idly |

## Who knows what
| who | knows | when |
|---|---|---|
| the kid | the wall, the 'brown plant', Tomas's habits; proud and sure the wall keeps them safe; climbs to see a monster; at the top thinks the hall is a nice village and the player is someone new | to the end; never understands, never afraid (STANDARDS 0a) |
| Tomas | came from a hall like it; knows the dirt is a player; never says "player" | from before the story |
| the player | someone is inside the wall; not that the kid is at the top until L14 | S12 |
| the viewer | guesses a monster by L07, players by L08-L11, sees it at L13-L14 | |

## Screen direction
The village is always "below/inside", outside is "north". S01b, S05 and S06 look north (up) at the rim from inside; S08 looks north-west and Tomas exits west (frame left); S11 and
S12 look north and down from the rim. The cut S11 -> S12 keeps the hall door in the centre third (eye-trace: S11's
push ends with the door centred; S12 opens on it).

## Continuity risks to watch
- The dirt in S05 sits still just outside the rim (no rise); S06's new brick (on the old cap beside it) tops it by one block.
- No camera before S11 sees the ground outside: S04 pitched up (sky only through the hole), S01b/S05/S06 below or level with the rim.
- S12: no pillar; dirt in his hand only (today's pillar not started).
- The rail in S07 (inside the farm) and S11 (outside) are one line cut by the wall: the same x (6); the farm ring has no gap for it.
- Tomas's stone brick dropped in S08 is not carried into S09 (a new day).
