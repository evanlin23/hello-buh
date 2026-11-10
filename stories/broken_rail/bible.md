# broken_rail: continuity bible (r2 polish)

## World
- **Where:** the rail town on the High Meadow's east top (the plateau falls away west of it under the sunset). The
  town's single line runs south from the station at its south edge, over a stone bridge across a river ravine, off the
  plateau south-west and on round the bay and west along the White's south edge toward Grandma's sister's village
  (sign: ELMWATER 4500, off the mapped world). The crater is 3,000 blocks down the line on a valley floor in the West
  March's south lakes. The place and the day are below ("The place and the day").
- **Scene order and time (ticks):**

| scene | shots | lines | time | sun | notes |
|---|---|---|---|---|---|
| 1 the station, day 1 | S01-S02 | L01-L02 | 12500 | low, frame right in S01 (west; the camera looks south) | lamps lit, warm sky |
| 2 our gate, the sidings, the yard | S03-S06 | L03-L06 | 12600-12650 | low, west | same evening, minutes later |
| 3 the station to the bridge | S07 | L07 | 13000 | just set | lamp posts lit |
| 4 the bridge foot, midnight | S08 | L08 | 18000 | moon overhead | the night he turns ten |
| 5 the line | S09 | L09 | 23300 | sunrise, frame left (east; the camera looks south) | day 2 |
| 6 the crater | S10-S12b | L10-L12 | 4700-5000 | high, morning | day 2 |
| 7 the station, day 2 | S13-S14 | L13-L14 | 12800 | low, west | the same lamps lit |

- **Weather:** clear throughout. **Fog:** none needed (`look.fog: false`); render distance gives the haze in S09.
- **Season:** summer green; flowers in the crater (dandelions, ferns, short grass).
- **Days elapsed in the story:** two evenings and the night between. Backstory: 22 years since Grandma left.

### The place and the day (shared world, docs/world/canon.md)
- **Places:** two new places to claim, each in its own commit before building (not done here):
  - `rail_town` (the station site, origin = the buffer stop) on the High Meadow's east top, about (-305, 116, -770),
    footprint about (-345, -815, -280, -700), the bridge's north foot about 40 blocks south of the buffer:
    `./hb world claim rail_town --name "The Rail Town" --kind village --region the_green --at -305,116,-770 --footprint -345,-815,-280,-700 --story broken_rail --day 8400`
  - `rail_crater` (the valley site, origin = the crater's centre) 3,000 blocks down the line in a green valley of the
    West March's south lakes, about (-2050, 66, -250), footprint about (-2075, -310, -2025, -190):
    `./hb world claim rail_crater --name "The Crater on the Line" --kind landmark --region the_west_march --at -2050,66,-250 --footprint -2075,-310,-2025,-190 --story broken_rail --day 8400`
  Read both ground heights off the survey grid first. Then add the pieces and stamps below and
  `stories.broken_rail.cameos: ["torch_hill"]`, and run `./hb world check`.
- **Day:** 8400. Grandma left "TWENTY-TWO YEARS" ago (8,030 days): on day ~370, outside the Long Day (800-1100, no
  evenings then, so Grandpa's "every evening" skipped 300 of them). The midnight scene (S08) is outside it too.
- **Who:** a new family, not Milo's: Ezra (a player kid turning ten, the house narrator voice), Mom (cleric), Grandpa
  (toolsmith) and Grandma JUNE (farmer), all plains villagers. One grandpa in this Short, called Grandpa only by his
  own grandchild. JUNE is new (Names in the Woods has ROSA; ROSE was renamed to keep them apart).
- **Stands alone:** no line names a place or another story.

### Canon consequences to record (map.json and canon.md, in the claim commits; canon files not edited here)
| what | since | stamp / note |
|---|---|---|
| The rail town: village, station, sidings (OTTO's and JUNE's spurs), our cottage and yard loop, the bridge, the line | ~370 or earlier | pieces and stamps at `rail_town`; the line itself is story-only beyond the bridge |
| The creeper crater on the line, Grandma's cart stopped on the dead gold rail at its far lip | ~370 | stamp at `rail_crater` (until 8400) |
| The crater bridged: 7 dirt and 7 rails, the gold rail's redstone torch relit | 8400 | stamp at `rail_crater`, since 8400 |
| Grandma comes home: her cart at the buffer, JUNE's spur still empty, Grandma standing beside Grandpa | 8400 | stamp at `rail_town`, since 8400; timeline row: **8400, the rail town. The Broken Rail.** "Ezra walks the line, bridges the crater and pushes Grandma home after 22 years." |

## Every number: said vs shown
| said | where | the picture must show |
|---|---|---|
| "TWENTY-TWO YEARS" | L01 | nothing countable; the crater fully grown over (old), the JUNE sign weathered |
| "Every EVENING" | L02 | dusk in S01-S07 and again in S13-S14 |
| "TEN" (his age) | L08 | Ezra is the default Steve skin; nothing contradicts. The narrator voice is Pip's nine-year-old recipe (owner rule) |
| "THREE THOUSAND blocks" | L09 | S09 shows a long line over a ridge into a valley; no coordinates or other numbers in frame. ELMWATER 4500 (S02) is further than the crater: consistent |
| the timing | - | leave the bridge at 18000; sprint 3,000 blocks at 5.6 b/s ≈ 536 s ≈ 10,700 ticks → crater at ~4700 (S10); fix and push by ~5000; the cart at 8 b/s ≈ 375 s ≈ 7,500 ticks → buffer at ~12500-12800 (S13-S14). Dusk at both ends. |
| 7 dirt, 7 rails | S12a (not said) | the crater is 7 wide at rail height: 7 dirt (3 already placed at the jump cut, 4 on screen) and 7 rails |
| gold rail every 8 blocks | S09 (not said) | a powered rail with a redstone torch beside it every 8 blocks |

## Places
Two sites, each with its own origin. **Station site:** origin = the buffer stop (0,0), x east, z south. **Valley
site:** origin = the crater's centre at rail height, x east, z south.

| place | where | what's there | the establishing shot | changes |
|---|---|---|---|---|
| station | station site: buffer (0,0); Grandpa's mark (0,-1); activator rail (0,1); platform x -3..-1, z -2..14, plus a north apron of slabs at x -3..0, z -2..-1 (Grandpa stands on it) | stone-slab platform west of the line, buffer stop (stone-brick wall + slab + lantern), a powered activator rail (red; a redstone torch under the platform edge keeps it on) as the last rail, lamp posts, a bench at (-2,-1), at frame left in S01/S13 and clear of Grandpa, sign ELMWATER 4500 → | S01 (5 behind and 2 west of Grandpa, looking south), S02 crane | none; S13 repeats S01's frame |
| sidings | station site (4..7, -3..4), east of the main line | two short spurs with buffer stops: OTTO's (a minecart) and JUNE's (empty), oak signs over each | S04 (looking north, JUNE's spur centred; bg the village) | none; JUNE's spur is in S14's bg, still empty |
| our gate and yard | station site: cottage (spruce) door at (-18,-12), garden gate at (-16,-5), yard loop at (-22..-18, -6..-2) | a 5x5 rail loop, the pig in a minecart on it, fence, carrot patch | S03 (camera 10 behind Mom at the gate, looking ESE to the station, the yard loop in fg); S05 (looking north at the cottage, no station in frame) | none |
| village | station site, z < -10 | a vanilla plains village (placed once at its canonical spot, map.json) built onto, roofs and chimney smoke | S02 crane, S04 bg | none |
| bridge | station site: end_a (0,40), end_b (0,64) | library `bridge`, length ~25, drop 10, over a river ravine, the rail down its deck, lamp posts lit | S07 (crane from Grandpa's shoulder) | none |
| the line | south of the bridge | rail over a ridge and down into a valley; powered rails + redstone torches every 8 blocks | S09 crane | none |
| crater | valley site: centre (0,-2,0); near stub ends at (0,0,-4), far stub ends at the dead gold rail (0,0,4) | crater 7 wide, 3 deep, all grass with ferns and dandelions; the far stub's last rail is a powered rail with its torch's block air | S10 (POV from the north lip) | S12a: 7 dirt + 7 rails across, a redstone torch placed (the gold rail lights); S12b: the cart leaves north |

## Cast and costume
| who | mob / skin | outfit | name tag | where, per scene | state changes |
|---|---|---|---|---|---|
| Ezra (narrator) | player, default Steve | none | none | yard (S06 POV), bridge foot (S08 POV), line (S09, tiny), crater (S10-S12) | none; not at the station at the end |
| Grandpa | villager, plains, toolsmith (black apron) | standing | none | **always at (0,-1), north of the buffer, body facing south**; in S01 and S13 his head is turned ~40 deg west toward the sunset (so the face reads in three-quarter): S01, S02, S03 bg, S07, S13, S14 | S14: head turns to the cart, tips on "dear" |
| Grandma | villager, plains, farmer (straw hat) | sitting in a minecart, then standing | none | in her cart on the crater's far lip (S11a-S12b), on the line (S13), set down at (0,1) (S14) | facing north (home) in every shot; S14: set down standing by the activator rail |
| Mom | villager, plains, cleric (purple robe) | standing | none | at our garden gate, facing the station (S03) | none |
| the pig | pig, no saddle | sitting in a minecart | none | the yard loop (S03 fg, S05-S06), stationary cart | head follows the carrot in S06 |

## Props
| prop | first seen | state | where | later |
|---|---|---|---|---|
| buffer stop | S01 | stone-brick wall, slab cap, lantern lit | station (0,0) | S02, S07, S13, S14 (the cart knocks into it) |
| activator rail | S01 | powered (lit red) | station (0,1) | S13; S14 sets Grandma down |
| OTTO's cart | S04 | empty minecart on the left spur | sidings | S02 (small) |
| JUNE's spur | S04 | empty, sign JUNE | sidings | S02 (small), S14 bg |
| the pig's cart and loop | S03 fg | minecart, stationary, pig inside | yard | S05, S06 |
| hotbar | S06 | slot 1 empty, 2 carrot, 3 dirt (64), 4 redstone torch (8); health and hunger full, no armour | POV | S08 (carrot selected; the rails (64) arrive in slot 1 and are selected on "RAILS": the packing), S10-S11a (rails), S12a (dirt, rails, torch) |
| her cart | S11a | minecart stopped on a dark powered rail, Grandma in it | valley (0,0,4) | S12b leaves north; S13 off the bridge (~45 out) to ~27 out at the cut; S14 hopped to ~3 out, knocks the buffer |
| the dead gold rail | S11a | powered rail, unpowered (dark), torch block empty | valley (0,0,4) | S12a: torch placed, rail lit |
| crater | S10 | grassed over | valley centre | S12a bridged |
| lit gold rails | S09 | every 8 blocks, torch beside each | the line | S13 |
| the easter egg: Torch Hill's lone torch (canon cameo `torch_hill`) | S08 (bg, left of centre, ~2 s) | lit, one warm point in the dark | on the slope under the High Meadow at (-290, -684), about 48 blocks south of the bridge's north foot and below it (built by `world.build`) | none (S08 only) |

## Positions and screen direction
- **The line runs north (home) to south (away).** POV shots on the walk look south (S08, S10, S11a, S12a).
- **Side-on camera shots keep home on frame LEFT:** S02 (camera west of the platform, looking east), S12b (west of the
  cart, looking east: the cart leaves left), S14 (at (-6,1.6,0), looking east: Grandpa left at (0,-1), the cart in
  from the right, JUNE's spur behind).
- **S01, S07 and S13** look south along the line from behind Grandpa's right shoulder: the cart in S13 comes toward the
  lens.
- No conversations: in S14 Grandma and Grandpa face each other across the buffer stop, in profile.

## The narrator
- Holds: the carrot in S06 (no rails yet); the carrot still selected at the start of S08, the rails appear and are selected on "RAILS"; the rails in S10-S11a;
  dirt, then rails, then the redstone torch in S12a. Hearts and hunger full. No armour.
- Where Ezra is per line: L01-L05 not on screen (narrating; L03-L05 he's in the yard, off frame); L06 at the cart (POV);
  L07 not on screen; L08 at the bridge foot; L09 on the line (tiny); L10-L12 at the crater (S12a walks him across the new rails to the far side); L13-L14 walking home, off
  screen.

## Who knows what
| line | Ezra knows | Grandpa knows | Mom knows | the viewer can know |
|---|---|---|---|---|
| L01-L02 | Grandpa waits for a cart that never comes | she's on her way (belief) | (thinks) she left | "the same minecart" is odd |
| L03-L04 | Mom's story; the cart's gone | | she left him (wrong) | the cart is missing too |
| L05-L06 | the pig "loves" its cart | | | mobs can't get out of carts |
| L07-L08 | the rules; then his theory: the rail's broken | | | she's stuck somewhere on the line (gets ahead) |
| L09-L10 | the line is broken | | | the theory is right |
| L11 | Grandma is in the cart, facing home | | | everything |
| L12-L14 | he sent her home | sees her arrive | (off screen) | |

## Clue map
| clue | where planted | how it's misread | what it means after the twist |
|---|---|---|---|
| "the SAME MINECART" | L01, S01 | a saying | the same cart, literally |
| "She's on her WAY." | L02, S02 | denial | the truth |
| JUNE's empty spur | L04, S04 (picture) | "Kept the CART, too. RUDE." | the cart is stuck with her |
| pig in a cart | S03 fg, L05-L06, S05-S06 (picture) | "LOVES it" | mobs can't dismount carts |
| the activator rail | S01, S13 (picture) | unremarked | how she gets out at the end |
| lit gold rails | S09 (picture) | scenery | the line works except at the crater |
| the crater, grown over | L10, S10 | the theory confirmed | the break, as old as her absence |

## Easter egg (shared world)
Canon cameo `torch_hill` (since day 300): the lone torch on the slope under the High Meadow, in **S08 only** (midnight,
the bridge's north foot looking south), one warm point about 48 blocks ahead and below, left of centre. Listed in
Props; `world.build` builds it. Never the subject, never named.
