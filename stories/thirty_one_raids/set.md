# thirty_one_raids: set brief

A real village in a river valley with a ridge to the east. The scale is the point: the raid has to come over a real
hill toward a real village, and the hero's welcome needs a square full of people.

## Site
- **A river valley with a ridge 120-150 blocks east, 25-35 blocks above the valley floor**, natural terrain (plains or
  meadow in the valley, birch and taiga edges on the ridge). Best: a generated village near a generated pillager
  outpost (they often spawn within a few hundred blocks; `/locate structure minecraft:pillager_outpost` from a village
  seed). Otherwise build the outpost tower to the vanilla structure on the ridge.
- Keep the terrain. Level only the square and the yard plots; the road follows the ground.

## Scale and layout (x, z from the gate; +x east)
- **The village:** 10-12 houses (generated village houses, plus Grandpa's), paths between doors, wheat and carrot
  fields at different growth stages, the bell and a well in the square (-30, 0), lanterns on posts, hay bales,
  gardens. Two or three lived-in details: the butcher's roof with a fresh hole and smoke (raid 31's damage), a
  fletcher's target, a dog on a porch.
- **The palisade:** spruce logs 2-3 high around the village (it can follow the terrain and have gaps on steep sides),
  with a walkway on the east side for S02. A wide east gate at (0, 0): fence gates between two tall log posts (5 high)
  with lanterns.
- **Grandpa's house** at (-8, -6), north of the road just inside the gate: cobblestone and spruce, 11 x 9 outside,
  9 x 7 inside, 4 high, door facing south onto a fenced yard with a grindstone, a bench and a lantern post.
  Inside: the **totem wall** on the north wall (32 item frames, 4 rows of 8, at heights 1-4; 31 with totems of
  undying; the last frame of the bottom row empty and lit by a lantern below it), a table with two chairs and one bowl,
  a chest under the east window, a shelf of 4 item frames with ominous bottles, a bed, glowstone hidden in the ceiling
  plus a visible lantern.
- **The road** runs east from the gate through fields, fords the river at about +40, and climbs the ridge to the
  outpost at about +130.
- **The outpost** on the ridge: the vanilla tower (dark oak and cobblestone, 4 storeys), a white banner on its roof
  (patterns aren't drawn: it reads as a white flag, which is what the bible calls it), birches and tall grass on the
  slope below for S07's foreground.

## What fills each establishing shot (out to the fog)
- **S01 square (dawn):** foreground a fence and a hay bale; middle Grandpa and the villagers; background the bell,
  houses, the smoking roof, the sky going gold.
- **S02 road (dusk, from the palisade):** foreground log tops; middle the road and fields with Grandpa small on it;
  background the river, the ridge and the tower silhouetted against the sunset. Raise `renderDistance` so the ridge at
  130-150 blocks is inside the fog (lessons: fog is max(xz, |y|)).
- **S05 Grandpa's house:** door frame; the totem wall filling the frame's middle; the lantern and table.
- **S07 hill:** grass and a birch; the tower and Grandpa on the path; the sky.
- **S09 gate:** the posts; Grandpa in the gateway; the road, the river glint and the ridge.
- **S13 raid:** the gate posts; the ridge with a line of torches (placed one by one along the ridge path in step with
  the raiders) and the raiders and ravager coming down; a dusk sky lighter than the ridge.

## Light and time
- Dawn (S01) and dusk (S02, S09-S14) carry most of the story; the sky must stay lighter than the ridge so the
  silhouettes read. Interiors lit by lanterns plus hidden glowstone.
- `random_tick_speed 0`, `advance_time false`, mobs NoAI and moved by `/tp`; `/difficulty normal`.

## Cast staging
- Grandpa: a second bot or a player NPC with an old-man skin (check the engine's player-skin support; fall back to a
  default skin with a grey leather cap). If back-slot items don't render, he carries the crossbow in hand.
- Villagers throwing bread (S01): drop bread items from each farmer's position with a small upward velocity toward
  Grandpa (`/summon item` with Motion), on the key words.
- Raiders (S13): NoAI pillagers, vindicators and a ravager moved down the ridge path by `/tp`; a captain with a white
  banner on his head (banners render as heads? if not, a banner on a fence post carried along beside him). Don't start
  a real raid: stage it, and play `event.raid.horn` at the cut.
- The drink (S12): first-person drinking pose if the harness records `use_item`; otherwise raise the bottle into frame
  and play the drink sound.
