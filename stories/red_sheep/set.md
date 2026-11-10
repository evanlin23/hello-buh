# red_sheep: set plan (r1)

Built with `world.build(ctx, { story: 'red_sheep' })` on Ravenford's canonical pieces, with these story-only stamps on
top. No site search and no clearing (STANDARDS 3.5).

## Pieces
- **The pasture:** the canonical palisade, plus an oak-fence pasture inside the south wall (~40 x 30) with a gate on
  its east side. Use the village's natural grass and slope; no flattening beyond the fence line.
- **Lantern posts:** on the pasture gate post, and on the palisade every 8 blocks along the east side.
- **The flock:** 60 sheep summoned with `Color:11` (blue). In S05, one more with `Color:14` (red). The lamb is a baby
  sheep, `Color:11`, with `PersistenceRequired`.
- **The Ridge woods:** the natural terrain east of the gate toward raven_tower. A small clearing at ~60 blocks out
  (S10-S11): the evoker summoned there with `NoAI` until its cue, then its spell. If AI can't be cued, pose it and
  set the lamb's colour at the cue with `/data`. Spell particles: `minecraft:entity_effect` or `witch`. The fangs are
  `evoker_fangs` entities in a line toward the camera, 1 per 2 ticks.

## Engine checks before building
- **Sheep colour change mid-shot:** the renderer reads it per frame (critic r2). Verify on a shot sheet.
- **The evoker's arms-up casting pose, and the spell particles:** check `renderer/entities.js` pose functions. If the
  pose is missing, that's an engine feature (docs/engine_features.md), under 2 h.
- **Evoker fangs:** they render (entity model).

## Scale
- The pasture at full scale, 60 sheep in one EWS (S01).
- The woods begin 40+ blocks from the gate. "Places far apart in the story are far apart on screen."
