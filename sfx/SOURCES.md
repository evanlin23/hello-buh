# Sound effects: sources and licences

Owner rule: "use free or stuff that cant get me cooked". Every file here has to be safe for
monetised YouTube: no attribution needed, and no Content ID claims. Record where each new file
came from and under what licence before committing it.

## In the repo
| Folder | Source | Licence | Notes |
|---|---|---|---|
| `kenney/impact-sounds` | kenney.nl/assets/impact-sounds | CC0 (public domain) | Punches, bells, metal, wood, glass, footsteps: impact hits |
| `kenney/interface-sounds` | kenney.nl/assets/interface-sounds | CC0 | Clicks, pops, confirmations: counters, cards, subtitles |
| `kenney/sci-fi-sounds` | kenney.nl/assets/sci-fi-sounds | CC0 | Explosions (explosionCrunch), lasers, force fields, engines: risers and booms |
| `kenney/digital-audio` | kenney.nl/assets/digital-audio | CC0 | Retro tones, power-ups, highUp/highDown sweeps |
| `mixkit/<category>/` | mixkit.co/free-sound-effects/<category>/ (167 short clips; `mixkit/manifest.json` lists title, id and source URL for each) | Mixkit Sound Effects Free License ("sfxFree" on every page): commercial use incl. YouTube videos, no attribution. Don't redistribute the files on their own or register them with Content ID | The classics: sad trombone, boing, clown horn, falling whistle, fail piano, crowd laugh, cinematic whooshes, movie impacts, drum hits, game-over/win jingles |
| (generated) | `scripts/sfx.py` (worker 10) | ours | Synthesised whooshes, risers, sub booms, wind |

`License.txt` from each pack is kept next to its files. Kenney: "free to use in personal,
educational and commercial projects"; crediting is optional.

## Safe to add (the owner downloads; the container can't reach them)
- **YouTube Audio Library** (YouTube Studio -> Audio Library -> Sound effects / Free music,
  filter "attribution not required"). YouTube says items from it won't be claimed by Content ID
  and can be used in monetised videos. Best source for music beyond NCS.
- **Sonniss GameAudioGDC bundles** (sonniss.com/gameaudiogdc): professional cinematic SFX,
  royalty-free for commercial use, no attribution. Behind a Cloudflare browser check, so it must
  be downloaded by hand. The licence ships in each bundle, and it forbids AI training.
- **Freesound with the CC0 filter only** (freesound.org needs a login to download). Check the
  badge on each clip; skip CC BY-NC.

## Avoid
- Pixabay *music*: some tracks are "Content ID Registered" and get claimed even though the licence
  allows use. Its sound effects are usable but check each one, and keep the licence certificate.
- Meme sounds (vine boom, bruh, Windows XP...): unclear rights; synthesise a lookalike instead.
- Anything CC BY-NC, or "free for personal use".
