# monsters_nearby: set brief

One site, three looks (night clear, day overcast, night thunderstorm). Build it once, into real terrain.

## Site
- **A swamp edge below a wooded hill**, natural terrain: a generated swamp biome touching a forest or plains rise,
  with a village (generated or built) 60-90 blocks up the hill to the west/north-west so its lights show in the
  background of S02. Use `scripts/scout.sh` (movie branch) to find a seed spot: swamp water and oaks with vines within
  25 blocks east of a patch of dry ground big enough for the cottage and a 19 x 19 yard.
- Don't clear it flat. Keep the swamp oaks, vines, lily pads and the water's ragged edge; level only the yard inside
  the torch ring (and keep a slope beyond it).
- Swamp grass and water colours are a clue (witches live in swamps): keep the biome; don't `plainsBiome` it.

## Scale and layout (x, z from the bed head; +x east, +z south)
- **Cottage:** two rooms in a line north-south plus a porch on the south, all inside the bed's reach: outside
  footprint x -7..+1, z -9..+4 (9 x 14). Dark-oak planks and logs on a cobblestone base, 4-high walls, a steep dark-oak
  stair roof with an attic, a cobblestone chimney over the kitchen furnace carrying a **copper lightning rod**. A
  ragged **4 x 3 patch of fresh birch planks** in the roof over the kitchen (the storm's burn).
- **Bedroom** (south room): 7 x 7 inside (x -6..0, z -3..+3), 4 high. Bed against the east wall, head at (0, 0)
  pointing east, under a 2-wide glass pane window at eye height looking east. The chair (oak stairs) at (0, -2) facing
  the bed. One lantern at the ceiling centre, plus glowstone hidden in the ceiling (lessons: one hanging lantern renders
  the room black). The dug hole at (-4..-3, +1..+3), 2 deep, a torch at the bottom, the six planks stacked beside it.
  Front door in the south wall at (-3, +4) onto a covered porch. Kitchen doorway (no door) in the north wall at (-3, -4).
- **Kitchen** (north room): 7 x 4 inside (x -6..0, z -8..-5). Furnace (lit: give it fuel and something to smelt) and
  cauldron full of water on the north wall, a table (spruce trapdoor on a fence) with a brewing stand holding one
  healing potion and an empty glass bottle, the black cat (`all_black`) on the counter by the west wall. Item frames
  with glass bottles and mushrooms for shelves.
- **Attic:** hatch (spruce trapdoor) above (-5, -2); beams, cobwebs, one chest, one torch.
- **Yard:** a **square ring of 72 fence posts with torches** at |x| = 9 or |z| = 9 around the bed: the narrator's
  search grid (along the north side it runs as wall torches on the kitchen's back wall). Inside it: the well at (+5, +6) (cobblestone, 6 deep, water at the bottom), a vegetable patch, the
  garden path (dirt path) from the porch east to the gate.
- **Garden gate:** an oak fence gate at (+10, 0), one block outside the torch line, between two posts; a **lantern on
  the north post**. Straight out of the bedroom window.
- **Beyond:** east of the gate, the swamp: water, lily pads, oaks with vines, reeds (sugar cane) out to the fog. North
  and west, the hill and a winding path up to the village lights.

## What fills each establishing shot (out to the fog)
- **S01 bedroom:** foreground the door frame; middle the bed, chair, lantern; background the window with swamp trees.
- **S02 yard EWS (from 22 blocks east, in the swamp):** foreground lily pads and reeds on dark water; middle the
  cottage with its lit window and the full torch ring; background the hill, the village lights, the night sky.
- **S04 sky:** roof edge, chimney and rod at the bottom; phantoms; stars. Needs `renderDistance` high enough that the
  hill reads behind the roof.
- **S05 kitchen:** doorway frame; firelit furnace and cauldron on the back wall, the cat; a small north window with swamp beyond.
- **S06 day exterior:** gate post with lantern; the roof patch and rod; overcast sky and swamp oaks.
- **S14 reveal:** rain on the glass; the torch line; Grandma under the lantern at the gate; the swamp and a lightning
  bolt behind her (place the bolt 20-30 blocks beyond the gate so it frames her).

## Light and weather
- Night shots: moonlight + lanterns + torch ring; the first 2 s must read on a phone, so the bedroom is warm and bright
  and the window cool.
- The last night: `weather: 'thunder'` from S10. The renderer draws the bolt and the sky flash but not the lightmap
  flash, so **the gate lantern is what lights Grandma** in S14; make sure she stands in its light (light 15 at her
  face).
- `random_tick_speed 0` (keep the grass and crops still), `/gamerule advance_time false`, mobs NoAI, `/difficulty
  normal`.

## Cast staging
- Grandma: a witch, NoAI, `Silent:1b` (her giggle is placed as an SFX). Keep her out of every frame until S14 (marks in
  the bible). Teleport her to the gate (+10, 0) facing west before the S14 turn.
- Phantoms: NoAI, moved on a circle 12-14 blocks above the roof by `/tp` every tick (S04), one pass across the window
  in S09.
- The cat: NoAI, sitting; moved from the counter to the bedroom chair between S11 and S12 (out of shot).
