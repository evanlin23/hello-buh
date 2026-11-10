# QA protocol (every Short, before it's packaged)

The user asked for meticulous frame-by-frame QA (2026-11-06), so a Short is packaged only after
all four steps.

0. **While staging, iterate on previews; render full-res once.** `scripts/preview.sh <stunt> [rec.json]`
   (`scripts/preview.py`) gives the whole edited Short at 360x640, 12 fps, plus contact sheets of the frames
   that matter, in ~10 min instead of ~30 min (full render + edit), on the same busy 4-core box:
   - It works out the Short's frame list the way `edit.py` builds it (`scripts/timewarp.py` spans, start/end
     trims, the hook's real length, the replay) and renders only the source frames the preview's frames and
     the sheet frames show (render.js `FRAMES=`, 360x337, 3 jobs side by side). Every other frame number is a
     hardlink to the last rendered one, so `edit.py` runs unchanged at 60 fps (`--preview` only makes its
     encodes fast) and every overlay lands where it will in the final. The preview keeps every 5th frame.
   - `work/preview_<name>/sheets/sheet_NN.jpg`: one row per moment: the opening second (or the hook clip),
     the last 3 frames before and first 3 after every cut (edit cuts, recorded `cut` teleports, hook -> start),
     every `subs`/`cards`/story `line` mark (+0.1 s, +0.4 s), the payoff (`dropAt`, else the hook's mark, else
     the `endAfter` mark) and the last second. Each frame is labelled with its output time, frame number and
     nearest timeline mark; `frames.txt` lists them.
   - Read every sheet for framing, captions over the subject, set edges, cut glitches and dead air; fix and
     re-preview. Not in a preview: real slow-mo in-between frames (blended instead), full-res detail, the
     full-rate motion. Steps 1-4 below always run on the full-res render.
   - After changing `edit.py`'s timing (hook, speed spans, trims), `python3 scripts/preview_selftest.py
     <stunt> <rec.json> <game.wav>` checks that every preview and sheet frame is the frame the full edit shows.
1. **Automatic pass at full frame rate:** `python3 scripts/qa_frames.py out/<name>.mp4`.
   - It measures every frame (60 fps) and flags:
     - `jump`: in-between frames on teleports, pop-in, flashes;
     - `dup`: dropped or repeated frames;
     - `flicker`;
     - `hole`: black tiles in a lit frame, i.e. lighting holes or missing faces;
     - `dark`;
     - `stuck`.
   - It writes `work/qa_frames/<name>/`:
     - `report.txt`;
     - `sheet_NN.jpg`: every 6th frame (10 per second), labelled with frame number and time;
     - `flag_<frame>_<kind>.jpg`: the frame before, the frame and the frame after.
2. **Frame review by independent agents** (prompt: `docs/reviewer_prompt.md`). Each reviewer:
   - gets only the stunt's intent (caption plus one sentence), never the known issues;
   - reads `report.txt`, every sheet and every flag image;
   - opens full-resolution frames (`ffmpeg -ss T -i out/<name>.mp4 -frames:v 1 x.png`) for anything it is unsure of;
   - returns problems by frame number, with a severity: blocker / visible / nitpick.
   - Look for:
     - the bot stuck or doing nothing;
     - camera glitches, wrong lighting (black or dark terrain, unlit craters, holes), missing or frozen entities;
     - mobs not animating (legs, heads), blocks or entities popping in or out, particles covering the screen;
     - HUD or caption overlaps, the stunt not readable in the first second, a dead or still ending.
3. **Fix every blocker and visible problem**, in the engine if it's an engine bug (`docs/lessons.md`), re-render, and repeat from 1. Nitpicks go in the package notes.
4. **Check freshness before sending.** Packages and anything sent to the user must be the newest render: compare `out/<name>.mp4` mtime with `metadata.json` `code.rendered_at`.

`scripts/qa.py` (10 fps, stuck/dark/black) stays as the quick check during development.
