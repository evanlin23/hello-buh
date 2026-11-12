# sorry_dear: set plan (r2, 2026-11-12)

Place: **Stillwater** (canon, docs/world/map.json `stillwater`), inside the neighbour's cottage (piece `neighbour`:
`cottage`, spruce palette, seed 32, at (-236, 70, -1028), facing east). No new place claim: the story's map.json
entry lists `stillwater` and the `long_day_lever` cameo. Day 2200, built by `world.build` as of that day (the lever
pulled back since 1100; Gary is a night stamp, so he is not built by day).

## The room
- **Card table:** a 2 x 1 table (spruce slabs on two spruce fences, top at floor + 1) under a white carpet cloth,
  long side east-west, against the cottage's north-east corner window. O = the table's south-west top block.
  The kid's spruce-stair chair on the south side.
- **The window:** a glass-pane window in the north or east wall at the table, through which the square to the
  north-north-east shows; the Long Day lever is ~40 blocks away (dx +22, dz -34). **Gate:** a still from S04's lens
  shows the lever's stone post and lever in the window, small and soft (a speck is enough: it's an egg). If the
  cottage piece has no window on that line, add one glass pane in the north wall at the table (a story-only change,
  built in the stunt).
- **Inside door:** a spruce door in the wall right behind the table's north edge (or the cottage's own inside door
  if the piece has one there), with **one spruce button 2.2 blocks above the floor** on the wall over it: her old
  height mark. No signs, no text anywhere.
- **On the table** (all relative to O, north half hers, south half his): the mug (west), the aunt (middle), the
  big teacup (east of her), the emerald pile (north-east corner), the cards; his emerald and his cards on the south half.

## The narration's claims, and what makes each true
| claim (line) | true because | check |
|---|---|---|
| every sorry shrinks you an inch (L01) | a story rule (0x: Minecraft is the look); shown twice: she dips on DEAR (S10), he dips on AUNTIE (S12) | the dips read on a 300 px still pair |
| my aunt is the size of a mug (L01) | the mug prop is exactly her height (0.54) and stands beside her in S01 | S01 frame 1 |
| she used to be taller than the door (L02) | the one height mark is 2.2 up over a 2-tall door | S02 still |
| cards day (L03) | paper cards dealt on the cloth | S03 |
| we play for emeralds; her pile's taller than her (L04) | a ~0.7 emerald heap beside her 0.54; his one emerald | S04 still |
| every time she lays her cards down she pats my hand and says sorry, dear (L05) | her fan flat at her feet; she pats his fingertip with both arms | S05 |
| one more inch and she'll fit in a teacup (L07) | the big teacup is ~0.5 tall and wider than her: after L10's inch its rim is level with her (S11) | S07, S11 stills |
| she laid hers down (L09) | her fan appears flat the instant his is down, longer than his | S09 |
| she wasn't sorry, she was showing off (L11) | she takes his emerald and climbs her pile, arms up | S11 |
| next hand, I won; sorry, auntie; I shrank an inch, worth it (L12) | his fan down, the bloop, his hair dropping below the sill line in a CU | S12 |

## Build notes
- Entity scale is the engine need (story.json `engine.missing`): in-game set `minecraft:scale` on the actors
  (/attribute ... minecraft:scale base set 0.3); the renderer must draw it (renderer/entities.js has none).
- The mug and teacup are new props (block_display/item_display or two small models); the emerald pile and the cards
  must be static (no item bob or spin).
- Render distance: the room plus ~45 blocks to the lever.
