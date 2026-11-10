# forty_one_cats r1: continuity (pre-build)

Verdict: fix

## Must-fix
1. **World:** claim `kettle_hollow` before building. The White's village at (-1585, -692) is unclaimed land. Then add `"forty_one_cats": {"day": 2400, "places": ["kettle_hollow"], "status": "claimed", "cameos": ["old_road"]}` (see 10).
2. **A 3-high palisade makes the cats pointless:** creepers can't climb it, so the gap lets nothing in. Make the wall 1 block of full blocks (no fences or wall blocks), which mobs hop. Also fix the bible's maths: cats 10 apart, each scaring creepers for 6 blocks, overlap with no lane; one missing cat opens an 8-block lane.
3. **The creeper's route can't happen:** the gap sits 2 blocks from his window (bible; props say 6), so it can't walk "along the lane past the open doors". Put the houses in a row along the inside of the wall, a 3-wide lane between, the neighbours' open doors 5-8 blocks either side of his window. S10 holds them in frame while the creeper crosses at the gap. Pick one wall-to-window distance (4).
4. **The cat on the bed is within 6 blocks of the creeper,** and vanilla creepers flee a cat they can see. Make his window glass. In S07 he lures the cat in through the door (a door used on screen) and shuts it. The glass hides the cat, and that is why it doesn't flee.
5. **Weather:** `weather: "clear"` but it snows. Set `weather: "rain"` (it falls as snow in this biome) for the whole story: rain ramps 0.01 per tick, so a clear→snow cut fades in over 5 s. Add per-shot `look.time` (S01-S05 1000, S06 13000, S07-S10 18000).
6. **Engine (build):** cats draw only as a tabby, with no sitting pose and no collar (`renderer/entities.js` has these for wolves only). All 41 sit and are tame, so build the sit pose, the collar (blue, not the dog's red) and the variants.
7. **Missing establishing shots:** Grandma's house and the bedroom open on ms. Make S03 a WS from behind Grandma, with the wall and cats through the window. Make S07 a WS of the room (bed, door, window).
8. **S10 says the boy is "asleep",** but S09 wakes him. Show him in bed, head turned to the window.
9. **The Steve skin reads as Buh.** Use another default skin.

## Should-fix
10. **Easter egg (the open question):** no canon cameo is in sight. Proposed new cameo `old_road` (since 1500): a spruce signpost at the south gate reading RAVENFORD ← / → FROSTGATE, the road kid Buh crossed around day 1550. Background of S01, 1-2 s. Add it to map.json `cameos` and canon.md. Fallback: log "Kettle Hollow: no cameo (exception)" in canon.md.
11. The cats arrive around day 2380, so 41 cats came in 20 days. Set the boy's arrival and the first cat at about day 2100.
12. Make the cat by his window the oldest one (S04), not the one by the gate.
13. Snowy plains are flat: give every exterior shot spruce, ice spikes or a rise in view.
