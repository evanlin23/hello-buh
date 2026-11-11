// The gui_tags engine piece (docs/engine_features.md "Trade screen, tooltip, caption chunks, hidden name tags"):
// item tooltip lines, the merchant screen and its hover windows (edit.py), non-spoken caption chunks
// (scripts/story_track.py), hidden name tags (lib/name_tags.js). Live test: stunts/_test_gui_tags.js.
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const cp = require('child_process')
const ROOT = path.join(__dirname, '..', '..', '..')
const { tooltipLines } = require('../../tooltip')
const NT = require('../../name_tags')

const py = (src) => cp.execFileSync('python3', ['-c', src], { cwd: ROOT, encoding: 'utf8' })

test('tooltip lines: name in its rarity colour, enchantments gray, curses red, max-level-1 without a numeral', () => {
  const reg = require('minecraft-data')('1.21.11')
  assert.deepStrictEqual(tooltipLines({ name: 'enchanted_book', ench: [['frost_walker', 2]] }, reg), [['Enchanted Book', '#FFFF55'], ['Frost Walker II', '#AAAAAA']])
  assert.deepStrictEqual(tooltipLines({ name: 'diamond_sword', ench: [['sharpness', 5], ['vanishing_curse', 1]] }, reg), [['Diamond Sword', '#55FFFF'], ['Sharpness V', '#AAAAAA'], ['Curse of Vanishing', '#FF5555']])
  assert.deepStrictEqual(tooltipLines({ name: 'enchanted_book', ench: [['mending', 1]] }, reg), [['Enchanted Book', '#FFFF55'], ['Mending', '#AAAAAA']])
  // the 1.21.11 component shapes (stored_enchantments on a live server's trade; a plain map too)
  assert.deepStrictEqual(tooltipLines({ name: 'enchanted_book', components: [{ type: 'stored_enchantments', data: { enchantments: [{ id: reg.enchantmentsByName.frost_walker.id, level: 2 }] } }] }, reg)[1], ['Frost Walker II', '#AAAAAA'])
  assert.deepStrictEqual(tooltipLines({ name: 'emerald' }, reg), [['Emerald', '#FFFFFF']])
})

test('hidden name tags: stunt.hideNameTags and story.json cast "name_tag": false', () => {
  const h = NT.hiddenNames({ hideNameTags: ['Bob'], edit: { story: 'lib/hb/test/fixtures/gui_tags_story' } }, ROOT)
  assert.ok(h.has('Bob') && h.has('Giant') && h.has('Jonah'))
  assert.ok(!h.has('Pia'))
  assert.ok(NT.isHidden(h, [null, 'Jonah']) && !NT.isHidden(h, ['Pia', undefined]))
  assert.strictEqual(NT.hiddenNames({ edit: { story: 'stories/nitwit' } }, ROOT).size, 0)   // published stories: nothing hidden
  assert.strictEqual(NT.hiddenNames({}, ROOT).size, 0)
})

test('non-spoken caption chunks: own their window, hold or run to the next cut/line', () => {
  const out = JSON.parse(py(`
import json, sys; sys.path.insert(0, 'scripts'); import story_track as st
st.POSES = None
tl = [{"t": 2000, "event": "onscreen", "text": "Frost Walker II", "hold": 1.3}, {"t": 5000, "event": "onscreen", "text": "Hi"}, {"t": 5600, "event": "line", "id": "L02"}]
ons = st.onscreen_events(tl, 0.0, 10.0)
print(json.dumps([ons, st.with_onscreen([(0, 2.5, "a", "L01"), (2.5, 4, "b", "L01")], ons)]))`))
  assert.deepStrictEqual(out[0].map(o => [o[0], +o[1].toFixed(3), o[2]]), [[2, 3.3, 'Frost Walker II'], [5, 5.6, 'Hi']])
  assert.deepStrictEqual(out[1].map(e => [+e[0].toFixed(3), +e[1].toFixed(3), e[2]]), [[0, 2, 'a'], [2, 3.3, 'Frost Walker II'], [3.3, 4, 'b'], [5, 5.6, 'Hi']])
})

test('merchant screen: windows split on gui_hover, title with level, the tooltip drawn', () => {
  const out = JSON.parse(py(`
import json, sys; sys.argv = ['x']; import edit
tl = [{"t": 1000, "event": "merchant", "title": "x"}, {"t": 1500, "event": "gui_hover", "slot": "result"}, {"t": 2000, "event": "merchant_close"}, {"t": 2500, "event": "container", "rows": 3}]
w = edit.merchant_windows(tl)
print(json.dumps([[a, b, h] for a, b, _s, h, _t in w] + [edit.merchant_title({"title": "entity.minecraft.villager.librarian", "level": 1}), edit.merchant_title({"title": "entity.minecraft.wandering_trader", "level": 0, "regular": False})]))`))
  assert.deepStrictEqual(out.slice(0, 2), [[1, 1.5, null], [1.5, 2, 'result']])
  assert.deepStrictEqual(out.slice(2), ['Librarian - Novice', 'Wandering Trader'])
  if (!fs.existsSync(path.join(ROOT, 'work', 'client', '1.21.11.jar'))) return
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-'))
  const res = py(`
import sys, zipfile; sys.argv = ['x']; import edit
from PIL import Image
st = {"t": 0, "title": "entity.minecraft.villager.librarian", "level": 1, "offers": [{"a": ["emerald", 27], "b": ["book", 1], "out": ["enchanted_book", 1, 1], "xp": 1}],
      "selected": 0, "slots": [["emerald", 27], ["book", 1], ["enchanted_book", 1, 1]] + [None] * 36, "tips": [None, None, [["Enchanted Book", "#FFFF55"], ["Frost Walker II", "#AAAAAA"]]]}
with zipfile.ZipFile(edit.CLIENT_JAR) as jar:
    edit.merchant_png(jar, st, "${tmp}/a.png", hover="result")
    edit.merchant_png(jar, st, "${tmp}/b.png")
a, b = Image.open("${tmp}/a.png").convert("RGBA"), Image.open("${tmp}/b.png").convert("RGBA")
yel = sum(1 for p in a.getdata() if p[0] > 240 and p[1] > 240 and p[2] < 100 and p[3] == 255)
print(a.size, yel, sum(1 for p in b.getdata() if p[0] > 240 and p[1] > 240 and p[2] < 100 and p[3] == 255))`)
  const m = res.match(/\((\d+), (\d+)\) (\d+) (\d+)/)
  assert.ok(m, res)
  assert.deepStrictEqual([+m[1], +m[2]], [1080, 1920])
  assert.ok(+m[3] > 500 && +m[4] === 0, `the yellow "Enchanted Book" only with the hover: ${res}`)
  fs.rmSync(tmp, { recursive: true, force: true })
})
