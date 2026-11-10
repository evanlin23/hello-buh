# r2 continuity (pre-build)
Verdict: fix (one coordinate edit, S13)

Geometry below uses the 1080x1011 game view: FOV 70 gives about 37° each side of centre, FOV 50 about 26°.

## Round-1 breaks
1. S11 mid-cellar: fixed.
2. S10 exit: fixed.
3. 64 gold row: fixed. It's in the bible and S08/S11/S12.
4. **S13: still open. My r1 camera was wrong.** From (1.3,F+2.5,9.7) aimed NE (45°), Milo on the bed's east edge (~x2.8 z9.5) sits about 82° off north, so he's on the right edge, side-on and 1.5 blocks away. That isn't "his back at lower centre". The ladder (5°) falls just outside the left edge (8°). Fix: seat Milo on the bed's north-east corner (~x2.9 z9.0), facing the portal (ESE). He then lines up with it (about 66°). Aim the camera at 40° and drop it to F+2.0 with pitch -10. Grandma on the ladder lands about 6° inside the left edge. Keep the sound fallback.
5. S05: fixed. The sun at frame left is right for a camera looking south.
6. S01 ladder: fixed.

## Notes (new; none block)
- **S14 (apply before record):** Grandma at x7 z4 is behind a camera at x7.5. Put her at about (8.8,F+1,4.8), 1.3 blocks in front of the lens and on the left edge at FOV 50. Her throw still passes the piglin.
- **S01:** from (7,z5.5) facing east, the gold chest at (8,_,1) is 77° off-axis, so it's out of frame. The portal (z4..7) also sits centred, not "right half". Fix: drop the chest from S01's frame text and the bible's L01 row, or move the camera to z7 and aim ENE.
- **S10→S11:** her S11 spot (x6 z4) is inside S10's frame, which she has just left. Use x6 z3 instead. That is still about 3.9 blocks from Milo and about 4 in front of the ladder.
- **S12:** the ladder is 5 blocks west of Milo at x7, not 8. Milo also steps back 2 blocks from S11 (x9). Fine unseen, but fix the text.
- **S07:** you can't see the ladder rungs at frame left from the ladder's foot. Camera at about (0.5,z2.8) aimed 95° puts the rungs on the left edge. Otherwise drop the rungs.
- **S05:** the camera is 5 blocks north of the gate. Confirm the garden is at least 6 deep, or the lens sits in the cottage wall.
- The `gold_chest` prop has no `at`. Add [8,1,1].
