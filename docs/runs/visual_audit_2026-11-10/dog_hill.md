# dog_hill: visual audit before the vNext re-record (2026-11-10)

Independent visual audit of the picture only (no voice, no script changes). Story session: `claude/story-cine-2`
(stunt `stunts/story_dog_hill.js` at 20:33 UTC, already ported to script vNext r2's line map).

**Material.** The latest recording, `renders/slices/story_dog_hill.rec.json.gz` on `render/story_dog_hill` (16:15 UTC,
the *old* script's line timing), rendered with the vNext stunt's camera shots; the latest cut `renders/out/story_dog_hill.mp4`
on the same branch. The times below are that recording's (50.2 s); shots are named by the stunt's camera names, which
carry over into vNext. The set, cameras and look are the same in the vNext stunt, so every finding here survives the
re-record unless it is fixed.

**Sheets.** `dog_hill_sheet.jpg` (one still per shot, the 1080x1011 crop, labels = old line ids),
`dog_hill_stills.jpg` (the moments discussed below), `dog_hill_first_frame.jpg` (frame 0 of the latest cut).

**Tools run.** `./hb sheet`, `./hb still` (incl. alternative `--cam` framings for S01), `./hb describe`, `./hb framing`,
`./hb continuity`, `./hb owner`, `./hb motion`, `./hb map`, `scripts/look_stats.py`.

## vNext shot map (script_vNext.md "plays over" -> stunt camera)
| vNext | line | stunt camera | old-cut time of the sheet still |
|---|---|---|---|
| S01 | L01 the dog on the hill, 900 days | `open` | 1.77 |
| S02 | L02 rain / thunder / creepers / zombies | `rain`, `storm`, `zombies` (creeper chunk), `storm2` (zombies chunk) | 4.08, 5.17, 6.35 |
| S03 | L03 the bone, L04 sticks | `bone` | 8.93 |
| S03b | L05 the red collar | `collar` | 12.78 |
| S04 | L06 the one empty patch | `patch` | 16.27 |
| S05 | L07 the dirt hut | `hut` | 20.30 |
| S05b | L08 I begged | `beg` | 24.82 |
| S06 | L09 Grandpa says | `gramps` | 29.18 |
| S08 | L10 somebody said be right back | `rightback` | 32.35 |
| S09 | L11 every night I sit there | `dusk` -> `night` | 34.45, 37.00 |
| S11 | L12 he stood up (no cut: stays on `night`) | `night` | 37.00 |
| S12 | L13 a guy appeared on the patch / hey buddy | `reveal` -> `reunion` | 40.50, 44.00 |
| S13 | L14 sit, boy, be right back + "Buh left the game" | `sit` -> `end` | 47.00, 49.70 |

## First frame: FAIL (does not stop the scroll)
Frame 0 (`dog_hill_first_frame.jpg`): a small pale dog (16 % of the game view) sitting on a flat lawn, an oxeye daisy
the brightest thing in the frame and dead centre, a low grass ridge behind. Nothing says *hill*, nothing says *900 days*,
nothing is strange. The daisy grows as the camera pushes in (by 2 s it covers the left third). The muted read is "a dog
in a garden". The hook line asks "why has the dog on the hill not moved in 900 days?", so the picture has to show
**the dog alone, high up, above a living village**, and one sign of the time (the worn ring of coarse dirt).
Measured: from the hilltop the village is never in view: it sits 27 blocks under the rim (`./hb map`: plateau y 108,
east and south-east rim drops to 88-98 at dx >= 10), and from behind the dog the frame is a bright hazy horizon over an
empty plateau (tested: `--cam -1.9,3.4,-1.3,-127,-24` and `-4.5,6,-3.3,-127,-30`).

## BLOCKERS (fix before the re-record)
1. **S01 / first frame: the hill isn't on screen, and a flower is the subject** (owner notes: superflat, title promise).
   `open` is a 0.9-blocks-high camera in front of the dog with the levelled meadow filling the lower half (owner gate:
   flat ground 34 % of the frame, "plain 15 x 19"). Fix (camera + dress): open on a crane that *starts out over the east
   drop* with the village rooftops in the bottom of the frame and the dog on the rim's skyline, ending on his face:
   key 0 about D + (12, 6, 6) looking west-north-west and down at the rim (village below-left in frame), key 1 (2.5 s)
   D + (4.5, 2.6, 1.2) on his face with `K.face`-style aim at dy ~1.6 (not 0.75). Clear every flower and tall grass within
   2.5 blocks of each camera key (add the `open`/`end` paths to `keep()` by distance, not the current box). Sunrise
   backlight from the east is fine for a silhouette; keep `dof: false`. Re-check with `./hb still ... --cam`.
2. **The east rim reads as a command-built dirt wall.** The setup's levelled disc (`/fill ... dirt replace air`, then
   `grass_block` at F) ends in bare, vertical dirt columns 10-20 blocks high where the hill meets the natural slope
   (seen from outside the rim: `--cam 14,2.5,5,72,-4`). Any shot that shows the hill from below or over the drop (fix 1)
   shows it. Fix (set): step the rim down in 1-2 block grass terraces over dx 8-12, cover exposed dirt faces with
   grass blocks / coarse dirt / moss and a few bushes, so the disc blends into the hill (building_guide: no cut edges).
3. **S06 "Grandpa SAYS": Grandpa is not visible.** `gramps` sits directly behind Pip's back: Pip (3 blocks, out of focus,
   35 % of the frame) covers the cartographer exactly (both at 44-50 % across; framing: "close on the set, subject -").
   Fix (camera): move the camera off the Pip-Grandpa line to the south-east (bible: "cameras stay south of that line"),
   e.g. D + (-2.0, 0.6, 10.5) looking west at Grandpa's face on the path (dy -1.4), Pip small on the rim frame-left/above;
   DoF off or focused on Grandpa.
4. **Cast teleports across cuts; the stunt fails the motion lint.** `./hb owner`: 3 BLOCKs, Pip "moved with the cut but
   lands 0-2 ticks after it ... dashes 1.9-9.5 blocks across the new shot" (22.70, 27.05, 33.30 s). `./hb motion`: 2 raw
   `/tp` helpers (stunts/story_dog_hill.js:184-185) drive every cast move (Pip's walk, hop and turns, Grandpa, the
   zombies, the creeper, the dog's run). Fix (stunt): port to `K.actor` / `K.warp` / `K.park` (the lint rejects the
   recording otherwise); warp before `M.shot`, as cinematic-style mistake #1.
5. **Aims below the face on almost every camera** (owner: "looking slightly too low"). The dog's feet are at dy 1, his
   sitting head ~dy 1.6, but the look points are dy 0.4-0.9 (open 0.75, rain 0.7, bone 0.5, collar 0.85, patch 0.4,
   beg 0.6, reveal 0.9, reunion 0.9): the aim is at or *under the ground*. Results: S02 `rain` crops the dog's head off
   the top of the frame (dog 30 % tall, ears and face cut); `beg` cuts his ears; `reunion` puts Steve's head at the top
   edge (sheet #16). Fix (camera): look at dy 1.5-1.7 for the dog, 2.6 for Steve/Grandpa, 1.8 for Pip (baby villager eye
   ~0.8 over his feet), and let framing.js's LOOK_DROP put the eyes on the upper third.
6. **S04 "one EMPTY patch of GRASS": the patch doesn't read.** `keep()` clears a 6 x 4 block area around the dog and P
   (dx -3..2, dz -1..2, plus (3,0)), so P is one bare block inside a bare lawn; `patch` frames the dog's back against the
   hut and P is not identifiable (sheet #7). Fix (dress + camera): flowers and short grass on every block around P
   (dx 2-4, dz -1..1) except P itself, one coarse-dirt/worn path line from the dog to P if wanted; frame P at the centre
   of the crop, 2-3 blocks from the lens, over the dog's shoulder, dog's head in the left third.

## FIXES (should)
1. **Look: blurry and soft, against the sharpness rule** (owner: "blurry light"). The stunt's own look has
   `dof: { aperture: 0.35 }` on every shot except open/patch/hut/end, `bloom 0.5` at `bloomThreshold 0.72`, `rays 0.5`
   over blocks, grain 0.015, no sharpen. Seen: wide shots storm, zombies, bone, gramps, reveal blurred front and back; the
   white bones and daisies glow. Fix (look): `look: { mood: 'auto', bloom: 0.35, bloomThreshold: 0.9, bloomPasses: 1,
   rays: 0.35, raysOverBlocks: 0.35, sharpen: 0.4, grain: 0.012, vignette: 0.38, shadows: true }`; DoF only on `collar`,
   `night`, `reunion` (aperture <= 0.9, focus on the face).
2. **Night faces too dark; the grade never goes to night.** look_stats: `night` subject 0.20, storm 0.22 (< 0.25),
   `reveal`/`sit` black point 0.008-0.009 (< 0.015). The fixed warm grade is applied at 18000 too. The only night light is
   the hut's wall torch 7-9 blocks from Pip and the dog. Fix: `mood: 'auto'` (eerie_night lift) plus a lantern on a fence
   post or a campfire within 3-4 blocks of D, camera side (e.g. D + (2, 1, 3)); bible: add it as a prop from S01 so it is
   there all story.
3. **S02 THUNDER: no lightning on screen.** The two bolt marks (ticks 113 and 122) are at set (-14, -16) / (-18, -10),
   about 40 deg left of the `storm` camera's axis, outside the 1080-wide crop; no visible sky flash either (stills at
   4.92/5.37 s identical to 4.97/5.42 s). Fix: put the bolt in the crop, behind the hut (e.g. D + (6, 0, -20)), and set
   `look.smoothLight: true` so the flash lights the world (render.js:2465 only flashes the world with shader light).
4. **Foreground flowers fill the lens.** `reveal`: median depth 0.7 blocks, a cornflower 0.9 blocks out covers 18 % of
   the frame (blurred); `dusk`: a daisy covers the right fifth; `bone`: tall grass covers the lower half and Pip with his
   bone is small behind it (owner framing: "camera against the set" WARN on 11 of 19 shots). Fix (dress): no plants within
   2 blocks of any camera path point.
5. **S12 "a guy just APPEARED on the PATCH": Buh is at the frame edge and the patch is not shown.** In `reveal` Steve is
   74 % across the 16:9 master = ~92 % across the crop, 23 % tall; the dog is hidden behind Pip (sheet #15). Fix (camera):
   centre P (Buh on it) and the dog in the crop, Pip out of the line of sight (frame Pip left or drop him from the shot).
6. **S11 "he STOOD up": the dog's head is cut by the right frame edge** in `night` (dog at 75 % across the master, 32 %
   tall), so the stand happens half out of frame. Fix (camera): swing `night` 10-15 deg right (look at D + (0.3, 1.6, 0.8)),
   or cut to a dog single on STOOD.
7. **"A pile of bones" reads as one bone.** The 14 summoned bones lie within 0.5 blocks of each other and merge into
   item stacks (vanilla ItemEntity merging); one bone glows on the grass (sheet #9). Fix (dress): give each bone its own
   component (`components:{"minecraft:custom_data":{n:<i>}}`) so they don't merge, or spread them over 2 x 2 blocks.
8. **The chat leads the words.** "Buh joined the game" is marked at the start of L12 ("Then last NIGHT, he STOOD up"),
   before L13 says a guy appeared. Fix: mark the chat on STOOD (C('L12',1)) or on L13's cut.
9. **Pip's begging hop floats** (`beg`: Pip 0.45 blocks up, no-gravity tp, no jump animation; a villager doesn't hop
   in place). Fix: K.actor small steps side to side and a head shake instead of hops.
10. **Continuity across the montage.** Same-size cuts at the same place (zombies -> bone WS -> WS, collar -> patch FS
   -> FS, reunion -> sit MS -> MS, sit -> end FS -> FS: `./hb framing` NOTEs); Pip 8.1 blocks from where he stood in
   the cut before at 33.30 s. Fix: vary the sizes at those cuts (e.g. `patch` tighter on P, `sit` wider).

## NITS
1. `rightback` (L10): Grandpa backlit into the golden-hour sun, subject 0.34 with 1 % of the sky clipped behind him;
   shoot from the west side of him or drop 0.1 exposure on this shot.
2. `storm2`/`zombies` names are swapped vs what they show in vNext (zombies plays CREEPERS, storm2 plays ZOMBIES): rename
   so `./hb describe` reads right.
3. The cobweb under the hut's eave is lit white in every night shot (it pops more than the faces); move it to the
   unlit north side.
4. `./hb owner` reports village villagers 40-60 blocks away "teleporting" 2 blocks while hidden behind the hill (4.45,
   15.6, 43-47 s): not visible, ignore (see engine notes).

## Owner's past notes, checked
| note | dog_hill |
|---|---|
| superflat / sets too small | FAIL: levelled 15 x 19 disc, flat ground 23-34 % of 8 shots, the hill and village never seen (B1, B2) |
| looks below faces | FAIL: aims at dy 0.4-0.9, heads cropped (B5) |
| jerky digging / head snaps | n/a (no digging; Pip's yaw wiggles are sine-smooth) |
| background moving with a GUI open | n/a |
| stuck on blocks | n/a (the player only stands and crouches) |
| mobs teleporting | FAIL: Pip dashes across 3 cuts; raw /tp everywhere (B4) |
| camera through leaves | not seen in any still (the leaf bushes sit away from the camera paths) |
| items upside down | not seen (the one visible bone is right side up), but the pile merges into one item (F7) |
| no red hurt tint | n/a (nothing is hurt) |
| blurry light | FAIL: DoF on wide shots, bloom 0.5 @ 0.72 (F1) |
| picture ahead of the words | FAIL (minor): the join chat before "appeared" (F8) |

## Engine notes (suspected, not fixed here)
- **Dropped item stacks draw one model** (render.js ~2656-2690: one model per item entity, no `count`), where vanilla's
  ItemEntityRenderer draws 1-5 offset copies by stack size. Unsure whether the recording keeps the count. Low impact.
- **The lightning flash only lights the world with `look.smoothLight`** (render.js:2465 inside `if (SHADER_LIGHT)`); with
  the default look only the sky tint changes (`cam.skyFlash`, render.js:2995), and under thunder clouds that is not visible
  in the stills. By design or a gap; worth a default on for storms.
- **`./hb owner` glitch check counts hidden far-away entities** (lib/hb/owner.js): the village villagers 40-60 blocks away,
  behind the hill, are flagged as teleports (their 2-block jumps are probably the server's sparse position updates at that
  range). Skip entities that are hidden or > 32 blocks away, as `describe` already knows.

## Addendum (lead, 2026-11-10): premise-breaking set details and shot variety

**What the old recording shows against the lines:**
- **The red collar: pass** (collar 14).
- **Rain and thunder: pass** (rain at tick 86, thunder at 107, bolts at 113 and 122). But the bolts are off frame (F3).
- **Moving:** the dog sits for the whole recording until L12. Pass: "hasn't MOVED".
- **No creeper and no thrown stick** in the old recording, against L02 "Not for CREEPERS" and L04 "Kids THROW STICKS".
  The vNext stunt adds both (`stunts/story_dog_hill.js:215` creeper, `:240` stick). Verify both are in frame on their
  words after the re-record.
- **BLOCKER:** the creeper is moved with a raw `tp('cr', ...)` every tick (line 217). That is the owner's "mobs
  teleporting" class and fails `./hb motion`. Walk it with `K.actor`.
- **"one EMPTY patch of GRASS": BLOCKER (B6 above).** The patch isn't unique because the bare area around the dog is
  6x4.
- **"NOBODY here OWNS him"** while the wolf is `tame: true` with a collar. That is correct: a tame wolf whose owner is
  gone, which is the twist.

**Shot variety:**
- Five same-size cuts at the same place: 5.75 s and 6.95 s (WS → WS → WS: rain, storm, zombies, bone), 14.65 s
  (FS → FS), 45.35 s (MS → MS) and 49.20 s (FS → FS).
- Fix (camera):
  - make L02's rain/thunder/creeper/zombie chunks alternate WS / FS / WS / CU;
  - make `patch` a high top-down of the patch, not another FS of the dog;
  - make `sit` a wide on the hill, the two figures small against the sky.
