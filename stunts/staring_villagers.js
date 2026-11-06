// "why are they all staring at me 💀": a trading hall, two rows of villagers in cells; the bot
// walks down the aisle and every villager turns its head to follow (vanilla LookAtPlayerGoal).
const N = Number(process.env.CELLS || 6)

module.exports = {
  name: 'staring_villagers',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'why are they all staring at me 💀',
  edit: { caption: 'why are they all staring at me 💀', song: 'songs/funk_abnormal.mp3', dropAt: 'turn', start: 0.5 },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    const L = N * 2 + 4
    await ctx.cmd(`/fill ${x - 6} ${floor - 1} ${z - L} ${x + 6} ${floor} ${z + 4} stone_bricks`)
    await ctx.cmd(`/fill ${x - 6} ${floor + 1} ${z - L} ${x + 6} ${floor + 8} ${z + 4} air`)
    // hall: spruce walls/roof, aisle 3 wide down the middle (x-1..x+1), cells at x-3 and x+3
    await ctx.cmd(`/fill ${x - 5} ${floor + 1} ${z - L + 1} ${x + 5} ${floor + 4} ${z + 2} spruce_planks hollow`)
    await ctx.cmd(`/fill ${x - 1} ${floor + 1} ${z + 2} ${x + 1} ${floor + 2} ${z + 2} air`)            // entrance
    await ctx.cmd(`/fill ${x - 4} ${floor + 1} ${z - L + 2} ${x + 4} ${floor + 3} ${z + 1} air`)
    await ctx.cmd('/kill @e[type=villager]')
    const profs = ['librarian', 'farmer', 'cleric', 'armorer', 'fletcher', 'toolsmith', 'weaponsmith', 'cartographer', 'butcher', 'shepherd', 'mason', 'fisherman']
    for (let i = 0; i < N; i++) {
      const cz = z - 1 - i * 2
      for (const [side, cx] of [[0, x - 3], [1, x + 3]]) {
        // 1x1 cell: walls between cells, glass toward the aisle
        await ctx.cmd(`/fill ${cx - 1} ${floor + 1} ${cz - 1} ${cx + 1} ${floor + 2} ${cz + 1} spruce_planks`)
        await ctx.cmd(`/setblock ${cx} ${floor + 1} ${cz} air`); await ctx.cmd(`/setblock ${cx} ${floor + 2} ${cz} air`)
        const gx = side ? cx - 1 : cx + 1
        await ctx.cmd(`/setblock ${gx} ${floor + 2} ${cz} glass_pane`)
        await ctx.cmd(`/setblock ${gx} ${floor + 1} ${cz} spruce_trapdoor`)
        const p = profs[(i * 2 + side) % profs.length]
        await ctx.cmd(`/summon villager ${cx + 0.5} ${floor + 1} ${cz + 0.5} {VillagerData:{profession:"minecraft:${p}",type:"minecraft:plains",level:2},Xp:1,PersistenceRequired:1b,Rotation:[${side ? 90 : -90}f,0f]}`)
      }
    }
    // lanterns along the aisle
    for (let i = 0; i < N; i += 2) await ctx.cmd(`/setblock ${x} ${floor + 4} ${z - 1 - i * 2} lantern[hanging=true]`)
    this.L = L
    await ctx.hotbar(['diamond_sword', ['emerald', 32], ['bread', 16]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 4.5, 180, 0)
    await ctx.cmd('/gamemode survival')
    ctx.select(1)
    await bot.waitForTicks(30)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    await bot.waitForTicks(10)
    // walk slowly down the aisle, glancing left and right
    bot.setControlState('sneak', true); bot.setControlState('forward', true)
    const end = this.z - this.L + 4
    let glance = 0
    while (bot.entity.position.z > end + 0.5) {
      glance++
      const yaw = 0 + Math.sin(glance / 14) * 0.7
      await bot.look(yaw, -0.05, true)
      await bot.waitForTicks(1)
      if (glance > 400) break
    }
    bot.setControlState('forward', false); bot.setControlState('sneak', false)
    await bot.waitForTicks(6)
    ctx.mark('turn')
    await ctx.easeLook(Math.PI, -0.05, 700)                 // turn around: they're all still staring
    await bot.waitForTicks(30)
    return true
  }
}
