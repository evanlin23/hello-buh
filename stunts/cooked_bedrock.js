// cooked #1, "mining through bedrock" (family cooked, lib/cooked.js; owner r:r5ee125, r:r12cb71).
// POV, deep in the deepslate: the player digs straight down through a diamond vein (a block every ~0.6 s, the diamonds
// picked up on the way), lands on bedrock ("bedrock??"), and mines it. It cracks like any block, and breaks: the
// player drops into the black under the world as the track goes silent. On the drop the chat floods with who joined.
// The set is built in code ~40 blocks down under real land; the bedrock is a fake floor with a dark pocket under it
// (the screen is black by then: the edit's still). Everything on screen is mining (lib/act.js, aimed, vanilla times
// for an Efficiency V netherite pickaxe); the bedrock's break is the one impossible thing, staged with a /setblock at
// the end of its dig.
// Local frame (lib/cooked.js): H.at(0, 0, 0) is the block the player starts standing in (feet), floor y -1.
const { makeStunt } = require('../lib/cooked')

const SHAFT = [-1, -2, -3, -4, -5]          // dug in order, straight down
const BEDROCK_Y = -6

async function build (ctx, H) {
  const c = (s, o) => H.cmd(s, o)
  await ctx.forceload({ x0: H.O.x - 8, z0: H.O.z - 8, x1: H.O.x + 8, z1: H.O.z + 8 })
  // the rock: deepslate with tuff and cobbled patches, y -26..4
  for (let y0 = -26; y0 <= 4; y0 += 8) await c(`/fill ${H.A(-6, y0, -6)} ${H.A(6, Math.min(4, y0 + 7), 6)} deepslate`)
  let seed = 11
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rnd() * 11) - 5, y = Math.floor(rnd() * 8) - 5, z = Math.floor(rnd() * 11) - 5
    await c(`/setblock ${H.A(x, y, z)} ${rnd() < 0.5 ? 'tuff' : 'cobbled_deepslate'}`)
  }
  // the bedrock floor (y -6) with the ragged top real bedrock has (some at -5), and the black pocket under it
  await c(`/fill ${H.A(-6, BEDROCK_Y, -6)} ${H.A(6, BEDROCK_Y, 6)} bedrock`)
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rnd() * 11) - 5, z = Math.floor(rnd() * 11) - 5
    if (Math.abs(x) <= 0 && Math.abs(z) <= 0) continue
    await c(`/setblock ${H.A(x, BEDROCK_Y + 1, z)} bedrock`)
  }
  await c(`/fill ${H.A(-3, -22, -3)} ${H.A(3, BEDROCK_Y - 1, 3)} air`)
  // the room the player starts in: 3x3, 3 high, lit by two torches
  await c(`/fill ${H.A(-1, 0, -1)} ${H.A(1, 2, 1)} air`)
  await c(`/setblock ${H.A(-1, 0, 1)} torch`)
  await c(`/setblock ${H.A(1, 0, -1)} torch`)
  await c(`/setblock ${H.A(-1, 2, -1)} light[level=11]`)
  // the vein: in the floor round the start, straight down the shaft, and in the shaft's walls
  for (const [x, y, z] of [[0, -1, 0], [1, -1, 0], [0, -1, -1], [-1, -1, 0], [0, -2, 0], [0, -3, 0], [1, -2, 0], [0, -2, 1], [-1, -3, 0], [0, -3, -1], [1, -4, 0], [-1, 0, -1]]) {
    await c(`/setblock ${H.A(x, y, z)} deepslate_diamond_ore`)
  }
  await c(`/setblock ${H.A(0, -4, 0)} deepslate`)
  await c(`/setblock ${H.A(0, -5, 0)} tuff`)
  for (const [x, y, z, o] of [[1, 1, 1, 'deepslate_redstone_ore'], [-1, 1, -1, 'deepslate_iron_ore'], [0, -4, 1, 'deepslate_redstone_ore'], [-1, -5, 0, 'deepslate_gold_ore'], [0, -5, -1, 'bedrock']]) {
    await c(`/setblock ${H.A(x, y, z)} ${o}`)
  }
}

module.exports = makeStunt({
  name: 'cooked_bedrock',
  caption: 'POV: you broke bedrock in survival',
  red: 'bedrock',
  subs: [['bedrock', 'bedrock??', 1.0], ['crack', "wait it's breaking", 1.3]],
  edit: { sfx: [['pop', 'go', { gain: 0.4 }]] },
  // who comes for you: the game's makers first, then everything bigger, the punchline last (kid-safe, no real person)
  joins: ['Notch', 'jeb_', 'Mojang', 'MojangLawyers', 'TheWarden', 'FBI', 'Pentagon', 'NASA', 'EnderDragon', 'YourMom'],
  hotbar: ['netherite_pickaxe[enchantments={efficiency:5}]', ['torch', 64], ['cobbled_deepslate', 64], ['bread', 23], 'water_bucket', ['ladder', 32], ['diamond', 3], 'shield', ['cookie', 64]],
  select: 0,
  start: [0.5, 0, 0.32, 0, 82],   // already looking down at the first ore (a little south of the eye, so the aim's yaw is defined: straight above it, the turn to it was 160 deg)
  build,

  async feat (ctx, H) {
    const { bot } = ctx
    const A = H.act
    const fallTo = async (y) => {
      for (let k = 0; k < 24; k++) {
        await bot.waitForTicks(1)
        if (bot.entity.onGround && bot.entity.position.y <= H.O.y + y + 0.01) return
      }
      throw new Error(`cooked_bedrock: never landed at ${y} (at ${bot.entity.position.y.toFixed(2)})`)
    }
    // vanilla: an Efficiency V netherite pickaxe mines at 9 + 26 = 35 (mineflayer rates it as no tool: 6.75 s a block)
    const effV = (b) => { const h = bot.registry.blocksByName[b.name].hardness; const dmg = 35 / h / 30; return dmg >= 1 ? 50 : Math.ceil(1 / dmg) * 50 }
    // 1. straight down through the vein
    for (const y of SHAFT) {
      const b = bot.blockAt(H.at(0, y, 0))
      await A.dig(b, { ms: effV(b) })
      await fallTo(y)
      // an invisible light block in the dug cell above the head: the shaft stays as lit as the room (the torches'
      // light dies off a level a block, and the bedrock and its cracks read black at the bottom)
      H.cmd(`/setblock ${H.A(0, y + 2, 0)} light[level=13]`, { mayFail: true })
      await bot.waitForTicks(8)   // a breath on each landing: three drops inside 1.5 s read as a glitch (owner check)
    }
    // 2. bedrock under the feet
    const bed = bot.blockAt(H.at(0, BEDROCK_Y, 0))
    if (!bed || bed.name !== 'bedrock') throw new Error(`cooked_bedrock: no bedrock under the feet (${bed && bed.name})`)
    ctx.mark('bedrock')
    await A.turnTo(H.at(0.5, BEDROCK_Y + 1, 0.5), { hold: 6 })
    // 3. mine it: it cracks like any block (the dig at an Efficiency V netherite pickaxe's pace for ~2 s), and at the
    //    end of the dig it breaks (the one staged thing: /setblock to air, the break's particles and sound)
    const BREAK = 2200
    ctx.mark('try')
    const p = bed.position
    const staged = (async () => {
      await bot.waitForTicks(Math.round(BREAK * 0.45 / 50)); ctx.mark('crack')
      await bot.waitForTicks(Math.round(BREAK * 0.55 / 50) - 2)
      const done = H.cmd(`/setblock ${p.x} ${p.y} ${p.z} air`)
      ctx.mark('dark')
      ctx.particles('block', p, { block: 'bedrock' })
      ctx.sound('block.stone.break', 1, 0.8)
      await done
    })()
    try { await A.dig(bed, { ms: BREAK }) } catch (e) { ctx.log('cooked_bedrock: bedrock dig', e.message) }
    await staged
    ctx.mark('dig_end', { ok: true })
    return true
  }
})
