# wall_grows: continuity r1 (pre-build: story.json, shots.md, bible.md, set.md)

Verdict: fix

## Must-fix (breaks)
1. **S09: the kid on the rim before L12.** Standing on the rim, he'd see outside, so L03 "never SEEN outside", the L12 climb and the L13 reveal stop making sense. Fix: put S09 at the ladder's foot (-4, y0+1, -31). Tomas steps off the bottom rung and the kid stands beside him. Low camera looking up, with the wall face as the background (beats r2 already has "Tomas comes down the ladder past the kid"). Bible cast row: "me: S09 at the ladder foot".
2. **S05 camera "on the rim at Tomas's height".** From up there the outside plains and the hall are in view (FOV 50 reaches 25 degrees below the horizon), which spoils S11. Fix: camera inside and below the rim at (-6, y0+38, -25), FOV 50, pitched up about 20 degrees. Tomas shows full figure against the sky.
3. **Dirt and brick geometry.** (a) S04 as written can't show the dirt: from 3 below the rim and 4 out, a pillar at z -35 only shows above y0+44, and its top is y0+42. (b) In S05 the brick at y0+41 sits below the dirt's top block (y0+42), so "one HIGHER" is false. Paste this into the bible's rim row: *dirt pillar flush at (-10, y0+1..y0+41, -34), its top block one over the rim; an old cap at (-11, y0+41, -33); Tomas's new brick at (-11, y0+42, -33) on 'HIGHER'; no cap at x -10.* S04 camera: (-10, y0+40, -19), FOV 20. About 0.9 of the dirt block clears the rim edge. Planned size: wide.
4. **The rail breaks the zombie's wall.** A rail at x 6 through the farm needs gaps in the 2-high ring, and S02's camera sees the south side. Fix (farm row): *the ring runs on the west, south and east sides (x -1, x 15, z -21) with no gap, and the great wall is its north side. The rail runs only inside the farm: x 6, z -31..-24, cart at (6, y0+1, -31). One oak door at (-1, y0+1, -24) (villagers open it, zombies can't).*
5. **S06.** "10 blocks east of the ladder" puts the camera at x 6, but the hole is at x 10. It also looks straight through a through-hole at the outside. Fix: "14 east of the ladder (x 10), eye y0+1.0, 1.5 out, pitched up about 35 degrees": the 2-deep hole then shows only sky. Villagers' arms are crossed, so there is no "hand". Use Tomas's robe at the frame edge and a place sound on 'BACK'. Keep the wall whole on 'BLOCK' and pop the brick on 'VANISHED'.
6. **S12.** (a) The 2-high stub at (2, -45) isn't where he pillars, and it says he's only starting at 23500, the same hour the dirt is already over the rim in S04. Fix: drop the stub from S12, the bible, set.md and beats. The dirt in his hand is the clue. (b) FOV 25 at 42 blocks makes him about 10% of the frame height, which is a wide shot, not a full. Use FOV 10, or plan "wide". (c) "at the foot of the wall": he is 12 blocks out.
7. **S01.** A camera at the plaza can't fit the bell in the foreground and the rim (51 degrees up) in one frame at FOV 70. Tomas, about 60 blocks away, is roughly 2% of the frame height: a speck. Fix: camera at (0, y0+3, 26), pitched +12. Split L01: S01 (EWS, up to "high") and S01b (full: camera at (-4, y0+37, -24) looking up at Tomas placing on 'ONE more').
8. **No `look` and no `props`** (owner pattern 2). Add `look` to each line:
   - L01: prop:wall/WALL, Tomas/TOMAS
   - L02: entity:zombie
   - L03: N
   - L04: prop:dirt/DIRT
   - L05: Tomas/TOMAS, prop:new_brick/HIGHER
   - L06, L10, L11: Tomas
   - L07: prop:hole/BLOCK
   - L08: entity:minecart
   - L09: entity:minecart/PUSH, Tomas/Tomas
   - L12: prop:ladder
   - L13: prop:hall/HUNDRED
   - L14: Player/SOMEONE

   Add `props` with the coordinates from finding 3, the farm row and the hall door (0, y0+1, -46), and give every shot its own `shots[].look.time` (S02: 18000).

## Should-fix (notes)
9. **S10.** The climb is on screen before the word "climbed", and 40 rungs in about 3 s reads as flying. Open on the bottom rungs and start moving on 'climbed'. Hide one cut in the crane around rung 20. Add a lantern at the ladder's foot so the climb reads.
10. **S03.** Minecraft draws no sun shadows: drop "long shadow" here and in bible scene C. The wall is square, so change "curving" to "running straight to the corner". The narrator should be the kid nearest the lens and centred (three identical babies).
11. **S11.** The hall is 12-13 blocks out, not 15. At dawn its inside is dark: add glowstone or lanterns under the glass. Name the ground north of the hall in the bible (rising hills, trees, a river), because looking 40 blocks down at a cleared plain trips the superflat block.
12. **S08.** Tomas's house at (-12, -20) is west, so he only exits frame right if the camera faces south. Pin it: camera at (13, y0+3, -24) facing west, the cart rolling right to left, Tomas left of centre by the farm door. He starts on 'RUNS'.
13. **Bible gaps:**
    - the kid's house: (7, y0+1, -12), window facing north;
    - scene G's day, and Tomas empty-handed in S09;
    - the outside ground at y0 along the north;
    - the player digs his pillar down each day, which is why there's no dirt in S09 or S11.

    beats.md (r2) numbers the lines differently from story.json (r1).
14. **S02.** The wall's top is not in frame from the window (63 degrees up), so change the background to "the dark wall face, stars above the roofs".
