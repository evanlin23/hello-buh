# Critic, batch 4 (blocky-adapted), pitch mode, 2026-11-12

Rubric: story_craft 1 (premise test, 0-2 each; item 1 read as "one frame shows the fact", item 2 as "breaks a rule
the viewer knows from life or the game", per 0x), story_format.md, STANDARDS 0w/0x/0y/0z/0a/5a, the kill-on-sight
list. Originality checked against stories/*/story.json, canon.md timeline, batch 2/3 pitches (claude/batch3-*),
docs/pitches/*, and blocky's 22 published titles.

## Ranked table

| # | id | premise (img/rule/q/count/changes) | twist | orig | build | fit | blockers | verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | A Statue Gets Younger | 8 (1/2/2/1/2) | 8 | 7 | 7 | 8 | L1 is 31 words (not one breath), no number in L1; no "goes to look" climax on the card; clue 4's "sick or scared" breaks 0a | **develop** |
| 2 | H Sorry, Dear | 9 (2/2/1/2/2) | 7 | 7 | 6 | 6 | L1 answers itself, then "I had to know why" (why WHAT?); no loved one really at stake; 0.3-scale actor not in renderer | **develop** (must-fixes first) |
| 3 | C My Brother's Bell | 7 (1/1/2/1/2) | 6 | 7 | 5 | 6 | casual reader RIGHT at 60 %, not surprised (too obvious); the twist needs a second invented rule (the clapper "knows you"): two steps; a collar bell and a clapper are unreadable at 300 px | **park** |
| 4 | E Every Door but His | 6 (1/1/2/0/2) | 6 | 6 | 6 | 6 | why-interrogation fails: if Grandpa locks every door, the kid's own door is locked and the kid can't get out; mud by the kid's bed contradicts Grandpa leading him in; the hero is asleep (no agency); no number | **park** |
| 5 | I Mm. Lovely. | 9 (2/2/2/2/1) | 5 | 4 | 6 | 5 | nobody loved at stake (a pie); gamer right at 65 %, not surprised; the "Mm. Lovely." in unison clue hands it over; engine sits next to blocky's published "My Uncle NEVER Lies. He's Covered" (a visible marker of untruth on a relative), twist is the old couple's-white-lie anecdote | **park** (low) |
| 6 | G My Compass Points Home | 7 (1/2/2/0/2) | 5 | 4 | 7 | 5 | the plot is Jack Sparrow's compass plus "home is a person"; our own Spawn Room pitch already has "Compasses point HOME, kid"; casual found the end "a bit arbitrary"; no number; clue 5 ("the only honest one") hints | **kill** |
| 7 | D Never Face the Wall | 6 (1/1/2/0/2) | 5 | 5 | 9 | 5 | no impossible fact, no number; the reveal adds a rule never shown ("you only face the wall when you're sad"): fair-play fail; both readers right; "something sat down behind me" makes the kid afraid before the reveal (0a) | **kill** |
| 8 | B The Bell Under the Village | 9 (1/2/2/2/2) | 4 | 3 | 6 | 5 | "Nobody rings the bell" is The Bell in the Window's reveal word for word (Saltmouth 3800, scripted on claude/script-bell-window); "a thing under the village" is Light Sleeper's; the climax (ring it from the top so "its own call drags the stairs the other way") is incoherent; the creature is never introduced | **kill** |
| 9 | F My Birthday, Five Times | 7 (1/2/2/2/0) | 4 | 1 | 7 | 2 | the repeating birthday is an owner example story: kill on sight (story_craft 1, stories.md premise bank); L1 states a world rule the reveal says is false (the gamer's "cheat") | **kill** |

## Per card: why, and the exact fix

**A. The Statue Gets Younger (develop).** Twist 8: one step (the gift can be taken back), L1 flips from magic to a
love story, casual reader wrong at midpoint then explains it. Orig 7: the "immortal chooses to age with the mortal"
plot is Arwen / Tuck Everlasting, but nothing in our catalogue, and it's parents, not another grandparent pair.
Build 7: a block statue face with wrinkle lines removed per shot is a set change; villagers have no hair, so Mom and
Dad must be player actors with two new grey-hair skins (scripts/make_story_skins.py). Fit 8: serious, warm, a mystery.
Fixes: (1) L1: "In my village, nobody gets old except the statue. And it's getting YOUNGER." L2: "One wrinkle a day.
Nobody will tell me why." (2) Add the climax: the kid follows Mom out before sunrise; the reveal plays over Mom's hand
on the statue and a wrinkle line going dark on the stone while she turns, one grey streak more. (3) Clue 4 bright,
not scared: "She hid it under her hat. I think she's embarrassed." (4) Bench sting and "And the statue's getting
younger." count as the one beat; cut on it.

**H. Sorry, Dear (develop after fixes).** Premise image 10/10 (a mug-sized aunt on a dining chair). Twist 7: one
step ("sorry" is a gloat), funny on rewatch. Fit 6: comedy is allowed (0x) but the format blocker "someone loved at
stake" is thin. Build 6: renderer/entities.js has no entity scale; a 0.3-scale player actor is a new feature (~1-2 h),
and cards are unreadable at 300 px. Fixes: (1) L1: "In my village, every SORRY shrinks you an inch. My aunt is the
size of a MUG." L2: "She's the nicest lady alive. So why won't she STOP saying it?" (2) Stakes: "One more inch and
she fits in a TEACUP." (3) Climax, the kid acts on the misreading: "So this Sunday I played to WIN, so she'd have
nothing to be sorry for." She lays down her hand, grins, "Oh, sorry, dear," shrinks. (4) Reveal: "She wasn't sorry.
She was WINNING." Sting as carded. (5) Show the score as a big emerald pile on her side of the table, not cards.

**C. My Brother's Bell (park).** Fix: drop the clapper and its extra rule. They swapped bells as babies: the brother
wears the kid's bell and takes the blame. Reveal: "He'd been wearing MY bell. Since I was a baby." Cut clue 2 (it
points straight at the kid) for a decoy. Make the bells cowbell-sized on cords. L1 to one breath: "In my village,
your bell rings before every mistake. Mine has NEVER rung." Re-gate with two fresh readers.

**E. Every Door but His (park).** Fix the logic and give the kid agency: L1 "In my village, every door is locked at
night. Grandpa's has stood OPEN for ninety nights. Nobody will tell me why." Cut "Grandpa locks every door". Climax:
the kid ties a string from his door handle to his bed to catch whoever tries it; he wakes on Grandpa's porch, the
string round his own ankle. Reveal: "The string was tied to MY ankle. I'd been walking to Grandpa's in my sleep."
Re-gate.

**I. Mm. Lovely. (park, low).** Needs real stakes and a fresh engine: as carded it deflates (the secret is a pie)
and borders on blocky's published lie-tag Short. Only revisit with a glow that costs something on screen and a twist
that isn't the couple's-white-lie anecdote; otherwise drop.

**G, D, B, F (kill).** Bank B's image (a cellar that is 13 stairs, then 26) for a different twist; nothing else.

## Top 3, and what would make them as good as runaway
1. **A:** a hook frame as strong as fleeing villagers: open on the giant stone face beside a hamlet with one grey
   head in it, so the wrongness reads muted by 2 s, and let the reveal be watched (Mom's hand, the wrinkle moving).
2. **H:** give the kid a want that backfires (playing to win to save her), so the reveal comes from his own try,
   as the party does in runaway.
3. **C:** one invented rule only, and a reveal picture (his collar holding the kid's bell) the viewer sees before
   the line says it.
