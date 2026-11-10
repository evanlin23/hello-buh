# good_boy: script vNext, the REWORK, r3 (2026-11-10)

**APPROVED.** Critic r2: 8.0 average; Hook, Twist and Fairness 8; lines approved (`reviews/vnext-rework-r2-critic.md`). The two open non-line fixes are applied:
- The L04-L05 shots now show *another* tamed wolf sitting alone by an empty house. His own dog stands, so the line never plays over the action it denies, and only an owner can make a wolf sit.
- `voices.json`'s narrator direction is bright, never hushed.

The fresh cold reader on r2 was 55 % at the midpoint and 7/10, but got the motive only half ("wait so why was he trying to lose it tho??"). So L05 adds the motive in one half-line: "He WANTS me / to FORGET him." Losing the dog means it forgets him; making it sit means it waits forever.

**r2:** applies the critic's 4 must-fixes (`reviews/vnext-rework-critic.md`) and the cold read's 2 notes:
- L05 now gives the motive on screen: "A SITTING dog waits FOREVER. He NEVER makes me SIT." The final sit is the turn.
- L08 is "I got THERE FIRST" ("I don't remember" read as the dog dying).
- L03 is true to the game (a player outswims a wolf, so the dog pops up on the beach).
- "So I SAT" is cut (it read as obedience).
- The vague sea line becomes "SORRY, buddy. I don't KNOW what FOR."
- The first frame is the teleport.
- The easter egg is the boxed bell.

Cold read r1 (before the fixes): 60 % at the midpoint, 7/10, line 1 changed meaning, no innuendo or stalker flags.

The owner: "Yeah, we can rework it." This replaces the not-recommended arc revision. It's a proposal: `story.json`
is unchanged. Not voiced.

## The premise
- **Line 1:** "My HUMAN has TRIED to LOSE me thirty-seven TIMES."
- **Who narrates:** the narrator is the dog, said openly from line 1. The old mystery ("who am I?") is gone, and so are its three failures: "dog" guessed by line 2, the stalker read, and the innuendo.
- **The mystery** is now *why a guy would try to lose a dog that good*, and why, if he wants to lose it, he never uses the one sure way (a sitting dog waits forever).
- **Vanilla rules:** a tamed wolf teleports to its owner from 12 blocks, unless it's sitting. Players leave.
- **The answer, shown by the game:**
  - for 37 tries, Buh (16, never named aloud) was trying to set his dog loose, so it wouldn't wait for him when he stopped playing;
  - it always popped back;
  - the dog says it plainly: the only time it doesn't pop back is when it's sitting, and he never makes it sit;
  - on the last morning he walks it up the hill by his old hut, says "sit, boy" and "I'll be right back", and the chat says "Buh left the game".
- **Recontext:** line 1 turns from mean to the kindest thing he tried. The sit he avoided 37 times is the one he finally used.

## Arc and test
- **Arc:** T3 Sinister Reread (a damning fact, read again as love), with a T5 Countdown ending (37 tries, then the one that works). It has the T1 refrain ("He tried WHEAT. He tried HILLS...").
- **The question (by 3 s):** why tf would he try to lose his own dog?
- **Midpoint:** "COLLEGE" plus the cliff at night gives a guess (he's leaving), but not *how* or what it means for the dog.
- **The reveal (the game):** the chat line "Buh left the game" over the sitting wolf, facing the empty patch. Cut 1.0 s after it reads.
- **Loop:** cause and effect. The 38th try worked, and that's why line 1's count stops at thirty-seven. For fans, it's the first frame of Dog on the Hill.
- **Pace:** one narrator for every quote; 2-3-word chunks with one CAPS key word each (validated); continuous, with no dramatic pauses.
- **Length:** 132 words, ~25 s spoken at 5.25 words/s, plus ~2 s of reveal, so ~27 s.
- **Out of context:** no "good boy", no bones, no "best friends". "Sit, boy" and "I'll be right back" are Dog on the Hill's canon lines, read bright, never hushed.

## Lines
| # | line | plays over (shoot) |
|---|---|---|
| L01 | My HUMAN / has TRIED / to LOSE me / thirty-seven TIMES. | the teleport (old L02): Buh sprinting away down the road; the wolf blinks in beside him (first frame = the mechanic) |
| L02 | He RUNS. / I FOLLOW. / Twelve BLOCKS out, / I just APPEAR / right NEXT / to HIM. | POV run down the road (old L01); the crane on the yard (old L02) |
| L03 | He HID / in the WHEAT. / He tried HILLS / at NIGHT. / He SWAM / to an ISLAND. / I POPPED up / on the BEACH. | old L04: wheat, night hills, the sea swim |
| L04 | The ONLY time / I DON'T / POP up / next to HIM / is WHEN / I'm SITTING. | new: Saltmouth, another tamed wolf sitting alone outside an empty house; Buh stops and looks at it, then walks on, his own wolf standing at his side |
| L05 | He KNOWS that. / A SITTING dog / waits FOREVER. / He WANTS me / to FORGET him. / So he NEVER / makes me SIT. | new: Buh glances back at the sitting rule (re-use the yard) |
| L06 | He keeps TALKING / about a PLACE / called COLLEGE. | old L05 yard, Buh on the step (new line) |
| L07 | Every NIGHT / he SAYS, / SORRY, buddy. / I don't KNOW / what FOR. | dusk on the cottage's sea edge (old L09 sea-edge camera) |
| L08 | Last NIGHT, / a ZOMBIE / came for HIM. / I got THERE / FIRST, though. | old L14-L16: the zombie, the bites |
| L09 | This MORNING, / he WALKED me / BACK home, / up the HILL / to his HUT. | new: Dog Hill (world.build dog_hill), the hut, the patch; the easter egg: Hushwell's boxed bell in the plaza below |
| L10 | He SAID, / sit, BOY. | new: on the hilltop D, the wolf sits |
| L11 | He SAID, / I'll BE / right BACK. | new: Buh on the patch; chat 'Buh left the game'; he is gone; the wolf sitting, facing the empty patch |

## What of the old shoot it reuses
- **Kept (Saltmouth, `stunts/story_good_boy.js`):**
  - the set: the cottage on the pad at Saltmouth's east edge above the sea, the yard and the road;
  - the actor man (recast as Buh: Steve skin, the `milo`/`buh` voice not needed, since the narrator says his lines);
  - the wolf with the red collar (stunt.self.model) and the wolf-eye POV (stunt.self.eye 0.68).
- **Kept shots:**
  - old L01 (the POV run down the road);
  - old L02 (the teleport, and the crane on the yard);
  - old L04 (night hills, wheat, the sea swim);
  - old L05 yard;
  - the old L09 sea-edge camera;
  - old L14-L16 (the zombie, and the bites).
  - That's about 7 of the 11 lines.
- **New:**
  - the sitting rule (L04-L05: Buh walks off, the wolf sits and stays, a re-use of the yard);
  - dusk on the cliff (L07, the old sea-edge camera at 13000);
  - the Dog Hill ending (L09-L11), built by `world.build(ctx, { story: 'good_boy' })` at `dog_hill` as of day 3400: the hut, the patch and D, with the dog sitting on D facing the patch (canon). The chat "Buh left the game" must be readable at 300 px.
- **Dropped:** the porkchop, the door, the waiting time-lapse, the square of tall villagers, and the "Good boy" crane.
- **Canon** (update `docs/world/canon.md` when adopted):
  - Good Boy spans day ~3300 at Saltmouth to day 3400 on Dog Hill. Its last line *is* Buh's canon last login ("Sit, boy. I'll be right back."), so it ends on the first frame of Dog on the Hill.
  - Canon link 7 flips: Buh tried to set the dog loose (not the dog trying to leave him).
  - Conflict 6 is resolved: the man is Buh, not the old farmer.

**Reviews:** `reviews/vnext-rework-critic.md`; the cold read is in `docs/pitches/vnext_coldread_2026-11-10.md` (good_boy rework).

## r-ear (2026-11-10): rewritten for the ear (STANDARDS 2.000)
The owner: "only works if tis clear what is beign said"; the narrator is "a child that doesnt understand teh wrold... figuring it out".
These lines **replace the table above**. The beats, the shots and the reveal and cut are unchanged unless noted.

How they're written:
- one short, simple thought per sentence, in time order, joined by So / Then / But;
- no stacked clauses, and numbers kept apart from other information;
- each sentence lands on its key word;
- told by a happy kid who misreads what the viewer understands (model: "Mom SAID it was a FOX").

The cold listener (audio-style, one fast pass) followed it. Its notes are applied here and logged in `docs/pitches/vnext_coldread_2026-11-10.md`.

**Length:** 126 words, ~24 s spoken at 5.25 words/s, plus ~2 s of reveal.

| # | line (r-ear) | plays over |
|---|---|---|
| L01 | My HUMAN / has TRIED / to LOSE me / thirty-seven TIMES. | the teleport (old L02): Buh sprinting off, the wolf blinks in beside him |
| L02 | He RUNS. / I FOLLOW. / Twelve BLOCKS out, / I just APPEAR / right NEXT / to HIM. | POV run (old L01); the yard crane (old L02) |
| L03 | He HID / in the WHEAT. / He tried HILLS / at NIGHT. / He SWAM / to an ISLAND. / I POPPED up / on the BEACH. | old L04 |
| L04 | But SITTING? / I STAY put. / A SITTING dog / waits FOREVER. | new: another tamed wolf sitting alone by an empty house; Buh looks at it |
| L05 | He doesn't WANT / me to WAIT. / So he NEVER / makes me SIT. | new: Buh walks on, his own wolf standing at his side |
| L06 | He keeps TALKING / about a PLACE / called COLLEGE. / It sounds BORING. | old L05 yard |
| L07 | Every NIGHT / he SAYS, / sorry, BUDDY. / I don't KNOW / what FOR. | dusk on the sea edge (old L09 camera) |
| L08 | Then last NIGHT, / a ZOMBIE / came for HIM. / But I GOT / there FIRST. | old L14-L16 |
| L09 | So this MORNING, / he WALKED me / BACK home, / up the HILL / to his HUT. | new: Dog Hill (world.build), the boxed bell below |
| L10 | He SAID, / sit, BOY. | new: the wolf sits on D |
| L11 | Then he SAID, / I'll BE / right BACK. | new: chat 'Buh left the game'; cut 1.0 s |

## r-cast (2026-11-10): character lines in their own voices, plus spoken stress
This **replaces the r-ear table above**. Two changes, both ruled by the lead on main:

- **Characters speak their own short lines in their own voices** (STANDARDS 2.00: "the narrator does all of it essentially, plus short lines from other characters"). The narrator's lead-ins stay short ("Mom SAYS:"). Each character line is 6 words or fewer; Light Sleeper's "Walk SOFT, sweetie..." (8) is the allowed exception.
- **Spoken stress:** the caption still colours one key word per chunk, but the voice stresses ONE word per sentence, its last key word, shown in **bold**. The delivery note says to hit only the bold words and keep the rest level and quick.

**Voices:** Buh: `milo`/`buh` (Achird), canon. Narrator: the house narrator (STANDARDS 2.0-2.1).

**Length:** 127 words, ~24 s spoken at 5.25 words/s, plus ~2 s of reveal.

| # | who | line (bold = the spoken stress) | plays over |
|---|---|---|---|
| L01 | N | My HUMAN / has TRIED / to LOSE me / thirty-seven **TIMES**. | the teleport (old L02): Buh sprinting off, the wolf blinks in beside him |
| L02 | N | He **RUNS**. / I **FOLLOW**. / Twelve BLOCKS out, / I just APPEAR / right NEXT / to **HIM**. | POV run (old L01); the yard crane (old L02) |
| L03 | N | He HID / in the **WHEAT**. / He tried HILLS / at **NIGHT**. / He SWAM / to an **ISLAND**. / I POPPED up / on the **BEACH**. | old L04 |
| L04 | N | But **SITTING**? / I **STAY** put. / A SITTING dog / waits **FOREVER**. | new: another tamed wolf sitting alone by an empty house; Buh looks at it |
| L05 | N | He doesn't WANT / me to **WAIT**. / So he NEVER / makes me **SIT**. | new: Buh walks on, his own wolf standing at his side |
| L06 | N | He keeps TALKING / about a PLACE / called **COLLEGE**. / It sounds **BORING**. | old L05 yard |
| L07 | N | Every NIGHT / he SAYS, / **sorry**, BUDDY. / I don't KNOW / what **FOR**. | dusk on the sea edge (old L09 camera) |
| L08 | N | Then last NIGHT, / a ZOMBIE / came for **HIM**. / But I GOT / there **FIRST**. | old L14-L16 |
| L09 | N | This MORNING, / he WALKED me / BACK home, / up the HILL / to his **HUT**. | new: Dog Hill (world.build), the boxed bell below |
| L10 | N | He TURNED / to **ME**. | new: the wolf sits on D |
| L11 | Buh | Sit, **BOY**. | new: the wolf sits on D |
| L12 | N | Then he SAID: | new: chat 'Buh left the game'; cut 1.0 s |
| L13 | Buh | I'll BE / right **BACK**. | new: chat 'Buh left the game'; cut 1.0 s |
