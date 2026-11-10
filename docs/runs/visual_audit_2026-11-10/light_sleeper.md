# light_sleeper: visual audit before the vNext re-record (2026-11-10)

Auditor: an independent visual pass (no voice, no new recording). Inputs: `stories/light_sleeper/script_vNext.md` (r2),
`stunts/story_light_sleeper.js` at claude/story-light-sleeper 275c25d (the vNext port: new `hook` and `meadow`
cameras), the last recording `renders/slices/story_light_sleeper.rec.json.gz` (render/story_light_sleeper, engine 2, old
script) and its cut `renders/out/story_light_sleeper.mp4` (48.05 s). The new cameras were rendered by adding their
`shot` marks to a copy of the old recording (same world, same blocks). Numbers: `./hb owner/framing/continuity/describe`
and `scripts/look_stats.py` on 1080x1011 stills.

- Contact sheet, one still per vNext line at that line's shot: `light_sleeper_sheet.jpg`.
- First frame of the latest cut: `light_sleeper_first_frame.jpg`.

## Verdict

**3 BLOCKERS, 8 FIX, 5 NIT.** The new hook camera is the best thing in the story: it reads as "a whole village in
carpet" in one glance. But three things will show on the re-record if nothing changes:
- the new L03 meadow camera is inside a tree;
- the L02 crane never shows the doghouse its line names;
- the warden reveal is too dark to read on a phone.

## First frame (scroll-stopper)

| | frame | verdict |
|---|---|---|
| Latest cut (old L01 POV) | POV on the top step: a white wool block, the plaza and the well small in the middle, a bare hand cut off at the right edge, the HUD. Subject (the carpet) about 25 % of the frame. | **Weak.** It reads as "a village", not "a village in carpet". Nothing at the centre is strange. |
| vNext `hook` (tick 0) | High wide over the south street: carpet roofs striped orange/red/lime on both sides, the cyan carpet road, the plaza, the boxed bell and the wool-lidded well, mountains behind. | **Pass.** The striped roofs are the strange, countable image, and it is moving on frame 0 (a push). |

Fixes are below (F1, F2): the white carpet strip in the caption band, and the sky clipping.

## Findings

### BLOCKERS (fix before the re-record)

**B1. L03 `meadow` camera inside a tree canopy.**
- `meadow.at = [33, -3, 19]` sits in the oak/birch canopy at the meadow's north-west corner, outside the fence at
  (34..62, 22..44).
- The still is a wall of dark leaves, with two sheep peeking through (probe still, tick 130: L03 on the sheet). Subject
  luma under 0.1.
- In a real render the shot director slides a camera out of a solid block toward its subject (render.js `shotCam`,
  "never inside a block"), so the camera would jump through the leaves. That is the owner's "glitches when the camera
  passes through leaves" note.
- Fix (camera), either of:
  - move the camera out over the open slope, about `at: [30, 2, 14]` looking `[48, -8, 33]` (check the leaves first:
    `./hb map story_light_sleeper` around (30..36, 14..22));
  - or clear the tree in setup: `/fill` air over the canopy at x 28-36, z 14-22, y F-6..F+6, leaves only (`replace
    #minecraft:leaves`).
- Then `./hb still <rec> L03` on the new recording.

**B2. L02 "The DOGHOUSE? Also CARPET." never shows the doghouse.**
- In the `est` crane's last 1.5 s the wolf is "HIDDEN behind orange_carpet 12.5 blocks out" (`./hb describe 6.9`). The
  doghouse sits below the frame and behind the carpet roofs.
- The last frame (6.95 s, sheet "L02 est end") is roof stripes in close-up: 41 % orange carpet, 15 % red.
- STANDARDS 4.1 ("look at what the line names") and 4.2: the picture is against the words.
- Fix (camera): end the crane's lookPath on the doghouse, with the doghouse lower-centre as shots.md asks:
  - the last key's look at the doghouse door (set about (-22, 12, -31) per shots.md);
  - the lens 5 above its roof and 3-4 blocks to the north-west, not 12 blocks back behind a roof ridge;
  - or add a 1.2 s doghouse insert (a camera `at` 3 blocks from the doghouse, the wolf in it) on "DOGHOUSE".
- The start of the crane (3.7 s) is also flat: a grey path and grass fill the lower 60 %. Start 1 block higher and
  tilted 10 degrees down onto the carpet road.

**B3. The reveal (S16) is unreadable: the warden at subject luma 0.13, blacks crushed (p1 0.000).**
- At 44.65 s the warden is a dark shape 11-12 blocks out, under the Darkness fog. Its face is lit only by its own sculk
  spots.
- The narrator's back takes the left 30 %, with the head touching the frame top.
- The payoff picture (STANDARDS 8 "one clear picture change") must read on a phone.
- Fixes:
  - set/dress: two lanterns on posts 2-3 blocks either side of the burst square (0, 4), at the warden's chest height.
    Light 15 within 4 blocks of its face (STANDARDS 3.4) also lights the burst particles.
  - camera: `s16` from `at: [-1.9, 3.6, -6.8]` at fov 44 puts the warden 11 blocks out. Move it to about
    `at: [-1.2, 2.8, -3.5]`, looking at `K.face` of the warden (about (0, 3.4, 4)), so the warden is about 45 % of the
    frame height and the boy's shoulder sits in the left 20 %.
  - look: the shot is `mood: 'tense'`, a day mood (exposure 1.04) applied at midnight. Use the night variant from
    docs/look.md, `{ mood: 'eerie_night', grade: { contrast: 0.22 }, vignette: 0.48 }`, for this shot. Its gamma lift
    raises the shadows without washing the lanterns.
  - check with `look_stats.py --night`: subject >= 0.25, p1 >= 0.015.

### FIX (should fix)

**F1. Hook: the caption band sits on a clipped white carpet strip.**
- 3.4 % of the hook frame is clipped outside the sky. The white carpet stripe across the bottom third (y 0.62-0.85)
  sits exactly where the captions go (0.70).
- Fix (dress): make that road stripe light_gray or cyan carpet, or tilt the hook 3 degrees up so the cyan road takes
  the band.

**F2. White wool and white carpet clip in daylight (L06: 7.2 % clipped, L07: 2.6 %).**
- The lid fills half the L06 frame and reads as a flat white card with no texture.
- Fix (look): for the morning and afternoon stretch, `look: { mood: 'auto', grade: { exposure: 1.0 } }`, or swap the
  lid to `white_wool` + `light_gray_wool` checker.
- Recheck with `look_stats.py` (< 2 %).

**F3. L07 `s07`: depth of field blurs the whole background.**
- `dof: { aperture: 0.8, focus: self }` on a planned WIDE shot (the recording frames it FS). The house, the steps and
  the boxed bell (the shot's background clue) are mush.
- That is the owner's "blurry light" note (bright carpets + bloom + DoF).
- Fix (look): `dof: false` on s07 (STANDARDS 5: no DoF on wide shots), or aperture 0.4 if it stays a full shot.

**F4. L06 and L11 head snaps.**
- The old recording whips the view at 327-384 deg/s while pulling the lid (15.05 s, 15.55 s, 27.85 s, 28.35 s,
  29.25 s): the owner's "jerky digging and head snaps".
- The vNext port moved these to `K.dig` (eased). Verify on the new recording: `./hb owner` must show no
  "view whips" WARN in L06/L11.

**F5. L08 Mom inside: subject luma 0.22 (target 0.35-0.70 by day).**
- She is top-lit by one lantern on the ceiling above her head, so her face is in her hat's shadow.
- Fix (dress): a lantern on the wall or table 2 blocks in front of her, at face height, on the camera's side
  (three-quarter key). Or open the window behind the camera.

**F6. L09: the skeleton is in deep tree shade at dusk (subject 0.19-0.21); the creeper pops in.**
- The line's subject ("a SKELETON shot a CREEPER") is the darkest thing in frame.
- `./hb continuity`: the creeper "appears in the middle of the frame 0.15 s into the shot (10.7 blocks)". That is the
  owner's "mobs teleporting" note.
- Fixes:
  - set: move the skeleton 2 blocks out of the canopy onto the grass, or set this cut to 12000 (golden hour, camera
    west of it).
  - stunt: place the creeper before the cut (`K.shot` first, then `putMob` with a >64-block hop and a 20-tick
    `K.preroll`, cinematic-style mistakes 1 and 21).
- The death roll with the red hurt tint is correct (checked).

**F7. L13 `mom`: Mom is crossed by the lantern post, and the camera is against the wall.**
- `./hb framing`: "close on the set". A fence/lantern post runs down her right side from hat to feet.
- The shot is low and tilted up, so the stone wall fills 60 % of the frame and saturation is 0.18.
- Fix (camera): `at: [1.0, 2.7, -2.9]` (0.6 west of now) so the post clears her silhouette, and look at her face
  (`[0.5, 4.6, -7.35]`).
- She is still small for "FULL": push to fov 42.

**F8. L14 "The LIGHTS went DARK" shows no lights going dark.**
- The turn ends with the jukebox filling the right third at 1-2 blocks (69 % of the frame within 3 blocks). No lantern
  is in frame, and the Darkness pulse lands wherever the absolute tick puts it.
- render.js `darknessAt`: the pulse is `cos(t * PI * 0.025)`, peaking at recording ticks that are multiples of 80, like
  vanilla's `player.tickCount`. So "a dark pulse lands on DARK" only if the line is placed so that "DARK" falls on
  such a tick.
- Fixes:
  - camera: end the turn on the east doorways with two lanterns in frame. Start the turn 1 block further north so the
    jukebox stays under 15 % of the frame.
  - stunt: time `/effect give darkness` so that a tick ≡ 0 (mod 80) falls within 3 ticks of the word "DARK"
    (`at(k)` from voice.json).

### NIT

- **N1.** The hand and held items are cut off at the right edge of every POV frame (the disc on L10, the bare hand on
  L01/L04/L05). This is an engine bug (below, E1) and also affects the L10 line: "A real SONG" over a disc you can't
  see. The fix is in the engine; the stunt needs nothing.
- **N2.** L10: after E1 the disc shows at the lower right. Still, a 0.3 s look down at it on "SONG" would sell the
  line.
- **N3.** `./hb owner` flags "flat" (a 113 x 123 levelled plain). The plaza must be flat, and every frame shows hills
  or the slope behind. Not a real superflat read; no action.
- **N4.** `./hb owner` flags "no fog" for a fog story. The bible's fog is the Darkness's 15-block fog, which the
  renderer draws (render.js DARK, page.js DarknessFogFunction). This is a false positive; teach owner.js that a
  darkness effect counts.
- **N5.** The S16 narrator's head touches the frame top (headroom 0). Fixed by B3's camera.

## Continuity

Times of day step correctly: 1000 → 9000 → 9100 → 12500 → 18000, each on its time mark. The held item changes across
cuts (nothing → shears → nothing → disc → shears) all follow the story. Twelve blocks change during the S16 cut (the
burst): intended.

## Minecraft correctness

Pass, apart from E1:
- the creeper's death roll has the red tint;
- the music disc lies flat on the grass;
- the warden emerges and roars as in vanilla;
- the Darkness fog and pulse match vanilla (the 22-tick fade, the 0.45 pulse).
