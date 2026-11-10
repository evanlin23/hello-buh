# goat_horn r1: continuity (pre-build)

Verdict: fix

## Breaks
1. **The `look` fields won't resolve** (lib/hb/owner.js). L09 and L12 `"N"` resolves to entity `milo`, because it takes the first word of `on_screen`. Use `actor:<bot name>`. L05 `actor:Ida` needs a label `Ida` on the villager, or use `entity:villager`. L06 `prop:mine` is about 230 blocks away and the checker gives up past 64, so set `look:false` for MINES.
2. **The S03 tell is off-frame.** At 7 blocks and FOV 50 the frame is about 7 blocks wide (z -4.5..2.5), and the goat stamps at z -7. The boulder at (-5,-3) sits at the camera. Fix: `goat_spot` z -5, camera (-5.65,1.6,-1.5), boulder at (-2,-3). Use the same setup for S11.
3. **The BONK misses.** The goat's centre is at x 2.35 and the trunk ends at x 2, so its head passes beside the trunk. Fix: ram line at x 1.6. Launch Dad on a SE arc (vx +0.4) so he clears the trunk's corner. S10's step goes to x 2.6.
4. **The lost horn is on the far side in S11.** The goat faces south and the camera is to the west, so the left horn is hidden. Hide the **right** horn instead, which also faces S12's camera.
5. **Milo in S11/S12.** The bible has him at (3.35,0,-1), but S12 needs him at the lip so the oak is behind him and 4 blocks reads as MS. Bible row: "after S11b Milo walks to (3.3,0,1.4), facing south, S12."
6. **S06 can't be framed.** The gate is due south of the camera, the cottage SSW and the mine ESE: about 100 degrees apart. Fix: camera at (-44,-21,19) aimed between the gate and the mine, and drop Milo-on-doorstep. The mine is 237 blocks out, so S06 and S08 need 16 chunks.
7. **S07:** Dad "looks past the camera at the cliff", but the cliff is behind him. Make it a head turn over his right shoulder.
8. **S04:** the camera looks north and Dad shouts north, so we see his back. Move the camera NE of Dad, low, looking SW.
9. **S13:** the oak is about 35 degrees off the west axis, and FOV 40 covers +/-21. Put the camera on the oak-to-Dad line, about (107,-18,75), and move the road and lamp onto that line.
10. **S05 is a new place with no wide.** Open the POV 12 blocks out (WS) and make S06 `ews`.
11. **The fall crosses the cut.** Launching on "KNOCKED" puts the splash inside S01, then S02 splashes again. Launch on "CLIFF" and splash on "LAKE".
12. **S09's crane** flies through the canopy and the actors. Crane straight up behind the goat: (2.35,0.5,-11) to (2.35,3,-10).
13. **S02 has no coordinates.** From (-20,15) the landing is 30 degrees off-axis, and the nitwit stands 3 blocks from the lens. Give `at` and the nitwit's position.

## Notes
- L01 and the caption say 212 but end at 213.
- S10: the trunk is behind the POV, so it can't be at frame right.
- S05: the shot looks west, so the lake is behind the camera and the sun is too.
- Ida's item frame goes at x -51.
- S08: Dad within 40 blocks, or he's a speck.
- The route from the west-shore gate to the south shore is undefined.
- S02: he can't reach the stairs in 3 s.
- S12: name its natural background.
