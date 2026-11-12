# seventy_below: set plan (r3, 2026-11-11)

Built with `world.build(ctx, { story: 'seventy_below' })` on Ravenford's canonical stamps (`grandpa_house`,
`totem_wall`, `pasture`, `blue_flock`), with the story-only stamps below on top. No site search, no clearing
(STANDARDS 3.5). Like Red Sheep, the palisade and east gate are still Thirty-One Raids' own build: port them into
map.json before recording (S14 shows the palisade).

## Story stamps (world coordinates)
| stamp | what | commands (sketch) |
|---|---|---|
| `seventy_room` (since 2000) | the room: carve air x -2058..-2050, y 65..67, z -501..-489; stone floor y 64 and stone walls around it; stone ceiling y 68 under the yard (under the house the cobblestone foundation is the ceiling) | `/fill -2059 64 -502 -2049 68 -488 stone`, then `/fill -2058 65 -501 -2050 67 -489 air` |
| `seventy_hole` (since 2000) | the 1x1 shaft x -2057, z -492, air y 68..70 (4 deep once the lid is broken); the lid is the yard's grass block at y 71 | `/fill -2057 68 -492 -2057 70 -492 air`; `/setblock -2057 71 -492 grass_block` |
| `grandpa_bed` (since 2000) | a red bed inside the house, head north at (-2058, 73, -500), foot (-2058, 73, -499), against the bookshelf column at z -501 | `/setblock -2058 73 -499 red_bed[facing=north,part=foot]`, `/setblock -2058 73 -500 red_bed[facing=north,part=head]` |
| the seventy (story only, live) | 69 adult zombies + 1 baby, summoned in the room with no `PersistenceRequired`, no name, `CanPickUpLoot:0b` (no items to pick up anyway), no armour; never more than 3 to a block | `/summon zombie x 65 z {CanPickUpLoot:0b}` x69, `{IsBaby:1b,CanPickUpLoot:0b}` x1; NoAI only where a shot needs faces held up (S01, S05, S07, S16: heads pitched up at the hole, K.tp with pitch) |

The yard's grass at y 71 is the canonical stamp's own; the lid is simply that block, so on every other day the yard
looks the same as in Thirty-One Raids and Red Sheep (the hole is invisible from above).

## What the narration claims (check each on stills from every shot angle before recording)
| claim | line | check |
|---|---|---|
| seventy of us live under the general's bed | L01 | S01: dozens of zombies by 'BED'; S07/S16: count 70 in the room (the baby is one); dark beyond the moonlit square |
| I'm the littlest soldier; he never takes us to fight | L02 | S02: the baby zombie full-figure, adults cut at the chest by the frame top |
| our general sleeps right above us | L03 | S03: his waist-down (zuri), the red bed; the plank floor: the room is below |
| he never goes far | L04 | S04: waist-down on the bench in his own yard, crossbow in hand; the lid in the lower-left third |
| every night he opens the hole and counts us | L05, L06 | S05: the lid breaks, night sky in the shaft end-on, his dark head; S06: his head (MCU) in the square while he counts |
| no new soldiers ever come; the world's full | L07 | S07: the room full wall to wall, no gap |
| too sleepy to count | L08 | S08: waist-down straight to the bed, the lid shut (dusk) |
| so he opened the hole in the morning | L09 | S09: a square of DAYLIGHT on the floor (time 1000) |
| Brother Seventy ran to see him, into the sun | L10 | S10: one adult zombie, no helmet, steps into the lit cell, face up |
| he went all glowy, then he was gone | L11 | S11: the vanilla fire overlay on 'GLOWY'; time cut on 'Then'; empty light, last smoke, no drops |
| sixty-nine | L12 | S12: his head in the bright square; the lid back on |
| we heard a spider at the general's window | L13 | S13: one spider on the house's south wall by the east window, at night |
| the general brought a new soldier, down the hole | L14 | S14: his waist-down by the open hole; a zombie follows, one hit, it drops in |
| (reveal) at seventy no monster comes near the general; at 69 there was room for one | L15 | S15: the south wall bare at night; no mob in frame (villagers and sheep only) |
| seventy | L16 | S16: upturned faces ring the frame, his head in the moonlit shaft |

## Light
The room has block light 0 (no torches: the story needs it dark, and vanilla would let nothing spawn in it anyway,
bible.md 'Vanilla' 5). Readability comes from the moon or sun down the 1x1 shaft and the renderer's floor
brightness (engine gap: check a light-0 room reads at 300 px; if it doesn't, raise the grade's shadows for the room
shots, never add a light source the story doesn't have).
