# dog_hill: script vNext r2 (arc revision, 2026-11-10)

A proposal, not adopted: `story.json` is unchanged. Sources:

- the owner's notes: "fix what we have"; "the fast pace is good" (STANDARDS 2.3, ~5-5.5 words/s); "the captions can be 2-3 words" (STANDARDS 6.1); "the narrator just yaps on and on" (no dramatic pauses);
- the arc study, `docs/story_arcs.md`.

Format rules:

- **One narrator says every line,** including the other characters' quotes.
- **Captions:** every ` / ` chunk is 2-3 words with exactly one CAPS key word (validated).
- **Not voiced:** the narrator voice is being re-cast.

- **Status:** Critic must-fixes applied (L13, L10, the bones line cut, the chat to say Buh). Cold read 9/10. Ready for a confirming critic pass.
- **Arc:** T2 Town Rule and T5 Countdown; a cause-and-effect loop (the promise restarts the count).
- **The question (by 3 s):** why tf has the dog sat on that hill for 900 days?
- **Loop:** The last line is his promise, "sit, BOY. / be right BACK." Line 1 ("hasn't MOVED in nine hundred DAYS") is what that promise does. The count starts again, so the loop is shown, not said (the owner cut "Day ONE. AGAIN.").
- **The reveal and the cut:** "Buh left the game" in chat; the dog sits back down facing the empty patch; cut 1.0 s after "BACK" (current S13 into the S01 frame).
- **What changes from the current version:** Grandpa's and Buh's lines are now narrated by Pip (one voice). L15 "Day ONE. AGAIN." is dropped. Same shots, re-cut. The recorded chat must say Buh (not Milo), readable at 300 px: a chat re-render.
- **Delivery: continuous, no dramatic pauses anywhere (owner: "the narrator just yaps on and on"). One take per beat, sentence after sentence from frame 0 to the cut; drama from the words and the picture, never from silence.**
- **Length:** 133 words, ~25 s spoken at 5.25 words/s, plus ~1.5-2 s of reveal.

| # | line | plays over (existing shot) |
|---|---|---|
| L01 | The DOG / on the HILL / hasn't MOVED / in nine-hundred DAYS. | S01 |
| L02 | Not for RAIN. / Not for THUNDER. / Not for CREEPERS. / Not even ZOMBIES. | S02 |
| L03 | I BRING him / a BONE / every MORNING. / He never LOOKS. | S03 |
| L04 | Kids THROW / STICKS for him. / He doesn't BLINK. | S03 |
| L05 | He's GOT / a red COLLAR, / but NOBODY here / OWNS him. | S03b |
| L06 | He just STARES / at one EMPTY / patch of GRASS. | S04 |
| L07 | And BEHIND him, / an OLD / dirt HUT. / Nobody KNOWS / who BUILT it. | S05 |
| L08 | I TRIED to / make him STAND. / I even BEGGED. | S05b |
| L09 | Grandpa SAYS, / leave him BE. / Only ONE voice / gets him UP. | S06 |
| L10 | SOMEBODY said / be right BACK. | S08 |
| L11 | So every NIGHT, / I SIT there. / NOBODY should / wait ALONE. | S09 |
| L12 | Then last NIGHT, / he STOOD up. | S11 |
| L13 | Then a GUY / just APPEARED / on the PATCH. / Hey BUDDY, / sorry, got BUSY. | S12 (he appears on the patch) |
| L14 | Then he SAID, / sit, BOY. / be right BACK. | S13 (chat: Buh left the game; the dog sits) |

**Recordings:** the sets, the stunt and the shots carry over. Re-voice with the new narrator, then do a re-record pass, because the scene lengths come from voice.json. No rebuild is needed.

**Reviews:** `reviews/vnext-critic.md` (r1, on the first vNext) and `docs/pitches/vnext_coldread_2026-11-10.md`.

**Where the story lives:** its story.json and recordings are on `claude/story-cine-2-render-story_dog_hill`.
