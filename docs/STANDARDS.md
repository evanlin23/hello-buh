# Story standards: the current checklist

Updated: 2026-11-11

Every rule a story Short must meet **today**, once, by stage, with its number and the check that enforces it. The
newest owner decision wins; superseded rules are listed at the end and must not be applied. The dated history (the
owner's quotes, the reasons) stays in `docs/stories.md` "House rules": each standard cites its source as `r:xxxxxx`
(`./hb rules --log` lists every rule with its key, `./hb rules --key r00f92f` prints one in full).
Checks: **pace** = `./hb pace` (the finished mp4), **owner** = `./hb owner`, **check** = `./hb check` (rec_check, lint,
continuity, framing, owner, cuts), **edges** = `python3 scripts/voice_edges.py stories/<name>`, **speaker** =
`scripts/speaker_check.py` (run by `./hb voice`), **review** = the short-review skill. BLOCK stops the line; WARN
needs a reason or a fix. `./hb make <stunt>` runs every automatic check in order.

## 1. Script (before any voice)
1. **Line 1 is the title and the hook**: one strange, concrete image or threat to me, with something countable, said
   flatly in first person over the picture it describes, in the first second ("why tf is this sheep staring at this
   block?"). Then quick escalating examples, the twist, the loop. Check: review, pace (hook). r:rc07fa1 r:rb1b445 r:raf72e0
2. **The twist turns the whole story over**, planted at least twice where a rewatch catches it, said in one short line
   or shown by the game itself (runaway ends on the blast + "blown up by Creeper", no spoken reveal). Check: review. r:r9f677e
3. **The ending reads from the picture** and **the last line loops into line 1** (as one sentence or as cause and
   effect). Never say what the last shot already shows ("Good boy.", "Day one. Again." cut by the owner): end on the
   picture and the sound. Check: review, story-critic. r:r810b66 r:r1fc6a3 r:r6562ae
0. **The mystery test** (bar: light_sleeper, runaway): a question to the viewer in the first 3 s that only the ending
   answers; a cold reader can guess at the midpoint but not be sure, and explains the reveal in one sentence after;
   cut within ~1 s of the reveal; 25-40 s, nothing that doesn't move the question. The Short ends the moment its
   last beat lands, no shots after it (Dog on the Hill: on Buh leaving). Check: story-critic (blockers),
   cold reader, review. r:ra807e9 r:r8de735
0b. **Built on a proven arc, and it loops** (docs/story_arcs.md): paradox or question hook in line 1, escalation,
   reversal, end mid-sentence on the climax so the last words run into line 1; one narrator says every quote. Check:
   story-critic, cold reader (does the end flow into the start?). r:r30c821
0c. **The held stories use their approved arc rewrites** (stories/<name>/script_vNext.md; Good Boy: a new premise);
   the finished cut is still held for the owner's OK. Check: owner. r:r69e712
4. **Understood on one watch, nothing extra**: no unexplained names (set up every name first), no punchline that
   explains a twist the picture already landed, no sting after the story ends. Check: cold reader, story-critic.
   r:r0d320b
4b. **The plot survives "why?"**: every character's action has a reason the viewer can state, and every accident has
   a cause you can SEE that exists in the game (a blast, a hit, a block breaking, powder snow, an arrow; never "I
   tripped/slipped/fell asleep"). Check: owner (`sync`: an uncaused fall), story-critic. r:rd497c4 r:r1d5238
5. **Narrator-first**: one first-person narrator carries the whole story; other characters are quoted with a "said"
   tag. A second voice only for **1-3 punchlines of <= 6 words**, only while that character is on screen, another
   age or sex, never two extra voices of the same sex, never exposition, no back-and-forth dialogue. Check: review. r:raf72e0 r:r845f53
6. **The out-of-context read**: nothing hushed, breathy or tender about obeying, sitting, waiting for someone or
   "good boy". An animal twist is played bright, quick and goofy, the reveal physical (a bark, a pat). Check: review. r:rb41dc3
7. **Write like a person**: short sentences, **no "..." anywhere**, no em dashes or semicolons, US English, no AI
   words; fiction, never "true story"; nothing aimed at kids in the title or description; one quotable line short
   enough to type. Check: review (an ellipsis shows up in pace as an opening pause). r:rd2e17b r:rc7ba87 r:r810b66
8. **The hero is Buh** (default Steve skin); HelloBuh is the channel. His name is only in-game text (chat, death screen, name tag); **nobody says it aloud**. r:raa4daf r:rc1ccff r:rf8d2e6 r:rdd0a3e
9. **Length 30-45 s** (pace BLOCK < 30 s, WARN > 45 s). r:rcb4ffc
10. **The bar is a polished animated short**, serious and professional, with more invention in the plots. r:r416ae4 r:r4b4332
11. **The story decides, the engine follows**: a shot the renderer can't draw is a feature to build
    (docs/engine_features.md); stage around it only if it's > ~2 h of work, and log it in docs/engine_requests.md. r:r507412

## 2. Voice
000. **A bubbly kid who's figuring the world out, and always easy to follow**: Pip-based, happy and bubbly, misreading
   what the viewer understands. Fast only works when clear: scripts written for the ear (one short thought per
   sentence, in time order, joined by So/Then/But), takes PERFORMED continuously (not cut out of a paused read), each
   sentence landing on its key word. Spoken stress goes on ONE word per sentence (its last key word); the caption still
   colours one key word per chunk, but the voice doesn't hit every CAPS word (a cold listener heard that as "a flat
   drumbeat"). Character lines of about 6 words or fewer are spoken by the character in their own voice (00).
   Check: cold listener, audio only, one listen. r:r919ea3
0000. **The narrator recipe (owner's pick)**: Pip as heard in Dog on the Hill v2: Gemini Leda on gemini-3.8-flash-lite-tts,
   one single-speaker request "[A bubbly nine-year-old kid, fast, bright and energetic, telling a friend an amazing
   story; not whispery, breathy or soft]" + the lines in plain sentence case (`plain_say`: no CAPS, no ellipses);
   natural tempo, no speed-up, no pitch shift, no pause cap; performed continuously, re-taken never trimmed; the take gate allows
   sentence breaks up to 0.6 s (cast `max_pause`), character lines 1.0 s. It is `voices/cast.json` `narrator`; the
   earlier picks are `narrator_sleepover` (k4, rubberband 1.1x +1 st) and `narrator_roblox` (Orus x1.45), history only.
   Check: owner (listen), test_continuous. r:re6a7ee r:r8ef256 r:rcf486c r:r754946
00. **Our own brand narrator voice, plus short character lines** (docs/brand.md): a distinctive narrator voice of
   our own (not an imitation of another channel's), telling almost everything; other characters say short lines
   (about 6 words or fewer) in their own distinct voices. Supersedes the Orus x1.45 narrator and narrator-only quotes.
   Check: owner (voice pick), speaker_check, panel. r:r4c881f The narrator sounds like a kid. r:r7fabda
0. *(Superseded by 00 and 000: the narrator is our own bubbly kid voice, not a Roblox-story imitation, and the short
   character lines are spoken in the characters' own voices.)* Still true: fast, never padded. r:r4f221c r:r30c821
1. *(Being replaced: the kid brand voice is being picked, 00/000. Until then the cast default is still:)* **The narrator is `voices/cast.json` `narrator` = `narrator_roblox`**: Gemini **Orus**, gemini-3.8-flash-tts
   (locked), single speaker, the voice-match direction as the bracketed prefix, and every take played **tempo 0.95,
   then 1.45x faster by resampling** (cast `tempo`/`rate`: pitch and formants rise with it; tts.py `speed_up`, on the
   whole raw take before the trim, the slices and the take gate). The one owner-approved exception to "never
   pitch-shift a voice", for this speed-up only. The recipe is `voices/recipes/narrator_roblox.md`. Pip (`pip`, Leda on
   3.8-flash-lite, natural tempo, `voices/recipes/pip.md`) and kid Puck (`puck_kid`) are named alternatives only. An
   adult woman storyteller is `storyteller` (Despina); a kid *character* is `child` (Laomedeia). Check: speaker
   (the take gate on the sped-up take). r:r63a3a1 r:r350819 r:r810b66
2. **Never whispery**: every style prompt says "fast, bright, energetic; not whispery, breathy or soft"; drop to
   scared (not hushed) only for real danger. r:r350819 r:raf72e0
3. **Fast**: about 5-5.5 words per second while speaking (the owner's reference Short), from short sentences, little
   air between them and the narrator's 0.95 x 1.45 speed-up (Voice 1; Orus reads ~4.4 words/s, ~5.9 after it).
   Check: pace. r:r1ed23c r:r63a3a1 (supersedes r:r00f92f, "speed is not a target")
4. **The opening in one breath**: no pause inside line 1 over **0.2 s**; in the first 5 s no pause inside a line over
   **0.35 s** and no gap between lines over **0.6 s** (pace BLOCK; WARN over 0.25 / 0.45 s). Re-take, don't trim. r:r810b66 r:r961104
5. **Cut safely**: at the quietest point between lines (`voice_check.py --resplit`), never at Whisper's word start or
   end, and ask for a breath between sentences so a quiet point exists; **>= 80 ms** before the first
   word, **>= 200 ms** after the last, 10-20 ms fades; never splice inside a line (only shorten the silent middle of a
   pause, 30 ms crossfade, >= 60 ms from speech). Check: edges (an edge within 30 dB of the peak = CUT), pace (a line
   cut by the end, two lines overlapping: BLOCK), a listening pass. r:r9b64f0 r:r3ae817
6. **The right voice and the right words on every line**: a line in the wrong voice or with the wrong words is a
   blocker; never record over it. Check: speaker (`./hb voice`, agent/speakers). r:r0cff17
7. **A cast of distinct, recurring voices** from `voices/cast.json` (same id, voice and profile in every story);
   any two voices that talk differ in age, sex or pitch. Each voice reads as its character's age and sex at first
   hearing (a grandma sounds like an older woman, not gravelly). Check: review (listen). r:r4b4332 r:raf72e0 r:rf8060c
8. **No voice drift**: one TTS model per character per story (on a 429 mid-story, wait or re-take all of that
   character's lines on the new model, never mix); short requests (one character, at most ~6 lines); the identical
   direction text for a character every time; re-take a line that sounds like a different person. Drift is a review
   blocker. Check: listening + speaker (the drift gate, scripts/voice_drift.py on agent/voice-drift, when it lands). r:rd9445b
9. **Quota out (429 on every TTS model)**: stop, push, leave the story for the next run; never fall back to the old
   sped-up narrator. Short bracketed directions only (long ones get read aloud). r:r810b66
10. **Re-voice after any script change**; the scene lengths come from voice.json, so a new voice = a new recording.

## 2b. Voice delivery and caption sync (owner 2026-11-10)
1. **Delivery follows the line's emotion**: the narrator's lines split by beat into requests with one scene direction
   each (same voice, model, profile); a sad or quiet ending is never read bubbly. Check: panel, review. r:r08bb81
2. **Captions start with the speech**: voice.json/words.json re-aligned after every cut (a take that changed since its
   alignment is a BLOCK); Whisper-timed lines: caption start within 0.12 s of the speech onset. Check:
   `scripts/caption_sync.py` (in `./hb review`). r:r08bb81
3. **Captions land on the word**: each caption appears on the frame in which its word starts (no lead:
   `story_track.CAPTION_LEAD = 0`, starts floored to the 60 fps frame), never before the line's own cut. Word times
   are forced-aligned to the caption words (`scripts/align.py` -> `scripts/ctc_align.py`; Whisper only as a fallback,
   flagged), caption words matched to them by text. Measured on the finished Short: |median offset| <= 33 ms and
   <= 10% of words over 100 ms off, else BLOCK. Check: `scripts/caption_av_check.py` (in `./hb review`). r:r27d123
6. **Narrator silences capped, words untouched**: each silence inside the narrator's take is shortened to 0.12 s in its
   silent middle (cast `pause_cap`, tts.shorten_pauses), the way the owner's s3 sample was; words are never cut, and a
   take with a bad word is re-taken. Check: take_gate (pause, words), voice_edges. r:r5deb6a
5. **No dramatic pauses**: the narrator talks continuously from frame 0 to the cut; drama comes from the words and
   the picture, never silence. Pause limits (take gate) and line spacing follow the owner's reference Short's measured
   gaps: 194/195 word gaps under 0.3 s, so pauses max 0.3 s inside a line and 0.35 s between, lines 0.08 s apart. Length
   floor 25 s. Check: take_gate (pause), pace. r:rc95ed3
4. **Continuous takes, not edited ones**: one beat = one take used whole, its inner gaps its own; a take with a long
   pause, breath, whisper, wrong or clipped word is re-taken with a tighter direction, never trimmed into shape. Cuts
   only between beats. Check: pace (pauses), speaker_check (CLIPPED, GATE), panel; the take gate in `./hb voice` for a
   story with `"voice_takes": "beat"` (scripts/take_gate.py, docs/voices.md "Continuous takes"). r:rfd4907

## 3. Set
1. **No superflat**: built into real terrain with relief, at full scale, with depth in every shot (foreground,
   mid-ground, distance); places far apart in the story are far apart on screen; never a clearing on a flat plain.
   Use `lib/sets` (docs/sets.md). Check: owner (`flat`: BLOCK). r:rd497c4 r:r47a143
2. **Builds follow docs/building_guide.md** and score **7+ (focal building 8+)** on its checklist, on stills, before
   recording. Check: review (manual). r:r4b6024
3. **No glitches, and the title's promise is on screen**: no doors moving by themselves, never stuck on a block, no
   jitter or stutter; fog/night/rain when the story says so. Check: owner (`glitch`), check (rec_check cuts). r:rd497c4 r:rff9341
   While a container GUI (chest, barrel) is open the camera holds still, as in vanilla. The camera is never inside
   or clipping through a block (the eye always in air). Check: review (stills of every shot). r:rbc17a7
4. **Night needs light**: a lantern within 4 blocks of every face (cinematic-style "Lighting").

5. **One shared world** (seed `hellobuh`): every story happens at a canonical place in docs/world/map.json, built by
   `world.build(ctx, { story })` (no planSite/findSite/clearSet/`/locate` for canonical places); canon facts in
   docs/world/canon.md; one background easter egg per story; every Short still stands alone. Check: `./hb world
   check`, story-critic (canon line, stands-alone must-fix), story-continuity (canon facts). r:rf4bb26
5. **The set matches the narration's claims**: every claim the lines make about the place ("everything is carpeted",
   "every sheep is blue") holds in every shot, except a deliberate, planted exception. set.md lists the claims; check
   them on stills from every shot angle before recording. Check: review (stills), visual audit. r:r41b413
6. **A full, funny hotbar**: all 9 slots filled, the story's own tools first, then 1-3 ridiculous items that fit the
   world (milk buckets, cake, 67 eggs: owner "make it 67 eggs"); never contradicting the story, the same between shots.
   story.json "hotbar" (the harness puts it on before the first frame; docs/engine_features.md "The story's hotbar").
   Check: check (story hotbar: BLOCK on an unknown item id), rec_check (hotbar), review (stills). r:rdc3c4c

## 3b. Motion (built in, not caught)
1. **Smooth by construction**: stunts move the camera, the player and NPCs only through the story kit's primitives
   (eased turns, pathing walks, vanilla-speed NPCs, a still camera while a GUI is open); a lint before recording
   rejects raw look/teleport calls. Post-render checks are the safety net, never the method; the same for every
   quality rule: build it into the tool first, check it second. Check: lint (`./hb check`), then rec_check. r:rd9b7d0
2. **Cast move only through the kit** (`K.actor`: every tick, at mob speed), placed before the shot mark so the new
   shot's first frame already has them in place; never a stunt's own `/tp @e` loop (dog_hill's hop read as a teleport).
   Check: lint (raw `/tp @e`), rec_check (cast jump after a cut; stepped motion). r:rfa229d
3. **Invisible cuts**: the subject the eye is on stays at about the same place in the frame across the cut
   (eye-trace: jump <= 15 % of the frame; > 20 % WARN, > 33 % BLOCK), and the cut lands in the pause 33-150 ms before
   the line's first word, never after it nor off the line's voice. Built in: render.js `eyeTrace` re-aims each camera
   shot onto the last shot's subject (name it with the shot's `subject`), `K.line` ends a line so the next cut lands
   before the next word (docs/cinematic.md "Invisible cuts"). Check: check (`cuts`; `./hb cuts`). r:rfa229d
4. **Clear line of sight to every dig and place**: nothing between the eye and the face being broken or placed on.
   The kit's K.dig/K.place aim at a point on a face the eye can see (lib/sight.js; a place: the clicked face of a block
   it goes against), and refuse otherwise, naming the block in the way and a stand spot that sees it ({ walk: true }
   steps there). Check: rec_check `sight` (scripts/rec_sight.js: no visible face, or the crosshair hits another block
   first). r:rd0b2b1

## 4. Shots
1. **Look at what the line names**: the named subject in frame, near centre, readable (`lines[].look`). Check: owner (`subject`). r:rd497c4
2. **The picture never runs ahead of or against the words** ("dug under it" before we dig; "never dig straight down"
   while digging straight down). Check: owner (`sync`). r:rd497c4
3. **Wide enough**: an establishing shot for every new place; subject size in the game view: medium **>= 45 %** of its
   height, close face **>= 25 %**, wide **>= 12 %**. Check: check (`framing`: too tight over 60 %, a new place with no
   wide shot). r:rb1b445
4. **Continuity**: props, time of day, positions and who is where match across cuts. Check: check (`continuity`). r:rb1b445
5. **Something new every 1-2 s**, nothing still over 1 s; a cut on almost every line; camera shots 1.5-4 s.
   Check: check (rec_check `held` 0.6 s+), pace (`dead`). r:r65434d
6. **The format**: a 1080x1920 Short, title band on top, the game view 1080x1011 in the middle, black bands;
   cinematic shots from a wide master cropped to the middle (compose for the centre crop); never a 16:9 Short.
   Check: owner and framing judge the cropped frame. r:r77975c

- **Smooth digging, eye-level looks** (owner 2026-11-10): no aim snaps between dug blocks; a look puts faces at
  eye level with headroom (never the feet or a block centre). Check: review; agent/smooth-dig and agent/aim add
  measured checks. r:rb9aa2d

## 5. Look
- **Bright and punchy is the story look** (the owner picked it over the cinematic grade): every story stunt sets
  `look: { mood: 'bright', rolloff: 0.8 }` (the roll-off keeps a daytime sky blue with its clouds; plain 'bright'
  clips it cyan-white) and `edit.punchStress: true`. The zoom punches go on the **big moments only** (hook, turn,
  reveal: story.json `"punch": true` on those lines, at most 4; none marked = the first and last line), never one per
  sentence. Check: owner; review. r:rcae995 r:rd13834 r:r5aeaf2
Numbers and moods: the `cinematic-style` skill "Standards" (docs/look.md). Stories use `look: 'bright'` (above); other Shorts keep the cinematic default (`look: 'auto'`).
- Subject luma 0.35-0.70 by day, >= 0.25 at night; black point p1 >= 0.015; < 2 % clipped. Check: `scripts/look_stats.py`.
- Sharp: bloom threshold >= 0.7, no DoF on wide/establishing shots, crf <= 18.
- No onomatopoeia or emoji; punch-in 0.06-0.10 at most twice, shake 6-10 px only on a visible impact.

## 6. Captions
1. **2-3 word chunks** (the script's " / " splits), one CAPS key word per chunk in the key colour, Poppins Black 96 px,
   centred at 0.70 of the game view, max 840 px wide; each chunk pops in and cuts out hard on the next; quotes keep
   their quote marks. (`"captions": "word"` gives one word at a time.) **Every spoken word is captioned**, narrator and
   characters: its line's caption is on screen while it's said, every caption word is shown, and the take says the
   caption text. Check: `scripts/caption_av_check.py` coverage (BLOCK; in `./hb check`, before the render with
   `--events`). r:r61d371 (supersedes r:rbd7cb6)
2. **Each speaker's colour matches the character's vibe** (`color` in voices/cast.json; the narrator white); the word
   colour only says who is talking, a key word is a bar under it. r:r62fae3 r:r0cff17
3. **No name tags**: the colour alone says who speaks (story_track default; `"name_tags": true` only for a test).
   r:r62de46
4. **Join/leave chat lines are centred** ("Buh joined/left the game", any payoff system chat): horizontally centred
   near caption height, vanilla yellow chat font and strip at `chatScale`, never over the shot's subject. Check:
   review (stills). r:r0d7fd3

## 7. Audio
The lead's mix (docs/audio.md), all of it in `edit.py --story` (previews included: what the owner reviews is what
gets posted; publish only writes the credit): voice -15 LUFS, master **-14 LUFS +-0.5, true peak <= -1 dBTP**, room
tone (never digital silence), a Kevin MacLeod mood score (CC BY, credited; not NCS) from story.json `mood`, **~14 dB
under the voice while it speaks** (the owner's reference: 13.8 dB, constant), out 0.45 s before the payoff, then a
hit, and **no music after the payoff**. **No whooshes** on cuts; the riser soft (peak -24 dBFS). Every visible action
has its vanilla sound (mob voices, steps, splashes included) and every shot its ambience; nothing but the voice
covers a word (the clarity guard). Any owner note on a track or level overrides it.
Check: `python3 scripts/audio_measure.py out/<name>.mp4`; `python3 scripts/onscreen_sfx.py <rec> --strict` (visible
actions left silent). Every sound is one the picture leads the viewer to expect, and none jumps out over the voice;
a sound that makes the owner stop is a blocker. Check: review (listen). r:rc85ccc r:r36632d r:rf484cb
Stunt Shorts (NCS bed): a sound the game hinges on (edit `keySounds`, e.g. guess the mob's call) is **>= 8 dB over
the music** (owner, 2026-11-11, guess_sound: "had super loud music"); the song ducks to -24 dB under it at publish.
Check: `python3 scripts/key_sounds.py <name>` (BLOCK in add_song.py and in pace on the package).
Stunt Shorts' NCS bed sits **about 3 dB lower than before (-16 LUFS against the game's -15)** so the game's own hits
carry the payoff; every ready, not-yet-uploaded Short is remixed to it. Check: `python3 scripts/key_sounds.py <name>
--hits` (the game's biggest hits vs the music). r:r662041

## 8. Pacing (pace, on the finished mp4)
- **Hook**: the first word by **0.2 s** (BLOCK after 0.4 s); the picture moving from frame 1 (frozen first 0.3 s:
  BLOCK); sound by 0.3 s; a hook that works muted (a striking picture) and with sound (a line that makes you ask why). r:r350819 r:rcb4ffc
- **No dead air**: a new event (cut, caption, line, hit, motion) at least every 2 s (WARN), never a 3 s gap (BLOCK). r:rcb4ffc
- **Build-up** escalates toward the payoff (cut rate, loudness, stakes); the last third doesn't sag (WARN). r:rcb4ffc
- **Payoff**: one clear picture change plus a sound hit within 0.3 s; set story.json `"payoff": "L18"`; the end
  **<= 1.0 s** after it (1.2-1.8 s for a text payoff), with 0.2-0.3 s after the last word. r:rcb4ffc r:rfd98bb

## 9. Review
- An **independent reviewer** runs the short-review skill (subagent, or a fresh session); `./hb review` prepares it
  (qa_frames, beat_audit, pace, owner, voice edges in one report) and records the verdict.
- **Pace BLOCKs are review blockers.** Fix blockers only; nitpicks go in the notes. **2 rounds at most**: a blocker
  that survives round 2 goes to the owner/lead, never a round 3.
- A finding that has happened before becomes a rule (cinematic-style "Mistakes already solved", or the house rules).

## 10. Publish
- **Playlists**: one ("All Buh Stories") at launch; a series playlist only once a family has 3+ stories. Check: owner.
  r:r118f0b
- **Explore first, then double down**: early stories vary premise family, arc and outcome (never two in a row the
  same); a Short at 5x the channel median gets 2-3 standalone follow-ups in its family within 7 days. Check: owner,
  the weekly numbers. r:r1bebb1
- **Stories go to the second channel by default, "Buh Stories" (@BuhStoriesMC, r:re8ac1e)**; uploads there wait for the owner to set that channel
  up. Check: owner. r:r732bc0 r:rd63b43 (HelloBuh may also post stories as experiments, set per package with `channel: hellobuh`)
- **Each story stands alone**: no "one world / every story connects" framing in titles, descriptions or channel art.
  Check: owner. r:rca5363
- **No series number**: no "BUH STORY #N" on the video or in the title; frame 1 shows only the story's hook.
  Check: owner. r:rc0d90d
- **No "told by someone who lived it"** in the channel description or promise. Check: owner. r:r808cba
- **Buh Stories uploads are manual for now**: an OK'd story goes to the owner as the mp4 plus a paste-ready title,
  description, tags and pinned comment; the Buh Stories uploader stays off. Check: owner. r:r09130c
- **Buh Stories is on its own Google account**: its upload token comes from that account (docs/upload-setup.md).
  Check: owner. r:r8269ea
- **The channel description is short and general**: no per-story details, no @HelloBuh tag, no Mojang disclaimer.
  Check: owner. r:r111d46
- **The channel says "stories"; the stories are mysteries**: the channel's name, tagline and description are general
  ("Buh Stories", "short minecraft stories"); each story keeps the mystery test, and its own title, description and
  pinned question may set up its mystery. Check: owner. r:rae1fcc r:rbddb28
- **No new stories while held ones are unfinished**: the daily story producer stays off until the owner turns it back
  on. Check: owner. r:r77977b
- **Check the numbers every 2-3 days from Studio**: Claude in Chrome runs docs/studio-metrics-prompt.md (viewed vs
  swiped away, retention, traffic, busiest hours); `scripts/studio_import.py` loads it into uploads/studio.json.
  Check: owner. r:r1f2a80
- **Rank by views x conversion, and diagnose a flop before blaming its format**: the uploader orders formats by
  expected subscribers per upload; a Short that stalls gets its execution checked (music level vs voice/key sound,
  the first 1.5 s, readability) and the same fault fixed in queued Shorts of its format. Check: youtube_upload.py
  (scores), the numbers check. r:rd56a20
- **Format "mega" (owner's pick, an experiment)**: a huge generated build on screen from frame 1, an understated
  caption held on top, an elytra fly-around ending inside it; original structures and wording, never a copy of the
  reference Short. Check: owner, the numbers check. r:r8bb1e3 Variant: a time-lapse build-up under an understated request ("we need a small castle"),
  escalating to the full reveal. r:r4449f0
- **Format "interrupt" (owner's pick, an experiment)**: plays straight as a normal video; a mob interrupts; the
  player handles it absurdly, then goes back as if nothing happened. Original premise, never a copy. Check: owner. r:re05b89
- **Format "mislabel" (owner's pick, an experiment)**: a parkour/dropper hook in the first second, then a numbered
  list of giant builds with funny wrong labels; always clean (no innuendo, nothing crude). Check: owner, review. r:r05c651
- **HelloBuh stunts use the bright look by default**, tuned for daytime gameplay (no blown-out sky). Check: owner
  A/B stills. r:r8fa348
- **Format "logic"**: rapid real vanilla quirks, each set up and paid off in seconds, one caption. Check: owner,
  minecraft-audit (every quirk must be true vanilla). r:r40f7c7
- **Format "fakemod"**: normal gameplay, an absurd fake mod popup at the key moment, the choice plays out; our own
  mods and menus. Check: owner. r:rd551de
- **Format "faketrick"**: an impossible "secret trick" played straight as real; the trick alone is exempt from the
  vanilla rule, the rest of the Short is vanilla-correct. Check: owner, minecraft-audit (all but the trick). r:rfcab11
- **Format "cells"**: a walk past glass cells, each a mob stuck in an endless vanilla-built loop, a deadpan caption.
  Check: owner. r:r07d791 Every cell traps a mob (never the player or a machine). r:rce72cb
- **Format "race"**: two vanilla spreaders race across one field, top-down time-lapse. Check: owner. r:rbe60ef
- **Every format the owner sends is saved in docs/formats.md** (reference, owner's words, family, rule, status), in
  the same commit as its house rule. Check: owner. r:rc43770
- **Finished videos live in GitHub Releases, not git history**: the videos branch keeps metadata and the uploader
  downloads each mp4 from its release (keeps the disk from filling). Check: owner. r:rc5eaf0
- **Format "hack"**: one real, clever block trick per Short, a "POV: you realized..." caption, working on screen in
  the first 1.5 s. Check: owner, minecraft-audit (the trick must really work). r:rc15847
- **Format "cooked"**: an impossible feat, then a flood of "X joined the game" as the consequences arrive, over a
  dramatic still, timed to one specific track. Check: owner. r:r5ee125
  Music: a similar NCS track; the still: the real meme photo, cached from a logged URL, never committed. r:r12cb71
- **Format "quest"**: the whole Short is the escalating way down to one secret chest, opened only at the end.
  Check: owner. r:r4b458d
- **Format "love"**: a cute heart build revealed at night (lamps, fireworks), made to be shared. Check: owner. r:rf91fef
- **Format "lucky"**: every next block impossibly luckier than the last, vanilla mechanics staged by the set.
  Check: owner. r:r934ea4
- **Format "inside"**: a short walk from a detailed interior out to an exterior that can't contain it, the cut
  hidden (a door, a dark frame), about 8-12 s, built for replays. Check: owner, review (the cut must not show). r:r9a54b2
- `./hb publish` needs a READY verdict on the current render (newer than the recording) and `--notes`.
- **Stories are packaged held**: `--pass` gives a story_* status "held"; it goes out only after the owner OKs that
  story by name, in person (the lead then re-runs publish with `--owner-ok`). A relayed or general "go ahead" never
  posts a story. Check: publish.js (status), youtube_upload.py (posts "ready" only). r:r016732
- Mark the premise `made` in docs/stories.md. Don't edit the upload queue; the older stories keep posting. r:r62fae3
- **New owner rule** (any session): add the dated quote to docs/stories.md "House rules" on main, and update this file
  in the same commit (the standard, its number, its check, `r:<key>` from `./hb rules --log`, and the "Updated:"
  stamp). `npm test` (`node --test 'lib/hb/test/*.test.js'`) and `./hb rules --check` fail until both agree.

## Superseded (history only; do not apply)
- **4.5 words/s as a speed target** (r:r961104, its speed part): replaced by "speed is not a target" (r:r00f92f). Its
  no-pauses-in-the-opening part stands (Voice 4).
- **The 1.45x sped-up Kokoro narrator** (`am_adam`, scripts/voice.py; docs/stories.md "How it fits together"), and
  "no sped-up voice, a cast" as an open question (r:r4b4332): the cast narrator is Voice 1.
- **Pip as the default narrator** (r:r5519b8 r:rb9756b: Leda, natural tempo) and "the voice's natural speed (not a
  sped-up file)" (r:r1ed23c's last clause): replaced by the Roblox narrator, Orus x1.45 (r:r63a3a1, Voice 1). Pip
  stays a named alternative.
- **Leda at 1.5x tempo +1.5 semitones** (the kid-narrator audition; still in the docs/voices.md table): replaced by Pip's
  natural tempo (r:rb9756b). "A kid narrator is Leda (cast `child`)" (r:r810b66): Leda is the `narrator` now and `child`
  is Laomedeia.
- **Kid Puck as the default narrator** (r:rc4689d, r:r710834, Good Boy session): Pip is the narrator again (r:r5519b8);
  Puck is `puck_kid`, an alternative.
- **Captions of 2-3 words** (r:re512f6; cinematic-style "words per chunk"): one word at a time (r:rbd7cb6).
- **Captions lead the word by 0.1 s** (r:r221d0a, `CAPTION_LEAD = 0.10`) and Whisper word times: captions land on the
  word, forced-aligned (2b.3, r:r27d123).
- **40-75 s stories** (docs/stories.md intro): 30-45 s (Script 9).
