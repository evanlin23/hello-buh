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
  assert.deepStrictEqual(S.selfSkin({ user: '56e', have: got }), { skin: 'real/56e', slim: false, real: '56e' })
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
