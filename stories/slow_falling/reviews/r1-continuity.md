# slow_falling r1: continuity (pre-build)

Verdict: fix

## Breaks
1. **Step over the cliff (S01, S02, S10, S11).** The step at (0,24,1) sits above the retaining wall (x 0..1, y 0..10), so a straight drop lands on the ledge at y 11, not the market. Fix: step (-1,24,1), balcony out to x -1. story.json `props.step` = [-1,24,1] (it says y 23), `market_below` = [-1,0,1].
2. **Fall rate disagrees with itself.** S02 lands on FEATHER (~5.5 s after the step). In scene C she steps at ~30.2 s and lands on TIMES (~41 s), 11 s. The kid is 4.3 s behind yet "4 blocks below" (0.9 b/s, a 26 s drop). Vanilla (gravity 0.01, drag 0.98) gives about 4.5 s for 24 blocks, so she lands during L11 and S12 can't happen. Fix: record the real curve first and write T in the bible. Then retime: she steps late in L10 (after OFF), the kid ~1.5 s after her, and S13 ends on the measured touchdown. Write the gap you measure.
3. **S12 can't hold Milo.** At 3 blocks and FOV 50 the frame is 2.8 blocks tall, and he's 4+ above her. Fix: camera 7 blocks away, a 2-block gap, size full.
4. **Bench too close (S05, S13, S03).** The bench at (-6,0,6) is 8 blocks from the column, so the step is 65-70° up. FOV 50-55 can't hold Grandpa and the top. Fix: bench at (-22,0,6). S05: wide, FOV 60, camera 6 blocks back (this also fixes the full→full cut from S04). S13: from 25 blocks. S03: let the column leave the top of the frame.
5. **Balcony positions (S09, S10).** "2 blocks east of the step" is inside the cap. Looking west in S09 he'd see Grandma 1 block away, but the frame doesn't place her. Bible row: *Milo, S09-S10: (-1,24,-1), north of the exit hole; S09 looks north-west (Grandma off frame left); S10 turns south-west to her; she faces west, back to him.*
6. **Screen direction.** With the camera west of her looking east, the column (z 0) is north of her (z 1), so it's frame LEFT in S02/S12. Fix the bible.
7. **Owner checks.** L06 `look` Grandpa on "night" fires while the crane is still above the hatch: use "TEA". `props.fountain` [1,1,0] leaves frame in S04/S08: use [1,11,0]. S06/S07 need `shots[].look {time:18000}`. S02, S04, S10, S12 name no natural ground: add the valley, hills or the eastern grove.

## Notes
- S01→S02: the bottle vanishes. Vanilla leaves an empty glass bottle in her hand (S02, S11-S13).
- A drink takes 1.6 s, and L11 is 2.1 s long. Step only after the effect icon shows.
- S06 "hatch light" vs the bible's "dark square".
- Build order: the windmill piece's air fill and ground disc cover x 0..1 from y 10, so build the column last. Above y 18 the tower shell is at x 3, so put glass on x 2 there.
- "full to wide" isn't a size name.
- L04 and L09 say the same fact. It works as a gag.
