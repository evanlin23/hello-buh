# seventy_below r3: continuity (pre-build, 31f2814b)

Verdict: fix

Round-1 must-fixes: 1 (hole), 2 (seeing up the shaft), 3 (S06/S12 inside the shaft), 4 (lens heights), 5 (bed/S03, line clears composter and chair), 7 (checkable ids) are resolved. #6 regressed in S08 and #8 is not resolved. S07 has no camera in air and no continuity break.

## Must-fix (breaks)
1. **S15 easter egg still out of frame.** Lens (-2056.5, 90, -455), pitch -25: all 8 `blue_flock` sheep are behind it (z -447..-456) or 62-70 deg below it (z -462..-465, y 69-70). The frame bottom is at -60 (fov 70) or -50 (fov 50). Move the lens to (-2056.5, 86, -435), pitch -22. The flock is then 12-30 blocks ahead, -28 to -52 deg, and the south wall 59 blocks off, about -11 deg.
2. **S08 "legs (knees down)"** brings back r1 #6. L08 `shows` player at SLEEPY, and the check aims at the hip. Change it to waist-down, as S03.
3. **S06/S12/S16 (and S05): the general's head can't be seen from inside the 1x1 column** unless it hangs over it. Add to the bible: he stands at the north edge, feet at (-2056.5, 72, -491.75) (his box overlaps the block by 0.05), pitch 90 down. Otherwise L06/L12/L16 lose their subject.

## Should-fix
4. S04: the lid is 45 deg off the bench bearing, so it is out of frame. Put the lens on the bench-lid line at (-2060.5, 72.6, -490.2), looking ENE.
5. S07: a lens at y 65.6 sits inside the crowd and sees two rows of bodies. Raise it to (-2051.5, 67.4, -499.5), pitch -10, so the heads run to the light.
6. S05/S16 sit *in* the hole column (cell -2057,-492), not "1 block off". The view works, but no zombie may stand in that cell at 13200. Aim at (-2056.5, 72, -491.5) rather than "pitch 80". The baby's head (1 block north, at lens height) is not in frame, so drop it from the frame note. Keep each room lens cell clear of zombies (S01, S02, S07, S09-S11).
7. S01: the baby at z -492.5 is one cell north of the hole, not "under" it. S02: the hole is south of the baby, so it shows at frame **left**.
8. S08: no window behind the bed (windows face south and east). Drop "blue with dusk". "S08 confirms the lid stays shut" can't be seen from inside.
