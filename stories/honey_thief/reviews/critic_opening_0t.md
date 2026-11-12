# honey_thief: critic, the r9 opening (L01 + 0-8 s, STANDARDS 0t)

Verdict: REVISE (one blocker; the rest passes)

## L01, "A GIANT robbed my family FIFTY-TWO times. Then planted us FLOWERS."
- **Meaning and absurdity: kept.** A thief who plants gifts still asks "why?" by itself (0v, 0y). Cutting "has" and "And he" brings FIFTY-TWO forward and makes the line parse faster.
- **Tense: acceptable, with one cost.** "Then planted" can be heard as one gift after 52 robberies, where "And he plants" said it happens every time. That doesn't break the one-bottle-one-row rule, because L03 "One bottle, one row of flowers" corrects it at about 9 s, before any clue needs it. Hearing it as an apology also feeds L04's misread ("he feels bad"). The loop still closes: L12 "Fifty-two BOTTLES. Fifty-two ROWS." answers "robbed... FIFTY-TWO times" and "planted" as a count. The past tense also suits a narrator telling it afterwards. Keep it.
- **Timing:** FIFTY-TWO is word 6, after 8 syllables. At Pip's ~3 words/s it starts at about 1.6-1.8 s. That passes, but it is tight if ROBBED is leaned on. The whole line runs about 3.4-3.7 s, past 0t's "done by ~2.5 s" (the first sentence ends by about 2.5 s). The study accepted this. Gate it on voice-timings: if FIFTY-TWO starts after 1.9 s or FLOWERS ends after 3.6 s, take the faster take. The words don't change, because "my family" is the stake.
- Should-fix: "Then" opens both L01 and L03 ("Then clink"), and the "First... Then" in L02/L03 now sounds like an echo. It can stay, but L03 could open "Clink. Honey gone." on its own.

## 0-8 s against 0t
- **S01 (0-1.8, MCU):** passes. His face is >= 1/3 of the width, the bottle is at the dripping hive, and it moves on frame 1 (the bee's hover bob plus the drips). It cuts on FIFTY-TWO and the camera is on what the line names (look.word GIANT). It's bee POV with hud:false, so it is not a HUD POV. The giant is the rule's actor, not the one it acts on. That's acceptable because line 1 names him.
- **S01b (1.8-2.6, low EWS):** passes. It's the count as a picture, and keeping it under 4 up protects S10.
- **S01c (2.6-3.4):** passes, and is better than the study's version because it places no flower and the bottle stays empty.
- **S02 (3.4-4.6):** a sister's face. This is the stake on a face, inside the 2-4 s window only from 3.4 s, but it passes.
- **S02b (4.6-6.2):** passes. The rule acts on the sisters, and his bottle comes in.
- **S02c (6.2-7.4): BLOCKER (0t: "no backstory/layout"; "the rule on a new person").** Its subject is "beehive". It shows the hive over the campfire with the heart around it, which is a layout shot. It is also a second MS in a row, and it puts the comic "We hate that" on an object. Fix: in story.json S02c, set `"subject": "bee"`, `"size": "mcu"`, keep the low camera 3 SE and 1 up, and use frame: "the third sister's face, grumpy-sleepy, bumping into the hive's face in the smoke on HATE; the campfire's smoke and the hive's bottom edge soft behind her; his bottle at the frame edge." The campfire still reads in the smoke. The heart is shown in S07, where L07 names it.
- **S03 CLINK (~7.4, <= 0.8 s):** passes.

## Spoiler check
Nothing names or frames the shape. S01b is the only risk: looking north across the rows, low, the wildflower body crossed by podzol stripes can stack into yellow and black bands (bee colours). Should-fix: in S01b, pitch the camera <= 10 deg down and keep the lilac wings and the outline out of frame, so the viewer sees thin rows and not bands.

## Should-fixes (continuity)
- S01c puts him "a few blocks south of the hive". He's at the hive in S01 and back there in S02b, and the area just south of the hive is the pink heart and rose bushes, not rows. Stage S01c at the hive: he turns his face from the hive to the bee, with the rows past his shoulder.
- story.json line 60 (narrator `on_screen`): add S01b, S01c, S02, S02b, S04 to the list of POV shots so it matches bible.md.
