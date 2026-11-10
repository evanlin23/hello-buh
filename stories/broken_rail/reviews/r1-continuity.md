# broken_rail r1: continuity (pre-build)

Verdict: fix

## Breaks
1. **Grandpa's mark (S01, S13, S14).** S01 puts him beyond the fg buffer, on the track where the cart would hit him. S14 has him north of the cart. Bible row: *Grandpa at (0,-1), just north of the buffer (0,0), facing south; the cart stops at (0,1).* S01/S13 fg: the lamp post and bench, with the buffer at his feet. S14 camera: (-6,1.6,0).
2. **S13 cart over the far crest** is ~150 blocks out, a speck, and 2.3 s at 8 b/s covers only 18 blocks. Bring it off the bridge (~45 blocks) on "waiting" and hop it 15 out at the cut.
3. **Grandma in a moving cart (S12b-S14).** Staging lesson: mineflayer doesn't move passengers. set.md: tp her with the cart every tick.
4. **L12: the picture can't keep up with the words.** Fitting 7 dirt, 7 rails, a torch and the walk round the cart before "PUSHED" leaves about 2 s. Add `<short pause>` after HOLE and after RAILS (about 3.5 s total).
5. **L08:** the walk starts on frame 1, before "WENT". Start still at the bridge foot.
6. **L02 look:** on "COMING" the crane has Grandpa at ~34 blocks, about 6% of the frame. Change it to `{what:"prop:the_line", word:"RAIL"}`.
7. **S03/S05 geometry.** A camera looking north from the yard can't hold the ESE station in S03's bg. Drop it there and in the bible. S05: Mom at the gate facing the station, camera 10 behind her.
8. **Easter egg:** the town lies east of Light Sleeper, so the village is west. Move it to S01/S13 frame right (under the sunset), not S09 frame left.
9. **Props:** crater `[0,-2,0]` resolves to the station origin because there are two sites. Use valley-site coordinates.

## Notes
- S10: no rail in mid-air; end it on the lip's last block.
- L03 "his CART" can read as Grandpa's cart ("his OWN cart").
- S06 looks north, so the bg is the village. Centre ROSE's spur.
- S14 looks east into the sidings: ROSE's empty spur in the bg is free payoff.
- S12b says both "still" and "pans". Pick one.
