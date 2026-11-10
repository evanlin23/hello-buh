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
