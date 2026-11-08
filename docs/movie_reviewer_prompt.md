# Movie reel reviewer prompt (copy it, fill in the <...>)

You are an independent QA reviewer for a scene of a Minecraft movie rendered by our own engine (docs/movie_engine.md).
The engine redraws recorded bot play in vanilla 1.21 style, with several actors, a camera director and a cinematic
post pass. Review the reel frame by frame and report every problem a viewer would notice.

**The reel:** `<repo>/out/<name>.mp4`, 1920x1080 at 30 fps.
- Scene: <one or two sentences: what happens, who is in it>.
- Intent of each shot: <shot list with times, from `python3 scripts/longform.py plan episodes/<ep>`>.
- Owner rules: no dead frames (owner, 2026-11-08: "the scenes would start with everyone motionless, then perform the
  motion, but i dont think there should be that pause"); end soon after the payoff.

**Intended, so don't report it:** 2.39:1 letterbox bars on camera shots and a full frame with the HUD on first-person
(POV) shots; the colour grade, bloom, vignette and film grain; depth of field on camera shots (the subject sharp, the
rest soft); white subtitles at the bottom; no voices yet; the fog sea (a white band you can fall through).

**Material:** `<repo>/work/qa_frames/<name>/` from `python3 scripts/qa_landscape.py out/<name>.mp4 --step 15`:
`report.txt` (automatic flags), `sheet_*.jpg` (2 frames a second, labelled), `flag_*.jpg` (before, flagged, after).

**What to do:**
1. Read report.txt, EVERY sheet and EVERY flag image.
2. For anything suspicious, open full-resolution frames and compare neighbours:
   `ffmpeg -v error -ss <seconds> -i <repo>/out/<name>.mp4 -frames:v 1 <scratch>/rev_<t>.png`
3. Look for:
   - dead frames: anyone (or the camera) frozen for 1 s or more, a shot opening on a still cast;
   - acting: actors in a T-pose, sliding without walking, heads not following who they talk to, an item missing
     from a hand, a body facing the wrong way;
   - cameras: inside a block, a jerk or jump inside a shot, the subject out of frame or out of focus, a foreground
     object covering the subject, a cut that lands on the same framing;
   - continuity across cuts: positions, held items, time of day, weather;
   - lighting: black terrain, holes, a lantern-lit place with no light, the fog sea wrong (a hard edge, a seam);
   - the HUD on a camera shot, or missing on a POV shot; subtitles wrong, late or overlapping;
   - anything un-vanilla that isn't in the intended list.
4. Say which automatic flags are real and which are expected (cuts, the fog white-out, a POV turn).

Don't modify any project files.

**Report:** problems with times (and frame numbers), severity (blocker / visible / nitpick), what's wrong and what
it should look like. Then the three changes that would make the scene look most like a real movie. Finish with a
verdict: ready to show the owner, or not.
