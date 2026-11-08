# Blind audits of a script (BUILD LIMIT and anything after it)

The owner, 2026-11-08: "audit the script first, like spawn blind readers/listeners that havent seen it before and have
them audit adversarially ... we can leave some ambiguity so people argue/fill in the gaps, but it should be clear enough
that people dont get confused and leave."

A blind reader is a fresh agent that sees only what an audience would: the screenplay (or treatment), split into parts,
read in order, with a log written after each part *before* the next is opened. That gives what a viewer understood at
each point, their predictions, and where they'd leave, not a hindsight review. The writer's notes (the pitch, the
character secrets, the clue table) are never shown to them.

## How to run one
1. Extract only what the audience sees. For a screenplay: the scenes, no pitch, no twist list. For a treatment: the
   chapters, with the world rules and clue plan held back as `bible.md` for after the last chapter.
2. Split it at the act or chapter breaks (4-5 files), and for a "listener" also make dialogue-only files (dialogue,
   cards and scene headings, no action lines): that tests what a half-watching viewer gets by ear.
3. Give every reader the same protocol (`PROTOCOL_screenplay.md` or `PROTOCOL_treatment.md`) and one persona each.
   Personas that earned their place in round 1:
   - a 13-year-old daily Minecraft YouTube viewer (where they'd click away, what they'd comment);
   - an adversarial plot-hole hunter (every rule contradiction, with severity and the smallest fix);
   - a Minecraft Java veteran (every "that's not how it works", and what players would love);
   - a story editor (structure, arcs, pacing, runtime, chapter hooks and cliffhangers);
   - a dialogue-only listener.
   A mystery solver was tried and was stopped by a safety filter partway through (round 1); the kid persona now also logs
   its twist guesses.
4. Run them in parallel (Agent tool, background). Each writes its report as it goes and returns a short summary.
5. Read every report. Fix what two or more readers hit independently; weigh single-reader findings by persona (the
   Minecraft veteran on mechanics, the listener on clarity by ear). Keep the questions readers flag as GOOD AMBIGUITY,
   each with exactly one clue so it reads as a mystery, not a mistake.
6. Re-audit the fixed version with fresh readers (never re-use one who has seen an earlier draft).

## What's here
- `round1/`: five reports on draft 1 (the 20-minute screenplay), 2026-11-08.
- `round2/arc_draft2.md`: the one-hour arc written from them (also the "Draft 2" tab of the script doc,
  https://claude.ai/artifact/4BphcbVEduwc4HmV8tbcpJ). Round 2's reports go in `round2/`.
