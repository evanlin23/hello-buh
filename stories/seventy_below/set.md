# seventy_below: set plan (r2, 2026-11-11)

Built with `world.build(ctx, { story: 'seventy_below' })` on Ravenford's canonical stamps (`grandpa_house`,
`totem_wall`, `pasture`, `blue_flock`), with the story-only stamps below on top. No site search, no clearing
(STANDARDS 3.5). Like Red Sheep, the palisade and east gate are still Thirty-One Raids' own build: port them into
map.json before recording (S14 shows the palisade).

## Story stamps (world coordinates)
| stamp | what | commands (sketch) |
|---|---|---|
| `seventy_room` (since 2000) | the room: carve air x -2058..-2050, y 65..67, z -501..-489; stone floor y 64 and stone walls around it; stone ceiling y 68 under the yard (under the house the cobblestone foundation is the ceiling) | `/fill -2059 64 -502 -2049 68 -488 stone`, then `/fill -2058 65 -501 -2050 67 -489 air` |
| `seventy_hole` (since 2000) | the 1x1 shaft x -2057, z -490, air y 68..70; the lid is the yard's grass block at y 71 | `/fill -2057 68 -490 -2057 70 -490 air`; `/setblock -2057 71 -490 grass_block` |
| `grandpa_bed` (since 2000) | a red bed inside the house, head north at (-2058, 73, -501), foot (-2058, 73, -500) | `/setblock -2058 73 -500 red_bed[facing=north,part=foot]`, `/setblock -2058 73 -501 red_bed[facing=north,part=head]` |
| the seventy (story only, live) | 69 adult zombies + 1 baby, summoned in the room with no `PersistenceRequired`, no name, `CanPickUpLoot:0b` (no items to pick up anyway), no armour; never more than 3 to a block | `/summon zombie x 65 z {CanPickUpLoot:0b}` x69, `{IsBaby:1b,CanPickUpLoot:0b}` x1; NoAI only where a shot needs faces held up (S01, S05, S15: heads pitched up at the hole) |

The yard's grass at y 71 is the canonical stamp's own; the lid is simply that block, so on every other day the yard
looks the same as in Thirty-One Raids and Red Sheep (the hole is invisible from above).

## What the narration claims (check each on stills from every shot angle before recording)
| claim | line | check |
|---|---|---|
| seventy of us stand in the dark | L01 | S01/S15: count 70 zombies in the room (the baby is one); dark beyond the moonlit square |
| I'm the littlest soldier | L02 | S02: the baby zombie full-figure, adult zombies cut at the chest by the frame top |
| our general sleeps right on top of us | L03 | S03: his legs (zuri), the red bed, the plank floor: the room is below, 8 blocks down |
| he never goes far | L04 | S04: his legs on the bench in his own yard |
| every night he opens the hole and counts us | L05, L06 | S05: the lid breaks, night sky in the square, his dark head; S06: his head in the square while he counts |
| one day he came early | L08 | S08: a square of DAYLIGHT on the floor (time 1000) |
| Brother Seventy ran to see him, into the sun | L09 | S09: one adult zombie, no helmet, steps into the lit cell, face up |
| he went all glowy, then he was gone | L10 | S10: the vanilla fire overlay on 'GLOWY'; the death puff before 'GONE'; no drops on screen |
| sixty-nine | L11 | S11: his head in the bright square; the lid back on |
| a spider climbed the general's wall | L12 | S12: one spider on the house's south wall by the east window, at night |
| the general brought a new one, down the hole | L13 | S13: his legs by the open hole; a zombie follows and drops in |
| nothing climbed the wall after that | L14 | S14: the south wall bare at night; no mob anywhere in frame (villagers and sheep only) |
| seventy | L15 | S15: 70 faces up, his head in the square |

## Light
The room has block light 0 (no torches: the story needs it dark, and vanilla would let nothing spawn in it anyway,
bible.md 'Vanilla' 5). Readability comes from the moon or sun down the 1x1 shaft and the renderer's floor
brightness (engine gap: check a light-0 room reads at 300 px; if it doesn't, raise the grade's shadows for the room
shots, never add a light source the story doesn't have).
