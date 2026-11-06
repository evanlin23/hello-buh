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
const DIST = 7          // player to villager (blocks, north)
const STONEY = /furnace|smoker|brewing|grindstone|cauldron|stonecutter/

module.exports = {
  name: 'villager_fired',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'I gave the villager every job 💀',
  edit: {
    caption: 'I gave the villager every job 💀', red: 'every', song: 'songs/payphone.mp3', dropAt: 'all_jobs',
    startAt: 'beat:-0.05', endAfter: 'nitwit:1.0',
    subs: [
      ['hire', 'job 1: librarian', 1.6, 0], ['fire', 'fired', 1.2, 0],
      ['hire', 'job 2: farmer', 1.4, 1], ['fire', 'fired again', 1.2, 1],
      ['hire', 'job 3: fisherman', 1.2, 2], ['fire', 'FIRED AGAIN', 1.2, 2],
      ['every', 'fine. EVERY job', 1.6, 0],
      ['job', 'job 4: armorer', 1.1, 3], ['job', 'job 5: butcher', 1.0, 4], ['job', 'job 6: cartographer', 1.0, 5],
      ['job', 'job 7: cleric', 0.9, 6], ['job', 'job 8: fletcher', 0.9, 7], ['job', 'jobs 9, 10, 11...', 1.4, 8], ['job', '13 JOBS', 1.4, 12],
      ['all_jobs', 'all 13 at once', 2.8, 0],
      ['crowd', 'the rest of the village: 0 jobs', 1.9, 0],
      ['tnt', 'one problem...', 1.6, 0],
      ['lit', 'he is about to get FIRED', 2.2, 0],
      ['fired_all', 'fired from 13 jobs at once', 1.5, 0],
      ['nitwit', 'now he is unemployable', 2.0, 0]
    ],
    speed: [['fuse_a', 'fuse_b', 'cut']]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    Object.assign(this, { x, z, floor })
    await ctx.defaultRules()
    await ctx.cmd('/difficulty peaceful')
    await ctx.cmd('/gamerule tnt_explosion_drop_decay true')
    const vz = z - DIST
    this.vz = vz
    for (let y0 = floor + 1; y0 <= floor + 12; y0 += 6) await ctx.cmd(`/fill ${x - 16} ${y0} ${vz - 16} ${x + 16} ${y0 + 5} ${z + 10} air`)
    await ctx.cmd(`/fill ${x - 16} ${floor - 8} ${vz - 16} ${x + 16} ${floor - 1} ${z + 10} dirt`)
    await ctx.cmd(`/fill ${x - 16} ${floor} ${vz - 16} ${x + 16} ${floor} ${z + 10} grass_block`)
    await ctx.cmd(`/fill ${x - 1} ${floor + 1} ${vz - 1} ${x + 1} ${floor + 1} ${vz + 1} oak_fence`)
    await ctx.cmd(`/setblock ${x} ${floor + 1} ${vz} air`)
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd(`/summon villager ${x + 0.5} ${floor + 1} ${vz + 0.5} {VillagerData:{profession:"minecraft:none",type:"minecraft:plains",level:1},Rotation:[0f,0f],PersistenceRequired:1b}`)
    // the crowd: unemployed villagers behind the pen, watching
    this.crowd = []
    for (let i = 0; i < 7; i++) {
      const cxp = x - 6 + i * 2, czp = vz - 5 - (i % 2)
      await ctx.cmd(`/summon villager ${cxp + 0.5} ${floor + 1} ${czp + 0.5} {VillagerData:{profession:"minecraft:none",type:"minecraft:plains",level:1},Rotation:[0f,0f],PersistenceRequired:1b,NoAI:1b}`)
    }
    // nobody dies and nobody flies: resistance V and no explosion knockback for every villager
    await ctx.cmd('/effect give @e[type=villager] resistance infinite 4 true')
    await ctx.cmd('/execute as @e[type=villager] run attribute @s minecraft:explosion_knockback_resistance base set 1')
    await ctx.cmd('/execute as @e[type=villager] run attribute @s minecraft:knockback_resistance base set 1')
    // job site spots: the row in front of the pen and both sides (13), front centre first
    const spots = []
    for (let dx = -2; dx <= 2; dx++) spots.push([x + dx, vz + 2])
    for (let dz = 1; dz >= -2; dz--) { spots.push([x - 2, vz + dz]); spots.push([x + 2, vz + dz]) }
    this.spots = [2, 1, 3, 0, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => spots[i])
    // TNT in the ground under every spot, and a 3-block fuse line toward the player
    for (const [sx, sz] of this.spots) await ctx.cmd(`/setblock ${sx} ${floor} ${sz} tnt`)
    for (let k = 3; k <= 5; k++) await ctx.cmd(`/setblock ${x} ${floor} ${vz + k} tnt`)
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
    const head = new Vec3(x + 0.5, floor + 1.7, vz + 0.5)
    const vpos = { x: x + 0.5, y: floor + 2.0, z: vz + 0.5 }
    ctx.mark('face_on', { near: [x + 0.5, vz - 2, 8.5], head: true })
    const slotOf = (i) => (i < 8 ? i : i - 8)
    const place = async (i, lookMs, spot) => {
      const [bx, bz] = spot || this.spots[i]
      ctx.select(slotOf(i))
      await ctx.easeLookAt(new Vec3(bx + 0.5, floor + 1.2, bz + 0.5), lookMs)
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
    ctx.mark('beat')
    // ---- act 1: hired, fired, hired, fired ----
    for (let i = 0; i < 3; i++) {
      await place(i, i === 0 ? 120 : 220, this.spots[0])
      ctx.mark('hire', { job: JOBS[i][1] })
      await ctx.easeLookAt(head, 300); await bot.waitForTicks([16, 11, 6][i])
      await breakAt(this.spots[0], JOBS[i][0])
      ctx.mark('fire')
      ctx.particles('angry', { x: x + 0.5, y: floor + 2.5, z: vz + 0.5 }, { count: 3 + i * 2 })
      await ctx.easeLookAt(head.offset([0.3, -0.3, 0][i], i === 2 ? 0.25 : 0, 0), 300); await bot.waitForTicks([12, 8, 10][i])
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
      if (i >= 2 && i < 8) { await ctx.easeLookAt(head.offset((i & 1) ? 0.25 : -0.25, 0, 0), 280); await bot.waitForTicks(12 - i) }
      if (i === 12) await bot.waitForTicks(4)
    }
    // all 13 at once: the outfit cycles faster and faster
    await ctx.easeLookAt(head.offset(0, -0.2, 0), 250)
    ctx.mark('all_jobs')
    let gap = 5
    for (let k = 0; k < 46; k++) {
      setJob(JOBS[k % 13][1])
      if (k % 2 === 0) ctx.particles('happy', vpos, { count: 3 })
      if (k % 3 === 0) ctx.sound(`entity.villager.work_${JOBS[k % 13][1]}`, 0.7, 1 + k / 46)
      await bot.waitForTicks(Math.max(1, Math.round(gap)))
      gap *= 0.9
      if (k % 6 === 3) ctx.easeLookAt(head.offset((k % 12 < 6 ? 0.35 : -0.35), -0.2, 0), 200)
    }
    setJob('mason')
    // meanwhile, the crowd behind him: still unemployed, all staring
    await ctx.easeLookAt(new Vec3(x - 3, floor + 1.7, vz - 5), 400)
    ctx.mark('crowd')
    await ctx.easeLookAt(new Vec3(x + 5, floor + 1.7, vz - 5), 1500)
    // ---- act 3: the TNT under the job sites ----
    await ctx.easeLookAt(new Vec3(x - 1.5, floor + 0.9, vz + 2.5), 400)    // down at the base of the front row
    ctx.mark('tnt')
    await ctx.easeLookAt(new Vec3(x + 1.5, floor + 0.9, vz + 2.5), 500)
    await ctx.easeLookAt(new Vec3(x + 0.5, floor + 0.9, vz + 4.5), 400)    // ...and the fuse line
    bot.chat('/item replace entity @s hotbar.5 with flint_and_steel 1')
    await bot.waitForTicks(2)
    ctx.select(5); await bot.waitForTicks(6)
    const L = [x, floor, vz + 5]
    await ctx.easeLookAt(new Vec3(L[0] + 0.5, L[1] + 1, L[2] + 0.5), 200)
    bot._client.write('block_place', { hand: 0, location: { x: L[0], y: L[1], z: L[2] }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
    bot.swingArm(); ctx.sound('item.flintandsteel.use', 1); ctx.sound('entity.tnt.primed', 1)
    ctx.mark('lit')
    const litAt = ctx.tick
    // back off facing it, the villager in view
    bot.setControlState('back', true)
    await ctx.easeLookAt(head.offset(0, -0.5, 0), 400)
    await bot.waitForTicks(8)
    ctx.mark('fuse_a')
    for (let k = 0; k < 14; k++) { await bot.waitForTicks(1); if (k === 10) bot.setControlState('back', false) }
    bot.setControlState('back', false)
    while (ctx.tick - litAt < 40) await bot.waitForTicks(1)
    await ctx.easeLookAt(head.offset(0, -0.6, 0), 100)
    ctx.mark('fuse_b')
    // the fuse line goes, then the ring: FIRED
    let booms = 0
    bot._client.on('explosion', () => { booms++ })
    for (let k = 0; k < 80 && booms === 0; k++) {
      if (k % 10 === 0) ctx.easeLookAt(head.offset([-0.6, 0.5, -0.2, 0.7][(k / 10) % 4], [-0.4, -0.7, -0.3, -0.6][(k / 10) % 4], 0), 450)
      await bot.waitForTicks(1)
    }
    // wait for the ring itself to go (the 4th blast on), then he's unemployed
    for (let k = 0; k < 60 && booms < 4; k++) await bot.waitForTicks(1)
    ctx.mark('ring_boom')
    await bot.waitForTicks(4)
    setJob('none'); ctx.sound('entity.villager.no', 1, 0.9)
    ctx.mark('fired_all')
    const v = Object.values(bot.entities).find(e => e.name === 'villager' && Math.abs(e.position.x - (x + 0.5)) < 3 && Math.abs(e.position.z - (vz + 0.5)) < 3)
    await ctx.easeLookAt(v ? v.position.offset(0, 1.5, 0) : head.offset(0, -1.5, 0), 400)
    ctx.easeLookAt(v ? v.position.offset(0.4, 1.4, 0) : head.offset(0.4, -1.5, 0), 900)
    await bot.waitForTicks(22)
    // ...and he gives up on work for good: nitwit
    setJob('nitwit'); ctx.sound('entity.villager.no', 1, 0.7)
    ctx.particles('angry', { x: v ? v.position.x : x + 0.5, y: (v ? v.position.y : floor) + 2.3, z: v ? v.position.z : vz + 0.5 }, { count: 4 })
    ctx.mark('nitwit')
    ctx.easeLookAt(v ? v.position.offset(-0.3, 1.5, 0) : head, 900)
    await bot.waitForTicks(24)
    return booms >= 4 && !ctx.died && !!v
  }
}
