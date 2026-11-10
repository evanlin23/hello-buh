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

## 4. The script (stories/<name>/story.json, version 2)

- Lines in the house format (` / ` chunks of 2-3 words, CAPS key words), 100-150 spoken words for 45-55 s.
- The cast block: the narrator plus 1-3 speaking characters, each with a Gemini voice cast for contrast, a caption
  colour and a short audio profile (`docs/story_craft.md` section 5 has the palette).
- `who` on every character line; `say` where the spoken text needs tags or differs from the caption; `direction` on
  any line whose delivery matters (an emotion and one rhythmic moment, never quoting the line's words).
- `requests`: group the speakers into Gemini requests of at most 2 speakers (the narrator with one character per
  request), as few requests as possible (the free tier allows a few a day).
- `premise`, `twist`, `logline`, `question`, `caption` (the top-band hook, under 45 characters, one emoji), `key_color`.
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

## 6. The table read (max 2 rounds)

Run these three independently (in parallel if you can spawn agents):
1. **Cold reader**: a fresh agent given ONLY the spoken lines in order (with speaker names), nothing else. It answers:
   what happened, what the twist means, who each person is to the narrator, the moment it guessed the twist (if it
   did), and the comment it would leave. Fail if it can't say what happened in two sentences or gets a relationship
   wrong.
2. **`story-critic`** in **script mode**: scores against runaway; verdict approve / revise / kill.
3. **`story-continuity`** in **pre-build mode**: the bible, the shots and the script against each other.

Apply the must-fixes, re-run only what failed. Round 2 only confirms round 1's must-fixes (a new finding is a
should-fix unless it breaks an owner rule). If it still fails after round 2, go back to step 1 with the next premise:
don't build a weak story.

## 7. Hand-off to the build

- Claim the premise in `docs/stories.md`'s premise bank (`building: <worker>`), or add it as a new row.
- Commit `stories/<name>/story.json`, `bible.md` and the review notes on your branch.
- Voice: Gemini via `scripts/tts.py` (`agent/cinematic`) from the `requests` (see `docs/story_craft.md` section 6 for
  the mapping), then check each take's duration and emphasis; or `scripts/voice.py` for a narrator-only v1 story.
- Build per `docs/stories.md` "Make one" (the stunt from `stunts/_story_template.js`, or the movie engine's camera
  shots for a cinematic story), with the bible open. `python3 scripts/rec_check.py` before rendering.
- After the build, `story-continuity` in **post-build mode** on the preview's sheets, then the usual `short-review`
  (one reviewer, 2 rounds). The story-level questions are settled here, so the review is only about execution.

## Report

The ten pitches with scores, the pick and why, the logline, the line count and estimated length, the cast with
voices, the table-read results (cold reader's summary, critic's scores and verdict, continuity findings), and what's
left to build.
