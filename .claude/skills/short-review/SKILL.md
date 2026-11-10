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
3. Full render once, then `python3 scripts/beat_audit.py <name>` and `python3 scripts/qa_frames.py out/<name>.mp4`.

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
    or a caption in the wrong speaker's colour: `./hb voice <stunt> --check` lists SWAP and WORDS lines (re-take
    them: `./hb voice <stunt> --only <id>`), then confirm by ear;
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
