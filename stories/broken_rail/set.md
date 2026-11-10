# broken_rail: set brief (r1)

Two sites on natural terrain: the **rail town** (station, yard, sidings, bridge, the first stretch of line) and the
**valley** (the line over a ridge, the crater on the valley floor). The story says 3,000 blocks between them; the build
can put them anywhere on the map, as long as the valley site is out of sight of the town in every shot. Every set
follows `docs/building_guide.md`; no clearing, no superflat.

## Site 1: the rail town
- **Choose with** `sets.planSite(ctx, pieces)` over: a vanilla `village_plains` (placed once with `sets.vanilla`, mobs
  `freeze`), a `cottage` (spruce) at the village's south edge for our house, the station footprint (12 x 20) south of
  it, and the `bridge` 40 blocks south of the buffer. Ask for a site where the ground south of the village drops into a
  river ravine 8-12 deep (`bridge` variant `drop` to match, `length` ~25) and rises again into hills beyond it: those
  hills fill the top third of S01, S07, S13. If no ravine comes up, `sets.findShore` for a river and put the bridge
  across it.
- **Station** (no library piece; build by hand, ~40 min, or add a `station` piece if a second story wants one):
  - the main line: one rail running due south from the buffer stop, through the platform, onto the bridge deck centre,
    and on up the far hill for ~120 blocks (out of S01/S13's frame into the fog);
  - the buffer stop: a stone-brick wall block at the rail's north end with a stone-brick slab on top and a lantern
    on the slab;
  - the platform: smooth stone slabs, 3 wide, 14 long, on the west side, with 2 lamp posts (`dress.lamp`, post style),
    a spruce bench (stairs), a hanging oak sign `ELMWATER | 4500 →` facing north;
  - the sidings: two 6-rail spurs on the east side joined to the main line by a curve, each ending in a buffer stop;
    an oak sign over each (`OTTO`, `ROSE`); a minecart on OTTO's spur;
  - dressing: barrels and crates (`dress.clutter`, crates) at the platform's back, flowers along the ballast
    (gravel under the rails, frayed with coarse dirt by `dress.path`).
- **Our yard**: south of the cottage (garden on), a 5x5 rail loop on grass with a minecart on it and a pig in the cart
  (`/summon pig` then `/ride @e[type=pig,limit=1] mount <cart>`; NoAI off so the head can follow the carrot in
  S04, or a staged head turn), fence round it, the carrot patch from the cottage's vegetable bed.
- **Bridge**: library `bridge`, `facing: 'south'`, `length` 25, `drop` to the ravine; the rail laid down its deck
  centre (the deck is planks: rails sit on it). Anchors: `end_a` (village side) for S07's camera base, `middle` for S08.
- **Depth for each establishing shot (fg / mid / bg out to the fog):**
  - S01/S13: fg the buffer and a lamp post; mid Grandpa, the platform, the line; bg the bridge (its lamp posts) and the
    hills beyond the ravine, a `grove` of fancy oaks on the far ridge, the sunset.
  - S02: fg platform and sidings; mid the station and our cottage; bg the village roofs (left), the bridge and hills
    (right).
  - S05: fg the cottage gate lanterns; mid Mom in the doorway; bg the station 30 blocks off, the line into the hills.
  - S07: fg the cobbled path and a lamp post; mid the bridge and ravine; bg the hills with the line climbing them.
- **Cast placement**: Grandpa at the buffer stop facing south (NoAI villager); Mom in the cottage doorway; the fletcher
  at the bridge foot (a `K.actor` walk out and back, S07); Grandma's arrival for S13-S14 is a cart on the main line
  (see "Engine").

## Site 2: the valley
- **Choose with** `sets.findSite(ctx, { w: 40, d: 120, minRange: 12 })`: a long valley (a river or stream valley,
  plains/meadow, spruce on the ridges) with a ridge 15-25 blocks high at its north end. The line: rails down the ridge
  (slopes), along the valley floor ~80 blocks, a powered rail with a redstone torch beside it every 8 blocks.
- **Crater**: on the valley floor, 7 wide at rail height and 3 deep. Make it with a real explosion (`/summon creeper`
  with `Fuse:0`, or `/summon tnt`) on the line, then re-dress: every exposed dirt/stone face to grass block, `dress.grass`
  and two dandelions on the floor and sides (grown over: old). The near stub ends at the north lip; the far stub at the
  south lip ends in a powered rail whose redstone torch block is air (dark rail).
- **Her cart**: a minecart on the far stub's last rail, Grandma (farmer, NoAI) riding it, yaw facing north.
- **S12a**: the bot places 7 dirt across at rail height, 7 rails on them, then a redstone torch beside her powered rail
  (the rail lights). **S12b**: the bot walks into the cart from the south; the lit powered rail launches it north
  (lessons.md: empty carts lose speed, but a ridden cart on boosters every 8 blocks is fine; check it clears the crater
  bridge and leaves frame left within ~1.2 s).
- **Depth:** S09: fg ridge-top spruces, mid the line and Milo, bg the valley, hills to the fog, and the easter egg;
  S10/S11a: fg the near rail stub and the crater, mid her cart, bg the line on into the valley and the valley wall;
  S12b: fg ferns, mid the cart and Milo, bg the valley side.

## Easter egg
S09's far hill at frame left: the carpeted village of Light Sleeper. If that set isn't built in this world, stand in a
small cluster of 3-4 houses with red and orange carpet roofs and a wool-boxed bell post on the hill, 120-180 blocks from
the camera (readable as carpet-roofed houses, not detail). **Provisional: re-check against docs/world/canon.md.**

## Engine features this story needs
| need | status | estimate | plan |
|---|---|---|---|
| a villager and a pig drawn **sitting in a minecart** (the passenger offset; VillagerModel's riding pose with the legs forward, hidden in the cart) | brief says villagers sit in carts natively; not found by name in `renderer/entities.js`: verify with a fixture still first | ~45 min if missing (harness: record the vehicle id into `extra.riding`; entities.js: the passenger y offset from `Minecart.getPassengerAttachmentPoint`, the riding leg pose from VillagerModel/QuadrupedModel) | under 2 h: build it |
| powered rails lit/unlit drawn correctly, the redstone torch placed on camera | rails and redstone torches render (renderer/light.js knows redstone_torch) | check in a still | none expected |
| a ridden minecart rolling on rails in camera shots (S12b, S13, S14) | minecarts render (MinecartRenderer in entities.js); a moving cart is recorded like any entity | check S13's far cart is visible at ~60 blocks | none expected |
| the pig's head following the carrot (S04) | vanilla tempt goal looks at a player holding a carrot even while riding; if the recording doesn't show it, stage the head turn (`headYaw`) | 10 min | stage if needed |
| the knock of the cart into the buffer (S14) | vanilla minecart sounds come through `relaySounds()` | none | none |
