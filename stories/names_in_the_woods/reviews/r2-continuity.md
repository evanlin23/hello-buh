# r2 continuity (pre-build): names_in_the_woods

Verdict: clear

## Round-1 breaks, checked
1. S01/S11 framing: fixed. Camera (2,2.0,0) FOV 50, zombies 14-16 blocks out, gate rail fg, still test noted.
2. Hamlet crane: fixed. Now S03, key 0 over x 4 looking east.
3. ROSA first and nearest: fixed in S11 (-17,0), the bible and set.md.
4. OTS sides: fixed. S02 left shoulder puts Mom at frame right, and S14 right shoulder puts her back at frame left. S12's apple hand at frame left agrees. The camera stays south of the line.
5. New places: fixed. S05 is a WS POV from (4,0). mom_cottage is established by S03's landing.
6. S10 glide: fixed. 8 blocks in about 3 s is about 2.7 b/s.

Round-1 notes 7-12 are all applied.

## Notes (none block)
1. **story.json `world.easter_egg`** still says "S02: as the crane rises". Change it to "S03: at the start of the crane down, looking east".
2. **S13→S14 sizes:** S14 has Milo about 4 blocks from a camera at ROSA's shoulder, so it will measure *full*. S13 is also full, so `./hb framing` will flag a same-size cut. The cheapest fix is to relabel S14 `full` and make S13 `wide`: start the POV at (-8,0) with ROSA 8 blocks off, then sprint 4.5 blocks to (-12.5,0), which takes about 0.8 s. Then the run is S12 ms → S13 wide → S14 full → S15 ms. S15 at 3.5 blocks with the POV FOV may also measure full. Pass it unless framing objects.
3. **Owner "line's subject" risks:**
   - L03 `Everyone` → `entity:villager` sits on the crane's 14-up key, where the villagers are specks. Map `Everyone` to Mom, or put villagers on the lane under the landing.
   - L04's `entity:zombie_villager` is a speck through the window. Use `look: "Mom"`.
   - L02's `Mom` is a back at the frame edge. Map it as `{"what":"Mom","word":"MOM"}` and keep the zombies at centre.
   - S10: Mom at 22-30 blocks in an EWS at FOV 55 is about 7% of the frame height. Narrow it to FOV 40, or start the camera at x -4.
4. **S02:** the bible puts the zombies at x -3, but the shot says "at the fence" (x 0). Use x -1, or write "3 blocks out from the fence".
5. **S04** opens an interior at *full*. From a back corner that's the widest it can be (7x9 cottage). Fine, just noted.
6. **S07:** have Mom open the gate on screen at the start, or have it already open. Either way, don't have it swing with nobody at it.
7. **Engine:** the work on the villager crossed-arms item, mob off hands, player nameplates and the selected-item name is planned in set.md, about 3.5 h total. Each piece is under the 2 h line, so build them; don't stage around them.
