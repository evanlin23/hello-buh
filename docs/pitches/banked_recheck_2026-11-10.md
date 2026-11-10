# The banked scripts against the mystery test (2026-11-10)

The test is STANDARDS 1.0, the owner's mystery test, and its reasons are in `docs/story_research_mystery.md`. It has
four parts:
- **Q**: a question to the viewer by 3 s.
- **Mid**: at the midpoint, a guess but no certainty.
- **Cut**: the Short ends within ~1 s of the reveal, with no explaining line.
- **Fast**: 25-40 s, and nothing that doesn't move the question.

Word counts are from story.json at ~2.85 words/s overall. All five are over 40 s now, and so is Light Sleeper at
~47 s. **None passes as written. Four are revise and one is kill.** Each fix below is exact: the lines to cut, and
any rewritten lines in full. Nothing here has been voiced, and no voice is needed until the owner picks the new
narrator voice.

| story | Q (3 s) | Mid | Cut | Fast | verdict |
|---|---|---|---|---|---|
| broken_rail | pass: "why is grandpa waiting for a minecart?" | pass: the pig that won't leave its cart (players: mobs can't get out) | **fail**: the reveal (Grandma in the cart, L11) lands at 70 %, then 3 more lines | fail: 128 words, ~45 s | **revise** |
| slow_falling | pass: "how does grandma survive the jump?" | **fail, too obvious**: "Grandpa packs her JUICE" (L03, ~8 s) tells every player "potion" | **fail**: L12-L13 explain after the game names the potion | fail: ~41 s | **revise** (or kill if the fix can't hide the potion) |
| scarecrow | pass: "why is there snow from the scarecrow to his window?" | pass: L06 "built out of SNOW", so players think "snow golem", but is it stalking or guarding? | **fail**: L11 explains the picture ("It wasn't STARING...") | fail: ~44 s | **revise** |
| goat_horn | pass: "why does dad let the goat ram him?" | pass: "Goats don't MISS" | **fail**: L12 "It was for ME. To CALL him." explains | fail: ~47 s; **engine: the goat isn't drawn** | **revise**, after the goat model |
| lantern_bay | pass: "why are there lanterns on the seabed?" | **fail**: L06-L07 answer the question at ~55 % (a lit road to the shipwreck); the rest is a new question | **fail**: "That's GRANDMA. He GOT there." explains | fail: ~41 s | **revise** |

## broken_rail: revise
**What works:**
- the pig in its minecart is a perfect picture clue (mobs can't get out of a minecart on their own);
- "LEFT him for her SISTER'S. Kept the CART too. RUDE." is a misread that passes.

**Fix (exact).** The reveal moves to the station, so the Short cuts on Grandma arriving:
1. **Cut L04** ("Kept the CART, too. RUDE.") and **fold it into L03**: "Mom says / Grandma LEFT him / for her SISTER'S. / In the CART."
2. **Cut L06** ("Won't even get out for a CARROT."). The pig sitting in its cart in S05 says it.
3. **L10 → L11 rewrite.** He no longer sees Grandma at the crater:
   - L10: "Then the rail / STOPPED. / A CREEPER hole."
   - L11 (new): "I bridged it. / Lit the RAIL. / Something ROLLED."
   - Picture: past the crater, fog; a cart-shaped shadow starts moving. **Don't show who's in it.**
4. **Cut L12 and L13.** L13 is replaced by a picture with no line: evening, Grandpa at the buffer stop, a cart
   rolling in out of the fog.
5. **L14 stays as the payoff**, said as the cart stops: Grandma: "Sorry I'm LATE, / dear." **Cut 0.8 s after
   "dear."**
6. Set `"payoff": "L14"` and `"voice_takes": "beat"`.

**Result:** about 90 words, ~32 s. The question "why does he wait?" now holds to the last frame, and the pig is the
clue that lets a player guess before it.

## slow_falling: revise
**What's wrong:** "JUICE" at 8 s gives it away to any player. The real twist (Grandpa brews it, and she doesn't
know) gets told in L13 instead of shown.

**Fix (exact):**
1. **L03 rewrite:** "Grandpa packs her / LUNCH / for the trip." Then the juice bottle sits in the lunch basket in
   S03 (a picture clue, never named).
2. **Keep L04 and L05.** "It only goes UP." and "She was BORN to fly." are good plants.
3. **L06 stays:** "Every night / he brews TEA. / I'm not allowed ANY."
4. **Cut L08** (folded into L07: "I took ONE. / Next morning, / I rode up / BEHIND her.") and **cut L10**.
5. **L11 is the reveal, and it's the picture, not the line.** He drinks his "tea" and steps off. The game shows the
   item tooltip "Potion of Slow Falling" as he drinks, then the effect icon and the swirls as he floats down beside
   her. Put the tooltip text in the caption track. L11: "So I DRANK it, / and stepped OFF."
6. **Cut L12 and L13.** End on the two of them floating down side by side and Grandpa below, looking up. Cut 1 s
   after the float starts.
7. Set `"payoff": "L11"`.

**Result:** about 75 words, ~27 s. The one-sentence read is "Grandpa's tea is slow falling; she's been flying on
his potion for years." If the cold reader still calls the potion before 50 %, **kill it**: the story has no other
mystery.

## scarecrow: revise
**What works:**
- line 1 is a picture (a snow trail to a window);
- "a GROSS little GIFT" is a great misread;
- the biome is right: the High Meadow at ~0.75 lays snow, yet "It never SNOWS here", which is the bible's own note.

**Fix (exact):**
1. **Cut L11** ("It wasn't STARING at me. It was keeping an EYE OUT for me."). It explains what the picture already
   shows.
2. **L10 keeps its line, then the camera tilts down.** "The scarecrow / was GONE." is the last line. Then, with no
   line, the tilt down to the wall: the snow golem holding the line, snowballs knocking zombies off his wall, and
   the golem looking up at him.
3. **Cut on the golem looking up**, ~1 s after the first snowball hits.
4. **Cut L04** ("EVERY night, I hear GROANING. I don't LOOK."), and fold the groaning into L03's sound bed. Or
   shorten L04 to "EVERY night, / GROANING."
5. **L07 trim:** "He SAID / he'd keep an EYE / on me." Cut "Kind of CREEPY now": the shot sells it.
6. Set `"payoff": "S11"` (the tilt) and `"voice_takes": "beat"`.

**Result:** about 95 words, ~33 s.

## goat_horn: revise (after the goat model)
**Engine first.** The goat isn't drawn (`docs/engine_features.md` "Mob coverage": goat is first in the to-build
list). STANDARDS 1.11 says the story decides and the engine follows: build the goat model, or the story can't be
made.

**Fix (exact):**
1. **L05 rewrite.** "IDA" is an unexplained name, which the owner banned ("Who is nico?"):
   "The girl NEXT DOOR / has a GOAT HORN. / A goat MISSED her. / Goats don't MISS."
2. **Cut L04** (Dad: "Two hundred THIRTEEN!") or keep it as Dad's one character line. Keep it: it's in his own
   voice and it's funny. **Cut L02** instead ("He lands in the LAKE. Climbs BACK up."), since the picture shows it.
3. **Cut L12** ("It was for ME. To CALL him.").
4. **L13 is the payoff:** "I BLASTED it. / Down the ROAD, / Dad TURNED." Cut on Dad turning and waving, ~1 s.
5. Set `"payoff": "L13"`.

**Result:** about 105 words, ~37 s.

## lantern_bay: revise
**What's wrong:** "It's a ROAD" plus "NOTHING's ever in the LIT part" plus "Grandpa dove to that SHIPWRECK" answers
"why lanterns?" at 55 %. The ending then answers a second question. The reveal also lives in small text ("FOR MAE")
and is explained aloud.

**Fix (exact):**
1. **L07 rewrite.** It hides where the road goes and why:
   "Grandpa went DIVING / one night. / He never / came BACK."
   Cut "to that SHIPWRECK" and "for Grandma's PRESENT".
2. **Cut L06** ("NOTHING'S ever in the LIT part. LUCKY water."). L05 ("With TRIDENTS in it.") plus the picture of
   the drowned staying in the dark is enough for a player.
3. **L11 rewrite:** "The last light / hit a SHIPWRECK. / And a CHEST."
4. **L12 becomes the payoff, in two parts.**
   - The chest screen, held 1.5 s, with its title **FOR MAE** in the caption track. Inside is a Heart of the Sea.
   - Then Grandma's one line, in her voice: **"He GOT there."**
   - This removes the narrator's "That's GRANDMA" (her reaction says who Mae is), and cuts 0.8 s after her line.
5. Set `"payoff": "L12"`.

**Result:** about 90 words, ~32 s. At the midpoint the viewer knows it's a road and Grandpa went missing, and can
guess "to find him" without being sure what's at the end.

## Order to build after the owner's voice pick
1. **scarecrow**: the smallest fix, and the strongest picture.
2. **broken_rail**
3. **lantern_bay**
4. **goat_horn**, after the goat model.
5. **slow_falling**, last, and only if the cold reader passes it.

## The five held finished stories (the lead's addition, 2026-11-10)
These are already voiced and rendered. "Cheap fix" means a re-cut, or a re-take of a single line. "Rework" means a new
script or a new recording.

| story | Q (3 s) | Mid | Cut | Fast | verdict |
|---|---|---|---|---|---|
| dog_hill (`claude/story-cine-2-render-story_dog_hill`) | pass: "why has the dog sat there 900 days?" | pass: Grandpa's "Said he'd be RIGHT BACK" (L10) at ~60 %, a guess that he's waiting for an owner who left | **fail**: L15 "Day ONE. AGAIN." comes after the picture already shows it (the owner cut this line by name) | borderline | **cheap fix (re-cut)** |
| thirty_one_raids | pass: "why does the village keep getting raided?" | pass: "started the night he came HOME" plus the "grey BOTTLES" he calls courage. Players think of the ominous bottle at ~55 %; non-players don't. | **fail**: L13 "Now they'll love YOU too, kid." explains after the raid starts. L10 has already said it. | ok | **cheap fix (re-cut)** |
| gold_for_the_portal | pass: "why does grandma throw gold into a portal?" | pass: the barter list (L03) tells players "piglins" early, but whether Grandpa is alive stays open, and the helmet (L04) is the fair plant | pass, **if** the render cuts within 1 s of the piglin in the blue-striped helmet stepping out (no "sent home" epilogue) | ok | **cheap fix (one line)** |
| good_boy | pass | **fail, too obvious**: SIT, raw porkchops, can't open a door. Every viewer calls "dog" by ~25 %. | fail: "GOOD boy" after the reveal (the owner's "wtf is the beat at the end") | fail: 19 lines, ~60 s, ellipses in L02/L07/L17 | **rework** (already held; canon plant 7: the man becomes Buh at 16) |
| light_sleeper | pass: the bar | pass: the shriek (L07) at ~44 % | **fail**: L15, then the death screen ~3 s after the warden rises | **fail**: 134 words, ~47 s spoken, ~58 s cut | **story pass; re-cut plus trims at the re-voice** |

The fixes:

- **dog_hill (re-cut).** Drop L15. The cut moves to 0.8 s after L14's "BACK", on the dog sitting back down facing the
  empty patch, with the chat "Buh left the game" on screen. That frame *is* line 1 again, so the loop is shown, not
  said. Set `"payoff": "L14"`.
  - Optional, still a re-cut: drop L07 ("I tried to make him STAND...") to tighten the middle.
- **thirty_one_raids (re-cut).** Drop L13. End ~1 s after L12, on the raid horn and the "Raid" bar rising over the
  gate with Grandpa turning to see the boy. Set `"payoff": "L12"`.
  - The owner's note on L05's "throw him BREAD": that's vanilla (Hero of the Village gifts). Keep it.
- **gold_for_the_portal (one line).** The owner asked "Who is nico?" about L08, so **re-take L08 in Grandma's voice
  as "Just ONE, sweetie. / One's PLENTY."** Never splice the name out inside the take (STANDARDS voice 5).
  - Then check the render: the end must be ≤1 s after the helmet's blue stripe reads, with no epilogue on screen.
- **good_boy (rework).** It's already held for the canon rework. Under the mystery test, the clues must stop naming
  the answer:
  - cut SIT, the door and "GOOD boy";
  - keep the 12-block teleport (L02) and the skeletons running (L13) as the only dog clues;
  - end on the game (the wolf's collar, or the "Sit" when the zombie dies).
  - Aim for ≤ 30 s.
- **light_sleeper (story pass).** The story is the bar; what's off is the delivery (the hush and the "..."
  pauses). It gets re-voiced anyway when the owner picks the new narrator. At that re-voice:
  - **cut the ending to the warden**: end ~1 s after it rises out of the square, on the roar. Drop L15 ("I'd never
    DANCED before.") and the 3 s death-screen hold, so the warden is the last frame;
  - **trim to ~100 words**:
    - cut L03 (the sheep);
    - cut L12 ("The fox screamed AGAIN. I didn't CARE.");
    - merge L09-L10 into "A skeleton shot a CREEPER. / It dropped / a music DISC. / Nobody here / has heard / a SONG.";
  - **remove every "..."** from `say` (L01, L06, L07, L11; STANDARDS 1.7);
  - set `"payoff"` to the warden shot.
  - That gives ~36 s, the same story.
