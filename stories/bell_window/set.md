# bell_window: set plan (r3)

`world.build(ctx, { story: 'bell_window' })` builds canonical Saltmouth. Stamp the oak on the north rise (`since: 1700`), the bell frame (two oak-fence posts, the bell double_wall-mounted between them, nothing above it) and his two-storey house with a porch roof east of the upstairs window. No lantern under the oak: the night floor.

## The narration's claims, and what makes each true
| claim (line) | true because | check |
|---|---|---|
| opening the window rings the bell (L01) | the skeleton (16-block follow range, shoots within 15) sees him the moment the shutters open; its arrow, aimed at his chest, hits the bell on the way | the line-up below |
| the whole village runs inside (L02) | vanilla: any ring, a projectile's included, sets HEARD_BELL_TIME on villagers within 48 blocks and they go home | villagers out at 12000 (rest schedule starts then) |
| nobody's ever there (L03) | the shooter is up the cliff, 13.7 blocks off, in the dark | S02 shows nothing readable on the cliff at night |
| an arrow stuck in the bell post (L06) | a stray arrow (skeleton spread) hits the east post at his eye level; it despawns after a minute, so he only ever sees one right after a ring | S04 POV at the window |
| every window open but his (L07) | skeletons don't target villagers; nobody else needs shutters | S05 by day |
| something white under the oak all day (L08) | skeletons shelter in shade from the sun; the oak's shade never moves off it | S06 at 6000: the skeleton fully in shade, not burning |
| he leaned out past the bell (L09) | he steps one block east onto the porch roof; the line from the skeleton's eye to him now passes 1.5 blocks east of the bell's centre | S08 |

## The line-up check (the audit's must-changes 1 and 2), before anything else
Local coordinates: origin = the square's ground under his window; the window faces north (-z).
- **His eye** at the open window: (0, 5.6, 0) (upstairs floor y 4); his chest (0, 5.0, 0).
- **The bell** at block (0, 6, -3), double_wall between posts at x = +-1 (y 1-6). Its body spans y 6.25-6.9.
- **The skeleton** on a rise **8-11 high, <= 15 blocks from the window**: feet (0, 10, -12), eye (0, 11.7, -12). 13.7 blocks to his chest.
- **The arrow's line** (its eye to his chest) at z = -3: y = 5.0 + 6.7 x 3/12 = **6.7, inside the bell's body**. The bell is on the line.
- **Its sight line** (eye to eye) at z = -3: y = 7.1, just over the bell's top (6.9-7.0): it sees him, and its arrow hits the bell. Verify in-game with a raycast; if the bell blocks sight, raise the window half a block (eye 6.1) and re-run both numbers.
- **S08**: he stands at (2, 5.6, 0) on the porch roof. The line at z = -3 is at x = 1.5: clear of the bell (x -0.5..0.5) and of the east post (x 0.875-1.125). Nothing between them.
- On the survey grid, find a Saltmouth house whose upstairs window faces such a rise. Record x, z in map.json. If none lines up, move the house (a stamped house) or the story to another plains village, with the critic and continuity agreeing.

## The skeleton
Summoned under the oak with `PersistenceRequired`, no AI wandering off the shade (`NoAI` until S08, then its draw is staged). In S06 at 6000 it stands in shade (it doesn't burn). Its shots are real arrows (`/summon arrow` with motion along the line) so the bell rings by vanilla rules. S08: the bow raised to full draw on the `draw` mark (engine gap: the bow-draw arms).

## Pre-build checklist
1. Saltmouth stamps `cliff_oak` (since 1700), `bell_frame` and `boy_house` (two storeys, porch roof east of the upstairs window) in map.json; `"bell_window": {"day": 2000, "places": ["saltmouth"], "status": "claimed", "cameos": ["saltmouth_portal"]}`; register `saltmouth_portal` as a cameo (since 0).
2. The line-up check above, with the numbers from the real terrain.
3. Engine: see the engine check in the hand-off (bow-draw arms; bell swing; stuck arrow).
