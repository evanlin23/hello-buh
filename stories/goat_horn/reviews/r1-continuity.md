# goat_horn r1 continuity

Verdict: fix

## Breaks
1. **The `look` fields won't resolve**. `"N"` (L09, L12) resolves to entity `milo`: use `actor:<bot>`. `actor:Ida` needs a label: use `entity:villager`. L06 `prop:mine` is 230 blocks away (the check stops at 64): `look:false`.
2. **S03: the tell is off-frame.** The frame is about 7 blocks wide and the goat stamps at z -7. Fix: `goat_spot` z -5, camera (-5.65,1.6,-1.5), boulder at (-2,-3). Same for S11.
3. **The BONK misses.** The goat at x 2.35 passes beside the trunk (x 0..2). Fix: ram line at x 1.6, Dad's arc veers SE past the corner, and S10 steps to x 2.6.
4. **Wrong horn.** The left horn is on the far side in S11. Lose the right one.
5. **Milo in S12.** The bible keeps him at (3.35,0,-1). Bible row: "after S11b, at (3.3,0,1.4) facing south", so the oak is behind him and the shot reads as MS.
6. **S06 can't be framed.** Gate, cottage and mine span about 100 degrees. Fix: camera (-44,-21,19), aimed between the gate and the mine, no doorstep Milo. Render 16 chunks for S06 and S08.
7. **S07:** the cliff is behind Dad. Make it a look over his shoulder.
8. **S04:** we see Dad's back. Put the camera NE of him, low, looking SW.
9. **S13:** the oak is 35 degrees off the axis (FOV 40). Put the camera on the oak-to-Dad line, about (107,-18,75), with the road and lamp along it.
10. **S05 is a new place with no wide.** Open it 12 blocks out and make S06 `ews`.
11. **S01/S02 splash twice.** Launch on "CLIFF", splash on "LAKE".
12. **S09's crane** passes through the canopy and the actors. Crane straight up behind the goat.
13. **S02 is unplaced.** Off-axis landing, nitwit at the lens. Give coordinates.

## Notes
- 212 vs 213.
- S10's trunk is behind the POV.
- S05 looks west: no lake, no sun.
- The item frame goes at x -51.
- S08: Dad within 40 blocks.
- Route the road gate to south shore.
- S02's swim takes 8 s.
