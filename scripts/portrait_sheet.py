"""Three portrait (9:16) frames per shot of a recording, in one sheet: the shot sheet for vertical Shorts
(scripts/shot_sheet.py is 16:9). python3 scripts/portrait_sheet.py work/<stunt>.rec.json out.jpg"""
import json, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw
rec, out = sys.argv[1], sys.argv[2]
r = json.load(open(rec))
sh = [(e['t'], e['name']) for e in r['timeline'] if e['event'] == 'shot']
end = max(e['t'] for e in r['timeline'])
mids = []
for i, (t, n) in enumerate(sh):
    t1 = sh[i + 1][0] if i + 1 < len(sh) else end
    for f in (0.1, 0.5, 0.9):
        mids.append((int((t + (t1 - t) * f) / 100), n))
d0 = tempfile.mkdtemp()
subprocess.run(['node', 'render.js', rec, d0, '10', '360', '640'], env={**os.environ, 'FRAMES': ','.join(str(f) for f, _ in mids)}, check=True, capture_output=True)
W, H = 360, 640
s = Image.new('RGB', (W * len(sh) + (len(sh) - 1) * 6, H * 3 + 40), (20, 20, 20)); d = ImageDraw.Draw(s)
for k, (f, n) in enumerate(mids):
    i, row = k // 3, k % 3
    s.paste(Image.open(f'{d0}/f{f:05d}.png'), (i * (W + 6), row * (H + 20) + 20))
    if row == 0:
        d.text((i * (W + 6) + 4, 4), n, fill=(255, 220, 0))
s.save(out, quality=85)
print(len(sh), 'shots ->', out)
