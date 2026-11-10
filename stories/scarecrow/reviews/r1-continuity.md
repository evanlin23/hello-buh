# scarecrow r1: continuity (pre-build)

Verdict: fix

## Breaks
1. **S01 aim.** The camera looks WSW, but the patch and `prop:trail` are north of west (42° off axis), so they're out of frame. Aim at (8,0,-3). The patch is frame RIGHT.
2. **S07 can't see its subjects.** The scarecrow is 56° left; the barn, paddock and nitwit are behind the camera. Use `at (36,4,10)` looking at (23,1,-5). Move the nitwit to S02.
3. **The window is 2x2** (the piece's `sill` is w 2, h 2): four trapdoors. On "OPENED", lower pair `half=bottom`, upper `half=top`.
4. **"GONE" is a speck:** a night POV 21 blocks from the spot. Split S10 on "scarecrow": **S10b**, night, full shot from S08's camera, golem gone. Bible: *the spot is a 1x1 coarse-dirt gap in the wheat.* Drop the snowball streak (below the frame).
5. **Room light.** The piece has a lit hearth campfire and a centre lantern, which can't be switched off. Bible: *S05 both lit; S09-S11 lantern removed, `campfire[lit=false]`.*
6. **Heights.** The ground falls 2-4 east, but camera and prop y are flat-ground numbers (S01, S08, `scarecrow_spot`). Give y above local ground.
7. **look:** L03 `word "SNOW"` isn't in L03 (use "UP"). L09 `actor:Milo` is the POV camera, never in view (use `prop:window`).

## Notes
- S04 is really wide. S05 can't be wide in the 7x5 room. Relabel S04 wide, S05 full.
- The village "down the slope west" contradicts the hills to the west; S02 can't see it.
- The lantern post (0,-8) is the cottage corner: use (1,-9).
- The piece's barrel, cauldron and composter are behind the wall, in S06/S11: add them to the bible.
- S11 overclaims: the trail to the wheat and the porch are 85° off axis; the golem ends 17 blocks out.
- S08: the porch pumpkins are out of frame.
- Bible: A/C = yesterday morning (63rd), D = last night. Hotbar: snowballs already in slot 2; S09-S10 on an empty slot 3.
- `fog: false`, but frames say "into the fog".
- The golem returning to (21,0) daily isn't vanilla (minecraft-audit).
