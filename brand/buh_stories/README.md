# Buh Stories channel art (docs/brand.md "Buh Stories channel")

Rendered with our own renderer from the published Dog on the Hill recording
(`git show origin/videos:shorts/story_dog_hill/recording.json.gz | gunzip > dog_hill.rec.json`), look `docs/brand/look_golden.json`.

| file | size | how |
|---|---|---|
| avatar.png | 800x800 | `scripts/still.py dog_hill.rec.json avatar_raw.png --at 2 --size 800x800 --ss 1.5 --time 12700 --look "$(cat docs/brand/look_golden.json)" --shot '{"at": [3.4, 1.2, 1.6], "look": [0.55, 1.5, 0.55], "fov": 23, "drift": 0}'`, then `scripts/buh_stories_art.py avatar` |
| banner.jpg | 2560x1440 | `scripts/still.py dog_hill.rec.json banner_raw.png --at 2 --size 2560x1440 --time 12750 --look ... --shot '{"at": [9,1.25,0.6], "look": [0.5,1.75,1.3], "fov": 34, "drift": 0, "dof": false}'`, then `scripts/buh_stories_art.py banner` (`--guides` shows the 1546x423 safe band) |
| watermark.png | 150x150 | `scripts/buh_stories_art.py mark avatar_raw.png watermark.png` |
| cover_dog_hill.png | 1080x1920 | the published Dog on the Hill Short's frame at 0.6 s, `scripts/buh_stories_art.py cover frame.png out.png --n 5 --title "..." --key 900` |
