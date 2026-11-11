# Saving Up for a Bastion: continuity r1 (pre-build, 2026-11-11)

Verdict: fix (6 blockers)

## Blockers
1. **S02/L02, the catch hole can't reach the cell.** The hole is "at the tower's foot", but the cell sits above the chest room, 3+ blocks up. You can't fall up into it. Fix: build the tower against a netherrack cliff (the natural ground the owner asks for) and put the hole on the ledge above. Make the cell 1x2 in plan: the west column is the baby's block under the dropper, with the window; the east column is a chute from the hole down onto the hopper floor. The chest goes under that hopper.
2. **S10/S11, the chest can't show "empty".** Vanilla never draws items inside a chest. The lid also closes when nobody has the chest open, so "chest OPEN, player gone" in S11 can't happen. Fix: on 'GRAVEL' in S10, show the empty 27-slot chest screen (edit.py `container_png`, `guiScale: 4`). In S11 the player stays slumped at the open chest, at the bottom of the vertical line.
3. **S09, the baby can't see the sign.** A wall sign under the window faces outward, so from inside you see its back. Also, a player at the window would see the baby, and he must not know about it. Fix: make S09 an exterior CU. The sign goes at chest height on the tower's foot. The player places it and never looks up. Bible row: `sign | absent in S02; PLEASE / WORK on the tower's west foot from S09 (present in S01, S03-S05, S11)`.
4. **S07, swapping the hopper under the baby makes the baby fall** onto the chest, in the player's view. Fix: use blocker 1's layout. The swapped hopper is the east column's, and the baby is on its block beside it, out of the player's eye line.
5. **S07/S10 have no room.** Inside a 3x3 tower the chest room is 1x1, too small for a camera, a player and a chest (owner: "the sets are all so small"). Fix: a 7x7x4 nether-brick base room with the 3x3 column rising from it to about 11 blocks. It also reads better in the wides.
6. **S06 MS cuts to S07 MS.** The shot size must change at every cut. Fix: make S06 a WS (the whole tower, the player on the roof, the cliff).

## Should-fix
1. **L01 order:** the line says INGOT before SKY, but the frame has the dropper click on SKY and the catch on INGOT. Fix: click on "gold", the fall under "falls from the SKY", the catch on "CAUGHT".
2. **The bible's prop rows follow shot order, not story time.** S01, S03-S05 and S10-S11 are the present, after all the gifts, so the new hopper, the moat and the sign are already there. Only S02 is before them.
3. **The count doesn't fit the timeline.** 400 ingots x 6.05 s = 40 min, which is 2 game days, so S02 can't be "the same day, earlier". Also, a farm working since ~4900 would have barters in its chest. Fix: S02 is "two days ago", and the farm is finished on day ~4998 with the baby as its first catch (update map.json `about` and set.md).
4. **The adult piglins would attack the player:** he wears no gold. Fix: give him golden boots (not a helmet, which is the easter egg's tell).
5. **Pin the egg's item:** `golden_helmet[trim={pattern:"sentry",material:"lapis"}]`, the same item as Gold for the Portal's S06/S14. In S03 keep it out of frame (behind the portal) so it appears only in S04.
6. **`shows`:**
   - L02: add HOLE (trapdoor).
   - L12: add `chest`/`hopper` on COUNT (the reveal).
   - L05: `bastion_remnant` isn't a block id; use `blackstone`/`gold_block`.
   - L01: `piglin_baby` should be `piglin` (baby).
   - No line has `look`. Add it. Use `look: false` for CASTLE (L08) and GRAVEL (L10/L11).
7. **Engine features to build, not stage around:**
   - per-shot hidden blocks, for S11's cutaway (really removing the wall would free the baby) and for the in-cell cameras in S01/S03;
   - the piglin admiring pose (entities.js only draws ArmPose.ITEM).
8. **The Nether ground is invented and unsurveyed.** The footprint (-40..8, -140..-96) holds no bastion "across the lake". Fix: survey it, or have world.build build the shelf and lake and mark the bastion as skyline.
9. **canon.md:**
   - Add a place row and a ~4998/5000 timeline row.
   - Conflict 18 lists `ari`/`efe` as free skins, but `ari` is Gold's Grandpa and `efe` is now this player. Leave `noor` for The Wall Grows.
   - map.json says "the portal Grandpa lit". Canon says he walked in, so write "came through".
   - Window direction: map says "to the lake", set says "west to the shelf". Pick one.
10. **S08 size:** "wide" isn't a size code. Use `ws`.

## Notes
- Vanilla agrees with the set: a piglin's inventory is 8 slots, so 512 maximum and 400 is possible. A baby moves the ingot to its main hand after the 119-tick admire, so "always off hand" only holds because of the 6.05 s clock.
- An ingot that lands while the baby is still admiring goes into the hopper, and the chest would get gold. For the minecraft-audit.
- Bible: the player came in through his own portal, not the cottage's cellar. Put a one-block bridge over the moat at the east door.
- A clock spins wildly in the Nether (S06). Use it as a gag or cut it.
- Cast `on_screen` says "in the cell except S06-S08", but S02 and S10 don't show the cell either.
- Screen direction (bible row): looking west from the window, the portal is at frame right and the bastion at frame left. In S02 the baby runs left to right (east, camera facing north).
- Gold for the Portal's story.json origin (-110, 85, -990) differs from canon (-126, 80, -938). Canon wins, and /8 still lands in this footprint.
