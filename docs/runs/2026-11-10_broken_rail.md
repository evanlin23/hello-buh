# 2026-11-10 broken_rail: PAUSED before voicing (owner: "focus on fixing what we have")

Branch `claude/story-broken-rail`. Not voiced, not recorded for real, not rendered, not published.

## State
- **Script r5** (story.json): 9 lines, 84 words, ~34 s. Mystery test: critic r3 REVISE 7.3 -> r4 APPROVE 7.8
  (reviews/r3-critic.md, r4-critic.md); cold reader passed the hook, the midpoint guess (55%) and the one-sentence
  reveal. Open owner call: ~4 s from the reveal ("Still facing HOME") to the end; the literal option ends on the
  Grandma close-up (~29.5 s).
- **Voice**: waiting for the lead's new narrator voice + recipe (owner wants a Roblox-story style voice). The two
  Pip beats voiced earlier (L01-L02, L03-L06 of the old script) are obsolete. `voice_takes: beat`, per-beat requests r1-r4,
  Grandma r5 (Gacrux). Gemini free tier: 10 TTS requests/day per model; long bracket directions get read aloud.
- **World**: rail_town (-318, 117, -770) and rail_crater (-2116, 79, -96) claimed in docs/world/map.json.
- **Stunt**: stunts/story_broken_rail.js staged to r5; dry run on placeholder timing (scratchpad fake voice.json,
  not committed): `./hb check` 0 blockers. Re-tune S11b/S12b cameras on the real timing.

## Shared work
- On main: 58e8ebd (station piece, sets.dress.rails, world stamps rails/ravine/crater, first:true), fa42bb9 (canopy),
  1a9e91f (empty sign names skip the sign).
- On the branch only (needs an Actions render before main): riders drawn seated in a minecart (render.js,
  renderer/entities.js `seated` pose, lib/hb/scene.js), scripts/take_gate.py max_pause per kind, run.sh op for Buh.

## Lessons
- In-stunt `/setblock`/`/fill` with `toFixed` coordinates fail silently ("Invalid integer"): keep whole numbers whole.
- A carve stamp must run before the pieces it spans (`first: true`); a 4-high rail cutting leaves overhangs.
- Entities 1,900 blocks away aren't in bot.entities until the bot is there: look them up after the cut.
