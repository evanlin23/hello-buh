# Critic: mystery pitches, round 2 (2026-11-10)

Test = Img/Rule/Q/#/Ans (0-2 each). Tw, Or, Bd, Fit are 1-10. Mystery = the owner's test (a blocker). The midpoint
percentages come from `mystery_2026-11-10_coldread.md`.

| rk | premise | test | Tw | Or | Bd | Fit | mystery | verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | Red Sheep | 2/1/2/2/2 = 9 | 8 | 6 | 7 | 8 | **pass**: casual 45 % "red = danger"; after: "an evoker turns blue sheep red, so they're an alarm". Players who know "wololo" are near sure by line 4, which is where Light Sleeper's shriek sits too. | **develop** |
| 2 | Bell in the Window | 1/2/2/1/2 = 8 | 7 | 7 | 5 | 7 | **pass, barely**: 40 %, but the reader was "confused about cause and effect" | **park** |
| 3 | Forty-One Cats | 2/2/2/2/1 = 9 | 6 | 5 | 7 | 6 | **fail: too obvious** (85 %) | **park** |
| 4 | Night Builder | 2/0/1/2/1 = 6 | 4 | 5 | 6 | 4 | fail: line 3 and "works NIGHTS" give it away, and the chat line is a tail | **kill** |
| 5 | Four Hundred Beds | 1/2/2/2/1 = 8 | 4 | 3 | 6 | 3 | fail: obvious to players (85 %), confusing to everyone else | **kill** |

## Did round 2 apply round 1's fixes?
- **A: yes, all four line fixes** (EYES, one red sheep, the gate and crossbow, cut on the fangs). The engine check
  wasn't done. `renderer/entities.js` colours sheep per tick, and the evoker and fang models exist. Still to verify:
  the casting pose (arms raised) and the spell particles.
- **B: half.** The craters are gone, but "a cat turned its HEAD, and it STOPPED" shows the whole mechanism at 60 %. "The week I
  CAME here" is never paid off: the ending doesn't show that the creeper wants *him*.
- **C: yes.** The sister and the hidden-guard shape are gone. The new turn is better than round 1's.
- **D:** it was killed in round 1 and came back as a comedy. It's still bed-mining by line 4.

## Why 4 and 5 die
- **Night Builder:** "who builds it" is a *who*, not a *why*. Mom's "He comes while you SLEEP" plus "Dad works NIGHTS" says
  the answer before the picture does. A real-world night job breaks the in-world fiction (game nights aren't real
  nights). "you're up LATE, kiddo" is a line after the reveal. No vanilla rule is broken.
- **Four Hundred Beds:** players solve it, non-players can't explain "beds explode" after the cut, and it's comic. A
  glowing purple cellar portal repeats Gold for the Portal's set.

## Red Sheep: must-fixes for the script
1. **"Grandpa dyes them every MORNING. He buys every blue dye the traders have."** Why every morning, when dye is
   permanent? Write: **"Grandpa dyes every new LAMB the day it's BORN."**
2. **"Today my LAMB got out. Grandpa was ASLEEP."** Why doesn't he wake him? Give him the cause and the guilt, which
   is also agency. Write: **"Today I left the gate OPEN. My lamb got OUT."** / **"Grandpa was ASLEEP. I went ALONE."**
3. **"She stopped. She turned around."** This means nothing. Pay off EYES: **"She stopped. She was STARING into the
   TREES."**
4. **The reveal, in one wide frame:** the lamb in the foreground, and the evoker behind it with its arms up. The lamb
   flips red *as* the arms drop (the cold reader's casual-viewer fix: the cause and the effect in one frame). The
   fangs snap toward the camera, and the cut comes ≤1 s later. No line after the cut.
5. **Hook shot:** all sixty blue sheep in one wide, with Ravenford's palisade behind them, at full scale and countable.
6. **Canon:** Grandpa keeps Ravenford's look (`zuri`, the slow walk) and his voice (Charon). Kid Buh keeps Thirty-One
   Raids' narrator voice. Nobody says "Buh". The easter egg: the 32-frame totem wall, glimpsed through Grandpa's door
   (evokers drop totems), never spoken.

**The "why?" questions a viewer asks:** Why dye every morning? (fix 1.) Why not wake Grandpa? (fix 2.) Why is an
evoker in the woods? Put the Ridge's pillager outpost on the horizon of the woods' establishing shot. Does a red
sheep really mean danger? The gate and the crossbow set it up, and the reveal proves it. "Sheep change colour?"
Fix 4 answers it.

**Against runaway:** worse on rewatch. Only "EYES" and line 1 flip; runaway flips every line. To close the gap, give
a second innocent line a double meaning, e.g. **"He counts them every NIGHT. Blue, blue, blue."**

## Bell in the Window: to develop it
- Line 1 is a window and a bell: weak with the sound off. Make it about the narrator (runaway's move). Write:
  **"Every time I open my WINDOW, the whole village RUNS inside."**, then **"The bell RINGS. Three hundred NIGHTS.
  Nobody's ever THERE."** Cut "When it rings, everyone in the village RUNS inside."
- Why does a skeleton stay under one oak for 300 nights instead of walking down? Put the oak on a cliff ledge it can't
  climb down from: **"Up on the CLIFF there's an old OAK."**
- Why does nobody kill it? Show that every adult is a villager, unarmed.
- **Bd 5:** frame the oak, the bell and the window on one axis in a wide. Verify the skeleton's draw pose, the bell's
  swing and an arrow readable at 300 px before scripting. Cut on the second draw, aimed at the camera.

## Forty-One Cats: to un-park it
- Replace the solving line with a misread: **"Once I heard a HISS under my window. Grandma said it was a CAT."**
- Pay off "the week I CAME here" with the picture: in the reveal, the creeper walks past Grandma in the yard without
  a glance, straight to his window. Add the clue **"The neighbours don't even lock their DOORS."** (creepers ignore
  villagers).
- "A cat every three BLOCKS": with one gap, the next cats are still within the creeper's 6-block flee radius. Write
  **"every TEN blocks"**.
- **Or 5 stays a problem.** It's Light Sleeper's plot: a village guards its player kid from a mob that only answers
  players, and he breaks the custom out of kindness. The cat-as-guard is also Phantoms Over Our Roof's.
