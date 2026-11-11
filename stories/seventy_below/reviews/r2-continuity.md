# seventy_below r2: continuity (pre-build, c4701f6c)

Verdict: fix

## Must-fix (breaks)
1. **Hole geometry, S01/S05/S08/S10/S15.** Hole (-2056.5, -489.5) is SOUTH-west of every room camera (S01 dz +2, S08 +4, S05 +3) though each says "looking north-west"; it is one row from the south wall, so no camera can look past it into the crowd. Move the hole to (-2057, -492) (yard cell free) and update canon.md/map.json/set.md.
2. **No oblique view up a 1x1, 4-deep shaft** (y 68-71 once the lid is gone). S05 and S15 cannot show sky or his head. Split S15: S15a, 'SEVENTY': low lens 1 block off the shaft axis, pitched ~70 deg up, upturned faces round the frame edge, sky and head centred. S15b: WS of faces in the light square, then the lid shuts and the screen goes black. In S05, show his arrival as the light square darkening.
3. **S06/S11 "MCU"**: his head is ~7 blocks above an eye at y 66.6, a speck at normal FOV. Put the camera in the shaft (y 69.5) or narrow the FOV to ~25.
4. **Cameras inside blocks**: S04 y 71.6 and S13 y 71.5 are in the yard's grass (y 71). Use 72.6 and 72.5.
5. **S03**: composter (-2058,73,-498) stands between lens and bed. Bed head replaces bookshelf (-2058,73,-501). Move bed to head (-2058,73,-500), foot -499; camera (-2056.5,73.2,-496.5).
6. **Knees-down vs shows "player"**: the check aims at the hip (feet+0.9). S03/S04/S13 framing hides it, so L03/L04/L13 fail. Use waist-down framing.
7. **Unresolvable shows/look**: `baby_zombie` is not an entity type (L02). Neither are `room`, `hole` or `house` (L01, L05, L08, L09, L12, L13, L14). `place:grandpa_house` is not a look kind. Use `zombie`, block ids (`cobblestone`, `glass_pane`) or a `prop` with `at`.
8. **S14 easter egg behind the lens**: blue_flock sheep sit at z -447..-465. The camera is at z -468.5 looking north. Move it to about z -455, y 90.

## Should-fix
9. If he sleeps at 13500 (S03), the night is skipped, so the 18000 counts, S12 (14000) and S14 (16000) can't happen. Move the counts to about 13000, before bed. The spider within 8 blocks of the bed is what keeps him awake that night.
10. S12/S04: the lid is ~75/45 deg off-axis, out of frame. S03: the totem frames (y 74+) sit above the frame top.
11. S04: the renderer can't draw a crossbow leaning on a bench. Drop it.
12. S02 is 3 blocks west of the baby: in the wall if the baby is under the hole. Give coordinates.
13. The narrator below ground can't see the wall (L12/L14). Say "HEARD", or accept.
14. Fix numbers: the shaft is 4 deep, not 3. The drop is 7 blocks (4 damage), not 6. Brother Seventy drops rotten flesh in the room.
