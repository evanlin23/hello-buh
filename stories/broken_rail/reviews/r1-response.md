# broken_rail: response to r1 (critic + continuity), r2

## Critic must-fixes
1. **L02 innuendo.** Done: `He says, "She's on her WAY."` (L02 text and say). The ending loop and the premise now use
   "on her way" too.
2. **L07.** Done, slightly shortened: "Grandpa won't leave the STATION. And I wasn't allowed past the BRIDGE." The
   critic's "till TEN" is dropped because L08 says "I turned TEN" a second later, and the 2 words kept the Short under
   45 s. S07 is now a crane from just behind Grandpa's shoulder (fg) up to the bridge 40 blocks south. The fletcher
   turning back at the bridge is cut (the line no longer says "villagers never leave").
3. **L08.** Done, with contractions for length: "At MIDNIGHT I turned TEN. If she's on her WAY, the rail's BROKEN. I
   packed RAILS." The kid chooses out loud to believe Grandpa, and the line gives the reason for the rails (the hotbar
   has dirt and a torch from S06). The get-ahead moves earlier, to ~24 s (55%). beats.md says so.
4. **S01.** Done: the camera is 5 blocks behind and 2 west of Grandpa. His face in three-quarter, the apron and the
   buffer lantern fill the lower-left third, and the empty rail runs to the sunset. S13 repeats the set-up.
5. **L12/S12a timing.** Done: `say` has `<short pause>` after "hole" and after "rails" (~3.8 s, which also meets
   continuity #4). S12a jump-cuts in with 5 dirt already across: the last 2 go in on "HOLE", 7 rails on "laid RAILS",
   and the torch lights her gold rail in the pause (~2.8 s). S12b is the push on "PUSHED" (~1 s). The text is now
   "I bridged the HOLE, laid RAILS, PUSHED." ("and" was cut for length).

## Continuity must-fixes
1. **Grandpa's mark.** Done: Grandpa is at (0,-1), north of the buffer (0,0), facing south, in every shot. The cart
   stops at (0,1). The bench is beside his mark. S14's camera is at (-6,1.6,0) looking east (bible, set.md, S01, S13,
   S14).
2. **S13 far cart.** Done: on "waiting" the cart comes off the bridge's north end, ~45 blocks out, and is hopped to ~15
   blocks out at the cut (S13, set.md).
3. **Passengers in moving carts.** Done: set.md and the engine table say to tp Grandma with the cart every tick (S12b,
   S13, S14).
4. **L12 too fast for the picture.** Done (see critic #5). The two fixes agree.
5. **L08 walk on frame 1.** Done: S08 is POV standing still at the bridge foot. The rails are selected on "RAILS", and
   only then does he step onto the deck.
6. **L02 look.** Done: `{what: "prop:the_line", word: "RAIL"}`. S02's crane frames the empty line, with Grandpa small at
   frame left.
7. **S03/S05 geometry.** Done: the station is dropped from the yard shot (now S05, looking north at the cottage). The
   Mom shot (now S03) has Mom at the garden gate facing the station, the camera 10 blocks behind her looking ESE, and
   the yard loop with the pig in its foreground.
8. **Easter egg direction.** Done: the egg moves from S09 to S01 and S13, frame right under the sunset (west). Updated in
   the bible, set.md and story.json `world`.
9. **Props with two sites.** Done: `crater`, `dead_gold_rail` and `her_cart` carry `site` (valley origin = the crater's
   centre at rail height). The bible's Places table gives each site's origin.

## Continuity notes taken
- S10: the near rail ends on the lip's last block, not in mid-air.
- L05 "his OWN cart" (so it can't read as Grandpa's cart).
- S04 (sidings, looking north) has ROSE's spur centred and the village in the bg. S14 has ROSE's empty spur in its bg.
- S12b now just pans (the "still" is removed).
- Size at every cut: S04 is now MS, so the cut into the FS pig shot changes size.

## Should-fixes taken (cheap)
- **Order:** Mom (L03) and "Kept the CART" (L04) now come right after L02, and the pig (L05-L06) after them. The pig
  stays on screen by 8 s: it sits silently in S03's foreground from 6.9 s, and L05 names it at ~12 s.
- **How she got out at her sister's:** the station's last rail is a powered activator rail (red, at (0,1), visible in
  S01 and S13). In S14 it sets Grandma down standing, facing Grandpa across the buffer stop. This is picture only, no
  words. It is added to the "why?" table and the clue map.
- Not taken: a fix for "fourth lost-spouse grandparent story". That is a slate-level call for the coordinator.

## Owner rules (all stories tonight)
- **Narrator voice:** all narrator lines are in single-speaker requests on Pip's recipe: `gemini-3.8-flash-lite-tts`,
  Leda, and the exact bracketed direction from voices/recipes/pip.md. There are two requests (r1: L01-L07, r2:
  L08-L13), with identical direction text. Grandma has her own request (r3: L14) on the same model, with her own fixed
  direction text. The critic's "ten-year-old" direction is NOT applied, because the recipe text is fixed (owner rule wins).
  Milo turns ten in the story, and the voice stays Pip's nine-year-old.
- The phrase "true story" is removed everywhere (it was in the r1 narrator direction).

## Numbers
118 spoken words (narrator 114, Grandma 4), ~44 s with holds, ending ~44.5 s. Valid JSON, no ellipsis.
