# Pre-build continuity check (story-continuity, 2026-11-10)

Read before building; fix every break in the story files first, notes where cheap.

Pre-build continuity check of light_sleeper and thirty_one_raids (r2). I read story.json, shots.md, bible.md, set.md and beats.md for each, plus story_craft §7-9, building_guide.md, the owner rules in hello-buh/docs/stories.md, and the renderer (render.js, renderer/entities.js, blockentities.js, page.js). I edited no files.

Framing maths used throughout: the game view is the 1080x1011 crop. At FOV 70 (POV) it is ±36.8° across. At FOV 50 (the movie engine's default for camera shots) it is ±26.5°. Under the Darkness the fog starts at 11.25 blocks and ends at 15 (page.js).

# light_sleeper — Verdict: fix (7 breaks, 11 notes)

## Breaks

1. **S06, S11: "teal glow at the bottom" can't be seen.** The shaft is 3x3 and 5 deep, and the opening is a 1-block slot. From the POV standing on carpet north of the rim (eye 1.62, about 2.5 blocks from the slot), the line of sight through the slot hits the south wall about 1.2 blocks under the lid. The bottom only shows from almost straight above, and a covered shaft is unlit anyway.
   - Fix (set.md and bible, well row): line the shaft's top 2 blocks of wall, under the lid, with sculk and sculk_vein, plus glow lichen, so the part the slot shows reads dark teal.
   - Also change "a faint teal glow at the bottom" to "sculk on the walls under the lid" in S06, S11 and the bible's teal-glow prop row.
   - Do not have him step onto the rim to look down. Stepping on bare stone makes a vibration, and S15 needs that to be the first time.

2. **S11: the jukebox blocks the shot it is placed for.** The jukebox goes on (0,-2) and the boy stands at (0,-3). It sits directly between his eye and the slot, so "Wells ECHO" ends looking at the jukebox's side.
   - Fix: place the jukebox at (1,-2), the north-east part of the rim.
   - Then S15: he jumps to (0,-2), straight ahead, with the jukebox at frame left (east). Update the bible's jukebox and narrator rows: "jukebox (1,-2); S15-S17 the boy on the rim at (0,-2)".

3. **S07: "the boy … from behind" is impossible from this camera.** The camera is south-west of the well. In S06 the boy stands at the north rim facing south, so from the south-west we see his front. The cast rule says he is seen from outside only from behind.
   - Fix: camera at (-6,-7), low, FOV 50, looking south-east past his back to the well. Background: the south side of the plaza and the south street steps (S01's spot). The bell box ends up just left of centre.
   - Delete "bg: our house door" and "the boxed bell at frame right". At FOV 50 from the south-west the bell was at 33° anyway, outside the ±26.5° crop.

4. **S12: "back to us" is wrong, and the crane needs a big yaw swing.** The crane starts south-west of the well looking north-east, and lands in his POV facing south. That is a turn of about 135° in 2 s (the owner's "weird turn"), and from the south-west we see his front.
   - Fix: Key 0 at about 16 blocks above (0,-12), above our roof, looking south and down. He has his back to us, and the yaw stays at south all the way down into his head.
   - The bell box will be at frame left (east). Our door is under the camera, out of frame, which is fine.

5. **S17: the size doesn't match the distance.** The warden at (0,5) is about 7 blocks from the rim. At FOV 70 it fills about 30% of the height, not "chest and head filling the upper half".
   - Fix: the warden takes two steps to the south rim edge (0,3) before the boom, which puts it 5 blocks away at about 41% of the height.
   - Or give S17 a fovZoom to 40 (about 57%).
   - Write which one in the S17 row and in the bible's warden row.

6. **Carpeted stairs and carpet roofs can't be built as written** (S01, S02, set.md "pitched roofs … covered in carpet", "carpeted stairs to every door"). Carpet sits on top of the block below it. On stairs or slabs it floats half a block over the low half.
   - Fix (set.md): build stairs as 1-high full-block steps, each topped with carpet. Build roofs as stepped full blocks (1 up per 1 in) with red or orange carpet on every step, upside-down stairs under the eaves, and a 1-block overhang.
   - The roof contrast for building-guide line 4 comes from the carpet colour against the walls.

7. **S08: a new place opens on a medium shot.** our_house_inside is first seen here, at MS from 1.5 blocks. That breaks "establishing shot for every new place", and the owner's "too zoomed in" note.
   - Fix: make S08 "full". Mom about 3.5 blocks away, with the 7x7 room around her: the table with the unused second chair, the lantern, the window toward the well.
   - The sizes still change at every cut (S07 wide, S08 full, S09 wide).

## Notes

8. **Shriek 2 contradicts the bible's own vanilla rules.** Its cause (the disc going in on "CARE") comes before Darkness 1 arrives on "Sweetie", so it lands less than 4.5 s after shriek 1. That is inside the 10 s cooldown, so vanilla gives no shriek. Its sound also plays one whole shot after its cause.
   - Fix: let the S11→S12 cut carry about 20 s of game time. Darkness 1 then comes and goes off screen, so the crane stays clear.
   - Play shriek 2 on "CARE" + 0.5 s in S12. Its Darkness lands on "Sweetie".
   - Delete "shriek 2 on the cut into S14" from the story.json shrieks list, the S14 frame and the bible's Darkness and shriek tables.

9. **S02: the crane needs its look direction fixed.** The doghouse is at the top of carpet_street, (-18,-26). To get it at lower centre with the village beyond it, the camera must end up north-west of the doghouse looking south-south-east. Starting "at the plaza end looking down it" forces a 180° turn.
   - Fix: Key 0 about 2 blocks above the road near (-12,-14), looking south-east down the street toward the plaza.
   - Rise and pull back north-west up the slope to Key 2 at about (-22,-31), 5 blocks above the doghouse's roof. Hold the look south-east the whole way.
   - Also say the doghouse ground height. "12 blocks above the plaza" is the hill's height, so the camera has to be higher than that.

10. **S04: the opening frame can't hold both items.**
    - From x=-3 the lid is 45° left, outside the crop. From x=-5 the lid is seen edge-on as a sliver.
    - Walking "east past it" also needs a side: walk along z=+3, the south side.
    - Fix: start at (-5,3) and drop "lid at lower left". Say "rim edge-on at frame left, the bell 11 blocks ahead".

11. **S11: "the whole well in frame" can't be done from (0,-3).** The 5-wide rim at about 3 blocks is wider than the ±36.8° view.
    - Fix: start at (0,-4) and push in to (0,-3) while placing the jukebox.

12. **S16: framing details.**
    - The bell box at frame left is at -39°, outside the crop at any FOV. Drop it.
    - At FOV 50 the boy, 5 blocks away, is about 39% of the frame height, not "small".
    - The warden at 11.4 blocks is just past where the fog starts. Bring the emergence point to (0,4) or move the camera 2 blocks closer, so the warden is 10 blocks or less away.
    - Change the bible's "within 12 blocks" rule to "within 11".

13. **The S14 bible wording is wrong.** At the end of the turn the camera faces east and the bell is 27° to the right. The bible's "bell at frame left in S14" is false; fix the wording.

14. **Raise our door 2 steps above the plaza.**
    - From the doorway, at eye height 1.62, the lid 8 blocks away reads as a sliver. With the door raised it reads as a white square, as in S01.
    - S05's "looking slightly up" at Mom then makes sense.
    - Add "lantern post by the 2 steps" to the bible's our_house row.

15. **cast.N.on_screen lists "S13's shoulder"**, but S13 has him 90° out of frame. Delete it.

16. **Bible: say who re-laid the lid.** Add to the lid row: "Mom re-laid the middle row the day after the flashback (bible reason; never shown)".

17. **Make the bell box readable in a wide.** The current 1x2 white lump is too small. Make it a vanilla-style bell frame (two posts and a beam, 3 wide and 4 high) wrapped in wool, open to the west.

18. **S09 is shot into the setting sun.** The skeleton, the arrow and the creeper's death need a check at 300 px.

19. **Scene C, "last week", is never said or shown.** The cut to S10 reads as the same evening. That is harmless; the bible can drop "last week".

20. **Engine checks the set.md already lists:**
    - shrieker particles, jukebox note particles, the sonic-boom ring;
    - the 2 s warden rise (vanilla's emerge takes 6.7 s, and here the warden comes up on S16's first frame rather than at the end of the shriek).

