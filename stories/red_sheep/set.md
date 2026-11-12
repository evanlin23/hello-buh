# red_sheep: set plan (r5, 2026-11-11: L08/S08 cut, L13 said over S13; world pass 2026-11-11)

Built with `world.build(ctx, { story: 'red_sheep' })` on Ravenford's canonical pieces, with these story-only stamps on
top. No site search and no clearing (STANDARDS 3.5).

## What the narration claims (check each on stills from every shot angle before recording)
| claim | line | check |
|---|---|---|
| every sheep in the village is blue, sixty of them | L01 | S01: count 60 sheep, all `Color:11`; no white or other wool anywhere in any shot except the S02 stray and the S06 red one |
| Dad won't let a white one through the gate | L02 | S02: the stray is white until 'GATE', then blue, then through the gate |
| sheep (can't see that good) | L04 | S04: one blue sheep, full figure, staring at the lens |
| he counts them every night | L05 | S05 is at nightfall (13000), Dad walking among the flock |
| one came back from the woods red | L06 | S06: one red sheep, the birch treeline visible behind it |
| Dad sat at the gate with his crossbow | L07 | S07: the crossbow, in his hand on the camera's side, reads at 300 px past his body |
| I forgot to shut the gate, my lamb got out | L09 | S09: the gate open in frame, the lamb outside it |
| Dad says never go in the woods | L10 | S10: Dad (13 blocks out, in the field) and the woods both in frame |
| (went in) | L11 | S11: birch trunks all round, the lamb ahead |
| a grey man in the trees raised his arms, my lamb turned red | L13 | S13: the evoker between the trunks, arms going up around 'ARMS' (2.0 s before 'RED'); the lamb blue, then red on 'RED' |

## The world (docs/world/map.json, as of day 2300)
`world.build(ctx, { story: 'red_sheep' })` now builds, from Ravenford's stamps: Grandpa's house and yard
(`grandpa_house`, ported from stunts/story_thirty_one_raids.js), the totem wall with all 32 frames full
(`totem_wall`), the pasture fence (`pasture`: gate + (-29..-1, 13..40) on the natural ground, survey-checked: clear of
the generated village house at gate + (-10..-4, 3..11), the trees at (-22..-18, 1..5) and the farm at (-52..-44, 3..7))
and eight blue sheep (`blue_flock`, live; kill or keep them under the 60). The **palisade and east gate are still
Thirty-One Raids' build**: port them (gate-relative, on the terrain) into map.json before recording, with the pasture
gate (a fence gate, lantern post) in the palisade at (0, 0, 15).

| claim | line | check |
|---|---|---|
| (the easter egg) Grandpa's house, the totems, Grandpa | L04 | S04 still: the west south window lit with gold in it, the bench with the zuri actor, both soft; nothing named |

## Pieces
- **The pasture:** the canonical palisade, plus the oak-fence pasture (map.json `pasture`: gate + (-29..-1, 13..40),
  29 x 28; the old ~40 x 30 plan collided with the village) with its gate in the east palisade at (0, 0, 15).
  Natural grass and slope (y 67-78 along the south fence); no flattening beyond the fence line.
- **S04's background (the cameo):** the camera at gate + (-13, 1.4, 18) looking north. Its axis runs over the pasture's
  north fence (top ~y 75.5 at z 13; keep the lens 1.4 up so the fence doesn't cut the window), the road, the yard's
  south fence (y 72) and into Grandpa's west south window at (-13, 74-75, -9). Inside, the totem wall's west column
  (frames at x -13, y 74-77, z -16) and the floor lantern under it make the glint. Open the window's trapdoor
  shutters (they are). Grandpa sits on the bench (-8..-7, 72, -8), turned east down the road (not at the lens), about 5 blocks right of the axis, no name plate (`playerNames` off).
- **Check S04 on a still before recording** (continuity r6): the ground at (-13, 18) is y 74 on the survey, so the lens 1.4 up sits at ~76.4, over the north fence's top (75.0) and the window (y 74-76). The line to the bench grazes the generated house's corner (-10, 3) by ~0.2: if it clips Grandpa, stand him at (-9, 1, -6) instead; if the window is cut, raise the lens to 75.6+ absolute and put the sheep 4 blocks out.
- **Lanterns:** on the pasture gate post, and on the palisade every 8 blocks along the east side.
- **The flock:** 60 sheep summoned with `Color:11`. S02: one more with `Color:0` (white), dyed in shot. S06: one with
  `Color:14` (red). The lamb: a baby sheep (`Age:-24000`, refreshed so it never grows), `Color:11`,
  `PersistenceRequired`.
- **The woods:** the birch past the ford at +40; the clearing at +45..+56 (S11-S13).
- **The evoker:** summoned for S13 only, behind a trunk out of S11/S12's frustum, `mobGriefing` true. Prefer the real
  spell: summon it with AI where the lamb is its only blue sheep in range and the camera player is hidden from it
  until the cast begins. If AI can't be cued on time, `NoAI` + pose and set the lamb's colour with `/data` at the
  cue, with the sounds and particles placed by hand on vanilla's timing (bible "The mechanic").
- **The birch:** check the seed has birch at +45..+56 next to the tower's slope (+44, +40); stamp birch trunks there if not.
- **The order matters:** the colour spell only fires while the evoker has NO target, and the kid at 9.6 blocks in view would be targeted first. Either keep her out of its sight until the cast starts (the trunk; `/team` or a later spawn of the camera player), or script it: `NoAI` + the raised-arms pose, the lamb's colour set with `/data` on the cast tick, the sounds placed on vanilla's timing.
- **No fangs and no vexes on screen:** the shot cuts 1.0 s after 'RED'. Real AI would summon vexes next; if real AI is used, the cut lands before they appear.

## Engine checks before building (see the engine gaps in reviews/r3-engine.md)
- Sheep colour change mid-shot read per frame.
- The evoker's raised spellcasting arms and the spell particles at its hands.

## Scale
- The pasture at full scale, 60 sheep in one EWS (S01).
- The woods begin 40+ blocks from the gate: "places far apart in the story are far apart on screen".

## Pre-build checklist
1. Done on main 2026-11-11: the pasture (`since: 1900`), Grandpa's house and the totem wall are stamps, and
   `"red_sheep": {"day": 2300, "places": ["ravenford"], "cameos": ["totem_wall"]}` is in map.json `stories`. Still to
   do: port Thirty-One Raids' palisade and east gate into map.json (with the pasture gate at (0, 0, 15)), and widen
   Ravenford's footprint east to x <= -1975 for the clearing (r3 continuity). Then `node scripts/world.js check`.
2. The S01 crane (west of the pasture, looking east at (-10, 0, 15)): re-aim at the pasture's middle, about
   (-15, 0, 26), now that it is fitted (its west side is open grass to x -40; the generated house at (-39..-33, 3..11)
   is north-west, out of frame).
3. The engine features in reviews/r3-engine.md.
4. Shot sheet: the lamb's blue and its red read at 300 px in S12-S13.
