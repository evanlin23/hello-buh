# wall_grows: continuity bible (r3; world pass 2026-11-11: Highwall, day 3700)

The script is `story.json`; shots are in `shots.md` (generated from story.json `shots`); the set and the narration's
claims are in `set.md`.

## World
- Where: **Highwall** (docs/world/map.json `highwall`, claimed on main 2026-11-11): a village on a snowy plateau in
  the middle of the White (natural ground y 132-140, a dip to 118 at the south-west corner), enclosed by one square stone-brick wall; outside its north side, on level
  ground, a player's trading hall. The plaza bell O = (-1594, 133, -524); the village ground y0 = 133 (follow the
  village floor is **levelled to y0 = 133** inside the wall (cut the rises, fill the south-west dip) so the wall is exactly 40 everywhere inside; its top is level at y0 + 40 = 173; outside, its foot follows the natural ground). The line of the old road between Frostgate and Ravenford passes about 40 blocks
  south of the bell (a few blocks past the south wall). Still a standalone story (r:rca5363): no line names a place, no easter egg.
- **Day:** 3700 (canon timeline). The wall is 40 high that morning. It is not in sight of any rendered Short
  (Ravenford 452 blocks west, Frostgate 812 east), so its height binds only later stories: 40 or more, never lower.
- **The White (set dressing, canon conflict 24):** snowy plains: one snow layer on the ground (outside the paths and the farm) and on the house roofs only: **none** on the hall's glass roof (S11's 100 must read), the rim, the caps or the dirt pillar (plain `dirt`, never grass: L07's brown); one layer at most round the farm wall so L03's TWO still measures 2;
  spruce instead of oak in the hills north of the hall, a frozen stream for the river. Every villager is the **snowy**
  type (Tomas a snowy mason, the kids snowy babies, the 100 in the hall mixed snowy). Every line, the wall, the hall,
  the numbers and the shots are unchanged. Weather stays clear (no snowfall: keep the dirt pillar readable).
- **Canon this Short plants (docs/world/canon.md links 14, 17; never said):** the wall on the old road is the White's
  landmark from day 3700; Highwall's old Tomas came from a trading hall (Oakend's Tomas, converted ~2500, is the fan
  theory: never confirmed, and Highwall's Tomas has **no name tag**, which is the fans' counter-evidence).
- **Open questions:** who built the hall? Does Tomas keep building after the kid's climb? Never answered.
- **The player (canon conflict 18):** the script gives him the default Steve skin, which reads as Buh; day 3700 is in
  Buh's gap (3400-4300), so it isn't him, but a viewer can't know. Recommended: a non-Steve default skin no one else
  wears (`ari`, `efe` or `noor`). Lead's/owner's call; nothing here changes until then.
- Weather: clear throughout (snowy plains: no snowfall in any shot). The look: the stunt's `look: 'bright'` + `edit.punchStress` (owner, r:r on the Gold A/B).

| scene | shots | time (ticks) | light | notes |
|---|---|---|---|---|
| A: a morning | S01, S01b | 1000 | sun low east | Tomas placing a block on the north rim |
| B: a night | S02 | 18000 | moon; lanterns in the village | a zombie inside the village, stuck at the farm wall; the great wall out of frame |
| C: an afternoon | S03 | 8000 | afternoon light along the west wall | kids playing |
| D: a dawn | S05, S06 | 23500 | pale sky, sun not yet up | the dirt's top block sits just over the north rim (still); Tomas caps beside it one higher |
| E: another day | S04 | 2000 then 6000 (a time cut) | daylight through the hole | the hole in the north wall, then patched |
| F: an afternoon | S07, S08 | 9000 | sun | the rail stub, the cart, Tomas hiding |
| G: late afternoon (the day before the last dawn) | S09 | 11000 | warm low sun | at the ladder's foot: Tomas comes down past the kid, hands empty (arms crossed) |
| H: the last dawn | S09b-S12 | 23000 -> 23500 | dark, then pale sky | Tomas too tired at the ladder's foot (drops his brick for the kid), the climb, the player on his pillar just under the rim, the hall |

## Every number said vs the picture
| said | line | the picture |
|---|---|---|
| FORTY blocks high | L01 | the wall body is exactly 40 blocks above the village ground (y0+1 .. y0+40); single capping blocks at 41 along the north rim read as a crenellated crown, not as height |
| ONE more every morning | L02, L08 | one stone brick placed by Tomas in S01b and S06 |
| TWO blocks (a zombie can't jump) | L03 | the farm's wall of full cobblestone blocks (not cobblestone-wall blocks, 1.5 high) is exactly 2 high; the zombie bumps it and stays |
| ONE block every morning | L01 | one brick a dawn on the north rim (S01b, S06); the player's dirt one more in S12 |
| a HUNDRED of us | L15 | 4 rows x 25 cells = 100 villagers in the hall, all visible through the glass roof in S11 |
| ONE block wide (not said: shown) | S11 | every cell is 1 x 1 x 2, glass-roofed, a workstation in front |

## Places
Coordinates relative to the village origin O (ground y0, the plaza bell at O). +x east, +z south.

| place | where | what's there | establishing | changes |
|---|---|---|---|---|
| village | inside the wall, interior about 64 x 64 (x -32..31, z -32..31) | 10+ houses, plaza with bell and well, a wheat farm against the north wall (x 0..14, z -31..-22): a 2-high ring of full cobblestone blocks on its west, south and east sides (x -1, x 15, z -21) with no gap, the great wall its north side, one oak door at (-1, y0+1, -24) (villagers open it; zombies can't, difficulty Normal); the old rail only inside the farm (x 6, z -31..-24), an empty minecart at its north end (6, y0+1, -31) against the wall; the kid's house at (14, -12), its window looking north-west over the farm (S02); Tomas's house at (-12, -20) | S01 (EWS up the north wall from the plaza) | none |
| wall | a square ring 2 thick at x/z = ±32..33, stone bricks: mossy and cracked rows 1-12, plain 13-30, clean new 31-40 | no gate, no door, no window anywhere; Tomas's ladder on the north wall's inner face at x -4 (z -31), rows 1-40 | S01, S03 | the hole (S04) at (10, y0+2, -33): outer row's block missing, daylight through (the inner row also missing there: one through-hole 1 x 1); patched by S04's end |
| rim | the north wall's top at y0+40, 2 wide | capping blocks at y0+41 every few blocks (past mornings); the dirt pillar flush against the outer face at (-10, y0+1..y0+41, -34), its top block one over the rim, still in S05; an old cap at (-11, y0+41, -33); no cap at x -10 | S05 (from inside, level with the rim) | S06: Tomas's new brick on the old cap at (-11, y0+42, -33), one above the dirt's top, on 'HIGHER' |
| outside | north of the wall | the trading hall: 12 wide (x -6..5) x 52 deep (z -46..-97), running north away from the wall; glass roof at y0+3, 4 rows of 25 cells along its length (1 x 1, 2 high), a villager and a workstation per cell; its door (oak, south end) at (0, y0+1, -46), facing the wall; the rail from the hall south to the wall's outer foot at (6, y0+1, -34); the player's pillar: he breaks it down after each look and rebuilds it every dawn (so S05's top one over the rim, after Tomas's brick that morning, and S11's top at y0+38, just under the rim on the morning nobody built, agree); no dirt outside before S05's dawn or in S04; lanterns inside under the glass; the ground outside the north wall at y0 (level with the village), rising into hills with spruce and a frozen stream north of the hall to the fog | S11 (from the rim) | none |

## Cast and costume
| who | look | where | notes |
|---|---|---|---|
| me (narrator) | baby villager, snowy; in S03 the kid nearest the camera | S03 play area; S09 at the ladder's foot (never on the rim before S10: L04 'never seen outside' holds); S10 on the ladder; S11 head in the foreground | holds only Tomas's stone brick, from S09b's drop through S10 |
| Tomas | adult villager, snowy mason (the apron over the snowy coat), no name tag | S01b, S06 on the rim; S04 at the frame's right edge by the patched spot (arms crossed: no hand is drawn); S07 at the frame's right edge watching the cart; S09 down the ladder past the kid; S08 by the farm door, runs off frame left (west) to his house (-12, -20) on 'RUNS' | holds a stone brick over crossed arms in S01b, S06, S08 (dropped in S08: an item on the path); hands empty in S04's second half, S09 |
| village kids | 2 baby villagers | S03, S08 | push the cart in S08 |
| zombie | plain zombie | S02 only, outside the farm ring's south side | never reaches the farm |
| the player | default Steve skin, no armour, dirt in main hand (hotbar slot 1) | S11-S12, on top of today's pillar at (-10, y0+38, -34), standing just under the rim; his pillar is S05's dirt on an earlier dawn | turns his face up on 'UP'; on 'ONE' places one dirt under himself (eyes level with the rim); never speaks |
| hall villagers | 100 adult villagers, mixed professions, snowy, each in a cell | S11, S12 bg | still (cells), heads turning idly |

## Who knows what
| who | knows | when |
|---|---|---|
| the kid | the wall, the 'brown plant', Tomas's habits; proud and sure the wall keeps them safe; climbs to see a monster; climbs for Tomas when he's too tired; at the top says plainly what he sees (a man on the brown plant, a hundred of us in tiny boxes) without understanding it | to the end; never understands, never afraid (STANDARDS 0a) |
| Tomas | came from a hall like it; knows the dirt is a player; never says "player" | from before the story |
| the player | someone is inside the wall; not that the kid is at the top until L16 | S12 |
| the viewer | guesses a monster by L07, players by L08-L11, is told it plainly at L15 | |

## Screen direction
The village is always "below/inside", outside is "north". S01b, S05 and S06 look north (up) at the rim from inside; S08 looks north-west and Tomas exits west (frame left); S11 and
S12 look north and down from the rim. The cut S11 -> S12: S11's tilt ends on the hall; S12 opens back on the player, centred (the eye jumps once, to the face that looks up).

## Continuity risks to watch
- The dirt in S05 sits still just outside the rim (no rise); S06's new brick (on the old cap beside it) tops it by one block.
- No camera before S11 sees the ground outside: S04 pitched up (sky only through the hole), S01b/S05/S06 below or level with the rim.
- S11/S12: today's pillar top at y0+38 (just under the rim, no brick put on this morning); in S12 one more dirt under him (y0+39) on 'ONE'.
- S09b: Tomas drops his brick at the kid's feet; the kid holds it in S10 (the kid's only held item).
- The rail in S07 (inside the farm) and S11 (outside) are one line cut by the wall: the same x (6); the farm ring has no gap for it.
- Tomas's stone brick dropped in S08 is not carried into S09 (a new day).
