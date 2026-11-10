# Story pitches, 2026-11-10 (first run of /story-write)

Ten original premises, scored with the premise test and the `story-critic` rubric (`.claude/agents/story-critic.md`,
pitch mode), then the top 3 developed to a logline, cast, beat sheet and clue map. None is claimed yet: claim one in
`docs/stories.md`'s premise bank before building, and run the rest of `/story-write` (script, shots, bible, table read).

**How this was scored.** This run had no way to spawn a separate critic agent, so the writer applied the critic's
rubric and calibration (runaway = the bar) and scored strictly; the next run should hand the table to a fresh
`story-critic`. Originality was checked against every story on main and the `claude/story-*` and `agent/*` branches
(runaway, respawn_tax, put_back, same_spot, sign_by_bed, nitwit, sheep_stares, torch, chunk_next_door, sun_wont_set,
respawn_voice, one_block_higher, one_more_eye, more_golems), the premise bank, and blocky-stories' made list.
Buildability was checked against `renderer/entity_models.json` (phantoms, cats, allays, snow golems, minecarts, zombie
villagers, iron golems all render) and `docs/lessons.md` (beds, chests, signs render).

## The ten

Premise test columns (0-2 each): **Img** one image, **Rule** breaks a rule the viewer knows, **Q** the question asks
itself, **#** countable, **Ans** the answer changes the picture. Then 1-10: **Tw** twist, **Orig** originality,
**Bld** buildability, **Fit** owner fit.

| # | premise | the image / the "why tf" question | Img | Rule | Q | # | Ans | test | Tw | Orig | Bld | Fit | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **The Wall Grows** | A stone wall 40 blocks high around a small village, no gate; an old mason adds a block every morning. *"why tf is the village wall 40 blocks high with no gate?"* | 2 | 2 | 2 | 2 | 2 | **10** | 9 | 8 | 6 | 9 | **develop** |
| 2 | **The Golem Facing In** | The iron golem standing in my front doorway for 9 days, its back to the street. *"why tf is the golem guarding my house from the inside?"* | 2 | 2 | 2 | 2 | 2 | **10** | 7 | 6 | 8 | 8 | **develop** (fix the overlap below) |
| 3 | **Phantoms Over Our Roof** | Phantoms circling one house in the night sky, a black cat on its roof staring them down. *"why tf do phantoms only circle OUR house?"* | 2 | 2 | 2 | 2 | 1 | **9** | 7 | 8 | 7 | 8 | **develop** |
| 4 | **The Bridge From the Sky** | A one-block bridge hanging down from the clouds over the village, one block longer each morning. *"who tf is building down from the sky?"* | 2 | 2 | 2 | 2 | 1 | 9 | 5 | 8 | 6 | 7 | park: the twist (a skyblock player bridging for years, villagers breaking the bottom block) borrows #1's "players are the threat"; find its own turn |
| 5 | **Her Bed Is in My House** | The librarian walking into my house's wall at dusk, again and again, for 700 nights. *"why tf does she walk into my wall every night?"* | 2 | 1 | 2 | 2 | 2 | 9 | 6 | 8 | 8 | 7 | park: vanilla-true (villagers path to their claimed bed) and warm, but small; the reveal (I built over her house and sleep in her bed) is a shrug, not a gasp |
| 6 | **The Allay's Deliveries** | A little blue allay dropping one item on my doorstep every morning for 31 days. *"why tf does this allay keep bringing ME stuff?"* | 2 | 2 | 2 | 2 | 1 | 9 | 5 | 9 | 7 | 7 | park: the vanilla rules (an allay collects items matching the one it holds, and delivers to its player or a played note block) fight the story; it needs a twist that the mechanics give for free |
| 7 | **The Diamond in the Kitchen** | A diamond ore block in the kitchen wall that nobody in the family will mine. *"why tf won't anyone mine the diamond in our kitchen?"* | 2 | 2 | 2 | 1 | 1 | 8 | 4 | 7 | 9 | 6 | kill: the fair clue is great (diamond ore never generates above ground: someone carried it with Silk Touch) but every twist we found was a family tradition, not a turn |
| 8 | **The Snow Golem in the Desert** | A snow golem in the desert at noon, 90 carved pumpkins piled behind a dune. *"why tf is there a snowman in the desert?"* | 2 | 2 | 2 | 2 | 0 | 8 | 4 | 7 | 7 | 6 | kill: the best answer ("someone rebuilds it every dawn for someone who needs to see it") is a famous short story's engine and plot |
| 9 | **The Parrot That Groans** | My parrot making zombie groans at grandpa every morning (parrots imitate nearby hostile mobs). *"why tf does my parrot groan at grandpa?"* | 1 | 2 | 2 | 1 | 2 | 8 | 5 | 5 | 8 | 7 | kill: the hook is a sound, not a picture; and "a family member is a zombie villager" is #2 (and chunk_next_door) again |
| 10 | **The Empty Block in the Field** | One bare block in grandpa's perfect 30 x 30 wheat field, for 50 years. *"why tf is one block empty?"* | 2 | 1 | 1 | 2 | 0 | 6 | 3 | 7 | 9 | 5 | kill: no answer we found changes the picture |

Also considered and dropped before the table: a brother who wears a carved pumpkin for years (it lets you look at
endermen safely: too close to `put_back`'s enderman eye contact), a zombie that wears Dad's helmet so it doesn't burn
(a third zombie-family story), a second player standing on a hill (Herobrine territory).

**Critic notes on the field.** The table's strongest pattern is a vanilla rule turned into a clue (#1 minecarts and
trading halls, #2 the zombie-villager cure, #3 phantoms come to the sleepless and cats scare them). That's our edge
over animated story channels: a Minecraft player feels the twist is fair because they already knew the rule. Three
pitches (#2, #9, and the dropped helmet idea) reached for zombie villagers; `chunk_next_door` already used "the
zombie villager is someone we know", so only one of them can be made, and only with its own turn (#2's is the cure,
not the identity).

---

## Top 3

### 1. The Wall Grows (`wall_grows`)

**Logline.** A villager boy climbs the 40-block wall the old mason adds to every morning, and finds out it was never
meant for zombies.

**Why it's the pick.** The one image (a wall that dwarfs the village) breaks a rule every player knows (villages have
no walls, and zombies can't climb one block), so the question asks itself. The twist turns line 1 over completely:
the wall isn't keeping monsters out, it's keeping *players* out, and the viewer is a player. Every clue is something
players really do (light everything with torches, mine a block to look in, move villagers by minecart, lock them in
trading halls). The attentive player calls it at the minecart, about 8 s before the reveal: the Hitchcock bomb. It
also answers "the sets are all so small" by being a big set by design. Against runaway: equal on image and twist,
and it adds two acted voices; weaker on sympathy (we need to like the boy and Tomas fast).

**Cast.**
| id | who | voice | profile |
|---|---|---|---|
| N | me, a villager boy (POV until the top of the wall) | Iapetus (clear) | a boy telling a secret he shouldn't know; hushed, curious, steady; speeds up when excited |
| Tomas | the old mason who builds the wall | Algenib (gravelly) | old, slow, kind but closed; never looks up from the wall; every line is short |
| (the player) | a player on the far side | no voice | a default player skin, seen at the end only |
One Gemini request: `{N: Iapetus, Tomas: Algenib}`, scene: "A walled village at dawn; a boy talks with the old mason
who builds the wall."

**Beat sheet** (about 140 words, 48-52 s).
| t | line (draft) | picture | plants |
|---|---|---|---|
| 0-3 | N: "The wall around my village is FORTY blocks high. / Tomas adds ONE more / every MORNING." | EWS from inside: roofs, a well, fields, and the wall rising over all of it to the clouds; tiny Tomas on scaffolding placing a block | the count; the wall's scale |
| 3-7 | N: "Zombies can't climb / ONE block. / It's been high enough / since before I was BORN." | WS at night: a zombie bumping the wall's foot, uselessly | the wall isn't for zombies (the question sharpens) |
| 7-11 | N: "There's no GATE. / Nobody has EVER / been outside." | WS: kids playing tag in the wall's long shadow | no gate |
| 11-16 | N: "I asked him / what's OUT there." Tomas: "Nothing we want / to TRADE with." | MS: Tomas on the scaffold, trowelling (placing), not turning | *trade* (misread as a grumpy joke) |
| 16-20 | N: "At NIGHT, / something walks / along the TOP, / placing TORCHES." | WS from the square: torch after torch appearing along the rim against the stars | players light everything |
| 20-24 | N: "Once a block / up there / just... VANISHED. / Tomas had it back / by NOON." | ECU-to-WS: a single hole in the rim with daylight through it; Tomas climbing | players mine a block to look in |
| 24-29 | N: "Tomas came / from OUTSIDE. / He still FLINCHES / at the sound / of a MINECART." | MS: an empty minecart rolling on a short rail by the farm; Tomas freezing mid-placement | villagers are moved by minecart (**the attentive player gets ahead here**) |
| 29-33 | N: "So last night / I climbed / the SCAFFOLDING. / All FORTY blocks." | POV climbing, the village shrinking below; dawn | the want and the try |
| 33-37 | N: "The world out there / wasn't EMPTY." | EWS over the rim: plains to the fog and, in the middle, a huge glass-and-stone hall with a rail running into it | |
| 37-42 | N: "A HUNDRED villagers. / Each in a box / ONE block WIDE. / Trading. / FOREVER." | push-in on the hall: rows of 1x1 cells, a villager in each, a workstation in front | the reveal, shown |
| 42-46 | N: "And someone / in there / looked UP." | the player at the hall's door turns and looks up at the wall | the threat is now |
| 46-49 | Tomas (below, gently): "Come DOWN, kid. / Add your BLOCK." | WS from the top: Tomas far below holding up one stone block | loops into L01 (one more every morning) |

**Clue map.** trade (16 s, misread as grumpiness) / torches on the rim (18 s, misread as "something") / the vanished
block (22 s, misread as weather or zombies) / the minecart flinch (27 s, misread as an old man's nerves) / no gate
(9 s: players don't need gates). After the twist each one is a player's habit.

**Set and shots.** A real valley site; the wall built with `/fill` in stone bricks, mossy and cracked low down,
cleaner and newer near the top (40 rows of history, readable in a wide); a village of 10+ houses with fields and
paths inside; outside, a trading hall about 40 x 15 with glass cells and a rail. Establishing shots: inside (L01) and
outside (L09). Close-ups only on the hole (L06) and the cells (L10).

**Risks the critic flagged.** Talking villagers are a style choice: keep Tomas to two lines. The player at the end must
read as a player (a default skin, holding a minecart or an emerald), not as a villain with a weapon. Make sure the
boy is likeable by 10 s (one small warm moment: Tomas lets him place a block?).

### 2. The Golem Facing In (`golem_inside`)

**Logline.** The iron golem has stood in a boy's front door for nine days, facing into the house, and his mom only
talks to him through the window after dark.

**Why it's here.** The image is clean and very Minecraft (golems wander, they don't guard doors), the second beat
raises it at once ("It's not facing OUT. It's facing IN."), Mom's voice lines carry the clues as subtext, and the
ending is a vanilla mechanic every player respects: curing a zombie villager with a splash potion of Weakness and a
golden apple. It's the warmest of the three and gives Mom a real performance. Fixes before it can be made: the
identity reveal must not be the twist (chunk_next_door did "the zombie villager is someone we know"); the turn is the
*cure*: the golem wasn't guarding the village from Mom, it was guarding Mom *for* the boy until he could save her.

**Cast.**
| id | who | voice | profile |
|---|---|---|---|
| N | me, a teenage boy (POV) | Charon (informative) | steady, private, holding it together; cracks once |
| Mom | my mom, behind the window | Sulafat (warm) | too cheerful, answers with questions, a rasp under it that grows; healed at the end, the rasp gone |
One request `{N: Charon, Mom: Sulafat}`, scene: "Night, a village; a boy talks to his mother through a window."

**Beat sheet** (about 135 words, 47-52 s).
| t | line (draft) | picture | plants |
|---|---|---|---|
| 0-3 | N: "The IRON GOLEM / has stood in / my front DOOR / for NINE days." | WS from the street at dusk: our house, the golem filling the doorway, its back to us | count, image |
| 3-6 | N: "It's not facing OUT. / It's facing IN." | slow push past the golem's shoulder into the dark room | the question sharpens |
| 6-11 | N: "Mom talks to me / through the WINDOW. / Only after DARK." Mom: "Are you EATING, / sweetie?" | MS: the window lit by a lantern inside, Mom's silhouette, her face in shadow | night only; she deflects |
| 11-15 | N: "Since the RAID, / the neighbors / moved their beds / to the FAR side." | WS: villagers dragging (placing) beds into houses across the square | they're afraid of my house |
| 15-20 | Mom: "Don't stand / so CLOSE / to the glass, / love." | CU on the glass: her hand on it, the sleeve green-grey | she keeps him away (misread: worry) |
| 20-25 | N: "This morning / the sun / came up early. / She STEPPED BACK / like it BURNED." | WS dawn: the light reaches the window; she jerks back into the dark | zombies burn in sunlight (**gets ahead here**) |
| 25-30 | N: "The cleric / says the same thing / every day. / A GOLDEN APPLE. / And WEAKNESS." | MS: the cleric at his stand, holding up a splash potion | the cure, spelled out for players |
| 30-34 | N: "Gold takes / a LONG time / to find. / NINE days." | quick WS cuts: a cave, a branch mine, eight ingots crafted around an apple | the try |
| 34-38 | N: "The golem / stepped ASIDE." | WS: the golem moves out of the doorway for the first time | the reveal starts |
| 38-43 | (no line; the splash, red particles, a zombie villager shaking in the lantern light) | MS, then the cure's shake; a time cut | the game shows it |
| 43-47 | Mom (clear, the rasp gone): "You look THIN, / sweetie." | MS: Mom, a farmer again, in daylight at the open door | loop by cause and effect: nine days of the golem |
| 47-49 | (the golem holds out a poppy) | WS | vanilla: golems offer poppies |

**Clue map.** night only (8 s, misread as Mom being "sick") / the neighbors' beds (13 s) / "don't stand so close to the
glass" (17 s, misread as worry) / the sleeve's colour (18 s, a picture plant) / the sun (22 s) / the cleric's
ingredients (27 s). The twist line 1 now means: the golem was keeping her safe in there, not keeping us safe from
her.

**Risks.** In vanilla an iron golem attacks a zombie villager on sight: a golem that stands still in the doorway is
un-vanilla, and `minecraft-audit` will flag it unless the story makes it read as deliberate (the cleric asked it to
wait; it never takes its eyes off her). The cure is long in vanilla: show it with one time cut, and keep the shaking visible. No peril to the
boy on screen. Kept warm, not sad (blocky's data: sad and dark did worst).

### 3. Phantoms Over Our Roof (`phantom_roof`)

**Logline.** Phantoms have circled one house in the village for 300 nights, and the boy who lives there sleeps fine
every night, so whose sleeplessness are they hunting?

**Why it's here.** A beautiful, cinematic night image (a slow ring of phantoms over one roof, a cat staring them down)
with a mechanic every player knows (phantoms come for players who haven't slept in three nights; cats scare them),
taught plainly in line 3, so the mystery is a fair whodunit with three suspects in one house. The answer recasts the
picture: the phantoms are the count of Dad's sleepless nights since the raid, and the cat is Dad's. The want is active
(the boy stays up to catch whoever it is), and the ending is a choice. Weakest of the three on "the answer changes the
picture" (it explains it more than inverts it), so the critic scored it 9 on the test.

**Cast.**
| id | who | voice | profile |
|---|---|---|---|
| N | me, a boy of about 12 (POV) | Iapetus (clear) | curious, a detective's pride, softening at the end |
| Dad | my dad | Alnilam (firm) | exhausted, hoarse, gentle; never turns from the window |
| Mom | my mom (one line) | Sulafat (warm) | covering for him, lightly |
Two requests: `{N, Dad}` and `{N, Mom}` (or give Mom's line to the narrator as reported speech and use one request).

**Beat sheet** (about 140 words, 48-52 s).
| t | line (draft) | picture | plants |
|---|---|---|---|
| 0-4 | N: "For THREE HUNDRED nights, / PHANTOMS have circled / ONE house / in my village. / OURS." | EWS night: the village under the moon, a slow ring of phantoms over one roof only | count, image |
| 4-8 | N: "And every night, / a black CAT / sits on the roof / and STARES them down." | WS: the cat on the ridge, phantoms veering away | cats scare phantoms |
| 8-12 | N: "Phantoms only come / for people / who don't SLEEP. / Everybody KNOWS that." | WS: a lit window elsewhere going dark, the sky over it empty | the rule, taught |
| 12-16 | N: "I sleep / EVERY night. / Mom sleeps / like a ROCK." | MS: Mom asleep; my bed | two suspects cleared |
| 16-21 | N: "Dad leaves / for the mine / before I WAKE. / He's home / after I'm in BED." | WS morning: Dad's pickaxe gone from its hook, the door open | the third suspect is never seen sleeping |
| 21-24 | N: "His bed / is always / MADE." | MS: a neat bed, the blanket never touched | (**gets ahead here**) |
| 24-28 | Mom: "Your father's / just BUSY, / love." | MS: Mom at the stove, not meeting my eyes | subtext |
| 28-31 | N: "And the CROSSBOW / over the fireplace / has been GONE / since the RAID." | CU: two empty hooks | the raid; the weapon |
| 31-35 | N: "So last night / I stayed UP / to catch whoever / they're HUNTING." | POV at the bedroom window, phantoms passing | the want and the try |
| 35-39 | N: "The cat / came IN / through the roof. / I followed it / UP." | the cat drops through a gap into the attic; POV up the ladder | |
| 39-44 | (reveal) N: "Dad?" Dad (not turning, hoarse): "Go to bed, kid. / Somebody has to WATCH." | WS attic: Dad at the small window, crossbow on his knees, eyes open on the dark road the raiders came by; the cat at his feet | the game's rule + the picture |
| 44-47 | N: "He hasn't SLEPT / since the RAID." | MS: his face in moonlight | |
| 47-50 | N: "So tonight, / I'm not sleeping / EITHER." | EWS: the ring of phantoms, and a second cat climbing onto the roof | loops into L01 (and the count goes on) |

**Clue map.** the rule (10 s) / Dad never seen in bed (18 s) / the made bed (22 s) / Mom covering (26 s) / the missing
crossbow (29 s). Fair: a player can solve it from the rule plus who we never see asleep.

**Risks.** Night scenes must read on a phone (moonlight, lanterns, the grade). The raid stays one word of backstory, no
detail. "Phantoms come for anyone who hasn't slept" extends a player-only mechanic to villagers' world: say it as the
world's rule in line 3 so it's fair.

---

## Next
- Claim one in `docs/stories.md` and run `/story-write` steps 4-6 on it (story.json v2, shots, `bible.md`, the table
  read with a fresh `story-critic`, `story-continuity` and a cold reader).
- Parked #4-#6 are open to any worker who finds the twist the critic asked for.
