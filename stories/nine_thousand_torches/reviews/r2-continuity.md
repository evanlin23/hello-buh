# r2 continuity (pre-build)

Verdict: clear

## Round-1 breaks: all fixed
1. Door to cottage: 14 blocks in the bible, set.md and S08. Fixed.
2. S05: the crane ends 11 blocks out, with the garden fence in front and the west hills behind. Fixed.
3. Flashback: the whole box is swapped with `/clone` stashes, and A goes back on S08→S09, so nothing races S10. Fixed.
4. S09: a POV walk into the room, with the chest screen opening on 'STUFF'. Fixed.
5. S10: he stands on the bed, so his eye is about 1.37 and he sees over the sill. Fixed.
6. S12-S13: the strip is across the street, looking north, and the row has a path gap. Fixed.
7. S13→S14: Milo is crouched at the doorstep in both shots. Fixed.
8. Milo holds exactly 1 torch, and his hand is empty after 'LAST'. Fixed.
9. S11: the angle matches S05, on 9x9 coarse dirt, at `wide`. Fixed.

## Notes (none block)
1. **S06, our_door, first seen at `full`.** our_door never gets a wide, so `./hb framing` will flag a new place with no wide shot. Fix: pull S06 back to about 9 blocks, size `wide`, with the whole house front, the roof and the lamp post. Then end S05's crane at about 7 blocks (`full`) so sizes still change at every cut.
2. **Name tag while sneaking.** set.md's engine row hides the name while he sneaks. The bible (and vanilla) say it shows dimmed. As planned, S13 and S14 would lose Milo's name on the reveal. Fix: draw the tag at reduced opacity while `extra.sneak` is set, not see-through.
3. **Chat carries across the cut.** "Milo left the game" (S06) is held for 10 s, so it would sit over S07 with Milo on screen. Clear the chat overlay at the S06→S07 cut.
4. **S06's torch is still on the door spot in S07-S08.** Remove it at the S06→S07 cut.
5. **Time ticks.** S13→S14→S15 is one continuous moment, but it jumps by about 100 ticks at each cut. Set each shot's start tick to the previous shot's end tick. In A, S01 (about 60 ticks long) is followed by S02 at 23050, so time runs backwards. Space the ticks by the line lengths.
6. **L15 look.** Milo vanishes on 'He', the word that carries `look: actor:Milo`. Move the look to `prop:door_spot` alone, or vanish on 'say'.
7. **The row along the house front** needs grass between that front and the 3-wide path. Confirm this at the scout and write the exact row coordinates into the bible.
8. **S06/S14:** keep the kid nearer the lens than the door spot, so he doesn't hide the torch.
9. **Room size:** check at the scout that our house's interior is at least 7x7. Add L14 `prop:last_torch` on 'THERE'.
