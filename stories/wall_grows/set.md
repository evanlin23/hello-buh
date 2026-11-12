# wall_grows: set brief and the narration's claims (r3; world pass 2026-11-11)

Two sides of one wall: the village inside (S01-S10) and the trading hall outside (S11-S12). Built on real terrain at
**Highwall** (map.json `highwall`: O = (-1594, 133, -524), footprint (-1634..-1554, -624..-484); a snowy plateau,
interior mostly y 132-140 (a dip to 118 at the south-west corner: the wall is taller there), the hall's strip (O + (-6..5, -46..-97)) at y 130-136:
survey 2026-11-11), at full scale with `/fill`. `world.build(ctx, { story: 'wall_grows' })` builds nothing there yet:
the wall, the village and the hall are this set (map.json `highwall.story_builds`); write the wall back as a stamp
when it's built. Snowy villagers; one snow layer stays on the ground outside the paths and the farm and on house roofs; none on the hall's glass roof, the rim, the caps or the dirt pillar (plain dirt). `doMobSpawning false` (S02's zombie is ours). Every build follows
`docs/building_guide.md` (7+, the wall 8+ as the focal build). Coordinates: bible.md "Places".

## Pieces
| piece | notes |
|---|---|
| the wall | square ring, 2 thick, 40 high above the village ground (follow the terrain: the top is level at y0+40, so the wall is taller where the ground dips, never shorter than 40 inside: level the village floor to y0 first, cut and fill, survey 2026-11-11 found y 132-140 and a dip to 118); stone bricks with age bands: rows 1-12 mossy + cracked mixed, 13-30 plain with a few cracked, 31-40 clean; capping single bricks at y0+41 every 3-6 blocks along the north rim only |
| Tomas's ladder | on the north wall's inner face at x -4, rows 1-40, ending on the rim |
| the village | a snowy village of 10+ houses (library pieces, `village_snowy` style; villagers `VillagerData.type:snowy`), plaza with bell and well, paths, lanterns, a wheat farm along the north wall with a 2-high wall of full cobblestone blocks around it |
| the rail stub | inside: rail from the farm north to the wall's foot at x 6, an empty minecart at its end; outside: the same line continues from the wall's outer foot to the hall |
| the trading hall | 12 wide x 52 deep, running north away from the wall, stone-brick base, glass roof at y0+3 and a glass south front; 4 rows x 25 cells, each 1 x 1 x 2 with a villager and a workstation (lectern, composter, smithing table, barrel... mixed); an oak door centred in the south end facing the wall; its strip O + (-7..6, -34..-98) levelled to y0 first (survey: y 130-136) so the door, the glass roof at y0+3 and the pillar's foot all sit on y0 |
| the player's dirt pillar | flush against the wall's outer face at x -10, z -34 (rebuilt every dawn): S05 at y0+1..y0+41, its top one over the rim; S11/S12 at y0+1..y0+38, the player standing on it just under the rim, plus one dirt at y0+39 placed on 'ONE' in S12; dirt in his hand in S11-S12 |

## Claims the narration makes (check each on stills from every shot angle before recording)
| claim | line | must hold |
|---|---|---|
| the wall grows ONE block every morning | L01, L02 | S01b and S06 each show one brick put on at dawn |
| the wall is FORTY blocks high | L02 | 40 above the village ground everywhere inside; Tomas's ladder has 40 rungs |
| no GATE | L04 | no gate, door, opening or window in the wall anywhere in any shot (the hole only in S04) |
| (implied) nobody sees outside | L04 | no shot before S11 shows the ground outside the wall (S04 pitched up at the sky; S01b, S05, S06 at or below the rim) |
| a zombie can't jump TWO blocks | L03 | the farm wall in S02 is exactly 2 high and the zombie stays outside it |
| something BROWN grows over the top every morning (a "plant") | L07 | a real dirt block, still, just outside the rim, brown against the sky at phone size (the kid never says dirt) |
| Tomas builds one HIGHER | L08 | his new brick (y0+42) stands above the dirt's top (y0+41) |
| a block VANISHED | L05 | one 1x1 through-hole at y0+2 (a player's eye height outside), then the same spot patched (shown, not said) |
| that old MINECART | L09 | an empty minecart on the rail stub's end, against the wall |
| the kids PUSH it, Tomas HIDES | L10 | it rolls along the rail while the kids are beside it |
| Tomas too TIRED to CLIMB | L13 | S09b: Tomas steps onto the bottom rung, steps back, drops his brick |
| his BRICK, went up FOR him | L14 | the kid holds the brick and climbs the ladder from the ground to the rim in S10 |
| a MAN stood on the brown PLANT | L15 | S11: the player on top of a plain dirt column against the wall's outer face, just under the rim, the column readable from the ground up |
| a HUNDRED of us, each in a tiny BOX | L15 | 100 villagers visible in 100 one-block cells through the glass roof in S11, the hall 40%+ of the frame |
| he looked UP, put down ONE more | L16 | S12: the player turns his face up, places one dirt under himself, rises level with the rim |
