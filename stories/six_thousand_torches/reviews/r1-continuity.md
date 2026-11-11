# r1 continuity (pre-build)

Verdict: fix

## Must-fix (breaks)
1. **S06/S15 camera is inside a house.** The house across the street (x -27..-20, z 10..17) sits 3 blocks from our doorstep (z 7). "9 out looking north" (S06) puts the camera at (-24,16), and "5 out" (S15) puts it at (-24,12). Fix: shoot both on one axis from the street east of the door, at about (-15,9) for S06 and (-18,9) for S15, looking WNW. The sun is then behind the lens.
2. **S15→S16: the kid jumps sides.** In S15 he is at frame right, which is east of the door spot. S16's POV has the door spot at bottom left, so he must be south-west of it. Bible row: `S15-S16 kid at (-24,8) on the path`.
3. **S13: nothing round the corner can be seen from a 1-wide alley.** Every cell north of z 10 and west of x -19 is hidden, including (-20,9) and Jonah's arm. Fix: on 'GROWING', put torches on (-19,10) and then (-19,9). Jonah stands unseen at (-21,9). Drop the arm.
4. **"six THOUSAND" can't be reached.** `dress.torches` places one torch per column. The 78x78 box has 6,084 columns, less paths, farmland, stairs and water, so expect about 4-5k. Jonah's 9x9 plot at (-38,4) also runs past x -39, outside the box. Fix: widen the box to about 90x90 and log a count of 6,000 or more.
5. **S01's dog can't show.** A pitch of -35 at FOV 60 puts the frame top at -5 degrees, so there is no skyline. Dog Hill's own ridge (y 111, x -214..-208, map.json meadow) also hides D from Larkfield below about y 135, and Larkfield isn't on the cameo's sightline list. Fix: pitch about -20 with the bell in the lower third. Drop the egg and keep Dog Hill on the ESE skyline as geography.
6. **Canon claim.** `larkfield` is unclaimed, and nine_thousand_torches claims the same place and day with "leaves the game". Claim it with `--story six_thousand_torches`, retire nine's claim, and make the timeline row say he walks away.
7. **No `look` on any line.** "JONAH" infers entity `a`, because owner.js reads the first word of `on_screen`. The props' `at` values are prose. Add: L01-L03/L12/L13 `block:torch`; L05/L07-L09/L15/L16 `actor:Jonah`; L06/L14 `block:oak_door`; L10 `block:chest`; L04/L11 `false`. Make each prop `at` a `[dx,dy,dz]` array.

## Should-fix
8. S08 at 2 blocks and FOV 50 is a CU, and S07→S08 are both MS. Make S08 FULL at about 6 blocks.
9. S16: at a player's walk (4.3 blocks/s) Jonah is about 14 blocks out at 'TOMORROW', not 8. At 23720 the sun sits due east, behind him, not off frame. Start him 2 blocks out, use FOV 50, and rewrite the frame as "into the sun".
10. Dressing skip list (bible row): (-23..-20, 9) and the door spot (-23,7). Without it the row exists before S13.
11. S02: story.json puts the hay "by the meeting point" and the bible puts it "at the lane's end". Pick one, within 8 blocks at 'HAY'.
12. The narrator matches canon Pip's model and voice. Add to the bible and canon: "Larkfield's kid, not Pip".

## Notes
- A and C ticks run back 10-14 at the cuts. Set them from the voice durations.
- jonah_house is first seen at FULL.
- Size our room (7x7?) and decide whether parents sleep in frame.
- The strip is z 11..18 in one place and the row runs z 18→10 in another.
- S09: state that the door spot is empty and the torch is in Jonah's hand.
- A ruined portal at (-315,-892) may show in the S05/S12 background.
