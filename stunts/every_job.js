// "I gave a villager every job at once 💀" (docs/ideas.md #14, ~18 s): a villager in a 1x1 pen,
// a crowd of unemployed villagers watching. The bot places all 13 job site blocks around the pen
// by hand, faster and faster, and the villager's outfit changes with each one. With all 13 down
// he flickers through every job at once, faster and faster... and quits: a nitwit.
// Profession changes are by command at the moment of placement (the AI would take seconds to
// path to each job site); placements are real survival block placements.
const JOBS = [
  ['lectern', 'librarian'], ['composter', 'farmer'], ['barrel', 'fisherman'], ['blast_furnace', 'armorer'],
  ['smoker', 'butcher'], ['cartography_table', 'cartographer'], ['brewing_stand', 'cleric'],
  ['fletching_table', 'fletcher'], ['grindstone', 'weaponsmith'], ['loom', 'shepherd'],
  ['smithing_table', 'toolsmith'], ['cauldron', 'leatherworker'], ['stonecutter', 'mason']
]
const DIST = 5

module.exports = {
  name: 'every_job',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'I gave a villager every job at once 💀',
  edit: {
    caption: 'I gave a villager every job at once 💀', red: 'every', song: 'songs/payphone.mp3', dropAt: 'all_jobs',
    startAt: 'beat:-0.1', endAfter: 'quit:1.2',
    subs: [['job', 'job 1: librarian', 1.3, 0], ['job', 'job 2: farmer', 1.0, 1], ['job', 'job 3: fisherman', 0.9, 2],
      ['job', 'jobs 4-13', 2.5, 3], ['all_jobs', 'all 13 at once', 3.0, 0], ['quit', 'he quit', 2.0, 0]]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z, y: floor } = g
    Object.assign(this, { x, z, floor })
    await ctx.defaultRules()
    const vz = z - DIST
    this.vz = vz
    await ctx.cmd(`/fill ${x - 12} ${floor + 1} ${vz - 12} ${x + 12} ${floor + 10} ${z + 4} air`)
    await ctx.cmd(`/fill ${x - 12} ${floor} ${vz - 12} ${x + 12} ${floor} ${z + 4} grass_block`)
    await ctx.cmd(`/fill ${x - 12} ${floor - 3} ${vz - 12} ${x + 12} ${floor - 1} ${z + 4} dirt`)
    await ctx.cmd(`/fill ${x - 1} ${floor + 1} ${vz - 1} ${x + 1} ${floor + 1} ${vz + 1} oak_fence`)
    await ctx.cmd(`/setblock ${x} ${floor + 1} ${vz} air`)
    await ctx.cmd('/kill @e[type=villager]')
    await ctx.cmd(`/summon villager ${x + 0.5} ${floor + 1} ${vz + 0.5} {VillagerData:{profession:"minecraft:none",type:"minecraft:plains",level:1},Rotation:[0f,0f],PersistenceRequired:1b,NoAI:0b}`)
    // the crowd: unemployed villagers behind the pen, in fenced spots so they stay put
    this.crowd = []
    for (let i = 0; i < 7; i++) {
      const cxp = x - 6 + i * 2, czp = vz - 4 - (i % 2)
      await ctx.cmd(`/summon villager ${cxp + 0.5} ${floor + 1} ${czp + 0.5} {VillagerData:{profession:"minecraft:none",type:"minecraft:plains",level:1},Rotation:[0f,0f],PersistenceRequired:1b,NoAI:1b}`)
      this.crowd.push([cxp + 0.5, czp + 0.5])
    }
    // job site spots: the row in front of the pen and both sides (13 spots)
    const spots = []
    for (let dx = -2; dx <= 2; dx++) spots.push([x + dx, vz + 2])
    for (let dz = 1; dz >= -2; dz--) { spots.push([x - 2, vz + dz]); spots.push([x + 2, vz + dz]) }
    // order: front centre first, then outward, then the sides
    const order = [2, 1, 3, 0, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    this.spots = order.map(i => spots[i])
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 9')
    await ctx.hotbar(JOBS.slice(0, 9).map(j => [j[0], 1]))
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
    const sel = '@e[type=villager,limit=1,sort=nearest,x=' + (x + 0.5) + ',y=' + (floor + 1) + ',z=' + (vz + 0.5) + ']'
    const setJob = (p) => bot.chat(`/data merge entity ${sel} {VillagerData:{profession:"minecraft:${p}"},Xp:${p === 'none' || p === 'nitwit' ? 0 : 1}}`)
    const head = new Vec3(x + 0.5, floor + 1.7, vz + 0.5)
    ctx.mark('face_on', { near: [x + 0.5, vz - 2, 7.5], head: true })   // the villager and the crowd (one window: marks don't stack)
    const place = async (i, lookMs) => {
      const [bx, bz] = this.spots[i]
      const slot = i < 9 ? i : i - 9
      if (i === 9) {
        // hotbar refill for the last four (their slots were used up)
        for (let k = 9; k < 13; k++) bot.chat(`/item replace entity @s hotbar.${k - 9} with ${JOBS[k][0]} 1`)
        await bot.waitForTicks(2)
      }
      ctx.select(slot)
      await ctx.easeLookAt(new Vec3(bx + 0.5, floor + 1.2, bz + 0.5), lookMs)
      bot._client.write('block_place', { hand: 0, location: { x: bx, y: floor, z: bz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound(/barrel|table|composter|loom|lectern/.test(JOBS[i][0]) ? 'block.wood.place' : 'block.stone.place', 1, 0.8)
      await bot.waitForTicks(1)
      setJob(JOBS[i][1])
      ctx.sound(`entity.villager.work_${JOBS[i][1]}`, 1, 1)
      ctx.particles('happy', { x: x + 0.5, y: floor + 2.0, z: vz + 0.5 }, { count: 6 })
      ctx.mark('job', { n: i, job: JOBS[i][1] })
    }
    ctx.mark('beat')
    // the first three, each one looked at
    for (let i = 0; i < 3; i++) {
      await place(i, i === 0 ? 150 : 250)
      await ctx.easeLookAt(head, 250)
      await bot.waitForTicks(i === 0 ? 8 : 4)
    }
    // the other ten, faster and faster
    for (let i = 3; i < 13; i++) await place(i, Math.max(90, 220 - (i - 3) * 15))
    // all 13 at once: the outfit cycles faster and faster
    await ctx.easeLookAt(head.offset(0, -0.2, 0), 300)
    ctx.mark('all_jobs')
    let gap = 5
    for (let k = 0; k < 30; k++) {
      setJob(JOBS[k % 13][1])
      if (k % 2 === 0) ctx.particles('happy', { x: x + 0.5, y: floor + 2.0, z: vz + 0.5 }, { count: 3 })
      if (k % 3 === 0) ctx.sound(`entity.villager.work_${JOBS[k % 13][1]}`, 0.7, 1 + k / 30)
      await bot.waitForTicks(Math.max(1, Math.round(gap)))
      gap *= 0.88
      if (k % 6 === 3) ctx.easeLookAt(head.offset((k % 12 < 6 ? 0.3 : -0.3), -0.2, 0), 200)
    }
    // ...he quits
    setJob('nitwit')
    ctx.mark('quit')
    ctx.sound('entity.villager.no', 1, 1)
    ctx.particles('angry', { x: x + 0.5, y: floor + 2.5, z: vz + 0.5 }, { count: 5 })
    await ctx.easeLookAt(head.offset(0, 0.1, 0), 300)
    await ctx.easeLookAt(head.offset(-0.6, 0.2, 0), 900)
    await bot.waitForTicks(6)
    const v = bot.nearestEntity(e => e.name === 'villager')
    return !!v && !ctx.died
  }
}
