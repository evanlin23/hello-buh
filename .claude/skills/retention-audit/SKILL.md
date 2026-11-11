---
name: retention-audit
description: Audit a finished HelloBuh Short for retention and virality - hook, buildup, payoff, dead space and the ending. Use on every Short before `publish.js --pass`, alongside the minecraft-audit and the frame review, and when designing a new stunt or story.
---

# Retention audit (hook -> buildup -> payoff, no dead space)

A Short lives or dies on whether people keep watching and re-watching. This audit checks the
*structure* of the video. The frame review (`docs/reviewer_prompt.md`) checks rendering bugs, and
`minecraft-audit` checks game correctness. Run it as an independent agent if you can: the one who built
the Short is the worst judge of their own pacing.

Owner rules (2026-11-06):
- "without any dead space";
- "we should end as soon as the payoff comes";
- at least 30 s, built from several escalating beats, not one long wait ("I would prefer like 30 seconds at least");
- held reveals are bad ("we land on the reveal for the pixel art for a while").

## Inputs
- `out/<name>.mp4` and the stunt module `stunts/<name>.js` (caption, `edit` block, marks).
- `./hb pace <name>`: the hook, dead spots, build-up, payoff and length measured on the mp4 (BLOCK/WARN with times and
  fixes; scripts/pace.py). Start from its lines, then judge what it can't (does line 1 make you ask why?).
- `python3 scripts/beat_audit.py <name> [--payoff EVENT]` gives:
  - the stunt marks at their video times;
  - gaps between beats;
  - motion per 0.25 s;
  - STILL / PAUSE / LOW stretches;
  - the payoff-to-end tail.
- `work/qa_frames/<name>/sheet_*.jpg` (every 6th frame); pull full frames with ffmpeg where needed.

## The checks (each one PASS / FAIL with timestamps)

**1. Hook (0-1 s).** Freeze the frame at 0.5 s and 1.0 s. Could a viewer scrolling past say what this
video is about from the picture plus the caption alone?
- The thing the caption promises is ON SCREEN by 1 s: the hole, the creeper, the villager, the
  lava.
- The first frame is not a static establishing shot: something is moving or changing in the first 0.3 s.
- The caption states a question, tension or promise ("1 in a million landing", "POV: ..."), not a
  description. A story's line 1 states the mystery plainly.
- FAIL if the subject is too small to read (a 4 px target under the crosshair), off-screen, or only
  arrives after 1 s.

**2. Buildup (hook -> payoff).** List every beat with its timestamp: a new event, an escalation, a reveal or a
change of shot.
- Something new at least every ~2 s, and never more than 3 s without a beat (beat_audit flags the gaps).
- It escalates: each beat is bigger, closer, faster or funnier than the one before. A repeated beat with
  no escalation reads as a loop (villager_job round 2: a second identical hire/fire cycle).
- Tension is visible: the target growing, a timer, a fuse, a counter, a closer call.
- No STILL (>= 1 s frozen) or PAUSE (0.5-1 s frozen) anywhere. Every PAUSE needs a reason the viewer
  would feel (a beat of silence before a drop is fine only if something still moves).
- LOW stretches (the shot moves, nothing happens: idle sway, slow pans over empty ground) count as dead
  space unless they build tension.

**3. Payoff.** Name the payoff frame. Check that:
- it is the biggest moment in the video, and it LANDS: a visible effect (splash, explosion, outfit change,
  reveal) and a sound or the song drop on it (`dropAt`);
- the camera is moving or reacting at that moment, not frozen. A freeze on the payoff reads as a
  glitch (one_in_a_million: 0.8 s frozen on the water after the splash);
- it can be read without sound.

**4. Ending (payoff -> last frame).**
- The video ends **<= 1.0 s after the payoff** (beat_audit's tail). Keep only enough to show the result
  register (the landing held, the hearts still full). Anything longer is a FAIL: change `endAfter`.
- No still frames at the very end; the last frame is mid-motion or on the result.
- One exception: a payoff that is *text* (a death message, a rating card) gets reading time, about
  1.2-1.8 s depending on its length, and the camera or screen keeps moving while it is up. Say how
  long the text is and how long it stays.
- Loop bonus (note it, don't fail on it): a last frame that cuts back into the first frame well
  makes people re-watch. Stories should loop back to line 1.

**5. Length and density.**
- **30 s minimum** (owner rule). Under 30 s is a FAIL. The fix is more beats, not slower ones: turn the
  stunt into an escalating series, a ranked list, X vs Y vs Z, or a story.
- Over 30 s, every beat must still earn its place. If a beat could be cut without losing anything, it's
  padding: FAIL, and name it.
- Count the beats: aim for 3+ per 10 s. A 30 s Short with only one payoff at the end needs visible tension
  the whole way (a timer, a counter, a growing threat).
- Each beat has its own mini hook -> payoff, and the beats escalate toward the final payoff.

**6. Re-watch value.** One line: why would someone watch it twice or send it to a friend? (The
ridiculous scale, the twist, the close call.) If you can't name it, the concept needs work. Say so;
it's not something the renderer can fix.

**7. Camera motivation (watch it once at real speed, as a viewer, before any frame review).** Every
camera move has to have a reason the viewer can see: a sound, a mob, the next beat, the thing being
built. `beat_audit.py` lists every big look swing ("camera turns": 40+ degrees out and back, or 70+
one way, outside cuts). For each one, name what on screen motivates it, or FAIL it. A move that was
*scripted on purpose* still fails if the viewer can't see why (the owner, 2026-11-07, on all five
pixel-art Shorts: "a weird moment where you turn to the left while creating the big one". It was a
planned "glance back for scale" that every review had passed). Turning away from the subject in the
middle of building it, or from the payoff, is a FAIL.

## Report
A beat timeline (timestamp, beat, motion OK?). Then each check with PASS/FAIL and the exact fix:
- new `startAt` / `endAfter` values;
- a beat to add or cut;
- where the camera should move instead of holding.

Verdict: **ready** or **not ready**. Any FAIL in checks 1-5 means not ready.

## Common fixes
- **Late hook:** `startAt: 'EVENT:-1.0'`, aim the camera so the subject sits beside the crosshair, not under it.
- **Freeze on a wait or after the payoff:** add a glance, a step or a look-up in the stunt (`ctx.easeLook`). Waits get motion.
- **Long tail:** `endAfter: 'PAYOFF:0.8'`. A blast or fall payoff: `endAfter: 'settle:0.6'` (0.6 s after the motion has
  settled: the harness's `settle` mark, lib/settle.js; never earlier, owner r:r24d99a).
- **Flat middle:** escalate (more TNT, a higher drop, a faster cycle), or cut a repeated beat.
- **Weak payoff:** more particles or a bigger effect, the song drop exactly on it, the camera reacting.
