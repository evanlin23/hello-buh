// "I gave the villager every job 💀" (~20 s). v3 (owner 2026-11-12 on v2: "too slow to start in the opening, also i dont
// understand the premise of this short"): one premise, read from the picture and the caption in the first second and
// every step after on one watch.
//   0.0 s  the villager, big and centred, alone on his spot; the first job site slams down beside him and his robe
//          turns librarian on the spot ("job 1/13: librarian"): something happens from frame 0 (r:r0f3da0)
//   jobs 2-13 go down around him, faster and faster, the outfit changing with each one (the counter in the caption)
//   then all 13 at once: the outfit flickers through every job; the rest of the village behind him: 0 jobs
//   "now FIRE him": I put ONE TNT down in front of him and light it... the TNT hidden under all 13 job sites goes off
//          with it: fired from 13 jobs at once (and the ring kills him: vanilla, a villager point-blank in a TNT ring).
// v2 had a hire/fire/hire/fire act first (it fought the title: "every job", then fired?), a pen round him, the camera
// 6 blocks back (his robe a speck), and the TNT in the ground visible from frame 0 (a reveal spoiled and a question
// nobody asked). The pen and the first act are gone, the camera is 5 blocks back, the TNT is under the grass.
// Profession changes are by command at the moment of placement (the AI would take seconds to path to the job site);
// placing, lighting and the blasts are real survival actions. The crowd keeps resistance (well back, by command).
const JOBS = [
  ['lectern', 'librarian'], ['composter', 'farmer'], ['barrel', 'fisherman'], ['blast_furnace', 'armorer'],
  ['smoker', 'butcher'], ['cartography_table', 'cartographer'], ['brewing_stand', 'cleric'],
  ['fletching_table', 'fletcher'], ['grindstone', 'weaponsmith'], ['loom', 'shepherd'],
  ['smithing_table', 'toolsmith'], ['cauldron', 'leatherworker'], ['stonecutter', 'mason']
]
const { plateau } = require('../lib/plateau')
const { plainsBiome } = require('../lib/story')
const DIST = 5          // player to villager (blocks, north): close enough that his robe reads on a phone
const STONEY = /furnace|smoker|brewing|grindstone|cauldron|stonecutter/

// the 13 job sites: a horseshoe open toward the camera, none in front of him (a block there hid his robe). Back row
// first (each spot's top face is in sight when its block goes down: lib/act.js aims at it and throws if not). At
// 5 blocks back every spot is within ~31 deg of him: he stays in frame while each one goes down.
// The first one goes right behind him (an ~8 deg turn: the first robe changes 0.3 s in; v3's first take turned 45 deg).
// Then one side, then the other (back to front in each column), so the view sweeps once instead of swinging side to
// side on every job (two view jerks in the first take).
const SPOTS = [[-1, -2], [1, -2], [2, -2], [3, -2], [3, -1], [2, -1], [2, 0], [-2, -2], [-3, -2], [-3, -1], [-2, -1], [-3, 0], [-2, 0]]
const N = JOBS.length
const jobSub = (i) => `job ${i + 1}/${N}: ${JOBS[i][1]}`

module.exports = {
  name: 'villager_fired',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'I gave the villager every job 💀',
  edit: {
    caption: 'I gave the villager every job 💀', red: 'every', dropAt: 'all_jobs',
    // frame 0: the crosshair landing on job 1's spot (right behind him), the lectern down and his robe changing 0.3 s in
    // (r:r0f3da0)
    startAt: 'job:-0.3', endAfter: 'gone:0.65',   // r:r188b46: 0.65 s after his death reads
    subs: [
      ...JOBS.map((j, i) => ['job', jobSub(i), i < 3 ? 0.9 : i < 8 ? 0.6 : 0.45, i]),
      ['all_jobs', 'ALL 13 AT ONCE', 1.6, 0],
      ['crowd', 'the rest of the village: 0 jobs', 1.4, 0],
      ['tnt', 'now FIRE him', 1.2, 0],
      ['lit', 'from all 13 jobs', 1.6, 0],
      ['ring_boom', 'FIRED from 13 jobs at once', 1.5, 0],
      ['gone', 'permanently', 1.5, 0]   // (the subtitle font has no emoji: it drew a box)
    ],
    speed: [['fuse_a', 'fuse_b', 'cut'], ['all_jobs:0.3', 'faster', 1.4]],
    // a pop on frame 0; on the payoff ('gone': his death puff ends as the ring's last blasts go off; pace's payoff, the
    // endAfter event) a flash, punch, song dip + impact (a number for the ring's last blast changed with every take)
    flash: [['mob_death', 0, 0.6], ['gone', 0, 0.9]], punch: [['gone', 0, 1.3]],
    sfx: [['pop', 'job', { gain: 0.9 }], ['dip', 'gone', 0.4], ['gamedip', 'gone', 0.35], ['impact', 'gone', { gain: 1.3 }]]
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
    // a plateau (dug down to the start point, the field's cut wall stood behind him) with deep dirt for the crater,
    // and one biome so the grass is one colour
    const floor = await plateau(ctx, { x0: x - 30, x1: x + 30, z0: vz - 30, z1: z + 24, above: 24, below: 14 })
    Object.assign(this, { x, z, floor })
    await plainsBiome(ctx, (dx, dy, dz) => `${x + dx} ${floor + dy} ${z - 3 + dz}`, 30, -8, 16)
    await ctx.cmd('/kill @e[type=!player]')
    // NoAI: once the first blast hit, he walked off his pillar into the crater before the ring went. His head still
    // turns to the camera through the face_on mark.
    await ctx.cmd(`/summon villager ${x + 0.5} ${floor + 1} ${vz + 0.5} {VillagerData:{profession:"minecraft:none",type:"minecraft:plains",level:1},Rotation:[0f,0f],PersistenceRequired:1b,NoAI:1b,Tags:["hb_worker"]}`)
    // the crowd: unemployed villagers behind him, watching, with a gap straight behind him (he blended into them)
    const DX = [-8, -6, -4, 4, 6, 8]
    for (let i = 0; i < DX.length; i++) {
      const cxp = x + DX[i], czp = vz - 5 - (i % 2)
      await ctx.cmd(`/summon villager ${cxp + 0.5} ${floor + 1} ${czp + 0.5} {VillagerData:{profession:"minecraft:none",type:"minecraft:plains",level:1},Rotation:[0f,0f],PersistenceRequired:1b,NoAI:1b}`)
    }
    // nobody dies early and nobody flies: resistance V and no explosion knockback for every villager; his resistance
    // ends as my TNT goes (perform), so the ring itself kills him
    await ctx.cmd('/effect give @e[type=villager] resistance infinite 4 true')
    await ctx.cmd('/execute as @e[type=villager] run attribute @s minecraft:explosion_knockback_resistance base set 1')
    await ctx.cmd('/execute as @e[type=villager] run attribute @s minecraft:knockback_resistance base set 1')
    this.spots = SPOTS.map(([dx, dz]) => [x + dx, vz + dz])
    // the TNT, hidden: one under the grass of every job site, and a chain under the grass from in front of him to the
    // front spots (my one TNT goes down on top of it). Nothing red shows until it goes off.
    for (const [sx, sz] of this.spots) await ctx.cmd(`/setblock ${sx} ${floor - 1} ${sz} tnt`)
    for (const [dx, dz] of [[0, 1], [0, 2], [-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]]) await ctx.cmd(`/setblock ${x + dx} ${floor - 1} ${vz + dz} tnt`)
    // he stands on blast-proof obsidian (under the grass): after the blast he's left alone on a pillar in the crater
    await ctx.cmd(`/fill ${x} ${floor - 10} ${vz} ${x} ${floor - 1} ${vz} obsidian`)
    // and a small blast-proof pad deep under the player's spot (a crater under the player is fall damage on camera)
    await ctx.cmd(`/fill ${x - 1} ${floor - 3} ${z - 1} ${x + 1} ${floor - 2} ${z + 5} obsidian`)
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 9')
    await ctx.hotbar(JOBS.slice(0, 9).map(j => j[0]))
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, 15)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await ctx.easeLookAt(new ctx.Vec3(x + 0.5, floor + 2.6, vz + 0.5), 50)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, floor, vz } = this
    const sel = `@e[type=villager,limit=1,sort=nearest,x=${x + 0.5},y=${floor + 1},z=${vz + 0.5}]`
    const setJob = (p) => bot.chat(`/data merge entity ${sel} {VillagerData:{profession:"minecraft:${p}"},Xp:${p === 'none' ? 0 : 1}}`)
    const head = new Vec3(x + 0.5, floor + 2.6, vz + 0.5)   // a little above his head: the subtitles sit there, he sits under them
    const vpos = { x: x + 0.5, y: floor + 2.0, z: vz + 0.5 }
    ctx.mark('face_on', { near: [x + 0.5, vz - 2, 10.5], head: true })
    const A = require('../lib/act')(ctx)
    const place = async (i) => {
      const [bx, bz] = this.spots[i]
      ctx.select(i % 9)
      ctx.mark(`aim${i}`)
      // aimed by construction (lib/act.js, r:rffba12): the crosshair on the spot as the job site goes down
      await A.place(new Vec3(bx, floor + 1, bz), { reach: 10, against: new Vec3(bx, floor, bz), sound: STONEY.test(JOBS[i][0]) ? 'block.stone.place' : 'block.wood.place' })
      await bot.waitForTicks(1)
      setJob(JOBS[i][1])
      ctx.sound(`entity.villager.work_${JOBS[i][1]}`, 1, 1)
      ctx.particles('happy', vpos, { count: 8 })
    }
    // ---- every job, one by one, faster and faster ----
    for (let i = 0; i < N; i++) {
      if (i === 9) {   // refill the hotbar for the last four (their slots are used up)
        for (let k = 9; k < N; k++) bot.chat(`/item replace entity @s hotbar.${k - 9} with ${JOBS[k][0]} 1`)
        await bot.waitForTicks(2)
      }
      await place(i)
      ctx.mark('job', { n: i, job: JOBS[i][1] })
      // the first three: a look at him so the new robe reads (the eyes on the spot keep him in frame after)
      if (i < 3) await A.turnTo(head.offset(this.spots[i][0] < x ? -0.4 : 0.4, 0, 0), { tol: 0.03, max: 20 })
      await bot.waitForTicks(i < 3 ? 6 : i < 8 ? 3 : 1)
    }
    // all 13 at once: the outfit cycles faster and faster
    await A.turnTo(head.offset(0, 0.2, 0), { tol: 0.03, max: 20 })   // governed (an eased 250 ms look jerked at 169 deg/s)
    ctx.mark('all_jobs')
    let gap = 5, ft = 0
    for (let k = 0; k < 40; k++) {
      setJob(JOBS[k % N][1])
      if (k % 2 === 0) ctx.particles('happy', vpos, { count: 3 })
      if (k % 3 === 0) ctx.sound(`entity.villager.work_${JOBS[k % N][1]}`, 0.7, 1 + k / 40)
      // the camera never stops: each tick eases a little toward a slowly swinging point above him
      for (let w = 0; w < (k < 20 ? Math.max(2, Math.round(gap)) : 1); w++) {   // every tick only from FASTER on
        ft++
        const gp0 = head.offset(Math.sin(ft / 9) * 0.6, Math.cos(ft / 13) * 0.2, 0)
        const e = bot.entity.position.offset(0, 1.62, 0), dd = gp0.minus(e)
        const gy = Math.atan2(-dd.x, -dd.z), gp = Math.atan2(dd.y, Math.hypot(dd.x, dd.z))
        let dy = gy - bot.entity.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
        await bot.look(bot.entity.yaw + dy * 0.25, bot.entity.pitch + (gp - bot.entity.pitch) * 0.25, true)   // motion-ok: a quarter of the way a tick, under the whip cap (v2's)
        await bot.waitForTicks(1)
      }
      gap *= 0.9
      if (k === 20) ctx.mark('faster')
    }
    setJob('mason')
    // meanwhile, the crowd behind him: still unemployed, all staring
    await ctx.easeLookAt(new Vec3(x - 6, floor + 3.6, vz - 5), 400)   // aimed above the crowd: they sit under the subtitle
    ctx.mark('crowd')
    await ctx.easeLookAt(new Vec3(x + 6, floor + 3.6, vz - 5), 1100)
    // ---- now FIRE him: one TNT in front of him, in plain sight ----
    bot.chat('/item replace entity @s hotbar.0 with tnt 1')
    bot.chat('/item replace entity @s hotbar.1 with flint_and_steel 1')
    await bot.waitForTicks(2)
    ctx.select(0)
    const T = new Vec3(x, floor + 1, vz + 2)
    await A.aimAt(new Vec3(x + 0.5, floor + 1.0, vz + 2.5))
    ctx.mark('tnt')
    await A.place(T, { reach: 10, against: new Vec3(x, floor, vz + 2), sound: 'block.grass.place' })
    await bot.waitForTicks(4)
    ctx.select(1); await bot.waitForTicks(4)
    await A.use(T, { reach: 10, sound: 'item.flintandsteel.use' }); ctx.sound('entity.tnt.primed', 1)
    ctx.mark('lit')
    const litAt = ctx.tick
    // a short step back, the eyes on him and the lit TNT
    bot.setControlState('back', true); await bot.waitForTicks(14); bot.setControlState('back', false)
    await ctx.easeLookAt(head.offset(0, 0.4, 0), 300)
    await ctx.easeLookAt(head.offset(0.3, 0.45, 0), 400)
    ctx.mark('fuse_a')
    while (ctx.tick - litAt < 62) await bot.waitForTicks(1)
    await ctx.easeLookAt(head.offset(0, 0.4, 0), 100)
    ctx.mark('fuse_b')
    let booms = 0
    bot._client.on('explosion', () => { ctx.mark('blast', { n: booms }); booms++ })
    for (let k = 0; k < 40 && booms === 0; k++) await bot.waitForTicks(1)
    // my TNT went: his resistance ends (the crowd keeps theirs), and the ring catches him point-blank
    bot.chat('/effect clear @e[type=villager,tag=hb_worker] resistance')
    for (let k = 0; k < 60 && booms < 4; k++) await bot.waitForTicks(1)
    ctx.mark('ring_boom')
    const alive = () => Object.values(bot.entities).some(e => e.name === 'villager' && Math.abs(e.position.x - (x + 0.5)) < 1.5 && Math.abs(e.position.z - (vz + 0.5)) < 1.5)
    // the wide on his pillar while the ring goes off and his death puff plays (r:r24d99a), the eyes drifting
    let gone = false, last = booms, lastAt = ctx.tick
    for (let k = 0; k < 80; k++) {
      if (k % 12 === 0) ctx.easeLookAt(head.offset([0.4, -0.3, 0.5, -0.4][(k / 12) % 4], [0.5, 0.6, 0.45, 0.6][(k / 12) % 4], 0), 550)
      if (booms > last) { last = booms; lastAt = ctx.tick }
      if (!gone && !alive()) { gone = true; ctx.mark('gone') }
      if (gone && k > 40 && ctx.tick - lastAt > 10) break
      await bot.waitForTicks(1)
    }
    if (!gone) ctx.log('he survived the ring')
    await ctx.easeLookAt(head.offset(0.9, 0.6, 0), 1200)   // a real drift to the end (any hold read as a pause)
    return booms >= 4 && !ctx.died && gone
  }
}
