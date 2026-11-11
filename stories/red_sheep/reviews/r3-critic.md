# red_sheep: critic r3 (Dad version)

Verdict: **REVISE** (average 7.46, Owner fit 6; two must-fixes, both in S12)

## Cold read
Dad keeps sixty sheep blue and counts them nightly, because one came back from the woods red and the trees snapped. The kid follows her escaped lamb into the woods alone, and it turns red in front of an evoker. The flock is an alarm, so "They're our EYES" was literal.
- **Mystery:** the question lands in 3 s. At the midpoint casual viewers guess "red = something in the woods" without being sure; wololo players are sure at L05 (about 40%, early). **Cut: fails** (must-fix 1).
- **Mechanic:** the wololo is right. Wrong: there's no particle puff on the sheep, and fangs don't come next. Summon Vex (goal priority 4) outranks fangs (5), and with no vexes its `nextInt(8)+1 > vexCount` check always passes.

## Scores
Hook 8 · Second beat 8 · Mystery 7 · Twist 8 (L03 flips, one step, shown by the game) · Fairness 8 · Rewatch 8 (L02, L03, L04) · Agency 8 · Character 7 · Delivery 7 · Visual 7 · Continuity 7 · **Owner fit 6** · Canon 8 (stands alone; egg and lore fine)
Against runaway: worse. It breaks a custom, not a mechanic, and players get ahead at 40%.

## Must-fixes
1. **S12/payoff/ending/sfx:** the reveal is at +0.3 s but the cut is at about +3.4 s, leaving 3.1 s after the answer. Owner: "need to cut right when the reveal". **Cut at +1.3 s** as the arms fall and the head turns to the lens (eyes on her). Delete the fang sfx and fang text. This also removes the vex error.
2. **S12 and `twist`:** delete "in a puff of particles". The wool changes on the cast tick with cast_spell, and the particles stay at the evoker's hands.

## Should-fixes
- The one-take direction is bubbly. If L10-L11 come out excited, split rN at L05 with "[scared, quick, not hushed]".
- L09: the caption and `say` stress different words. Make both `I didn't tell DAD.`
- The cast note says "Empty hand" but the hotbar note says shears. Select the **lead**.
- S06: the crossbow on his knees is hidden from behind. Put it in the hand on the camera's side.
- The woods at +45 sit by the tower (+44, +40). Check the seed has birch there.
- Pinned comment "alarm" spoils it. Use "Would YOU have followed the lamb?"
- Premise-bank row 22 still says Grandpa and "Buh's lamb".
