// "POV: THE VILLAGER IS UNEMPLOYED 💀" (format from research: ZyroVaneWasTaken, 827K views at
// 821 subs). An unemployed villager in a fence pen; the player keeps placing and breaking a
// lectern in front of it: hired, fired, hired... ending employed. The villager has AI, so it
// turns its head to watch the player. Its profession is switched by command at the moment the
// lectern is placed/broken (the game would do the same after a few seconds of AI pathing).
const DIST = 4

module.exports = {
  name: 'villager_job',
  biome: process.env.BIOME || 'minecraft:forest',
  caption: 'POV: THE VILLAGER IS UNEMPLOYED 💀',
  // edit.py settings for this format (song files are owner-supplied, in songs/)
  edit: { caption: 'POV: THE VILLAGER IS UNEMPLOYED 💀', colors: 'pov=red,villager=green', song: 'songs/payphone.mp3', dropAt: 'hired', start: 0.75, endAfter: 'rehired:1.3' },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land near spawn')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    const vz = z - DIST - 1                     // villager pen (north of the player)
    this.vz = vz
    await ctx.cmd(`/fill ${x - 7} ${floor - 2} ${vz - 4} ${x + 7} ${floor - 1} ${z + 3} dirt`)
    await ctx.cmd(`/fill ${x - 7} ${floor} ${vz - 4} ${x + 7} ${floor} ${z + 3} grass_block`)
    await ctx.cmd(`/fill ${x - 7} ${floor + 1} ${vz - 4} ${x + 7} ${floor + 10} ${z + 3} air`)
    // 1x1 fence pen around the villager
    await ctx.cmd(`/fill ${x - 1} ${floor + 1} ${vz - 1} ${x + 1} ${floor + 1} ${vz + 1} oak_fence`)
    await ctx.cmd(`/setblock ${x} ${floor + 1} ${vz} air`)
    await ctx.cmd('/kill @e[type=villager]')
    await ctx.cmd(`/summon villager ${x + 0.5} ${floor + 1} ${vz + 0.5} {VillagerData:{profession:"minecraft:none",type:"minecraft:plains",level:1},Rotation:[0f,0f],PersistenceRequired:1b}`)
    this.lectern = new ctx.Vec3(x + 2, floor + 1, vz)        // beside the pen: in front, its slanted top hid the villager's outfit (frame review)
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 8')
    await ctx.hotbar([['lectern', 16], 'diamond_axe', ['bookshelf', 16], ['bread', 12]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, 15)
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await ctx.easeLookAt(new ctx.Vec3(x + 0.5, floor + 1.6, vz + 0.5), 50)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const L = this.lectern
    const villagerSel = '@e[type=villager,limit=1,sort=nearest]'
    // (Xp > 0 keeps the job: an unclaimed level-1 villager with no XP reverts to none next tick)
    const setJob = (p) => ctx.cmd(`/data merge entity ${villagerSel} {VillagerData:{profession:"minecraft:${p}"},Xp:${p === 'none' ? 0 : 1}}`)
    const lookV = () => ctx.easeLookAt(new Vec3(this.x + 0.5, this.floor + 1.5, this.vz + 0.5), 350)
    const place = async () => {
      ctx.select(0); await bot.waitForTicks(2)
      await ctx.easeLookAt(L.offset(0.5, 0.4, 0.5), 350)
      bot._client.write('block_place', { hand: 0, location: L.offset(0, -1, 0), direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm(); ctx.sound('block.wood.place', 1, 0.8)
      await bot.waitForTicks(4)
      await setJob('librarian'); ctx.sound('entity.villager.work_librarian', 1, 1)
      ctx.particles('happy', { x: this.x + 0.5, y: this.floor + 2.0, z: this.vz + 0.5 }, { count: 8 })
      if (!this.hiredOnce) { this.hiredOnce = true; ctx.mark('hired') }
    }
    const breakIt = async () => {
      ctx.select(1); await bot.waitForTicks(2)
      await ctx.easeLookAt(L.offset(0.5, 0.6, 0.5), 200)
      const b = bot.blockAt(L)
      if (b && b.name === 'lectern') { try { await bot.dig(b, true) } catch (e) { ctx.log('dig', e.message) } }
      ctx.sound('block.wood.break', 1, 0.8); ctx.particles('block', L, { block: 'lectern' })
      await setJob('none'); ctx.sound('entity.villager.no', 1, 1)
      ctx.particles('angry', { x: this.x + 0.5, y: this.floor + 2.5, z: this.vz + 0.5 }, { count: 4 })
    }
    // the villager watches the player (LookAtPlayerGoal: the head follows the eyes)
    ctx.mark('face_on', { near: [this.x + 0.5, this.vz + 0.5, 1.5], head: true })
    await bot.waitForTicks(16)
    // one cycle: hired -> fired -> rehired (QA round 2: a second break/re-place looked looped)
    await place(); await lookV(); await bot.waitForTicks(12)
    await breakIt(); await lookV(); await bot.waitForTicks(12)
    await place(); ctx.mark('rehired'); await lookV()
    ctx.sound('entity.villager.yes', 1, 1)
    await bot.waitForTicks(24)
    const v = bot.nearestEntity(e => e.name === 'villager')
    return !!v
  }
}
