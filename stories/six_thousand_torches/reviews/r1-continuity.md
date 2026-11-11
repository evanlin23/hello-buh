# r1 continuity (pre-build)

Verdict: fix

## Must-fix
1. **S06/S15:** the planned cameras, (-24,16) and (-24,12), are inside the house across the street. Shoot both from the street at about (-15,9) and (-18,9), looking WNW.
2. **S15→S16:** the kid is east of the door spot in S15. S16's POV needs him south-west of it. Bible: `kid at (-24,8) in S15-S16`.
3. **S13:** nothing round the corner is visible from the alley. On 'GROWING', place (-19,10) then (-19,9), with Jonah unseen.
4. **"six THOUSAND":** one torch per column gives only about 4-5k in the 78x78 box, and the plot falls outside it. Widen the box to about 90x90 and log 6,000 or more.
5. **S01's dog:** at pitch -35 the skyline is out of frame, and Dog Hill's ridge (y 111) hides D. Use pitch about -20. Drop the egg and keep the hill on the skyline.
6. **Canon:** `larkfield` is unclaimed and nine_thousand_torches holds the same place and day. Claim it with `--story six_thousand_torches` and make the timeline row "walks away".
7. **No `look`:** "JONAH" infers entity `a`, and the props' `at` values are prose. Add:
   - `block:torch` on L01-03, L12, L13
   - `actor:Jonah` on L05, L07-09, L15, L16
   - `block:oak_door` on L06, L14
   - `block:chest` on L10
   - `false` on L04, L11

   Make each `at` an array.

## Should-fix
8. S08 at 2 blocks is a CU, and S07→S08 are both MS. Make S08 FULL at about 6 blocks.
9. S16: Jonah is about 14 blocks out at 'TOMORROW', not 8, and the sun is behind him. Start at 2 blocks and use FOV 50.
10. Dressing skip list: (-23..-20, 9) and the door spot.
11. S02's hay is "by the meeting point" in one file and "at the lane's end" in the other. Pick one.
12. The narrator reads as canon Pip. Note "not Pip" in the bible and in canon.

## Notes
The A/C ticks step back at the cuts. jonah_house first appears at FULL. Room size is unchecked. State that the door spot is empty in S09.
