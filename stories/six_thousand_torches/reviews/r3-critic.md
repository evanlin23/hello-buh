# six_thousand_torches: critic, r3 (the story format; working tree on claude/script-six-thousand-torches)

Verdict: **REVISE**. There is one must-fix, and it is a text fix that breaks an owner rule. Once it's made, the script is approved with no new round. Average 7.6: Hook 8, Twist 8, Fairness 8, nothing under 6.

**Cold read.** A villager kid wakes to six thousand torches and decides a party is coming. Jonah's things are in the kid's chest and Jonah's house is gone. The last row of torches leads to the kid's door, where Jonah sets down his own torch, waves and walks away without "see you tomorrow". The twist: Jonah is leaving for good. He lit everything so his friend is never in the dark without him, and the kid doesn't know it. Midpoint (after L07): "Jonah's leaving?", about 60%. After: one sentence, correct.

**The format (blockers).** Line 1 says the fact and the why: pass. Clues: five, each with a misreading (party, presents, moving in, a present at the door, forgot). Wants to know: L01 and L11. Someone loved: Jonah, L05. Reveal said: L14, which is plain and needs no mechanic. One beat after it: L15. Loop: L15's WHY echoes L01's. Every r2 fix still holds: kai skin in S05, the sfx ids, `ending.after`, `reveal.echo`, and map.json `since: 4501`.

**Scores**
- Hook 8: "I HAD to know WHY" makes the question explicit. Frame 1 at 300 px is still untested.
- Second beat 7: L02 is a list.
- Mystery 8.
- Twist 8: "COMING" turns into going, and "SOMEONE" turns out to be Jonah.
- Fairness 8.
- Rewatch 9: L04, L10, L13.
- Naivety 9: nothing afraid, nothing that hints.
- Agency 7.
- Character 8.
- Delivery 6: there is a "..." in L15.
- Visual 7.
- Continuity 7.
- Canon 8: it stands alone, and the egg is unspoken.
- Owner fit 7: the "..." breaks the owner's rule (STANDARDS 7).
- Against runaway: worse on surprise (owner-accepted), equal on heart.

**Must-fix**
1. **L15 has a "..."** in both `text` and `say`. Owner rule: "No '...' anywhere in a script" (Gemini stops and drops into a whisper). The obvious repair, "I'll ask him why tomorrow", garden-paths: it can be heard as "why [it's] tomorrow". Rewrite:
   - `text`: `TOMORROW, / I'll ask him WHY.`
   - `say`: `Tomorrow, I'll ask him WHY.`
   - direction: "bright and sure, one breath, straight on from L14, a lift on WHY".

   It picks up L14's last word, ends on L01's last word, and loops ("...ask him WHY. / SOMEONE put six thousand torches"). Mirror the change in beats.md (row 15, the ending, the loop, the clue map), shots.md (S14), story.json (`reveal`, `ending.loop`, `sfx` S14 note: L15 over the footsteps) and bible.md "Who knows what" L15.

**Should-fixes**
- `upload.title` still says "last night". Make it "someone put 6,000 torches on my village overnight 🔥" so it matches L01 (line 1 is the title).
- `revision` says L03/L04 were "merged into one thought". They are still two lines, so correct the note.
- `world.easter_egg` still says "two pale specks". Use "a speck on the hilltop (the dog and Pip side by side)" (world pass, note 4).
- The S06 held-torch light needs the engine's dynamic light. Vanilla has none.
- Record the r3 casual and gamer cold reads in reviews/cold_reads.md before handing the script to the owner (STANDARDS 0z).

## Applied (writer, r3b)
Must-fix 1 applied verbatim: L15 is now "TOMORROW, / I'll ask him WHY." (say "Tomorrow, I'll ask him WHY."), in story.json, beats.md, shots.md, bible.md, set.md. Should-fixes applied: upload.title "overnight", revision note corrected, easter_egg wording, cold reads recorded. Not changed: S06 held-torch light (engine dynamic light, a build note). Per this review the script is APPROVED with the fix.
