# Pre-build continuity check (story-continuity, 2026-11-10)

Read before building; fix every break in the story files first, notes where cheap.

Pre-build continuity check of light_sleeper and thirty_one_raids (r2). I read story.json, shots.md, bible.md, set.md and beats.md for each, plus story_craft §7-9, building_guide.md, the owner rules in hello-buh/docs/stories.md, and the renderer (render.js, renderer/entities.js, blockentities.js, page.js). I edited no files.

Framing maths used throughout: the game view is the 1080x1011 crop. At FOV 70 (POV) it is ±36.8° across. At FOV 50 (the movie engine's default for camera shots) it is ±26.5°. Under the Darkness the fog starts at 11.25 blocks and ends at 15 (page.js).

# thirty_one_raids — Verdict: fix (6 breaks, 7 notes)

## Breaks

1. **S10, S11: player actors can't sit.** render.js draws actors walking, swinging, holding a main-hand item and crouching. There is no sit or riding pose.
   - Fix S10: "Grandpa standing at the table, crouched over Grandma's pushed-in chair, head down". Put that chair in the foreground, nearest the lens.
   - Fix S11: "crouched against his door frame, head pitched down, the bottle in his hand".
   - Or add an actor sitting pose to the engine.

2. **S11: one actor, two items.** Only the main hand is drawn. The crossbow "across his knees" and the bottle "in his slack hand" can't both show.
   - Fix: the bottle in his main hand, and the crossbow in an item frame on the wall by his door. Add that frame to the bible's props and Grandpa's yard row.
   - In S14 it is back in his hand.

3. **S08: the named action is invisible.** Actors have no drink pose, and the camera is directly behind him (on the line), so the bottle is hidden behind his body.
   - Fix: camera 4 blocks behind and 2 blocks south, on the 180° side the bible already uses. That shows his right hand and the bottle in profile.
   - Show the bottle in hand on "drinks", the drink sound, then the hand switching to the crossbow on "GATE".
   - S09 already starts with the bottle gone.

4. **S14: the frame can't hold both Grandpa and the raiders.** Grandpa at the south post is 90° right of the road, and the crop is ±36.8° across (±51° even in the 16:9 master). The raiders can't also be at frame left.
   - Fix: Grandpa stands 2 blocks east and 2 blocks south of the boy, just outside the post. The POV turns about 25° right, to east-south-east. Grandpa is then at about +23° (MS at 2.8 blocks) and the raiders at about -22°.
   - Update S14's camera text and the bible's positions section.

5. **S01: the totem wall's geometry contradicts itself.**
   - The interior is 4 high with frames "at heights 1-4". That puts the bottom row in the floor-level air layer, so no lantern can sit below the empty frame.
   - The 31st frame is next to the empty one at the right end of the bottom row, but Grandpa is placed "at frame left".
   - Fix: make the interior 5 high, with frames at y+1 to y+4 and the lantern on the floor directly under the empty frame. Grandpa stands at frame right, hanging frame 31 of the bottom row with the empty frame 32 beside his hand.
   - State "inside 9 (E-W) x 7 (N-S) x 5" in the bible and set.md.

6. **S07: chest contents never render** (vanilla, and our blockentities.js only animates the lid). The shot can't show "lid up, full of grey bottles".
   - Fix: the lid opens; on "BOTTLES" his hand comes up holding an ominous bottle; on "CHEST" the camera tilts to the chest.
   - The window and the bottle frames can't both sit "above the chest". Put the 4 bottle frames on either side of the east window, 2 and 2.

## Notes

7. **S03 is the yard's first appearance but is FS.** The task rule says the first shot of a place is EWS or WS.
   - The gate "behind him" also needs a camera position. Camera at about (-14,-4) looking east, WS, with Grandpa at the grindstone at about (-6,-4), the door at frame left and the gate posts at frame right, about 22° off.
   - S04 then cuts in to MS at 2.5 blocks.
   - S11 needs the same camera so the gate shows.

8. **Time runs backwards at S02→S03.** S02 is dusk at 12500 and S03-S04 is 12000.
   - Fix: S03-S04 at 12600, the same evening he came home.

9. **The raid timing doesn't add up.** The bible says 30 s, but 12900→13300 is only 20 s.
   - Fix: S13-S14 at 13500. Raiders going from 25 to 15 blocks in 1.8 s is a sprint; make it 22 to 18 for a walk.

10. **Vanilla pedantry: wave 1 is 4 pillagers with a bannered leader; ravagers come from wave 3.** Accept it, or note it as staged in the bible.

11. **S10's window.** The only window is the east one, behind the camera from the south-east corner. Add a west window, or drop "the window" from S10.

12. **Check the butcher's roof smoke before relying on it** (S05). The renderer has smoke particles for lava fizz and explosions, but I found none for a campfire.

13. **shots.md says the master is 1920x1080.** It is 1797x1011 (stories.md). The 60% rule still holds.

**Counts check out:** 31 filled frames plus 1 empty (30→31 on "THIRTY-ONE"); 4 bottle frames; 5 pillagers and 1 ravager in S13-S14; held items S01-S14; the east=out screen direction.

Story files checked:
- /home/user/wt-revise/stories/light_sleeper/story.json, shots.md, bible.md, set.md
- /home/user/wt-revise/stories/thirty_one_raids/story.json, shots.md, bible.md, set.md

Engine facts above come from /home/user/wt-revise/render.js (lines 2300-2320, actor drawing), /home/user/wt-revise/renderer/page.js (lines 936-940, Darkness fog) and /home/user/wt-revise/renderer/blockentities.js (chest lid).