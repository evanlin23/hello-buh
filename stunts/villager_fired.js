// "I gave the villager every job 💀" (~30 s): a villager in a 1x1 pen, a crowd of unemployed
// villagers behind him, and (if you look closely) a ring of TNT in the ground around the pen.
// Act 1: hired, fired (break the lectern), hired, fired (the composter). Act 2: "fine, EVERY job":
// all 13 job sites go down around him, faster and faster, the outfit changing with each one, then
// all 13 at once (the outfit flickers through every job). Act 3: the TNT under the job sites.
// Flint and steel on the fuse line... he gets FIRED from all 13 jobs at once (and keeps his life:
// resistance, no knockback; the crowd too).
// Profession changes are by command at the moment of placement/break (the AI would take seconds
// to path to the job site); placing, breaking and lighting are real survival actions.
const JOBS = [
  ['lectern', 'librarian'], ['composter', 'farmer'], ['barrel', 'fisherman'], ['blast_furnace', 'armorer'],
  ['smoker', 'butcher'], ['cartography_table', 'cartographer'], ['brewing_stand', 'cleric'],
  ['fletching_table', 'fletcher'], ['grindstone', 'weaponsmith'], ['loom', 'shepherd'],
  ['smithing_table', 'toolsmith'], ['cauldron', 'leatherworker'], ['stonecutter', 'mason']
]
const { plateau } = require('../lib/plateau')
const { plainsBiome } = require('../lib/story')
const DIST = 6          // player to villager (blocks, north)
const STONEY = /furnace|smoker|brewing|grindstone|cauldron|stonecutter/

module.exports = {
  name: 'villager_fired',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'I gave the villager every job 💀',
  edit: {
    caption: 'I gave the villager every job 💀', red: 'every', song: 'songs/payphone.mp3', dropAt: 'all_jobs',
    startAt: 'beat:-0.05', endAfter: 'nitwit:1.4',
    subs: [
      ['hire', 'job 1: librarian', 1.6, 0], ['fire', 'fired', 1.2, 0],
      ['hire', 'job 2: farmer', 1.4, 1], ['fire', 'fired again', 1.2, 1],
      ['hire', 'job 3: fisherman', 1.2, 2], ['fire', 'FIRED AGAIN', 1.2, 2],
      ['every', 'fine. EVERY job', 1.6, 0],
      ['job', 'job 4: armorer', 1.1, 3], ['job', 'job 5: butcher', 1.0, 4], ['job', 'job 6: cartographer', 1.0, 5],
      ['job', 'job 7: cleric', 0.9, 6], ['job', 'job 8: fletcher', 0.9, 7], ['job', 'jobs 9, 10, 11...', 1.4, 8], ['job', '13 JOBS', 1.4, 12],
      ['all_jobs', 'all 13 at once', 2.8, 0],
      ['faster', 'FASTER', 1.2, 0],
      ['crowd', 'the rest of the village: 0 jobs', 2.2, 0],
      ['tnt', 'one problem...', 1.6, 0],
      ['lit', 'he is about to get FIRED', 2.2, 0],
      ['fired_all', 'fired from 13 jobs at once', 1.5, 0],
      ['nitwit', 'now he is unemployable', 2.0, 0]
    ],
    speed: [['fuse_a', 'fuse_b', 'cut'], ['close_a', 'close_b', 'cut']]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g
    await ctx.defaultRules()
    await ctx.cmd('/difficulty peaceful')
    await ctx.cmd('/gamerule tnt_explosion_drop_decay true')
    const vz = z - DIST
    this.vz = vz
    // a plateau (dug down to the start point, the field's cut wall stood behind the pen) with deep
    // dirt for the crater, and one biome so the grass is one colour
    const floor = await plateau(ctx, { x0: x - 30, x1: x + 30, z0: vz - 30, z1: z + 24, above: 24, below: 14 })
    Object.assign(this, { x, z, floor })
    await plainsBiome(ctx, (dx, dy, dz) => `${x + dx} ${floor + dy} ${z - 3 + dz}`, 30, -8, 16)
    await ctx.cmd(`/fill ${x - 1} ${floor + 1} ${vz - 1} ${x + 1} ${floor + 1} ${vz + 1} oak_fence`)
    await ctx.cmd(`/setblock ${x} ${floor + 1} ${vz} air`)
    await ctx.cmd('/kill @e[type=!player]')
    // NoAI: once the fuse line's first blast broke his fence he walked off his pillar into the crater
    // before the ring went (and /data then hit a crowd villager). His head still turns to the camera
    // through the face_on mark.
    await ctx.cmd(`/summon villager ${x + 0.5} ${floor + 1} ${vz + 0.5} {VillagerData:{profession:"minecraft:none",type:"minecraft:plains",level:1},Rotation:[0f,0f],PersistenceRequired:1b,NoAI:1b}`)
    // the crowd: unemployed villagers behind the pen, watching
    this.crowd = []
    // two groups with a gap straight behind him: in the last shot he stood against the crowd and
    // blended into it; with the gap he's alone on his pillar against the sky
    const DX = [-8, -6, -4, 4, 6, 8]
    for (let i = 0; i < DX.length; i++) {
      const cxp = x + DX[i], czp = vz - 5 - (i % 2)
      await ctx.cmd(`/summon villager ${cxp + 0.5} ${floor + 1} ${czp + 0.5} {VillagerData:{profession:"minecraft:none",type:"minecraft:plains",level:1},Rotation:[0f,0f],PersistenceRequired:1b,NoAI:1b}`)
    }
    // nobody dies and nobody flies: resistance V and no explosion knockback for every villager
    await ctx.cmd('/effect give @e[type=villager] resistance infinite 4 true')
    await ctx.cmd('/execute as @e[type=villager] run attribute @s minecraft:explosion_knockback_resistance base set 1')
    await ctx.cmd('/execute as @e[type=villager] run attribute @s minecraft:knockback_resistance base set 1')
    // job site spots (13): both sides, the front corners and the back row
    const spots = []
    // (none in the middle of the front row: there they hid his outfit from the camera)
    for (const dz of [1, 2, 0, -1, -2]) { spots.push([x + 2, vz + dz]); spots.push([x - 2, vz + dz]) }
    for (const dx of [-1, 0, 1]) spots.push([x + dx, vz - 2])
    this.spots = spots
    // TNT in the ground under every spot, and a 3-block fuse line toward the player
    for (const [sx, sz] of this.spots) await ctx.cmd(`/setblock ${sx} ${floor} ${sz} tnt`)
    for (let k = 2; k <= 4; k++) await ctx.cmd(`/setblock ${x} ${floor} ${vz + k} tnt`)
    // he stands on blast-proof obsidian: after the blast he's left alone on a pillar in the crater
    await ctx.cmd(`/fill ${x} ${floor - 10} ${vz} ${x} ${floor} ${vz} obsidian`)
    // and a small blast-proof pad deep under the player's spot: the ring's crater dropped the player
    // 4 blocks (fall damage on camera). 2 blocks down, a drop is at most 2 (no damage); kept small
    // and deep (a wide shallow pad was stripped bare and showed as a sharp obsidian slab)
    await ctx.cmd(`/fill ${x - 1} ${floor - 3} ${z - 1} ${x + 1} ${floor - 2} ${z + 5} obsidian`)
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 9')
    await ctx.hotbar([['lectern', 2], ['composter', 2], ['barrel', 2], ['blast_furnace', 1], ['smoker', 1],
      ['cartography_table', 1], ['brewing_stand', 1], ['fletching_table', 1], 'diamond_axe'])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, 15)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await ctx.easeLookAt(new ctx.Vec3(x + 0.5, floor + 1.6, vz + 0.5), 50)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, floor, vz } = this
    const sel = `@e[type=villager,limit=1,sort=nearest,x=${x + 0.5},y=${floor + 1},z=${vz + 0.5}]`
    const setJob = (p) => bot.chat(`/data merge entity ${sel} {VillagerData:{profession:"minecraft:${p}"},Xp:${p === 'none' || p === 'nitwit' ? 0 : 1}}`)
    const head = new Vec3(x + 0.5, floor + 3.0, vz + 0.5)    // aimed above him: the subtitles sit at his head otherwise
    const vpos = { x: x + 0.5, y: floor + 2.0, z: vz + 0.5 }
    ctx.mark('face_on', { near: [x + 0.5, vz - 2, 10.5], head: true })
    const slotOf = (i) => (i < 8 ? i : i - 8)
    const place = async (i, lookMs, spot) => {
      const [bx, bz] = spot || this.spots[i]
      ctx.select(slotOf(i))
      await ctx.easeLookAt(new Vec3(bx + 0.5, floor + (i >= 8 ? 2.8 : 1.2), bz + 0.5), lookMs)   // the fast ones aimed high: the subtitle clears his outfit
      bot._client.write('block_place', { hand: 0, location: { x: bx, y: floor, z: bz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound(STONEY.test(JOBS[i][0]) ? 'block.stone.place' : 'block.wood.place', 1, 0.8)
      await bot.waitForTicks(1)
      setJob(JOBS[i][1])
      ctx.sound(`entity.villager.work_${JOBS[i][1]}`, 1, 1)
      ctx.particles('happy', vpos, { count: 6 })
    }
    const breakAt = async ([bx, bz], name) => {
      ctx.select(8); await bot.waitForTicks(2)
      await ctx.easeLookAt(new Vec3(bx + 0.5, floor + 1.5, bz + 0.5), 200)
      const b = bot.blockAt(new Vec3(bx, floor + 1, bz))
      if (b && b.name === name) { try { await bot.dig(b, true) } catch (e) { ctx.log('dig', e.message) } }
      setJob('none'); ctx.sound('entity.villager.no', 1, 1)
    }
    // a hold that still moves: a slow drift of the look, never a frozen frame
    const drift = async (ticks) => { await ctx.easeLook(bot.entity.yaw + (Math.random() < 0.5 ? 0.07 : -0.07), bot.entity.pitch + 0.03, Math.max(50, ticks * 50)) }
    ctx.mark('beat')
    // ---- act 1: hired, fired, hired, fired ----
    for (let i = 0; i < 3; i++) {
      await place(i, i === 0 ? 120 : 220, this.spots[0])
      ctx.mark('hire', { job: JOBS[i][1] })
      await ctx.easeLookAt(head, 300); await drift([16, 11, 6][i])
      await breakAt(this.spots[0], JOBS[i][0])
      ctx.mark('fire')
      ctx.particles('angry', { x: x + 0.5, y: floor + 2.5, z: vz + 0.5 }, { count: 3 + i * 2 })
      await ctx.easeLookAt(head.offset([0.3, -0.3, 0][i], i === 2 ? 0.25 : 0, 0), 300); await drift([12, 8, 10][i])
    }
    // ---- act 2: every job, faster and faster ----
    ctx.mark('every')
    await ctx.easeLook(bot.entity.yaw + 0.35, 0.1, 350)          // a look round: right, fine
    await ctx.easeLookAt(head, 300)
    for (let i = 0; i < 13; i++) {
      if (i === 8) {   // refill the hotbar for the last five (their slots are used up)
        for (let k = 8; k < 13; k++) bot.chat(`/item replace entity @s hotbar.${k - 8} with ${JOBS[k][0]} 1`)
        await bot.waitForTicks(2)
      }
      await place(i, i < 7 ? 260 : Math.max(90, 240 - (i - 7) * 30))
      ctx.mark('job', { n: i, job: JOBS[i][1] })
      if (i >= 2 && i < 8) { await ctx.easeLookAt(head.offset((i & 1) ? 0.25 : -0.25, 0, 0), 280); await drift(12 - i) }
      if (i === 12) await drift(4)
    }
    // all 13 at once: the outfit cycles faster and faster
    await ctx.easeLookAt(head.offset(0, -0.2, 0), 250)
    ctx.mark('all_jobs')
    let gap = 5, ft = 0
    for (let k = 0; k < 46; k++) {
      setJob(JOBS[k % 13][1])
      if (k % 2 === 0) ctx.particles('happy', vpos, { count: 3 })
      if (k % 3 === 0) ctx.sound(`entity.villager.work_${JOBS[k % 13][1]}`, 0.7, 1 + k / 46)
      // the camera never stops: each tick eases a little toward a slowly swinging point above him
      for (let w = 0; w < (k < 22 ? Math.max(2, Math.round(gap)) : 1); w++) {   // every tick only from FASTER on
        ft++
        const g = head.offset(Math.sin(ft / 9) * 0.7, 0.3 + Math.cos(ft / 13) * 0.2, 0)
        const e = bot.entity.position.offset(0, 1.62, 0), dd = g.minus(e)
        const gy = Math.atan2(-dd.x, -dd.z), gp = Math.atan2(dd.y, Math.hypot(dd.x, dd.z))
        let dy = gy - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        await bot.look(bot.entity.yaw + dy * 0.25, bot.entity.pitch + (gp - bot.entity.pitch) * 0.25, true)
        await bot.waitForTicks(1)
      }
      gap *= 0.9
      if (k === 22) ctx.mark('faster')
      if (bot.entity.position.z < vz + 5.6) bot.setControlState('forward', false)
    }
    setJob('mason')
    // meanwhile, the crowd behind him: still unemployed, all staring
    await ctx.easeLookAt(new Vec3(x - 7, floor + 3.8, vz - 5), 400)   // aimed above the crowd: they sit under the subtitle
    ctx.mark('crowd')
    await ctx.easeLookAt(new Vec3(x + 7, floor + 3.8, vz - 5), 1800)
    // ---- act 3: the TNT under the job sites ----
    await ctx.easeLookAt(new Vec3(x - 1.5, floor + 0.9, vz + 2.5), 400)    // down at the base of the front row
    ctx.mark('tnt')
    await ctx.easeLookAt(new Vec3(x + 1.5, floor + 0.9, vz + 2.5), 800)
    await ctx.easeLookAt(new Vec3(x + 0.5, floor + 0.9, vz + 3.5), 400)    // ...and the fuse line
    bot.chat('/item replace entity @s hotbar.5 with flint_and_steel 1')
    await bot.waitForTicks(2)
    ctx.select(5); await bot.waitForTicks(6)
    const L = [x, floor, vz + 4]
    await ctx.easeLookAt(new Vec3(L[0] + 0.5, L[1] + 1, L[2] + 0.5), 200)
    bot._client.write('block_place', { hand: 0, location: { x: L[0], y: L[1], z: L[2] }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
    bot.swingArm(); ctx.sound('item.flintandsteel.use', 1); ctx.sound('entity.tnt.primed', 1)
    ctx.mark('lit')
    const litAt = ctx.tick
    // back off facing it, the villager in view
    // a single short step back (it used to walk back ~19 ticks: a wide shot with FIRED on his head)
    // (a step and a half: from nearer, the fuse line's crater opened under the player)
    bot.setControlState('back', true); await bot.waitForTicks(14); bot.setControlState('back', false)   // ~3 blocks: the whole fuse line clears the HUD
    await ctx.easeLookAt(head.offset(0, 1.1, 0), 300)          // aimed above him: under the subtitle, pen and fuse still in view
    await ctx.easeLookAt(head.offset(0.3, 1.15, 0), 400)       // still drifting into the cut
    ctx.mark('fuse_a')
    for (let k = 0; k < 18; k++) { await bot.waitForTicks(1); if (k === 3) bot.setControlState('back', false) }
    bot.setControlState('back', false)
    while (ctx.tick - litAt < 40) await bot.waitForTicks(1)
    await ctx.easeLookAt(head.offset(0, 1.1, 0), 100)
    ctx.mark('fuse_b')
    // the fuse line goes, then the ring: FIRED
    let booms = 0
    bot._client.on('explosion', () => { booms++ })
    // glances while it burns, eyes on him (no walking: the player stays well back on the rim)
    for (let k = 0; k < 80 && booms === 0; k++) {
      if (k % 10 === 0) ctx.easeLookAt(head.offset([-0.5, 0.5, -0.2, 0.6][(k / 10) % 4], [1.1, 0.95, 1.2, 1.0][(k / 10) % 4], 0), 450)   // aimed above him: he sits under the subtitle
      await bot.waitForTicks(1)
    }
    // wait for the ring itself to go (the 4th blast on), then he's unemployed
    for (let k = 0; k < 60 && booms < 4; k++) await bot.waitForTicks(1)
    ctx.mark('ring_boom')
    await bot.waitForTicks(10)
    // cut to the crater's near rim: him close and big, in the lower half, clear of the subtitles
    ctx.mark('close_a')
    const solid = (zz) => { const bb = bot.blockAt(new Vec3(x, floor, zz)); return bb && bb.name !== 'air' }
    let rz = vz + 3
    while (rz < vz + 12 && !(solid(rz) && solid(rz + 1))) rz++
    await ctx.tpCheck(x + 0.5, floor + 1, rz + 0.5, 180, 20)
    const d = rz + 0.5 - (vz + 0.5)
    const top = new Vec3(x + 0.5, floor + 2.95 + d * 0.09, vz + 0.5)    // his head ~0.09 rad under the centre
    await ctx.easeLookAt(top.offset(0, -0.4, 0), 100)                  // inside the cut (after it, it was a visible whip)
    await bot.waitForTicks(2)
    ctx.mark('close_b')
    setJob('none'); ctx.sound('entity.villager.no', 1, 0.9)
    ctx.mark('fired_all')
    const v = Object.values(bot.entities).find(e => e.name === 'villager' && Math.abs(e.position.x - (x + 0.5)) < 3 && Math.abs(e.position.z - (vz + 0.5)) < 3)
    // a slow look down his pillar and back up
    await ctx.easeLookAt(top.offset(0.3, -0.6, 0), 600)   // a small dip (a big one pushed him up into the subtitle)
    await ctx.easeLookAt(top.offset(-0.2, 0, 0), 600)
    // ...and he gives up on work for good: nitwit
    setJob('nitwit'); ctx.sound('entity.villager.no', 1, 0.7)
    ctx.particles('angry', { x: x + 0.5, y: floor + 3.3, z: vz + 0.5 }, { count: 4 })
    ctx.mark('nitwit')
    await ctx.easeLookAt(top.offset(0.9, 0.25, 0), 1500)        // straight into a real drift to the end (any hold read as a pause)
    return booms >= 4 && !ctx.died && !!v
  }
}
