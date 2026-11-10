# bell_window r1: continuity (pre-build)

Verdict: fix

## Must-fix
1. **World:** map.json has no `bell_window` entry. Add Saltmouth stamps `cliff_oak` (since 1700), `bell_post` and `boy_house`. Then add `"bell_window": {"day": 2000, "places": ["saltmouth"], "status": "claimed", "cameos": [...]}` (see 11).
2. **The line of fire is reversed and out of range.** `props.arrow` puts the bell at z +3 (south of the window), with the oak at -12, so the bell isn't between them. The oak is also 21.6 blocks away, past a skeleton's 15-block bow range. Layout from the window sill (window facing north):
   - the skeleton's feet at (0, 10, -11), on a 9-11 high rise;
   - the bell hanging from an oak beam on two fence posts at (0, 6, -3), on the line between the two sets of eyes;
   - the square between the bell and the cliff.
   Generated plains houses are one storey, so stamp his two-storey house (room 7x7x3). If no rise lines up, move the house.
3. **Camera signs follow:**
   - the arrow at (0, 1.5, -3);
   - S05 from (0, 3, -20) looking south (from +20 we'd see the back wall);
   - S06 from (0, 2, -2) up at the oak;
   - S09 inside, behind his shoulder, looking north.
4. **S07/S08 overlap:** S07 ends past the bell, but S08 shows him behind it. Split L07:
   - S07: "Tonight I opened the shutters" (still behind the bell);
   - S08 from "LEANED": the arrow rings the bell, doors slam, then he leans out;
   - S09: the second draw.
5. **Repeated sizes:** S03 and S04 are both ms; S05 and S06 are both wide. Make S03 a WS (it establishes the bedroom, with Mom full figure), S04 an FS, S06 an EWS.
6. **S04 "Mom's hand":** villagers' arms are crossed. On OUT, remove the arrow and give it to her as a held item.
7. **Engine:** the skeleton's bow-draw arms aren't drawn. Build them. The bell swing and arrows already render.
8. **Time:** the note contradicts the shots. Add `shots[].look.time`: S01-S03 13500, S04 1000, S05 13000, S06 6000, S07-S09 13500 (by 18000 vanilla villagers are in bed, so nobody would run).
9. **The kid on screen (S08-S09) in Steve skin reads as Buh,** who is in Ravenford on day 2000. Use `alex` or another default skin.

## Should-fix
10. Mom's voice is `mom` (Sulafat), which is Buh's mom. Cast a spare.
11. **Easter egg:** the ruined portal (-269, -366) is south-east of the village, behind S01's camera, and it's night. Register `saltmouth_portal` (since 0) and put it in a daytime shot that actually frames it.
12. The lantern under the oak has no reason to be there. Drop it and use the night floor.
