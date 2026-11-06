// "why are they all staring at me 💀": a crowd of villagers stands in a field with their backs to
// the player. The bot walks up... and every head snaps round at once, then follows the bot as it
// sidesteps and backs away. The tracking is a repeating command block running
// `tp @s ~ ~ ~ facing entity <bot> eyes` on every (NoAI) villager, sent by the bot every tick from the turn on.
const ROWS = 5, COLS = 7

module.exports = {
  name: 'staring_villagers',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'why are they all staring at me 💀',
  edit: { caption: 'why are they all staring at me 💀', red: 'staring', song: 'songs/funk_abnormal.mp3', dropAt: 'turn', start: 0.5 },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd(`/fill ${x - 14} ${floor + 1} ${z - 16} ${x + 14} ${floor + 14} ${z + 16} air`)
    await ctx.cmd(`/fill ${x - 14} ${floor} ${z - 16} ${x + 14} ${floor} ${z + 16} grass_block`)
    await ctx.cmd(`/fill ${x - 14} ${floor - 3} ${z - 16} ${x + 14} ${floor - 1} ${z + 16} dirt`)
    await ctx.cmd('/kill @e[type=villager]')
    const profs = ['librarian', 'farmer', 'cleric', 'armorer', 'fletcher', 'toolsmith', 'weaponsmith', 'cartographer', 'butcher', 'shepherd', 'mason', 'fisherman', 'nitwit', 'none']
    const types = ['plains', 'plains', 'plains', 'taiga', 'desert', 'savanna', 'snow']
    let k = 0
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const vx = x - (COLS - 1) + c * 2 + (r % 2) * 0.6, vz = z - 4 - r * 2 + ((c * 7 + r * 3) % 3) * 0.3
        const p = profs[(k * 5 + 3) % profs.length], t = types[(k * 3 + 1) % types.length]
        await ctx.cmd(`/summon villager ${vx.toFixed(2)} ${floor + 1} ${vz.toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Rotation:[180f,0f],VillagerData:{profession:"minecraft:${p}",type:"minecraft:${t}",level:2},Xp:1}`)
        k++
      }
    }
    await ctx.hotbar(['diamond_sword', ['emerald', 32], ['bread', 16], ['oak_log', 64]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 9.5, 180, -8)
    await ctx.cmd('/gamemode survival')
    ctx.select(1)
    await bot.waitForTicks(30)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot } = ctx
    await bot.waitForTicks(10)
    // walk up behind them
    bot.setControlState('forward', true)
    while (bot.entity.position.z > this.z - 0.8) await bot.waitForTicks(1)   // ~3 blocks behind the front row
    bot.setControlState('forward', false)
    await bot.waitForTicks(12)
    // they all turn round at once and keep tracking: the bot runs the tp-facing command itself every
    // tick (a command block took seconds to start ticking; ops aren't chat-rate-limited)
    const track = () => bot.chat(`/execute as @e[type=villager] at @s run tp @s ~ ~ ~ facing entity ${bot.username} eyes`)
    bot.on('physicsTick', track)
    this.untrack = () => bot.removeListener('physicsTick', track)
    ctx.mark('turn'); ctx.mark('face_on')     // the renderer turns them on this tick (mineflayer's entity yaw lags the tp by seconds)
    for (let i = 0; i < 4; i++) ctx.sound('entity.villager.ambient', 0.8, 0.8 + i * 0.12)
    await bot.waitForTicks(26)
    // sidestep left, right: every head follows
    bot.setControlState('left', true); await bot.waitForTicks(22); bot.setControlState('left', false)
    await bot.waitForTicks(8)
    bot.setControlState('right', true); await bot.waitForTicks(40); bot.setControlState('right', false)
    await bot.waitForTicks(8)
    ctx.sound('entity.villager.no', 1)
    // back away slowly
    bot.setControlState('back', true); await bot.waitForTicks(30); bot.setControlState('back', false)
    await bot.waitForTicks(20)
    this.untrack(); ctx.mark('face_off')
    return true
  }
}
