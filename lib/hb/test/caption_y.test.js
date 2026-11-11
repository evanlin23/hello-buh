// A line's own caption height (story.json line "caption_y", a fraction of the game view; default 0.70): Dog on the
// Hill L14's "A GUY just APPEARED" sat on Buh's body on the caption line (review 2026-11-11).
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const cp = require('child_process')
const ROOT = path.join(__dirname, '..', '..', '..')

test('story_track: caption_y moves one line\'s captions; others stay at 0.70', () => {
  const r = JSON.parse(cp.execFileSync('python3', ['-c', `
import sys, json, tempfile, pathlib
sys.path.insert(0, 'scripts')
import story_track as T
from PIL import Image
d = pathlib.Path(tempfile.mkdtemp()); (d / 'voice').mkdir()
def run(cy):
    st = {"lines": [{"id": "L01", "who": "N", "text": "A GUY / just APPEARED", **({"caption_y": cy} if cy is not None else {})}], "cast": {"N": {"role": "narrator"}}}
    (d / 'story.json').write_text(json.dumps(st))
    (d / 'voice' / 'voice.json').write_text(json.dumps({"lines": {"L01": {"who": "N", "dur": 1.2, "onset": 0.05, "end": 1.1, "chunks": [[0.05, 0.5], [0.5, 1.1]], "captions": ["A GUY", "just APPEARED"]}}}))
    tmp = pathlib.Path(tempfile.mkdtemp())
    lst = T.caption_concat(str(d), [{"t": 0, "event": "line", "id": "L01"}], 0, 1.5, tmp)
    png = [l.split("'")[1] for l in open(lst) if l.startswith("file") and "cap0_" in l][-1]
    bb = Image.open(png).split()[3].getbbox()
    return (bb[1] + bb[3]) / 2
print(json.dumps({"default": run(None), "high": run(0.22), "y70": T.BAND + T.GAME_H * 0.70, "y22": T.BAND + T.GAME_H * 0.22}))
`], { cwd: ROOT, encoding: 'utf8' }))
  assert.ok(Math.abs(r.default - r.y70) <= 20, `default at 0.70: ${r.default} vs ${r.y70}`)
  assert.ok(Math.abs(r.high - r.y22) <= 20, `caption_y 0.22: ${r.high} vs ${r.y22}`)
})
