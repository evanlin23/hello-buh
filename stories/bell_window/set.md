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
| he climbed out past the bell to wave hi (L10) | he climbs two blocks east onto the porch roof; the line from the skeleton's eye to him now passes 1.5 blocks east of the bell's centre | S07, S08 |

## The line-up check (the audit's must-changes 1 and 2), before anything else
Convention: x and z are block centres, y is the block floor (a half-block shift makes the line miss the 0.375-wide bell). Origin = the square's ground block under his window; the window faces north (-z). Numbers from r3-continuity's simulated vanilla arrow (eye -0.1, aimed at the target's feet +0.6 with a lift of 0.2 x distance, 1.6 blocks/tick, drag 0.99, gravity 0.05).
- **His window:** 1 wide x 2 high (y 4-5) in the north wall at z 0, so he can step out of it. He stands at feet (0, 4, 0.8), eye 5.62. The porch roof's walking surface: y 4, east of the window, from z -1.
- **The bell:** block (0, 7, -3), attached on the x axis (double_wall) between two oak-log posts at x +-1, y 1-7 (a bell needs sturdy faces: not fences), nothing above it, on a cobblestone base. It is Saltmouth's own meeting-point bell, re-hung here: one bell in the village.
- **The skeleton:** feet (0, 9, -12) on a cliff **8-11 high, <= 15 blocks from the window**: a sheer stone face whose top edge is no further south than z -9.5 (or the edge cuts both lines). The oak's trunk off its block, at (2, 9, -13); its lowest leaves above the S08 sight line.
- **The arrow** crosses z -3 at y **7.46**, inside the bell's ring zone (7.25-7.81): **the bell is on the line.**
- **Its sight line** (eye to eye) crosses at 7.14, under the bell's lip (7.25): the bell doesn't block its view, so it sees him and shoots.
- **S08:** he stands at (2, 4, -1) on the porch roof: the line passes east of the bell and the east post. Nothing between them.
- **The yard:** the cliff edge hides the ground around the house from the skeleton, so only his upstairs window is in its view (why it never shoots him by day, outdoors).
- **The live gate:** a live-AI skeleton at its spot, 20 shots at a player at the window; at least 16 must ring the bell. Move the bell in half-blocks until they do, then re-check S08's clearance.
- On the survey grid, find (or stamp) a Saltmouth house whose upstairs window faces such a cliff. Record x, z in map.json. If none lines up, stamp the house, or move the story to another plains village, with the critic and continuity agreeing.

## The skeleton
Summoned under the oak with `PersistenceRequired`, no AI wandering off the shade (`NoAI` until S08, then its draw is staged). In S05 at 6000 it stands in shade (it doesn't burn). Its shots are real arrows (`/summon arrow` with motion along the line) so the bell rings by vanilla rules. S08: the bow raised to full draw on the `draw` mark (engine gap: the bow-draw arms).

## Set dressing
- The neighbours' windows in S04: stamp open spruce-trapdoor shutters (generated houses have bare glass panes), so "every window is open" reads.
- S04's aim is set once the house is placed, so Saltmouth's ruined portal (-269, -366) is in frame.
- The stamps from day 1700 need an `until` (or a canon fate for the skeleton after day 2000) so they don't build into Good Boy (day 3300).

## Pre-build checklist
1. Saltmouth stamps `cliff_oak` (since 1700), `bell_frame` and `boy_house` (two storeys, porch roof east of the upstairs window) in map.json; `"bell_window": {"day": 2000, "places": ["saltmouth"], "status": "claimed", "cameos": ["saltmouth_portal"]}`; register `saltmouth_portal` as a cameo (since 0).
2. The line-up check above, with the numbers from the real terrain.
3. Engine: see the engine check in the hand-off (bow-draw arms; bell swing; stuck arrow).
