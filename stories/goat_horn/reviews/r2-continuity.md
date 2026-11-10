# goat_horn r2 continuity

Verdict: fix (one item, a one-number change)

r1 breaks 1, 3-12 are fixed in story.json, bible and set.md. #13 has its coordinates now, but see note 1.

## Breaks
1. **S03/S11: the tell is still at the frame edge (r1 #2).** The game view is 1080x1011, so at FOV 50 the half-width is 26.5 degrees. Looking due east from (-5.65,1.6,-1.5), the goat at (1.6,-5) sits at 25.8 degrees and its rear at 28.6, half cut off. My r1 numbers were wrong. Fix: aim both shots at (1.6,1,-2.5), about 8 degrees north of east. That puts the goat at 18 degrees, Dad at 12 right, the boulder at 14 left and the horn drop centred. The lip at 26 right means Dad exits frame right. The same frame is used for both shots.

## Notes
1. **S02 never shows the stairs.** Aimed at (4,-28,9), the stairs (base -63 degrees, top -59) are about 45 degrees off axis, so "Climbs BACK up" plays over water. Fix: camera (-5,-27,34) looking north. The landing, both ends of the stairs and the oak (tilt up) all fall within 39 degrees. Move the nitwit to (-9,-28,28).
2. **S06:** the mine (18 degrees south of east) is at frame LEFT of the gate (45 degrees), not right. At 246 blocks it is about 4 px at 300 px wide and close to the 256-block render edge. Call it a backdrop, not a clue.
3. **S08:** the oak (-32 degrees) and Dad 30-40 blocks out on the south-east road (about +40) span 72 degrees, which won't fit. Fix: camera about (-60,-4,20) aimed at +5 degrees, with Dad farther down the road.
4. **Dad's launch:** a straight line from (1.6,-1) to (4,9) clips the trunk at z 0. Make the staged path's first leg go east to x 2.4 or more before z 0.
5. **S12:** from the S12 camera the trunk hides the goat on its west side. Bible row: "the goat peers round the trunk's north-east corner at (2.4,0,-1.2), between the trunk and Milo".
6. **Bible cast row, nitwit:** still (-18,-28,13). It should be (-12,-28,11).
7. **story.json cast N:** lists POV in S07, but S07 is over Dad's shoulder.
8. **S10:** at POV FOV 70, 4 blocks out, the goat is full size, not waist-up. Re-label it `full`.
