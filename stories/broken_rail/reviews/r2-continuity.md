# broken_rail r2: continuity (pre-build)

Verdict: clear

## Round-1 breaks
All nine are fixed in story.json, bible.md and set.md. 1: Grandpa's mark is (0,-1) in every shot, and S14's camera is (-6,1.6,0). 2: the S13 cart comes off the bridge. 3: Grandma is tp'd every tick. 4: L12 has its pauses. 5: S08 is still until RAILS. 6: L02 looks at `prop:the_line`. 7: S03 looks ESE and S05 looks north with no station. 8: the egg is at frame right (west) in S01/S13. 9: the valley props carry `site`. I checked the S03 geometry: from about (-25.5,-8) the loop is about 19 deg right of the axis, so it sits lower right in frame.

## Breaks
None.

## Notes (cheap, none block)
1. **Props: `dead_gold_rail` is at [0,0,5]**, but the bible and set.md put it at (0,0,4). At z=5 the gap would be 8 blocks, not 7. Fix it to [0,0,4].
2. **S06 time is 12500**, after S03-S05 at 12600-12650, so the sun runs backward. Set it to 12650.
3. **S13 to S14 hop.** S14 begins with L14, and the knock must come 0.3 s before it. From 15 blocks out at 8 b/s, the cart needs 1.9 s to reach the buffer, so the knock would land late or force dead air. Hop it to ~3 blocks out at the cut. S13's "~15 blocks out by the cut" should read "~27" (45 minus 18 in 2.3 s).
4. **S12a reach.** The far gold rail is ~9 blocks from the near lip, and reach is ~4.5. Laying 7 rails and placing the torch from the lip can't be done. Have the POV step forward along the new rails as it lays them and place the torch from the last rail. This also puts Milo on the far side for S12b.
5. **S01/S13: "face in three-quarter".** From 5 behind and 2 west, with him facing south, we see the back of his head. Turn his headYaw ~40 deg toward the sunset (west), or drop "face" from the frame text.
6. **Grandpa's mark (0,-1)** is outside the platform footprint (x -3..-1). Extend the north apron slabs to x=0, z -2..-1. The bench "beside his mark" at x=-1 sits between the lens and Grandpa in S01. Move it to (-2,-1) so it reads at frame left without covering him.
7. **S06 hotbar has rails (64)** before L08 "I packed RAILS". To make the line the moment he packs, give S06 carrot, dirt and torch only, and add the rails on "RAILS" in S08.
