// "which door would you pick? 🚪" (worker 14, docs/ideas.md "New formats" #3, ~30 s): five numbered
// doors in one facade, diamonds at the back of every room. The bot opens them in turn:
//   1 a stone bridge over lava with a gap too wide to walk (dead), 2 a zombie horde (survived: it
//   slams the door, and zombies can't break doors on Normal), 3 a pressure plate under open sky
//   (anvils; survived by backing out), 4 a room of creepers (dead), 5 "the safe one", a cosy bedroom
//   whose floor is TNT under the carpet (the worst).
// Everything on camera is survival play: walking, jumping, opening doors. Mobs have their own AI.
// The traps' redstone (under the floor, never on camera) is stood in for by commands.
const D = require('../lib/doors')
const ROOMS = ['lava', 'zombies', 'anvils', 'creepers', 'safe']
const N = 0   // mineflayer yaw facing north (-z), at the doors

module.exports = {
  name: 'which_door',
  biome: process.env.BIOME || 'minecraft:plains',
  caption: 'which door would you pick? 🚪',
  expectDeath: true,
  botTimeout: 300,
  edit: {
    caption: 'which door would you pick? 🚪', red: 'door', song: 'songs/funk_abnormal.mp3', dropAt: 'reveal',
    endAfter: 'last_death:1.0', deathScreen: true, onFire: 'lava_in:death',
    counter: { at: ROOMS.map((r, i) => ['open', i]), total: ROOMS.length },
    cards: [
      ['intro', 'PICK ONE 👀', 1.2, 'yellow'],
      ['death', 'DEAD ❌', 0.7, 'red', 0],
      ['survive', 'SURVIVED ✅', 0.9, 'green', 0],
      ['survive', 'SURVIVED ✅', 0.9, 'green', 1],
      ['death', 'DEAD ❌', 0.7, 'red', 1],
      ['safe', 'THE SAFE ONE 😇', 1.0, 'green'],
      ['death', 'THE WORST ONE 💀', 1.0, 'red', 2]
    ],
    punch: [['death', 0, 1.08], ['death', 1, 1.08], ['death', 2, 1.2]],
    flash: [['death', 2, 0.8]],
    shake: [['death', 2, 24]],
    speed: [['lava_a', 'lava_dead', 2.5]]     // the burn in the lava, sped up to the death
  },

  async setup (ctx) {
    const { bot } = ctx
    const site = require('./_site')
    const n = ROOMS.length
    const half = Math.ceil(((n - 1) / 2) * D.GAP) + 18
    const g = await site.findSite(ctx, [-half, half, -D.DEPTH - 8, 22])
    if (!g) throw new Error('no site')
    const { x: X, z: Z, y: F } = g
    Object.assign(this, { X, Z, F })
    await ctx.defaultRules()
    await ctx.cmd(`/forceload add ${X - half} ${Z - D.DEPTH - 8} ${X + half} ${Z + 22}`)
    await ctx.cmd('/gamerule random_tick_speed 0')
    await ctx.cmd('/gamerule log_admin_commands false')
    await ctx.cmd('/kill @e[type=!player]')
    await D.build(ctx, X, Z, F, ROOMS)
    await ctx.cmd('/difficulty normal')
    for (let i = 0; i < n; i++) if (D.ROOMS[ROOMS[i]].populate) await D.ROOMS[ROOMS[i]].populate(ctx, D.doorX(X, n, i), Z, F)
    await ctx.hotbar(['iron_sword', ['bread', 16], ['torch', 32]])
    await ctx.cmd('/gamerule keep_inventory true')
    await ctx.cmd('/gamerule respawn_radius 0')
    await ctx.cmd('/gamerule fall_damage true')
    // the start: off to the left of the row, the doors receding to the right
    const d0 = D.doorX(X, n, 0)
    await ctx.tpCheck(d0 - 3.5, F + 1, Z + 8.5, 180 + 40, -6)
    await ctx.cmd('/gamemode survival')
    await ctx.cmd('/effect give @s instant_health 1 5 true')
    ctx.select(3)
    await bot.waitForTicks(20)
    return { x: X, y: F, z: Z }
  },

  async perform (ctx) {
    const { bot, Vec3 } = ctx
    const { X, Z, F } = this
    const n = ROOMS.length
    const dx = (i) => D.doorX(X, n, i)
    const tick = () => bot.waitForTicks(1)
    const near = (name) => {
      let best = null, bd = 99
      for (const e of Object.values(bot.entities)) if (e.name === name && e.position) { const d = e.position.distanceTo(bot.entity.position); if (d < bd) { bd = d; best = e } }
      return [best, bd]
    }
    const doorUse = (i, open) => {
      bot._client.write('block_place', { hand: 0, location: { x: dx(i), y: F + 1, z: Z }, direction: 3, cursorX: 0.5, cursorY: 0.5, cursorZ: 1, insideBlock: false, worldBorderHit: false, sequence: 0 })
      bot.swingArm()
      ctx.sound(open ? 'block.wooden_door.open' : 'block.wooden_door.close', 1, 0.95 + Math.random() * 0.1)
    }
    const doorMid = (i) => new Vec3(dx(i) + 0.5, F + 1.7, Z + 0.5)
    const waitDeath = async (max) => { for (let k = 0; k < max && !ctx.died; k++) await tick(); return ctx.died }
    // after a death: 0.7 s of death screen, then Respawn at the next door (spawn point + world spawn there)
    const respawnAt = async (i) => {
      bot.clearControlStates()
      await bot.waitForTicks(14)
      bot.chat(`/spawnpoint @s ${dx(i)} ${F + 1} ${Z + 2} 180 0`)
      bot.chat(`/setworldspawn ${dx(i)} ${F + 1} ${Z + 2} 180 0`)
      await bot.waitForTicks(2)
      ctx.revive(); ctx.respawn()
      if (i === 4) bot.chat('/kill @e[type=creeper]')   // the rest of room 4 (out of shot from door 5)
      await new Promise(resolve => bot.once('spawn', resolve))
      await bot.waitForTicks(6)
      await bot.look(N, 0.1, true)
    }
    // strafe right to the next door, eyes on it, and stop centred on it (off-centre, the open door's
    // panel blocked the way in)
    const strafeTo = async (i) => {
      bot.setControlState('right', true)
      const tx = dx(i) + 0.5
      for (let k = 0; k < 60 && bot.entity.position.x < tx - 0.3; k++) {
        const m = doorMid(i), e = bot.entity.position.offset(0, 1.62, 0), d = m.minus(e)
        const yaw = Math.atan2(-d.x, -d.z) * 0.6, pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
        await bot.look(bot.entity.yaw + (yaw - bot.entity.yaw) * 0.25, bot.entity.pitch + (pitch - bot.entity.pitch) * 0.25, true)
        await tick()
      }
      bot.setControlState('right', false)
      await centre(tx)
    }
    const centre = async (tx) => {
      for (let k = 0; k < 12; k++) {
        await bot.waitForTicks(2)
        const ex = bot.entity.position.x - tx
        if (Math.abs(ex) < 0.08) break
        const c = (ex < 0) === (Math.cos(bot.entity.yaw) > 0) ? 'right' : 'left'
        bot.setControlState(c, true); await tick(); bot.setControlState(c, false)
      }
    }
    // walk to (tx, tz), steering toward it (the view follows the way; `ease` < 1 turns gradually)
    const walkTo = async (tx, tz, ease = 0.35) => {
      bot.setControlState('forward', true)
      for (let k = 0; k < 80; k++) {
        const p = bot.entity.position, ddx = tx - p.x, ddz = tz - p.z, d = Math.hypot(ddx, ddz)
        if (d < 0.2) break
        if (d < 0.9) bot.setControlState('forward', d > 0.3)
        let yaw = Math.atan2(-ddx, -ddz), dy = yaw - bot.entity.yaw
        while (dy > Math.PI) dy -= 2 * Math.PI
        while (dy < -Math.PI) dy += 2 * Math.PI
        await bot.look(bot.entity.yaw + dy * (d < 1.5 ? 1 : ease), bot.entity.pitch * 0.85, true)
        await tick()
      }
      bot.setControlState('forward', false)
      await bot.waitForTicks(2)
    }
    // --- intro: walk up to door 1, the numbered row receding to the right
    ctx.mark('intro')
    await walkTo(dx(0) + 0.5, Z + 2.5, 0.1)
    await bot.look(N, bot.entity.pitch, true)
    await centre(dx(0) + 0.5)
    await ctx.easeLookAt(doorMid(0), 200)

    // --- door 1: lava
    {
      const i = 0
      doorUse(i, true); ctx.mark('open', { n: i, room: ROOMS[i] })
      await ctx.easeLook(N, -0.35, 250)
      // through the door, along the bridge
      bot.setControlState('forward', true)
      for (let k = 0; k < 60 && bot.entity.position.z > Z - 3.75; k++) { await bot.look(N, -0.45, true); await tick() }
      bot.setControlState('jump', true); await bot.waitForTicks(2); bot.setControlState('jump', false)
      ctx.mark('jump1')
      for (let k = 0; k < 40 && bot.entity.position.z > Z - 6.75; k++) await tick()
      bot.setControlState('jump', true); await bot.waitForTicks(2); bot.setControlState('jump', false)
      ctx.mark('jump2')
      ctx.easeLook(N, -0.7, 300)
      for (let k = 0; k < 40 && bot.entity.position.y > F - 0.5; k++) await tick()
      bot.setControlState('forward', false)
      ctx.mark('lava_in')
      // burning: look up at the diamonds out of reach, then back at the door
      await ctx.easeLook(N, 0.15, 400)
      ctx.mark('lava_a')
      ctx.easeLook(N + 0.5, -0.1, 900)
      if (!(await waitDeath(160))) { ctx.log('no lava death', bot.entity.position); return false }
      ctx.mark('lava_dead')
      await respawnAt(1)
    }

    // --- door 2: zombies (slammed shut in time)
    {
      const i = 1
      await bot.waitForTicks(4)
      await ctx.easeLookAt(doorMid(i), 150)
      doorUse(i, true); ctx.mark('open', { n: i, room: ROOMS[i] })
      D.wake(ctx, 'zombie', dx(i), Z, F); ctx.sound('entity.zombie.ambient', 1, 0.9)
      await ctx.easeLook(N, -0.05, 250)
      let slam = false
      for (let k = 0; k < 90; k++) {
        const [zb, d] = near('zombie')
        if (zb && d < 3.6) { slam = true; break }
        if (k === 20 || k === 36) ctx.sound('entity.zombie.ambient', 1, 0.9 + k / 100)
        if (k === 18) bot.setControlState('back', true)
        if (k === 21) bot.setControlState('back', false)
        await tick()
      }
      ctx.log('zombies: slam', slam, near('zombie')[1].toFixed(2), 'count', Object.values(bot.entities).filter(e => e.name === 'zombie').length)
      await ctx.easeLookAt(doorMid(i).offset(0, -0.3, 0), 100)
      doorUse(i, false); ctx.mark('slam')
      await bot.waitForTicks(6)
      ctx.mark('survive', { n: i })
      await ctx.easeLook(N, 0.0, 300)
      await strafeTo(2)
    }

    // --- door 3: the plate, the anvils (backed out in time)
    {
      const i = 2
      await ctx.easeLookAt(doorMid(i), 150)
      doorUse(i, true); ctx.mark('open', { n: i, room: ROOMS[i] })
      await ctx.easeLook(N, -0.4, 250)
      bot.setControlState('forward', true)
      for (let k = 0; k < 40 && bot.entity.position.z > Z - 1.35; k++) await tick()
      bot.setControlState('forward', false)
      ctx.mark('click'); ctx.sound('block.stone_pressure_plate.click_on', 0.6, 0.6)
      // the trap: anvils from the sky over the whole room, one right over the plate
      let seed = 7
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
      const landed = (o, nw) => { if (nw && /anvil/.test(nw.name) && !(o && /anvil/.test(o.name))) { ctx.sound('block.anvil.land', 0.6, 0.9 + rnd() * 0.2); if (!this.landed) { this.landed = true; ctx.mark('anvil_land') } } }
      bot.on('blockUpdate', landed)
      const drop = (ax, ay, az) => bot.chat(`/summon falling_block ${ax.toFixed(2)} ${ay} ${az.toFixed(2)} {BlockState:{Name:"minecraft:anvil"},Time:1,HurtEntities:1b,FallHurtAmount:2f,FallHurtMax:40}`)
      drop(dx(i) + 0.5, F + 16, Z - 1.5)
      for (let z = 1; z <= 11; z += 1) for (const ox of [-2, 0, 2]) if (rnd() < 0.6) drop(dx(i) + ox + 0.5, F + 15 + Math.floor(rnd() * 4), Z - z - 0.5)
      await bot.waitForTicks(2)
      await ctx.easeLook(N, 1.05, 300)            // the click... look up
      await bot.waitForTicks(5)
      bot.setControlState('back', true)
      ctx.easeLook(N, -0.15, 500)
      for (let k = 0; k < 40 && bot.entity.position.z < Z + 2.2; k++) await tick()
      bot.setControlState('back', false)
      for (let k = 0; k < 30 && !this.landed; k++) await tick()
      await bot.waitForTicks(4)
      ctx.log('anvils landed', !!this.landed, 'me', bot.entity.position, 'hp', bot.health)
      ctx.mark('survive', { n: i })
      await bot.waitForTicks(8)
      bot.removeListener('blockUpdate', landed)
      await strafeTo(3)
    }

    // --- door 4: creepers
    {
      const i = 3
      await ctx.easeLookAt(doorMid(i), 150)
      doorUse(i, true); ctx.mark('open', { n: i, room: ROOMS[i] })
      D.wake(ctx, 'creeper', dx(i), Z, F)
      await ctx.easeLook(N, -0.15, 250)
      // in among them: they turn, the hissing starts on both sides
      bot.setControlState('forward', true)
      for (let k = 0; k < 30 && bot.entity.position.z > Z - 1.3; k++) await tick()
      bot.setControlState('forward', false)
      let hissed = false, look = 0
      for (let k = 0; k < 200 && !ctx.died; k++) {
        const sw = Object.values(bot.entities).filter(e => e.name === 'creeper' && e.metadata && e.metadata[16] === 1)
        if (sw.length > look) {   // each new one that starts to swell: hiss, and look at it
          look = sw.length
          if (!hissed) { hissed = true; ctx.mark('hiss') }
          ctx.sound('entity.creeper.primed', 1, 0.5)
          const c = sw[sw.length - 1]
          ctx.easeLookAt(c.position.offset(0, 1.1, 0), 250)
        }
        if (k % 10 === 0) ctx.log('creeper k', k, 'swelling', sw.length, 'dz', (bot.entity.position.z - Z).toFixed(2), 'hp', bot.health)
        await tick()
      }
      if (!ctx.died) { ctx.log('no creeper death'); return false }
      await respawnAt(4)
    }

    // --- door 5: "the safe one"
    {
      const i = 4
      ctx.mark('safe')
      await bot.waitForTicks(4)
      await ctx.easeLookAt(doorMid(i), 150)
      doorUse(i, true); ctx.mark('open', { n: i, room: ROOMS[i] })
      await ctx.easeLook(N, -0.2, 300)
      bot.setControlState('forward', true)
      for (let k = 0; k < 60 && bot.entity.position.z > Z - 4.4; k++) { const inside = bot.entity.position.z < Z - 0.8; await bot.look(inside ? N + Math.sin(k / 7) * 0.18 : N, -0.2, true); await tick() }   // looking round the room once inside
      bot.setControlState('forward', false)
      ctx.mark('click'); ctx.sound('block.wooden_pressure_plate.click_on', 0.6, 0.8)
      // the hidden wiring: every TNT under the carpet primes (fuse 80, the redstone fuse), with
      // vanilla's little hop; the carpets on top pop off
      const cells = []
      for (let z = Z - 12; z <= Z - 3; z++) for (let x = dx(i) - 2; x <= dx(i) + 2; x++) if (!(x === dx(i) && z === Z - 5)) cells.push([x, z])
      bot.chat(`/fill ${dx(i) - 2} ${F} ${Z - 12} ${dx(i) + 2} ${F} ${Z - 3} air replace tnt`)
      for (const [x, z] of cells) {
        const a = Math.random() * Math.PI * 2
        bot.chat(`/summon tnt ${x + 0.5} ${F} ${z + 0.5} {fuse:80,Motion:[${(-Math.sin(a) * 0.02).toFixed(3)},0.2,${(-Math.cos(a) * 0.02).toFixed(3)}]}`)
      }
      ctx.sound('entity.tnt.primed', 1, 1); ctx.sound('entity.tnt.primed', 0.8, 0.9)
      await bot.waitForTicks(3)
      ctx.mark('reveal')
      await ctx.easeLook(N, -1.1, 300)            // the floor...
      await bot.waitForTicks(6)
      await ctx.easeLook(N - 0.6, -0.9, 350)      // ...all of it
      await ctx.easeLook(N + 0.6, -0.9, 400)
      await ctx.easeLook(Math.PI, -0.05, 400)     // the door: run
      bot.setControlState('forward', true); bot.setControlState('sprint', true)
      for (let k = 0; k < 80 && !ctx.died; k++) {
        if (bot.entity.position.z > Z - 3.4 && bot.entity.position.y < F + 0.9) bot.setControlState('jump', true)
        else bot.setControlState('jump', false)
        if (bot.entity.position.z > Z - 1.6) { bot.setControlState('forward', false); bot.setControlState('sprint', false) }
        await tick()
      }
      bot.clearControlStates()
      if (!(await waitDeath(60))) { ctx.log('no TNT death', bot.entity.position); return false }
      ctx.mark('last_death')
      await bot.waitForTicks(30)
    }
    return true
  }
}
