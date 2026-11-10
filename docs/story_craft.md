# Story craft: how we write, cast, shoot and check a HelloBuh story

The practical guide. Research and sources: `docs/research/story_craft_research.md`. House rules and the owner's quotes:
`docs/stories.md` (they outrank this file). The process that applies it: `/story-write`
(`.claude/skills/story-write/SKILL.md`), the `story-critic` and `story-continuity` agents (`.claude/agents/`).

**The bar.** Owner, 2026-11-10: "Judge every story against a polished animated short, not against other Minecraft
Shorts." Our own bar is `runaway` ("the creeper was good"): one simple premise, a twist you can rewatch, the reveal done
by the game. Every story is scored against it (section 11 says why it works, line by line).

**Owner rules from 2026-11-10 that override the older numbers below** (quotes and reasons: `docs/stories.md`, House
rules). When a section here disagrees, these win:
- **Narrator-first.** One first-person narrator tells the whole story: cast `narrator` in voices/cast.json (the Roblox
  narrator, Orus x1.45, since the owner's "s3_gemini_orus.mp3 is good"; recipe voices/recipes/narrator_roblox.md; Pip
  is `pip` and kid Puck is `puck_kid`, alternatives only). Other characters are quoted by him with a
  "said" tag; at most 1-3 punchlines of 6 words or fewer get their own voice, only while that character is on screen.
  No dialogue scenes. The voice palette and the "hushed, intimate" narrator in section 5 are for those few punchlines
  and for the A+ test, not for the narrator.
- **Never hushed, whispery or breathy** except for real fear. No intimate or obedient lines that read as ASMR out of
  context.
- **No "..." anywhere** in `text` or `say` (Gemini stops and whispers on it). Pauses come from full stops, short
  sentences and `<short pause>` tags, never an ellipsis.
- **35-45 s, about 90-120 spoken words** (runaway is 36.5 s), not the 45-55 s budget in section 2. Line 1 is the title,
  an absurd premise said in one quick breath; the first word lands in the first 0.4 s; no dead air.
- **Captions are one word at a time** (timed on the words), not the 2-3 word chunks in section 4. Keep the ` / ` chunk
  marks in `text` anyway: `"captions": "chunk"` still uses them.
- **The ending explains itself** in one short line or one picture the game shows, and the Short ends within 1 s of the
  payoff.
- **Every accident has a visible in-game cause; sets sit on natural terrain, never a flat clearing.**

---

## 1. The premise test: one picture, one "why tf?"

Owner, 2026-11-10: "the sheep worked bc its like why tf is this sheep staring at this block?"

A premise passes only if all five are yes:
1. **One image.** You can describe the hook as a single frame a painter could paint: *a blue sheep staring at a dirt
   block*; *fourteen villagers running from the camera*. Not an idea ("respawning costs a life"), not a rule ("in my
   world..."), not a feeling.
2. **It breaks a rule the viewer already knows.** Sheep wander and eat grass; villagers ignore you; golems guard the
   village; furnaces need fuel. The gap between what Minecraft does and what this picture shows is the curiosity
   (Loewenstein: curiosity needs prior knowledge). The best ones break a *mechanic*.
3. **The question asks itself.** Show the image with no words: does a viewer ask "why?" Write that question down
   in plain viewer words, swearing allowed ("why tf is the golem facing INTO my house?"). If you can't write it in
   under 12 words, it fails.
4. **Something countable.** A number that makes it real and escalates: 412 days, 14 villagers, 40 torches, 72 nuggets.
5. **The answer changes the picture.** When the twist lands, the opening image means something new (the villagers
   weren't rude, they were sensible). If the answer only explains the picture, the premise is a riddle, not a story.

Score each premise 0-2 on each (10 max). Develop only 8+. The `story-critic` agent scores pitches this way.

**Kill on sight:** a coma, dream or simulation twist; a door to the past; remakes of the owner's example stories
(the coma town, the repeating birthday, the mirror showing tomorrow, the rumor town); "the narrator is the mob" again
unless the critic agrees the new one is clearly different from `runaway`; a twist built on information we never showed;
a premise whose image needs a renderer feature we don't have (check `docs/lessons.md`; block entities beds, chests and
signs render now; banners, heads, pots and shulker boxes don't).

## 2. The beat structure (35-45 s; the clock below was written for 40-60 s, compress it)

Acted voices at a natural pace run about 150-180 words a minute plus pauses, not the old 290 wpm. **Budget 100-150
spoken words for 45-55 s.** Every line earns its seconds or goes.

| time | beat | what happens | test |
|---|---|---|---|
| 0-2 s | **The image** | Line 1 over the image it describes, already moving. The countable number in it. | Muted, does the frame alone ask "why?" |
| 2-8 s | **Worse than you thought** | The strangest proof, at once: the thing resists a normal fix ("I pushed him into the river. He walked right back."). No backstory, no establishing-only shot. | blocky lost most viewers at 3-9 s: this beat raises the stakes. |
| 8-25 s | **The tests** (3-4 beats) | Each beat is a setup and a shorter pivot, one shot each (some beats need two). Each is funny or eerie on its own AND a clue. A character speaks by ~12 s: one line, with an opinion, carrying a clue. | Each beat: what does it plant? |
| 25-35 s | **The want** | The narrator decides to do something (find out, fix it, go to the party). The character tries. The attentive viewer gets ahead here: the "bomb under the table" (Hitchcock). | Is there a choice? Who acts? |
| 35-50 s | **The act and the reveal** | The try, then the reveal shown by the game itself: a mechanic, a death message, a name tag, a picture. Not explained. | Readable at phone size? Held ~1.3 s? |
| last 1-2 s | **The sting / loop** | One short line or the held game message, then cut. The last line runs into line 1 (as one sentence, or cause and effect). | End 0.2-0.3 s after the last word (docs/stories.md). |

The Pixar spine is the same thing in words: *Every day, ___ (the image). One day ___ (the want). Because of that ___.
Until finally ___ (the reveal).* Write the spine in four sentences before any line.

**Write the ending first** (Pixar #7). Pick the reveal frame, then the first frame it re-explains, then the clues
between them.

## 3. The twist checklist

A twist ships only if every box is ticked:
- [ ] **It changes what line 1 means.** Read line 1 aloud after the reveal. Same meaning = an answer, not a twist.
- [ ] **Fair play.** Every fact the twist needs was on screen or in a line before the reveal. No new information in
      the reveal itself.
- [ ] **Planted at least twice,** at least one plant in the picture (not only in a line), each on screen 1 s+.
- [ ] **Misread, not hidden.** Each plant is interpreted wrongly by the narrator or a character, so it passes on the
      first watch ("My mom says I'm just shy"). A clue nobody comments on is either invisible or too loud.
- [ ] **Someone gets ahead.** By ~70% the attentive viewer (especially a Minecraft player) can call it a moment before
      the narrator. That's suspense, not a spoiler. If nobody could call it, it's unfair; if everyone calls it at 20%, it's
      predictable.
- [ ] **The game says it.** The reveal is a vanilla thing the viewer can read or see: a blast, a death message, a name
      tag, a mob behaving by its real rules. Never a spoken "I was the creeper" after it (owner, 2026-11-07).
- [ ] **One step.** The viewer gets from the reveal to the whole truth in one thought. `sheep_stares` needed three
      (I dug down, I died, I'm the "old one"); `runaway` needs one (I'm a creeper).
- [ ] **Readable at 300 px.** Death messages and item names are tiny: if the twist lives in small text, put it in
      the caption track too, or choose a bigger reveal.
- [ ] **Visible causes.** Every accident has a cause the viewer can see and that exists in the game (owner: "you
      can't really 'Trip' in minecraft"). If the character walks into danger, the story says why they chose to.
- [ ] **A rewatch plays differently.** List three lines that sound different the second time.

## 4. Writing the lines

**The narrator.** First person, past or present, one voice for the whole story. Short sentences. US English. No em
dashes or semicolons, no AI words. Opinions: the narrator interprets everything (wrongly, usefully).

**Setup and pivot.** Most beats are two sentences, the second shorter: "WOLVES showed up. / They took one LOOK at him
and LEFT." End beats on the pivot.

**Characters speak now** (owner, 2026-11-10: "using other voices for the other characters"). Rules:
- At most 3 speaking characters besides the narrator; usually 1-2. Every speaking character is named plainly the
  first time ("my mom", "the librarian, Ida").
- 1-4 lines each, 3-10 words a line. Each line does two jobs: shows who they are AND carries a clue.
- **Subtext.** Characters who know the truth say true things that the narrator hears wrongly ("You're just shy,
  sweetie." / "One more, just in case."). On a rewatch these are the best clues.
- **Distinct.** Swap two characters' lines: if nobody would notice, rewrite. Give each a verbal habit (Mom answers
  with a question; Grandpa calls everyone "kid"; the golem never speaks, it acts).
- **Show, then speak.** If an action can say it, cut the line (Pixar, subtext research).
- Vanilla mobs that can't talk (golems, animals, zombies) never speak. Villagers may, as a style choice, but sparingly:
  a villager who only says "hmm" all story and then speaks one sentence is stronger than a chatty one.

**Captions** (now one word at a time, see the box at the top; the chunks still matter for `"captions": "chunk"`): 2-3 word chunks split by ` / `, key words in CAPS and the key colour, never more than two
lines. Character lines get the speaker's colour, matched to the character's vibe, with a name tag on its first line
(docs/voices.md "Caption colours").

**One quotable line,** short enough to type in a comment.

## 5. Cast and voices (Gemini TTS)

**Narrator vs characters.**
- The narrator is the POV (the hidden-identity trick stays available) or the main character on screen with the movie
  engine's camera shots. Choose per story; write it in the cast.
- Characters are voiced by separate Gemini voices with an audio profile, never the narrator doing impressions.
- Contrast is the casting rule: pitch, age and energy should all differ between any two voices that talk to each
  other. Narrator mid-low and intimate; a parent warm; an elder gravelly; a child or teen bright.

**Voice palette** (Gemini prebuilt voices, Google's descriptors; audition before locking):

| role | first try | why | alternates |
|---|---|---|---|
| narrator (boy/young man, intimate, serious) | Charon (informative) or Iapetus (clear) | steady, close-mic, carries a mystery without performing it | Orus (firm), Umbriel (easy-going) |
| mom / warm adult woman | Sulafat (warm) | warmth with weight | Vindemiatrix (gentle), Despina (smooth) |
| grandpa / elder | Algenib (gravelly) | age and grit | Gacrux (mature) |
| dad / firm adult man | Alnilam (firm) | authority | Kore (firm), Rasalgethi |
| child / little sibling | Leda (youthful) | young and bright | Puck (upbeat), Laomedeia |
| comic villager / trader | Fenrir (excitable) or Zubenelgenubi (casual) | energy for a single line | Sadachbia (lively) |
| eerie / soft-spoken stranger | Enceladus (breathy) or Achernar (soft) | unsettling intimacy | Schedar (even) |

The `ai_dilemma` Shorts already use Erinome (narrator), Algenib (deep hero), Iapetus, Schedar, Achird and Kore
(`episodes/thin_ice/voices.json` on `agent/cinematic`): reuse what's been heard to work. The recurring cast with
fixed voices and profiles is the library in `voices/cast.json` (docs/voices.md): cast from it first.

**Directing a take.** Gemini takes at most **2 speakers per request**, and the free tier allows only a few requests a
day, so: finalise the script, group the lines into pairs of speakers, one request per pair (`scripts/tts.py`,
docs/voices.md, cuts a take into lines). For each request:
- **Direction** (the `direction` field `tts.py` sends): one sentence of scene and one short audio profile per speaker,
  in plain words. "A quiet evening on a farm. Narrator: a teenage boy telling a strange true story to a friend,
  hushed, curious, a little afraid. Mom: warm and tired, hides worry behind cheerfulness." Avoid flatness words
  ("flat", "monotone", "quiet"); use "hushed", "steady", "unhurried". Keep it short: more text drifts.
- **Per line**: a `direction` note for the emotion and the one rhythmic moment ("a held breath before the number").
  Never quote the line's own words in its note (the model reads them out).
- **In the spoken text**: punctuation for pace (a comma is a small breath, a full stop
  a stop), CAPITALS already mark stress, and inline tags where the model supports them: `<short pause>`,
  `<long pause>`, `<sigh>`, `<gasp>`, `<whispers>`, `<laugh>` (newer models; the 3.1 tester guide uses
  `[sighs]`/`[whispers]`). Test the tag syntax on the model `tts.py` actually reaches before relying on it.
- **Pauses are the delivery.** Plan them: a beat before the number in line 1, a held breath before the want, silence
  under the reveal. The old 1.45x narrator had none; that is most of what the owner meant by "the delivery was just
  kinda bad".
- **Check every take:** its duration against the text (a take far longer than its words means the direction was read
  aloud), and listen for the emphasis landing on the key word. Re-voice single lines with `--only`.

## 6. story.json: the cast extension (v2)

Everything below is **optional and additive**: a v1 story (narrator only, `voice` = Kokoro) still runs unchanged
through `lib/story.js`, `scripts/voice.py` and `scripts/story_track.py`, which read only `lines[].id/text`, `gap`,
`key_color`, `meter`, `start_on_respawn` and `voice`. New fields are ignored until a tool reads them.

```json
{
  "name": "golem_inside",
  "stunt": "story_golem_inside",
  "version": 2,
  "caption": "why is the golem guarding my house from the INSIDE 😳",
  "logline": "A boy finds the iron golem standing in his front door, facing in, and learns what it's guarding.",
  "question": "why tf is the golem facing INTO my house?",
  "premise": "...", "twist": "...",
  "key_color": "#9BE15D",
  "gap": 0.25,
  "voice": { "engine": "gemini", "model_hint": "gemini-2.5-flash-preview-tts" },
  "cast": {
    "N":   { "role": "narrator", "name": "me", "voice": "Charon", "color": "#FFFFFF",
             "profile": "a teenage boy telling a friend something he can't explain; hushed, curious, steady",
             "on_screen": "pov" },
    "Mom": { "role": "character", "name": "Mom", "voice": "Sulafat", "color": "#9BE15D",
             "profile": "warm and tired; answers questions with questions; hides fear behind cheer",
             "on_screen": "zombie_villager, farmer outfit, only seen through the window" }
  },
  "requests": [ { "id": "r1", "speakers": ["N", "Mom"],
                  "direction": "Night, a village, a boy talks to his mother through a window." } ],
  "lines": [
    { "id": "L01", "who": "N", "text": "The IRON GOLEM / has stood in / my DOORWAY / for NINE days.",
      "direction": "a held breath before the number", "shot": "S01", "look": { "what": "entity:iron_golem", "word": "GOLEM" } },
    { "id": "L05", "who": "Mom", "text": "Are you EATING, / sweetie?",
      "say": "Are you eating, sweetie? <short pause>", "direction": "too cheerful, a rasp under it",
      "shot": "S05" }
  ],
  "shots": [
    { "id": "S01", "line": "L01", "place": "street", "size": "wide", "camera": "pov",
      "frame": "house front fills the lower half; golem in the door, back to camera; lane and hills above" },
    { "id": "S07", "line": "L09", "place": "street", "size": "ews", "camera": "at", "master": "wide", "cropX": -180,
      "look": { "fog": true } }
  ],
  "props": { "door": { "at": [-1, 1, 3] } },
  "look": { "time": "night", "fog": false },
  "weather": "clear",
  "bible": "stories/golem_inside/bible.md"
}
```

| field | meaning | read by |
|---|---|---|
| `version: 2` | this story uses the cast extension | writers, critics; tools may branch on it |
| `logline`, `question` | the one-sentence story and the "why tf" question | the critic; packaging |
| `cast.<id>` | `ref` (a `voices/cast.json` id: its voice, name and profile), `role` narrator/character, `voice` (Gemini prebuilt name), `color` (caption colour for their lines; default: the library character's `color`), `profile` (the audio profile sent as direction), `on_screen` (POV, an actor skin, a mob) | the voice step; captions; the build |
| `requests[]` | which speakers share a TTS request (max 2) and the scene direction | the voice step (maps 1:1 to `tts.py`'s `voices.json` entries: `speakers` = `{cast name: voice}`, `lines` = `[[who, id, say]]`) |
| `lines[].who` | the speaker (a `cast` id); missing = the narrator | voice, captions |
| `lines[].say` | the exact text the TTS reads (tags allowed); missing = `text` with ` / ` removed and CAPS lower-cased | voice |
| `lines[].direction` | the emotion and one rhythmic moment for this line | voice (appended to the request's direction for that line's speaker) |
| `lines[].shot` | the shot id this line plays over | build, continuity check |
| `shots[]` | `place`, `size` (ecu/cu/ms/full/wide/ews), `camera` (pov, or a movie-engine spec: `single`/`two`/`ots`/`path`/`at`), `frame` (what's in the foreground/subject/background) | build; `story-continuity` |
| `bible` | the continuity bible file (section 7) | build; `story-continuity` |
| `lines[].look` | **what the camera must be on during the line** (owner, 2026-11-10: "why are we staring down instead of at the librarian's face"): an actor or name tag (`"Mom"`, `"actor:Gary"`), a cast id, `"entity:wolf"`, `"block:torch"`, `"prop:<id>"` (from `props`), `[dx, dy, dz]` from the set; or `{ "what": ..., "word": "TORCH", "size": "cu" }` (judged from that word on; `size` cu/ecu allows a close-up), a list of them, or `false` (the line names something we deliberately don't show). Missing: inferred from the line's words (TORCH, DOG, LIBRARIAN, MOM...; a family word means any villager/actor) | `./hb owner` subject check: explicit = blocker, inferred = warning |
| `props` | `{ id: { at: [dx,dy,dz] } \| { block: "torch" } \| { actor: NAME } }`: the bible's props by name, for `look` and for words in lines | `./hb owner` |
| `look`, `weather` | the story's world: `look.time` (`"night"` or ticks), `look.fog` (true: the picture needs visible fog, `stunt.fogSea`; render distance alone draws none), `weather` (`rain`/`thunder`/`clear`); also per shot in `shots[].look` / `shots[].weather` | `./hb owner` glitch check: the recording must have it (blocker). Without the keys the caption, logline, question and the bible's World section are read for fog/night/rain (the caption: blocker, the rest: warning) |
| `shots[].master`, `shots[].cropX` | `"wide"`: the shot is rendered as a 1920x1080 master and centre-cropped to the Short's 1080x1011 middle frame, shifted `cropX` pixels of the master (or a fraction of its width when \|cropX\| <= 1). The subject and flat-world checks judge the cropped frame (a subject outside the crop is out of frame); `stunt.shots[name].master` / `.cropX` and `stunt.master` work too | `./hb owner` |

**Compatibility.** The voice step for a v2 story writes `stories/<name>/voices.json` in `tts.py`'s format and runs
`tts.py` into `stories/<name>/voice/<id>.wav`, then writes the same `voice.json` (per-line `dur`, chunk times) that
`lib/story.js` already reads, so stunts don't change. Until that adapter exists, a v2 story is voiced by hand with
`tts.py` and the durations written to `voice.json`. If the cinematic session lands its own story/scene format
(`episodes/<ep>/scene.json` on `agent/cinematic`, or a `claude/cinematic-default` branch), map these names onto its
fields rather than keeping two: `cast` ≈ its `cast`/`names`, `shots` ≈ its `shots` specs, `requests` ≈ `voices.json`.

## 7. The continuity bible (write it before the build)

Owner, 2026-11-10: "we need to work on like continuity." Make `stories/<name>/bible.md` from this template during the
writing, not after the render. The `story-continuity` agent checks the script and the shot list against it, and the
builder checks the recording against it.

```markdown
# <name>: continuity bible

## World
- Time of day per scene (in ticks) and the order scenes play in; where the sun is (which side of frame).
- Weather per scene, and fog. Season cues (snow, leaves). Put the same in story.json `look` / `weather` (section 6):
  `./hb owner` holds the recording to them (owner: "there's no fog", on a story about fog).
- Days elapsed in the story ("412 days"), and every number the script says (it must match every picture: 14 villagers
  = 14 on screen when counted).

## Places (one row each)
| place | where (x,z from origin) | what's there | what the viewer sees first (the establishing shot) | changes during the story |

## Cast and costume
| who | mob / skin | outfit, colour, profession, collar, held item | name tag | where they are in each scene | state changes (hurt, cured, gone) |

## Props
| prop | first seen (line, shot) | state (lit, broken, placed, count) | where exactly | later appearances and their state |

## Positions and screen direction
- For each conversation: who is on the left, who on the right; the line between them; which side the camera stays on.
- For each walk: which way across the frame (left to right = toward home, for example), kept across cuts.

## The narrator
- What the narrator holds in each scene (the hotbar is visible in POV), hearts and hunger, armor.
- Where the narrator is when each line is said (it must match the picture: "I'm at the edge of the village" = we see
  the edge).

## Who knows what (line by line)
| line | the narrator knows | <character> knows | the viewer can know |

## Clue map
| clue | where planted (line, shot, time) | how it's misread | what it means after the twist |
```

**Common breaks to look for:** a prop that moves between shots (the "same" block), the time of day flicking at a cut,
a mob in two scenes at once, the hand holding the wrong item, a count that doesn't match the picture, a villager's
profession or outfit changing, a character knowing something they couldn't, a walk that reverses direction at a cut.

## 8. Shots for a vertical frame

Owner, 2026-11-10: "stuff might be too zoomed in at times." Our frame sheets show why: in POV the camera stands at arm's
length from the subject, so a block or a sheep fills the near-square game view (1080 x 1011) and the place disappears.

**Sizes, in blocks of distance** (subject 2 blocks tall, a villager). Visible height = 2 x distance x tan(FOV / 2):
1.4 x distance at FOV 70 (the POV default), 0.93 x distance at FOV 50 (the movie engine's default).

| size | what fills the frame | distance at FOV 70 | at FOV 50 | use it for |
|---|---|---|---|---|
| EWS extreme wide | the place: the village, the hill, the sky | 20+ | 30+ | the first shot in every new place; scale; endings |
| WS wide | the subject small, head to foot, with the world around | 8-12 | 12-18 | **the default**; action; anything moving |
| FS full | head to foot, filling half the height | 4-5 | 6-8 | a character doing something |
| MS medium | waist up | 2-3 | 3-4 | a character speaking |
| CU close-up | the face or the object | 1-1.5 | 1.5-2 | **reveals only**: the object of the mystery, a face when it matters |
| ECU | a detail | under 1 | under 1.5 | at most once a story |

**Rules.**
1. **Default wide.** If a shot isn't a reveal or a speaking character, it's WS or wider. A cut from wide to close is
   a statement; earn it.
2. **An establishing shot for every new place,** and again when we return after more than two other places. The
   establishing shot carries a clue whenever it can (the torch line from the door to the block, in one frame).
3. **Close-ups are rationed:** at most one in four shots, and the object of the mystery gets its close-up only after
   the viewer has seen where it is.
4. **Three planes in the tall frame:** a foreground element low (fence, flowers, a door frame), the subject in the
   middle third, the world above (hills, roofs, sky). Eyes on the upper third.
5. **Change size at every cut** (wide, medium, close are different; two cuts at the same size read as a jump).
6. **Push in, don't pan.** In a tall frame, movement toward the subject reads better than across it; keep moves
   slow. Every shot opens on motion (docs/movie_engine.md).
7. **POV shots carry what lives on the HUD** (the held item, hearts, the death screen); camera shots carry acting and
   place. A story can mix them; the narrator stays unseen if the twist needs it.
8. **Two people talking:** a 9:16 frame is too narrow for a side-by-side two-shot. Stage in depth (one near, one far),
   or over-the-shoulder, or alternate singles; keep the 180-degree line.
9. **Check the auto-framing.** The movie engine's `single` "wide" is 5.5 blocks at FOV 50, which is a full shot, and
   `framing.js` computes the horizontal field of view for 16:9 (`hf` from 16/9), so in a tall frame two-shots crop at the
   sides. For a real wide or establishing shot use a hand-placed `at`/`path` camera (or ask for an `establishing` size).
10. **Read it at 300 px.** Shrink the shot sheet to phone size: can you tell where we are and who is who?

## 9. Sets at full scale

Owner, 2026-11-10: "the sets are all so small, and in a superflat, so when we watch it looks really bad and low
effort." `docs/stories.md` has the rule; these are the numbers.
- **Natural ground.** Never a cleared flat plain. Pick a site with a hill, trees and water in view (`scripts/scout.sh`
  on the movie branch; or a generated village) and build into it.
- **Fill to the fog.** Whatever the widest shot sees, out to the fog, is part of the set: the view in each direction
  the camera looks needs terrain, trees or builds, not void or a hard edge.
- **A village is 8-15 buildings** with paths between doors, fields at different growth stages, a well or a meeting
  place, lanterns, fences, gardens, and two or three things that say who lives here (a half-built shed, a lone
  pumpkin patch, a fishing dock with a boat).
- **Scale things against a person.** A thing that matters is big enough to read in a wide shot: a wall 20+ blocks
  high, a field 30 x 30, a tree that's a landmark. A 3 x 3 hut reads as a toy.
- **Interiors are rooms, not boxes:** 7 x 7 inside or more, 3+ blocks high, a window with something seen through it,
  lit by lanterns or torches you can see, furniture that tells a story (a second chair nobody uses).
- **Every prop has a reason** that the bible can state (who placed the torches, why the path is worn there).
- **Depth for the camera:** for each establishing shot, name what's in the foreground, the middle and the background
  before building.
- **Light it.** Fog and the grade sell distance; lanterns and windows make night scenes readable (the first 2 s must
  read on a phone).

## 10. Agency: the "trip" rule

Owner, 2026-11-10: "you can't really 'Trip' in minecraft, so it just looks like him intentionally walking into the
lava." Every event has a visible in-game cause: a creeper blast, a mob hit, a block breaking under you, powder snow,
a trapdoor, an arrow, falling from a height you were knocked off. If the character walks into danger, the story says
why they chose to (and choosing is better drama anyway: Pixar #1, characters are admired for trying). Coincidences may
get a character into trouble only if the game can show them; never out of it.

## 11. Case studies: why runaway works, why sheep_stares hooks, why respawn_tax is mid

### runaway (the bar: "the creeper was good")

| line | what it does |
|---|---|
| L01 "All FOURTEEN villagers in my village RUN when they see ME." | The image (villagers fleeing the camera), countable, personal, and a rule the viewer knows broken (villagers don't run from players). After the twist it means the opposite. |
| L02 "I say GOOD MORNING. They SLAM the DOOR." | Setup/pivot at once; comic; a clue (doors are what you shut against a mob). |
| L03 "I tell the farmer his wheat looks GREAT. He JUMPS the fence and SPRINTS." | The narrator tries to be nice (we like him); escalation. |
| L04 "The fisherman jumps in his BOAT and never comes BACK." | Escalation by distance; a different place (variety). |
| L05 "Even the SHEEP pack up and LEAVE." | The quotable topper; widens from people to animals (animals flee creepers too). |
| L06 "Only the NITWIT stays. But I don't think he knows where he IS." | A joke that's also logic (only the one who can't think stays). |
| L07 "My MOM says I'm just SHY. She's the ONLY one who HUGS me." | The best clue: a character's true line misread. Mom is the only one who can hug him safely: she's a creeper too. Warmth = stakes. |
| L08 "And the IRON GOLEM follows me EVERYWHERE. I think he LIKES me." | A clue misread as affection (the golem is watching a threat). |
| L09 "Weird thing though. When I get EXCITED, I hear this HISSING." | The bomb under the table. Every Minecraft player now knows; the narrator doesn't. From here it's suspense. |
| L10-L11 "Today was the village PARTY. Nobody INVITED me. / So I invited MYSELF." | The want and the try (agency, Pixar #1). |
| L12-L13 "Everyone STOPPED. Everyone STARED. / I was SO happy. And there it was AGAIN." | The viewer is ahead and dreading it. |
| (BOOM) | The game does the reveal: the blast and "blown up by Creeper", held ~1.35 s. No spoken explanation. |
| L14 "Why does that ALWAYS happen when I'm HAPPY?" | The loop: the question runs into L01's answer. |

Why it works: one image, one rule (creepers hiss and explode) the audience already knows, every clue shown truthfully
and misread innocently, a sympathetic want, the viewer gets ahead ~10 s before the end, the reveal is one step and
done by the game, the camera device (POV) *is* the twist. Shots: medium-wide village streets with several villagers and
houses in frame; the place reads in every shot.

What a cinematic remake would add: real voices (Mom gets her line in her own warm voice: "You're just shy, sweetie"),
pauses (a held beat before "So I invited MYSELF"), and the golem's watching shown in a wide over the narrator.

### sheep_stares (the hook works; "the delivery was just kinda bad")

| line | verdict |
|---|---|
| L01 "My SHEEP has stared at the SAME dirt block for 412 DAYS." | The best hook we have: one image, a known rule broken (sheep wander and eat), a number. |
| L02 "He doesn't EAT. He doesn't SLEEP. He doesn't even BLINK." | Good escalation, but three negatives with no picture change between them; delivered at 290 wpm with no pause, it blurs. |
| L03 "I pushed him into the RIVER. He WALKED right BACK." | Perfect setup/pivot: a try that fails. |
| L04 "WOLVES showed up. They took one LOOK at him and LEFT." | Good, eerie. |
| L05 "I put a block of GOLD on top. He stared THROUGH it." | Good, funny. But the shot is a close-up of the gold block filling the frame: we lose where the sheep and block are. |
| L06 "Sometimes the block GROANS. I figured dirt just DOES that." | The key clue (a zombie below), misread with a joke: right technique. The shot is a dirt block filling the frame. |
| L07-L08 "I don't remember GETTING a sheep... I woke up in this house 412 days ago. No TOOLS. No MEMORIES." | The pivot from the sheep to the narrator. Here the story changes subject, and the amnesia is told, not shown. |
| L09 "...There's a line of TORCHES from my door to that BLOCK." | The best visual clue, never shown in one wide frame (door, torches, block together). |
| L10-L11 "The villagers call me the NEW one. They keep asking what happened to the OLD one. I say, WHO?" | A strong line, but the third clue in ten seconds, all about memory; the viewer is now juggling three ideas. |
| L12-L16 curiosity, the sheep LOOKS at me, break the block, a shaft, "Who digs STRAIGHT DOWN?" | Good build; the sheep looking at him for the first time is a great beat. |
| (death) "slain by Zombie using [HelloBuh's Sword]" | The twist is in ~20 px text on a death screen: unreadable on a phone. And it needs three steps (I dug down 412 days ago, died, respawned without memory, so I am the "old one"); vanilla respawning doesn't erase memory, so the logic feels made up. |

Diagnosis: a great image and a great middle, let down by (1) a twist that needs explaining and isn't explained,
(2) the reveal hidden in tiny text, (3) delivery with no pauses (the 1.45x narrator), (4) close-ups that hide the place
(the block and sheep crop the frame in L02, L05, L06, L07), (5) too many clues in the last third. Fix shape: show the
torch line wide by 10 s; give the sheep a visible owner clue (a name tag? the collar colour matching the narrator's
old armor dye); make the reveal a big readable thing (the zombie below holds a sword with *our* name over its head);
cut L07-L08's told amnesia.

### respawn_tax (the owner: "somewhat mid")

| line | verdict |
|---|---|
| L01 "Every time I RESPAWN, one villager in my village DISAPPEARS." | A rule, not an image. "Disappears" can't be shown (you show an absence). The first frame is villagers standing around a golem: nothing strange to look at. |
| L02 "First, I fell off a CLIFF." | A death with no cause and no picture of the fall (the shot is a grey wall). |
| L03-L05 the fisherman, the butcher's door, "A CACTUS took the FLETCHER." | A montage of absences. L05 is confusing (did the cactus kill me or him?). Three deaths, no choices. |
| L06 "So I stopped DYING. I moved into a house made of HAY." | The one great idea (hay breaks falls: vanilla, funny, a try). The shot is a hay wall filling the frame. |
| L07 "The LIBRARIAN raised me. She kept giving me BREAD. One more, just in CASE." | A good subtext line, wasted in reported speech at speed. |
| L08 "And the IRON GOLEM always stood EXACTLY where I respawn." | Good plant. |
| L09-L10 "Then I TRIPPED. Into the ONLY block of lava in the whole VILLAGE." | The owner's complaint: Minecraft has no tripping; on screen he walks into lava. It also kills agency: the climax happens *to* him. |
| L11-L14 "...He wasn't TAKEN. He VOLUNTEERED. Every respawn costs ONE life... The golem was keeping the LINE." | The twist explained in four lines. It adds a fact (a mechanism) and doesn't change L01's meaning: still "a villager disappears when I respawn". |
| L15-L18 "Now it's just HER... I tripped AGAIN... go on. RESPAWN." | The sacrifice should land, but we never saw him love her; and "tripped again" repeats the contrivance. |

Diagnosis: idea-first instead of image-first; a passive hero; deaths without visible causes; the twist told instead
of shown; the twist answers rather than recontextualises; close-ups of props (lava squares, hay walls) instead of
situations. What would have saved it: an image hook (the iron golem standing on my spawn point every morning, with
one fewer villager in the line behind it), a hero who chooses to die once to test it, and a reveal we watch (the
librarian stepping onto the spawn point as he respawns).

## 12. Before you build: the table read

Every script gets a table read before a single block is placed:
1. Voice it (or read it aloud at the real pace with the pauses).
2. A **cold reader** (a fresh agent that has read nothing else) hears or reads only the lines once and answers: what
   happened, what the twist means, who each person is to the narrator, and what they'd comment. If they can't say it
   in two sentences, or get a relationship wrong, rewrite (blocky-stories' cold-viewer test).
3. The `story-critic` scores the script (section 1 and section 3), and `story-continuity` checks the bible and shot list.
4. Only then: sets, cast, recording.
