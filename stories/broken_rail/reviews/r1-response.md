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

## r2 polish (r2-continuity notes 1-7, r2-critic should-fixes 1-3)
Continuity:
1. `props.dead_gold_rail.at` is now [0,0,4], so the gap is 7 blocks.
2. S06 time is 12650, so the sun no longer runs backward after S03-S05.
3. The S13 cart is ~27 blocks out at the cut (S13 frame, `ending.beats[0]`). It hops to ~3 blocks out for S14 and
   knocks the buffer 0.3 s before L14 (S14 frame, set.md, beats clock).
4. In S12a the POV walks forward along the new row: it places the dirt, lays the rails as it goes, and places the torch
   from the last rail. Milo ends on the far side for S12b (S12a camera/frame, set.md).
5. Grandpa's headYaw is ~40 deg west toward the sunset in S01 and S13, so his face reads in three-quarter (S01, S13,
   bible cast row, set.md).
6. A north apron of slabs at x -3..0, z -2..-1 holds Grandpa's mark. The bench moves to (-2,-1), at frame left and
   clear of him (S01, bible, set.md).
7. The hotbar has no rails before L08. S06 shows carrot, dirt and torch only, and the rails arrive in slot 1 on "RAILS"
   in S08 (S06, S08, bible hotbar and narrator rows, set.md).
Critic:
1. L11 `say` is now "Past it, a minecart. <short pause> Grandma in it. <short pause> Still facing home."
2. S12a's jump cut starts at 3 dirt, and the last 4 go in on "I bridged the HOLE".
3. S07 holds 0.5 s on Grandpa before the crane. The hold sits inside L07's speech, so it adds no time.
Numbers: 118 words. The estimated length is ~44.9 s, ending at the 45 s limit: L11 adds +0.6 s and the shorter cart
roll saves -0.2 s. If `./hb pace` reads over 45 s, drop L11's second pause first (beats.md says so). Valid JSON, no
ellipsis.
