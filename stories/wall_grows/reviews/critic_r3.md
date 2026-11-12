# wall_grows: critic r3 (the Roblox-format rewrite)

Verdict: REVISE. Two must-fixes: the loop doesn't echo line 1 (a format blocker), and the script runs about 60 s. The average is 7.5, but Delivery scores 5.

**Cold read:** A villager kid asks why their gateless wall is 40 high. Old Tomas tops it up every morning against a brown "plant", and the kid climbs it in his place. Outside, a man stands on the plant, with a hundred villagers boxed behind him. The wall hides the village from a player who pillars up every day to find it.

**Format:** line 1 states the fact and the why: yes. Clues: 5 (the block, the plant, the cart, the hiding, "trade"). The kid wants to know: L01, L11. A loved one is at stake: L13, thin. The rule is turned: L14. The reveal is said in one sentence: L15, yes. One beat, then cut: yes. **The last line echoes line 1: NO.** L16's "one more" echoes L02.

**Cold reader (predicted, not yet run on r3):**
- Casual reader at the midpoint: "something huge climbing in" (~40%). After the reveal: "a player keeps villagers in boxes and builds up every day to reach us." It lands.
- Gamer at the midpoint: a dirt pillar (~60%). The hall surprises.

| | score | why |
|---|---|---|
| Hook | 8 | Has a number and a spoken why, but a tall wall is grand, not strange |
| Second beat | 8 | "can't jump TWO" makes 40 absurd |
| Mystery | 8 | One clue per beat |
| Twist | 8 | Flips L01, L03, L08. "Standing on the brown plant" gives casual viewers the one jump |
| Fairness | 8 | Everything is planted. The narrator being a villager is shown only in S03 |
| Rewatch | 9 | L03, L06, L08, L12 |
| Naivety | 8 | Every clue is misread, and the kid is unafraid through L15 |
| Agency | 7 | The kid asks, then climbs for Tomas |
| Character | 7 | Strong subtext in L12, but Tomas is thin |
| Delivery | 5 | 182 words, about 61 s |
| Visual | 7 | 100 faces at 300 px in an extreme wide is a risk |
| Continuity | 6 | beats.md, bible.md, set.md and canon.md line 126 ("someone not in a room") are stale |
| Owner fit | 8 | Villagers build, "dig in" is left for the comments, no names spoken |
| Canon | ok | Stands alone |

Against runaway: worse. The opening image is less strange, and the loop is looser.

## Must-fixes
1. **Loop (L01/L02).** Put "one more" into line 1, so that L16 answers it and the hook becomes a growing wall:
   - L01: "Our village wall grows one block every MORNING. And nobody will tell me WHY."
   - L02: "It's FORTY blocks high. Old Tomas puts the new one ON."
   - Keep L16 as it is.
2. **Length: get it to about 160 words or fewer.**
   - L03: "A zombie can't even jump TWO. We're super SAFE!"
   - L04: "No gate. Who needs one? Everything's in HERE."
   - L05: "Once, a block just VANISHED. Blocks do that, I guess." (S04 shows the noon patch)
   - L08: "So Tomas builds one HIGHER. He always WINS."
   - L09: "Tomas came in that old MINECART. Like a KING!"
   - L10: "When we push it, Tomas HIDES. He's the best at hide and SEEK."
   - L13: "But this morning, old Tomas was too tired to CLIMB." (This also gives a visible cause.)
   - L14: "So I took his brick and went up for him, to see the MONSTER!"
   - L15: "A man stood on the brown plant, with a hundred of us behind him, each in a tiny BOX."

## Should-fixes
- Make S03's narrator the only baby villager, close and centred, so that "us" in L15 reads.
- S11: hold the hall at 40% or more of the frame, so the cells read at 300 px.
- In the bible, explain the pillar: he breaks it down every day and rebuilds it each dawn, so S05's rim+1 and S11's 28 agree.
- Run both cold readers on r3, then sync the docs and canon.md.

## r3b (re-check after the fixes)

Verdict: APPROVE. The average is 8.0, Hook, Twist and Fairness are 8 or higher, and nothing scores under 6.

**The r3 must-fixes are confirmed:**
1. **Loop.** L01 is now "grows one block every morning ... WHY", and L16's "put down one MORE" echoes and answers it. The format blocker is cleared, and a wall that grows is a stranger hook than a tall one.
2. **Length.** It's 163 words, about 54 s. Under r:r08fd98 that's a note, not a blocker.

**The should-fixes are done:**
- L13/S09b: Tomas steps onto the rung, steps back and drops the brick. That gives a visible cause and a reason for the kid to go.
- The pillar is at y0+38: the player stands just under the rim, and the extra dirt in S12 lifts his eyes over it. This agrees with set.md row 19 and bible.md line 83.
- S11 holds the hall at 40% or more of the frame.
- The bible and canon line 126 are synced.

**Cold readers:**
- Casual: a 60% guess at the midpoint, and gets the twist. That's guessable without being sure.
- Gamer: 75% on the trading hall. That's ahead of the kid, which the twist checklist allows.

**No regressions in the lines.**

**Changed scores:**

| | was | now |
|---|---|---|
| Hook | 8 | 9 |
| Agency | 7 | 8 |
| Delivery | 5 | 7 |
| Visual | 7 | 8 |
| Continuity | 6 | 8 |

Everything else is unchanged.

**Against runaway:** close to equal. Runaway's opening image is still stranger.

**Should-fixes (cue sync, not story):**
- S01's camera says "ends on 'high'". Change it to "ends on 'WHY'".
- S01b's frame says "on 'ONE more'". Change it to "on 'ON'".
- The S01 sfx entry: move it to `under: S01b`, with the note "on 'ON'".
- The S09b sfx still describes the old bedroom ("quiet room, Tomas's slow breath"). Change it to `entity.item.pickup` or a soft drop when the brick lands, and nothing else. Regenerate shots.md.
- Caption: "why does our village wall grow every morning 🧱" matches the new line 1. The upload title can keep "40 blocks high".
