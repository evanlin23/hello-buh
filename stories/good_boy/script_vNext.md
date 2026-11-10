# good_boy: script vNext, the REWORK, r2 (2026-11-10)

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
- **Length:** 125 words, ~24 s spoken at 5.25 words/s, plus ~2 s of reveal, so ~26 s.
- **Out of context:** no "good boy", no bones, no "best friends". "Sit, boy" and "I'll be right back" are Dog on the Hill's canon lines, read bright, never hushed.

## Lines
| # | line | plays over (shoot) |
|---|---|---|
| L01 | My HUMAN / has TRIED / to LOSE me / thirty-seven TIMES. | the teleport (old L02): Buh sprinting away down the road; the wolf blinks in beside him (first frame = the mechanic) |
| L02 | He RUNS. / I FOLLOW. / Twelve BLOCKS out, / I just APPEAR / right NEXT / to HIM. | POV run down the road (old L01); the crane on the yard (old L02) |
| L03 | He HID / in the WHEAT. / He tried HILLS / at NIGHT. / He SWAM / to an ISLAND. / I POPPED up / on the BEACH. | old L04: wheat, night hills, the sea swim |
| L04 | The ONLY time / I DON'T / POP up / next to HIM / is WHEN / I'm SITTING. | new: Buh walks off; the wolf, sitting, stays put |
| L05 | He KNOWS that. / A SITTING dog / waits FOREVER. / He NEVER / makes me SIT. | new: Buh glances back at the sitting rule (re-use the yard) |
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
