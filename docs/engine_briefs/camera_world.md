# Piece: camera moves and the Nether in the world tools
1. A flying-mob POV: hover-bob plus low, curving fast flight along a path (The Honey Thief's bee,
   claude/script-honey-thief; also the allay in claude/script-singing-box). mobpov's rusher only does straight dashes.
2. A crane that lifts from a POV to a high straight-down shot (90 blocks up, fov easing 28 -> 70 in the same move),
   smooth, with the flower meadow readable from above: test a flower pattern's top-down readability (cross-shaped
   flower sprites from above) and report which flowers read best.
3. Nether places in the world tools (Saving Up for a Bastion, claude/script-saving-up-bastion claims
   portal_cottage_nether with `dimension: the_nether`): map.json `dimension`, world.js check/claim, world.build in the
   Nether, and the recorder in the Nether at those coordinates. Survey the Nether around (-16, -118) for terrain/ a bastion.
Done: test stunts for each, stills, and the camera moves pass ./hb check's motion/framing checks.
