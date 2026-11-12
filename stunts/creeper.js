// "POV: you hear tssss 💀": frame 0 is a look back over the shoulder at a creeper walking up across the field
// (r:r0f3da0: the opening shows the subject); the bot turns back to its little wall, keeps building, glances
// and when it's close the hiss starts, the bot spins round to see it swelling right there... and it goes off. The twist
// (no-op audit 2026-11-12, owner r:r4607fa: "planks in a field, a creeper walks up, you die"): I survive it (netherite
// armour with Blast Protection IV, the armour bar on the HUD from frame 0; the hearts take the hit), and its crater
// has blown open a vein of diamond ore right under where I was building: the creeper did the mining. A real mob with
// its own AI, a real blast (the ore is set 2-3 blocks down before the take).
const { plateau } = require('../lib/plateau')
module.exports = {
  name: 'creeper',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: you hear tssss 💀',
  edit: { caption: 'POV: you hear tssss 💀', red: 'tssss', dropAt: 'boom', startAt: 'first:0', endAfter: 'found:0.9',   // r:r188b46: 0.9 s on the diamonds
    subs: [['found', 'wait... DIAMONDS?', 1.0]],
    sfx: [['air', 'start', 'boom', { gain: 0.5 }], ['heart', 'first', { gain: 1.6 }], ['dip', 'boom', 0.4], ['impact', 'boom', { gain: 1.4 }], ['dip', 'found', 0.5], ['impact', 'found', { gain: 1.6 }], ['ding', 'found', { gain: 1.4 }]] },   // (mixcheck: under the song the diamond hit needs the song dipped 0.5 s and a full impact; a game duck lowered the sfx cap)   // mixcheck: under the NCS bed the blast needs dip + impact

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g
    await ctx.defaultRules()
    // a field levelled at the terrain's high percentile (lib/plateau): the old 29-block box cleared down to the
    // start height left a cut dirt-and-stone wall right behind the creeper (frame review 2026-11-11)
    const floor = await plateau(ctx, { x0: x - 34, x1: x + 34, z0: z - 34, z1: z + 34, biome: null, pct: 0.995, taper: 14, trees: 16 })   // (review r1: a ±32 field painted plains left a straight biome seam and a dirt face behind the creeper: tapered, the biome left as it is; ±48 took in a hill and stood 25 blocks up)
    this.x = x; this.z = z; this.floor = floor
    // dress the field (review r2: the north-facing building shots read as a superflat plain to the horizon, owner pattern 1):
    // trees on the north half and beside, vanilla grass and flower patches everywhere but the build spot
    const trees = [['oak', -12, -16], ['fancy_oak', 6, -20], ['birch', -4, -27], ['oak', 16, -28], ['fancy_oak', -22, -24], ['birch', 24, -16],
      ['oak', -28, -6], ['birch', 29, 4], ['oak', 9, -32], ['fancy_oak', -14, -33]]
    for (const [f, dx, dz] of trees) await ctx.cmd(`/place feature minecraft:${f} ${x + dx} ${floor + 1} ${z + dz}`, { mayFail: true })
    for (let dx = -32; dx <= 32; dx += 8) {
      for (let dz = -32; dz <= 32; dz += 8) {
        if (Math.abs(dx) <= 6 && dz >= -8 && dz <= 8) continue   // the wall and where I stand
        await ctx.cmd(`/place feature minecraft:patch_grass ${x + dx} ${floor + 1} ${z + dz}`, { mayFail: true })
        if ((dx + dz) % 16 === 0) await ctx.cmd(`/place feature minecraft:flower_plain ${x + dx + 3} ${floor + 1} ${z + dz + 3}`, { mayFail: true })
      }
    }
    await ctx.cmd(`/fill ${x - 6} ${floor + 1} ${z - 7} ${x + 6} ${floor + 3} ${z + 9} air`)   // no plants round the build spot: a grass patch on a wall cell failed a take ('nothing to place against'), and the blast threw their drops for 2 s (settle)
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd('/gamerule keep_inventory true')
    await ctx.cmd('/gamerule block_drops false')   // the blast's plank and dirt drops fell into the crater for 2.2 s: the end sat 3.2 s after the blast (settle)   // no hotbar spray on death: the sword, bread and torches flew 2.2 s and held the end 3.2 s after the blast (settle)
    await ctx.cmd('/difficulty hard')
    // the vein the blast opens: 2-3 blocks under the strip south of the wall where the creeper ends up swelling
    for (const [dx, dz, dy] of [[-1, 3, -2], [0, 4, -2], [1, 4, -3], [0, 5, -2], [-1, 5, -3], [1, 3, -2], [2, 5, -2], [-2, 4, -2], [0, 3, -3]]) {
      await ctx.cmd(`/setblock ${x + dx} ${floor + dy} ${z + dz} diamond_ore`)
    }
    await ctx.hotbar([['oak_planks', 64], 'diamond_sword', ['bread', 16], ['torch', 32]])
    // the armour I survive it in (after ctx.hotbar, which clears the inventory: put on before it, it was gone and the blast
    // killed me) (Blast Protection IV on every piece: a point-blank creeper on hard leaves a few hearts)
    for (const [slot, item] of [['head', 'netherite_helmet'], ['chest', 'netherite_chestplate'], ['legs', 'netherite_leggings'], ['feet', 'netherite_boots']]) {
      await ctx.cmd(`/item replace entity @s armor.${slot} with ${item}[enchantments={blast_protection:4}]`)
    }
    await ctx.tpCheck(x + 0.5, floor + 1, z + 6.5, 0, 4)        // 6 blocks south of the wall (the walk back keeps it over the 8 s floor now the end is 0.8 s after the blast), facing south, where the creeper comes from (frame 0: it's in view)
    await ctx.cmd('/effect give @s instant_health 1 10 true')   // full hearts (the last render started on 1.5 hearts)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, z, floor } = this
    const A = require('../lib/act')(ctx)
    // the creeper I summoned (its id), else the nearest one: a take found another creeper first and never heard the hiss
    let myId = null
    const mine = () => { const all = Object.values(bot.entities).filter(e => e.name === 'creeper'); return all.find(e => e.id === myId) || all.sort((a, b) => a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position))[0] }
    await bot.waitForTicks(6)
    await ctx.cmd('/kill @e[type=creeper]', { mayFail: true })   // only mine
    // the creeper, south, in view at frame 0 (r:r0f3da0): 7 blocks from me (at 12 it was a speck among the flowers);
    // I walk 6 blocks back to my wall (8 was 2 s of empty field: r:r188b46), so its walk up still runs the Short past the 8 s stunt floor (the fuse + the
    // 0.8 s end are a fixed 2.3 s); a hidden Slowness II (no particles) for the same
    await ctx.cmd(`/summon creeper ${x + 0.5} ${floor + 1} ${z + 13.5} {PersistenceRequired:1b}`)
    await bot.waitForTicks(2); { const c = mine(); if (c) myId = c.id }
    await ctx.cmd('/effect give @e[type=creeper] slowness 60 1 true', { mayFail: true })
    { const c = mine(); if (c) await A.aimAt(c.position.offset(0, 1.0, 0), { strict: false, max: 6 }) }
    await bot.waitForTicks(4)   // spawned and drawn before frame 0 (no pop-in)
    // building a little wall behind me (north): 4 planks wide, 2 high
    const wall = []
    for (const dy of [0, 1]) for (const dx of [-2, -1, 0, 1]) wall.push([x + dx, floor + 1 + dy, z - 2])
    // the hook: frame 0 is the creeper walking at me (the viewer knows); eyes on it a moment, then back to the wall
    ctx.mark('first')
    await bot.waitForTicks(7)   // it walks straight at me: it stays on the crosshair without a turn
    ctx.mark('glance')
    // back to my wall (governed turn), walking to it: 'nah, it's fine'
    await A.turnTo(new Vec3(x + 0.5, floor + 1, z - 1.5), { max: 40 })
    ctx.mark('walk')
    bot.setControlState('forward', true)   // motion-ok: a straight walk on cleared flat grass, the view held on the wall
    for (let i = 0; i < 60 && bot.entity.position.z > z + 1.2; i++) await bot.waitForTicks(1)
    bot.setControlState('forward', false)   // motion-ok: the walk's end
    await bot.waitForTicks(3)
    let hissed = false
    const near = () => {
      const c = mine()
      return c ? c.position.distanceTo(bot.entity.position) : 99
    }
    // close is set the tick it comes within 4 blocks (vanilla starts to swell under 3): checked between placements it
    // fired 0.35 s before the blast, too late for the governed spin
    let close = false
    const watch = () => { if (!close && near() < 4.0) close = true }
    bot.on('physicsTick', watch)
    for (const [bx, by, bz] of wall) {
      if (close) { hissed = true; break }
      // (no second glance since the r:r0f3da0 opening: after the walk back it came right away and left a 2 s gap)
      if (close) { hissed = true; break }   // it came within 4 blocks during the glance: the hiss now (a placement here put it 1.2 s late)
      await A.place(new Vec3(bx, by, bz), { sound: 'block.wood.place' })   // aimed by construction (lib/act.js)
      await bot.waitForTicks(6)
      if (close) { hissed = true; break }
    }
    // keep pottering until it's close
    for (let i = 0; i < 160 && !hissed; i++) {
      if (i % 20 === 0) { await ctx.easeLook(bot.entity.yaw + (i % 40 ? 0.25 : -0.25), 0.35, 400) }
      await bot.waitForTicks(1)
      if (close) hissed = true
    }
    if (ctx.died) { ctx.log('died before the hiss: no spin on camera'); return false }
    ctx.mark('hiss'); ctx.sound('entity.creeper.primed', 1, 1)
    const c = mine()
    if (c) await A.aimAt(c.position.offset(0, 0.9, 0), { strict: false, max: 22 })   // a point (a swelling creeper stands still): aimed at the entity, the blast mid-turn threw 'gone'   // spin round: oh no (governed, <=220 deg/s: the 300 ms ease whipped at 777 deg/s; the 30-tick fuse leaves ~0.4 s of it swelling in frame)
    // eyes on it as it swells (no step back: with the hiss caught early the step put me out of reach, 1 heart left on hard)
    // (9 ticks back: the blast left 4 hearts even on hard)
    let at = c ? c.position.clone() : null
    for (let i = 0; i < 4; i++) { await bot.waitForTicks(1); const cc = mine(); if (cc) { at = cc.position.clone(); bot.lookAt(cc.position.offset(0, 0.9, 0), true) } }   // motion-ok: eyes held on the swelling creeper (it stands still: a fraction of a degree a tick)
    // the blast: the tick the creeper is gone
    for (let i = 0; i < 80 && mine() && !ctx.died; i++) { await bot.waitForTicks(1); const cc = mine(); if (cc) at = cc.position.clone() }
    if (ctx.died) { ctx.log('died in the blast'); return false }
    ctx.mark('boom')
    await bot.waitForTicks(8)   // the smoke clears off the crater
    // down into the crater: the vein it opened
    const ores = []
    for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) for (let dy = -4; dy <= 0; dy++) {
      const p = at.floored().offset(dx, dy, dz), b = bot.blockAt(p)
      if (b && b.name === 'diamond_ore') { const up = bot.blockAt(p.offset(0, 1, 0)); if (up && /air/.test(up.name)) ores.push(p) }
    }
    ctx.log('diamond ore showing in the crater:', ores.length)
    if (ores.length < 2) return false
    const mid = ores.reduce((a, p) => a.plus(p), new Vec3(0, 0, 0)).scaled(1 / ores.length).offset(0.5, 0.8, 0.5)
    await A.aimAt(mid, { strict: false, max: 24 })
    ctx.mark('found')
    await bot.waitForTicks(30)
    return true
  }
}
