# singing_box r1: continuity (pre-build)

Verdict: fix

## Breaks
1. **Allay's diamond doesn't render.** entities.js draws a mob's main hand only for crossed-arm villagers. Build it: ItemInHandLayer on the allay's right arm.
2. **Hole and note block (S01, S07, S08, S13).** Level with the hole, the note block seals it and its particle lands behind the wall. On deepslate it plays basedrum. Fix: hole at (x,h,-685), note block at (x,h-1,-686) on dirt, air above.
3. **Tunnel.** 1 wide, so S03's run crosses the lava; the hole sits at her eye height. Fix: 22x5x5 (x -290..-268, z -684..-680, y -54..-50), lava 2x6 on the north side, hole at y -50.
4. **Ladder.** The canon torches fill the 1-wide shaft every 4 blocks. Fix: her ladder shaft at x -289, beside the old one.
5. **His room** is 3x3x3; S13 needs a wide. Fix: 7x7x4. Split S13: MS follow in, then FS inside.
6. **Sizes:** S11 wide, S12 ws, S13 wide. Make S11 `full`.
7. **Screen direction:** the bible's "face left, ladder right" turns the camera away from the hole; S06 can't be shot. Convention: tunnel shots look east, north wall (lava, hole) frame left, ladder behind camera, home = toward camera.
8. **`shows`:** `player:Her`, `player:Neighbor` and `explosion` aren't ids. Move the people to `look` and drop `explosion`. No line has `look`.
9. **Days:** S02, S09 and S10 are all day 1500. Use S02 1489, S09/S10 1499, S11-S13 1500.
10. **Easter egg:** map.json ends the door torches and cameo `blue_sheep` at 1112. Add stamp `door_torches` (since 700) and cameo `sheep_hole`.
11. **Knowledge:** S03/S11 show ore in the face, yet she says "It's EMPTY". Use a plain face.
12. **Allay** is missing from S09, but L12 says "She looks so TIRED". Add it rising behind her.

## Notes
- Counts: S04/S05/S08 drop 2 each; S12 drops exactly one item.
- L14: add a note on SANG. L01: change `note_block@ONE` to `diamond@ONE`.
- L11's noise has no on-screen cause.
- Aoede (Rosa) and Erinome are already used; noor/efe were held for conflicts 18/19.
- Claim the place in map.json.
