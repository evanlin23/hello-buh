// The title band's key word: a story Short (Buh Stories) is Buh gold #FFD640, the rest HelloBuh red
// (docs/brand.md "Buh Stories channel": Visuals + Titles; Buh Stories lead 2026-11-11).
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')
const ROOT = path.join(__dirname, '..', '..', '..')

function args (edit) {
  const f = path.join(ROOT, 'stunts', `_test_band_${process.pid}.js`)
  fs.writeFileSync(f, `module.exports = { edit: ${JSON.stringify(edit)} }`)
  try { return spawnSync('node', [path.join(ROOT, 'scripts', 'edit_args.js'), path.basename(f, '.js')], { encoding: 'utf8' }).stdout.split('\n') } finally { fs.unlinkSync(f) }
}
const rgb = (a) => { const i = a.indexOf('--red_rgb'); return i >= 0 ? a[i + 1] : null }

test('a story Short gets the key word in Buh gold; a HelloBuh Short keeps red; redColor overrides', () => {
  assert.strictEqual(rgb(args({ caption: 'x portal', red: 'portal', story: 'stories/x' })), 'FFD640')
  assert.strictEqual(rgb(args({ caption: 'x portal', red: 'portal', channel: 'buhstories' })), 'FFD640')
  assert.strictEqual(rgb(args({ caption: 'x portal', red: 'portal' })), null)
  assert.strictEqual(rgb(args({ caption: 'x portal', red: 'portal', story: 'stories/x', redColor: '#00FF00' })), '00FF00')
})

test('edit.py draws the key word in the colour it is given', (t) => {
  if (spawnSync('python3', ['-c', 'import PIL']).status !== 0) return t.skip('python3 with Pillow not found')
  const out = path.join(require('os').tmpdir(), `band_${process.pid}.png`)
  const r = spawnSync('python3', ['-c', `
import sys, pathlib; sys.path.insert(0, ${JSON.stringify(ROOT)}); import edit
from PIL import Image
edit.caption_png('a gold portal', 'portal', pathlib.Path(${JSON.stringify(out)}), {}, red_rgb=(255, 214, 64, 255))
im = Image.open(${JSON.stringify(out)}).convert('RGB')
px = list(im.crop((0, 0, im.width, 420)).getdata())
print(sum(1 for p in px if p == (255, 214, 64)), sum(1 for p in px if p == (235, 40, 40)))
`], { encoding: 'utf8' })
  assert.strictEqual(r.status, 0, r.stderr)
  const [gold, red] = r.stdout.trim().split(' ').map(Number)
  assert.ok(gold > 200, `gold pixels ${gold}`); assert.strictEqual(red, 0)
})
