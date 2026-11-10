// lib/sets/dress.js torches(): a torch on every block that takes one (Six Thousand Torches), checked on a mock world
const test = require('node:test')
const assert = require('node:assert')
const { torches } = require('../../sets/dress')

function world (cols) {   // cols: { 'x,z': [[y, name, props?], ...] } the column's blocks, anything else is air
  const sent = []
  const blockAt = (p) => {
    const c = cols[`${p.x},${p.z}`] || []
    const b = c.find(([y]) => y === p.y)
    if (!b) return { name: 'air', boundingBox: 'empty', getProperties: () => ({}) }
    return { name: b[1], boundingBox: /grass$|fern|flower|dandelion|poppy|torch|path/.test(b[1]) && b[1] !== 'grass_block' && b[1] !== 'dirt_path' ? 'empty' : 'block', getProperties: () => b[2] || {} }
  }
  class V { constructor (x, y, z) { Object.assign(this, { x, y, z }) } }
  return { sent, ctx: { bot: { blockAt, chat: (s) => sent.push(s), waitForTicks: async () => {} }, Vec3: V } }
}

test('torches go on sturdy tops and posts, replace plants, skip paths, stairs, bottom slabs and skipped cells', async () => {
  const { ctx, sent } = world({
    '0,0': [[64, 'grass_block']],
    '1,0': [[64, 'grass_block'], [65, 'short_grass']],
    '2,0': [[64, 'dirt_path']],
    '3,0': [[64, 'oak_stairs', { half: 'bottom' }]],
    '4,0': [[64, 'oak_slab', { type: 'bottom' }]],
    '5,0': [[64, 'oak_slab', { type: 'top' }]],
    '6,0': [[64, 'oak_fence']],
    '7,0': [[64, 'grass_block'], [65, 'tall_grass', { half: 'lower' }], [66, 'tall_grass', { half: 'upper' }]],
    '8,0': [[64, 'farmland']],
    '9,0': [[64, 'grass_block']]
  })
  const r = await torches(ctx, { x0: 0, z0: 0, x1: 9, z1: 0, yTop: 80, yBottom: 50, skip: new Set(['9,0']) })
  assert.deepStrictEqual(r.at, [[0, 65, 0], [1, 65, 0], [5, 65, 0], [6, 65, 0], [7, 65, 0]])
  assert.strictEqual(r.count, 5)
  assert.ok(sent.includes('/setblock 7 66 0 air'), 'a tall plant loses its upper half')
  assert.strictEqual(sent.filter(s => / torch$/.test(s)).length, 5)
})
