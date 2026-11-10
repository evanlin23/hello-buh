# lantern_bay r1: continuity (pre-build)

Verdict: fix

## Breaks
1. **The wreck is already lit (S10b, S11, S12).** In both vanilla and `renderer/light.js`, block light drops 1 per block in water, so a lantern lights 14 blocks around it (the bible says 2 per block and 7 blocks). With #300 two blocks short of the bow, the deck sits at light 9-13 before Milo places anything, so "hull in the black" and the light hitting the wreck on L12 can't happen. Fix: correct the bible rule and move the wreck. Row: `line_end_wreck | lantern #300 at x -618; bow at x -630 (12 dark blocks: light 3 or less on the deck before S12); deck 8 deep; chest 2 aft of the bow; drowned 15+ past #300`.
2. **S01 "Grandma": she is under the lens.** The crane ends 5 blocks above the T-head and looks west, and she stands on the T-head. Fix: end the crane over mid-dock (-8,0), 12 blocks behind her and pitched down about 25°. Have her walking out, not already at the end, so S02 follows on.
3. **S02: Grandma is a speck.** The window is about 30 blocks from her (POV FOV 70 makes her about 20 px tall at phone size), and the line names her. Fix: an over-the-shoulder camera behind Milo at the window, FOV 30.
4. **The lighthouse is never in frame.** At (-30,-55) it is 78° right of west from the dock, and every shore shot (S01, S02, S04, S08, S09) looks west. Fix: put the headland at about (-80,-20) (16-22° off axis).
5. **S03b screen direction.** Looking north puts the sea on frame left, not right. Fix: shoot from the north side looking south.
6. **S11 Grandma points the wrong way.** She faces Milo (east), so "past him" points home. Fix: she points over her own shoulder, west, at the hull.
7. **S10 background.** The dock and the cottage are behind the lens: the swimmers move away from it. Fix: the T-head at the bottom edge as they push off, and cut the cottage window.
8. **S05 to S06 is the same size at the same place (a jump cut).** Fix: one continuous POV shot over L05-L06, with the push starting on "TRIDENTS".

## Notes
- The far-end dressing (x -560 to -600) doesn't match 300 lanterns × 2 from -20 (that ends at -618). "Dock's foot" names the T-head: say "T-head".
- Split the prop `last_lantern` into `line_end` (#300, and each scene's end) and `lantern_301` (held, then placed on the deck).
- At 18000 the moon is at the zenith, out of frame. Use 20500 for scenes A and E: the moon sits high over the line.
- The nitwit can't be knee-deep and in front of a west-looking camera on the T-head (the water is 4 deep there). Stand him on a 1-deep rock at about (-34,-12).
- The near-end line stops at x -140 and look.fog is false, so S01 and S10 may show it ending. Extend the line to the render distance or use fogSea.
- S07 can't be EWS under 24-block water fog: call it WS. S03b at 7 blocks is FS: pull it back to 11.
- Breath bar: S12 at 4 needs about 9 s underwater, but the screen shows 2.4 s. Set it with marks.
- Place ids: `cottage_upstairs` doesn't exist (the cottage is one room), and `bay_surface` has no bible row.
- S09: give the sides (Grandma near, frame right; Milo frame left), and say Grandma's hand is empty in S10-S11.
