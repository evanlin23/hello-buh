// Format fakemod (r:rd551de): lib/fakemod.js builds the edit's popup entries on the marks its ask() leaves, and
// scripts/popup.py draws the permission popup over the game view: open -> cursor -> click -> (roll) -> closed.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const cp = require('child_process')
const FM = require('../../fakemod')
const ROOT = path.join(__dirname, '..', '..', '..')
const JAR = fs.existsSync(path.join(ROOT, 'versions.env')) && (() => {
  const v = (fs.readFileSync(path.join(ROOT, 'versions.env'), 'utf8').match(/MC_VERSION=(\S+)/) || [])[1]
  return v && fs.existsSync(path.join(ROOT, 'work', 'client', `${v}.jar`))
})()

test('fakemod.popup: entries on the ask() marks; a roll picks Roll', () => {
  const e = FM.popup({ k: 3, mob: 'creeper', text: ['x'], hover: ['Deny', 'Roll'], roll: 'Allow' })
  assert.deepStrictEqual(e.at, ['fm3_open', 'fm3_click', 'fm3_close'])
  assert.strictEqual(e.pick, 'Roll')
  assert.deepStrictEqual(e.roll, { ticks: 'fm3_roll', at: 'fm3_result', result: 'Allow' })
  const d = FM.popup({ k: 1, mob: 'zombie', text: ['x'] })
  assert.strictEqual(d.pick, 'Deny'); assert.deepStrictEqual(d.hover, ['Deny'])
})

test('popup.py: drawn only between open and close, the cursor on the pick at the click, the roll lands on its result', { skip: !JAR && 'no client jar' }, () => {
  const spec = [FM.popup({ k: 3, mob: 'creeper', text: ['A ', ['Creeper', 'red'], ' is asking for permission to explode.'], hover: ['Deny', 'Roll'], roll: 'Allow', done: ['ok'] })]
  const r = JSON.parse(cp.execFileSync('python3', ['-c', `
import json, sys
sys.path.insert(0, '.'); sys.path.insert(0, 'scripts')
import popup
spec = json.loads(sys.argv[1])
ev = {"fm3_open": 1.0, "fm3_click": 2.4, "fm3_close": 4.2, "fm3_result": 3.8}
rolls = [2.5, 2.6, 2.75, 2.95, 3.2, 3.5, 3.8]
w = popup.windows(spec, lambda n: ev.get(n), lambda n: rolls if n == "fm3_roll" else [], 0.0)
popup.register(w)
out = {}
for t in (0.9, 1.5, 2.35, 3.0, 3.85, 4.5):
    k = popup.frame_key(w, t)
    out[str(t)] = None if k is None else {"hov": k[5], "clicked": k[6], "slot": k[8]}
    if k is not None:
        bb = popup.frame_img(k).split()[3].getbbox()
        out[str(t)]["bbox"] = bb
        out[str(t)]["panel"] = popup.frame_img(k).split()[3].point(lambda v: 255 if v > 200 else 0).getbbox()
print(json.dumps(out))`, JSON.stringify(spec)], { cwd: ROOT, encoding: 'utf8' }))
  assert.strictEqual(r['0.9'], null)
  assert.strictEqual(r['4.5'], null)
  assert.strictEqual(r['2.35'].hov, 'Roll')                       // the cursor is on the pick by the click
  assert.strictEqual(r['2.35'].clicked, false)
  assert.ok(r['3.0'].slot && !r['3.0'].slot[1])                   // rolling
  assert.deepStrictEqual(r['3.85'].slot.slice(0, 2), ['Allow', true])   // landed on the result
  const [, y0, , y1] = r['1.5'].bbox
  assert.ok(y0 >= 455 && y1 <= 455 + 1011, `inside the game view: ${y0}..${y1}`)
  // centred like a modal (owner r:r7ef6ec): the panel's middle on the game view's middle (the dim covers the view, so
  // measure the opaque panel, frame 2.35's panel_bbox)
  const [, p0, , p1] = r['2.35'].panel
  assert.ok(Math.abs((p0 + p1) / 2 - (455 + 1011 / 2)) <= 8, `centred: ${p0}..${p1}`)
})
