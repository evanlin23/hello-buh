# sun_wont_set r2: continuity r1 (pre-build, 2026-11-11)

Verdict: fix

## Must-fix (breaks / owner rules / canon)
1. **Zombie Gary on screen all day.** map.json stamp `gary` is `since: 1100, live`; lib/world.js ignores `night`, so `world.build` day 1100 summons zombie Gary by his field in every shot, beside living Gary in S02. Set it to `since: 1101` (and make `night` real in lib/world.js, or have the stunt skip it).
2. **The lever builds OFF.** The `lever` stamp is `powered=false` with no days. Split it: `lever_long_day` (`powered=true`, since 800, until 1101) and `lever` (`powered=false`, until 800 and from 1101). The stunt flips it on L15's BACK.
3. **Death screen name.** The bible's "HelloBuh was slain by Phantom" goes against STANDARDS 402 and the owner's 11-11 notes ("still says hellobuh"). The harness default is `56e`. Either let it say `56e was slain by Phantom` (my pick), or the lead gets an owner OK for `botName: 'HelloBuh'`.
4. **`look` targets the checker can't resolve.** `prop:sun_village`, `tree` and `grandpa_door` only have `note`, and `"sky"` resolves to an actor called sky. `prop:lever` `at:[0,1,0]` is (-215,69,-1060), but the lever is at (-214,70,-1062). Set these from the set origin (-215,68,-1060): lever `[1,2,-2]`; tree `{"at":[27,6,2],"h":8}`; grandpa_door: measure it from the cottage's `door` anchor after `world.build`; sun_village: the cottage roof. For L17, use `{"what":"entity:phantom","word":"SKY"}` with one phantom 12-15 blocks up, not a speck. The `actor:grandpa` and `actor:farmer` tags must match the stunt's K.actor tags. The cast key `Grandpa` would resolve to entity "plains".
5. **S14 is two directions in one frame.** The sun sets behind the cottage to the west, and the tree is 44 blocks east. Shoot from about 10 up, east of the tree, looking west: the tree and zombies in front, the lever in the middle, the cottage and the sunset at the back.
6. **SAFE shows no door.** L16 lists only S14. In S15 the kid faces east with the door behind him. S16's "camera behind the kid" would sit inside the cottage. Re-stage it:
   - L16 `shot: "S14-S15"`.
   - S15 (on SAFE): a WS from low on the slope looking west up at the kid, facing us, with the closed door and the gate lanterns.
   - S16 (L17): a POV FS facing east, the zombies stopped at the closed garden gate (the reason they don't reach him), then the screech.
   - S17 stays as it is.
7. **Time jump at a cut.** In the bible S14 ends at 13800 and S15 is at 18000, inside one line. Hold 14000 for S15-S17, or let the lapse run on to 18000.
8. **The words lead (L15).** S12 shows Grandpa going in during L14, before "walked him". S12 should be Grandpa yawning at the door, staying put. S13 should open on "walked": POV following him through the door (a `use` mark) to the red bed, him lying down on BED, then a cut to the lever on BACK.
9. **New places with no wide shot.** S02 gary_field is `full` and S03 grandpa_house is `ms`; make both WS. S02 needs a field row, and none exists: add map.json stamp `gary_field` (since 0), about 9x9 of wheat with a fence east of Gary's cottage, toward (-197,-1028). Canon has him working it every night.
10. **The white bed doesn't exist.** The cottage piece has one red bed. Add it to the bible: white_bed, head at the piece's local (6,1,z0) facing south, beside the barrel, under the west window. Put it in map.json `since 800, until 1101`.
11. **S07 vs L08.** The faces show only from the west, which puts the sun behind the camera. Change L08's look to `entity:villager`.

## Should-fix
- Shot sizes repeat at a cut: S10/S11 are both `ms` (make S10 `full`), and so are S15/S16 (fixed by item 6).
- In S08 the sun at 11000 (about 15° up, due west) is hidden behind the cottage from the square. Drop "the sun behind it".
- S01 says "the sea to the north", but a westward 9:16 frame can't show it. Take a `_world_build` still first to confirm the west rise and the hills.
- The cast `on_screen` entries contradict the shots. Grandpa is on screen in S05 and S11 (not S12); the kid is seen only in S15.
- The held item is never stated. Hold slot 3 (bread) from S01 to S14, and switch to slot 1 (the sword) on the S15 cut.
- S08's sfx is a lever click on a lever that stays ON. Delete it.
- Day 1100 is a new moon (1100 % 8 = 4). Set `moonPhase: 'new_moon'`: phantoms against the stars, the lanterns lit, `look.moonlight` raised.
- Stillwater has only 4 buildings (§9 asks for 8-15). Add 4+ pieces with `since 0` before the EWS shots.
- The stunt is still r1 (no `world.build`). Rewrite it.

## Canon rows to change (canon.md, map.json)
- **Grandpa (Stillwater):** plains villager, librarian, no name tag; voice Rasalgethi (gemini-3.8-flash-tts; add it to voices/cast.json). "On day 1100 the kid walked him to bed; safe in his bed when the sun set." Remove "Already gone" and "Kokoro".
- **Timeline 1100:** "...the grandson walks Grandpa to bed, pulls the lever back and guards his door against the zombies; phantoms take him (300 days without sleep): slain by Phantom. Gary is taken that night."
- **Link 9:** remove "The Sun Won't Set 'slain by Zombie'". Conflict 7: per item 3.
- **Link 5:** "a rewatch gains a farmer" becomes "S02's farmer walking into his fence is Gary's last day".
- **map.json `stillwater.about`:** add the grandson's death at Grandpa's door. Change the `long_day_lever` cameo to `since: 800`. Add the stamps from items 1, 2, 9 and 10.
