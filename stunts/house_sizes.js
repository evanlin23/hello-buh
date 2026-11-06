// "building a house in 5s vs 10s vs 20s 💀": three builds side by side, each placed block by block
// with real survival placements (block_place on a face of an already-placed or ground block):
// a sad 3x3 dirt hut, a 5x5 plank cottage, then a 7x7 two-colour house (cobblestone base, dark
// oak frame, birch walls, glass windows, a stepped gable roof). A subtitle names each build's
// time; the camera follows the placements and ends backing up to show all three side by side.
// The planner orders blocks bottom-up and finds, for each, a face of something solid to click.

// local coords: x across, y up, z depth with z = depth-1 the front wall (facing the player)
function hut () {
  const out = []
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        if (x === 1 && z === 1) continue
        if (x === 1 && z === 2) continue                              // doorway
        out.push([x, y, z, 'dirt'])
      }
    }
  }
  for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) out.push([x, 2, z, 'dirt'])
  return out
}

function cottage () {
  const out = []
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 5; x++) {
      for (let z = 0; z < 5; z++) {
        const ex = x === 0 || x === 4, ez = z === 0 || z === 4
        if (!ex && !ez) continue
        if (z === 4 && x === 2 && y < 2) continue                       // doorway
        const corner = ex && ez
        const win = !corner && y === 1 && ((z === 4 && (x === 1 || x === 3)) || (ex && z === 2))
        out.push([x, y, z, corner ? 'oak_log' : win ? 'glass' : 'oak_planks'])
      }
    }
  }
  for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) out.push([x, 3, z, 'spruce_planks'])
  for (let x = 1; x < 4; x++) for (let z = 1; z < 4; z++) out.push([x, 4, z, 'spruce_planks'])
  out.push([2, 5, 2, 'spruce_planks'])
  return out
}

function house () {
  const out = []
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 7; x++) {
      for (let z = 0; z < 7; z++) {
        const ex = x === 0 || x === 6, ez = z === 0 || z === 6
        if (!ex && !ez) continue
        if (z === 6 && x === 3 && y < 3 && y > 0) continue              // doorway (on the cobble step)
        const corner = ex && ez
        let name = 'birch_planks'
        if (y === 0) name = 'cobblestone'
        else if (y === 3 || corner) name = 'dark_oak_log'
        else if (y === 2 && ((ez && (x === 1 || x === 2 || x === 4 || x === 5)) || (ex && z >= 2 && z <= 4))) name = 'glass'
        out.push([x, y, z, name])
      }
    }
  }
  // stepped gable roof, ridge along x, overhanging front and back
  const rows = [[4, [-1, 0, 1, 5, 6, 7]], [5, [1, 2, 4, 5]], [6, [2, 3, 4]]]
  for (const [y, zs] of rows) for (const z of zs) for (let x = 0; x < 7; x++) out.push([x, y, z, 'dark_oak_planks'])
  for (const x of [0, 6]) { for (const z of [2, 3, 4]) out.push([x, 4, z, 'birch_planks']); out.push([x, 5, 3, 'birch_planks']) }
  return out
}

const BUILDS = [
  { name: 'hut', blocks: hut(), w: 3, d: 3, dx: -9, rate: 0.5, sub: '5 seconds',
    slot: { dirt: 0 } },
  { name: 'cottage', blocks: cottage(), w: 5, d: 5, dx: -2, rate: 1, sub: '10 seconds',
    slot: { oak_log: 1, oak_planks: 2, glass: 3, spruce_planks: 4 } },
  { name: 'house', blocks: house(), w: 7, d: 7, dx: 6, rate: 1.5, sub: '20 seconds',
    slot: { cobblestone: 5, dark_oak_log: 6, birch_planks: 7, glass: 3, dark_oak_planks: 8 } }
]
const FRONT = 9   // every build's front wall is this far north of the player

const SOUND = (n) => n === 'dirt' ? 'block.gravel.place' : n === 'glass' ? 'block.glass.place' : n === 'cobblestone' ? 'block.stone.place' : 'block.wood.place'

module.exports = {
  name: 'house_sizes',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'building a house in 5s vs 10s vs 20s 💀',
  edit: {
    caption: 'building a house in 5s vs 10s vs 20s 💀', red: '20s', song: 'songs/funk_abnormal.mp3', dropAt: 'all_done',
    startAt: 'build_start:-0.15', endAfter: 'backed_up:1.1',
    subs: BUILDS.map((b, i) => ['build_start', b.sub, i === 2 ? 6.4 : 9, i])   // the last label ends with its build (it sat on the cottage in the wide shot)
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    for (let y0 = floor + 1; y0 <= floor + 14; y0 += 7) await ctx.cmd(`/fill ${x - 20} ${y0} ${z - 24} ${x + 20} ${y0 + 6} ${z + 10} air`)
    await ctx.cmd(`/fill ${x - 20} ${floor} ${z - 24} ${x + 20} ${floor} ${z + 10} grass_block`)
    await ctx.cmd(`/fill ${x - 20} ${floor - 3} ${z - 24} ${x + 20} ${floor - 1} ${z + 10} dirt`)
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 24')
    await ctx.hotbar([['dirt', 64], ['oak_log', 64], ['oak_planks', 64], ['glass', 64], ['spruce_planks', 64], ['cobblestone', 64], ['dark_oak_log', 64], ['birch_planks', 64], ['dark_oak_planks', 64]])
    await ctx.tpCheck(x - 7.5, floor + 1, z + 0.5, 180, 15)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, z, floor } = this
    const placed = new Set()
    const key = (p) => `${p.x},${p.y},${p.z}`
    const solid = (p) => { if (placed.has(key(p))) return true; const b = bot.blockAt(new Vec3(p.x, p.y, p.z)); return !!(b && b.boundingBox === 'block') }
    const FACES = [[0, -1, 0, 1], [0, 0, 1, 2], [0, 0, -1, 3], [1, 0, 0, 4], [-1, 0, 0, 5], [0, 1, 0, 0]]
    const origin = (b) => ({ x: x + b.dx, y: floor + 1, z: z - FRONT - (b.d - 1) })
    const center = (b) => { const o = origin(b); return new Vec3(o.x + b.w / 2, o.y + 1.8, o.z + b.d / 2) }
    let aim = center(BUILDS[0])
    const look = async (target, k = 0.3) => {
      aim = aim.plus(target.minus(aim).scaled(k))
      const eye = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(eye)
      await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
    }
    const glide = async (target, ticks) => { for (let i = 0; i < ticks; i++) { await look(target, 0.18); await bot.waitForTicks(1) } }
    let wrong = 0, lastSwing = -99
    // strafe toward tgt (the bot faces roughly north the whole time: right = +x, back = +z)
    let tgt = null
    const steer = () => {
      if (!tgt) return
      const dx = tgt.x - bot.entity.position.x, dz = tgt.z - bot.entity.position.z
      bot.setControlState('right', dx > 0.3); bot.setControlState('left', dx < -0.3)
      bot.setControlState('back', dz > 0.3); bot.setControlState('forward', dz < -0.3)
    }
    bot.on('physicsTick', steer)

    await bot.waitForTicks(4)
    for (let bi = 0; bi < BUILDS.length; bi++) {
      const B = BUILDS[bi]
      const o = origin(B)
      tgt = { x: o.x + B.w / 2, z: z + 0.5 }              // walk over in front of this plot while building
      await glide(center(B), bi === 0 ? 2 : 4)
      const todo = B.blocks.map(([bx, by, bz, name]) => ({ x: o.x + bx, y: o.y + by, z: o.z + bz, name }))
        .sort((a, b) => a.y - b.y || b.z - a.z || a.x - b.x)
      const slot = { ...B.slot }
      const used = {}
      ctx.mark('build_start', { build: B.name, blocks: todo.length })
      let budget = 0, guard = 0
      while (todo.length && guard++ < 1000) {
        const i = todo.findIndex(b => FACES.some(([dx, dy, dz]) => solid({ x: b.x + dx, y: b.y + dy, z: b.z + dz })))
        if (i < 0) { ctx.log(B.name, 'stuck with', todo.length, 'blocks left'); break }
        const b = todo.splice(i, 1)[0]
        const [dx, dy, dz, face] = FACES.find(([dx, dy, dz]) => solid({ x: b.x + dx, y: b.y + dy, z: b.z + dz }))
        used[b.name] = (used[b.name] || 0) + 1
        if (b.name === 'dark_oak_planks' && used[b.name] === 65) slot.dark_oak_planks = 0    // first stack used up
        if (bot.quickBarSlot !== slot[b.name]) ctx.select(slot[b.name])
        await look(new Vec3(b.x + 0.5, b.y + 0.5, b.z + 0.5))
        bot._client.write('block_place', { hand: 0, location: { x: b.x + dx, y: b.y + dy, z: b.z + dz }, direction: face,
          cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
        // one continuous swing loop, not a swing restarted every tick (that strobed the hand)
        if (bot.time.age - lastSwing >= 6) { bot.swingArm(); lastSwing = bot.time.age }
        ctx.sound(SOUND(b.name), 1, 0.8 + (guard % 3) * 0.05)
        placed.add(key(b))
        budget += 1 / B.rate                                // ticks this block "costs"
        while (budget >= 1) { await bot.waitForTicks(1); budget -= 1; await look(new Vec3(b.x + 0.5, b.y + 0.5, b.z + 0.5)) }
      }
      ctx.mark('build_done', { build: B.name })
      if (bi === 0) bot.chat('/item replace entity @s hotbar.0 with dark_oak_planks 64')   // the roof needs a second stack
      await glide(center(B), bi === 2 ? 4 : 6)             // a beat to look at it
      await bot.waitForTicks(1)
      for (const [bx, by, bz, name] of B.blocks) {
        const bl = bot.blockAt(new Vec3(o.x + bx, o.y + by, o.z + bz))
        if (!bl || bl.name !== name) { wrong++; ctx.log('wrong', B.name, bx, by, bz, name, '->', bl && bl.name) }
      }
    }

    // back up and look over all three
    ctx.mark('all_done')
    const mid = new Vec3(x + 1.5, floor + 2.5, z - FRONT - 3)
    tgt = { x: x + 1.5, z: z + 9 }
    for (let i = 0; i < 80; i++) { await look(mid, 0.12); await bot.waitForTicks(1); if (i > 20 && Math.hypot(tgt.x - bot.entity.position.x, tgt.z - bot.entity.position.z) < 0.4) break }
    ctx.mark('backed_up')
    tgt = null; bot.removeListener('physicsTick', steer)
    for (const c of ['left', 'right', 'forward', 'back']) bot.setControlState(c, false)
    for (let i = 0; i < 30; i++) { await look(mid, 0.15); await bot.waitForTicks(1) }
    ctx.log('wrong blocks:', wrong)
    return wrong <= 2 && !ctx.died
  }
}
