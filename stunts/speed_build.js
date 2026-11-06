// "Fastest house build 💀" (RedW1ngs: 36M on a speed-build with a timer): the bot builds a small
// cottage block by block with real survival placements while a timer runs; ends looking at it.
// A planner orders the blocks bottom-up and finds, for each, a face of an already-placed (or
// ground) block to click on.
const DIST = 8   // player distance from the house front

// cottage: 5x5 footprint, oak log corners, oak plank walls, door gap, glass windows,
// stepped spruce roof
function plan (x0, y0, z0) {
  const blocks = []
  const B = (x, y, z, name) => blocks.push({ x: x0 + x, y: y0 + y, z: z0 + z, name })
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 5; x++) {
      for (let z = 0; z < 5; z++) {
        const edgeX = x === 0 || x === 4, edgeZ = z === 0 || z === 4
        if (!edgeX && !edgeZ) continue
        const corner = edgeX && edgeZ
        const door = z === 4 && x === 2 && y < 2            // front door gap (facing the player)
        if (door) continue
        const window = !corner && y === 1 && ((z === 4 && (x === 1 || x === 3)) || (edgeX && z === 2))
        B(x, y, z, corner ? 'oak_log' : window ? 'glass' : 'oak_planks')
      }
    }
  }
  for (let x = -1; x <= 5; x++) for (let z = -1; z <= 5; z++) B(x, 3, z, 'spruce_planks')   // roof with overhang
  for (let x = 0; x <= 4; x++) for (let z = 0; z <= 4; z++) B(x, 4, z, 'spruce_planks')
  for (let x = 1; x <= 3; x++) for (let z = 1; z <= 3; z++) B(x, 5, z, 'spruce_planks')
  B(2, 6, 2, 'spruce_planks')
  return blocks
}

module.exports = {
  name: 'speed_build',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'Fastest house build 💀',
  edit: { caption: 'Fastest house build 💀', song: 'songs/funk_abnormal.mp3', dropAt: 'done', start: 0.5, timer: 'build_start:done' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd(`/fill ${x - 8} ${floor - 2} ${z - 12} ${x + 8} ${floor - 1} ${z + 4} dirt`)
    await ctx.cmd(`/fill ${x - 8} ${floor} ${z - 12} ${x + 8} ${floor} ${z + 4} grass_block`)
    await ctx.cmd(`/fill ${x - 8} ${floor + 1} ${z - 12} ${x + 8} ${floor + 12} ${z + 4} air`)
    // house footprint: x-2..x+2, z from z-DIST-4 .. z-DIST (front wall at z-DIST)
    this.origin = { x: x - 2, y: floor + 1, z: z - DIST - 4 }
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 14')
    await ctx.hotbar([['oak_log', 64], ['oak_planks', 64], ['glass', 64], ['spruce_planks', 64], 'diamond_axe'])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, 10)
    await ctx.cmd('/gamemode survival')
    ctx.select(1)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const o = this.origin
    const todo = plan(o.x, o.y, o.z).sort((a, b) => a.y - b.y || Math.abs(a.x - this.x) - Math.abs(b.x - this.x) || a.z - b.z)
    const slot = { oak_log: 0, oak_planks: 1, glass: 2, spruce_planks: 3 }
    const placed = new Set()
    const key = (p) => `${p.x},${p.y},${p.z}`
    const solid = (p) => { if (placed.has(key(p))) return true; const b = bot.blockAt(new Vec3(p.x, p.y, p.z)); return !!(b && b.boundingBox === 'block') }
    // faces: [dx,dy,dz of support relative to target, protocol face of the support]
    const FACES = [[0, -1, 0, 1], [0, 0, 1, 2], [0, 0, -1, 3], [1, 0, 0, 4], [-1, 0, 0, 5], [0, 1, 0, 0]]
    const center = new Vec3(this.x + 0.5, o.y + 3, o.z + 2.5)
    let aim = center.clone()
    const look = async (target) => {
      aim = aim.plus(target.minus(aim).scaled(0.3))
      const eye = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(eye)
      await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
    }
    await bot.waitForTicks(8)
    ctx.mark('build_start')
    let guard = 0
    while (todo.length && guard++ < 2000) {
      const i = todo.findIndex(b => FACES.some(([dx, dy, dz]) => solid({ x: b.x + dx, y: b.y + dy, z: b.z + dz })))
      if (i < 0) { ctx.log('stuck with', todo.length, 'blocks left'); break }
      const b = todo.splice(i, 1)[0]
      const [dx, dy, dz, face] = FACES.find(([dx, dy, dz]) => solid({ x: b.x + dx, y: b.y + dy, z: b.z + dz }))
      if (bot.quickBarSlot !== slot[b.name]) ctx.select(slot[b.name])
      await look(new Vec3(b.x + 0.5, b.y + 0.5, b.z + 0.5))
      bot._client.write('block_place', { hand: 0, location: { x: b.x + dx, y: b.y + dy, z: b.z + dz }, direction: face,
        cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm()
      ctx.sound(b.name === 'glass' ? 'block.glass.place' : 'block.wood.place', 1, 0.9 + (guard % 3) * 0.05)
      placed.add(key(b))
      await bot.waitForTicks(1)
      await look(new Vec3(b.x + 0.5, b.y + 0.5, b.z + 0.5))
    }
    ctx.mark('done')
    await bot.waitForTicks(4)
    for (let i = 0; i < 20; i++) { await look(center); await bot.waitForTicks(1) }
    await bot.waitForTicks(20)
    let ok = 0, all = plan(o.x, o.y, o.z)
    for (const b of all) { const bl = bot.blockAt(new Vec3(b.x, b.y, b.z)); if (bl && bl.name === b.name) ok++ }
    ctx.log(`house: ${ok}/${all.length} blocks correct`)
    return ok >= all.length - 2
  }
}
