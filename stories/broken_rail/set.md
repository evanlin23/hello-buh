# broken_rail: set brief (r2 polish)

Two sites on natural terrain: the **rail town** (station, yard, sidings, bridge, the first stretch of line) and the
**valley** (the line over a ridge, the crater on the valley floor). The story says 3,000 blocks between them; the build
can put them anywhere on the map, as long as the valley site is out of sight of the town in every shot. Every set
follows `docs/building_guide.md`; no clearing, no superflat.

## Site 1: the rail town
- **The canonical place** (docs/world/canon.md): the rail town (`rail_town`, to claim; bible "World") on the High
  Meadow's east top, the buffer stop about (-305, 116, -770). Built with `world.build(ctx, { story: 'broken_rail' })`:
  no `planSite`/`findSite`/`findShore`/`/locate`. Its map.json pieces: a vanilla `village_plains` (placed once with
  `sets.vanilla` at its canonical spot, mobs `freeze`), a `cottage` (spruce) at the village's south edge for our house,
  the station footprint (12 x 20) south of it, and the `bridge` 40 blocks south of the buffer over a river ravine
  8-12 deep (`bridge` variant `drop` to match, `length` ~25), the ground rising into hills beyond it: those hills fill
  the top third of S01, S07, S13. Read the ground off the survey grid before claiming; if the ravine isn't there,
  slide the place along the plateau's east top, keeping Torch Hill's torch (-290, -684) about 45-50 blocks south and
  a little east of the bridge's north foot (S08's easter egg). The line leaves the bridge south-west, never through the
  Digger's House footprint, and the town stays out of the frames of Torch and Sheep Stares (check their stills).
- **Station** (no library piece; build by hand, ~40 min, or add a `station` piece if a second story wants one):
  - the main line: one rail running due south from the buffer stop, through the platform, onto the bridge deck centre,
    and on up the far hill for ~120 blocks (out of S01/S13's frame into the fog);
  - the buffer stop at (0,0): a stone-brick wall block at the rail's north end with a stone-brick slab on top and a
    lantern on the slab; the last rail at (0,1) is an **activator rail**, kept powered by a redstone torch under the
    platform edge (lit red in S01/S13; it sets Grandma down in S14); Grandpa's mark (0,-1) is on the platform's
    north apron (slabs extended to x -3..0, z -2..-1), north of the buffer, never on the track;
  - the platform: smooth stone slabs, 3 wide, 14 long, on the west side, with 2 lamp posts (`dress.lamp`, post style),
    a spruce bench (stairs) at (-2,-1), frame left in S01/S13, clear of Grandpa, a hanging oak sign `ELMWATER | 4500 →` facing north;
  - the sidings: two 6-rail spurs on the east side joined to the main line by a curve, each ending in a buffer stop;
    an oak sign over each (`OTTO`, `JUNE`); a minecart on OTTO's spur;
  - dressing: barrels and crates (`dress.clutter`, crates) at the platform's back, flowers along the ballast
    (gravel under the rails, frayed with coarse dirt by `dress.path`).
- **The hotbar**: no rails until L08 (S06: carrot, dirt, torch); give the rails stack on "RAILS" in S08.
- **Our yard**: south of the cottage (garden on), a 5x5 rail loop on grass with a minecart on it and a pig in the cart
  (`/summon pig` then `/ride @e[type=pig,limit=1] mount <cart>`; NoAI off so the head can follow the carrot in
  S06, or a staged head turn), fence round it, the carrot patch from the cottage's vegetable bed. The loop sits between
  the garden gate and the camera spot of S03 (10 blocks behind the gate, looking ESE to the station), so the pig is in
  S03's foreground.
- **Bridge**: library `bridge`, `facing: 'south'`, `length` 25, `drop` to the ravine; the rail laid down its deck
  centre (the deck is planks: rails sit on it). Anchors: `end_a` (village side) for S07's camera base, S08 is POV standing still at `end_a`.
- **Depth for each establishing shot (fg / mid / bg out to the fog):**
  - S01/S13: camera 5 behind and 2 west of Grandpa: fg Grandpa's face, apron and the buffer lantern (lower-left
    third), the bench at the left edge; mid the activator rail and the line; bg the bridge (its lamp posts) and the
    hills beyond the ravine, a `grove` of fancy oaks on the far ridge, the sunset at frame right.
  - S02: fg platform and sidings; mid the station and our cottage; bg the village roofs (left), the bridge and hills
    (right).
  - S03: fg the yard loop and the pig's cart; mid Mom at the gate; bg the station 30 blocks off, the line into the hills.
  - S04: fg platform slabs; JUNE's spur centred; bg (north) the village roofs.
  - S05: looking north from the yard fence: the pig's cart, the cottage behind; no station (it is behind-right).
  - S07: crane from Grandpa's shoulder: the station, the line, the bridge 40 blocks south, the hills beyond.
- **Cast placement**: Grandpa at (0,-1), body facing south (NoAI villager), headYaw ~40 deg west toward the sunset in S01/S13; Mom at the garden gate facing the station (S03).
- **Grandma's arrival (S13-S14)**: a minecart on the main line, summoned off the bridge's north end on "waiting"
  (~45 blocks out), driven down the line; it is ~27 blocks out at S13's cut (8 b/s x 2.3 s = 18 blocks); **hop it to ~3 blocks out at the cut** to S14, so it
  knocks the buffer 0.3 s before L14. Grandma is **tp'd with the cart every tick** (mineflayer doesn't move passengers: staging lesson), seated.
  On the knock, the activator rail "sets her down": end the ride and tp her standing at (0,1), facing north.

## Site 2: the valley
- **The canonical place**: the crater (`rail_crater`, to claim; bible "World"), 3,000 blocks down the line in a
  green valley of the West March's south lakes, about (-2050, 66, -250), built with `world.build` (no `findSite`).
  Wanted there: a long valley (a river or stream valley,
  plains/meadow, spruce on the ridges) with a ridge 15-25 blocks high at its north end. The line: rails down the ridge
  (slopes), along the valley floor ~80 blocks, a powered rail with a redstone torch beside it every 8 blocks.
- **Crater**: on the valley floor, 7 wide at rail height and 3 deep. Make it with a real explosion (`/summon creeper`
  with `Fuse:0`, or `/summon tnt`) on the line, then re-dress: every exposed dirt/stone face to grass block, `dress.grass`
  and two dandelions on the floor and sides (grown over: old). The near stub ends at the north lip; the far stub at the
  south lip ends in a powered rail whose redstone torch block is air (dark rail).
- **Valley-site origin**: the crater's centre at rail height. Near stub ends on the lip's last block at (0,0,-4) (no rail
  in mid-air); far stub's last rail (the dead powered rail) at (0,0,4).
- **Her cart**: a minecart on the far stub's last rail, Grandma (farmer, NoAI) riding it, yaw facing north; when the
  cart moves (S12b), tp her with it every tick.
- **S12a** (3.8 s line with two short pauses; S12a ~2.8 s, S12b ~1 s): a jump cut in with 3 dirt already across at
  rail height; the bot walks forward along the row placing the last 4 on "I bridged the HOLE" (reach ~4.5: the far rail
  is ~9 from the near lip), walks on laying 7 rails on "laid RAILS", and from the last rail places a redstone torch
  beside her powered rail in the pause (the rail lights). He ends on the far side, behind the cart, for S12b. **S12b**: the bot walks into the cart from the south; the lit powered rail launches it north
  (lessons.md: empty carts lose speed, but a ridden cart on boosters every 8 blocks is fine; check it clears the crater
  bridge and leaves frame left within ~1 s; S12b's camera pans left with it for 3 blocks).
- **Depth:** S09: fg ridge-top spruces, mid the line and Ezra, bg the valley, hills to the fog;
  S10/S11a: fg the near rail stub and the crater, mid her cart, bg the line on into the valley and the valley wall;
  S12b: fg ferns, mid the cart and Ezra, bg the valley side.

## Easter egg
Canon cameo `torch_hill` (since day 300): the lone torch on the slope under the High Meadow, over the Digger's shaft
at (-290, -684). In S08 only (midnight, POV at the bridge's north foot looking south): one warm point in the dark,
about 48 blocks ahead and below, left of centre. Nothing to build: `world.build` puts the Digger's House stamp back
(map.json `stories.broken_rail.cameos`). Never the subject, never named. At dusk (S01, S07, S13) it doesn't read.

## Engine features this story needs
| need | status | estimate | plan |
|---|---|---|---|
| a villager and a pig drawn **sitting in a minecart** (the passenger offset; VillagerModel's riding pose with the legs forward, hidden in the cart) | brief says villagers sit in carts natively; not found by name in `renderer/entities.js`: verify with a fixture still first | ~45 min if missing (harness: record the vehicle id into `extra.riding`; entities.js: the passenger y offset from `Minecart.getPassengerAttachmentPoint`, the riding leg pose from VillagerModel/QuadrupedModel) | under 2 h: build it |
| powered rails lit/unlit drawn correctly, the redstone torch placed on camera | rails and redstone torches render (renderer/light.js knows redstone_torch) | check in a still | none expected |
| a ridden minecart rolling on rails in camera shots (S12b, S13, S14) | minecarts render (MinecartRenderer in entities.js); a moving cart is recorded like any entity, but **mineflayer doesn't move passengers**: tp Grandma with the cart every tick | check S13's cart reads at 45 blocks and Grandma at ~15 | stage |
| the activator rail setting Grandma down (S14) | staged (end the ride, tp her standing) | 10 min | stage |
| the pig's head following the carrot (S06) | vanilla tempt goal looks at a player holding a carrot even while riding; if the recording doesn't show it, stage the head turn (`headYaw`) | 10 min | stage if needed |
| the knock of the cart into the buffer (S14) | vanilla minecart sounds come through `relaySounds()` | none | none |
