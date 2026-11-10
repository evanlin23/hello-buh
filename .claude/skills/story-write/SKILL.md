---
name: story-write
description: The writers' room for a HelloBuh story Short - pitch 10 premises, score them with the premise test, pick one, beat sheet, script with a voiced cast and acting direction (story.json v2), shot list and continuity bible, then a table read with a cold reader, the story-critic and story-continuity. Use before building any new story, when asked to write, pitch or fix a story, and when the owner's feedback is about the plot, the twist or the delivery.
---

# The writers' room

Owner, 2026-11-10: "i kinda want the stories to be good too. How can we do these stories?" This is how. It ends with a
script that is ready to voice and build, and it costs no renders. A story that fails here costs minutes; a story that
fails after the build costs a day of review rounds.

**Read first** (in this order, nothing else unless a step needs it):
1. `docs/stories.md`: the house rules and every owner quote (they outrank everything), the premise bank, the formats.
2. `docs/story_craft.md`: the premise test, the beat structure, the twist checklist, casting and directing voices,
   story.json v2, the continuity bible, shot sizes, set scale, and why runaway works.
3. The `premise` and `twist` of every story made or claimed, so yours is different:
   ```bash
   for f in stories/*/story.json; do python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(d['name'],'|',d.get('premise','')[:160],'|',d.get('twist',d.get('answer',''))[:160])" "$f"; done
   git branch -r | grep -E 'story|cinematic'     # stories on worker branches: git show <branch>:stories/<name>/story.json
   ```
   Also the premise bank table in `docs/stories.md` and any `docs/story_pitches_*.md`.

4. **The shared world** (owner, 2026-11-10: "wouldnt the lore be crazy if all of the sets were the same world"):
   `docs/world/canon.md` (places, the timeline, recurring characters, the links, the easter-egg rules) and
   `node scripts/world.js list` (every place, every story's day). Every story happens in this one world.

Scratch files go in the scratchpad, never the repo. The deliverables go in `stories/<name>/`.

## 1. Pitch ten (Pixar #12: discount the first five ideas)

Write 10 premises in one table. Columns: **image** (one frame a painter could paint), **why-tf question** (the
viewer's words, under 12 words), **count**, **the vanilla rule it breaks or uses**, **engine** (the mechanism:
`blocky-stories/docs/research/premise-engines.md` lists 30; borrow engines, never works), **twist** (one sentence),
**place**, **cast** (who speaks).
- Vary them: no two share an engine, a place or a twist shape; at most two use "the narrator is not who you think".
- Minecraft-native first: the best twists are a game rule a player already knows (creepers hiss, zombies keep the
  items they pick up, golems guard villagers, phantoms come to players who don't sleep, cats scare phantoms,
  name-tagged mobs never despawn, a zombie villager can be cured).
- Check buildability: every mob and block the image needs renders (`renderer/entity_models.json`,
  `docs/lessons.md`: beds, chests and signs render; banners, heads, pots and shulker boxes don't).
- Banned: coma/dream/simulation twists, a door to the past, the owner's example stories, near-copies of anything made.
- **Pitch inside the world** (docs/world/canon.md): each pitch names its **place** (an existing one from
  docs/world/map.json, or a new one in an empty part of the map, with the region it's in) and its **day** on the
  world timeline, and checks the canon's facts for that place and day (who lives there, what has already happened
  there, the Long Day, who is dead or gone). A pitch that contradicts a published Short is killed or moved.
- **Stands alone first:** the pitch must work for a viewer who has seen nothing else. A link to another story is a
  bonus a fan notices, never a step the plot needs (the critic checks this with the cold reader).

## 2. Score them

Spawn the `story-critic` agent in **pitch mode** on the table (or apply `docs/story_craft.md` section 1 yourself if no
agents are available, then have a fresh agent check your top pick). Keep only premises at **8/10 or more on the
premise test**. Pick the best one; keep the runners-up in the pitch file for later workers.

## 3. Spine and beat sheet

Write the ending first (the reveal frame), then:
- The **spine** in four sentences (Every day... One day... Because of that... Until finally...).
- The **beat sheet** on `docs/story_craft.md` section 2's clock: each beat with its time, its picture, its line, and
  the clue it plants. Mark the second where the attentive viewer gets ahead of the narrator.
- The **clue map**: every clue, where it's planted (line and shot), how it's misread, what it means after the twist.
  At least two clues for the twist, at least one in the picture.
- **One easter egg** (docs/world/canon.md "Easter eggs"): a cameo from another story placed in the background of one
  shot (the dog on his hill on the skyline, the boxed bell, the totem wall, the empty boat, the HelloBuh graves...),
  true to the canon on this story's day, never named in a line and never needed to follow the story. Write it into
  the bible's Props table with its shot, and into map.json `stories.<name>.cameos` so world.build builds it.

## 4. The script (stories/<name>/story.json, version 2)

**The deliverable is story.json itself, committed on your branch** (lead, 2026-11-10: the writers' fixed scripts lived
only in `stories/<name>/script_vNext.md` while story.json kept the old lines; voicing would have voiced the wrong
script). Draft in markdown if it helps, but every revision round ends with the lines written into story.json (`text`,
`say`, `who`, `direction`) and committed after the markdown. A `script*.md` is notes only: `./hb check` warns and
`./hb voice` refuses (without `--force`) while a script*.md is newer than story.json and its last table's lines differ.

- Lines in the house format (` / ` chunks of 2-3 words, CAPS key words), about 90-120 spoken words for 35-45 s
  (story_runaway, the owner's benchmark, is 36.5 s; `./hb pace` warns over 45 s; story_good_boy's 19 lines ran 60 s).
- `"payoff": "<line id>"`: the line the twist lands on (the reveal). `./hb pace` checks a sound hit and a picture change
  on it and that the Short ends ≤1 s after it, so no line after the payoff (put a button line before it).
- The cast block: the narrator plus 1-3 speaking characters, each with a Gemini voice cast for contrast, a caption
  colour and a short audio profile (`docs/story_craft.md` section 5 has the palette).
- `who` on every character line; `say` where the spoken text needs tags or differs from the caption; `direction` on
  any line whose delivery matters (an emotion and one rhythmic moment, never quoting the line's words).
- `requests`: group the speakers into Gemini requests of at most 2 speakers (the narrator with one character per
  request), as few requests as possible (the free tier allows a few a day).
- `premise`, `twist`, `logline`, `question`, `caption` (the top-band hook, under 45 characters, one emoji), `key_color`.
- `mood` (the score: `eerie` / `tense` / `sad` / `funny` / `heroic`, or `[before, after]` when the twist changes the
  colour, e.g. `["tense", "sad"]`) and `payoff` (the line id or mark the twist lands on: the music drops out 0.45 s
  before it and the hit lands on it). docs/audio.md.
- Run the twist checklist (`docs/story_craft.md` section 3) and the agency rule (no accident without a visible cause).
- Word count and a rough length: `python3 -c "import json,re,sys;d=json.load(open(sys.argv[1]));w=sum(len(re.sub(r'[/]',' ',l.get('say',l['text'])).split()) for l in d['lines']);print(w,'words, ~',round(w/2.8),'s + pauses')" stories/<name>/story.json`

## 5. Shot list and continuity bible

- `shots` in story.json: one per line at least, each with `place`, `size`, `camera` and `frame` (foreground, subject,
  background). An establishing shot (EWS/WS) for every new place; WS by default; close-ups only for reveals and at
  most one in four shots; the size changes at every cut (`docs/story_craft.md` section 8).
- `stories/<name>/bible.md` from the template in `docs/story_craft.md` section 7: time of day per scene, places, cast and
  costume, props and their states, positions and screen direction, what the narrator holds, who knows what, the clue
  map. Every number the script says matches what the picture will show.
- The set plan in the bible's Places table: the site (natural terrain, not a clearing), its scale, what fills each
  establishing shot out to the fog (`docs/story_craft.md` section 9).
- **The place in the map:** use the canonical place's coordinates and pieces (docs/world/map.json), or claim a new
  place: `node scripts/world.js claim <key> --name "..." --at x,y,z --footprint x0,z0,x1,z1 --story <name> --day N`
  (read the ground y off out/world/world_map_hub.png / the survey grid), then add its pieces and stamps with
  canonical x, y, z. Commit and push the claim on its own, like a premise claim, before building.
- **Canon facts the story creates** (a death, a building, a character who leaves): add them to docs/world/canon.md
  (the place's row, the timeline, a character) in the same commit as the script; they bind every later story.

## 6. The table read (max 2 rounds)

Run these three independently (in parallel if you can spawn agents):
1. **Cold reader**: a fresh agent given ONLY the spoken lines in order (with speaker names), nothing else. It answers:
   what happened, what the twist means, who each person is to the narrator, the moment it guessed the twist (if it
   did), and the comment it would leave. Fail if it can't say what happened in two sentences or gets a relationship
   wrong.
2. **`story-critic`** in **script mode**: scores against runaway; verdict approve / revise / kill.
3. **`story-continuity`** in **pre-build mode**: the bible, the shots and the script against each other, and the
   story against the world canon (docs/world/canon.md: the place, the day, the recurring characters, the easter egg).

Apply the must-fixes **to story.json** (not to a markdown copy), re-run only what failed. Round 2 only confirms round 1's must-fixes (a new finding is a
should-fix unless it breaks an owner rule). If it still fails after round 2, go back to step 1 with the next premise:
don't build a weak story.

## 7. Hand-off to the build

- Claim the premise in `docs/stories.md`'s premise bank (`building: <worker>`), or add it as a new row.
- Commit `stories/<name>/story.json` (the script: the build and the voice read only this), `bible.md` and the review
  notes on your branch. `./hb check story_<name>` before the hand-off shows no "script drift" warning.
- Voice: Gemini via `scripts/tts.py` + `scripts/align.py` (docs/voices.md; cast from `voices/cast.json`) from the `requests` (see `docs/story_craft.md` section 6 for
  the mapping), then check each take's duration and emphasis; or `scripts/voice.py` for a narrator-only v1 story.
- Build per `docs/stories.md` "Make one" (the stunt from `stunts/_story_template.js`, or the movie engine's camera
  shots for a cinematic story), with the bible open. `python3 scripts/rec_check.py` before rendering.
- After the build, `story-continuity` in **post-build mode** on the preview's sheets, then the usual `short-review`
  (one reviewer, 2 rounds). The story-level questions are settled here, so the review is only about execution.

## Report

The ten pitches with scores, the pick and why, the logline, the line count and estimated length, the cast with
voices, the table-read results (cold reader's summary, critic's scores and verdict, continuity findings), and what's
left to build.

## Voice structure (owner, 2026-11-10)
Narrator-first: one first-person narrator carries the story; other characters get at most 1-3 short lines at key beats
(hook, turn, payoff), each in a clearly different voice with a colour-coded caption. No dialogue scenes. Details and the
reason: docs/stories.md, House rules.
