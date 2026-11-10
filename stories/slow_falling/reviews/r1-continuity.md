# slow_falling r1: continuity (pre-build)

Verdict: fix

## Breaks
1. **Step over the cliff (S01-S02, S10-S11).** The step at (0,24,1) is above the wall (x 0..1, y 0..10), so she lands on the ledge. Fix: step (-1,24,1), balcony out to x -1; `props.step` [-1,24,1], `market_below` [-1,0,1].
2. **Three fall rates.** S02: ~5.5 s for 24 blocks. Scene C: she lands on TIMES ~11 s after OFF. The kid is 4.3 s behind yet "4 blocks below" (a 26 s drop). Vanilla is about 4.5 s, so she'd land during L11. Fix: record the real curve, write T in the bible, retime: she steps late in L10, he steps ~1.5 s later, S13 ends on the measured touchdown.
3. **S12:** 3 blocks at FOV 50 = 2.8 blocks tall, and Milo is 4+ up. Fix: camera 7 blocks, gap 2, size full.
4. **Bench (-6,0,6) is 8 blocks from the column.** The top is 65-70° up, so S05/S13 (and S03) can't frame Grandpa and the top. Fix: bench (-22,0,6). S05 wide, FOV 60 (also fixes the full→full cut after S04). S13 from 25 blocks.
5. **S09-S10:** "2 blocks east of the step" is inside the cap, and S09 looking west would show Grandma 1 block away. Bible row: *Milo (-1,24,-1); S09 looks north-west (Grandma off left); S10 turns south-west; she faces west, back to him.*
6. **Direction:** the camera is west looking east, so the column (z 0) is frame LEFT of her (z 1) in S02/S12. Fix the bible.
7. **Owner checks.**
   - L06 Grandpa on "night" fires above the hatch: use "TEA".
   - `props.fountain` [1,1,0] leaves the frame in S04/S08: use [1,11,0].
   - S06/S07 need `look {time:18000}`.
   - S02/S04/S10/S12 name no natural ground: add the valley or grove.

## Notes
- S01→S02 the bottle vanishes: an empty glass bottle stays in her hand.
- A drink takes 1.6 s and L11 lasts 2.1 s: step after the icon.
- S06 "hatch light" vs bible "dark square".
- Build the column after the windmill piece. Put glass on x 2 above y 18, where the shell narrows.
