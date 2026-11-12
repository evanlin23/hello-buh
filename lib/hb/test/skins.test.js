// Real player skins: scripts/fetch_skin.py's profile parse and PNG checks, and lib/skins.js's choice of skin
const test = require('node:test')
const assert = require('node:assert')
const path = require('path')
const { spawnSync } = require('child_process')
const S = require('../../skins')

const ROOT = path.join(__dirname, '..', '..', '..')
const FIX = path.join(__dirname, 'fixtures')
const have = (map) => (n) => map[n] || null

test('the fetcher reads the skin url (https) and model from the base64 textures property', (t) => {
  if (spawnSync('python3', ['-c', 'import PIL']).status !== 0) return t.skip('python3 with Pillow not found')
  const r = spawnSync('python3', ['-I', '-c', `
import json, sys, io
sys.path.insert(0, ${JSON.stringify(path.join(ROOT, 'scripts'))})
import fetch_skin as F
from PIL import Image
out = {}
for k in ['56e', 'slim']:
    out[k] = F.parse_profile(json.load(open(${JSON.stringify(FIX)} + '/mojang_profile_' + k + '.json')))
out['none'] = F.parse_profile({'properties': []})
def png(w, h, a=255, fmt='PNG'):
    b = io.BytesIO(); Image.new('RGBA', (w, h), (10, 200, 30, a)).save(b, fmt); return b.getvalue()
im, legacy = F.normalize(png(64, 32))
out['legacy'] = [im.size, legacy, im.getpixel((36, 52))[3], im.getpixel((40, 8))[3]]
im, legacy = F.normalize(png(64, 64, 0))
out['modern'] = [im.size, legacy, im.getpixel((4, 4))[3], im.getpixel((40, 4))[3], im.getpixel((44, 36))[3]]
for bad in [png(32, 32), png(64, 64, 255, 'GIF')]:
    try: F.normalize(bad); out.setdefault('bad', []).append('accepted')
    except ValueError as e: out.setdefault('bad', []).append('rejected')
print(json.dumps(out))
`], { encoding: 'utf8' })
  assert.strictEqual(r.status, 0, r.stderr)
  const o = JSON.parse(r.stdout)
  assert.deepStrictEqual(o['56e'], ['https://textures.minecraft.net/texture/d5b5f019713a1827e340508e720b4ac55a47e1d6685067eae8d05fe55de92ef7', 'wide'])
  assert.strictEqual(o.slim[1], 'slim')
  assert.strictEqual(o.none, null)
  // legacy 64x32: made 64x64, the left arm copied in (opaque), an all-opaque hat cleared (the Notch hack)
  assert.deepStrictEqual(o.legacy, [[64, 64], true, 255, 0])
  // 64x64: the base layer made opaque (setNoAlpha), the overlays (hat, jacket) keep their alpha
  assert.deepStrictEqual(o.modern, [[64, 64], false, 255, 0, 0])
  assert.deepStrictEqual(o.bad, ['rejected', 'rejected'])
})

test('the fetcher only ever fetches the owner\'s names', () => {
  assert.deepStrictEqual(S.REAL, ['56e'])
  assert.deepStrictEqual(S.wantedSkins({ user: 'Buh', cast: { self: 'efe', Bob: '@56e', Amy: '@stranger' }, actors: ['56e', 'Notch'] }), ['56e'])
  assert.deepStrictEqual(S.wantedSkins({ user: '56e' }), ['56e'])
  assert.deepStrictEqual(S.wantedSkins({ user: 'HelloBuh' }), [])
})

test('the bot draws its real skin when it has one, else what it drew before', () => {
  const got = have({ '56e': { slim: false }, slimmy: { slim: true } })
  assert.deepStrictEqual(S.selfSkin({ user: '56e', have: got }), { skin: 'real/56e', slim: false, model: null, real: '56e' })
  // lib/real_skins.json's choice rides along (56e: wide arms, owner 2026-11-11)
  assert.strictEqual(S.selfSkin({ user: '56e', have: have({ '56e': { slim: false, model: 'wide' } }) }).model, 'wide')
  assert.strictEqual(S.MODEL['56e'], 'wide')
  assert.strictEqual(S.selfSkin({ user: 'slimmy', have: got }).slim, true)
  // no fetched skin (no private assets, Mojang down): the default skin
  assert.strictEqual(S.selfSkin({ user: '56e', have: have({}) }).skin, 'steve')
  // recordings from before rec.user (the HelloBuh bot) and story heroes ('Buh') are unchanged
  assert.strictEqual(S.selfSkin({ user: null, have: got }).skin, 'steve')
  assert.strictEqual(S.selfSkin({ user: 'Buh', have: got }).skin, 'steve')
  // SKIN and cast.self still win; cast.self '@56e' asks for the real skin
  assert.strictEqual(S.selfSkin({ env: { SKIN: 'alex' }, user: '56e', have: got }).skin, 'alex')
  assert.strictEqual(S.selfSkin({ cast: { self: 'efe' }, user: '56e', have: got }).skin, 'efe')
  assert.strictEqual(S.selfSkin({ cast: { self: '@56e' }, user: 'Buh', have: got }).skin, 'real/56e')
})

test('actors: cast first, then their own real skin, else steve', () => {
  const got = have({ '56e': { slim: false } })
  assert.strictEqual(S.actorSkin({ cast: { Grandpa: 'efe' }, user: 'Grandpa', have: got }).skin, 'efe')
  assert.strictEqual(S.actorSkin({ cast: { Grandpa: '@56e' }, user: 'Grandpa', have: got }).skin, 'real/56e')
  assert.strictEqual(S.actorSkin({ cast: {}, user: '56e', have: got }).skin, 'real/56e')
  assert.strictEqual(S.actorSkin({ cast: {}, user: 'Kid', have: got }).skin, 'steve')
  assert.strictEqual(S.actorSkin({ user: null, have: got }).skin, 'steve')
})

test('haveSkin needs the PNG and a name on the list', () => {
  const dir = path.join(FIX, 'no_such_dir')
  assert.strictEqual(S.haveSkin('56e', dir), null)
  assert.strictEqual(S.haveSkin('stranger', dir), null)
})

// renderer/skin_layout.js is a browser ES module: load its source as one
const fs = require('fs')
const layout = () => import('data:text/javascript,' + encodeURIComponent(fs.readFileSync(path.join(ROOT, 'renderer', 'skin_layout.js'), 'utf8')))
// a slim-painted 64x64 skin: every arm face pixel opaque and coloured by (face, column, row); the wide-only 4th
// column empty, as in 56e's skin
function slimFixture () {
  const W = 64, data = new Uint8ClampedArray(W * W * 4)
  const put = (x, y, rgba) => data.set(rgba, (y * W + x) * 4)
  const faces = (u, v) => [['top', u + 4, v, 3, 4], ['bottom', u + 7, v, 3, 4], ['outer', u, v + 4, 4, 12], ['front', u + 4, v + 4, 3, 12], ['inner', u + 7, v + 4, 4, 12], ['back', u + 11, v + 4, 3, 12]]
  const colour = (fi, i, j) => [40 + fi * 30, 60 + i * 40, 20 + j * 10, 255]
  const boxes = [[40, 16], [40, 32], [32, 48], [48, 48]]
  for (const [u, v] of boxes) faces(u, v).forEach(([, x, y, w, h], fi) => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) put(x + i, y + j, colour(fi, i, j)) })
  return { px: { data, width: W }, faces, colour, boxes }
}

test('a slim-painted skin is recognised, and converted to wide arms with no empty column', async () => {
  const L = await layout()
  const { px, colour, boxes } = slimFixture()
  assert.strictEqual(L.isSlimLayout(px), true)
  assert.strictEqual(L.slimToWide(px), true)
  assert.strictEqual(L.isSlimLayout(px), false)
  const get = (x, y) => Array.from(px.data.slice((y * 64 + x) * 4, (y * 64 + x) * 4 + 4))
  // wide faces: [name, x, y, w, h, slim face index, column map wide -> slim]
  const dup = [0, 1, 1, 2], same = [0, 1, 2, 3]
  for (const [u, v] of boxes) {
    const wide = [[u + 4, v, 4, 4, 0, dup], [u + 8, v, 4, 4, 1, dup], [u, v + 4, 4, 12, 2, same], [u + 4, v + 4, 4, 12, 3, dup], [u + 8, v + 4, 4, 12, 4, same], [u + 12, v + 4, 4, 12, 5, dup]]
    for (const [x, y, w, h, fi, map] of wide) {
      for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
        const p = get(x + i, y + j)
        assert.strictEqual(p[3], 255, `transparent at ${x + i},${y + j}`)
        assert.ok(p[0] + p[1] + p[2] > 0, `black at ${x + i},${y + j}`)
        assert.deepStrictEqual(p, colour(fi, map[i], j), `face ${fi} at ${x + i},${y + j}`)   // edge columns kept, middle doubled
      }
    }
  }
})

test('slim art whose base layer was already made opaque (fetch_skin normalize, on Actions) is still converted', async () => {
  const L = await layout()
  const { px } = slimFixture()
  // setNoAlpha on the base layer: the empty 4th column becomes opaque black (the black stripe down 56e's arm)
  for (const [x0, y0, x1, y1] of [[0, 0, 32, 16], [0, 16, 64, 32], [16, 48, 48, 64]]) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px.data[(y * 64 + x) * 4 + 3] = 255
  assert.strictEqual(L.isSlimLayout(px), true)
  assert.strictEqual(L.slimToWide(px), true)
  for (let j = 20; j < 32; j++) for (let x = 40; x < 56; x++) { const o = (j * 64 + x) * 4; assert.ok(px.data[o] + px.data[o + 1] + px.data[o + 2] > 0, `black at ${x},${j}`) }
})

test('a wide skin is left alone, and the base layer is made opaque', async () => {
  const L = await layout()
  const W = 64, data = new Uint8ClampedArray(W * W * 4)
  for (let y = 16; y < 32; y++) for (let x = 40; x < 56; x++) data.set([0, 200, 0, 255], (y * W + x) * 4)
  assert.strictEqual(L.isSlimLayout({ data, width: W }), false)
  L.opaqueBase({ data, width: W })
  assert.strictEqual(data[(4 * W + 4) * 4 + 3], 255)        // head base
  assert.strictEqual(data[(4 * W + 44) * 4 + 3], 0)         // hat overlay keeps its alpha
})

test('the page modules that draw skins parse', () => {
  const os = require('os')
  for (const f of ['entities.js', 'page.js', 'skin_layout.js']) {
    const tmp = path.join(os.tmpdir(), `hb_check_${process.pid}_${f.replace('.js', '.mjs')}`)
    fs.copyFileSync(path.join(ROOT, 'renderer', f), tmp)
    const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' })
    fs.unlinkSync(tmp)
    assert.strictEqual(r.status, 0, `${f}: ${r.stderr}`)
  }
})
