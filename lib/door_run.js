// The "which door" format's runner (worker 14): makes a stunt module from a list of rooms
// (lib/doors.js builds them). Each room's play() opens its door and plays the outcome out, and
// returns 'dead' or 'survived'. After a death the bot respawns at the next door (spawn point there);
// after a survival it strafes over to it. The last room is "the safe one" and ends the Short.
//
// Marks: intro, open (n, room), survive (n), death (harness), last_death; per room: lava_in,
// lava_a / lava_dead (the burn, for a speed-up), slam, click, anvil_land, hiss, reveal, fall_a /
// fall_dead, dontlook.
const D = require('./doors')
const N = 0   // mineflayer yaw facing north (-z), at the doors

function kit (ctx, X, Z, F, rooms) {
  const { bot, Vec3 } = ctx
  const n = rooms.length
  const k = { bot, Vec3, X, Z, F, n, rooms }
  k.dx = (i) => D.doorX(X, n, i)
  k.tick = () => bot.waitForTicks(1)
  k.near = (name) => {
    let best = null, bd = 99
    for (const e of Object.values(bot.entities)) if (e.name === name && e.position) { const d = e.position.distanceTo(bot.entity.position); if (d < bd) { bd = d; best = e } }
    return [best, bd]
  }
  k.doorUse = (i, open) => {
    bot._client.write('block_place', { hand: 0, location: { x: k.dx(i), y: F + 1, z: Z }, direction: 3, cursorX: 0.5, cursorY: 0.5, cursorZ: 1, insideBlock: false, worldBorderHit: false, sequence: 0 })
    bot.swingArm()
    ctx.sound(open ? 'block.wooden_door.open' : 'block.wooden_door.close', 1, 0.95 + Math.random() * 0.1)
  }
  k.doorMid = (i) => new Vec3(k.dx(i) + 0.5, F + 1.7, Z + 0.5)
  // the open door's panel takes 3/16 of the doorway's west side, so a player (0.6 wide) fits only
  // between x+0.49 and x+0.7: line up at x+0.6 before going through
  k.open = async (i, pitch = -0.2) => {
    await k.centre(k.dx(i) + 0.6)
    await ctx.easeLookAt(k.doorMid(i), 150)
    k.doorUse(i, true)
    for (let t = 0; t < 3; t++) {   // check it opened (out of reach, the click does nothing)
      await bot.waitForTicks(2)
      const b = bot.blockAt(new Vec3(k.dx(i), F + 1, Z))
      if (b && b.getProperties().open) break
      ctx.log('door', i, 'did not open, retrying from', bot.entity.position)
      k.doorUse(i, true)
    }
    ctx.mark('open', { n: i, room: rooms[i] })
    const R = D.ROOMS[rooms[i]]
    if (R.mob) D.wake(ctx, R.mob, k.dx(i), Z, F)
    await ctx.easeLook(N, pitch, 250)
  }
  k.waitDeath = async (max) => { for (let j = 0; j < max && !ctx.died; j++) await k.tick(); return ctx.died }
  // walk forward (north) until z < tz, eyes at `pitch` (or a function of the tick)
  k.forwardTo = async (tz, pitch, max = 60) => {
    bot.setControlState('forward', true)
    for (let j = 0; j < max && bot.entity.position.z > tz && !ctx.died; j++) {
      if (pitch !== undefined) { const p = typeof pitch === 'function' ? pitch(j) : Array.isArray(pitch) ? pitch : [N, pitch]; await bot.look(p[0], p[1], true) }
      await k.tick()
    }
    bot.setControlState('forward', false)
  }
  // after a death: 0.7 s of death screen, then Respawn at door i (spawn point + world spawn there).
  // `clear`: a mob type left over from the last room, removed on the cut (out of shot from door i)
  k.respawnAt = async (i, clear) => {
    bot.clearControlStates()
    await bot.waitForTicks(14)
    bot.chat(`/spawnpoint @s ${k.dx(i)} ${F + 1} ${Z + 2} 180 0`)
    bot.chat(`/setworldspawn ${k.dx(i)} ${F + 1} ${Z + 2} 180 0`)
    await bot.waitForTicks(2)
    ctx.revive(); ctx.respawn()
    if (clear) bot.chat(`/kill @e[type=${clear}]`)
    await new Promise(resolve => bot.once('spawn', resolve))
    await bot.waitForTicks(6)
    await bot.look(N, 0.1, true)
  }
  k.centre = async (tx) => {
    for (let j = 0; j < 6; j++) {
      await bot.waitForTicks(2)
      const ex = bot.entity.position.x - tx
      if (Math.abs(ex) < 0.08) break
      const c = (ex < 0) === (Math.cos(bot.entity.yaw) > 0) ? 'right' : 'left'
      bot.setControlState(c, true); await k.tick(); bot.setControlState(c, false)
    }
  }
  // strafe right to door i, eyes on it, and stop centred on it (off-centre, the open door's panel
  // blocked the way in)
  k.strafeTo = async (i) => {
    bot.setControlState('right', true)
    let marked = false
    const tx = k.dx(i) + 0.6
    for (let j = 0; j < 60 && bot.entity.position.x < tx - 0.3; j++) {
      const m = k.doorMid(i), e = bot.entity.position.offset(0, 1.62, 0), d = m.minus(e)
      const yaw = Math.atan2(-d.x, -d.z) * 0.6, pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
      await bot.look(bot.entity.yaw + (yaw - bot.entity.yaw) * 0.25, bot.entity.pitch + (pitch - bot.entity.pitch) * 0.25, true)
      await k.tick()
      if (j === 6) { ctx.mark('strafe_a' + i); marked = true }   // the edit cuts the walk between doors
    }
    bot.setControlState('right', false)
    await k.centre(tx)
    if (bot.entity.position.z > Z + 2.9) await k.forwardTo(Z + 2.6)   // back onto the door's step
    if (marked) ctx.mark('strafe_b' + i)
  }
  // walk to (tx, tz), steering toward it (the view follows the way; `ease` < 1 turns gradually)
  k.walkTo = async (tx, tz, ease = 0.35) => {
    bot.setControlState('forward', true)
    for (let j = 0; j < 80; j++) {
      const p = bot.entity.position, ddx = tx - p.x, ddz = tz - p.z, d = Math.hypot(ddx, ddz)
      if (d < 0.2) break
      if (d < 0.9) bot.setControlState('forward', d > 0.3)
      let dy = Math.atan2(-ddx, -ddz) - bot.entity.yaw
      while (dy > Math.PI) dy -= 2 * Math.PI
      while (dy < -Math.PI) dy += 2 * Math.PI
      await bot.look(bot.entity.yaw + dy * (d < 1.5 ? 1 : ease), bot.entity.pitch * 0.85, true)
      await k.tick()
    }
    bot.setControlState('forward', false)
    await bot.waitForTicks(2)
  }
  // track an entity with the eyes (a fraction of the way each tick)
  k.track = async (e, f = 0.2, dy = 1.0) => {
    const eye = bot.entity.position.offset(0, 1.62, 0), v = e.position.offset(0, dy, 0).minus(eye)
    let yaw = Math.atan2(-v.x, -v.z) - bot.entity.yaw
    while (yaw > Math.PI) yaw -= 2 * Math.PI
    while (yaw < -Math.PI) yaw += 2 * Math.PI
    const pitch = Math.atan2(v.y, Math.hypot(v.x, v.z))
    await bot.look(bot.entity.yaw + yaw * f, bot.entity.pitch + (pitch - bot.entity.pitch) * f, true)
  }
  return k
}

// falling blocks of `name` landing: a land sound each (the server doesn't send the player those),
// and the first one marked
function onLand (ctx, name, sound, markName) {
  let seed = 7, first = false
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const fn = (o, nw) => {
    if (nw && nw.name.includes(name) && !(o && o.name.includes(name))) {
      ctx.sound(sound, 0.6, 0.9 + rnd() * 0.2)
      if (!first) { first = true; ctx.mark(markName) }
    }
  }
  ctx.bot.on('blockUpdate', fn)
  return { stop: () => ctx.bot.removeListener('blockUpdate', fn), get landed () { return first } }
}

const PLAY = {
  // a stone bridge over lava: one hop, then a gap too wide; burning, looking up at the diamonds
  async lava (ctx, k, i) {
    const { bot } = ctx, { Z, F } = k
    await k.open(i, -0.35)
    await k.forwardTo(Z - 3.75, -0.45)
    bot.setControlState('forward', true)
    bot.setControlState('jump', true); await bot.waitForTicks(2); bot.setControlState('jump', false)
    ctx.mark('jump1')
    for (let j = 0; j < 40 && bot.entity.position.z > Z - 6.75; j++) await k.tick()
    bot.setControlState('jump', true); await bot.waitForTicks(2); bot.setControlState('jump', false)
    ctx.mark('jump2')
    ctx.easeLook(N, -0.7, 300)
    for (let j = 0; j < 40 && bot.entity.position.y > F - 0.5; j++) await k.tick()
    bot.setControlState('forward', false)
    ctx.mark('lava_in')
    await ctx.easeLook(N, 0.15, 400)
    ctx.mark('lava_a')
    ctx.easeLook(N + 0.5, -0.1, 900)
    if (!(await k.waitDeath(160))) throw new Error('no lava death')
    ctx.mark('lava_dead')
    return 'dead'
  },
  // a horde wakes and comes; the door slams in their faces (on Normal zombies can't break doors)
  async zombies (ctx, k, i) {
    const { bot } = ctx
    await k.open(i, -0.05)
    ctx.sound('entity.zombie.ambient', 1, 0.9)
    for (let j = 0; j < 90; j++) {
      const [zb, d] = k.near('zombie')
      if (zb && d < 3.4) break
      if (j === 20 || j === 36) ctx.sound('entity.zombie.ambient', 1, 0.9 + j / 100)
      bot.setControlState('sneak', j > 4 && bot.entity.position.z > k.Z + 1.8)   // creeping up to look in
      bot.setControlState('forward', j > 4 && bot.entity.position.z > k.Z + 1.8)
      if (zb) await k.track(zb, 0.12, 1.5)
      await k.tick()
    }
    bot.clearControlStates()
    await ctx.easeLookAt(k.doorMid(i).offset(0, -0.3, 0), 100)
    k.doorUse(i, false); ctx.mark('slam')
    await bot.waitForTicks(6)
    ctx.mark('survive', { n: i })
    bot.setControlState('back', true); await bot.waitForTicks(3); bot.setControlState('back', false)
    await ctx.easeLook(N, 0.0, 300)
    return 'survived'
  },
  // a plate just inside; anvils from the sky over the whole room; back out before they land
  async anvils (ctx, k, i) {
    const { bot } = ctx, { Z, F } = k, dx = k.dx(i)
    await k.open(i, -0.4)
    await k.forwardTo(Z - 1.35)
    ctx.mark('click'); ctx.sound('block.stone_pressure_plate.click_on', 0.6, 0.6)
    const land = onLand(ctx, 'anvil', 'block.anvil.land', 'anvil_land')
    await D.ROOMS.anvils.trigger(ctx, dx, Z, F)
    ctx.sound('block.piston.contract', 0.8, 0.8)
    await bot.waitForTicks(2)
    await ctx.easeLook(N, 1.05, 300)            // the click... look up: the roof's gone
    await bot.waitForTicks(4)
    bot.setControlState('back', true)
    ctx.easeLook(N, -0.25, 500)                 // backing out, eyes on the room
    for (let j = 0; j < 40 && bot.entity.position.z < Z + 1.7; j++) await k.tick()
    bot.setControlState('back', false)
    for (let j = 0; j < 30 && !land.landed; j++) await k.tick()
    await bot.waitForTicks(4)
    ctx.mark('survive', { n: i })
    await bot.waitForTicks(8)
    land.stop()
    return 'survived'
  },
  // in among a room of creepers: each one that starts to swell hisses, and the eyes go to it
  async creepers (ctx, k, i) {
    const { bot } = ctx, { Z } = k
    await k.open(i, -0.15)
    await k.forwardTo(Z - 1.3, undefined, 30)
    let hissed = false, seen = 0
    for (let j = 0; j < 200 && !ctx.died; j++) {
      const sw = Object.values(bot.entities).filter(e => e.name === 'creeper' && e.metadata && e.metadata[16] === 1)
      if (sw.length > seen) {
        seen = sw.length
        if (!hissed) { hissed = true; ctx.mark('hiss') }
        ctx.sound('entity.creeper.primed', 1, 0.5)
        ctx.easeLookAt(sw[sw.length - 1].position.offset(0, 1.1, 0), 250)
      }
      await k.tick()
    }
    if (!ctx.died) throw new Error('no creeper death')
    return 'dead'
  },
  // "the safe one": a cosy bedroom; a plate halfway in primes the TNT floor under the carpet
  // (fuse 80, the redstone fuse, with vanilla's little hop; the carpets pop off)
  async safe (ctx, k, i) {
    const { bot } = ctx, { Z, F } = k, dx = k.dx(i)
    await k.open(i, -0.2)
    await k.forwardTo(Z - 4.4, (j) => [bot.entity.position.z < Z - 0.8 ? N + Math.sin(j / 7) * 0.18 : N, -0.2])   // looking round the room once inside
    ctx.mark('click'); ctx.sound('block.wooden_pressure_plate.click_on', 0.6, 0.8)
    // the hidden wiring: both layers of TNT under the carpet prime at once (fuse 80, the redstone
    // fuse, with vanilla's little hop); the carpets and the plate pop off, and the floor's gone
    bot.chat(`/fill ${dx - 2} ${F - 1} ${Z - 12} ${dx + 2} ${F} ${Z - 3} air replace tnt`)
    for (let z = Z - 12; z <= Z - 3; z++) for (let x = dx - 2; x <= dx + 2; x++) for (const y of [F - 1, F]) {
      const a = Math.random() * Math.PI * 2
      bot.chat(`/summon tnt ${x + 0.5} ${y} ${z + 0.5} {fuse:80,Motion:[${(-Math.sin(a) * 0.02).toFixed(3)},0.2,${(-Math.cos(a) * 0.02).toFixed(3)}]}`)
    }
    ctx.sound('entity.tnt.primed', 1, 1); ctx.sound('entity.tnt.primed', 0.8, 0.9)
    await bot.waitForTicks(3)
    ctx.mark('reveal')
    await ctx.easeLook(N, -0.75, 300)           // the floor...
    await bot.waitForTicks(8)
    await ctx.easeLook(N - 0.6, -0.6, 350)      // ...all of it
    await ctx.easeLook(N + 0.6, -0.6, 400)
    await ctx.easeLook(Math.PI, 0.35, 450)      // the door, up out of the pit: two blocks too high
    for (let t = 0; t < 2 && !ctx.died; t++) {
      bot.setControlState('forward', true); bot.setControlState('jump', true)
      await bot.waitForTicks(8)
      bot.setControlState('jump', false)
      await bot.waitForTicks(4)
    }
    bot.clearControlStates()
    ctx.easeLook(N, -0.5, 500)                  // back to it
    if (!(await k.waitDeath(80))) throw new Error('no TNT death')
    return 'dead'
  },
  // no floor: look down at the diamonds 25 blocks below, step in
  async drop (ctx, k, i) {
    const { bot } = ctx, { Z, F } = k
    await k.open(i, -0.3)
    await ctx.easeLook(N, -1.15, 350)           // the diamonds, way down
    await bot.waitForTicks(4)
    await k.forwardTo(Z - 0.75, [N, -1.2])
    bot.setControlState('forward', true); await bot.waitForTicks(3); bot.setControlState('forward', false)
    for (let j = 0; j < 20 && bot.entity.position.y > F - 1; j++) await k.tick()
    ctx.mark('fall_a')
    ctx.easeLook(N, -1.45, 600)
    if (!(await k.waitDeath(100))) throw new Error('no fall death')
    ctx.mark('fall_dead')
    return 'dead'
  },
  // endermen: in to the diamonds and back out, eyes on the floor the whole way (only looking at one
  // angers it)
  async endermen (ctx, k, i) {
    const { bot } = ctx, { Z } = k
    await k.open(i, -0.1)
    ctx.mark('dontlook')
    await bot.waitForTicks(12)                   // them, standing there
    await ctx.easeLook(N, -1.2, 300)            // eyes down
    await k.forwardTo(Z - 4.5, (j) => [N + Math.sin(j / 6) * 0.25, -1.2 + Math.sin(j / 4) * 0.05])
    await bot.waitForTicks(4)
    bot.setControlState('back', true)
    for (let j = 0; j < 60 && bot.entity.position.z < Z + 1.9; j++) { await bot.look(N - Math.sin(j / 6) * 0.2, -1.15, true); await k.tick() }
    bot.setControlState('back', false)
    await ctx.easeLookAt(k.doorMid(i).offset(0, -0.4, 0), 120)
    k.doorUse(i, false); ctx.mark('slam')
    await bot.waitForTicks(6)
    ctx.mark('survive', { n: i })
    await ctx.easeLook(N, 0.0, 300)
    return 'survived'
  },
  // big magma cubes wake and hop over; a step in, and they're on you
  async magma (ctx, k, i) {
    const { bot } = ctx, { Z } = k
    await k.open(i, -0.1)
    await k.forwardTo(Z - 0.6, undefined, 30)
    for (let j = 0; j < 200 && !ctx.died; j++) {
      const [m] = k.near('magma_cube')
      if (m) await k.track(m, 0.15, 0.8)
      await k.tick()
    }
    if (!ctx.died) throw new Error('no magma death')
    return 'dead'
  },
  // the dripstone cave: the plate, the stalactites let go; back out before they land
  async dripstone (ctx, k, i) {
    const { bot } = ctx, { Z, F } = k
    await k.open(i, -0.05)
    await ctx.easeLook(N, 0.5, 300)             // up at the spikes
    await k.forwardTo(Z - 1.35, [N, 0.5])
    ctx.mark('click'); ctx.sound('block.stone_pressure_plate.click_on', 0.6, 0.6)
    const land = onLand(ctx, 'pointed_dripstone', 'block.pointed_dripstone.land', 'drip_land')
    await D.ROOMS.dripstone.trigger(ctx, k.dx(i), Z, F)
    await bot.waitForTicks(5)
    bot.setControlState('back', true)
    ctx.easeLook(N, 0.2, 500)
    for (let j = 0; j < 40 && bot.entity.position.z < Z + 2.2; j++) await k.tick()
    bot.setControlState('back', false)
    await ctx.easeLook(N, -0.15, 300)
    for (let j = 0; j < 30 && !land.landed; j++) await k.tick()
    await bot.waitForTicks(4)
    ctx.mark('survive', { n: i })
    await bot.waitForTicks(8)
    land.stop()
    return 'survived'
  },
  // "the safe one", part 2: a cat on the far side; halfway across, the trapdoor floor swings open
  // over a pit of lava
  async trapdoor (ctx, k, i) {
    const { bot } = ctx, { Z, F } = k
    await k.open(i, -0.15)
    await k.forwardTo(Z - 5.2, (j) => [bot.entity.position.z < Z - 0.8 ? N + Math.sin(j / 7) * 0.15 : N, -0.15])
    ctx.mark('click')
    await D.ROOMS.trapdoor.trigger(ctx, k.dx(i), Z, F)
    for (let s = 0; s < 4; s++) ctx.sound('block.wooden_trapdoor.open', 0.8, 0.85 + s * 0.08)
    ctx.mark('reveal')
    await ctx.easeLook(N, -1.3, 300)            // the floor's gone
    for (let j = 0; j < 40 && bot.entity.position.y > F - 12.6 && !ctx.died; j++) await k.tick()
    ctx.mark('lava_in')
    ctx.easeLook(N, 0.9, 700)                   // up at the room, out of reach
    if (!(await k.waitDeath(140))) throw new Error('no trapdoor death')
    return 'dead'
  }
  ,
  // a ravager: one step in, and it charges
  async ravager (ctx, k, i) {
    const { bot } = ctx, { Z } = k
    await k.open(i, -0.05)
    ctx.sound('entity.ravager.roar', 1, 1)
    await k.forwardTo(Z - 0.6, undefined, 30)
    for (let j = 0; j < 200 && !ctx.died; j++) {
      const [r] = k.near('ravager')
      if (r) await k.track(r, 0.2, 1.4)
      await k.tick()
    }
    if (!ctx.died) throw new Error('no ravager death')
    return 'dead'
  },
  // TNT both sides, three high: in along the path, a look either side, and back out (no spark,
  // no boom)
  async tnt_room (ctx, k, i) {
    const { bot } = ctx, { Z } = k
    await k.open(i, -0.1)
    ctx.mark('just_tnt')
    await k.forwardTo(Z - 3.6, [N, -0.15])
    await ctx.easeLook(N - 0.9, -0.2, 350)       // all of it
    await ctx.easeLook(N + 0.9, -0.1, 450)
    await ctx.easeLook(N, -0.1, 250)
    bot.setControlState('back', true)
    for (let j = 0; j < 60 && bot.entity.position.z < Z + 2.0; j++) { await bot.look(N, -0.1, true); await k.tick() }
    bot.setControlState('back', false)
    ctx.mark('survive', { n: i })
    await bot.waitForTicks(8)
    return 'survived'
  },
  // hoglins: a step in; they charge and toss you
  async hoglins (ctx, k, i) {
    const { bot } = ctx, { Z } = k
    await k.open(i, -0.1)
    await k.forwardTo(Z - 0.6, undefined, 30)
    for (let j = 0; j < 200 && !ctx.died; j++) {
      const [h] = k.near('hoglin')
      if (h) await k.track(h, 0.2, 0.7)
      await k.tick()
    }
    if (!ctx.died) throw new Error('no hoglin death')
    return 'dead'
  },
  // the arrow corridor: the plate, the dispensers fire volley after volley; back out through them
  async arrows (ctx, k, i) {
    const { bot } = ctx, { Z, F } = k
    await k.open(i, -0.1)
    await k.forwardTo(Z - 1.35)
    ctx.mark('click'); ctx.sound('block.stone_pressure_plate.click_on', 0.6, 0.6)
    let seed = 11
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const fire = () => D.ROOMS.arrows.volley(ctx, k.dx(i), Z, F, rnd)
    fire()
    await ctx.easeLook(N - 0.7, -0.05, 200)     // the walls...
    fire()
    await ctx.easeLook(N + 0.7, -0.05, 250)
    bot.setControlState('back', true)
    ctx.easeLook(N, -0.1, 300)
    for (let j = 0; j < 40 && bot.entity.position.z < Z + 2.2; j++) { if (j % 5 === 0) fire(); await k.tick() }
    bot.setControlState('back', false)
    await bot.waitForTicks(6)
    if (ctx.died) throw new Error('died in the arrows')
    ctx.mark('survive', { n: i })
    await bot.waitForTicks(8)
    return 'survived'
  }
  ,
  // "the empty one": in through the dark; the sculk sensor clicks, the darkness starts to pulse, and
  // the warden at the back comes for you (anger set on the bot, as the sensor's vibrations would)
  async warden (ctx, k, i) {
    const { bot } = ctx, { Z, F } = k
    await k.open(i, -0.1)
    // (the wake in open() gave it AI; its anger is what the walking-in vibrations build up)
    const hex = bot.player.uuid.replace(/-/g, '')
    const ints = [0, 8, 16, 24].map(o => { const v = parseInt(hex.slice(o, o + 8), 16); return v > 0x7fffffff ? v - 0x100000000 : v })
    await k.forwardTo(Z - 2.2, (j) => [N + Math.sin(j / 8) * 0.12, -0.15])
    ctx.mark('click'); ctx.sound('block.sculk_sensor.clicking', 1, 1)
    bot.chat(`/execute as @e[type=warden] run data merge entity @s {anger:{suspects:[{uuid:[I;${ints.join(',')}],anger:150}]}}`)
    ctx.mark('reveal')
    for (let j = 0; j < 260 && !ctx.died; j++) {
      const [w, d] = k.near('warden')
      if (w) await k.track(w, 0.12, 2.4)
      bot.setControlState('back', d < 6 && bot.entity.position.z < Z + 2)
      if (j % 20 === 0) ctx.log('warden', j, d.toFixed(2), 'hp', bot.health)
      await k.tick()
    }
    bot.clearControlStates()
    if (!ctx.died) throw new Error('no warden death')
    return 'dead'
  }
}

// The stunt module for a list of rooms. `edit` comes from the stunt (cards and caption).
function makeStunt ({ name, rooms, caption, edit, biome }) {
  // the walk over to the next door after a survival is cut (two ~4 s strafes read as dead loops)
  edit = { ...edit, speed: [...(edit.speed || []), ...rooms.map((r, i) => ['strafe_a' + i, 'strafe_b' + i, 'cut'])] }
  return {
    name,
    biome: process.env.BIOME || biome || 'minecraft:plains',
    caption,
    expectDeath: true,
    botTimeout: 300,
    edit,
    async setup (ctx) {
      const { bot } = ctx
      const site = require('../stunts/_site')
      const n = rooms.length
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
      await D.build(ctx, X, Z, F, rooms)
      await ctx.cmd('/difficulty normal')
      for (let i = 0; i < n; i++) if (D.ROOMS[rooms[i]].populate) await D.ROOMS[rooms[i]].populate(ctx, D.doorX(X, n, i), Z, F)
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
      const { bot } = ctx
      const k = kit(ctx, this.X, this.Z, this.F, rooms)
      await ctx.cmd('/gamerule keep_inventory true')   // again, so the mark is in the timeline (the HUD keeps the hotbar on death screens)
      ctx.mark('intro')
      await k.walkTo(k.dx(0) + 0.5, this.Z + 2.5, 0.1)
      await bot.look(N, bot.entity.pitch, true)
      await k.centre(k.dx(0) + 0.5)
      let last = null
      for (let i = 0; i < rooms.length; i++) {
        if (last === 'dead') await k.respawnAt(i, D.ROOMS[rooms[i - 1]].mob)
        else if (last === 'survived') await k.strafeTo(i)
        if (i === rooms.length - 1) ctx.mark('safe')   // after the respawn (its card goes on the new door)
        try { last = await PLAY[rooms[i]](ctx, k, i) } catch (e) { ctx.log('room', i, rooms[i], 'failed:', e.message, bot.entity.position, 'hp', bot.health); return false }
        ctx.log('room', i, rooms[i], last)
      }
      ctx.mark('last_death')
      await bot.waitForTicks(30)
      return last === 'dead'
    }
  }
}

module.exports = { kit, PLAY, makeStunt }
