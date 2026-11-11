// "building a house in 5s vs 10s vs 20s vs 60s 💀": four builds side by side, each placed block by block
// with real survival placements (block_place on a face of an already-placed or ground block):
// a sad 3x3 dirt hut, a 5x5 plank cottage, then a 7x7 two-colour house (cobblestone base, dark
// oak frame, birch walls, glass windows, a stepped gable roof), then a 9x9 two-storey mansion.
// It cuts to a raised wide shot of all four the moment the mansion is done. A subtitle names each build's
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

function mansion () {
  const out = []
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      for (let z = 0; z < 9; z++) {
        const ex = x === 0 || x === 8, ez = z === 0 || z === 8
        if (!ex && !ez) continue
        if (z === 8 && x === 4 && (y === 1 || y === 2)) continue               // doorway
        const corner = ex && ez
        let name = 'white_concrete'
        if (y === 0) name = 'stone_bricks'
        else if (y === 4 || y === 8 || corner) name = 'dark_oak_log'
        else if ([2, 3, 6, 7].includes(y) && ((ez && x !== 4 && x % 2 === 0) || (ex && z % 2 === 0))) name = 'glass'   // two-high windows
        else if ((y === 5 || y === 6 || y === 7) && z === 8 && x === 4) name = y === 6 ? 'glass' : 'white_concrete'
        out.push([x, y, z, name])
      }
    }
  }
  const rows = [[9, [-1, 0, 1, 7, 8, 9]], [10, [1, 2, 6, 7]], [11, [2, 3, 5, 6]], [12, [3, 4, 5]]]
  for (const [y, zs] of rows) for (const z of zs) for (let x = 0; x < 9; x++) out.push([x, y, z, 'dark_oak_planks'])
  for (const x of [0, 8]) { for (const z of [2, 3, 4, 5, 6]) out.push([x, 9, z, 'dark_oak_planks']); for (const z of [3, 4, 5]) out.push([x, 10, z, 'dark_oak_planks']); out.push([x, 11, 4, 'dark_oak_planks']) }
  return out
}

const BUILDS = [
  { name: 'block', blocks: [[0, 0, 0, 'dirt']], w: 1, d: 1, dx: -13, rate: 0.5, sub: '1 second',
    slots: { dirt: [0] } },
  { name: 'hut', blocks: hut(), w: 3, d: 3, dx: -9, rate: 0.5, sub: '5 seconds',
    slots: { dirt: [0] } },
  { name: 'cottage', blocks: cottage(), w: 5, d: 5, dx: -2, rate: 1, sub: '10 seconds',
    slots: { oak_log: [1], oak_planks: [2], glass: [3], spruce_planks: [4] } },
  { name: 'house', blocks: house(), w: 7, d: 7, dx: 6, rate: 1.5, sub: '20 seconds',
    slots: { cobblestone: [5], dark_oak_log: [6], birch_planks: [7], glass: [3], dark_oak_planks: [8, 0] } },
  { name: 'mansion', blocks: mansion(), w: 9, d: 9, dx: 16, rate: 1.6, sub: '60 seconds',
    hotbar: [['stone_bricks', 64], ['white_concrete', 64], ['white_concrete', 64], ['dark_oak_log', 64], ['dark_oak_log', 64], ['glass', 64], ['dark_oak_planks', 64], ['dark_oak_planks', 64], ['dark_oak_planks', 64]],
    slots: { stone_bricks: [0], white_concrete: [1, 2], dark_oak_log: [3, 4], glass: [5], dark_oak_planks: [6, 7, 8] } }
]
const FRONT = 9   // every build's front wall is this far north of the player

const SOUND = (n) => n === 'dirt' ? 'block.gravel.place' : n === 'glass' ? 'block.glass.place' : /cobblestone|stone_bricks|concrete/.test(n) ? 'block.stone.place' : 'block.wood.place'

module.exports = {
  name: 'house_sizes',
  biome: process.env.BIOME || 'minecraft:plains',
  renderDistance: 6,   // the clearing's cut edge is past it (see setup)
  caption: 'building a house in 5s vs 10s vs 20s vs 60s 💀',
  edit: {
    caption: 'building a house in 5s vs 10s vs 20s vs 60s 💀', red: '60s', dropAt: 'all_done',
    startAt: 'build_start:-0.15', endAfter: 'all_done:0.9',
    // the mansion's 13 s of wall-placing at 2x (no dead time; it's the "60 seconds" build)
    speed: [['b_mansion', 'e_mansion', 2]],
    subs: BUILDS.map((b, i) => ['build_start', b.sub, 30, i]).concat([['all_done', 'all of them', 0.9]])   // each label runs until the next
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd(`/kill @e[type=!player,x=${x},y=${floor},z=${z},distance=..160]`)   // a polar bear buried by the floor fill suffocated off-screen
    // a wide clearing: a cut hillside at its edge read as a command-built box behind the builds
    // (pieces under the 32768-block /fill cap; the edge sits out in the fog: at x+42 a cut hillside showed)
    const fillBig = async (x0, y0, z0, x1, y1, z1, block) => {
      const per = Math.max(1, Math.floor(32768 / ((y1 - y0 + 1) * (z1 - z0 + 1))))
      for (let xa = x0; xa <= x1; xa += per) { bot.chat(`/fill ${xa} ${y0} ${z0} ${Math.min(x1, xa + per - 1)} ${y1} ${z1} ${block}`); await new Promise(r => setTimeout(r, 900)) }   // on the clock: big fills stall the server past mineflayer's tick wait
    }
    // ...to beyond the draw distance (renderDistance 6 = 96 blocks) from every plot and the wide shot:
    // x+85 still showed a cut hillside on the walks east
    for (let y0 = floor + 1; y0 <= floor + 40; y0 += 8) await fillBig(x - 112, y0, z - 125, x + 125, y0 + 7, z + 45, 'air')
    await fillBig(x - 112, floor, z - 125, x + 125, floor, z + 45, 'grass_block')
    await fillBig(x - 112, floor - 3, z - 125, x + 125, floor - 1, z + 45, 'dirt')
    // the wide shot at the end: a dirt mound in front of the middle of the four plots
    this.view = { x: x + 6, z: z + 27 }   // far and high enough for all five
    await ctx.cmd(`/fill ${x + 5} ${floor + 1} ${z + 26} ${x + 7} ${floor + 5} ${z + 28} dirt`)
    await ctx.cmd(`/fill ${x + 5} ${floor + 5} ${z + 26} ${x + 7} ${floor + 5} ${z + 28} grass_block`)
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 30')
    await ctx.hotbar([['dirt', 64], ['oak_log', 64], ['oak_planks', 64], ['glass', 64], ['spruce_planks', 64], ['cobblestone', 64], ['dark_oak_log', 64], ['birch_planks', 64], ['dark_oak_planks', 64]])
    await ctx.tpCheck(x - 12.5, floor + 1, z + 0.5, 180, 15)
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
      if (B.hotbar) {                                    // a fresh hotbar for the big one (as the walk starts)
        for (let k = 0; k < 9; k++) bot.chat(`/item replace entity @s hotbar.${k} with ${B.hotbar[k][0]} ${B.hotbar[k][1]}`)
        ctx.mark('hotbar_swap')
      }
      tgt = { x: o.x + B.w / 2, z: z + 0.5 + (B.d > 7 ? 2 : 0) }   // walk over in front of this plot while building
      await glide(center(B), bi === 0 ? 2 : 4)
      const todo = B.blocks.map(([bx, by, bz, name]) => ({ x: o.x + bx, y: o.y + by, z: o.z + bz, name }))
        .sort((a, b) => a.y - b.y || a.name.localeCompare(b.name) || b.z - a.z || a.x - b.x)   // a material at a time per layer (fewer slot switches)
      const used = {}
      const slotFor = (name) => B.slots[name][Math.min(B.slots[name].length - 1, Math.floor((used[name] - 1) / 64))]
      ctx.mark('build_start', { build: B.name, blocks: todo.length })
      ctx.mark(`b_${B.name}`)                                // speed-span anchors (each name once)
      let budget = 0, guard = 0, backed = false
      while (todo.length && guard++ < 1000) {
        const i = todo.findIndex(b => FACES.some(([dx, dy, dz]) => solid({ x: b.x + dx, y: b.y + dy, z: b.z + dz })))
        if (i < 0) { ctx.log(B.name, 'stuck with', todo.length, 'blocks left'); break }
        const b = todo.splice(i, 1)[0]
        // the mansion's roof: back off so the gable rises in view (close in, the eave hid it: 4 s of a
        // white wall)
        if (B.name === 'mansion' && !backed && b.y >= o.y + 9) { backed = true; ctx.mark('roof'); tgt = { x: tgt.x, z: tgt.z + 9 } }
        const [dx, dy, dz, face] = FACES.find(([dx, dy, dz]) => solid({ x: b.x + dx, y: b.y + dy, z: b.z + dz }))
        used[b.name] = (used[b.name] || 0) + 1
        if (bot.quickBarSlot !== slotFor(b.name)) ctx.select(slotFor(b.name))   // next stack once one runs out
        await look(new Vec3(b.x + 0.5, b.y + 0.5, b.z + 0.5))
        bot._client.write('block_place', { hand: 0, location: { x: b.x + dx, y: b.y + dy, z: b.z + dz }, direction: face,
          cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
        // one continuous swing loop, not a swing restarted every tick (that strobed the hand)
        if (ctx.tick - lastSwing >= 3) { bot.swingArm(); lastSwing = ctx.tick }   // ctx.tick: bot.time.age only updates once a second
        ctx.sound(SOUND(b.name), 1, 0.8 + (guard % 3) * 0.05)
        placed.add(key(b))
        budget += 1 / B.rate                                // ticks this block "costs"
        while (budget >= 1) { await bot.waitForTicks(1); budget -= 1; await look(new Vec3(b.x + 0.5, b.y + 0.5, b.z + 0.5)) }
      }
      ctx.mark('build_done', { build: B.name })
      ctx.mark(`e_${B.name}`)
      if (B.name === 'hut') bot.chat('/item replace entity @s hotbar.0 with dark_oak_planks 64')   // the roof needs a second stack
      if (bi < BUILDS.length - 1) await glide(center(B), 6)   // a beat to look at it
      await bot.waitForTicks(1)
      for (const [bx, by, bz, name] of B.blocks) {
        const bl = bot.blockAt(new Vec3(o.x + bx, o.y + by, o.z + bz))
        if (!bl || bl.name !== name) { wrong++; ctx.log('wrong', B.name, bx, by, bz, name, '->', bl && bl.name) }
      }
    }

    // the payoff: cut to the wide shot of all four from the mound, a slow drift across them
    tgt = null; bot.removeListener('physicsTick', steer)
    for (const c of ['left', 'right', 'forward', 'back']) bot.setControlState(c, false)
    const mid = new Vec3(x + 6, floor + 5.6, z - FRONT - 4)
    aim = mid.offset(-3, 0, 0)
    // the cut lands already aimed (the first look after a plain tp jumped the camera)
    const eyeV = new Vec3(this.view.x + 0.5, floor + 6 + 1.62, this.view.z + 0.5), dv = aim.minus(eyeV)
    const tpYaw = -Math.atan2(dv.x, dv.z) * 180 / Math.PI,   // vanilla yaw: 0 = south, 90 = west
      tpPitch = -Math.atan2(dv.y, Math.hypot(dv.x, dv.z)) * 180 / Math.PI
    bot.chat(`/tp @s ${this.view.x + 0.5} ${floor + 6} ${this.view.z + 0.5} ${tpYaw.toFixed(1)} ${tpPitch.toFixed(1)}`)
    await bot.waitForTicks(1)
    ctx.mark('all_done')                                    // on the cut (a tick later left the old label up on the wide shot)
    await bot.waitForTicks(1)
    ctx.sound('entity.player.levelup', 1, 1); ctx.sound('ui.toast.challenge_complete', 0.6, 1)
    for (let i = 0; i < 40; i++) { await look(mid.offset(3, 0, 0), 0.04); await bot.waitForTicks(1) }
    ctx.log('wrong blocks:', wrong)
    return wrong <= 2 && !ctx.died
  }
}
