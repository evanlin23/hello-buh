# broken_rail: continuity bible (r1)

## World
- **Where:** the rail town two valleys east of the carpeted village (Light Sleeper). Its single line runs south from the
  station at the town's south edge, over a stone bridge across a river ravine, through hills and down a long valley
  toward Grandma's sister's village (sign: ELMWATER 4500). The crater is 3,000 blocks down the line on the valley floor.
- **Scene order and time (ticks):**

| scene | shots | lines | time | sun | notes |
|---|---|---|---|---|---|
| 1 the station, day 1 | S01-S02 | L01-L02 | 12500 | low, frame right in S01 (west; the camera looks south) | lamps lit, warm sky |
| 2 our yard and door | S03-S05 | L03-L05 | 12500-12600 | low, behind the cottage | same evening, minutes later |
| 3 the sidings | S06 | L06 | 12650 | low | same evening |
| 4 the bridge, dusk | S07 | L07 | 13000 | just set | lamp posts lit |
| 5 the bridge, midnight | S08 | L08 | 18000 | moon overhead | the night he turns ten |
| 6 the line | S09 | L09 | 23300 | sunrise, frame left (east; the camera looks south) | day 2 |
| 7 the crater | S10-S12b | L10-L12 | 4700-5000 | high, morning | day 2 |
| 8 the station, day 2 | S13-S14 | L13-L14 | 12800 | low, west | the same lamps lit |

- **Weather:** clear throughout. **Fog:** none needed (`look.fog: false`); render distance gives the haze in S09.
- **Season:** summer green; flowers in the crater (dandelions, ferns, short grass).
- **Days elapsed in the story:** two evenings and the night between. Backstory: 22 years since Grandma left.

## Every number: said vs shown
| said | where | the picture must show |
|---|---|---|
| "TWENTY-TWO YEARS" | L01 | nothing countable on screen; the crater is fully grown over (old), the ROSE sign weathered (no contradiction) |
| "Every EVENING" | L02 | dusk in S01-S02 and again in S13-S14 |
| "TEN" (his age) | L08 | Milo is the default Steve skin; nothing contradicts |
| "THREE THOUSAND blocks" | L09 | S09 shows a long line over a ridge into a valley; no coordinates or signs with other numbers in frame. The ELMWATER 4500 sign (S02) is further than the crater: consistent |
| the timing | - | leave the bridge at 18000; sprint 3,000 blocks at 5.6 b/s ≈ 536 s ≈ 10,700 ticks → crater at ~4700 (S10); fix and push by ~5000; the cart at 8 b/s ≈ 375 s ≈ 7,500 ticks → buffer at ~12500-12800 (S13-S14). Dusk at both ends. |
| 7 dirt, 7 rails | S12a (not said) | the crater is 7 wide at rail height: 7 blocks and 7 rails |
| gold rail every 8 blocks | S09 (not said) | a powered rail with a redstone torch beside it every 8 blocks |

## Places
| place | where (from the buffer stop, x east, z south) | what's there | the establishing shot | changes |
|---|---|---|---|---|
| station | buffer at (0,0); platform x -3..-1, z 0..14 | stone-slab platform on the west side of the line, a buffer stop (stone-brick wall + slab + lantern), lamp posts, a bench, a sign ELMWATER 4500 → | S01 (behind Grandpa, looking south), S02 crane | none; S13 repeats S01's frame exactly |
| sidings | (4..7, -3..4), east of the main line | two short spurs with buffer stops: OTTO's (a minecart) and ROSE's (empty), oak signs over each | S06 | ROSE's spur stays empty (the cart arrives on the main line at the end) |
| our yard and cottage | cottage (spruce) door at (-18, -12), yard south of it | a 5x5 loop of rail in the yard, the pig in a minecart on it, fence, carrot patch | S03 | none |
| village | north of the station, z < -10 | vanilla plains village built onto, roofs and chimney smoke | S02's crane, S05 bg, S14 bg | none |
| bridge | end_a at (0, 40), end_b at (0, 64) | library `bridge`, length ~25, drop 10, over a river ravine, the rail down its deck centre, lamp posts lit | S07 (from the village bank) | none |
| the line | south of the bridge | rail over a ridge and down into a valley; powered rails + redstone torches every 8 blocks | S09 crane | none |
| crater | a separate site (the "3,000 blocks" valley floor) | crater 7 wide, 3 deep, all grass with ferns and dandelions; the near stub ends at the north lip; the far stub at the south lip ends in a dark powered rail with the torch block missing | S10 (POV from the north lip) | S12a: 7 dirt + 7 rails across, a redstone torch placed (the gold rail lights); S12b: the cart leaves |

## Cast and costume
| who | mob / skin | outfit | name tag | where, per scene | state changes |
|---|---|---|---|---|---|
| Milo (narrator) | player, default Steve | none | none | yard (S04 POV), bridge (S08 POV), line (S09, tiny), crater (S10-S12) | none; never at the station at the end |
| Grandpa | villager, plains, toolsmith (black apron) | standing | none | at the buffer stop, facing south, in S01, S02, S03 bg, S05 bg, S13, S14 | S14: turns to face the cart, head tips on "dear" |
| Grandma | villager, plains, farmer (straw hat) | sitting in a minecart | none | in her cart on the crater's far lip (S11a-S12b), on the line (S13, tiny), at the buffer (S14) | facing north (home) in every shot |
| Mom | villager, plains, cleric (purple robe) | standing in the doorway | none | our door (S05) | none |
| the pig | pig, no saddle | sitting in a minecart | none | the yard loop (S03-S04), stationary cart | head follows the carrot in S04 |
| the fletcher | villager, fletcher | walking | none | the bridge foot (S07): walks to the first lamp post and turns back | none |

## Props
| prop | first seen | state | where | later |
|---|---|---|---|---|
| buffer stop | S01 | stone-brick wall, slab cap, lantern lit | north end of the main line | S02, S13, S14 (the cart knocks into it) |
| OTTO's cart | S06 | empty minecart on the left spur | sidings | S02 (small) |
| ROSE's spur | S06 | empty, sign ROSE | sidings | S02 (small) |
| the pig's cart and loop | S03 | minecart, stationary, pig inside | yard | S04 |
| hotbar | S04 | slot 1 rails (64), 2 carrot, 3 dirt (64), 4 redstone torch (8); health and hunger full, no armour | POV | S08 (rails selected), S10-S11a (rails), S12a (dirt, then rails, then torch) |
| her cart | S11a | minecart stopped on a dark powered rail, Grandma in it | crater's far lip | S12b leaves north; S13 tiny on the line; S14 at the buffer |
| the dead gold rail | S11a | powered rail, unpowered (dark), its torch's block empty | far lip, last rail before the gap | S12a: redstone torch placed, rail lit |
| crater | S10 | grassed over | valley floor | S12a bridged |
| lit gold rails | S09 | every 8 blocks along the line, torch beside each | the line | S13 (the cart rides them, far) |

## Positions and screen direction
- **The line runs north (home) to south (away).** POV shots on the walk look south (S08, S10, S11a, S12a): the way out
  goes away from the lens.
- **Side-on camera shots keep home on frame LEFT:** S02 (camera west of the platform, looking east), S12b (camera west
  of the cart, looking east: the cart leaves to the left), S14 (camera west of the platform, looking east: Grandpa left,
  the cart arrives from the right).
- **S01 and S13** look south along the line from behind Grandpa: the cart in S13 comes toward the lens, centre frame.
- No conversations: Grandma and Grandpa face each other in S14 across the 1-block gap, in profile, on one line.

## The narrator
- Holds: a carrot in S04 (slot 2), the rails stack in S08 and S10-S11a (slot 1), dirt then rails then the redstone
  torch in S12a. Hearts and hunger full. No armour.
- Where Milo is per line: L01-L02 not on screen (narrating); L03 at the yard fence (camera); L04 at the cart (POV); L05-L07
  not on screen; L08 on the bridge deck; L09 on the line (tiny in the crane); L10-L12 at the crater; L13-L14 not at the
  station (walking home behind her).

## Who knows what
| line | Milo knows | Grandpa knows | Mom knows | the viewer can know |
|---|---|---|---|---|
| L01-L02 | Grandpa waits for a cart that never comes | she's coming (belief) | (thinks) she left | something's off about "the same minecart" |
| L03-L04 | the pig "loves" its cart | | | mobs can't get out of carts |
| L05-L07 | Mom's story; the rules | | she left him (wrong) | the cart is missing too; nobody ever went to look |
| L08-L09 | he's going to look | | | the line still works |
| L10 | the line is broken | | | she's stuck somewhere past the break (gets ahead) |
| L11 | Grandma is in the cart, facing home | | | everything |
| L12-L14 | he sent her home | sees her arrive | (off screen) | |

## Clue map
| clue | where planted | how it's misread | what it means after the twist |
|---|---|---|---|
| "the SAME MINECART" | L01, S01 | a saying | the same cart, literally |
| "She's COMING." | L02, S02 | denial | the truth |
| pig in a cart | L03-L04, S03-S04 (picture) | "He LOVES it" | mobs can't dismount carts |
| ROSE's empty spur | L06, S06 (picture) | "Kept the CART, too. RUDE." | the cart is stuck with her |
| a villager turning back at the bridge | L07, S07 (picture) | the village rule | why nobody looked in 22 years |
| lit gold rails | S09 (picture) | scenery | the line works except at the crater |
| the crater, grown over | L10, S10 | puzzling | the break, as old as her absence |

## Easter egg (shared world)
S09: the carpeted village of Light Sleeper on a far hill at frame left (carpet roofs in red and orange, the bell boxed
in white wool), small but readable as a village of carpet roofs at sunrise. **Provisional: re-check against
docs/world/canon.md when it lands.**
