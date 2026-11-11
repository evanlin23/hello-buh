# wall_grows: set brief and the narration's claims (r2; world pass 2026-11-11)

Two sides of one wall: the village inside (S01-S10) and the trading hall outside (S11-S12). Built on real terrain at
**Highwall** (map.json `highwall`: O = (-1594, 133, -524), footprint (-1634..-1554, -624..-484); a snowy plateau,
interior mostly y 132-140 (a dip to 118 at the south-west corner: the wall is taller there), the hall's strip (O + (-6..5, -46..-97)) at y 130-136:
survey 2026-11-11), at full scale with `/fill`. `world.build(ctx, { story: 'wall_grows' })` builds nothing there yet:
the wall, the village and the hall are this set (map.json `highwall.story_builds`); write the wall back as a stamp
when it's built. Snowy villagers; snow layers stay on the ground outside the paths and the farm. Every build follows
`docs/building_guide.md` (7+, the wall 8+ as the focal build). Coordinates: bible.md "Places".

## Pieces
| piece | notes |
|---|---|
| the wall | square ring, 2 thick, 40 high above the village ground (follow the terrain: the top is level at y0+40, so the wall is taller where the ground dips, never shorter than 40 inside); stone bricks with age bands: rows 1-12 mossy + cracked mixed, 13-30 plain with a few cracked, 31-40 clean; capping single bricks at y0+41 every 3-6 blocks along the north rim only |
| Tomas's ladder | on the north wall's inner face at x -4, rows 1-40, ending on the rim |
| the village | a plains village of 10+ houses (library pieces), plaza with bell and well, paths, lanterns, a wheat farm along the north wall with a 2-high wall of full cobblestone blocks around it |
| the rail stub | inside: rail from the farm north to the wall's foot at x 6, an empty minecart at its end; outside: the same line continues from the wall's outer foot to the hall |
| the trading hall | 12 wide x 52 deep, running north away from the wall, stone-brick base, glass roof at y0+3 and a glass south front; 4 rows x 25 cells, each 1 x 1 x 2 with a villager and a workstation (lectern, composter, smithing table, barrel... mixed); an oak door centred in the south end facing the wall |
| the player's dirt pillar | for S05 only: a dirt pillar flush against the wall's outer face at (-10, y0+1..y0+41, -34), its top block one over the rim; none in S11/S12 (he digs it down after each look); dirt in his hand in S12 |

## Claims the narration makes (check each on stills from every shot angle before recording)
| claim | line | must hold |
|---|---|---|
| the wall is FORTY blocks high | L01 | 40 above the village ground everywhere inside; Tomas's ladder has 40 rungs |
| no GATE | L04 | no gate, door, opening or window in the wall anywhere in any shot (the hole only in S04) |
| (implied) nobody sees outside | L04 | no shot before S11 shows the ground outside the wall (S04 pitched up at the sky; S01b, S05, S06 at or below the rim) |
| a zombie can't jump TWO blocks | L03 | the farm wall in S02 is exactly 2 high and the zombie stays outside it |
| something BROWN grows over the top every morning (a "plant") | L07 | a real dirt block, still, just outside the rim, brown against the sky at phone size (the kid never says dirt) |
| Tomas builds one HIGHER | L08 | his new brick (y0+42) stands above the dirt's top (y0+41) |
| a block VANISHED / back by NOON | L05 | one 1x1 through-hole at y0+2 (a player's eye height outside), then the same spot patched |
| that old MINECART | L09 | an empty minecart on the rail stub's end, against the wall |
| the kids PUSH it, Tomas HIDES | L10 | it rolls along the rail while the kids are beside it |
| his LADDER | L13 | the kid climbs the ladder from the ground to the rim in S10 |
| ANOTHER village, a HUNDRED of us, everybody gets their own ROOM | L14 | 100 villagers visible in 100 one-block cells through the glass roof in S11 |
| SOMEONE not in a ROOM looked UP | L15 | the player, the only one outside a cell, beside the hall door, turning his face up to the lens |
