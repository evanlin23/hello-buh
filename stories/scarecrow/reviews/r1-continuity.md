# scarecrow r1: continuity (pre-build)

Verdict: fix

## Breaks
1. **S01 aim.** The camera at (22.5,0) looks WSW, but the patch (6,-6) and `prop:trail` (12,-3) lie north of west (patch 42° off axis), so L01's subject falls out of frame. Aim west-by-north at about (8,0,-3). Facing west, the patch is on the window's frame RIGHT, not left. Fix the frame text.
2. **S07 can't see its subjects.** The camera at (31,-2) stands inside the field facing NW: the scarecrow is about 56° left, and the barn, paddock and nitwit are behind it. Use `at (36,4,10)` looking at (23,1,-5): porch 9° right, scarecrow 15° left. Move the nitwit egg to S02's paddock.
3. **The window is 2x2** (cottage `sill(3,2,pz0,'n',{w:2})`, h 2), not 1x2. That takes four trapdoors. Flipped `half=top`, the lower pair lies across eye height. Instead, the lower pair opens `half=bottom` (a sill) and the upper pair `half=top`. Bible: the opening is z -1..1.
4. **L10 "GONE" is a speck.** In POV at night, the spot is 21 blocks out and wheat fills it. Split S10 on "scarecrow": cut to **S10b (full, night)** from S08's camera, the same frame minus the golem. Bible row: *scarecrow spot: a 1x1 coarse-dirt gap in the wheat; golem on it in S01, S07, S08; empty in S10b.* Drop the snowball streak, because at level pitch it's below the frame.
5. **Room light.** The piece has a lit campfire hearth (light 15) and a hanging centre lantern, not a lantern on the west wall. Vanilla lanterns can't be switched off. Bible: *S05 lantern and hearth lit; S09-S11 lantern removed, `campfire[lit=false]`.*
6. **Heights.** The ground falls 2-4 blocks east, but every camera and prop y is measured from the origin as if the ground were flat (S01 y 2.6, S08 y 1.9, `scarecrow_spot` y 0). Give camera y above local ground, or add the field's planned y.
7. **look:** L03's `word: "SNOW"` isn't in L03 (use "UP"). L09's `actor:Milo` is the POV camera, so it is never in view (use `prop:window`).

## Notes
- Sizes: S04 is really wide (the wall is 15 blocks away). S05 can't be wide in a 7x5 room (at most about 6 blocks), and the room is under the 7x7 rule. Relabel S04 wide and S05 full.
- The village "down the slope west" contradicts hills rising west. S02 can't see x -60 either.
- The lantern post (0,-8) is on the cottage's corner. Use (1,-9), and keep it in the mornings (S04 sees that corner).
- The piece's barrel, cauldron and composter stand outside the back wall, south of the window, inside S06/S11's frames. Bible them.
- S11 overclaims. The trail to the wheat, the field and the porch lantern are about 85° right. At the end key the golem is 17 blocks away (bible: ≤14).
- S08: the porch pumpkins are 46-64° off axis.
- Bible: A/C = *yesterday* morning (the 63rd), D = last night. Hotbar row: slot 1 shovel, slot 2 snowballs already stacked (62 mornings), S09-S10 an empty slot 3 selected.
- `fog: false`, but the frames say "into the fog".
- A golem back at (21,0) every morning isn't vanilla (flag for the minecraft-audit).
