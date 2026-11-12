// "POV: you hear tssss 💀" (~7 s): strip-mining in a deepslate tunnel at y -55. Frame 0 looks back down the tunnel at a
// creeper walking up out of the dark (r:r0f3da0: the subject in view); I turn back to the rock face and keep mining. The
// hiss when it starts to swell, I spin round to see it right there... and it goes off. The twist (no-op audit 2026-11-12,
// owner r:r4607fa): I live (netherite, Blast Protection on two pieces: the armour bar is drawn, two hearts go and stay
// gone, regen off), and the blast has torn the tunnel wall open onto a vein of deepslate diamond ore: the creeper mined
// it for me. Vanilla-plausible: diamonds generate at this depth as deepslate diamond ore, and creepers do open caves.
// (The surface version's diamonds in dirt 2 blocks down couldn't exist, and its walk back was padding: review.)
// A real mob with its own AI, a real blast; the cave is carved into a solid deepslate box (no stray caves, water or lava
// can get in), lit by torches, the ore set behind the tunnel walls before the take.
const Y = -55   // the tunnel floor's top: I stand at Y
module.exports = {
  name: 'creeper',
  brightness: 1,   // Options > Brightness: Bright (a torch-lit tunnel reads near-black on the default)
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'POV: you hear tssss 💀',
  edit: {
    caption: 'POV: you hear tssss 💀', red: 'tssss', dropAt: 'found', startAt: 'first:0', endAfter: 'found:0.9',
    armor: 20,   // the netherite's armour bar over the hearts (why I live)
    subs: [['found', 'wait... DIAMONDS?', 1.0]], subsY: 0.12,
    zoom: [['found:-0.4', 'found:0.9', 1.3]],   // a held push-in on the vein
    flash: [['found', 0, 0.3]],   // pace: a clear picture change on the payoff (the eased push-in isn't one)
    sfx: [['heart', 'first', { gain: 1.6 }], ['dip', 'hiss', 0.25], ['dip', 'boom', 0.4], ['impact', 'boom', { gain: 1.4 }],
      ['dip', 'found', 0.5], ['gamedip', 'found', 0.4], ['impact', 'found', { gain: 1.6 }], ['ding', 'found', { gain: 1.4 }]]
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const x = sp.x, z = sp.z
    this.x = x; this.z = z
    await ctx.defaultRules()
    await ctx.cmd(`/forceload add ${x - 16} ${z - 16} ${x + 16} ${z + 16}`)
    await ctx.cmd(`/tp @s ${x} ${Y + 20} ${z}`)   // near the set so its chunks are sent
    await bot.waitForTicks(30)
    // a solid deepslate box, then the room and the tunnel carved out of it
    await ctx.cmd(`/fill ${x - 9} ${Y - 3} ${z - 9} ${x + 9} ${Y + 6} ${z + 12} deepslate`)
    await ctx.cmd(`/fill ${x - 1} ${Y} ${z - 2} ${x + 1} ${Y + 2} ${z + 1} air`)        // the room (I mine its north face)
    await ctx.cmd(`/fill ${x - 1} ${Y} ${z + 2} ${x} ${Y + 2} ${z + 10} air`)           // the tunnel south, where it comes from
    // the hidden pocket: a small cave behind the tunnel's east wall (one block of deepslate, x+1), its far wall and floor
    // studded with deepslate diamond ore and lit by glow lichen (both natural at this depth). The blast, a block and a
    // half from that wall, breaks it open (a vein set inside solid rock only showed a dim strip: the take before)
    await ctx.cmd(`/fill ${x + 2} ${Y} ${z + 2} ${x + 5} ${Y + 2} ${z + 6} air`)
    for (const [dx, dy, dz] of [[6, 0, 3], [6, 1, 3], [6, 1, 4], [6, 0, 4], [6, 2, 4], [6, 0, 5], [6, 1, 5], [6, 2, 3], [3, -1, 3], [3, -1, 5], [6, -1, 4]]) {
      await ctx.cmd(`/setblock ${x + dx} ${Y + dy} ${z + dz} deepslate_diamond_ore`)
    }
    for (const [dx, dz] of [[3, 3], [4, 5], [5, 2], [3, 6], [5, 4]]) await ctx.cmd(`/setblock ${x + dx} ${Y + 2} ${z + dz} glow_lichen[up=true]`)
    // a small lava pool on the pocket's floor, away from the wall the blast breaks: it lights the ore (glow lichen alone
    // left the pocket near-black) and diamonds by lava is the deep-cave picture; level with the floor, it can't flow out
    await ctx.cmd(`/fill ${x + 4} ${Y - 1} ${z + 3} ${x + 5} ${Y - 1} ${z + 5} lava`)
    // torches: the room, and down the tunnel
    for (const [dx, dz] of [[-1, -2], [1, -2], [-1, 8], [0, 10]]) await ctx.cmd(`/setblock ${x + dx} ${Y} ${z + dz} torch`)
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd('/gamerule natural_health_regeneration false')   // the lost hearts stay lost through the reveal
    await ctx.cmd('/gamerule block_drops false')   // no deepslate drops spraying out of the blast (settle)
    await ctx.cmd('/difficulty hard')
    await ctx.hotbar(['diamond_pickaxe', ['torch', 32], ['cobbled_deepslate', 48], ['bread', 16]])
    // the armour (after ctx.hotbar, which clears the inventory): Blast Protection IV on two pieces only, so a point-blank
    // creeper on hard takes a couple of hearts (on all four it took one, and regen hid it)
    for (const [slot, item, bp] of [['head', 'netherite_helmet', 0], ['chest', 'netherite_chestplate', 4], ['legs', 'netherite_leggings', 4], ['feet', 'netherite_boots', 0]]) {
      await ctx.cmd(`/item replace entity @s armor.${slot} with ${item}${bp ? `[enchantments={blast_protection:${bp}}]` : ''}`)
    }
    await ctx.tpCheck(x + 0.5, Y, z - 0.5, 0, 6)   // in the room, facing south down the tunnel (frame 0: the creeper in view)
    await ctx.cmd('/effect give @s instant_health 1 10 true')
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: Y, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, z } = this
    const A = require('../lib/act')(ctx)
    let myId = null
    const mine = () => { const all = Object.values(bot.entities).filter(e => e.name === 'creeper'); return all.find(e => e.id === myId) || all[0] }
    await ctx.cmd('/kill @e[type=creeper]', { mayFail: true })
    await ctx.cmd(`/summon creeper ${x} ${Y} ${z + 6.5} {PersistenceRequired:1b}`)   // 7 blocks down the tunnel, walking up
    await bot.waitForTicks(2); { const c = mine(); if (c) myId = c.id }
    { const c = mine(); if (c) await A.aimAt(c.position.offset(0, 1.0, 0), { strict: false, max: 6 }) }
    await bot.waitForTicks(4)
    ctx.mark('first')
    await bot.waitForTicks(7)   // it walks straight at me, on the crosshair
    ctx.mark('glance')
    // back to the rock face (north) and keep mining: it's the tunnel, it's fine
    const near = () => { const c = mine(); return c ? c.position.distanceTo(bot.entity.position) : 99 }
    let close = false
    const watch = () => { if (!close && near() < 4.2) close = true }   // the hiss a beat before the swell (at 3.3 it was already swelling: 0.95 s to the boom and the spin landed with 0.2 s of it in view)
    bot.on('physicsTick', watch)
    const face = [[0, 1, -3], [0, 0, -3], [-1, 1, -3], [-1, 0, -3], [0, 1, -4], [0, 0, -4], [1, 1, -3], [1, 0, -3]]
    for (const [dx, dy, dz] of face) {
      if (close || ctx.died) break
      const b = bot.blockAt(new Vec3(x + dx, Y + dy, z + dz))
      if (!b || /air/.test(b.name)) continue
      try { await A.dig(b) } catch (e) { ctx.log('dig', e.message) }   // aimed by construction (lib/act.js)
    }
    for (let i = 0; i < 120 && !close && !ctx.died; i++) await bot.waitForTicks(1)
    bot.removeListener('physicsTick', watch)
    if (ctx.died || !close) { ctx.log('no hiss on camera'); return false }
    ctx.mark('hiss'); ctx.sound('entity.creeper.primed', 1.4, 1)
    const c = mine()
    let at = c ? c.position.clone() : null
    if (c) await A.aimAt(c.position.offset(0, 0.9, 0), { strict: false, max: 22 })   // the spin round, governed (<= 220 deg/s)
    for (let i = 0; i < 80 && mine() && !ctx.died; i++) { await bot.waitForTicks(1); const cc = mine(); if (cc) { at = cc.position.clone(); bot.lookAt(cc.position.offset(0, 0.9, 0), true) } }   // motion-ok: eyes held on the swelling creeper (it stands still: a fraction of a degree a tick)
    if (ctx.died) { ctx.log('died in the blast'); return false }
    ctx.mark('boom')
    ctx.log('health after the blast', bot.health)
    if (bot.health > 17) { ctx.log('the blast barely touched me: retake'); return false }
    await bot.waitForTicks(16)   // the smoke and the roar settle
    // the pocket the blast opened: is the wall breached, and how much ore shows through
    let breach = 0
    for (let dz = 1; dz <= 6; dz++) for (let dy = 0; dy <= 2; dy++) { const w = bot.blockAt(new Vec3(x + 1, Y + dy, z + dz)); if (w && /air/.test(w.name)) breach++ }
    ctx.log('wall breached blocks:', breach, 'creeper at', at)
    if (breach < 2) return false
    // through the breach, centred on it (aimed at the pocket's far wall, the opening sat at the frame's edge, half hidden)
    const holes = []
    for (let dz = 1; dz <= 6; dz++) for (let dy = 0; dy <= 2; dy++) { const w = bot.blockAt(new Vec3(x + 1, Y + dy, z + dz)); if (w && /air/.test(w.name)) holes.push([dy, dz]) }
    const hz = holes.reduce((a, h) => a + h[1], 0) / holes.length, hy = holes.reduce((a, h) => a + h[0], 0) / holes.length
    await A.aimAt(new Vec3(x + 3.5, Y + hy + 0.3, z + hz + 0.8), { strict: false, max: 24 })   // into the pocket through the hole
    ctx.mark('found')
    await bot.waitForTicks(30)
    return true
  }
}
