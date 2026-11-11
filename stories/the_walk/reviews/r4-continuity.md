# the_walk r4: continuity (pre-build, confirm)

Verdict: fix (one break)

## r3, confirmed against r4
Fixed: 1 (day 4000, flashback about day 350, outside the Long Day), 3, 4, 5, 6, 7, 8 (hut-local row), 9, 10 (Iapetus), 12-17.
Open, deferred to the build: 2 (claim gullwick, survey, renderDistance above 192 for the Ridge tower), 11 (old skins, in engine_requests).

## Break
1. **S02/S09, Grandpa out of frame.** From (1.2, 1.7, 2.6) aimed at the librarian, Grandpa at (-1, 0, 1.2) is about 41° off the aim. The half-width is about 26° at FOV 50 (37° at 70). So "He READS it" (L02) and L10's `look: Grandpa` on GRANDPA land on an empty frame edge. Hut row: *Grandpa at (-0.8, 0, -0.3), at the lectern's left side, in every hut shot.* S02/S09 camera: (1.1, 1.8, 1.9) looking at (-0.4, 1.5, -1.2). That puts Grandpa about 45% left, the librarian about 28% right, and 3.6 blocks is a true MS.

## Should-fix
2. **S03:** the camera at (-1, 1.5, 7) is outside the front wall, one block beside a 1-wide door at x 0, so it looks at a wall. Use (0, 1.6, 6.5) in the doorway. At about 6.9 blocks that's still FS.
3. **S01 isn't a wide:** 6.4 blocks at FOV 50 is FS, and this is the hut's first appearance. Use FOV 70 from the room's front corner, 8-9 blocks back.
4. **S07 isn't an MS:** Grandma is 6.6 blocks away at FOV 50, which is FS. Use a camera at (0.9, 2.5, 3.5) at FOV 30, with the boat at (0, 0, -4). His shoulder then sits at frame left and she's clear at centre.
5. **S08 `place: shore`** is a new place with no wide shot (framing will flag it). Set it to `dock`, since it's the dock's foot.
6. **Actor y outside:** S07's 2.4 "shoulder" assumes the feet are at y 1, while the hut uses feet at y 0. Bible row: *outside, an actor at y 0 stands on the deck: feet at y 1.* S04 then fits Grandpa head to toe, but only about 26 px inside the left edge. Use x -0.5.

## Notes
7. The bible's World line and set.md's L05 claim still say "tied" boat. Make both "floating, no lead".
8. S01's crack animation starts before BROKEN. The pop is on the word, so the lead check should pass.
9. Mom's skin: "not zuri, alex unless the kid is alex". Name both skins.
10. Iapetus is the AI Shorts' GPT voice. That's a different series, so it's fine, but the audition should confirm it reads old.
