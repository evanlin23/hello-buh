# slow_falling r2: continuity (pre-build)

Verdict: clear

## Round-1 breaks
1. **Step over the cliff: fixed.** `step` [-2,24,1], `market_below` [-2,0,1].
2. **Fall rates: fixed.** Vanilla `travel` simulated (gravity 0.01, drag 0.98, terminal 9.8 b/s). With the effect already active at the step, 23 blocks take **88 ticks = 4.4 s**, and at landing she's still only at 8.1 b/s. The timing stands. The one exception is the new scene-A hop (story.json `timing.scene_A`): it peaks at +1.25 after 6 ticks and lands after **91 ticks = 4.55 s**, not 4.8 s. She lands ~0.25 s earlier, still on "Not one SCRATCH"; fix the number.
3. **S12: fixed.** 6.5 blocks of height in frame.
4. **Bench: fixed.** (-22,0,6).
5. **S09/S10: fixed.** Milo at (1,24,-1), Grandma off left.
6. **Direction: fixed.** The column is at frame left.
7. **Owner checks: fixed.** L06 on TEA, fountain [1,11,0], S06/S07 at time 18000, natural ground named. The L11 look word is now "OFF" and L09 aims at the fountain on "UP".

## Notes (none block)
1. **Gap numbers.** The real gap for a 0.5 s lag is 1.4 b at L12's start, 2.5 at 2 s, 2.8 at 2.4 s and 4.0 at her touchdown. The bible says "about 2.0/2.3/2.7". Both step off the same 1-wide jetty end, so at 1.4 b feet-to-feet his feet sit inside her head, and his landing spot (-2,0,1.5) is on her. Bible row: *Milo walks off the end at walking speed and carries ~1 block further west: lands about (-3,0,1). Record it; keep them 0.6 b apart sideways.*
2. **S10 distance.** At (-0.5,24,1) he is 1 block from her (step centre -1.5), not 2.5. In POV her feet are cut off (S10 is planned full). Put him at (1.0,24,1), on the balcony edge.
3. **Bible vs story.json.** The bible still says she steps on "WINDMILL" in scene A, while story.json has the hop on "jumped". shots.md is stale too (S01 "3 blocks west"). Regenerate both from story.json.
4. **S02** is the drop's first appearance at "full". S01's tilt already establishes it, so it's fine.
