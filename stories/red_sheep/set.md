# red_sheep: set plan (r4, 2026-11-11)

Built with `world.build(ctx, { story: 'red_sheep' })` on Ravenford's canonical pieces, with these story-only stamps on
top. No site search and no clearing (STANDARDS 3.5).

## What the narration claims (check each on stills from every shot angle before recording)
| claim | line | check |
|---|---|---|
| every sheep in the village is blue, sixty of them | L01 | S01: count 60 sheep, all `Color:11`; no white or other wool anywhere in any shot except the S02 stray and the S06 red one |
| Dad won't let a white one through the gate | L02 | S02: the stray is white until 'GATE', then blue, then through the gate |
| sheep (can't see that good) | L04 | S04: one blue sheep, full figure, staring at the lens |
| he counts them every night | L05 | S05 is at nightfall (13000), the flock filing past him |
| one came back from the woods red | L06 | S06: one red sheep, the birch treeline visible behind it |
| Dad sat at the gate with his crossbow | L07 | S07: the crossbow, in his hand on the camera's side, reads at 300 px past his body |
| the trees went snap x3 | L08 | three fang snaps in the mix, nothing seen |
| I forgot to shut the gate, my lamb got out | L09 | S09: the gate open in frame, the lamb outside it |
| Dad says never go in the woods | L10 | S10: Dad and the woods both in frame |
| (went in) | L11 | S11: birch trunks all round, the lamb ahead |

## Pieces
- **The pasture:** the canonical palisade, plus an oak-fence pasture inside the south wall (~40 x 30) with its gate in
  the east palisade at (0, 0, 15). Natural grass and slope; no flattening beyond the fence line.
- **Dad's house:** a small spruce house west of the pasture gate (new stamp, `since: 1950`).
- **Lanterns:** on the pasture gate post, and on the palisade every 8 blocks along the east side.
- **The flock:** 60 sheep summoned with `Color:11`. S02: one more with `Color:0` (white), dyed in shot. S06: one with
  `Color:14` (red). The lamb: a baby sheep (`Age:-24000`, refreshed so it never grows), `Color:11`,
  `PersistenceRequired`.
- **The woods:** the birch past the ford at +40; the clearing at +45..+54 (S11-S13).
- **The evoker:** summoned for S13 only, behind a trunk out of S11/S12's frustum, `mobGriefing` true. Prefer the real
  spell: summon it with AI where the lamb is its only blue sheep in range and the camera player is hidden from it
  until the cast begins. If AI can't be cued on time, `NoAI` + pose and set the lamb's colour with `/data` at the
  cue, with the sounds and particles placed by hand on vanilla's timing (bible "The mechanic").
- **The birch:** check the seed has birch at +45..+54 next to the tower's slope (+44, +40); stamp birch trunks there if not.
- **No fangs and no vexes on screen:** the shot cuts at +1.3 s. Real AI would summon vexes next; if real AI is used, the cut lands before they appear.

## Engine checks before building (see the engine gaps in reviews/r3-engine.md)
- Sheep colour change mid-shot read per frame.
- The evoker's raised spellcasting arms and the spell particles at its hands.

## Scale
- The pasture at full scale, 60 sheep in one EWS (S01).
- The woods begin 40+ blocks from the gate: "places far apart in the story are far apart on screen".

## Pre-build checklist
1. Port Thirty-One Raids' palisade and east gate into map.json `ravenford` pieces and stamps; add the pasture, its
   gate and Dad's house (`since: 1950`).
2. Add `"red_sheep": {"day": 2100, "places": ["ravenford"], "status": "claimed", "cameos": ["raven_tower"]}` to
   map.json `stories`, then `node scripts/world.js check`.
3. The engine features in reviews/r3-engine.md.
4. Shot sheet: the lamb's blue and its red read at 300 px in S12-S13.
