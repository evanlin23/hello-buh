# thirty_one_raids: visual audit before the vNext re-record (2026-11-10)

Auditor: an independent visual pass (no voice, no new recording, no server). Inputs: `stories/thirty_one_raids/script_vNext.md`
(r2), `shots.md` (r3), `stunts/story_thirty_one_raids.js` at claude/story-thirty-one-raids 0ec2f14 (the vNext port), the
last recording `renders/slices/story_thirty_one_raids.rec.json.gz` (render/story_thirty_one_raids, old script, 15 shots)
and its cut `renders/out/story_thirty_one_raids.mp4` (45.0 s). Numbers: `./hb owner / framing / continuity / describe`
on the recording and `scripts/look_stats.py` on 1080x1011 game-view crops of the cut.

- Contact sheet, one still per recorded shot (mid): `thirty_one_raids_sheet.jpg` (`./hb sheet ... --size 540x506`).
- The same shots from the finished cut, with captions: `thirty_one_raids_cut_frames.jpg` (time stamp top left).
- First frame of the latest cut (1080x1920 scaled): `thirty_one_raids_first_frame.jpg`.

The vNext port keeps every camera shot (s01-s11, s10b) and the recording's staging; what changes is the line map
(L02-L04 restaged, L13 folded into L12 with the Raid bar). vNext's new L04 POV on the totem wall and the L12 reveal
(Grandpa stepping up beside me, the Raid boss bar) are not in any recording yet, so they are audited from the code
and from the S01 / L12 frames that show the same places.

## Verdict

**2 BLOCKERS, 10 FIX, 6 NIT.** The places are good: the totem wall is a real hook object, the pillager tower on
the ridge reads in every outdoor shot, and the house and square are proper builds. What fails is **light and size
on Grandpa**: inside the spruce house he is brown-on-brown and under the night standard, the one emotional
close-up (L10, "GLAD") is the darkest frame in the Short, and in three wides he is a dot. The two motion blockers
from the old recording (the chest GUI and the head whip) are already addressed in the vNext code; confirm them on
the re-record.

## First frame (scroll-stopper)

| | frame | verdict |
|---|---|---|
| Latest cut, 0.00 s (S01) | Inside the house: the totem wall (4 x 8 frames, red backs) upper half; Grandpa in the middle, **back to the camera**, 25 % of the height; a table with a bowl across the bottom third; a lantern on the floor. Subject luma 0.26, contrast p5-p95 0.39 (flat), saturation 0.72 (over). | **Fail.** The wall is the right idea ("31 of something") but at phone size it is a dim brown grid; nobody's face, nothing strange at the centre, the one empty frame (the twist's plant) is a small dark square beside his head. |
| vNext S01 (same camera: s01 path unchanged) | the same | **Fail** unless the fixes below land (B1). |

## Findings

### BLOCKER

**B1. The opening frame doesn't stop the scroll (S01, L01).** Measured above: 0.26 subject luma by "dawn", flat
contrast, Grandpa from behind blocking the centre, the table filling the bottom third, the empty frame unreadable.
- *Set/dress:* light the wall itself: two lanterns on the floor under the wall's ends plus the existing one under the
  empty frame, or glowstone behind the top row's ceiling; target subject luma >= 0.40. Make the empty frame read:
  it is already lit from below; give it a glow item frame (brighter back) or put it at eye height, not the bottom row.
- *Camera:* start the s01 path closer and lower so the wall fills the frame edge to edge (fov 68 -> 55, start at the
  table's far edge, not behind it; the table out of frame), Grandpa at frame RIGHT in profile with his hand putting
  the 31st totem in (as shots.md asks; the recording has him centred, back on). The push ends on the empty frame.
- *Look:* the room is warm-saturated (0.72): this grade on a lantern interior wants sat 1.0 and exposure 1.12.

**B2. L10's face is under the night standard (S10 / S10b, "GLAD").** Subject luma 0.19 (S10) and 0.21 (S10b), contrast
0.20-0.30, saturation 0.72-0.73: the one shot built to show his face (he lifts his head on "GLAD") shows a dark brown
face on dark spruce. STANDARDS 3.4 (a lantern within 4 blocks of every face at night).
- *Set/dress:* a lantern on the table between the two bowls (1 block from his face) and one on the wall behind the
  camera (three-quarter key); the ceiling glowstone the code relies on is 3+ blocks above and lights his hair.
- *Camera:* S10b fills 62 % of the frame height (framing: too tight): pull s10b back ~1 block (`at` -7.0, 3.5, -10.6)
  so his face is 45-55 %. Keep dof on S10b only.

### FIX

**F1. The chest GUI moved the view (L07, 20.75 s, owner BLOCK in the old recording: 5.8 deg while open).** The vNext
code opens with `K.open` (the kit freezes the view, `lib/story.js:581`), so this should be gone. Check: `./hb owner`
on the re-record shows no `glitch` at L07 and a `gui_freeze` mark. Also clear the narrator's inventory before L07: his
hotbar slot 1 shows wheat seeds under the chest screen (held `wheat_seeds` in every shot of the recording).

**F2. The head whip at L12 (38.80 s, 248 deg/s).** vNext eases every turn with `K.turnTo` over 14-20 ticks; confirm on
the re-record (owner `glitch` must be clean). The turn back to Grandpa aims at `P(-7.5, 2.0, -7.7)`: the seated
Grandpa's face is ~0.5 block higher. Use `K.face` on the actor (owner note: looks below faces).

**F3. L02 doesn't show its line.** vNext L02 is the raid count ("Raid ONE? He WON ... Raid THIRTY-ONE? He won ALONE.",
8 chunks, ~3 s) over s02: Grandpa 6 % of the frame (below the 12 % wide minimum) walking a road. Nothing shows a
raid or a win. *Shot:* play L02 over quick inserts of the totem wall (one frame per count, a punch on "ALONE"), or at
least move s02's Grandpa to ~12 blocks from the lens so he reads; the road and the tower can stay behind him.

**F4. Grandpa is a dot in the wides.** S06 (L06, "He HUNTS at the TOWER") 7 %, S02 6 %, S05 (L05) 18 % and walking out
of frame right before "BREAD". *Camera:* S06: put the lens behind Grandpa on the path (him 15-20 % in the foreground,
the tower above him); S05: pan with him (`follow`) or start him 4 blocks further left so the bread lands while he is
at frame centre-right; frame the farmers against sky or grass, not the oak stalls (villagers dE 21-29 to oak).

**F5. DoF on full shots blurs the set (S04 L03, S09 L09).** `dof: { aperture: 0.6 }` on FS-size shots: the house wall
5-8 blocks behind Grandpa is soft (owner: "a bit blurry"). The rule allows DoF on medium/close only: set `dof: false`
on s04 and s09, or aperture 0.3.

**F6. S04 is staged standing, the shot list says knees-up at the grindstone.** The recording has him standing, head
turned down-left; the grindstone is an out-of-focus block in the right foreground. Either put him in the sit pose at
the grindstone (as S11 does) or change the shot list; then aim at his face (`look` y 2.4 at feet 1 = eye 2.62, fine).

**F7. The raiders are unreadable (L12 reveal).** Backlit by the moon (the road runs east, the moon rises east at
13000-13500), dark grey on a dark sky, 9 % tall at 17-20 blocks; Grandpa's back filled the centre in the old cut.
*Look/time:* reveal at 12800 (dusk sky still blue, moon low) or aim 15-20 deg off the moon; *camera:* stop the raiders
at 12-14 blocks (ravager ~15 % tall); vNext's Grandpa at +10 deg right of the aim, 2.4 blocks, will fill the right
third: check he doesn't cover the ravager. Check that edit.py's Raid bar sits inside the game view, under the title
band.

**F8. S11 (L11, "too TIRED") is small and faceless.** Grandpa 20 %, sitting low right of centre (the caption band
starts at 62 %), head pitched 62-66 deg down, subject luma 0.24 at sunset. *Camera:* s11 two blocks closer and 0.5
lower (him 30-35 %, his head above 55 %), the lantern by the door is already there: move it to the side facing the lens.

**F9. Flat ground around the gate and road (owner `flat` WARN).** The cleared plain is 179 x 123, relief sd 3.4; the
final POV (40.45 s) is 30 % flat wheat and path. *Dress:* raise the ridge so it shows behind the raiders (2-4 blocks of
grass hummocks and a hedge line either side of the road 10-30 blocks out); the tower on its hill is already good depth.

**F10. The gate is the weakest build and the climax happens there (S08, S09, S12).** Two plain log posts and a fence
read as "a tree and a fence" in S08/S09 (score ~6 on the building guide checklist; the house ~7, the totem wall 8,
the square 7). *Dress:* a lintel across the posts (spruce log + slab roof), a lantern on each post (no torches rule
is kept), the palisade continuing both sides so it reads as a gate at 300 px.

### NIT
- **N1. S08 (L08) is "dusk" in shots.md, the recording is night 13000** (moon in frame): fine for the grade, but the
  shot list and the bible should agree. The bottle is hidden by his body (from behind): move the lens 1-2 blocks
  further south so the bottle hand is in profile, as planned.
- **N2. A ravager in the first raid wave** is not vanilla (wave 1 is pillagers only; ravagers come in later
  waves), and vanilla's first wave has a captain with an ominous banner (the shot list bans banners). Viewers who
  know raids may comment. Drop the ravager (more pillagers), or accept it as a known stretch.
- **N3. The drink (L12) covers the caption.** The first-person bottle bobs at screen centre-left over the caption band
  for 1.6 s (vanilla's drink transform puts it there). Captions keep their stroke; acceptable.
- **N4. continuity: 3 item frames "appear" 0.85-2.05 s into S04.** describe shows every frame present at 8.8 s and
  11.0 s; these are wall frames seen through the window as the camera drifts (visibility, not a pop-in). Not a render bug.
- **N5. The speaker tag "GRANDPA" over L09's caption in the old cut** goes away with vNext (every line narrated).
- **N6. S07 -> POV cut changes 2 blocks (a chest appears at -2050 73 -498).** Intended? If not, place it in setup.

## Per line (vNext)

| line | shot | shows its line? | notes |
|---|---|---|---|
| L01 | s01 | partly | B1 |
| L02 | s02 | no | F3, F4 |
| L03 | s03 -> s04 on "They KNOW" | yes | F5, F6; s03 Grandpa 13 % (just at the wide minimum) |
| L04 | POV on the wall (new, not recorded) | likely | same room as B1: the same light fix; aim the empty frame with `K.top` |
| L05 | s05 | weak | F4 (bread not visible while he is in frame) |
| L06 | s06 | the tower yes, Grandpa no | F4 |
| L07 | s07 -> POV chest | yes | F1, N6; S07 face luma 0.28 OK |
| L08 | s08 | partly | N1 |
| L09 | s09 | yes | F5 |
| L10 | s10 -> s10b | yes, too dark | B2 |
| L11 | s11 | weak | F8 |
| L12 | POV drink -> road, Raid bar | yes | F2, F7, F9, F10, N2 |

## Engine

No confirmed engine bugs in this story. The owner-check blockers (GUI view motion, whip) are stunt-side and the kit
now prevents both. The continuity tool's item-frame "appears" warning (N4) looks like a visibility false positive
through a window, not a renderer pop-in.

## Addendum (lead, 2026-11-10): premise-breaking set details and shot variety

**Totems: pass.**
- The recording holds 38 item frames: 31 with `totem_of_undying`, one empty (the plant), plus bottles, a crossbow and
  a bowl. That matches L04 "THIRTY-ONE totems ... ONE frame still EMPTY".
- Keep them readable: the B1 light and camera fixes are what make 31 countable.

**Other premise checks:**
- L05 "the VILLAGERS throw him BREAD": the bread throw happens after he has left frame (F4). This contradicts the line:
  promote to BLOCKER. Fix: hold the throw while he is in frame.
- L07 "A whole CHEST" of ominous bottles: the chest GUI must show a full chest of them.
- Nothing on screen contradicts "Raid THIRTY-ONE? He won ALONE." in the vNext shots.

**Shot variety:**
- FS → FS at the same place at 28.85 s (s09 → s10). Make s10 a medium.
- 36.65-45.0 s is two POVs back to back (shots 14-15, 8.3 s first person): cut a camera shot between them.
