# pulled_away: continuity, pre-build r1 (2026-11-11)

Verdict: fix

## Must-fix
1. **Fernbank is in plain view, ~10-15 blocks of water from Oakend** (Oakend's east edge -451/-447, the dock's end -436.5). A kid there would have watched 39 arrivals, ~8 new cottages and Mom living across the water for a week. Vanilla lanterns don't switch on at dusk, so S04 at 12000 can't show a dark village that S10 at 13000 shows lit. Fix: put the new quarter (`fernbank_alive`, since ~5800) out of Oakend's sightline, east behind the church and librarian house (the footprint runs to x -323) or behind a rise. Its lights stay on the whole time. The old waterfront houses stay dark. S10 looks up the path into the lit new quarter. S10 frame: "the new houses beyond the old dark fronts, every window lit". set.md drops the switch.
2. **S04 can't see the librarian's door.** `librarian` (house2, -364,-1050) faces **south**, and `home` (-396,-1050) stands between it and the bank. Light a **west-wall window** (the line says WINDOW). Leave her out of S04 or put her at that window. Move the camera north until a still shows the window. Give `props.fernbank_window.at` as `[x,y,z]` of that window (it's a string now).
3. **Name tags (canon).** Names in the Woods: Oakend tags every newborn, the tags are always visible (`CustomNameVisible:1b`) and they never come off (link 17). So the kid, Mom and Uncle carry visible tags. The owner has to choose: (a) show the tags; (b) home the family in a new untagged homestead on the west bank north or south of Oakend and claim it in map.json. Either way, no tagged Oakender may show in S10's crowd.
4. **The lead doesn't render** (only `leash_knot` is in entity_models.json). Without it, S01, S02, S04, S07, S07b and S09 show a boat following a man with no cause. That's an engine feature to build (a rope from the hand to the bow, sagging), well under 2 h, not a gap to stage around.

## Should-fix
5. **Geography of the trip.** Oakend's meadow lies **west** of the gate, but S03 (`oakend_meadow`) sits between the lane and the east bank, and the lane-to-bank run is ~13 blocks, not 20-40. Rename S03's place to the lane's east end or the bank slope. Keep its background (the treeline, looking back west). `oakend_gate` (S07b) is the west gate, but the shot is set at the lane's east end. Rename it.
6. **"Before we LEFT" (L04)** reads as a flashback to before S01, but S04's light (12000) is later than S01's (11500). Line edit: "Then he STOPPED, and looked across the WATER...". L09's "At the WATER" is stale by then: "Then he SWAM...".
7. **S06 background.** A camera south-west of the boat looking north-east sees the inlet and Fernbank, not "Oakend's roofs to the left". Write it as Fernbank dark, matching S04.
8. **S05 eyeline.** A camera looking due north can't hold Fernbank at frame right. Turn it NNE, still south of the line. "Out of focus" needs `look.dof`, or drop the phrase.
9. **Shot size:** S08 wide → S09 wide. Make S09 EWS (high, the whole inlet) or S08 full. S10 is two setups (bow, then the village): split it into S10a (ms/full) and S10b (ews).
10. **`look` targets resolve to nothing.** `castSubject` reads the first word of `on_screen` ("a", "the", "Fernbank's"). Start each with the entity: "villager (plains, fletcher)…", "player actor…", "baby villager…". "Kid" (L03, L06) is not a cast id: use N. `prop:boat`, `prop:shut_doors` and `prop:fernbank_lit` have no `at`/`actor`. L02 looks at the Man, who is at the frame edge. L06 names HIMSELF but centres the kid.
11. **The kid's home:** make S07's doorway the left one of S08's two shut doors (Mom's house is hers).
12. **Voices:** Umbriel is six_thousand_torches' listed spare for Jonah (origin/claude/script-six-thousand-torches story.json). **Algieba** is clean everywhere: make it the working pick. The narrator voice is `narrator` (**Leda**), not "Pip" (story.json cast/voice, bible).
13. **Canon rows missing:** no 6000 timeline row, no `fernbank_alive` stamp, the librarian stamp has no `until: 6000` (she's at the dock's foot in S11), and the `fernbank_golem` cameo text says "an empty village".

## Notes
- Oakend's map.json at/footprint (z -1054, -1080..-1028) disagrees with the Names in the Woods bible (gate z -1030, -1055..-1005). Settle it before either set is built.
- Oakend's only player is Remy (Steve skin, a kid at 2700). "Not Steve" keeps the man from reading as Remy. Keep it that way.
- The graves (x -338) are probably hidden and too small in S04 and S10. Two oak boats share S10: keep the empty one clearly at the dock's end, frame left.
- `entity.boat.paddle_land` is a rowing sound, and nobody rows. Passengers don't move in mineflayer: teleport the boat and the kid together.
- What brings Mom, Uncle and the librarian to the dock's foot at bedtime needs a visible cause (their cottage is there, under the lantern).
