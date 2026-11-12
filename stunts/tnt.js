// "POV: you lit 75 TNT 💀" (v2, owner 2026-11-11 r:re197bb: "low-key a no op reel. Every one we make must give the viewer
// satisfaction"): the 75-TNT wall (5x3x5) sits at the foot of a grassy hill with a little oak house and a tree on top.
// The hill is a real TNT core under a grass-and-dirt skin (and a TNT bed under the field), so the 75 sets off the
// whole hill: one vanilla chain, every block real TNT, the blast frames from the server's explosion packets.
// Beats: frame 0 the wall with the hill and the house behind it (r:r0f3da0); light it (an aimed use, lib/act.js); a
// cut over most of the fuse to a vantage 40+ blocks back, the same view of the hill as the before; the wall goes
// off, then the hill erupts for seconds and the house goes with it; a cut to the rim of the crater, already looking
// down into it (the after), one slow pan, the end.
const { plateau } = require('../lib/plateau')

const HR = 12, HH = 10          // the hill: radius and height (blocks)
const HZ = -40                  // the hill's centre, relative to the start z (x is the start x)
const PZ = HZ + HR + 3          // the 75-TNT wall's centre: its back row touches the hill's foot
const VZ = HZ + 36              // the vantage after the cut (24 blocks from the wall, 36 from the hill: at 46 the hill read small)

module.exports = {
  name: 'tnt',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: you lit 75 TNT 💀',
  recordRadius: 128,
  botTimeout: 600,
  edit: {
    caption: 'POV: you lit 75 TNT 💀', red: '75', dropAt: 'boom', startAt: 'lit:-1.2', endAfter: 'crater:0.7',   // settle-ok: the crater cut comes after the chain's last blast (perform waits out every primed TNT); r:r188b46 ends 0.7 s into the crater
    speed: [['fuse_a', 'fuse_b', 'cut'], ['rim_a', 'rim_b', 'cut']],   // most of the fuse; the chain's end to the crater's rim
    subs: [['hill', 'wait... THE HILL??', 2.2, 0]],
    sfx: [['pop', 'start', { gain: 1.0 }], ['riser', 'fuse_b', 'boom'], ['boom', 'boom'], ['boom', 'hill', { gain: 1.0 }],
      ['dip', 'crater', 0.4], ['impact', 'crater', { gain: 1.3 }]],
    flash: [['boom', 0, 0.4], ['hill', 0, 0.5], ['crater', 0, 0.3]],
    shake: [['boom', 0, 8], ['hill', 0, 14]], punch: [['crater', 0, 1.06]]
  },

  async setup (ctx) {
    const { bot } = ctx
    // a retry runs in the same world: build 600 blocks away from the last attempt's set (tnt_1000's pattern: the old
    // hill raised the next plateau). Attempts are counted per world (run.sh makes a fresh one).
    const fs = require('fs'), path = require('path')
    const cf = path.join(__dirname, '..', 'work', 'tnt.attempt.json')
    let mt = 0; try { mt = fs.statSync(path.join(__dirname, '..', 'work', 'server', 'world')).ino } catch (e) {}
    let n = 0; try { const c = JSON.parse(fs.readFileSync(cf, 'utf8')); if (c.mt === mt) n = c.n + 1 } catch (e) {}
    try { fs.writeFileSync(cf, JSON.stringify({ mt, n })) } catch (e) {}
    if (n > 0) {
      const p0 = bot.entity.position
      await ctx.cmd(`/tp @s ${Math.floor(p0.x) + 600 * n} 200 ${Math.floor(p0.z)}`)
      await bot.waitForTicks(40)
      await ctx.locateBiome(this.biome)
    }
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g
    await ctx.defaultRules()
    await ctx.cmd('/gamerule block_drops false')   // no floating item drops over the crater
    // a big field levelled at the terrain's high percentile (lib/plateau), deep dirt and stone below (the crater goes
    // ~12 deep; one that reached groundwater flooded)
    const floor = await plateau(ctx, { x0: x - 44, x1: x + 44, z0: z + HZ - 40, z1: z + VZ + 14, above: 32, below: 22, biome: 'minecraft:plains', pct: 0.995, taper: 0, trees: 10 })
    this.x = x; this.z = z; this.floor = floor
    this.hz = z + HZ; this.pz = z + PZ; this.vz = z + VZ
    for (let y = floor - 22; y <= floor - 5; y += 3) await ctx.cmd(`/fill ${x - 44} ${y} ${z + HZ - 40} ${x + 44} ${Math.min(floor - 5, y + 2)} ${z + VZ + 14} stone`)

    // the hill: a dome built in layers of row fills (one command a row, ~500 in all: per-column fills ran past the
    // bot's timeout), grass on the outside (a natural hill's sides), a TNT dome 2 in from the skin, and a TNT bed
    // under the hill and the wall (4 deep) so the crater goes into the ground
    const hz = this.hz
    const disc = async (y0, y1, rad, block) => {
      const ri = Math.floor(rad)
      for (let dz = -ri; dz <= ri; dz++) {
        const w = Math.floor(Math.sqrt(rad * rad - dz * dz))
        await ctx.cmd(`/fill ${x - w} ${y0} ${hz + dz} ${x + w} ${y1} ${hz + dz} ${block}`)
      }
    }
    const height = (dx, dz) => { const r = Math.hypot(dx, dz) / HR; return r > 1 ? 0 : (r < 0.28 ? HH : Math.round(HH * Math.sqrt(1 - r * r))) }
    let tnt = 0
    await disc(floor - 4, floor - 1, HR * 0.85, 'tnt')
    for (let k = 1; k <= HH; k++) {
      const rad = HR * Math.sqrt(Math.max(0, 1 - Math.pow((k - 0.5) / HH, 2)))
      await disc(floor + k, floor + k, Math.max(3.4, rad), 'grass_block')
    }
    for (let k = 0; k <= HH - 2; k++) {
      const rad = (HR - 2) * Math.sqrt(Math.max(0, 1 - Math.pow((k + 0.5) / (HH - 2), 2)))
      if (rad < 1) break
      await disc(floor + k, floor + k, rad, 'tnt')
      tnt += Math.round(Math.PI * rad * rad)
    }
    tnt += Math.round(Math.PI * Math.pow(HR * 0.85, 2) * 4)
    // the bed under the wall and between it and the hill (the wall's blast reaches the hill's core through the skin)
    await ctx.cmd(`/fill ${x - 3} ${floor - 3} ${this.pz - 3} ${x + 3} ${floor - 1} ${hz + HR - 2} tnt`)
    ctx.log('hill TNT', tnt)
    this.hillTnt = tnt

    // the house on the flat top: oak planks with log corners, glass, a door to the south, a plank roof
    const T = floor + HH
    const hx0 = x - 2, hx1 = x + 2, hz0 = hz - 2, hz1 = hz + 2
    await ctx.cmd(`/fill ${hx0} ${T + 1} ${hz0} ${hx1} ${T + 3} ${hz1} oak_planks hollow`)
    await ctx.cmd(`/fill ${hx0} ${T} ${hz0} ${hx1} ${T} ${hz1} cobblestone`)
    for (const [cx, cz] of [[hx0, hz0], [hx1, hz0], [hx0, hz1], [hx1, hz1]]) await ctx.cmd(`/fill ${cx} ${T + 1} ${cz} ${cx} ${T + 3} ${cz} oak_log`)
    for (const [wx, wz] of [[x - 1, hz1], [x + 1, hz1], [hx0, hz], [hx1, hz], [x, hz0]]) await ctx.cmd(`/setblock ${wx} ${T + 2} ${wz} glass_pane`)
    await ctx.cmd(`/setblock ${x} ${T + 1} ${hz1} oak_door[half=lower,facing=south]`)
    await ctx.cmd(`/setblock ${x} ${T + 2} ${hz1} oak_door[half=upper,facing=south]`)
    await ctx.cmd(`/fill ${hx0 - 1} ${T + 4} ${hz0 - 1} ${hx1 + 1} ${T + 4} ${hz1 + 1} oak_slab`)
    await ctx.cmd(`/fill ${hx0} ${T + 4} ${hz0} ${hx1} ${T + 4} ${hz1} oak_planks`)
    await ctx.cmd(`/fill ${hx0 + 1} ${T + 5} ${hz0 + 1} ${hx1 - 1} ${T + 5} ${hz1 - 1} oak_slab`)
    await ctx.cmd(`/place feature minecraft:oak ${x + 4} ${T + 1} ${hz - 1}`, { mayFail: true })
    for (const [dx, dz] of [[-5, 4], [5, 5], [-6, -3], [3, -6]]) {
      await ctx.cmd(`/place feature minecraft:patch_grass ${x + dx} ${floor + height(dx, dz) + 1} ${hz + dz}`, { mayFail: true })
    }

    // dress the field (owner pattern 1: never a superflat plain to the horizon): trees round the edges, well clear of
    // the crater (~20 from the hill's centre) and out of the line from the vantage, grass and flowers everywhere else
    const trees = [['oak', -30, -30], ['fancy_oak', -16, -36], ['birch', 14, -34], ['oak', 30, -28], ['fancy_oak', 36, -10], ['oak', -36, -6],
      ['birch', -38, 14], ['oak', 38, 18], ['fancy_oak', -30, 30], ['birch', 32, 34], ['oak', -40, 40], ['birch', 40, 44]]
    for (const [f, dx, dz] of trees) await ctx.cmd(`/place feature minecraft:${f} ${x + dx} ${floor + 1} ${hz + dz}`, { mayFail: true })
    for (let dx = -40; dx <= 40; dx += 8) {
      for (let dz = HZ - 36; dz <= VZ + 10; dz += 8) {
        if (Math.hypot(dx, z + dz - hz) <= HR + 2) continue
        if (Math.abs(dx) <= 5 && Math.abs(z + dz - this.pz) <= 5) continue
        await ctx.cmd(`/place feature minecraft:patch_grass ${x + dx} ${floor + 1} ${z + dz}`, { mayFail: true })
        if ((dx + dz) % 16 === 0) await ctx.cmd(`/place feature minecraft:flower_plain ${x + dx + 3} ${floor + 1} ${z + dz + 3}`, { mayFail: true })
      }
    }
    // the wall itself (5 wide, 3 high, 5 deep: 75), after the grass so no patch lands on it
    await ctx.cmd(`/fill ${x - 2} ${floor + 1} ${this.pz - 2} ${x + 2} ${floor + 3} ${this.pz + 2} tnt`)
    await ctx.cmd('/kill @e[type=item]', { mayFail: true })
    await ctx.hotbar(['diamond_sword', 'flint_and_steel', ['tnt', 64], ['bread', 16]])
    await ctx.tpCheck(x + 0.5, floor + 1, this.pz + 7.5, 180, -6)
    await ctx.cmd('/effect give @s instant_health 1 10 true')
    await ctx.cmd('/gamerule fall_damage false', { mayFail: true })
    await ctx.cmd('/gamerule keep_inventory true', { mayFail: true })
    await ctx.cmd('/difficulty peaceful')   // peaceful: no TNT damage to the player 34+ blocks back (docs/lessons.md)
    await ctx.cmd('/gamemode survival')
    ctx.select(1)   // flint and steel from frame 1 (review: a TNT in the hand read as a stray 76th block)
    await bot.waitForTicks(20)
    return { x, y: floor, z: this.hz }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, floor, pz, hz, vz } = this
    const A = require('../lib/act')(ctx)
    // every explosion: the first is the wall ('boom'), the first one past the wall's back row is the hill ('hill')
    let boomed = false, hill = false, lastBoom = 0, booms = 0
    bot._client.on('explosion', (p) => {
      const c = p.center || p
      booms++; lastBoom = ctx.tick
      if (!boomed) { boomed = true; ctx.mark('boom') }
      if (!hill && c && c.z !== undefined && c.z < pz - 5) { hill = true; ctx.mark('hill') }
    })
    await bot.waitForTicks(4)
    // walk up to the wall, looking up at the hill and the house over it, then down to the block to light
    bot.setControlState('forward', true)
    const look = ctx.easeLook(0, 0.12, 700)
    for (let i = 0; i < 60 && bot.entity.position.z > pz + 5.6; i++) await bot.waitForTicks(1)
    bot.setControlState('forward', false)
    await look
    await bot.waitForTicks(2)
    await A.use(new Vec3(x, floor + 2, pz + 2))                // aimed by construction (lib/act.js): flint and steel on the TNT
    ctx.sound('item.flintandsteel.use', 1); ctx.sound('entity.tnt.primed', 1)
    ctx.mark('lit')
    const litAt = ctx.tick
    await bot.waitForTicks(10)                                  // the lit block flashes on screen
    await ctx.easeLook(0, 0.1, 400)                             // back up to the hill: the cut's edge on a still view
    await bot.waitForTicks(3)
    ctx.mark('fuse_a')
    // inside the cut: to the vantage, the same line of view as the opening (the before), ~1.4 s of fuse left
    await ctx.tpCheck(x + 0.5, floor + 1, vz + 0.5, 180, -4)
    while (ctx.tick - litAt < 52) await bot.waitForTicks(1)
    ctx.mark('fuse_b')
    // the last of the fuse: a slow drift so the view is never frozen
    for (let k = 0; k < 40 && !boomed; k++) {
      await bot.look(bot.entity.yaw + 0.0025, bot.entity.pitch, true)   // motion-ok: a slow drift (0.0025 rad a tick, 3 deg/s)
      await bot.waitForTicks(1)
    }
    // the chain: the wall, then the hill for seconds. The look rides up with the eruption and settles, slowly
    // (r:r38374d: on screen <= ~220 deg/s eased; these are ~20 deg over 1 s)
    await bot.waitForTicks(10)
    await ctx.easeLook(0.04, 0.22, 1200)
    await ctx.easeLook(-0.04, 0.12, 1400)
    // hold the view (slow drift) until the last blast has read (BLAST_TICKS 6, ~0.3 s) and no blast for 1 s
    // (bot.entities kept stale primed TNT for 24 s on take 1: the server's blasts are the truth)
    for (let k = 0; k < 400 && (booms < 50 || ctx.tick - lastBoom < 20); k++) {
      await bot.look(bot.entity.yaw - 0.0015, Math.max(0.05, bot.entity.pitch - 0.001), true)   // motion-ok: a slow drift
      await bot.waitForTicks(1)
    }
    ctx.log('booms', booms)
    ctx.mark('rim_a')
    // inside the cut: to the rim on the line in, already looking down into the crater (the after)
    await ctx.cmd('/kill @e[type=item]', { mayFail: true })
    // the crater's south rim: going out from the hill's centre, the first of 3 solid surface blocks in a row (a stray
    // flung-TNT pit near the vantage fooled a walk in from the vantage)
    const solid = (zz) => [floor, floor - 1].every(y => { const bl = bot.blockAt(new Vec3(x, y, zz)); return bl && bl.name !== 'air' && bl.boundingBox === 'block' })
    let rz = hz + HR + 8
    for (let zz = hz; zz < vz - 7; zz++) {
      if ([0, 1, 2, 3, 4, 5, 6].every(d => solid(zz + d))) { rz = zz + 4; break }
    }
    ctx.log('rim at', rz - hz, 'from the centre')
    // a tolerant teleport (tpCheck threw on take 2: a blast-loosened column): land on the rim, whatever its height
    await ctx.cmd(`/tp @s ${x + 0.5} ${floor + 1} ${rz + 0.5} 180 24`)
    await bot.waitForTicks(12)
    ctx.mark('rim_b')
    ctx.mark('crater')
    ctx.sound('entity.generic.explode', 0.15, 0.6)
    // one slow pan across the hole that comes to rest
    await ctx.easeLook(0.22, -0.36, 1100)
    await bot.waitForTicks(30)
    return boomed && hill && !ctx.died
  }
}
