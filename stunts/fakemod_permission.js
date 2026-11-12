// Fake mod 1, "mobs ask for permission" (format fakemod, docs/formats.md; STANDARDS r:rd551de). A survival field at
// sunset. Every hostile mob that comes for you stops dead and a popup asks you first (lib/fakemod.js, the overlay is
// scripts/popup.py: our own Minecraft-style GUI):
//   1. a zombie walks up: "A Zombie is asking for permission to attack you." Deny: it stands there, frozen. You kill it.
//   2. a skeleton with a bow: "...permission to shoot you." The cursor nearly hits Allow, then Deny. Frozen, killed.
//   3. you turn round and a creeper is right behind you: "...permission to explode." The cursor goes for Deny... then
//      clicks Roll. ALLOW / DENY / ALLOW ... it lands on ALLOW. It lights, swells and goes off. Death screen.
// The mechanics are vanilla: the "mod" only sets NoAI while it waits for an answer (a mob with NoAI stands still), and
// Allow on the creeper sets its `ignited` flag (flint and steel's effect: the 30-tick fuse). The kills are netherite
// sword jump crits at the attack cooldown (8 x 1.5 = 12 damage: 2 hits on 20 health, the zombie's 2 armour too). Hard
// difficulty: a creeper going off ~3 blocks away kills a full-health player.
const { plateau } = require('../lib/plateau')
const FM = require('../lib/fakemod')

const CAPTION = 'why is every mob asking me for permission 💀'   // a reaction, not a label (r:r0f3da0)

module.exports = {
  name: 'fakemod_permission',
  biome: 'minecraft:plains',
  time: 12950,     // sunset: undead don't burn (the sky is too dark for it) and the sky goes orange
  caption: CAPTION,
  edit: {
    caption: CAPTION, red: 'permission', startAt: 'first:-0.05', deathScreen: true, endAfter: 'boom:0.8',   // settle-ok: fast cuts (owner r:r188b46): end 0.5-0.8 s after the payoff's result; smoke never holds the end
    // straight to the next beat once each kill reads (r:r188b46): cut when the dying mob is gone (r:r24d99a still holds
    // a cut for a mob mid-death) to the next mob already framed under the popup
    speed: [['cut1a', 'cut1b', 'cut'], ['cut2a', 'cut2b', 'cut']],
    dropAt: 'boom',
    sfx: [['air', 'first', 'boom', { gain: 0.4 }], ['dip', 'boom', 0.4], ['impact', 'boom', { gain: 1.3 }],
      ['pop', 'fm1_open'], ['pop', 'fm2_open'], ['pop', 'fm3_open'],   // a hit as each popup opens (mixcheck: under the NCS bed the toast sound wasn't one)
      ['riser', 'fm3_click', 'fm3_result', { gain: 0.35 }]],          // the roll builds (pace: the last third sagged); it ends 1.6 s before the dip
    // the roll's result as a big green card over the sky above the popup: readable at phone size (r:r4607fa)
    cards: [['fm3_result', 'ALLOW', 0.9, 'green', 0, { y: 0.16 }]],
    popup: [
      FM.popup({ k: 1, mob: 'zombie', text: ['A ', ['Zombie', 'red'], ' is asking for permission to attack you.'], pick: 'Deny', done: ['Request ', ['DENIED', 'red'], '.'] }),
      FM.popup({ k: 2, mob: 'skeleton', text: ['A ', ['Skeleton', 'red'], ' is asking for permission to shoot you.'], pick: 'Deny', hover: ['Allow', 'Deny'], done: ['Request ', ['DENIED', 'red'], '.'] }),
      FM.popup({ k: 3, mob: 'creeper', text: ['A ', ['Creeper', 'red'], ' is asking for permission to explode.'], hover: ['Deny', 'Roll'], roll: 'Allow', done: ['The dice say: ', ['ALLOW', 'green']] })   // every popup big on a phone (format default: owner r:rb35549)
    ]
  },
  expectDeath: true,

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g
    await ctx.defaultRules()
    const floor = await plateau(ctx, { x0: x - 34, x1: x + 34, z0: z - 34, z1: z + 34, biome: null, pct: 0.995, taper: 14, trees: 16 })
    this.x = x; this.z = z; this.floor = floor
    // a dressed field (never a superflat plain): trees round the edge, grass and flowers, a clear arena in the middle
    const trees = [['oak', -12, -18], ['fancy_oak', 8, -22], ['birch', -4, -28], ['oak', 18, -26], ['fancy_oak', -22, -20], ['birch', 24, -10],
      ['oak', -26, 6], ['birch', 27, 10], ['oak', 10, 24], ['fancy_oak', -14, 26], ['birch', 2, 30], ['oak', 22, 22]]
    for (const [f, dx, dz] of trees) await ctx.cmd(`/place feature minecraft:${f} ${x + dx} ${floor + 1} ${z + dz}`, { mayFail: true })
    for (let dx = -32; dx <= 32; dx += 8) {
      for (let dz = -32; dz <= 32; dz += 8) {
        if (Math.abs(dx) <= 10 && Math.abs(dz) <= 10) continue
        await ctx.cmd(`/place feature minecraft:patch_grass ${x + dx} ${floor + 1} ${z + dz}`, { mayFail: true })
        if ((dx + dz) % 16 === 0) await ctx.cmd(`/place feature minecraft:flower_plain ${x + dx + 3} ${floor + 1} ${z + dz + 3}`, { mayFail: true })
      }
    }
    await ctx.cmd(`/fill ${x - 9} ${floor + 1} ${z - 9} ${x + 9} ${floor + 3} ${z + 9} air`)   // the arena: nothing to trip on
    await ctx.cmd('/kill @e[type=!player]')
    await ctx.cmd('/gamerule keep_inventory true')
    await ctx.cmd('/gamerule block_drops false')      // the blast's dirt drops would fly and float (settle)
    await ctx.cmd('/gamerule mob_drops false')        // no rotten flesh, bones or XP orbs left floating after the kills
    await ctx.cmd('/difficulty hard')
    await ctx.hotbar(['netherite_sword', ['bread', 16], ['torch', 32], ['oak_planks', 64]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 0.5, 90, 8)   // facing west, into the sunset (the mobs read against the orange sky)
    await ctx.cmd('/effect give @s instant_health 1 10 true')
    await ctx.cmd('/gamemode survival')
    ctx.select(0)
    await bot.waitForTicks(20)
    return { x, y: floor, z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { x, z, floor } = this
    const A = require('../lib/act')(ctx)
    const F = floor + 1
    const ent = (tag) => Object.values(bot.entities).find(e => e.__fm === tag)
    const grab = async (tag, type) => {   // the entity I just summoned (the newest of its type)
      for (let i = 0; i < 10; i++) {
        await bot.waitForTicks(1)
        const c = Object.values(bot.entities).filter(e => e.name === type && !e.__fm).sort((a, b) => b.id - a.id)[0]
        if (c) { c.__fm = tag; return c }
      }
      throw new Error(`no ${type} after the summon`)
    }
    const dist = (e) => e.position.distanceTo(bot.entity.position)
    const burning = (e) => e && e.metadata && typeof e.metadata[0] === 'number' && (e.metadata[0] & 1)
    const kill = async (e, n = 4) => {
      const hp = () => (e.metadata && typeof e.metadata[9] === 'number') ? e.metadata[9] : 20   // LivingEntity health
      for (let i = 0; i < n && e.isValid !== false && hp() > 0; i++) {
        // a jump crit (vanilla: falling, not on the ground: x1.5 and the crit stars): jump, hit on the way down
        bot.setControlState('jump', true); await bot.waitForTicks(1); bot.setControlState('jump', false)   // motion-ok: one jump, the view stays on the mob (A.view)
        for (let j = 0; j < 12 && !(bot.entity.velocity.y < 0 && !bot.entity.onGround); j++) { A.view(e.position.offset(0, 1.2, 0)); await bot.waitForTicks(1) }
        try { await A.hit(e, { delay: i === 0 ? 0 : 13, max: 30 }) } catch (err) { if (/is gone/.test(err.message)) break; throw err }   // the sword's cooldown (1.6 attacks/s): full-damage hits
        ctx.sound('entity.player.attack.crit', 1, 1)
        for (let j = 0; j < 8 && !bot.entity.onGround; j++) await bot.waitForTicks(1)
      }
      for (let i = 0; i < 30 && e.isValid !== false; i++) await bot.waitForTicks(1)
    }

    // 1. the zombie: walking at me from frame 0 (r:r0f3da0: the subject in motion by 0.5 s; the Short starts once it
    // moves: a fresh zombie stands ~1 s before it targets me)
    await ctx.cmd(`/summon zombie ${x - 4.8} ${F} ${z + 0.5} {Tags:["fm_zombie"],PersistenceRequired:1b,Rotation:[-90f,0f]}`)
    const zb = await grab('fm_zombie', 'zombie')
    const z0 = zb.position.clone()
    // the skeleton waits off to the right (north), frozen until its turn (it would shoot me in the back)
    await ctx.cmd(`/summon skeleton ${x - 2.5} ${F} ${z - 6.0} {Tags:["fm_skel"],PersistenceRequired:1b,NoAI:1b,Rotation:[0f,0f],equipment:{mainhand:{id:"minecraft:bow",count:1}}}`)
    const sk = await grab('fm_skel', 'skeleton')
    for (let i = 0; i < 60 && zb.position.distanceTo(z0) < 0.25; i++) { A.view(FM.framePoint(ctx, zb)); await bot.waitForTicks(1) }
    ctx.mark('first')
    for (let i = 0; i < 12 && dist(zb) > 3.4; i++) { A.view(FM.framePoint(ctx, zb)); await bot.waitForTicks(1) }   // framed under the centred popup; it opens by ~0.6 s (pace r0: a far zombie read as a still opener)
    ctx.log('zombie at', dist(zb).toFixed(2), 'burning', burning(zb))
    await FM.ask(ctx, { k: 1, tag: 'fm_zombie', hover: ['Deny'], entity: zb, A })
    await kill(zb)
    ctx.mark('zombie_dead', { gone: zb.isValid === false })
    await bot.waitForTicks(3); ctx.mark('cut1a'); await bot.waitForTicks(3)   // the cut's edges on a still view (whip: an edit cut mid-turn snaps)

    // 2. the skeleton (cut to it, framed under the popup): it asks
    await A.turnTo(FM.framePoint(ctx, sk), { max: 40, hold: 4 })
    ctx.mark('cut1b')
    ctx.log('skeleton at', dist(sk).toFixed(2), 'burning', burning(sk))
    await FM.ask(ctx, { k: 2, tag: 'fm_skel', hover: ['Allow', 'Deny'] })
    // walk up to it and kill it (sprinting, the view on it)
    bot.setControlState('sprint', true); bot.setControlState('forward', true)   // motion-ok: a straight sprint at the frozen skeleton, the view governed by A.view
    for (let i = 0; i < 40 && dist(sk) > 2.6; i++) { A.view(sk.position.offset(0, 1.4, 0)); await bot.waitForTicks(1) }
    bot.setControlState('forward', false); bot.setControlState('sprint', false)   // motion-ok: the sprint's end
    // the creeper creeps up on my left (west, off screen, against the sunset) while I fight and waits there for
    // permission: NoAI from the start (a walking creeper inside 3 blocks starts its own fuse; take 1 blew up first)
    const behind = bot.entity.position.plus(new Vec3(-3.0, 0, -0.6))
    const face = Math.atan2(-(bot.entity.position.x - behind.x), bot.entity.position.z - behind.z) * 180 / Math.PI   // MC yaw toward me: atan2(-dx, dz) (r1: the sign was flipped, it faced away)
    await ctx.cmd(`/summon creeper ${behind.x.toFixed(2)} ${F} ${behind.z.toFixed(2)} {Tags:["fm_creeper"],PersistenceRequired:1b,NoAI:1b,Rotation:[${face.toFixed(1)}f,0f]}`)
    const cr = await grab('fm_creeper', 'creeper')
    await kill(sk)
    ctx.mark('skeleton_dead', { gone: sk.isValid === false })
    await bot.waitForTicks(3); ctx.mark('cut2a'); await bot.waitForTicks(3)   // the cut's edges on a still view (whip: an edit cut mid-turn snaps)

    // 3. cut to my left: the creeper, right there, waiting. It asks. Deny... no: Roll.
    await A.turnTo(FM.framePoint(ctx, cr), { max: 50, hold: 4 })   // under the bigger scale-4 popup
    ctx.mark('cut2b')
    ctx.log('creeper at', dist(cr).toFixed(2))
    await FM.ask(ctx, { k: 3, tag: 'fm_creeper', hover: ['Deny', 'Roll'], roll: 'Allow' })
    // allowed: it lights (vanilla's ignited flag: the 30-tick fuse), swells, goes off. The fuse runs in Creeper.tick,
    // not its AI, so it keeps NoAI and stays put facing me (r1: freed, it stepped closer while swelling)
    await ctx.cmd('/data merge entity @e[tag=fm_creeper,limit=1] {ignited:1b}')
    ctx.mark('ignite')
    ctx.sound('entity.creeper.primed', 1, 1)
    const h0 = bot.health
    let boomed = false
    for (let i = 0; i < 60 && !ctx.died; i++) {
      await bot.waitForTicks(1)
      if (!boomed && (cr.isValid === false || bot.health < h0)) { boomed = true; ctx.mark('boom') }
      if (!boomed) A.view(cr.position.offset(0, 0.9, 0))
    }
    if (!boomed) ctx.mark('boom')
    ctx.log('health after the blast', bot.health, 'died', ctx.died)
    await bot.waitForTicks(50)   // the death screen
    return ctx.died
  }
}
