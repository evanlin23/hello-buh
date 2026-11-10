# names_in_the_woods: r1 response (r2 changes)

## Critic must-fixes
| # | must-fix | change |
|---|---|---|
| 1 | The ending explains itself | L14 is now "Mom lied / to keep me HOME. / She can't THROW." New L15: "I CAN. / Potion, / then APPLE." (payoff = L15). S15: the throw and splash on "Potion", the hotbar slides to the golden apples x7 ("Golden Apple" over it) on "APPLE", cut at most 1 s after. `ending` updated. |
| 2 | Replace the backstory second beat | L02 is now "At our FENCE, / they STARE / at MOM." over S02, a full shot over Mom's left shoulder with the three zombies stopped at the fence 3 blocks beyond her. L03 is now "Everyone here / gets a NAME TAG. / Mom's says ROSA." ("I'm a PLAYER. Mine came FREE." cut) over S03, a crane from the hamlet down to Mom at her gate. L04 has a new shot, S04: Mom at her west window at dusk, three tags outside, the shutters closing on "STOLE". |
| 3 | The hook (S01) | The zombies are 14-16 blocks from the lens (x -12 to -14), arms raised, green faces lit by the path lamp at (-15,2), tags in the upper third (the meadow rises). Camera at (2, 2.0, 0), FOV 50, with a note to check the nameplates in a still. |

## Critic should-fixes
- L01 `say`: the comma after "Every night" is dropped (text and say).
- S11: ROSA walks out first and nearest the lens at (-17,0). The bottle is in her left hand by the lamp post (S12), then dropped on screen (S13).
- L06/S06: Mom is at her brewing stand and a bottle leaves it on "SPLASH POTION". L06 now reads "a GOLDEN APPLE".

## Continuity breaks
| # | break | change |
|---|---|---|
| 1 | S01/S11 framing | The camera moves to (2, 2.0, 0), FOV 50, with the zombies at 14-16 blocks. The foreground is the gate's top rail (no lantern posts in the frame). Test the nameplates in a still. |
| 2 | S02's crane faced away from the hamlet | The hamlet crane is now S03: key 0 is 14 up over x 4 looking east (the easter egg is on the far hill), and it lands on Mom's gate on "ROSA". |
| 3 | ROSA behind in S11, leading in S12 | ROSA steps out first and nearest at (-17,0); the three are at x -21 to -23. Bible rows updated. |
| 4 | OTS sides | S02 is behind Mom's LEFT shoulder (Mom at frame right). S14 is behind ROSA's RIGHT shoulder (the path's south side, her back at frame left). |
| 5 | New places opened full | S05 (empty_row) is now a WS POV from (4,0). Mom's cottage is established by S03's crane landing on its gate (place `hamlet`). |
| 6 | S10 glide | Mom starts at (-22,1). |

## Continuity notes
- 7: the potion has an on-screen cause. ROSA holds it in her left hand (conversion keeps both hands), and it slips from her hand onto the path on "DROPPED" (L13 is now "She DROPPED / her POTION."). The bible's backstory and its "Staged" note cover this.
- 8: L06 now reads "a GOLDEN APPLE".
- 9: S06 is at 3000 and S07 at 3200. S07 is now Mom at the west gate going out (the saying as she leaves). S06's camera is 3.5 up, above the garden fence.
- 10: "just lit" is gone. The lanterns are always lit.
- 11: chickens are killed every tick in S09, slot 2 is x7 in S09, and Milo's nameplate shows in S14.
- 12: in S13 Milo runs from (-10,0) to (-12.5,0) to the potion at (-13.5,0). ROSA is at (-16,0). The distance is 3.5 blocks in both S14 and S15.

## Voice (owner's drift rule + voices/recipes/pip.md)
- All 14 narrator lines are in single-speaker requests r1-r3 (5, 5, 4 lines). Each is on `gemini-3.8-flash-lite-tts`, Leda, with the recipe's exact direction, identical each time: `[A bubbly nine-year-old kid, fast, bright and energetic, telling a friend an amazing story; not whispery, breathy or soft]`.
- Mom (L05) has her own request r4 on the same model (one model per character).
- The phrase about a real story is gone from every direction. The per-line directions are short and never quote the line.

## Checks
- 120 spoken words. Estimated ~38 s of speech, ~39 s with the cut.
- No ellipsis anywhere in the folder. story.json is valid.
- Every size changes at each cut. The one close shot is S12.

## r2 polish (r2-continuity notes, r2-critic should-fixes)
- `world.easter_egg` now points at S03 (the start of the crane down, looking east).
- S13 is now WIDE. The POV starts at (-8,0), 8 blocks from ROSA, and he sprints 4.5 blocks (~0.8 s) to the potion. S14 is now FULL (Milo head to foot at 3.5 blocks). The run is S12 ms, S13 wide, S14 full, S15 ms.
- The subjects are big and central:
  - L02 looks at `{"what":"Mom","word":"MOM"}`, with the zombies centred and big.
  - L03's "Everyone" maps to Mom, and the crane lands with HUGO and PIA in the lane behind her.
  - L04's look is "Mom" (centred, 4 blocks).
  - S10 is now at FOV 40 from (3,8,0), pushing to (-1,7,0), with Mom centred.
- S02: the zombies stand 1.5 blocks out from the fence and Mom 1.5 blocks inside it. The bible is updated to match.
- S07: the west gate is already open, with Mom standing in it.
- Critic 1: L13 is now "She DROPPED / her POTION / for ME." ROSA looks at the bottle, then at Milo, and lets it fall toward him (Mom's last act, a choice). The bible's staging note and the "why?" table are updated.
- Critic 2: S04 is at 13200 and is a later night than S02 (bible).
- Critic 3: a 0.4 s gap after L11 and a `<short pause>` before "Rosa" in L12. Estimated ~40 s, under 45.
- Critic 4: shots.md notes that the S01 nameplate still comes first, with the zombies moving to 12 blocks if the tags don't read.
- To hold 120 words: L09 is now "I win EGG FIGHTS." and L12 is now "She had the APPLE."
