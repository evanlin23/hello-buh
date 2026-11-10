# forty_one_cats: set plan (r1)

- Claim `kettle_hollow` first:
  `node scripts/world.js claim kettle_hollow --name "Kettle Hollow" --at -1585,<y>,-692 --footprint ... --story forty_one_cats --day 2400`.
  Read y off the survey. Commit the claim on its own.
- **Wall:** ONE block of full blocks (mobs hop it; see the checklist), following the terrain around the generated village. Use the village's real
  slopes and houses; no flattening.
- **Cats:** 41, `Sitting:1`, tamed (owner: Grandma can't own them, since villagers aren't players). Tame them to
  the boy's player so they stay sitting, then order the one by his window to follow the fish in S07 by unsitting
  it.
- **The creeper in S10:** summoned at the gap, its walk path-scripted along the lane. It must pass two villagers
  standing in open doorways (vanilla: creepers ignore villagers). At the window, ignite it (`ignited:1`) for the
  swell. Cut before the blast.
- **Engine checks:** cat variants (it renders), the creeper's swell and flash (check), falling snow (the weather
  renderer).

## Pre-build checklist (from reviews/r1-continuity.md)
1. Claim `kettle_hollow`. Add `"forty_one_cats": {"day": 2400, "places": ["kettle_hollow"], "status": "claimed",
   "cameos": ["old_road"]}`, and register the new `old_road` cameo (a signpost at the south gate reading
   RAVENFORD / FROSTGATE), or log an exception in canon.md.
2. **Override the palisade note above:** the wall is ONE block of full blocks, not a 3-high palisade.
3. Engine features: the cat sit pose, collars (blue) and variants. Only the tabby is drawn today.
