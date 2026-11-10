# good_boy: visual audit (2026-11-10, before the rework is built)

Auditor: an independent visual pass (no voice, no new recording). The script is the approved rework r3
(`stories/good_boy/script_vNext.md` on claude/writers-mystery). Most of its shots don't exist yet, so the audit covers:

- (a) the old recording's shots that r3 says it reuses, and whether they can carry the new lines;
- (b) the new shots, before they are built.

**Materials:**
- the recording: `renders/slices/story_good_boy.rec.json.gz` and its cut `renders/out/story_good_boy.mp4`, both on
  render/story_good_boy (39.8 s, the old 19-line script);
- the stunt `stunts/story_good_boy.js`;
- Dog Hill as built by the story_dog_hill recording (render/story_dog_hill, day 4300), for the ending's framings;
- `docs/world/map.json` and `canon.md`.

**Images:**
- `good_boy_sheet.jpg`: one still per recorded shot, mid-shot, from `./hb sheet`.
- `good_boy_problems.jpg`, four problem frames from the cut:
  - top left: the crane through the oak leaves;
  - top right: the dog_sea depth of field;
  - bottom left: the skeletons tinted magenta;
  - bottom right: the night_yard frame, with Buh's head cut off.
- `good_boy_candidates.jpg`, four proposed framings:
  - top: the yard turned to face the sea, at sunset and then at dusk;
  - bottom left: the reveal framing on Dog Hill;
  - bottom right: the hilltop looking toward Hushwell, which fails.
- `good_boy_first_frame.jpg`: the current cut's frames at 0, 0.5, 1.0 and 2.0 s.

## Verdict

**Not ready to build as written.** "Reuse ~7 of 11 lines" does not hold.

The old shoot is the *dog running away from the man*: wolf-eye POVs fleeing down the road, through the wheat, out
to sea. The rework is *the man running from the dog*. Every reused flight shot shows the opposite of its line
(STANDARDS 4.2: the picture against the words):
- L01-L03;
- the yard shots (L05-L07), which also fail the superflat check;
- the night shots (L08), which fail the night-light standard.

What does carry over:
- the yard and cottage set, if it is shot toward the sea;
- the wolf model and its collar;
- the wolf-eye height;
- the zombie beat, once it is re-lit.

**Count:** 8 blockers, 11 fixes, 4 nits, and 2 engine items plus 1 story-kit gap. Every blocker has to be fixed before the
re-record.

## First frame

**The current cut: FAIL.** Frame 0 is an empty dirt path at wolf-eye height, backlit by a sunset dead ahead, with
houses in silhouette:
- no subject;
- no face;
- nothing strange.

The first 2 s show the same empty road, and a grass blade crosses the lens at 1.0 s. Nothing in it stops a scroll
muted.
- Numbers (`look_stats`): subject 0.40, contrast 0.12-0.67.
- `./hb framing` NOTE: "opens P1 without an establishing shot (no cast, median depth 3 blocks)".

**What the rework's first frame must be:** the mechanic, in one locked camera shot.
- **Frame 0:**
  - Buh mid-sprint toward a low camera ahead of him (the `dog_walk` follow geometry, fov 50), >= 45 % of the game
    view tall;
  - his face lit: golden hour, the camera west of him, so the sun is behind the lens;
  - behind him down the road, 12+ blocks back and small but readable, the pale wolf with the red collar running after
    him.
- **About 0.3-0.5 s in (on "HUMAN"):** the far wolf is gone and is at his heel, mid-stride, 1-2 blocks beside him. It
  is a hard pop: no particles, no sound, as in vanilla.

The question "why is he running from his own dog?" is in the first second, with the sound off. Don't open on POV:
the dog is the narrator, but the hook needs both of them in frame.

## Shots: what each line plays over

| line | r3's shot | what the recording has | verdict |
|---|---|---|---|
| L01 the teleport | "old L02" | Old L02 isn't a visible teleport. The POV walks north, then `K.cut`s into the `est` crane, with the dog already beside him. Old L01 is the POV of a wolf fleeing down the road with nobody ahead (sheet #1). | **New shot** (first frame, above) |
| L02 He RUNS. I FOLLOW. | old L01 POV run + the old L02 crane | The POV has no Buh in it: it reads as the dog running away. The crane (#3, 7.63 s): 62 % of the frame is oak leaves, the subjects are 5-10 % tall, and the subject luma is 0.285. | **BLOCKER** ×2 |
| L03 wheat / hills / island | old L04 | Three wolf POVs: night hills (#4: luma 0.16, p1 0.004, no subject); the camera inside the wheat (#5: 100 % within 3 blocks, the sun blown out behind it); **the wolf swimming** (#6), against "I POPPED up on the BEACH" (vanilla: a tamed wolf teleports rather than swims). Buh isn't in any of them. | **BLOCKER** |
| L04 another wolf sitting | new | n/a | risks below |
| L05 the sitting rule | the yard, reused | yard shots fail `./hb owner` **flat BLOCK**: a cleared plain 131×77, relief sd 4.5, flat ground 44-59 % of the frame | **BLOCKER** (re-aim at the sea) |
| L06 COLLEGE, Buh on the step | old L05 yard | old L05 is a 101 %-tall CU from under his chin holding the (dropped) porkchop (#7) | **FIX** |
| L07 dusk, sea edge | old L09 dog_sea camera | heavy DoF on the background (aperture 0.8), Buh's head at the top edge, the plain behind; graded with the fixed golden look | **FIX** |
| L08 the zombie | old L14-L16 night_yard + bite POV | Night luma 0.16-0.21 and p1 0.003-0.006 on all 4 night shots. Magenta blacks. night_yard crops Buh's head off at the top; the bite POV is a 102 %-tall CU of the zombie. | **BLOCKER** (light) + FIX |
| L09-L11 Dog Hill | new | n/a (framings tried on story_dog_hill's set) | risks below |

## Blockers (fix before the re-record)

1. **Every reused flight shot shows the dog fleeing (L01-L03).** Reshoot as camera shots with Buh in frame, running,
   and the wolf popping in beside him; one POV at most, and only following Buh's back.
   - **L02 "He RUNS. I FOLLOW.":** a POV low behind Buh's heels, sprinting after him, then the pop.
   - **L03:**
     - Buh crouched in the wheat, seen from outside it with the camera never inside the crop (see 5); the dog pops in
       beside him;
     - Buh at night on the north hills with a lantern in his hand or on a post (see 4);
     - Buh climbing out of the sea onto the island beach, and the dog popping up on the sand next to him (a camera
       shot from the beach looking back at the sea, sunset behind the camera).
   - Never show the wolf swimming: vanilla wolves teleport to the owner when he lands.
2. **There is no primitive for a deliberate on-screen teleport (story kit).** L01 and L03 need the dog to jump 12+
   blocks in one tick, in view, inside one camera shot.
   - The kit forbids exactly that. `lib/story.js:360-377`: K.actor walks an uncut jump; K.warp is off-screen only.
     The motion lint rejects a raw /tp of the cast or the player. `./hb owner`'s glitch rule flags "jumps N blocks in
     one tick with no cut: reads as a teleport".
   - A K.cut would put a cut mark mid-shot, which rec_check, continuity and the design-SFX pass all read as a cut.
   - Fix: a kit verb, `K.blink(tag | 'self', near)`. It teleports to 1-2 blocks from the owner and writes a
     `teleport_ok` mark, which the owner glitch rule and the lint accept. It writes no cut mark.
   - The renderer is already right: an entity moving > 4 blocks in a tick snaps without a lerp (render.js:270, :334);
     the player or self moving > 4 blocks in a tick is a cut, not a glide (render.js:1813).
   - Logged under Engine below; it has to land before this story records.
3. **The L02 crane flies through an oak canopy.**
   - Measured at 7.63 s: oak_leaves fill 62 % of the frame, the cast is 5-10 % of the frame height, subject luma 0.285.
   - Path: `shots.est` in `stunts/story_good_boy.js:399`: from (24, H+13, 4) to (31.5, H+3.6, 11.5).
   - Fix: take the crane in from the sea side, east of the yard and clear of the oak at about (34-36, 15-18): for
     example (52, H+12, 22) → (42, H+3.5, 17), looking at the pair.
   - Or remove the tree's leaves along the path.
   - Check every keyframe with `./hb describe` for `fills: *_leaves`.
4. **Night shots are unlit, and the grade is wrong at night.** The four night frames measure:

   | time (s) | subject luma | p1 |
   |---|---|---|
   | 10.38 | 0.16 | 0.004 |
   | 29.95 | 0.177 | 0.006 |
   | 33.90 | 0.211 | 0.006 |
   | 37.15 | 0.156 | 0.003 |

   The standard is subject >= 0.25 and p1 >= 0.015. The skeletons come out lavender, because the stunt's fixed warm
   `look` (story_good_boy.js:41: lift [0.02, 0.01, 0.018], gain R 1.12) runs at midnight too.
   - Fix the grade: `look: 'auto'` (eerie_night at 18000, golden_hour at 12300). Drop the hand-written look.
   - Fix the light: a lantern within 4 blocks of Buh's face in every night shot, on the camera's side (the
     night_yard lantern at 8.1 blocks is behind them). For L03's hills, Buh carries one, or there is a lantern post
     on the path.
   - Check with `look_stats --night`.
5. **The camera is inside the wheat (the old L04 wheat; the owner's "camera through leaves" note).**
   - Measured: 73 % of the frame is wheat 0.2 blocks from the lens.
   - Fix: keep the lens over the crop (wheat is 1 block tall, wolf eye 0.68 is inside it). Use a camera shot at 1.6-2
     looking down the rows at Buh crouched in them, never the POV.
6. **The yard is superflat (L05-L07 reuse).**
   - `./hb owner`: flat BLOCK on L07 (20.95 s and 22.60 s) and L11 (31.60 s). The set stands on a cleared plain
     131×77, terrain sd 4.5, and flat ground fills 44-59 % of the frame.
   - Fix: turn every yard shot to face east, over the fence to the sea and the cliff drop (candidate A, top left of
     `good_boy_candidates.jpg`: fence, sea horizon and the oak and birch give foreground, middle ground and distance).
   - Fill the west side's empty plain with dressing (`lib/sets/dress.js`: a wheat field with relief, hay, trees) for
     any shot that looks west.
7. **The ending (L11) must read as a logout, not an edit.** The reveal is "Buh is gone and the wolf keeps sitting".
   - The patch is one clean grass block in a grass meadow: alone it reads as nothing (candidate R1).
   - Fix: L10-L11 on **one locked camera** (`drift: 0`, no push) south-east of D, low (1.6-1.9), about 6 blocks away,
     looking west-north-west. Framing, per candidate R1 (`--cam 6.5,1.9,2.2,75,-4` on story_dog_hill's set):
     - the wolf a third in from the left, facing right toward the patch, lit by the morning sun behind the camera;
     - Buh standing on the patch in the right third of the frame.
   - "Buh left the game" is chat-only: he vanishes on that exact frame and the camera doesn't move, so the empty
     patch is the same frame minus him.
   - Push the camera to 3.5-4 blocks from D so the wolf is >= 25 % of the game view's height (12-13 % at 6.5 blocks).
   - Cut 1.0 s after the chat line appears (r3's rule).
8. **The chat line, "Buh left the game", can't be read at phone size (engine).**
   - edit.py's `syschat_png` (edit.py:739-747) draws the closed chat at GUI scale 3 (edit.py:38): 8 px glyphs ×3 =
     24 px in a 1920-high frame, about 7 px on a 360 px phone.
   - r3 requires "readable at 300 px".
   - Fix (engine, opt-in): a `scale` on the `syschat` mark (GUI 5-6 → 40-48 px glyphs), still bottom-left of the
     game view, still above the YouTube UI (the strip sits at y ≈ 1319-1346, inside the safe box y 200-1440).
   - Keep the caption for L11 ("I'll BE / right BACK.") off the frames where the chat line appears: the chat is
     under the caption line at 0.70.

## Fixes (should)

1. **L04 needs two wolves that read apart.** Both would be pale wolves with collars.
   - Give the other one a **blue collar** (CollarColor 11), sitting (`Sitting:1b`) by the empty house's door.
   - Buh and his own red-collared dog stand in the same frame (a camera shot, not POV, so you can see that his dog
     is standing).
   - Engine nice-to-have: wolf variants aren't recorded or drawn. harness.js:585-588 records only the flags and the
     collar; entities.js:213 always uses `wolf_tame`. Recording `Wolf.DATA_VARIANT_ID` and drawing
     `wolf_<variant>_tame` would let L04 cast a chestnut or woods wolf.
2. **L06 (old L05 yard): a CU from under his chin (101 % of the frame height, pitch 36).**
   - Use a medium shot, Buh on the cottage step, the camera at wolf-eye height and 3-4 blocks out (subject >= 45 %
     tall), aimed with `K.face(guy)` (not `P(x, eyeY(1.6), z)` by hand).
   - Clear the porkchop from his hand: `/clear` in setup. The bloom makes it glow pink in every frame it's in (#7, #9,
     #10, #13).
3. **L07 dusk on the sea edge (old dog_sea).**
   - Aperture 0.8 at fov 46 smears the whole background. This is the "blurry light" note.
   - Use `dof: false`, or aperture <= 0.5 focused on Buh's face.
   - Lower the camera or move it back 1 block: his head touches the top edge (head at 28 % down in the 24.07 s frame,
     and in the uncropped master his hair is cut).
   - Set time 12900-13000. Candidate B shows the yard facing the sea at 13000: the moon rising over the sea is a good
     frame for "SORRY, buddy".
4. **The old stunt look breaks the sharpness standard.** `look` at story_good_boy.js:41 has:
   - bloom 0.5 with threshold 0.72 (the standard is <= 0.35 and >= 0.9);
   - grain 0.02 (standard <= 0.012);
   - rays 0.5 with no raysOverBlocks;
   - a global DoF.

   Replace it with `look: 'auto'` and the cinematic defaults; DoF per shot, medium and close only.
5. **The L08 night_yard: Buh's face is out of the frame top** (#13, problems bottom right).
   - Raise the look point to his face (`K.face`) or lower the camera to 1.6-1.8.
   - Put the zombie between the lantern and the camera, so its green face reads.
   - Wide or full, not CU: the bite POV is 102 % (framing WARN 36.20 s). Use one bite POV at about 1.5 s with the
     zombie's head and chest in frame (2.5 blocks), not its belt.
6. **Under the oak, Buh's face is in shade** (candidate A: subject 0.31, contrast 0.36, both WARN). Put his mark 2
   blocks south, out from under the canopy at about (37.5, 15.5).
7. **Dog Hill continuity at day 3400: there is a bones stamp, and there will be two dogs.**
   - map.json `dog_hill.stamps.bones` is `since: 3400`. The 14 "never eaten" bones are Pip's later gifts, so a pile
     of them by D at Buh's logout is a continuity error. They also read as a grave. Ask the canon owner to make it
     `since: 3401`, or have world.build skip it for good_boy.
   - `stamps.dog` (`since 3400`) places a sitting wolf on D. In Good Boy the narrator walks up and sits, so a second
     wolf would be there. `world.build(ctx, { story: 'good_boy', skip: ['dog', 'bones'] })`, or the equivalent.
8. **The L09 easter egg can't be shot from the hilltop toward Hushwell in the morning.**
   - Candidate R3: looking south-east from behind D at 1000, 8 % of the frame clips, the sky is blown out, the plaza
     29 blocks below is hidden behind the hill's rim, and the bell is not visible.
   - Put the boxed bell in L09's climb instead: a camera low on the carpet street with the bell box in the foreground
     at the left, Buh and the dog walking up the slope toward the hut on the skyline. Light: the morning sun from the
     east, the camera east of them.
   - This also makes L09 the establishing shot for the new place, which is required.
9. **Pick one sun for the ending.** The hilltop morning (1000) looks *into* the sun if the camera faces east; keep
   every Dog Hill camera facing west or north-west (R1 is lit: subject 0.51, p1 0.096, clip 1 %).
10. **The actor is still the bot "Sam".** Canon has Buh as the bot name. The chat mark is free text, but if
    `playerNames` or a death screen ever shows, it says Sam. Rename the actor to Buh in setup.
11. **The skeleton jumps 2.9 blocks in one tick (`./hb owner` glitch, 28.25 s).** The scene is dropped in r3. If any
    night-hills shot reuses mobs, walk them.

## Nits

1. The grass blade crossing the lens at 1.0 s on the road POV (the wolf eye at 0.68 runs through `short_grass`). Any
   wolf-eye POV kept: path the run along `dirt_path`, or raise the eye to 0.8.
2. The wolf is seen from behind in most camera shots (dog_sea, the candidate yard). As the narrator, he should face
   the lens at least once before L10: a quarter-front angle in L04 or L05.
3. Give the heart particles on the old reveal (#15) a smaller size; they cover a quarter of the frame. The scene is
   dropped; this only matters if a reveal reuses the path.
4. Captions in the old cut are one word at a time (the "LEAVE", "guy" and "times." frames). r3's chunks are 2-3 words.
   That's the caption track at re-render, nothing to change in the shoot.

## Engine and story-kit items (report separately)

- **A K.blink / teleport_ok primitive (story kit; blocks L01 and L03).**
  - There is no sanctioned way to show a vanilla on-screen pet teleport. K.actor walks it (lib/story.js:360-366),
    K.warp is "off screen only" (:142, :377), the motion lint rejects /tp, and owner.js's glitch rule flags it.
  - The renderer already snaps it correctly (render.js:270, :334, :1813).
- **Chat at GUI 3 is too small for a story payoff (edit.py:38, :739-747).** Add an opt-in scale on `syschat` marks;
  recordings without it render unchanged.
- **Wolf variants aren't recorded or rendered (lib/harness.js:585-588, renderer/entities.js:212-215).** Optional, for
  L04's second wolf.

## How these were measured

- `./hb sheet` on the slice recording;
- `./hb describe`, `./hb owner` and `./hb framing` (output quoted above);
- `scripts/look_stats.py` on the cut's game view (crop 1080×1011 at y 455);
- candidate framings with `./hb still --cam`:
  - the yard: `33.0,2.3,15.8,-90,-4` at 7.63 s, with and without `--day-time 13000`;
  - Dog Hill, on render/story_dog_hill's recording at 12.78 s: `6.5,1.9,2.2,75,-4` and `-4,3.5,-4,-135,-14`.
