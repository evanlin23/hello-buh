# broken_rail r3, critic (mystery test, r:ra807e9; Script 4, r:r0d320b)
Verdict: **REVISE**. Overall 7.3/10. Fix the lines, not the premise. Every set stays.

**Cold read.** Grandpa has met an empty rail for 22 years, saying "She's on her way"; Mom says Grandma left him. The boy walks the line and finds Grandma stuck in her cart past a creeper hole, facing home. He pushes her home. She never left; she couldn't get out.

## Mystery test
- Question in 3 s: **pass**. By "SAME MINECART" (~1.5 s) the viewer asks "why?", and L03 gives a false answer.
- Guessable but not sure at the midpoint: **fail**. L08 says the answer aloud ("If she's on her WAY, the rail's BROKEN"), one line after the pig clue. That's too obvious.
- One-sentence reveal: **pass**. "A creeper blew the line on her way home, and she's sat in her cart ever since."
- Cut within ~1 s: **fail**. The reveal is L11 "Still facing HOME", followed by 12 s of L12, L13 and L14.
- 25-40 s: **fail**. 115 words, ~45 s.

## Scores
Hook 7 (no broken rule) · Second beat 8 · Mystery 6 (L08) · Twist 8 · Fairness 9 · Rewatch 9 · Agency 8 · Character 7 · Delivery 6 (too long) · Visual 8 · Continuity 7 (S14 still has "JUNE's empty spur and its sign") · Owner fit 6 (r:ra807e9, nothing extra) · Canon 8 (stands alone; the torch_hill egg is fine).
Against runaway: worse, on the image and the ending. Closing the gap means ending on the arrival.

## Must-fix
1. **L03+L04 → L03** (S03, then S04 on "kept"): "Mom says / Grandma LEFT him / for her SISTER'S. / And kept / the CART."
2. **L05+L06 → L05** (S05, then S06 on "Won't"): "Our PIG / LOVES his cart. / Won't get out / for a CARROT."
3. **Cut L07 and S07.** The bridge rule moves into L08.
4. **L08** (S08, rails picked up on "CART"): "At TEN / I was allowed / past the BRIDGE. / So I went / to get / her CART back." This keeps his want without giving the answer away, and keeps the misreading ("her cart", RUDE Grandma).
5. **Keep L09, L10 and L11 as written.** L11 is the reveal.
6. **Cut L12, L13, S12a and S13.** After "HOME": S12b with no line (1 s, the push, the cart crossing the new rails), then a hard cut to S14, the knock, then **L14** "Sorry I'm LATE, / dear." Cut 0.6 s after. That leaves ~4.5 s from the reveal to the cut, and L14 loops to L02.
7. **S14:** delete "JUNE's empty spur and its sign" (the signs are gone).

Result: 9 lines, 85 words, ~33 s.

## Should-fix
- Set the story.json fields: `ending.after` = L11; `payoff` stays L14; regroup the requests (r2: L03+L05; r3: L08+L09; r4: L10+L11).
- The coda is a judgment call. If the owner reads "cut at the reveal" literally, end on S11b at "HOME" (~29 s).
- It's still the fourth lost-spouse grandparent story.
