# Overnight log, 2026-11-10 (lead session)

For the owner's morning. Newest at the bottom.

## Before midnight Central (to 07:25 UTC)
- On main:
  - Milo rename;
  - owner-note checks (`./hb owner`);
  - pipeline-test tool fixes (test-gaps);
  - pacing gate (`./hb pace`): hook, dead spots, build-up, payoff, length; first word by 0.2 s, no pauses in
    the first 5 s, one-breath line 1, speaking rate vs 4.5 words/s; Runaway passes clean.
- House rules added (docs/stories.md, top):
  - pacing;
  - the out-of-context/ASMR read;
  - narrator-first with "said" tags (research: 26 channels, ~11.5k Shorts);
  - a bubbly fast kid narrator (Leda);
  - no "..." in scripts;
  - endings explain themselves;
  - build missing engine features;
  - caption colours match the speaker;
  - keep the old stories posting.
- Good Boy is held (owner: reads as ASMR). Its session is reworking it to about 40 s, narrator-first.
- Dog on the Hill: the owner gave notes in its session. Being re-voiced (Pip = Leda, one-breath opening), then
  re-recorded and rendered.
- Light Sleeper and Thirty-One Raids: build sessions started with the continuity fixes, critic should-fixes and all
  the new rules.
- THE KEEP (the cinematic showcase) was sent to the owner. Owner note: "parts with the light are a bit blurry". Being
  fixed (bloom, rays, DoF, encode), and its branch is being merged with main.
- agent/ergonomics is done:
  - data-driven poses (sit, drink, eat, use, point, wave, kneel, lie...);
  - off-hand items and armour;
  - the chest/container screen;
  - campfire smoke and the warden emerge;
  - `./hb map`, `./hb rules`, render branches, server robustness, doctor checks, docs/engine_features.md.

  Existing Shorts render pixel-identical. It's being smoke-tested on a live server and Actions in a separate session
  before it merges.
- Running:
  - speaker check plus caption colours (with `./hb voice` as one Gemini path);
  - audio standards (music, SFX, on-screen sounds, mix);
  - look standards (font, captions, grade, lighting, sets, characters, on-screen effects);
  - the voice realism and kid-narrator audition;
  - the set library.
- 07:30 UTC: merged the set library (`lib/sets`, docs/sets.md): 14 dressed pieces that land on natural terrain,
  vanilla structures, dressing and camera helpers. Its demo village (out/sets_demo_sheet.jpg) is much better than the
  old flat clearing, but the stepped grass terraces under the houses look fake and something floats in the sky.
  Round 2 (agent/sets-2) fixes those, improves site choice, adds a tavern, mill and dock, and fixes run.sh's startup
  race. The orphan server (pid 7073) is gone.
- 07:40 UTC: merged voice realism (56d1201).
  - New TTS: 3.1-flash-tts with a structured prompt, breath padding, no pitch shift.
  - New roster: the kid narrator is Leda at 1.5x tempo with a slight pitch lift that keeps formants; storyteller
    Despina; elder Charon; child Laomedeia.
  - Sent the owner the kid-narrator audition (pick #8; #3 sounds more natural but older) and the realism A/B.
  - Owner decision for the morning: #8 or #3.
  - The shared TTS quota ran out today and resets at 08:00 UTC; story sessions wait for it rather than falling
    back to old voices.
- 07:50 UTC: the owner liked Dog on the Hill's Pip voice ("the current ones seem too sped up"). The narrator is now
  Leda at natural tempo, with no stretch or pitch shift (354482f).
- Merged the audio standard (051142e, docs/audio.md):
  - a clearer voice chain;
  - Kevin MacLeod CC BY mood scores instead of NCS for stories, credited;
  - ducking;
  - a riser, drop-out and hit at the payoff;
  - room tone, so there's no dead silence;
  - on-screen vanilla sounds filled in;
  - a master at -14 LUFS / -1 dBTP.

  Sent the owner the A/B on runaway and nitwit.
- Owner decision for the morning: the new mix vs the old one (A/B), and any music track to veto.
- 07:46 UTC check-in. Everything is moving:
  - Good Boy: re-recording v14 at the natural-tempo voice.
  - Dog on the Hill: re-aiming its shots off flat ground, then re-recording.
  - Light Sleeper: running.
  - Thirty-One Raids: script r4 is narrator-first; it re-voices at 08:00 when the TTS quota resets.
  - The ergonomics smoke test: main merged in, now checking the chest-screen frames.
  - Engine round 2 is queued (docs/engine_requests.md backlog); it starts once ergonomics and cinematic are on main.
  - Audio: the owner left the mix to the lead, so the new mix stays.
- 07:55 UTC: Pip's exact setup is now the cast narrator (23146e3, de6c94a).
- Merged the look standards (7b101ab, docs/look.md):
  - captions in Poppins Black, max 840 px wide (clear of the like column);
  - mood grades village_day / golden_hour / eerie_night / tense, with `look: 'auto'` following the time of day;
    night is no longer crushed to black;
  - framing sizes (a medium-shot subject at least 45% of the game view);
  - lighting rules (a lantern within 4 blocks of every face at night);
  - a casting guide and a set readability checklist;
  - no text or emoji pops (top story channels use none).

  Non-story Shorts render identically. Sent the owner the font sheet, the grade before/after and the effects sheet.
- Questions for the owner's morning:
  1. Font: Poppins Black OK?
  2. Captions: test one word at a time (Xenost/Ashyyy style) vs 2-3 words?
  3. The kid narrator: settled (Pip).
  4. The audio mix: the lead's call (new mix).
- 08:00-08:20 UTC:
  - Merged agent/ergonomics: poses, off-hand items, armour, chest screen, smoke, the warden emerge, `hb map`,
    `hb rules`, render branches, server robustness. Smoke-tested on a live server and on Actions.
  - Owner: 4.5 words/s is not a target any more; Pip's natural tempo is the reference, and pace never blocks on rate.
  - Owner: "voices cut stuff off". The cause is Gemini takes split at Whisper word starts plus splices inside lines.
    New cutting rules, scripts/voice_edges.py, and pace blocks a line cut by the end or overlapping the next.
    The speakers agent is making `./hb voice` cut safely, with a listening check. Good Boy and Dog on the Hill are
    re-cutting from their raw takes.
  - Merged sets round 2 (e99250d): a builder's fit (retaining walls, stairs, natural edges; no stepped pyramids),
    whole-layout site choice, the floating tower fixed, a tavern, windmill and dock, and run.sh's lock plus per-run
    log (no more server collisions). Sent the owner the before/after.
- 08:20-08:50 UTC:
  - Narrator: the owner tried kid Puck in the Good Boy session ("er that does not sound right"), then went back to Pip
    ("a lot a lot better"). Pip is the default narrator again; the recipe is in voices/recipes/pip.md (Leda,
    3.8-flash-lite, single speaker, no post filter).
  - Owner: voices drift take to take. New rule: one model per character, short requests, identical direction. A drift
    gate is being built (agent/voice-drift), including a tts.py cache bug where a fallback model's take was stored
    under the first model's hash.
  - Merged the speaker check and colour captions (a4a4b72): SWAP/WORDS/EDGE/CLIPPED blockers, safe cuts, `./hb voice`
    as the one Gemini path, one-word captions coloured by speaker with name tags. Sent the owner the caption sheet.
  - Merged the viewer panel (cffa636): `./hb panel`, three Gemini viewers watch the Short. It caught the old Good Boy's
    ASMR read and its wrong-sounding voice, and passes runaway. Two caveats: it doesn't judge length, and it uses 2
    text-model requests per run.
  - Two resplit cutters are being reconciled into one (agent/cut-reconcile).
  - The writers' room session is filling a bank of 6 scripts. Ergonomics round 2 is building STANDARDS.md and
    `./hb make`. The shared-world canon is in progress.
  - Thirty-One Raids: picture final; it's re-voicing the narrator with Pip.
  - Good Boy: re-voiced with Pip and the speaker check is clean; re-recording, then render.
  - Dog on the Hill: re-cut with no clipped words; rendering.
- 08:50-09:15 UTC: merged to main:
  - Voice drift gate (9ef7104): `./hb drift`, locked references in voices/refs, one model per character, the model in
    the cache key, drift re-takes. The OpenVoice voice converter was tested and not adopted.
  - Ergonomics round 2 (d9f17d4): docs/STANDARDS.md plus a sync test, `./hb make`, render frame reuse, one review
    report, about 30 error fixes. Owner to delete the test branches render/hbtest_reuse and
    agent/ergonomics-2-render-hbtest (the proxy refuses deletes).
  - The shared world (3d3a5c7): docs/world/canon.md (12 places, a timeline, recurring characters, 10 cross-story
    links, 17 conflicts resolved), seed hellobuh, map.json, `./hb world`. Sent the owner the world map and the
    Dog Hill still.
  - Cinematic (41b7eaf): THE KEEP's blur fixed (no DoF on wides, tighter bloom, rays off the blocks, sharpening,
    less grain, a sharper phone encode). Sent the owner the before/after.
- Engine round 2 started (agent/engine-2).
- Good Boy: Sam re-voiced on one model; drift 0 blockers.
- Disk: 1.7 GB free. 2.7 GB of stale /tmp/hb-edit-* folders need the owner's OK to delete (the permission check
  blocked it).
- 09:45 UTC:
  - **Dog on the Hill is published** (videos 2802d3a1, 52.75 s, Pip voice, its own note-block score). Review round 2
    READY; pace, the owner gate and drift all at 0 blockers. Sent it to the owner and added it to the review page.
    The viewer panel heard Pip as a "breathy young man". It's kept because the owner approved the voice; worth an
    ear check.
  - The two voice cutters are now one on main (e9e8e88): 0 CUT on 89 test lines.
- 09:50 UTC: the writers' room bank is merged to main (a863826).
  - Approved: Gold for the Portal 8.3, The Broken Rail 8.0, Names in the Woods 8.0.
  - Reserves: Slow Falling 7.9, Six Thousand Torches 7.8, The Scarecrow 7.7.
  - Each is placed in the shared world with its own family and an easter egg. Some need small engine features
    first (listed in each set.md).
  - The critic flagged too many lost grandparents across the bank, so spread them out when scheduling.
  - Build order when a slot frees: Gold for the Portal, then Names in the Woods, then The Broken Rail.
- Light Sleeper: its first render failed pace (nothing on screen at the payoff, a 2.8 s tail). It restaged the ending
  (the warden bursts up during the line, the boom is the payoff) and is re-rendering.
- Thirty-One Raids: recording 14 passes check; rendering.
- 10:05 UTC: merged engine round 2 (8d891d0). Everything is opt-in; existing Shorts are pixel-identical.
  - `look.smoothLight`: smooth dusk light in the shader; lightning and held torches light blocks and mobs.
  - `look.moonlight` and `look.torchGlow`.
  - Moon phases and drifting fog wisps.
  - `look.motionBlur`.
  - `stunt.lookAtSpeaker`, `M.headTo`, sleep and shake poses, `stunt.nameTags`.
  - A mesh cache: stills about 2x faster.
  - A mob audit: 76 of 89 drawn. Still missing: goat, camel, axolotl, armadillo, breeze, creaking.
  - Not done: Nether/End ambient particles, a wet look in rain, vertical camera helpers.
  - The Good Boy "black square" was the cast's waiting-room roof, now hidden with `hideBoxes`.
- Good Boy: review round 2 left 2 blockers (the sky square, zombie smoke at the reveal), both fixed. A final
  independent check of those two spans plus `hb panel` follows the re-render. Held for the owner.
- 10:47 UTC:
  - **Thirty-One Raids is published** (videos 2f286e3, 45.0 s). Independent review: 0 blockers. Pip narrates;
    Grandpa has 2 own-voice punchlines; real sit, drink and chest screen. Sent to the owner; it's on the review page.
  - Light Sleeper: review round 1 found an edit-only fix (end S11 near 31.4 s, start the S12 crane on "ECHO") plus a
    trim toward 45 s; it's being re-edited.
  - Started the Gold for the Portal build (session_019n1tKFps1v8fgz5VZis629).
- 11:10 UTC:
  - **Good Boy final cut is done and held, NOT published** (render/story_good_boy 563bd62, 40.85 s).
    - Checks: review READY after a final independent check; rec_check, pace, voice_edges, speaker_check and drift
      all at 0 blockers.
    - Panel: the final cut couldn't be run (all Gemini text models at 429). The previous cut had 0 blockers; 3/3
      heard Pip as breathy.
    - Sent to the owner and added to the review page as "held".
    - **Owner decision: publish or not.**
  - Merged K.cut(..., {shot}) to main (aa12714).
  - Started the Names in the Woods build.
- 11:45 UTC:
  - Light Sleeper: review round 2 left 1 blocker (the sonic boom's beam is never visible while Milo is alive). Lead
    decision: re-stage the payoff so the beam is on screen for 0.4 s or more before the hit, then one focused
    independent check of that span, then publish.
  - Gold for the Portal: staging (cottage hatch, garden shots).
  - Names in the Woods: re-recording after a pixel-identical rule-zero check.
