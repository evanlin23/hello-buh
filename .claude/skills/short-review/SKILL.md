---
name: short-review
description: One-pass review of a finished HelloBuh Short (frame review + retention + Minecraft) with a clear blocker/nitpick bar and a 2-round cap. Use instead of running the three audits as separate rounds - on every Short before `publish.js --pass`, and for re-reviews after fixes.
---

# Short review: one pass, one verdict

Owner, 2026-11-10: stories were taking 4-12 review rounds. Most of those rounds re-found the same few
problems or chased nitpicks. This review does all three audits in **one pass by one independent reviewer**,
judges against a fixed bar, and stops after **2 rounds**.

The three checklists still apply. This skill doesn't repeat them; it says how to use them quickly:
- frame review: `docs/reviewer_prompt.md`
- retention: `.claude/skills/retention-audit/SKILL.md` (hook, buildup, payoff, dead space, ending, 30 s)
- Minecraft: `.claude/skills/minecraft-audit/SKILL.md`

## Before anyone reviews (the maker does this; it costs minutes)
1. `./hb check <stunt>` (= `python3 scripts/rec_check.py <stunt> work/<name>.rec.json` + continuity + framing +
   `./hb owner`): cut glitches, held shots, set edges, speeds, pops, cast that moved across a cut, shots too tight, and
   the owner's four review patterns (below), read from the recording. **Fix every blocker by re-recording before
   rendering.**
2. `bash scripts/preview.sh <stunt>`: a low-res preview with the real edit, plus sheets at every cut and
   caption. Fix staging here; there's no need to wait for a full render.
3. Full render once, then `./hb pace <name>` (below), `python3 scripts/beat_audit.py <name>` and
   `python3 scripts/qa_frames.py out/<name>.mp4` (`./hb review <name>` runs all three), and once `./hb panel <name>`
   (the viewer panel, below): give its report to the reviewer.

## The pacing gate: `./hb pace <name>` (after the render; ~25 s, no render)
Owner, 2026-11-10: "we still need to ensure that the pacing is good, and theres still a good visual and audio hook and
build up and a good payoff." `scripts/pace.py` measures it on `out/<name>.mp4` (+ the recording's marks, the caption
chunks, story.json and voice.json when they exist) and prints BLOCK/WARN lines with the output time and the cheapest
fix. **Its BLOCKs are review blockers** (confirm on the frames; a wrong payoff guess is fixed by setting
story.json `"payoff": "L18"` or `--payoff MARK`, not by ignoring the line). WARNs need a reason or a fix.
- hook: first frame not black / a bare card; picture moving or cutting in 0-1.5 s (still opener = BLOCK); sound by
  0.3 s (BLOCK); a line or hit by 1.5 s.
- dead: longest span with no new event (cut, caption chunk, line, sound hit, motion onset): BLOCK > 3 s, WARN > 2 s;
  the picture alone (cuts + motion onsets) WARN > 5 s; the same picture (layout unchanged across small cuts) WARN > 5 s.
- buildup: cut rate, short-term LUFS, the bed under the voice and motion over thirds of 0..payoff: WARN when the last
  third sags on 2+ of them.
- payoff: story.json `payoff`, else the edit's endAfter event, else the death, else the line the `twist` quotes, else
  the biggest hit in the last 40% (a guess: never blocks). BLOCK: no sound hit and no line on it, no picture change
  within 0.3 s, or the end > 1.8 s after it / any line after it (> 2.3 s for a text payoff). WARN 1.0-1.8 s
  (1.8-2.3 s text). A reveal that lands only on a voice line is a WARN (add a sting).
- length: BLOCK < 30 s, WARN > 45 s for a story.
Calibrated on the published stories (2026-11-10): story_runaway (the owner's "good") passes clean; sheep_stares
("hooked but delivery bad") blocks on a silent payoff; respawn_tax ("mid") blocks on a 2.7 s tail.

## The viewer panel: `./hb panel <name>` (after the render; ~2 min, 2 Gemini calls, cached per mp4)
Owner's notes on 2026-11-10 were things a viewer hears and sees and our numbers miss: voices drifting between takes,
words cut off, "so high pitched and annoying", "sensual asmr", a pause in the opening, blurry glow, "what does the day
one mean bro", "is milo a woman?". `scripts/viewer_panel.py` uploads the mp4 to Gemini (Files API through the proxy)
with the line texts (not the twist) and asks three viewers, a 12-year-old Minecraft fan, a casual scroller and a strict
editor, for a JSON verdict: the second each would swipe and why, hook clear in 2 s, every voice as heard (sex, age,
pitch, annoying, intimate/ASMR, drift), timed issues (cut-off word, drift, opening pause, dead air, blurry, dark, too
zoomed, subject missing), what confused them, and the ending explained back in one sentence. A second, text-only call
compares those explanations with story.json's `twist` and the heard voices with the cast's profiles.
- **BLOCK** (a review blocker once you confirm it by ear/eye at the given time): 2+ viewers agree on a cut-off word, a
  drifting voice, a voice of the wrong sex/age for its character, or 2+ explain the ending wrong.
- **FLAG**: everything else it reports (one viewer, annoying voice, ASMR read, opening pause, swipe points, picture).
  Each is a review input: listen/look at that time and decide with the bar below. An ASMR or annoying-voice flag from
  2+ viewers is worth a re-take even though it isn't a hard blocker.
- It is a model listening once: it misses things and invents some (see the calibration below). Never re-run it in a
  loop hoping for a pass: the quota is shared (about 20 requests/day/model) and the result is cached per mp4.
Calibrated 2026-11-10 against the owner's verdicts (prompt v4-5; cache in work/panel/):

| Short | owner | panel (full Flash model) |
|---|---|---|
| story_runaway | good (the benchmark) | 0 blockers; 6-7/10, nobody swipes, hook clear, voice fine; ending FLAG: 3/3 "partly" (they saw the boom but didn't say "I'm the creeper": the reveal has no line) |
| story_good_boy (old cut) | ASMR-like, too long, voice "high pitched and annoying" | **BLOCK**: the narrator heard as a young woman 3/3 (meant a young man); ASMR 3/3 ("breathy, whispery, intimate"; the scroller swipes at 15 s: "feels like ASMR I didn't ask for"); 2/3 confused by "there's this dog"; night shots too dark. Missed "too long" (said "right"; `./hb pace` warns > 45 s) |
| story_sheep_stares | hooked, delivery bad | 0 blockers; hook clear 3/3; ending 3/3 "partly" (two of three invent a clone / "new player"); editor: two swallowed words (1.2 s "sheep's", 31 s "who?"), the payoff rushed (pace.py blocks it as silent), a "slightly hushed" read |
| story_respawn_tax | mid | only a lite-model run (quota): all PASS 8-9/10, i.e. no signal |

So: it catches voice problems (sex/age, ASMR, swallowed words) and a muddled twist the way the owner does; it does not
judge length or "mid" vs "good" (ratings cluster 6-8 for any competent cut), and "partly" on the ending fires on the
good benchmark too: only "no" from 2+ blocks. **Lite models can't tell** (gemini-3.5-flash-lite passed all four
8-10/10, Good Boy included), so they're off the default chain; a report from one says LOW CONFIDENCE.
Cost per run: 2 requests; ~6-7k tokens in (video ~90 tokens/s, i.e. low resolution at 1 fps) + ~3-4k out/thinking,
plus a ~1-4k-token judge call: ~10-14k tokens, about 2 cents at Gemini 3 Flash's paid list rates and free on the
proxy's tier (2 of the ~20 daily requests per model). ~60 s when a model answers at once (upload + processing ~10 s,
watch 20-40 s, judge 10 s); up to ~5 min when it has to wait out busy (503) models.

## The review (an independent agent; give it this skill and the Short)
Work in this order, and stop collecting once you have the verdict's evidence:
1. Read the automatic material first: the rec_check report, beat_audit, qa_frames `report.txt`, and its
   sheets and flag images. Classify every flag as intended (cut, flash, speed seam) or real.
2. Watch the structure: the first 2 s, every cut (frames -3..+3), every caption/card change, the payoff
   and the last second. Extract full-resolution frames only where something looks wrong.
3. Run the retention-audit checks (hook, beats ≤3 s apart, payoff, end ≤1 s after the payoff or 1.2-1.8 s
   for a text payoff, ≥30 s unless the owner allowed less).
4. Run the Minecraft-audit checks on what's on screen (mechanics, mobs, items, HUD, physics).

## The bar
- **BLOCKER**: a normal viewer watching once at full speed on a phone would notice it, or it breaks an
  owner rule. Examples:
  - a glitch or snap at a cut;
  - the camera parked ≥0.6 s with nothing happening;
  - a caption or card covering the thing the viewer must see;
  - a dead or still ending, or one more than 1 s after the payoff;
  - the payoff not readable;
  - clearly un-vanilla behaviour (wrong mob, impossible physics or dig speed, missing HUD);
  - an "accident" with no visible in-game cause (owner: "you can't really trip in Minecraft, so it just looks like
    him intentionally walking into the lava");
  - black or void terrain, a cut world edge in shot, a broken render;
  - under 30 s without the owner's OK;
  - the story not understandable without pausing;
  - **a line in the wrong voice** (a character's line read by the narrator's voice or the other way round, owner
    2026-11-10: "make sure the voices are distinct and correct"), a word in the wrong line, a direction read aloud,
    a word cut off at a line's start or end or clipped in the middle (owner: "cuts stuff off"), or a caption in the
    wrong speaker's colour: `./hb voice <stunt> --check` lists SWAP, WORDS, EDGE and CLIPPED lines (re-take them:
    `./hb voice <stunt> --only <id>`), then confirm by ear;
  - a viewer-panel BLOCK (`./hb panel`: 2+ viewers agree on a cut-off word, a drifting voice, a voice of the wrong
    sex/age for its character, or a misunderstood ending) that you confirm by ear/eye at its time;
  - **the owner's four patterns (2026-11-10, 22 notes on 6 stories; `./hb owner <stunt>` checks each, with the output
    time and line id; confirm its flags on the frames and look for what it can't measure):**
    1. *superflat / tiny sets*: a shot whose visible world is mostly a flat cleared plain, a 3x3 hill, the next
       building right against the set ("the hill is just a 3x3 and the rest is super flat", "not superflat world");
    2. *the camera not on what the line names*: the line says TORCH / MOM / the LIBRARIAN and the subject is out of
       frame, hidden, off the aim (staring at the ground under a face), a speck or filling the frame ("why are we
       staring down instead of at the librarian's face", "when we say 'another torch' we should look at the torch");
    3. *the picture ahead of or against the words*: the dig before "DUG", already in the hole when the line says we
       dig, a fall with no dig/hit/edge before it, "never dig straight down" over a dig straight down;
    4. *glitches*: a door that opens or closes by itself, the player stuck walking into a door, jitter / one-tick aim
       snaps / a fall-stop-fall stutter ("looks like it's glitching a bunch"), and a story about fog / night / rain whose
       picture has none ("there's no fog").
- **NITPICK**: anything else. Examples:
  - 1-3 frames only visible when stepping frame by frame;
  - a small set imperfection at the edge of the frame;
  - a known engine limitation listed in docs/lessons.md;
  - a "could be punchier" opinion.

  Log nitpicks in the package notes; **they never block and never trigger a re-render.**
- Report each blocker with: output time, frame number, what's wrong, what vanilla or the owner's rule
  expects, and **the cheapest fix** (edit-only, re-record, or engine).

## Verdict and rounds
- **READY**: zero blockers. Publish with `node scripts/publish.js <name> --pass`, nitpicks in the notes.
- **NOT READY**: list the blockers.
- **Round 2 (the last):** check ONLY round 1's blockers plus anything the fix could have broken (the changed
  span, ±2 s). A new nitpick found in round 2 is not a blocker.
- If a blocker survives round 2, stop and ask the owner (or the lead session) with the evidence. Never start
  round 3 on your own.
- An edit-only fix (captions, cards, cuts, timing) needs `scripts/reedit.sh`, not a new render or recording.

## Don't report
- Our layout (caption band, black bands).
- Intended cuts, flashes and speed seams.
- The known engine issues still open in docs/lessons.md (say "known" in one line if one shows).
