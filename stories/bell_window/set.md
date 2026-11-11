# bell_window: set plan (r5; world pass 2026-11-11)

`world.build(ctx, { story: 'bell_window' })` builds canonical Saltmouth as of day 3800, from map.json (main,
2026-11-11): `buh_yard` (Good Boy's pad, cottage, fence and trees, ported), `kid_house` (the stilt house and the
boardwalk, since 3450), `belfry_bell` (two oak-fence posts capped with oak logs on a cobblestone base, the bell
double_wall between them, nothing above it, since 3450) and `skeleton` (live, 3500-3800), and the cameo `buh_yard`.
No lantern under the oak: the night floor. Origin O = (-263, 62, -340). The stamps are a first fit of the numbers below:
the live gate may move the bell, the window or the porch roof in half-blocks; write any change back to map.json.

**Why there:** the lead's call (canon link 12): the house beside Good Boy's yard, so Buh's empty yard is in the
background. Saltmouth is flat (y 69-70); its only bank is Buh's pad, whose south-east corner stands over the sea, so
the house stands on the water below it (a boardwalk; Saltmouth already has piers at village + (51..63, 25..27)). The
bank is stepped (y 69, 68, 67, 66 over the sea to z -347), not sheer: the arrow line still clears it (at z -347, y
~71.8 over a top of 67), and the house's own bulk hides the boardwalk south of it from the skeleton (the front door is
on the south side). The strip north of the house (the belfry) is in its view: only S01's villagers, running home west along it. The skeleton also sees the boardwalk east of the house (about O + (5, 1, 2)): the house hides only what's directly south of it.

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
Convention: x and z are block centres, y is the block floor (a half-block shift makes the line miss the 0.375-wide bell). Origin = the boardwalk block, O = (-263, 62, -340) under his window; the window faces north (-z). Numbers from r3-continuity's simulated vanilla arrow (eye -0.1, aimed at the target's feet +0.6 with a lift of 0.2 x distance, 1.6 blocks/tick, drag 0.99, gravity 0.05).
- **His window:** 1 wide x 2 high (y 4-5) in the north wall at z 0, so he can step out of it. He stands at feet (0, 4, 0.8), eye 5.62. The porch roof's walking surface: y 4, east of the window, from z -1.
- **The bell:** block (0, 7, -3), attached on the x axis (double_wall) between two posts at x +-1: oak fence y 1-6 capped with an oak log at y 7 (a bell needs a sturdy face beside it, the log cap gives it; the thin fence below keeps ~0.4 clearance on the S08 line, where full log posts left 0.05), nothing above it, on a cobblestone base. It is Saltmouth's own meeting-point bell, re-hung here: one bell in the village.
- **The skeleton:** feet (0, 9, -12) on the bank **9 high, 12 blocks from the window**: Buh's pad's south-east corner (its edge at z -9.5 is the pad's south face, -351 + 0.5; the steps below it run to z -7, y 4..7: both lines clear them). The oak's trunk off its block, at (2, 9, -13); its lowest leaves above the S08 sight line.
- **The arrow** crosses z -3 at y **7.46**, inside the bell's ring zone (7.25-7.81): **the bell is on the line.**
- **Its sight line** (eye to eye) crosses at 7.14, under the bell's lip (7.25): the bell doesn't block its view, so it sees him and shoots.
- **S08:** he stands at (2, 4, -1) on the porch roof: the line passes east of the bell and the east post. Nothing between them.
- **The yard (his):** the house hides the boardwalk south of it from the skeleton, and the family's door is on that side, so only his upstairs window (and the belfry strip nobody walks) is in its view (why it never shoots him by day, outdoors). Check it with the live gate: no line from its eye to a player on the boardwalk south of z 1.
- **The live gate:** a live-AI skeleton at its spot, 20 shots at a player at the window; at least 16 must ring the bell. Move the bell in half-blocks until they do, then re-check S08's clearance.
- Done 2026-11-11: the house is stamped under Buh's yard's bank (map.json `kid_house`), the numbers above with O = (-263, 62, -340).

## The skeleton
Summoned under the oak with `PersistenceRequired`, no AI wandering off the shade (`NoAI` until S08, then its draw is staged). In S05 at 6000 it stands in shade (it doesn't burn). Its shots are real arrows (`/summon arrow` with motion along the line) so the bell rings by vanilla rules. S08: the bow raised to full draw on the `draw` mark (engine gap: the bow-draw arms).

## Set dressing
- The neighbours' windows in S04: stamp open spruce-trapdoor shutters (generated houses have bare glass panes), so "every window is open" reads.
- S04 from the boardwalk's east end beside the belfry, about O + (11, 2.6, -4), looking ~5 deg south of west along his north wall: his shut shutters, the bell, the shore houses west with open shutters, villagers working. The easter egg (`buh_yard`) moved to S05: Buh's cottage on the bank just left of and behind the oak, its chimney cold (map.json `buh_yard_cold`, lanterns dark from 3401). The ruined portal is gone (buried under the pad since day 3300).
- Still the stunt's to add (no stamp): remove Saltmouth's generated plaza bell (one bell in the village), his window's spruce-trapdoor shutters, his bed. Check stills: the bank's steps over the sea (if they read as a floating shelf, `/fill -279 50 -379 -256 65 -347 dirt replace water`), S08's camera near the oak's leaves. The house is 7 x 7 inside on both floors (map.json `kid_house`, widened 2026-11-11); his door at O + (4, 4-5, 2); the porch roof runs from under the window (x 0) east.
- The skeleton stamp runs 3500-3800 (`until: 3801`), so it never builds into Good Boy (3300-3400) and stops after this Short.
- Villagers for L02: Saltmouth's houses within 48 blocks of the bell (-263, 69, -343) are the shore houses at village + (10..16, 29..35) and (12..18, 42..51) (about 29-31 blocks); keep the running villagers among those, not the far plaza.

## Pre-build checklist
1. Done on main 2026-11-11 (stamps `kid_house`, `belfry_bell`, `skeleton`, `buh_yard`; the story's entry `"bell_window": {"day": 3800, "places": ["saltmouth"], "cameos": ["buh_yard"]}`). Was: Saltmouth stamps `cliff_oak` (since 1700), `bell_frame` and `boy_house` (two storeys, porch roof east of the upstairs window) in map.json; `"bell_window": {"day": 2000, "places": ["saltmouth"], "status": "claimed", "cameos": ["saltmouth_portal"]}`; register `saltmouth_portal` as a cameo (since 0).
2. The line-up check above, with the numbers from the real terrain.
3. Engine: see the engine check in the hand-off (bow-draw arms; bell swing; stuck arrow).
