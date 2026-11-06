# QA protocol (every Short, before it's packaged)

The user asked for meticulous frame-by-frame QA (2026-11-06), so a Short is packaged only after
all four steps.

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
