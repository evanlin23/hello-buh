# singing_box r2: continuity (pre-build, confirm)

Verdict: fix

## r1 blockers
1. Allay's held diamond: **open, engine gap** (entities.js still draws no allay hand item). Build ItemInHandLayer before render; not a script fix.
2. Hole over note block, dirt (harp): resolved.
3. Tunnel 22x5, lava on the north side: resolved (but see A).
4. Ladder at x -289: resolved.
5. Room 7x7x4, S13a/S13b: resolved.
6. Sizes: resolved on paper (but see B).
7. Look-east convention: resolved.
8. `shows` ids, `look` on every line: resolved.
9. Days 1489/1499/1500: resolved.
10. `door_torches` + `sheep_hole` in set.md: resolved (framing, should-fix 2).
11. Plain face: resolved.
12. Allay in S09: resolved.

## Breaks (new, owner rules)
A. **Hole too near the ladder (S06, L06).** Hole x -284, ladder foot x -289 in the same row (z -684): from S06's camera the hole sits 3 left at 6 ahead (27 deg), outside a 9:16 frame (half-FOV 15-21 deg), so WALL's subject is off screen; and she steps off the ladder 2 blocks from the pool under "never go NEAR that". Fix: pool x -279..-274, hole (-276,-50,-685), note block (-276,-51,-686) on dirt (-276,-52,-686), room x -279..-273 z -692..-686. The whole tunnel is then within 15.4 of the box. S06: she stands at x -286, south side.
B. **S03/S11 shot from the ladder end:** the face is 21 blocks away, so the TNT (BOOM) and her (TIRED) are specks. Fix: S03 camera 5-6 blocks from the face, south side, looking east (full); she runs past frame right. S11: same on TIRED, then the allay under the hole on BOX (a pan or S11b ms). Put S04/S12 at 12 blocks (ws, pool in the left fg) so S03 to S04 changes size.

## Should-fix
1. S01: the camera "behind and left" of an allay on the north wall is in the wall. Make it right (south).
2. S09 looks SSE (157 deg). The sheep hole bears 134 deg, 23 deg off-axis, so it's out of frame. Look SE (140 deg).
3. S09/S10: her main hand must be empty under "EMPTY hands" (pickaxe in her hotbar).
4. S10 ms on him at about 8 blocks: FOV 30, or build his cottage 4-5 blocks away.
5. S13b: a camera on the north wall can't see a NW-corner ladder, so put it SW. There's no "hip slot", so the sword goes in his offhand. Pick one spot for 32: his feet (frame) or the block's top (set.md).
6. story.json: `look.note` says dusk of 1500 (it's 1489/1499). Her audition lists Erinome and "L10" (should be Zephyr, L11). S01/S03-S08 `time` "any day (1499 or before)", so S01's drop is one of the 31.

## Notes
- S13b, a new place, is a `full`: label it ws.
- L09: the climb starts on "climbs".
- Seal Torch's lava pocket (~y 42) beside her shaft.
