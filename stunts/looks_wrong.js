// "Bro this looks wrong?" build reveal (format from research: SunuCellyClipss 8.9M views, 6 s).
// The bot builds pixel art on a wall block by block, in an order that looks odd until the last
// blocks land: the black features go up first (floating dots and a line), then the yellow fills
// in from the outside and it turns out to be a smiley. Real survival placements, 10 blocks/s.
const ART = (process.env.ART || [
  '..YYYYY..',
  '.YYYYYYY.',
  'YYBYYYBYY',
  'YYBYYYBYY',
  'YYYYYYYYY',
  'YBYYYYYBY',
  'YYBBBBBYY',
  '.YYYYYYY.',
  '..YYYYY..'
].join('/')).split('/')
const PALETTE = { Y: 'yellow_wool', B: 'black_wool' }
const DIST = 7          // blocks between the player and the art
const WALL = 'stone_bricks'

module.exports = {
  name: 'looks_wrong',
  biome: process.env.BIOME || 'minecraft:forest',
  caption: 'Bro this looks wrong?',

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land near spawn')
    const { x, z } = g, floor = g.y
    const H = ART.length, Wd = ART[0].length
    const zw = z - DIST - 1           // wall plane (north of the player); art sits at zw + 1
    this.x = x; this.z = z; this.floor = floor; this.zw = zw
    await ctx.defaultRules()
    // small flat clearing: from behind the wall to behind the player
    const x0 = x - 8, x1 = x + 8, z0 = zw - 2, z1 = z + 3
    await ctx.cmd(`/fill ${x0} ${floor - 2} ${z0} ${x1} ${floor - 1} ${z1} dirt`)
    await ctx.cmd(`/fill ${x0} ${floor} ${z0} ${x1} ${floor} ${z1} grass_block`)
    await ctx.cmd(`/fill ${x0} ${floor + 1} ${z0} ${x1} ${floor + 16} ${z1} air`)
    // the wall, 2 wider and taller than the art
    const base = floor + 1
    await ctx.cmd(`/fill ${x - (Wd >> 1) - 1} ${base} ${zw} ${x + (Wd >> 1) + 1} ${base + H + 1} ${zw} ${WALL}`)
    this.base = base + 1                              // bottom row of the art
    await ctx.cmd('/attribute @s minecraft:block_interaction_range base set 10')
    await ctx.hotbar([['yellow_wool', 64], ['black_wool', 64], 'diamond_pickaxe', ['torch', 16], ['bread', 12]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 180, 0)   // vanilla yaw 180 = facing north
    await ctx.cmd('/gamemode survival')
    ctx.select(1)
    // look at the middle of the art
    await ctx.easeLookAt(new ctx.Vec3(x + 0.5, this.base + H / 2, zw + 1), 50)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const H = ART.length, Wd = ART[0].length
    const cells = []
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < Wd; c++) {
        const ch = ART[r][c]
        if (!PALETTE[ch]) continue
        const p = new Vec3(this.x - (Wd >> 1) + c, this.base + (H - 1 - r), this.zw + 1)
        // outer cells first (distance from the centre, largest first), features before fill
        const ring = Math.max(Math.abs(c - (Wd >> 1)), Math.abs(r - (H >> 1)))
        cells.push({ p, ch, ring })
      }
    }
    const black = cells.filter(c => c.ch === 'B').sort((a, b) => a.p.y - b.p.y || a.p.x - b.p.x).reverse()
    const fill = cells.filter(c => c.ch !== 'B').sort((a, b) => b.ring - a.ring || (b.p.y - a.p.y) || (a.p.x - b.p.x))
    await bot.waitForTicks(10)
    let placed = 0
    // The camera follows a smoothed aim point that trails the block being placed (like a player
    // sweeping across the wall), instead of snapping onto every block.
    const center = new Vec3(this.x + 0.5, this.base + H / 2, this.zw + 1)
    let aim = center.clone()
    const lookToward = async (target, ticks) => {
      for (let i = 0; i < ticks; i++) {
        aim = aim.plus(target.minus(aim).scaled(0.25))
        const eye = bot.entity.position.offset(0, 1.62, 0), d = aim.minus(eye)
        await bot.look(Math.atan2(-d.x, -d.z), Math.atan2(d.y, Math.hypot(d.x, d.z)), true)
        await bot.waitForTicks(1)
      }
    }
    for (const [group, slot] of [[black, 1], [fill, 0]]) {
      ctx.select(slot)
      await bot.waitForTicks(3)
      for (const cell of group) {
        const ref = bot.blockAt(cell.p.offset(0, 0, -1))             // the wall block behind it
        await lookToward(cell.p.offset(0.5, 0.5, 0), 1)
        bot._client.write('block_place', {
          hand: 0, location: ref.position, direction: 3,              // face 3 = south (+z)
          cursorX: 0.5, cursorY: 0.5, cursorZ: 1, insideBlock: false, worldBorderHit: false, sequence: 0
        })
        bot.swingArm()
        ctx.sound(`block.wool.place`, 1.0, 0.8)
        await lookToward(cell.p.offset(0.5, 0.5, 0), 1)
        placed++
      }
    }
    await bot.waitForTicks(6)
    // check the result
    let ok = 0
    for (const cell of cells) { const b = bot.blockAt(cell.p); if (b && b.name === PALETTE[cell.ch]) ok++ }
    ctx.log(`placed ${placed}, correct ${ok}/${cells.length}`)
    // hold on the finished face, slight drift back to centre
    await lookToward(center, 16)
    await bot.waitForTicks(10)
    return ok === cells.length
  }
}
