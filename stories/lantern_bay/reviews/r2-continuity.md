# lantern_bay r2 continuity

Verdict: clear

## Round-1 breaks
1. Wreck lit: **fixed.** #300 at -618 and the bow at -630 put light 3 on the hull at floor level. The deck (~5 up) and the chest (16 aft of #300) are at 0 until #301 goes in, after which the chest is at 11.
2. S01 lens on Grandma: **fixed** (12 behind, 6 up, -25°).
3. S02 speck: **fixed.** At FOV 30 and ~35 blocks she fills about 10% of the frame height.
4. Lighthouse: **fixed in S01, S04, S08.** S02 and S09 are still wrong; see notes 2 and 3.
5. S03b facing south, sea on frame right: **fixed.**
6. S11 points west: **fixed.**
7. S10 T-head at the bottom edge: **fixed.**
8. S05/S06 merged: **fixed.**

## Breaks
None.

## Notes
1. **The moon (this corrects my r1 note).** At 20500 vanilla's celestial angle puts the moon about 46° up, so it is out of frame in S01 and S10 (pitched down: the frame's top edge is about +10°) and in every level shot at FOV 70. Remove "the moon low in the west, in frame" from the frame text, or pitch one shot up to show it. The time can stay at 20500.
2. **S02:** the T-head is ~35 blocks from the cottage, not 20. Grandma fills a tenth of the frame, not a fifth. The lighthouse is 18.5° right of her, outside FOV 30's ±16°. Aim 4° right, or drop the lighthouse from the shot.
3. **S09:** a camera looking north-west puts the lighthouse 27° **left**. Shoot from south-east of the pair looking west (lighthouse 18° right), or change the frame text to say "frame left".
4. **S04:** from the T-head the nitwit at (-34,-12) is about 35° right and the MAE post about 26° left: both sit at the frame edges. Move the rock to about (-45,-6), which is about 14° right of a camera at (-15,1). The mooring is then about 14° left.
5. **S01 size:** Grandma at 13 blocks measures `wide` (frac 0.10), not `ews`. Relabel the shot `wide`, or end the crane at 16 blocks.
6. **S05 to S07** is a cut between two wides. It's a 180° reverse, so it reads, but making S07 `ews` (camera higher, 5 up) satisfies the size rule.
7. **S11 drowned:** "beyond the wreck" is 40+ blocks away, past the 24-block water fog, so they won't show. Any drowned within 14 of the bow would end up in #301's light in S12. Cut them from S11.
8. **S10b** says light 2 on the bow; the bible says 3. Use the bible's figure.
9. **L07:** "that SHIPWRECK" refers to a wreck the viewer hasn't seen yet. S08's line points at it, so this is acceptable.
