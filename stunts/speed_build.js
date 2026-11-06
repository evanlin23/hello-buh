// "Fastest house build 💀" (RedW1ngs: 36M on a speed-build with a timer): the bot builds a small
// cottage block by block with real survival placements while a timer runs; ends looking at it.
// A planner orders the blocks bottom-up and finds, for each, a face of an already-placed (or
// ground) block to click on.
const DIST = 11  // player distance from the house front

// a two-storey 9x7 house: cobblestone base, oak log corners and floor beams, oak plank walls with
// glass windows on both floors, a door, a stepped spruce gable roof with overhangs (~375 blocks)
function plan (x0, y0, z0) {
  const blocks = []
  const B = (x, y, z, name) => blocks.push({ x: x0 + x, y: y0 + y, z: z0 + z, name })
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 9; x++) {
      for (let z = 0; z < 7; z++) {
        const ex = x === 0 || x === 8, ez = z === 0 || z === 6
        if (!ex && !ez) continue
        if (z === 6 && x === 4 && (y === 1 || y === 2)) continue          // doorway (facing the player)
        const corner = ex && ez
        let name = 'oak_planks'
        if (y === 0) name = 'cobblestone'
        else if (corner || y === 3 || y === 7) name = 'oak_log'
        else if ([1, 2, 5, 6].includes(y) && ((ez && [1, 2, 6, 7].includes(x)) || (ex && (z === 2 || z === 4)))) name = 'glass'
        B(x, y, z, name)
      }
    }
  }
  const rows = [[8, [-1, 0, 1, 5, 6, 7]], [9, [1, 2, 4, 5]], [10, [2, 3, 4]]]
  for (const [y, zs] of rows) for (const z of zs) for (let x = -1; x <= 9; x++) B(x, y, z, 'spruce_planks')
  for (const x of [0, 8]) { for (const z of [2, 3, 4]) B(x, 8, z, 'oak_planks'); B(x, 9, 3, 'oak_planks') }
  return blocks
}
const SLOTS = { cobblestone: [0], oak_log: [1, 2], glass: [3], oak_planks: [4, 5], spruce_planks: [6, 7, 8] }
const TPB = 1.6   // ticks per block (~30 s of building)

module.exports = {
  name: 'speed_build',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'Fastest house build 💀',
  edit: { caption: 'Fastest house build 💀', song: 'songs/funk_abnormal.mp3', dropAt: 'done', timer: 'build_start:done' , endAfter: 'done:0.9'},

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd(`/fill ${x - 12} ${floor - 2} ${z - 22} ${x + 12} ${floor - 1} ${z + 4} dirt`)
    await ctx.cmd(`/fill ${x - 12} ${floor} ${z - 22} ${x + 12} ${floor} ${z + 4} grass_block`)
    for (let y0 = floor + 1; y0 <= floor + 15; y0 += 7) await ctx.cmd(`/fill ${x - 12} ${y0} ${z - 22} ${x + 12} ${y0 + 6} ${z + 4} air`)
    // house footprint: x-4..x+4, z from z-DIST-6 .. z-DIST (front wall at z-DIST)
    this.origin = { x: x - 4, y: floor + 1, z: z - DIST - 6 }
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 22')
    await ctx.hotbar([['cobblestone', 64], ['oak_log', 64], ['oak_log', 64], ['glass', 64], ['oak_planks', 64], ['oak_planks', 64], ['spruce_planks', 64], ['spruce_planks', 64], ['spruce_planks', 64]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, 10)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const o = this.origin
    // one material at a time within a layer: a slot switch every few blocks kept the held item lowered
    const todo = plan(o.x, o.y, o.z).sort((a, b) => a.y - b.y || a.name.localeCompare(b.name) || Math.abs(a.x - this.x) - Math.abs(b.x - this.x) || a.z - b.z)
    const used = {}
    const slotFor = (name) => SLOTS[name][Math.min(SLOTS[name].length - 1, Math.floor(((used[name] || 1) - 1) / 64))]
    const placed = new Set()
    const key = (p) => `${p.x},${p.y},${p.z}`
    const solid = (p) => { if (placed.has(key(p))) return true; const b = bot.blockAt(new Vec3(p.x, p.y, p.z)); return !!(b && b.boundingBox === 'block') }
    // faces: [dx,dy,dz of support relative to target, protocol face of the support]
    const FACES = [[0, -1, 0, 1], [0, 0, 1, 2], [0, 0, -1, 3], [1, 0, 0, 4], [-1, 0, 0, 5], [0, 1, 0, 0]]
    const center = new Vec3(this.x + 0.5, o.y + 4.5, o.z + 3.5)
    let aim = center.clone()
    const look = async (target) => {
      aim = aim.plus(target.minus(aim).scaled(0.3))
      const eye = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(eye)
      await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
    }
    await bot.waitForTicks(8)
    ctx.mark('build_start')
    let guard = 0, lastSwing = -99, budget = 0
    while (todo.length && guard++ < 2000) {
      const i = todo.findIndex(b => FACES.some(([dx, dy, dz]) => solid({ x: b.x + dx, y: b.y + dy, z: b.z + dz })))
      if (i < 0) { ctx.log('stuck with', todo.length, 'blocks left'); break }
      const b = todo.splice(i, 1)[0]
      const [dx, dy, dz, face] = FACES.find(([dx, dy, dz]) => solid({ x: b.x + dx, y: b.y + dy, z: b.z + dz }))
      used[b.name] = (used[b.name] || 0) + 1
      if (bot.quickBarSlot !== slotFor(b.name)) ctx.select(slotFor(b.name))   // the next stack once one runs out
      await look(new Vec3(b.x + 0.5, b.y + 0.5, b.z + 0.5))
      bot._client.write('block_place', { hand: 0, location: { x: b.x + dx, y: b.y + dy, z: b.z + dz }, direction: face,
        cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      if (bot.time.age - lastSwing >= 6) { bot.swingArm(); lastSwing = bot.time.age }   // one continuous swing loop (a swing per tick strobed the hand)
      ctx.sound(b.name === 'glass' ? 'block.glass.place' : b.name === 'cobblestone' ? 'block.stone.place' : 'block.wood.place', 1, 0.9 + (guard % 3) * 0.05)
      placed.add(key(b))
      budget += TPB
      while (budget >= 1) { budget -= 1; await bot.waitForTicks(1); await look(new Vec3(b.x + 0.5, b.y + 0.5, b.z + 0.5)) }
    }
    ctx.mark('done')
    await bot.waitForTicks(4)
    for (let i = 0; i < 20; i++) { await look(center); await bot.waitForTicks(1) }
    await bot.waitForTicks(20)
    let ok = 0, all = plan(o.x, o.y, o.z)
    const bad = []
    for (const b of all) { const bl = bot.blockAt(new Vec3(b.x, b.y, b.z)); if (bl && bl.name === b.name) ok++; else bad.push(`${b.x - o.x},${b.y - o.y},${b.z - o.z}:${b.name}->${bl && bl.name}`) }
    if (bad.length) ctx.log('wrong:', bad.join(' '))
    ctx.log(`house: ${ok}/${all.length} blocks correct`)
    return ok >= all.length - 2
  }
}
