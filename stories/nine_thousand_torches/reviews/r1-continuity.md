# r1 continuity (pre-build)

Verdict: fix

## Breaks
1. **Places/S08:** the bible puts the door and the cottage 48 blocks apart. set.md and S08 say 12-15. Bible row: `our_door | about (-24,6), door 12-15 blocks east of Milo's`.
2. **S05/L05:** with the hay as foreground, Milo is about 38 blocks out, a speck. End the crane 10-12 blocks from him, with the garden fence in front. The background is the west hills.
3. **Flashback patch:** one story torch in a B frame breaks the premise, and S05 and S08 see more than 45x30. Size the patch from all four frustums, or swap the whole box with `/clone` between two stashes (raise `commandModificationBlockLimit`). That also fixes the restore racing S10.
4. **S09:** this new interior opens on a CU, and the chest has no wide. Start S09 as a POV WS from the door and open the chest on 'STUFF'. Vanilla rooms are under 7x7: use the largest house.
5. **S10:** at eye 0.81 the kid is below the sill and sees only sky. Step him onto the bed as the shot opens.
6. **S12-S13:** "south toward the plaza" points away from the plaza, and the route can't reach a south door. Put the strip across the street from our door. S12 looks north and the row runs straight to the doorstep, with a gap at the dirt path.
7. **S13→S14:** Milo pops in. On 'MY door', S13 shows him kneeling at the doorstep.
8. **S14→S15:** after placing from a stack he still holds torches. Give him exactly 1 torch, gone on 'LAST'.
9. **S11:** the 81-torch square looks like the rest of the village. Match S05's angle and use a coarse-dirt footprint. The size is `wide`.

## Notes
- S14/S15 look north, so the sun is out of frame.
- Nothing marks the cut into the flashback: put villagers on the streets in S05.
- S04 says "fog", but `fog:false`. S11's fence isn't in set.md.
- A one-torch row leaves unlit grass: make the strip 1 wide.
- Kneel and wave aren't vanilla player moves. Use sneak and arm swings.
