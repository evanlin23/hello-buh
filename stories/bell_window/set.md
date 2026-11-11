# bell_window: set plan (r5)

`world.build(ctx, { story: 'bell_window' })` builds canonical Saltmouth. Stamp the oak on the edge of a sheer stone cliff face north of the house (`since: 1700`), the bell frame (the village belfry: two oak-fence posts on a cobblestone base, the bell double_wall-mounted between them, nothing above it) and his two-storey house with a porch roof east of the upstairs window. No lantern under the oak: the night floor.

## The narration's claims, and what makes each true
| claim (line) | true because | check |
|---|---|---|
| opening the window rings the bell (L01); it only rings for his window (L03) | the skeleton (16-block follow range, shoots within 15) sees him the moment the shutters open; its arrow, aimed at his chest, hits the bell on the way | the line-up below |
| the whole village runs inside (L02) | vanilla: any ring, a projectile's included, sets HEARD_BELL_TIME on villagers within 48 blocks and they go home | villagers out at 12600 (rest schedule started at 12000; still heading home) |
| it only rings for his window (L03) | he's the only player in Saltmouth; skeletons don't target villagers, so their open windows are safe | S04 by day (every shutter open but his) |
| the bell had a little feather sticking out; then poof, gone (L09) | an arrow sticks in the bell block (its fletching toward the cliff) and despawns after 1200 ticks (one minute) | S06 POV, a jump cut |
| a super pale guy under the oak who never leaves the shade (L08) | skeletons shelter in shade from the sun; the oak's shade never moves off it | S05 at 6000: fully in shade, not burning |
| he climbed out past the bell to wave hi (L10) | he steps one block east onto the porch roof; the line from the skeleton's eye to him now passes 1.5 blocks east of the bell's centre | S07, S08 |

## The line-up check (the audit's must-changes 1 and 2), before anything else
Local coordinates: origin = the square's ground under his window; the window faces north (-z).
- **His eye** at the open window: (0, 5.6, 0) (upstairs floor y 4); his chest (0, 5.0, 0).
- **The bell** at block (0, 6, -3), double_wall between posts at x = +-1 (y 1-6). Its body spans y 6.25-6.9.
- **The skeleton** on a rise **8-11 high, <= 15 blocks from the window**: feet (0, 10, -12), eye (0, 11.7, -12). 13.7 blocks to his chest.
- **The arrow's line** (its eye to his chest) at z = -3: y = 5.0 + 6.7 x 3/12 = **6.7, inside the bell's body**. The bell is on the line.
- **Its sight line** (eye to eye) at z = -3: y = 7.1, just over the bell's top (6.9-7.0): it sees him, and its arrow hits the bell. Verify in-game with a raycast; if the bell blocks sight, raise the window half a block (eye 6.1) and re-run both numbers.
- **S08**: he stands at (2, 5.6, 0) on the porch roof. The line at z = -3 is at x = 1.5: clear of the bell (x -0.5..0.5) and of the east post (x 0.875-1.125). Nothing between them.
- **The arc** (r3 critic): a real skeleton aims at a third of the target's height plus 0.2 x the horizontal distance and the arrow arcs, so it reaches z -3 nearer y 7.1 (the bell's top edge) than the straight line's 6.7. Gate: a live-AI skeleton at the oak, 20 shots at a player at the window; at least 16 must ring the bell. Move the bell in half-blocks (raise the base) until they do, then re-check S08's clearance.
- On the survey grid, find a Saltmouth house whose upstairs window faces such a rise. Record x, z in map.json. If none lines up, move the house (a stamped house) or the story to another plains village, with the critic and continuity agreeing.

## The skeleton
Summoned under the oak with `PersistenceRequired`, no AI wandering off the shade (`NoAI` until S08, then its draw is staged). In S05 at 6000 it stands in shade (it doesn't burn). Its shots are real arrows (`/summon arrow` with motion along the line) so the bell rings by vanilla rules. S08: the bow raised to full draw on the `draw` mark (engine gap: the bow-draw arms).

## Pre-build checklist
1. Saltmouth stamps `cliff_oak` (since 1700), `bell_frame` and `boy_house` (two storeys, porch roof east of the upstairs window) in map.json; `"bell_window": {"day": 2000, "places": ["saltmouth"], "status": "claimed", "cameos": ["saltmouth_portal"]}`; register `saltmouth_portal` as a cameo (since 0).
2. The line-up check above, with the numbers from the real terrain.
3. Engine: see the engine check in the hand-off (bow-draw arms; bell swing; stuck arrow).
