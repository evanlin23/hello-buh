# lantern_bay r1 continuity

Verdict: fix

## Breaks
1. **S10b-S12: the wreck is already lit.** Light in water drops 1 per block. A lantern reaches 14 blocks, so with #300 two blocks from the bow the deck is at light 9-13: no "hull in the black", no reveal on L12. Row: `line_end_wreck | #300 x -618; bow x -630; drowned 15+ past #300`.
2. **S01: Grandma is under the lens on "Grandma".** End the crane 12 blocks behind her, pitched down 25°. Have her walk out.
3. **S02: Grandma is a speck** (about 30 blocks away at FOV 70). Use an over-the-shoulder camera behind Milo at the window, FOV 30.
4. **The lighthouse is out of frame in S01, S02, S04, S08 and S09.** At (-30,-55) it is 78° off west. Move the headland to about (-80,-20).
5. **S03b: looking north puts the sea on frame left.** Shoot looking south.
6. **S11: "points past him" points home.** She points over her own shoulder, west.
7. **S10: the dock and cottage are behind the camera.** Frame the T-head at the bottom edge instead.
8. **S05 to S06 is a same-size jump cut.** Make it one POV shot, the push on "TRIDENTS".

## Notes
- The far end (x -560 to -600) doesn't match 300 lanterns × 2 (they end at -618). "Dock's foot" names the T-head.
- Split the prop `last_lantern` into `line_end` (#300) and `lantern_301` (the one Milo places).
- At 18000 the moon is overhead, out of frame. Use 20500 in A and E.
- The nitwit can't be knee-deep in front of a west-looking camera. Stand him on a 1-deep rock at about (-34,-12).
- With look.fog false, S01 and S10 may show the near-end line ending at x -140. Extend it or use fogSea.
- S07 can't be EWS underwater: call it WS. S03b at 7 blocks is FS.
- Breath bar: S12 at 4 needs about 9 s underwater. Set it with marks.
- `cottage_upstairs` doesn't exist (one-room cottage) and `bay_surface` has no bible row. Give S09's sides, and say Grandma's hand is empty in S10-S11.
