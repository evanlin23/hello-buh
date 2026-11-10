# thirty_one_raids: set brief (r2)

A real village in a river valley with a ridge to the east. The scale is the point: the raid has to come up a real road
toward a real gate, and the hero's welcome needs a square full of people. Every set follows `docs/building_guide.md`
and scores 7+ on its checklist.

## Site
- **A river valley with a ridge 120-150 blocks east, 25-35 blocks above the valley floor**, natural terrain (plains or
  meadow in the valley, birch and taiga edges on the ridge). Best: a generated village near a generated pillager
  outpost (they often spawn within a few hundred blocks; `/locate structure minecraft:pillager_outpost` from a village
  seed). Otherwise build the outpost tower to the vanilla structure on the ridge.
- Keep the terrain. Level only the square and the yard plots; the road follows the ground.

## Scale and layout (x, z from the gate; +x east)
- **The village:** 10-12 houses (generated village houses, plus Grandpa's), paths between doors, wheat and carrot
  fields at different growth stages, the bell and a well in the square (-30, 0), lanterns on posts, hay bales,
  gardens. Lived-in details: the butcher's roof with a fresh hole and smoke (raid 31's damage), a fletcher's target, a
  dog on a porch.
- **The palisade:** spruce logs 2-3 high around the village (it can follow the terrain and have gaps on steep sides),
  with a walkway on the east side for S02. A wide east gate at (0, 0): fence gates between two tall log posts (5 high)
  with lanterns.
- **Grandpa's house** at (-8, -6), north of the road just inside the gate: cobblestone and spruce, 11 x 9 outside,
  9 x 7 inside, 4 high, pitched roof with overhang, door facing south onto a fenced yard with a grindstone, a bench and
  a lantern post. Inside: the **totem wall** on the north wall (32 item frames, 4 rows of 8, at heights 1-4; 30 with
  totems of undying at the start of S01, the 31st put in on camera; the last frame of the bottom row empty and lit by a
  lantern below it), a table with two chairs and one bowl, a chest of ominous bottles under the east window, a shelf of
  4 item frames with ominous bottles, a bed, glowstone hidden in the ceiling plus a visible lantern.
- **The road** runs east from the gate through fields, fords the river at about +40, and climbs the ridge to the
  outpost at about +130. S13 needs the first 30 blocks of it clear and readable from the gate: a dirt path between
  wheat, gently rising.
- **The outpost** on the ridge: the vanilla tower (dark oak and cobblestone, 4 storeys), no banner, birches and tall
  grass on the slope below for S06's foreground.

## What fills each establishing shot (out to the fog)
- **S01 Grandpa's house (dawn):** door frame; the totem wall filling the frame's middle, Grandpa at frame left; the
  lantern, the window's morning light.
- **S02 road (dusk, from the palisade):** log tops; the road and fields with Grandpa small on it; the river, the ridge
  and the tower silhouetted. Raise `renderDistance` so the ridge at 130-150 blocks is inside the fog.
- **S05 square (dawn):** a fence and a hay bale; Grandpa and the farmers; the bell, houses, the smoking roof, the sky
  going gold.
- **S06 hill:** grass and a birch; the tower and Grandpa on the path; the sky.
- **S08 gate:** the posts; Grandpa in the gateway; the road, the river glint and the ridge.
- **S13 raid:** the gate posts; five pillagers and a ravager on the road at 25 closing to 15 blocks; the fields and the
  ridge behind them; a dusk sky lighter than the ridge.

## Light and time
- Dawn (S01, S05) and dusk (S02, S08-S09, S11-S14) carry most of the story; the sky stays lighter than the ridge so the
  silhouettes read. Interiors lit by lanterns plus hidden glowstone.
- `random_tick_speed 0`, `advance_time false`, mobs NoAI and moved by `/tp`; `/difficulty normal`.

## Cast staging
- Grandpa: a player actor (a second bot or a mannequin drawn as a player) with the default `zuri` skin; the crossbow in
  his main hand throughout (his own; he never hands it over). S11: sneak pose for the slump, the bottle in his hand.
  S14: the crossbow charging pose (use_item held), then loaded.
- The 31st totem (S01): an item frame gets the totem on "THIRTY-ONE" (frame item metadata set on the mark).
- Villagers throwing bread (S05): drop bread items from each farmer's position with a small upward velocity toward
  Grandpa (`/summon item` with Motion) on "BREAD".
- Raiders (S13-S14): five NoAI pillagers with crossbows and a ravager, moved up the road by `/tp` from 25 to 12 blocks
  over S13-S14. No captain, no banners, no torches. Don't start a real raid: stage it, and play `event.raid.horn` on
  S13's first frame.
- The drinks (S08 Grandpa from behind, S12 first person): the drinking pose if the harness records `use_item`;
  otherwise raise the bottle into frame and play the drink sound on the word.
