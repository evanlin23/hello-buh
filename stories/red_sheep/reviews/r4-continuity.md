# red_sheep r4: continuity (pre-build, round 2, d2d3cdf)

Verdict: fix

## Round-1 must-fixes, renumbered
1. World claim: deferred to set.md checklist 1-2. That's acceptable for a script audit (no line depends on the plot), but it blocks the build. If the pasture gate can't stay in the east palisade, S01, S02, S09 and S10 come back for review.
2. Fixed. 3. Broken in the geometry (B1). 4. Fixed except S10 (B3). 5. Still broken (B2). 6 and 7. Fixed.

## Breaks
B1. **S13:** the camera is 0.4 blocks off K's sight line, so the trunk that hides the evoker from K also hides it from the camera. The kid's head grazes it too. Fix: camera (-1.5, 1.8, 2.5) aimed at (8.5, 0, -6), FOV 35, with the trunk as log column x 1..2, z -2..-1. The camera clears it by 0.5, and the lamb sits low under the evoker (24 % of the height).

B2. **S07:** a camera behind Dad's LEFT can't see his RIGHT hand. Fix: crossbow in his off hand.

B3. **S10:** nothing inside the pasture is more than 4 blocks in front of this lens, so Dad can't be "25+ blocks out". Fix: Dad in the field at (5, 0, 14), camera at y 5, and L10's `look` set to `prop:treeline` on WOODS (owner rule: the subject must be near the centre).

## Should-fix
4. S04 is outside the palisade. Use (-9, 1, 20) to (-6.5, 0.8, 20).
5. Stale shot numbers in `look.note` and Dad's `on_screen`. The bible says "past tense from L05", which should be L06.
6. S05: walking among the flock, or filing in? Change `shows`, the sfx and set.md to match.
7. Make the lamb one of the sixty. S01 has 61.
8. The evoker is 9.2 blocks from the lamb, not 8.5. The clearing ends at +54 in set.md and +56 elsewhere.
9. Start prepare-wololo 2.0 s before S13+0.3.

## Notes
- Measured sizes: S12 reads full, S13 wide, S06 full.
- L07's "GATE" is the east gate, but L02 and L09's is the pasture gate.
- During L10, keep the kid short of +45.
