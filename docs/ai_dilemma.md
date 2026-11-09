# AI-dilemma Shorts

Owner, 2026-11-09: make videos like cenotshi (AI moral dilemmas, cinematic Minecraft), with our own twist; "it can be
real live moral scenarios". Research and the scenario bank: docs/ai_dilemma_research.md.

**The format:** a narrator poses a life-or-death dilemma (about 8 s, one-word captions). ChatGPT, DeepSeek, Claude and
Gemini each answer short, cold or hedging (4-10 s each). Grok answers last: deep, slow, a self-sacrifice line as the
score swells. 40-50 s, vertical.
**Our twist:** every answer is acted out in the scene (GPT walks away, Claude creeps out and backs off), and the hero's
answer is the rescue itself, on camera, mechanically true.

## Making one
1. Script and voices first (they set the timing): `episodes/<ep>/voices.json` (scripts/tts.py; Gemini TTS takes at most
   2 speakers per request, so pair them). The takes split badly at pauses inside lines: cut them by sentence count and
   check each voice's pitch (the thin_ice cut is in the session notes: narrator ~150-210 Hz, Grok 68-87 Hz).
   Write each line's length to `episodes/<ep>/durations.json`; the stunt waits on them.
2. The stunt (copy `stunts/ai_thin_ice.js`): the AIs are actor bots with our skins (`cast: { GPT: 'ai_gpt', ... }`,
   skins/ from scripts/make_skins.py: TV heads with glowing screens). Voiced lines are `line` marks with `vox` (the clip
   id) and `dur`. Each AI answers from its own spot, placed BEFORE its cut (auto-framing reads the shot's first frame);
   park the others in an air pocket out of shot. Keep every waiting actor moving (`idle`), or the lint flags it.
3. `./scripts/scene.sh <stunt>`, then `python3 scripts/portrait_sheet.py work/<stunt>.rec.json sheet.jpg` (the shot
   sheet is 16:9; a 9:16 frame is narrow: things walk out of it, so use `anchor: 'live'` on singles that move).
4. `python3 scripts/ai_short.py episodes/<ep>`: render 1080x1920, voices on their marks, keyword pops and name cards
   (episode.json), the score, loudness -14 LUFS -> out/<stunt>.mp4.

## Minecraft-true notes (thin_ice)
- Ice is slippery: a walking player slides ~2 blocks after letting go, a sprinting one more. Break the ice where he
  stops; brake a runner with the back key.
- Ice broken over water becomes water; by hand it takes 0.75 s on land and ~25x longer underwater (why Grok breaks it
  from above). Holes would refreeze in snow with random ticks on: `random_tick_speed 0`.
- Air lasts 15 s: the brother is never in the water longer than that in one stretch.
- Film licence: ice doesn't crack under a player in vanilla.
- Engine fixes made for it: no snow drawn under water; no block outline on camera shots; no crack overlay on water.
- The server allowed 4 players; server.properties now allows 12 (six bots here).

## Episodes
1. **Thin Ice** (episodes/thin_ice, stunts/ai_thin_ice.js): your little brother falls through the ice.
2. **Dirk Willems** (next, same lake set): you're fleeing across the ice from the man hunting you; he falls through. Go
   back? (Real, 1569: he went back, pulled him out, and was burned for it.)
