# wall_grows: continuity r2 (pre-build, checked against HEAD 7cd6bd9)

Verdict: fix

## r1 must-fixes
1. Kid not on the rim before L13: **fixed**. S09 is at the ladder's foot.
2. Tomas's rim camera (now S06) at (-6, y0+38, -25), FOV 50, pitched +20: **fixed**. The rim edge hides everything outside.
3. Dirt and brick geometry: **fixed**. The S05 camera shows 0.83 to 0.92 of the dirt over the rim. The new brick at y0+42 is above the dirt's top at y0+41. There is no cap at x -10.
4. Farm ring and rail: **fixed**. The ring is closed and the rail runs only inside it.
5. S04 hole: **not fixed** (my r1 fix was wrong). The camera's pitch doesn't control what shows through a 2-deep, 1-high hole; the eye height and the distance from the wall do. With the eye at y0+1.0 (feet level), no line of sight passes through, so the hole is a dark notch with no daylight. With the eye at y0+2.0, level lines pass through and show the ground outside and the hall's south front. Fix: eye at y0+1.75 (a baby villager's eye), 1.0 off the inner face (z -30), pitch +18. Lines through the hole then climb 14 to 23 degrees and pass about 2 blocks over the hall's roof. Check a still for the northern hills.
6. S12 stub, lens and "foot": **fixed**. The stub is gone from story.json, bible.md and set.md, and S12 uses FOV 5. Leftovers are in finding 11.
7. S01 and S01b: **fixed**. In S01 the wall runs from about 32% to 78% of the frame height.
8. Looks and props: **fixed**, except finding 10.

## New: breaks
9. **S08 camera too low** (owner pattern 2). The eye is at y0+1.6, 3 blocks south of the 2-high ring, whose top is at y0+3. The lowest line of sight over the ring reaches y0+5.8 by z -24, so the kids and the cart can't be seen. If Tomas stands outside the west ring, he is also hidden (the ring is 2.0 high, a villager 1.95). Fix: eye at y0+4.5. Put Tomas inside the farm at (0, y0+1, -25) and have him run out through the farm door (it opens and shuts on screen) and off frame left.
10. **L10 look**: Tomas on 'HIDES', but he is off frame by then. Change the word to 'Tomas'.

## Notes
11. Stale text:
   - set.md claims table: L05 should be L07, L06 should be L08, L08 should be L05.
   - beats.md lines 7 and 46 still mention the dirt stub.
   - L06 direction and Tomas's on_screen say "his hand on the patched block".
   - Bible scene C still says "long shadow".
   - The S11 camera says the hall is 15 blocks out; it is 13.
12. Planned sizes: S12 should be "ms", not "full". The face is about 14% of the frame width, not 25%. In S05 the dirt is about 17% of the frame height: use FOV 8 or plan "ms".
13. Place "rim" first appears in S01b, a full shot, and `./hb framing` will flag that. Label S01b, S05, S06 and S09 as "village".
14. S02: from the window at (14, -12) facing north-west, the farm door is about 6 degrees left of centre, so it is in frame. Change the frame text to match.
15. In S01b and S06 the rim edge hides Tomas below the knee (about 0.8 block). In S06 it also hides the dirt, so S05 is the only shot where the brick and the dirt are compared. This is acceptable.
