// Centred chat lines (owner, 2026-11-11: centre the "Buh left the game" line horizontally, off the dog): edit.py
// syschat_png(align='center', y_frac) and scripts/edit_args.js (chatAlign, on by default for story Shorts; chatY).
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const cp = require('child_process')
const ROOT = path.join(__dirname, '..', '..', '..')
const JAR = fs.existsSync(path.join(ROOT, 'versions.env')) && (() => {
  const v = (fs.readFileSync(path.join(ROOT, 'versions.env'), 'utf8').match(/MC_VERSION=(\S+)/) || [])[1]
  return v && fs.existsSync(path.join(ROOT, 'work', 'client', `${v}.jar`))
})()
const py = (code) => JSON.parse(cp.execFileSync('python3', ['-c', `import json, sys, zipfile\nsys.path.insert(0, '.')\nimport edit\n${code}`], { cwd: ROOT, encoding: 'utf8' }))

test('edit.py: chat_align center draws the line centred at y_frac, same strip and scale; left stays vanilla', { skip: !JAR && 'no client jar' }, () => {
  const r = py(`
import tempfile, os
from PIL import Image
d = tempfile.mkdtemp()
out = {}
with zipfile.ZipFile(edit.CLIENT_JAR) as jar:
    line = (("Buh left the game", (255, 255, 85, 255)),)
    for name, kw in (("left", {}), ("center", {"align": "center"}), ("high", {"align": "center", "y_frac": 0.3})):
        with edit.gui_scale(5):
            edit.syschat_png(jar, line, os.path.join(d, "s.png"), **kw)
        im = Image.open(os.path.join(d, "s.png"))
        out[name] = im.split()[3].getbbox()
        yel = [(x, y) for x in range(0, im.width, 2) for y in range(0, im.height, 2) if im.getpixel((x, y))[:3] == (255, 255, 85)]
        out[name + "_text"] = [min(p[0] for p in yel), max(p[0] for p in yel)]
    out.update(W=edit.W, BAND=edit.BAND, GAME_H=edit.GAME_H)
print(json.dumps(out))`)
  const [x0, y0, x1, y1] = r.center
  assert.strictEqual(r.left[0], 0)                                   // vanilla: the strip from the left edge
  assert.ok(Math.abs((x0 + x1) / 2 - r.W / 2) <= 6, `centred strip: ${x0}..${x1}`)
  assert.ok(Math.abs((r.center_text[0] + r.center_text[1]) / 2 - r.W / 2) <= 12, `centred text: ${r.center_text}`)
  assert.strictEqual(y1 - y0, r.left[3] - r.left[1])               // the same strip, text and shadow at the chat scale
  assert.ok(x1 - x0 < r.W * 0.7, 'only as wide as the text')
  assert.ok(Math.abs((y0 + y1) / 2 - (r.BAND + r.GAME_H * 0.70)) <= 3, `at the caption line: ${y0}..${y1}`)
  assert.ok(Math.abs((r.high[1] + r.high[3]) / 2 - (r.BAND + r.GAME_H * 0.30)) <= 3, 'chatY moves it')
})

test('edit_args: story Shorts centre chat lines by default; chatAlign left opts out; chatY passes through', () => {
  const args = (edit) => {
    const f = path.join(ROOT, 'stunts', '_chat_align_tmp.js')
    fs.writeFileSync(f, `module.exports = { name: '_chat_align_tmp', edit: ${JSON.stringify(edit)}, async perform () {} }\n`)
    try { return cp.execFileSync('node', ['scripts/edit_args.js', '_chat_align_tmp'], { cwd: ROOT, encoding: 'utf8' }).split('\n') } finally { fs.unlinkSync(f) }
  }
  const at = (a, k) => a.indexOf(k) >= 0 ? a[a.indexOf(k) + 1] : null
  assert.strictEqual(at(args({ story: 'stories/x' }), '--chat_align'), 'center')
  assert.strictEqual(at(args({ story: 'stories/x', chatAlign: 'left' }), '--chat_align'), null)
  assert.strictEqual(at(args({}), '--chat_align'), null)                      // non-story Shorts: vanilla's corner
  assert.strictEqual(at(args({ chatAlign: 'center', chatY: 0.3 }), '--chat_y'), '0.3')
})
