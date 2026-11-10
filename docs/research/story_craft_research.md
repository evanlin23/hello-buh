# Story craft research: what makes a 30-60 s narrative Short work (2026-11-10)

Why this exists. The owner, 2026-11-10: "i kinda want the stories to be good too. How can we do these stories? Like
writing, doing research on good writing?" This is the research. `docs/story_craft.md` is the practical guide built
from it, and `.claude/skills/story-write` plus `.claude/agents/story-*.md` are the process that applies it.

How to read it. Each section gives the finding, the source, and what it means for HelloBuh ("For us"). Tags:
**[E]** a source says it (linked), **[O]** our own evidence (our published Shorts, the owner's notes, the sister channel
blocky-stories' measured numbers), **[I]** our inference. Most web sources on short-form video are creator blogs and
tool vendors; their numbers are rules of thumb, not research, and are marked so. The film-craft and writing-craft
sources are older and better established.

---

## 1. The hook: one strange, concrete image and a gap

**The curiosity gap.** Loewenstein's information-gap theory (1994): curiosity is a feeling of deprivation that comes
from noticing a specific gap between what you know and what you want to know. Two conditions matter. The viewer
needs *some* knowledge to feel a gap at all (you aren't curious about something you know nothing about), and the gap
must look closable: curiosity peaks at intermediate confidence (an inverted U) **[E]**
([PBS NOVA](https://www.pbs.org/wgbh/nova/article/how-to-stimulate-curiosity/);
[Golman and Loewenstein, "Information Gaps"](https://www.cmu.edu/dietrich/sds/docs/golman/Information%20Gaps--Golman%20and%20Loewenstein.pdf);
[Nautilus](https://nautil.us/curiosity-depends-on-what-you-already-know-235803)).

For us **[I]**: the hook must use what every Minecraft viewer already knows (sheep eat grass, wander, follow wheat),
and break exactly one of those rules. "My sheep has stared at the same dirt block for 412 days" works because the
viewer knows sheep don't do that: the known rule creates the gap. A world rule the viewer has to learn first
("In my world, the first time you die you hear one sentence...") is a smaller gap, because there is no prior
expectation to violate. The owner's own words for the test: "why tf is this sheep staring at this block?"

**One image, not one idea.** The owner's verdicts sort our stories exactly this way **[O]**:
- `runaway` ("the creeper was good"): the hook is a picture: fourteen villagers running from the camera.
- `sheep_stares` ("I was hooked"): a picture: a blue sheep, a dirt block, a stare.
- `respawn_tax` ("somewhat mid"): an idea: a respawn costs a villager. You can't see a cost; the first shot is a crowd
  of villagers standing still and a meter.

**Sister-channel data [O]** (blocky-stories RULES.md, Studio 2026-11-02 and the week of 2026-11-03): their best
opener (82.6% chose to view) was "a concrete, personal mystery with numbers that don't add up". Rule-first openers
alone did not fix the swipe (61-65%). Every upload lost the most viewers between 3 and 9 s: the second beat must raise
the stakes at once. Uploads at 65%+ average view all got 5k+ views; under 60% all stayed under 2.1k. The best upload
was a 34 s puzzle at 112% viewed (people rewatched).

**Short-form vendors [E, low authority]**: the opening seconds decide most drop-off; loops and rewatches are the
best-supported lever; end on a line or frame that connects back to the opening; write to a target length, then cut
about 30% ([Opus](https://www.opus.pro/blog/ideal-youtube-shorts-length-format-retention);
[Subscribr](https://subscribr.ai/youtube-strategy/youtube-shorts-low-watch-time-boost);
[dev.to hook engineering](https://dev.to/bulkdl/hook-engineering-the-science-of-the-first-3-seconds-in-short-form-video-2026-2jp9)).
Since 31 March 2025 a Shorts view counts every start and replay; "engaged views" is the old metric
([ppc.land](https://ppc.land/youtube-changes-how-shorts-views-are-counted-from-march-31/), via blocky's research).
Every exact threshold quoted in these posts (80% at 3 s, etc.) is unverified.

## 2. Mystery structure: clues that re-read after the twist

**Surprising, then inevitable.** The standard test for a twist: surprising in the moment, inevitable in hindsight.
Only surprising is a gimmick; only inevitable is predictable **[E]**
([Nathan Baugh, story twists](https://nathanbaugh.substack.com/p/story-twists);
[Editor World](https://www.editorworld.com/article/how-to-write-a-plot-twist);
[Writer's Digest, planting clues](https://www.writersdigest.com/how-to-plant-clues-without-giving-away-the-ending)).

**Fair play.** The detective-fiction rule: the audience gets the same information the detective has, so an attentive
reader could solve it before the reveal. Clues hide in plain sight, buried among less important detail, repeated
without emphasis; re-read the draft to check that every clue is findable on a second pass **[E]** (same sources;
[Jeffrey Archer on planting clues](https://jeffreyarcher.com/ask-jeffrey/how-to-plant-a-clue/)).

**Misdirection by the narrator's reading.** In `runaway` every clue is shown truthfully and *interpreted* wrongly by
the narrator ("My mom says I'm just shy", "I think he likes me"). That is the cleanest fair-play device we have: the
camera never lies, the narrator's explanation does **[O/I]**.

**Suspense vs surprise.** Hitchcock to Truffaut (1962): a bomb that goes off without warning gives the audience a few
seconds of shock; a bomb the audience knows about gives them sustained tension. Widen what the audience knows and you
get suspense; confine it and you get surprise **[E]**
([No Film School](https://nofilmschool.com/alfred-hitchcock-and-francois-truffaut-explain-surprise-vs-suspense);
[David Bordwell](https://davidbordwell.net/blog/2013/11/29/hitchcock-lessing-and-the-bomb-under-the-table/)).
For us **[I]**: a 45 s story wants both. `runaway`'s hissing (L09) is the bomb under the table: the viewer who knows
creepers is ahead of the narrator for the last 10 s, and the party becomes suspense ("don't get excited"). That
dramatic irony is a large part of why it lands. Plan the moment the attentive viewer gets ahead.

**Blocky-stories' own lessons [O]** (RULES.md, research `premise-engines.md`): the twist must follow from the rule the
viewer already learned ("if the twist needs new information, it's the wrong twist"); plant it at least twice where a
rewatch catches it; say it plainly; the cold-viewer test (a fresh reader hears the narration once and must explain what
happened and who everyone is) caught their confusing stories before build. "Unreliable narrator: who's speaking" is
a great hook but was called "cool but confusing" when the reveal needed parsing; say it plainly or show it.

## 3. Twist design: recontextualise the opening, earn the rewatch

**A twist changes the meaning of the first line.** blocky-stories: "The last 15 seconds make the first line mean
something new, so a second watch plays differently. A twist that only adds a fact isn't one." Their 30 premise engines
(`blocky-stories/docs/research/premise-engines.md`) are the menu of proven mechanisms (the threat is already inside;
the double reading; the cover story; the price someone else pays; who keeps the loop going). Borrow engines, never
works.

Our three stories against that test **[O]**:
- `runaway` L01 "All FOURTEEN villagers... RUN when they see ME." After the blast it means the opposite: they're not
  rude, they're sensible. Every line before it flips (the slammed door, the fisherman, the golem "liking" me). Rewatch
  value: total.
- `sheep_stares` L01 "My SHEEP has stared at the SAME dirt block for 412 DAYS." After the death screen it means: the
  sheep has watched the hole where its owner went in. The line does change meaning, but the explanation needs three
  steps (I dug down, died, respawned without memory, and I am the "old one"), and the proof is the item name on the
  death message, unreadable on a phone (see the frame sheet in `docs/story_craft.md`).
- `respawn_tax` L01 "Every time I RESPAWN, one villager... DISAPPEARS." After the reveal it means the same thing; we
  only learn the mechanism (they volunteer). That's an answer, not a twist.

**Loops.** A last line that runs into the first makes a replay feel like continuation; creators recommend it and
blocky measured rewatches above 100% on its looped puzzle **[E/O]**
([vidIQ on looping](https://vidiq.com/blog/post/double-youtube-watch-time-looping-shorts), via blocky's research).

## 4. Pixar's rules (Emma Coats, 2011) that matter at 45 seconds

Emma Coats, then a Pixar storyboard artist, tweeted 22 storytelling "guidelines" she'd learned from senior colleagues
([Laughing Squid](https://laughingsquid.com/22-rules-of-storytelling-by-pixar-storyboard-artist/);
[Farnam Street](https://fs.blog/22-rules-pixar-uses-to-create-appealing-stories/);
[PDF copy](https://mes153stevenson.commons.gc.cuny.edu/files/2018/08/Pixars-22-Rules-of-Storytelling.pdf)). The ones
that transfer to a 45 s Short **[E, our selection]**:
- **#1** You admire a character for trying more than for their successes. (`runaway`: he invites himself to the party.
  `respawn_tax`: he "trips"; the owner noticed.)
- **#2** Keep in mind what's interesting to you as an audience, not what's fun to do as a writer.
- **#4** The story spine: "Once upon a time there was ___. Every day, ___. One day ___. Because of that, ___. Because
  of that, ___. Until finally ___." Our beat sheet in `docs/story_craft.md` is this spine at 45 s.
- **#5** Simplify. Focus. Combine characters. Hop over detours.
- **#6** What is your character good at, comfortable with? Throw the polar opposite at them.
- **#7** Come up with your ending before you figure out your middle.
- **#12** Discount the first thing that comes to mind. And the 2nd, 3rd, 4th, 5th. Get the obvious out of the way.
  (Our pitch step: 10 premises for every one kept.)
- **#13** Give your characters opinions. Passive/malleable might seem likable to you as you write, but it's poison.
- **#14** Why must you tell THIS story? What's the belief burning within you?
- **#16** What are the stakes? Give us reason to root for the character.
- **#19** Coincidences to get characters into trouble are great; coincidences to get them out of it are cheating.
  (Inverse for us: "I tripped" is a coincidence to get *into* trouble, but the owner rejected it because the game
  can't show it. A cause must be visible.)
- **#22** What's the essence of your story? Most economical telling of it?

## 5. Flash fiction and micro-horror

The two-sentence horror form: line one sets up something ordinary, line two turns it; the horror often lives in what's
unstated, so the reader fills the gap; restraint over gore; tone and silence over spectacle **[E]**
([Writer's Digest, bite-size horror](https://writersdigest.com/be-inspired/writing-bite-size-horror-flash-fiction);
[Erica Drayton, 9 tips](https://ericadrayton.substack.com/p/9-tips-for-writing-bite-sized-horror);
[two-sentence horror skeletons](https://www.atmostfear-entertainment.com/opinions/readings/trending-two-sentence-horror-skeletons-stories/)).
blocky's web research adds: setup line then a shorter pivot line; lost time; rules older than the narrator; lore as
fragments that leave something to argue about
([112s on rule creepypasta](https://112s.substack.com/p/neapolitan-rule-creepypasta), via blocky).

For us **[I]**: a 45 s story is about 8-12 sentence pairs. Each beat is a setup and a pivot; the pivot is the shorter
line. "I pushed him into the river. / He WALKED right BACK." is the form at its best. End on the pivot, never on an
explanation.

## 6. Kishotenketsu and the story circle (for variety)

Dan Harmon's story circle (you, need, go, search, find, take, return, change) came out of Channel 101 short films
([Industrial Scripts](https://industrialscripts.com/dan-harmons-story-circle/)). Kishotenketsu (introduction,
development, twist, conclusion) builds by juxtaposition and a turn rather than conflict
([VidLit](https://www.vidlit.com/?p=545698)). **[I]** Most of our mysteries are kishotenketsu in disguise: an
ordinary world (ki), its strange detail developed (sho), a turn that recasts it (ten), one closing image (ketsu). That
is why a story can work without a villain. The story circle matters for the *character*: someone wants something
(the party, sleep, a reason), goes after it, and pays for it. `respawn_tax`'s narrator wants nothing for 10 lines.

## 7. Dialogue for voiced characters

**Subtext over on-the-nose.** Characters who say exactly what they mean read flat. Test: could an action show this
instead of a line? Mix the two: all-subtext confuses, all-on-the-nose is flat; save plain statements for the reveal
**[E]** ([Final Draft on subtext](https://www.finaldraft.com/blog/how-to-write-subtext-in-dialogue);
[ScriptMag dialogue tips](https://scriptmag.com/screenplays/top-10-tips-on-writing-dynamic-dialogue);
[Industrial Scripts on on-the-nose](https://industrialscripts.com/?p=227277)).

**Distinct voices.** If you can swap two characters' lines and nobody notices, the voices aren't distinct. Give each
character their own vocabulary and rhythm (one terse, one who talks in questions, one who jokes to cover fear)
**[E]** ([Fiveable, character voice](https://fiveable.me/tv-writing/unit-3/character-voice-dialogue/study-guide/22OOBl0mwacQQeK8)).

**Few words.** **[I]** At 45 s with a narrator, a character gets 2-4 lines of 3-10 words. Each line must do two jobs:
reveal the character and carry a clue. `runaway`'s mom has the best line we've written for a character, and it's
reported speech: "My MOM says I'm just SHY." With a real voice it would be: Mom (warm, a little too quick): "You're
just shy, sweetie." The subtext (she knows exactly why they run) is in the delivery.

**Dramatic irony is the best subtext we have.** A character who knows the twist says something true that the
narrator hears wrongly (Mom: "shy"; the librarian: "one more, just in case"). On a rewatch those lines are the
strongest clues.

## 8. Directing Gemini voices

What the docs and testers say **[E]**:
- Gemini TTS takes natural-language control of style, tone, accent and pace, single- or multi-speaker. A multi-speaker
  request has **at most 2 speakers**, each with a prebuilt voice; speaker names in the config must match the names in
  the transcript ([Gemini API speech generation](https://ai.google.dev/gemini-api/docs/speech-generation);
  [Google blog, Gemini 3.1 Flash TTS](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-tts)).
  Our `scripts/tts.py` (branch `agent/cinematic`) already does this: one request per pair of speakers, split at the
  pauses, with a fallback chain of models.
- Google's launch post describes an audio profile per character, a scene, director's notes (pace, tone, accent) and
  inline tags that change expression mid-sentence. The current docs page recommends a persona plus short per-turn
  style, inline tags in angle brackets (`<short pause>`, `<long pause>`, `<sigh>`, `<gasp>`, `<whispers>`, `<laugh>`,
  `<breath>`...), CAPITALS for stress, punctuation and ellipses for hesitation, and *less* instruction text for
  consistency: extra text increases drift ([AI Studio docs](https://aistudio.google.com/docs/speech-generation)).
  The 3.1 tester guide uses square brackets (`[warmly]`, `[sighs]`, `[whispers]`); tag syntax differs by model
  version, so test on the model `tts.py` actually hits.
- Pitfalls found by testers: the model sometimes **reads the direction aloud** (headers with apostrophes like
  "DIRECTOR'S NOTES", quoting transcript words inside the notes, a character name that sounds like the first word);
  start with a preamble saying the notes are direction only; prefer "warm and sincere" to flatness words like "quiet",
  "flat", "monotone"; one ellipsis or dash per line ([LiveKit prompting guide](https://livekit.com/blog/gemini-3.1-flash-tts-prompting-guide)).
  Our own `tts.py` header confirms it: "the model read the direction aloud, which gemini-3.x TTS does", so it keeps
  the last N stretches of speech and the takes must be checked by duration.
- Prebuilt voices and Google's one-word descriptors: Zephyr bright, Puck upbeat, Charon informative, Kore firm,
  Fenrir excitable, Leda youthful, Orus firm, Aoede breezy, Callirrhoe easy-going, Autonoe bright, Enceladus breathy,
  Iapetus clear, Umbriel easy-going, Algieba smooth, Despina smooth, Erinome clear, Algenib gravelly, Rasalgethi
  informative, Laomedeia upbeat, Achernar soft, Alnilam firm, Schedar even, Gacrux mature, Pulcherrima forward,
  Achird friendly, Zubenelgenubi casual, Vindemiatrix gentle, Sadachbia lively, Sadaltager knowledgeable, Sulafat warm.
- Free tier: a few requests a day per model (BuhExplains' note: about 10). So a story's whole cast goes in as few
  requests as possible: pair speakers, finalise the script before voicing, cache by text.

## 9. Continuity: what a script supervisor tracks

The script supervisor keeps notes on every take: props in place and their state, wardrobe/hair/makeup matching,
actor positions and eyelines, screen direction, and the axis (the 180-degree line) of each scene; they coordinate
with every department and hand the notes to the editor with the lined script **[E]**
([Wikipedia, script supervisor](https://en.wikipedia.org/wiki/Script_supervisor);
[No Film School](https://nofilmschool.com/what-does-script-supervisor-do);
[Film Independent](https://www.filmindependent.org/blog/script-supervisor-tips-tricks-and-tools-for-better-continuity-and-careers/);
[Backstage](https://www.backstage.com/magazine/article/script-supervisor-day-on-set-roe-moore-70610/)).
The 180-degree rule: keep the camera on one side of the line between two characters so each stays on their side of
the frame; crossing it flips the background and disorients **[E]** (same sources).

For us **[I]**, the continuity list is exactly what our stories broke (`docs/stories.md` staging lessons): time of day a
tick off its cut, the sheep floating high in the river, a sneak dropping at a cut, cast mobs in the wrong scene, the
narrator's hand holding the wrong item, the block that should be "the same dirt block" placed differently between
shots. A story needs a bible written *before* the build (what is where, in what state, at what hour, line by line),
and the movie engine's lint (`renderer/lint.js`, branch `agent/cinematic`) already checks the axis and framing.

## 10. Shot sizes and framing for vertical video

**Wider than you think.** Vertical guides agree: full-body wide shots and tall subjects translate best to 9:16; when
in doubt, step back and shoot a little wider; leave room so nothing important is cropped; camera moves read
exaggerated in vertical, so keep them subtle; push in (toward the subject) rather than dolly sideways; a 9:16 frame
lacks the width for a conventional two-shot, so stage dialogue as singles or in depth **[E, practitioner blogs]**
([Artlist vertical guide](https://artlist.io/blog/the-ultimate-vertical-video-guide-2020/);
[Backstage on vertical](https://www.backstage.com/magazine/article/vertical-video-explained-78419/);
[vertical drama composition](https://dev.to/cartney/vertical-video-composition-for-drama-the-2026-guide-567l);
[Adam Sebire, 9:16 tips](https://www.adamsebire.info/vertical-film-festival/9-16-tips-and-tricks/)).
An establishing shot tells the viewer where (and often when) the action is.

**Why ours were "too zoomed in" [O]** (frame sheets of `sheep_stares` and `respawn_tax`, 2026-11-10):
1. **POV at arm's length.** The narrator is the camera, and Minecraft's ~70 degree FOV makes anything within 2-3
   blocks fill the frame. "He stared THROUGH it", "DOES that", "him BLUE": a dirt block and half a sheep fill the
   whole view; you can't see where they are.
2. **The game view is nearly square** (1080 x 1011 inside the 9:16 frame, with caption bands above and below). A square
   crop of a close-up loses even more context than a 16:9 one.
3. **No establishing shot per place.** `sheep_stares` never shows the torch line from the door to the block in one
   frame, though it's the best clue; `respawn_tax`'s hay house is a wall filling the frame.
4. **Props shot instead of situations.** "off a CLIFF" is a grey wall and a lava square; the viewer sees the prop, not
   the event.
`runaway`'s frames are mostly medium-wide down a village street with houses on both sides and several villagers at
once: the place reads in every shot. That's the bar.

**Staging in depth.** Kurosawa staged in depth, with foreground figures framing the action behind, and established
place with very wide masters **[E]** ([Reverse Shot on High and Low](https://reverseshot.org/symposiums/entry/2014/high_and_low);
[colorculture on Throne of Blood](https://colorculture.org/throne-of-blood-cinematography-analysis/)). For a tall frame
**[I]**: stack the planes vertically: foreground (a fence, a flower, a door frame) low in the frame, the subject in the
middle, the world (hills, the village, the sky) above.

## 11. Set design for believability

Production design layers foreground (framing, context), midground (the action) and background (setting, atmosphere);
distant planes lose contrast and saturation (aerial perspective), so fog and haze sell depth; spaces should look
inhabited, not staged, and objects tell history without dialogue **[E]**
([Fiveable, set dressing](https://library.fiveable.me/production-design/unit-10/principles-set-dressing/study-guide/LSIjIcsSt7EFFNgR);
[Fiveable, depth and scale](https://frontend.prod.fiveable.me/production-design/unit-5/depth-scale-perspective-set-design/study-guide/0lbybT7uLyJd8n3U);
[RedShark, layered lighting](https://www.redsharknews.com/production/item/4878-creating-depth-with-layered-lighting)).

For us **[O/I]**: the owner: "the sets are all so small, and in a superflat, so when we watch it looks really bad and
low effort." A believable Minecraft place has (a) natural terrain to the fog (hills, trees, water), (b) scale (a
village of 10+ buildings, fields, paths, a wall that dwarfs a person), (c) wear and life (paths worn to doors, crops at
different stages, a half-finished build, lanterns, a garden), (d) a reason for every prop (the torch line exists
because someone walked it at night). Our movie engine's fog sea and grading (`docs/movie_engine.md`, `agent/cinematic`)
supply the aerial perspective; the set must supply the planes.

## 12. The genre: Minecraft and Roblox story channels

What we know **[E, thin]**: the big Minecraft story animation channels are long-form or animatic-led (SAD-ist's first
two Minecraft animatics drew 23M and 18M views; Aphmau's MyStreet roleplay passed billions of views across seasons)
([Tubefilter on SAD-ist](https://tubefilter.com/2022/07/08/technoblade-tribute-donate-cancer-research-sad-ist-animation/);
[Cornell Sun on MyStreet](https://cornellsun.com/article/2025/12/i-just-rewatched-mystreet-and-now-i-m-telling-you-watch-minecraft-roleplay)).
I found no reliable public numbers for Minecraft *story Shorts* channels specifically; a competitor scan (as blocky's
`docs/research/` did for Roblox) is still to do. Roblox story channels (Poke ~5.3M subs,
Hyper ~2.3M, Noob Roblox Story ~0.8M, ItsFunneh's voice-acted Brookhaven skits) are story-led and daily
([Influencer Marketing Hub](https://influencermarketinghub.com/roblox-youtube-channels/), via blocky's research).
blocky's 27-hit study of narrated rule-world Shorts (9.6-36M views) found the shared shape: one rule touching
everyone in line 1, the rule visible by 2 s, a 3-5 example montage in the first 15 s, the narrator as the exception,
a loved one at stake, a climax that turns the rule against itself, an early-planted twist with the last line echoing
the first, a readable first 2 s, and a cut every 1-2 s **[O, blocky RULES.md "What the hits do"]**.

**[I]** What's open for us: those channels are fast, jokey and narrator-only. Nobody we found does serious,
voice-acted, cinematically shot Minecraft mysteries at Shorts length with mechanics-true twists. Our edge is the one
thing an animated channel can't fake: the twist is *the game's own rule* (creepers hiss, a zombie keeps your sword,
golems guard villagers, phantoms come to people who don't sleep). A Minecraft player feels the twist was fair because
they already knew the rule. Write every twist so a player could have called it.

## 13. What we take, in one list

1. The hook is one concrete image that breaks a rule the viewer already knows (the "why tf" test).
2. One premise, one place, one want; the character tries something.
3. Clues shown truthfully, interpreted wrongly by the narrator or by a character with an opinion.
4. The attentive viewer gets ahead of the narrator a few seconds before the end (suspense), and the game confirms it
   (surprise).
5. The twist changes what line 1 means; it uses only what we showed; ideally it's a vanilla mechanic.
6. The ending is a picture or a game message the viewer can read at phone size, held about 1.3 s, then the loop.
7. Characters get few words, each carrying a clue, delivered with subtext; voices cast for contrast.
8. A continuity bible before the build; an establishing shot per place; wide by default, close only for reveals.
9. Full-scale sets with three planes and visible life.
10. Fewer, better: pitch 10, keep 1.

## Sources (all accessed 2026-11-10)
- Loewenstein information gap: https://www.pbs.org/wgbh/nova/article/how-to-stimulate-curiosity/ ;
  https://www.cmu.edu/dietrich/sds/docs/golman/Information%20Gaps--Golman%20and%20Loewenstein.pdf ;
  https://nautil.us/curiosity-depends-on-what-you-already-know-235803
- Twists and fair play: https://nathanbaugh.substack.com/p/story-twists ; https://www.editorworld.com/article/how-to-write-a-plot-twist ;
  https://www.writersdigest.com/how-to-plant-clues-without-giving-away-the-ending ; https://jeffreyarcher.com/ask-jeffrey/how-to-plant-a-clue/
- Hitchcock, suspense vs surprise: https://nofilmschool.com/alfred-hitchcock-and-francois-truffaut-explain-surprise-vs-suspense ;
  https://davidbordwell.net/blog/2013/11/29/hitchcock-lessing-and-the-bomb-under-the-table/
- Pixar's 22 rules: https://laughingsquid.com/22-rules-of-storytelling-by-pixar-storyboard-artist/ ; https://fs.blog/22-rules-pixar-uses-to-create-appealing-stories/ ;
  https://mes153stevenson.commons.gc.cuny.edu/files/2018/08/Pixars-22-Rules-of-Storytelling.pdf
- Micro-horror: https://writersdigest.com/be-inspired/writing-bite-size-horror-flash-fiction ; https://ericadrayton.substack.com/p/9-tips-for-writing-bite-sized-horror ;
  https://www.atmostfear-entertainment.com/opinions/readings/trending-two-sentence-horror-skeletons-stories/ ; https://112s.substack.com/p/neapolitan-rule-creepypasta
- Structure: https://industrialscripts.com/dan-harmons-story-circle/ ; https://www.vidlit.com/?p=545698
- Dialogue: https://www.finaldraft.com/blog/how-to-write-subtext-in-dialogue ; https://scriptmag.com/screenplays/top-10-tips-on-writing-dynamic-dialogue ;
  https://industrialscripts.com/?p=227277 ; https://fiveable.me/tv-writing/unit-3/character-voice-dialogue/study-guide/22OOBl0mwacQQeK8
- Gemini TTS: https://ai.google.dev/gemini-api/docs/speech-generation ; https://aistudio.google.com/docs/speech-generation ;
  https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-tts ; https://livekit.com/blog/gemini-3.1-flash-tts-prompting-guide
- Continuity: https://en.wikipedia.org/wiki/Script_supervisor ; https://nofilmschool.com/what-does-script-supervisor-do ;
  https://www.filmindependent.org/blog/script-supervisor-tips-tricks-and-tools-for-better-continuity-and-careers/ ;
  https://www.backstage.com/magazine/article/script-supervisor-day-on-set-roe-moore-70610/
- Vertical framing: https://artlist.io/blog/the-ultimate-vertical-video-guide-2020/ ; https://www.backstage.com/magazine/article/vertical-video-explained-78419/ ;
  https://dev.to/cartney/vertical-video-composition-for-drama-the-2026-guide-567l ; https://www.adamsebire.info/vertical-film-festival/9-16-tips-and-tricks/
- Staging in depth: https://reverseshot.org/symposiums/entry/2014/high_and_low ; https://colorculture.org/throne-of-blood-cinematography-analysis/
- Set design: https://library.fiveable.me/production-design/unit-10/principles-set-dressing/study-guide/LSIjIcsSt7EFFNgR ;
  https://frontend.prod.fiveable.me/production-design/unit-5/depth-scale-perspective-set-design/study-guide/0lbybT7uLyJd8n3U ;
  https://www.redsharknews.com/production/item/4878-creating-depth-with-layered-lighting
- Short-form retention (vendor, low authority): https://www.opus.pro/blog/ideal-youtube-shorts-length-format-retention ;
  https://subscribr.ai/youtube-strategy/youtube-shorts-low-watch-time-boost ;
  https://dev.to/bulkdl/hook-engineering-the-science-of-the-first-3-seconds-in-short-form-video-2026-2jp9
- Genre: https://tubefilter.com/2022/07/08/technoblade-tribute-donate-cancer-research-sad-ist-animation/ ;
  https://cornellsun.com/article/2025/12/i-just-rewatched-mystreet-and-now-i-m-telling-you-watch-minecraft-roleplay ;
  https://influencermarketinghub.com/roblox-youtube-channels/
- Internal: blocky-stories `RULES.md`, `.claude/agents/{writer,critic,standards}.md`, `docs/research/premise-engines.md`,
  `docs/research/2026-11-01-web-research.md`; hello-buh `docs/stories.md`, the published `hb-videos/shorts/story_*`.
