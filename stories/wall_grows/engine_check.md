# wall_grows: engine check (r2, before any build)

What the story needs against what the renderer and kit have now. Checked in renderer/entities.js, renderer/page.js,
renderer/entity_models.json, lib/story.js, lib/cells.js and docs/engine_features.md / engine_requests.md. Nothing is
built here.

## Already there
- villager, baby villager (poseBaby), zombie, minecart, player models; profession outfit layers (mason is a vanilla
  profession, drawn from `entity/villager/profession/<p>`).
- A villager holding an item over its crossed arms (Tomas's brick; engine_features "Held items on mobs").
- Cast moved by `K.actor` (x, y, z, yaw, pitch), so a villager can be moved up a ladder and a player actor can tilt
  his head up.
- Camera FOV per shot (page.js), crane moves, time cuts, translucent glass (mesher), lanterns.
- Mobs in one-block glass cells: lib/cells.js summons villagers into cells (a starting point for the hall).

## Missing or risky (say plainly)
1. **A villager "placing" a block.** Vanilla villagers have no swing or place animation, so the brick just appears
   (`/setblock`) while Tomas faces it, with a place sound. This is a style choice (the audit accepted villagers placing
   blocks), not a missing feature. The owner may want to OK it.
2. **A villager climbing a ladder.** Vanilla mobs climb a ladder they walk into, but villagers have no climb pose. A
   `K.actor` glide up the rungs is vanilla-plausible but looks stiff. 40 rungs is about 17 s at climb speed, so S10
   hides one cut in the crane. The motion lint and rec_check may flag a steady vertical actor glide. Unknown until tried.
3. **100 villagers in one recording** (S11). They're NoAI, and lib/cells.js summons a few, but nobody has recorded or
   rendered 100 mob entities in one shot. Entity count and render time are a risk. Fallback: villagers only in the
   cells that are in frame.
4. **The 40-high, 68 x 68 stone-brick ring wall with age bands, a crenellated north rim, and a 12 x 52 glass-roofed
   trading hall.** No set piece exists for either (lib/sets has houses, not walls or halls). They're `/fill` work in
   the stunt (each side under the 32,768-block fill limit), not an engine feature. Big sets also mean more chunks to
   load for the S11 EWS and the S12 FOV 5 look-down.
5. **FOV 5 at a ~72-degree downward look** (S12). The renderer takes any FOV, but `edit.punchStress` zoom and
   eye-trace re-aiming at FOV 5 are untested; a tiny aim jitter is huge at that lens.
6. **Two baby villagers pushing a minecart** (S08). Mob-cart collision pushes in vanilla, but NoAI actors are teleported
   each tick, not walked. Use `/data merge entity <cart> {Motion:[...]}` timed to 'PUSH' instead. Kit support for that
   is unchecked.
7. **Talking villagers.** No mouth animation; Tomas speaks while in frame (dog_hill's Grandpa did the same).
8. **Story's hotbar is on the player actor, not the narrator.** The narrator is a villager with no POV. Check that the
   harness's `hotbar` field puts the dirt in the actor's hand (dog_hill's precedent: the hotbar belongs to the only
   player). If not, use `/item replace entity <actor> weapon.mainhand with dirt`.
