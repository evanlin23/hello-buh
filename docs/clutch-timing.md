# Making the bot's water clutch reliable

The clutch is a one-tick window. Four things made it fail, each fixed in `bot.js`:

1. **The `/fill` that clears the set silently failed** (25x25x68 = 42,500 blocks, over the 32,768
   cap), so old water from earlier runs stayed around and some early "successes" were landings in
   leftover water. Fixed: clear in 30-block slabs; fresh world each run.
2. **Reach.** The bucket raycasts 4.5 blocks from the eyes (1.62 above the feet), so water can
   only go down once the feet are < 2.88 above the floor. Falling at ~2.34 blocks/tick, the bot
   placed at 1.98 and hit the ground on the very next tick, in the same server tick that
   processed the placement: a coin flip. Fixed: a 5-layer snow cap on the pillar raises the
   start by 0.5 (snow's collision height is (layers-1)/8), so placement happens at 2.48 and the
   next tick ends with the feet inside the water block; the server resets the fall distance
   before the landing.
3. **Packet order.** Mineflayer emits `physicsTick` *before* sending that tick's position, so a
   `use_item` sent from the handler was checked against the previous position (2.3 blocks
   higher, out of reach). Fixed: `process.nextTick(() => bot.activateItem())`.
4. **mineflayer 4.26 sends `use_item` with rotation (0,0)**: the server turns the player to look
   straight ahead and the bucket hits the pillar's side. Fixed by `scripts/patch_deps.sh`.

Also: drift forward for the first ~14 blocks of the fall so the bot comes down clear of the
pillar, and check the teleport onto the pillar actually stuck (the server can reject a stale move
packet right after a teleport).

Result: 8/8 landings after the fixes (1.21.1 and 1.21.11), versus ~1/5 before.
