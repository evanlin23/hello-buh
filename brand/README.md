# Channel art (avatar + banner)

Rendered with the cinematic movie engine from `stunts/brand_keep.js`: a castle built to `docs/building_guide.md`
(the "Stone keep / castle" palette) on a rocky crag rising out of the fog sea. Curtain wall with buttresses, corbels
and merlons, four round towers of different heights with overhanging tile cones and spires, a gatehouse with banners
and lanterns, a keep with a stair gable roof and a tall tower, lit windows, weathered stone (mossy and cracked low),
trees and rocks. The avatar pairs (a Mannequin "Buh" in Steve's skin and a creeper) stand on two small rocks at
x +-150 with the castle behind them, so the sun or moon is behind them in every shot (both move along x).

| file | what |
|---|---|
| `avatar_golden.png` | **pick.** Steve and the creeper, faces level, the sunset and the castle's silhouette behind them |
| `avatar_nebula.png` | the same pair by moonlight with a purple-blue (nebula) grade, the moon behind the keep |
| `avatar_dawn.png` | the same pair against a bright sunrise sky |
| `banner_fogsea.png` | **pick.** The castle on its crag over the fog sea at sunrise, the sun behind the keep |
| `banner_nebula.png` | the same by moonlight, the moon behind the keep, nebula grade |
| `banner_sunset.png` | from the east at golden hour, the castle backlit |
| `contact.jpg` | all six: each avatar at 176 / 88 / 40 px circles, each banner with the desktop strip and the safe band outlined |

Banners 2560x1440 (title and castle inside the centred 1546x423 band), avatars 800x800. Sharpness: banners render at
2x (5120x2880) and avatars at 4800x2700 (a 2700 px square, 3.4x), Lanczos down, a light unsharp mask; no grain, bloom
only above 0.9, depth of field focused on the faces (avatars) or off (banners).

## Re-make
```bash
STUNT=brand_keep ./scripts/record.sh                                                     # ~2 min -> work/brand_keep.rec.json
python3 scripts/cinematic.py brand/avatar_scene.json --sheet --at 0.5 --scale 2.5        # 4800x2700 stills
python3 scripts/cinematic.py brand/banner_scene.json --sheet --at 0.5 --scale 2.66667    # 5120x2880 stills
python3 brand/compose.py                                                                 # crops, title, contact sheet
```
- The server only sends entities near the bot, so `perform` visits each pair: the east pair is in the recording at
  0.75-4.9 s, the west pair at 4.95-9.1 s (the clips' `t0`).
- Cameras, hours (`day`), fog and grades are in the two scene files (cinematic.py clip format); a clip's look and
  fog reach the stunt through CINE_CLIP.
- Known: below the safe band the banners show the fog sea's lower edge (ocean terrain faintly through it); only TVs
  show that part.
