# r6 continuity: world pass (set changes only)

Verdict: fix

What holds: window, bell, posts, log caps, base, skeleton (-262.5, 71, -351.5), oak (-261, 71, -353), door (3,4,2), and the S08 porch block all match the map.json cmds. L03 checks out: 3500 to 3800 is 300 nights. `until: 3801` holds. The arrow clears the steps. The skeleton's yaw 0 faces the window. S02's axis and S03's screen direction hold.

## Breaks
1. **S04 can't show its subject.** From the south-east, the house hides its own north wall (his shut shutters) and the bell. It also hides the shore houses, which sit 60-75 deg west of north. The cottage lands top-RIGHT, mostly behind the house's NE corner. The camera at y 1.6 is only 0.6 above the deck (deck top = 1).
   Fix, story.json S04 camera: "at: on the boardwalk's east end beside the belfry, about (11, 2.6, -4), looking ~5 deg south of west along his house's north wall, still (the skeleton's spot ~40 deg right, out of frame)".
   Fix, story.json S04 frame: "subject: the village by day: his north wall at frame left, his upstairs shutters shut, the bell on its belfry beside them; beyond, west along the shore, the shore houses with every window's spruce-trapdoor shutters open (stamped: generated houses have bare glass panes), villagers working, unarmed (a picture plant, never said). Day 6000."
   Move the egg to S05 by appending to S05's frame: "The easter egg: Buh's empty yard and cottage on the bank just left of and behind the oak (`buh_yard`), cold chimney, no dog; never the subject." Then update `world.easter_egg`, the bible's Easter egg line, the bible's Buh's yard row (S05 bg), the bible's Positions S04 sentence and the S04 line in set.md, and regenerate shots.md.
2. **Buh's cottage is lit.** The `buh_yard` cmds keep `campfire[lit=true]` at (-266, 80, -358) and 8 lanterns. The bible and the cameo say the chimney is cold and the windows dark, and the cottage is visible at dusk in S01, S02 and S07. Fix: add a map.json stamp `buh_yard_cold` (since 3400) after `buh_yard`: `/setblock -266 80 -358 campfire[lit=false]`, plus `/setblock X Y Z air` at (-269,73,-365) (-267,72,-365) (-270,72,-362) (-266,72,-362) (-270,72,-357) (-270,73,-372) (-266,73,-372) (-270,72,-370).
3. **S07: nothing under the window.** The porch slabs start at x -262, so he would fall 4 blocks. In `kid_house`, change `/fill -262 65 -342 -256 65 -341 spruce_slab[type=top]` to `/fill -263 65 -342 -256 65 -341 spruce_slab[type=top]`.
4. **The house is too small.** The bedroom is 5x6 inside, and the owner rule is 7x7. The `hollow` shell also makes y 63 the floor, so the ground floor is 1 block high. Fix in `kid_house`:
   - shell: `/fill -267 62 -340 -259 70 -332 spruce_planks hollow`
   - corner logs and stilts move to x -267/-259 and z -332
   - floor: `/fill -266 65 -339 -260 65 -333 spruce_planks`
   - south panes at z -332; front door at (-263, 63-64, -332); upstairs door at (-259, 66-67, -338)
   - porch east: `/fill -258 65 -340 -256 65 -336 spruce_slab[type=top]`
   - roof: `/fill -268 71 -341 -258 71 -331 dark_oak_slab[type=bottom]`
   - the door moves to (4, 4-5, 2): update the bible's Positions and `props.door`. S03's angles still hold (window 27 deg left, door 10 deg right).
5. **S01 (L02) has no square or doors below the window.** Below it are only the belfry strip and the bank. Fix the S01 frame to read "...the villagers on the boardwalk below (within ~15 deg of the bell axis) run west along it, out of frame left toward the shore houses; doors slam off screen", and change "tilts down to the square" to "to the boardwalk". In set.md, change "nobody walks there in the Short" to "only S01's villagers, running home". In S07, "doors slam below" becomes "off screen".
6. **Stale text.** In story.json, `props.oak.note` becomes "Buh's old oak (Good Boy's, -261, 71, -353) on the corner of Buh's yard's bank". In set.md line 28, "the square's ground block" becomes "the boardwalk block, O = (-263, 62, -340)". In S02, "The empty square" becomes "The empty boardwalk".

## Notes
- The fancy oak is taller and sits 19 deg left in S05. Centre the plain oak there.
- The steps are 1-block shelves over the sea. If a still shows a floating ledge, fill underneath: `/fill -279 50 -379 -256 65 -347 dirt replace water`.
- S08's camera is about 1 block from the oak trunk, likely inside the leaves. Check a still.
- The skeleton sees the boardwalk east of the house (about (-258, 63, -338), 14 blocks away). Narrow the set.md yard claim to "directly south of the house".
- `props.village` (0, 1, -8) sits under the overhang. Move it to (0, 1, -5).
- Nothing in the stamps removes the generated plaza bell, which the one-bell rule needs. The stamps also have no shutters on his window and no bed. The stunt must add them.
- The pad's south face is at rel z -10.5, not -9.5. The claim still holds.
- S02 says "over the roof ridge", but the roof is flat.
