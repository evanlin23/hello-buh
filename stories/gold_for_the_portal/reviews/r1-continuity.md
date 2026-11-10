# r1 continuity (pre-build)
Verdict: fix

## Breaks
1. **S11/L08:** Grandma is "3 blocks away at the ladder's foot", but the ladder is about 8 blocks from the portal. Fix: put her 3 blocks off in mid-cellar (about x6 z4). S12 opens with her already climbing.
2. **S10:** Grandma is at the portal in S09, then gone. Add "Grandma walking off frame left toward the ladder".
3. **The 64 gold first shows up in S11.** Bible row: *F: 64 gold in slot 1 from S08 (shown in the barrel screen's inventory), held S09-S12, empty after the throw.*
4. **S13:** looking east from the bed, the ladder is about 90° to the left, so Grandma's feet are out of frame, and she is the cause of S14's ingot. Fix: camera at about (1.3,F+2.5,9.7), FOV 70, aimed NE, so the ladder is on the left edge (check on a still). Fallback: her steps on the ladder and the trapdoor sound on 'OUT'.
5. **S05:** the camera is SE of the door looking at the cottage, so the village (south) is behind the lens. Put the camera north of the gate looking south, with the cottage corner at frame right.
6. **S01:** from about x4 the ladder is behind the camera. Drop "ladder at frame left" here and in the bible.

## Notes
- S01: one ingot can't be in the air from frame 1 to 'PORTAL'. Throw it on 'THROWN'.
- The `gifts_barrel` z is 2 in story.json and 3 in the bible and set brief. Use 3. It's on frame **left** looking east (S12).
- "ENDER PEARLS": drop a pile of 3, not one.
- S12: 2 blocks is too tight for a 5-tall frame. Use 4 blocks, and empty the slot on the throw word.
- S02: at 18000 the moon is overhead (use about 14500).
- Set: clear the bookshelf, brewing stand and cauldron at x11. Sink the frame's bottom row to y-6 (it fits with no dip). Move the centre table (S01), the lantern (4,_,5) (S10) and the cobweb at the ladder foot.
- L03 `look "self"` won't resolve to anything. Use `actor:<bot>`.
