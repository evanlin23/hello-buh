# scarecrow r2: continuity (pre-build)

Verdict: clear

## Round-1 breaks
1. S01 aim: **fixed** (window 11° L, patch 8° R, fence gap in).
2. S07: **fixed** (Mom 9° R, pumpkins -1..13°, scarecrow 15° L, post 23° L). The nitwit move to S02 **didn't land**, see note 1.
3. 2x2 window, four trapdoors: **fixed** (bible, set, S09, S10).
4. "GONE": **fixed** (S10b, lit 1x1 gap, streak dropped). Note 2 covers the anchor.
5. Room light: **fixed** (B lit, D lantern down and `campfire[lit=false]`).
6. Heights: **fixed** (stated everywhere). S01's "pitch about -4°" is a flat-ground number: the target at x 8 sits 2-4 above the camera's ground, so the real pitch is up. Tune on the sheet (already planned).
7. look: **fixed** (L02 "UP", L08 `prop:window`).

## Notes (none block; 1 and 2 are cheap, do them before the build)
1. **S02 end frame** (2,20,26)→(10,0,-3), FOV 50: the paddock and nitwit sit at x +1.8 (out even with a wide-master crop), the barn at +1.3, and **the scarecrow at +0.65, in frame** before L06 (the critic's no-white-body rule). Fix: key 1 looks at (4,0,-3). That puts the golem at the right edge (+1.05: check the sheet) and keeps the cottage and back wall in. Move the nitwit to the meadow south of the trail at (12, 1, 12) (x +0.8, lower right). Bible/set row: *nitwit: S02, standing in the meadow at (12, 12), facing north*.
2. **Lantern post (22,1,3)** is 34° right of S08/S10b's axis (half-width 26.5°) and 81° left in S01. The frames claim it, but it's out. Move it to **(22, 1, 1)**: 14° R in S08/S10b, 16° L in S07, and it lights the gap from 1.4 blocks. Drop the S01 claim.
3. S04: "the whole wall in frame" is false (the north end is 32° R). Drop the claim.
4. S06: the rain barrel is 88° left, not at frame left. Drop the claim.
5. S09 and S10: shutters at 1-1.5 blocks fill the frame, so the framing and owner checks will flag "full" against L08/L09's window look. Add `"size": "cu"` to both looks, or sit at the bed's far end (about 2.5 blocks).
6. S10: the patch (with the golem on it at night) is about 41° left, just outside a 70° POV. It gets closer as the camera pushes forward. Confirm on the sheet that no golem, snowball or puff shows. With a staged golem, start the throws at S11.
7. S07: Mom is 21 blocks away, about 10% of the frame height. Check that she reads at 300 px.
