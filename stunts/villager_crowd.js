// "1 vs 10 vs 100 vs 200 villagers staring at me 💀" (~30 s): the escalating staring_villagers. Eight
// crowds side by side in one big field, 34 blocks apart (out of each other's view): 1, 5, 10, 20, 50,
// 100, 150, then 200 villagers. Each time the bot walks up behind them, they all turn at once and their heads
// follow it as it sidesteps. Finale: it backs off from the 200... turns round, and 40 more were
// standing right behind it, staring. NoAI villagers; the bot runs `tp @s ~ ~ ~ facing entity <bot>
// eyes` every tick on the crowds that have turned; face_on (near: this crowd) / face_off marks tell
// the renderer. Hard cut (teleport) between crowds. The bot starts in the middle of the field so
// every crowd's chunks are loaded (recorded) when the recording starts.
const GAP = 22   // crowds x - 97 .. x + 57: 27+ blocks of field either side (the cut edges showed)
const CROWDS = [
  { n: 1, sub: '1 villager', cols: 1, rows: 1 },
  { n: 5, sub: '5 villagers', cols: 5, rows: 1 },
  { n: 10, sub: '10 villagers', cols: 5, rows: 2 },
  { n: 20, sub: '20 villagers', cols: 5, rows: 4 },
  { n: 50, sub: '50 villagers', cols: 10, rows: 5 },
  { n: 100, sub: '100 villagers', cols: 10, rows: 10 },
  { n: 200, sub: '200 villagers', cols: 20, rows: 10 }   // (500 + 100 behind slowed the server below 1 tick/s)
]
const BEHIND = { cols: 10, rows: 4 }        // the finale crowd behind the start of the last walk
const crowdX = (x, i) => x - 20 + Math.round((i - (CROWDS.length - 1) / 2) * GAP)   // shifted west: the 200 stood 6 blocks from the field's cut east edge
module.exports = {
  name: 'villager_crowd',
  botTimeout: 420,   // the field (cleared to z + 150) takes ~150 s to set up: the default 180 killed all 5 attempts
  biome: process.env.BIOME || 'minecraft:plains',
  caption: '1 vs 10 vs 100 vs 200 villagers staring at me 💀',
  edit: {
    subsY: 0.15, caption: '1 vs 10 vs 100 vs 200 villagers staring at me 💀', red: '200', dropAt: 'behind',
    startAt: 'beat:-0.05', endAfter: 'behind:0.7',   // fast end (owner r:r188b46): 0.7 s after every head snaps round
    // the short cut (lead 2026-11-11: as short as it reads, ~8-20 s): 1, 10, 100, 200 and the crowd behind; the 5,
    // 20 (emerald) and 50 crowds are recorded but cut out whole
    speed: [['cut1a', 'cut2b', 'cut'], ['cut3a', 'cut5b', 'cut'], ['cut6a', 'cut6b', 'cut'], ['overhead', 'back', 1.5], ['pillar', 'overhead', 3]],   // the pan over the 200 a bit quicker (pace: 2.5 s with nothing new); the look down while pillaring x3 (review r1: 3 s of grass)
    subs: [...[0, 2, 5, 6].map(i => ['beat', CROWDS[i].sub, 1.6, i]), ['back', 'nope', 0.5, 0], ['turnaround', 'wait...', 0.8, 0], ['behind', 'BEHIND ME TOO', 1.0, 0]],
    punch: [['behind', 0, 1.08]], flash: [['behind', 0, 0.5]],
    zoom: [['overhead', 'behind:1.0', 1.3]],   // review r1: the pan and the payoff read as a flat plain to the horizon; the crowd fills the frame instead
      // the payoff: every head snaps round (pace: a picture change on it; the punch alone didn't register)
    sfx: [['air', 'start', 'behind', { gain: 0.5 }]],   // room tone from frame 1 (the first sound was at 0.8 s)
    // the opening (owner r:r0f3da0): frame 0 is the mass of 200 staring villagers, not the one. The look over the 200
    // from the pillar (moving, the crowd filling the frame) flashes first, then the count-up from 1
    hook: { at: 'overhead', before: 0, after: 1.2, text: 'wait for the 200 💀' }
  },

  async setup (ctx) {
    const { bot } = ctx
    const sp = bot.entity.position.floored()
    const g = ctx.findLand(sp.x, sp.z)
    if (!g) throw new Error('no dry land')
    const { x, z } = g, floor = g.y
    this.x = x; this.z = z; this.floor = floor
    await ctx.defaultRules()
    await ctx.cmd('/kill @e[type=villager]')
    const profs = ['librarian', 'farmer', 'cleric', 'armorer', 'fletcher', 'toolsmith', 'weaponsmith', 'cartographer', 'butcher', 'shepherd', 'mason', 'fisherman', 'nitwit', 'none']
    const types = ['plains', 'plains', 'plains', 'taiga', 'desert', 'savanna', 'snow']
    // one big flat field for all the crowds (slabs under the 32768-block /fill cap)
    // The server stalls for seconds on fills this big, and mineflayer's tick waits time out (5 s) while
    // it does ("Timeout waiting for 1 ticks"): pace the heavy commands by wall-clock time instead.
    const heavy = async (c) => { bot.chat(c); await ctx.sleep(450) }
    // deep and high enough that no cut hillside or trunkless canopy shows, even in the turnaround south
    // the rows past ~z + 90 are outside what the bot keeps loaded: force-load them for the fills
    await ctx.cmd(`/forceload add ${x - 124} ${z - 72} ${x + 124} ${z + 150}`)   // the whole field (the first 6 north rows failed too)
    await ctx.sleep(3000)
    for (let z0 = z - 72; z0 <= z + 150; z0 += 4) {   // (z - 40 left a cut cliff face in the 200 shot; z + 90 one behind the payoff)
      const z1 = Math.min(z0 + 3, z + 150)
      await heavy(`/fill ${x - 124} ${floor + 1} ${z0} ${x + 124} ${floor + 30} ${z1} air`)
      if (z0 > z + 60) await heavy(`/fill ${x - 124} ${floor + 31} ${z0} ${x + 124} ${floor + 45} ${z1} air`)   // (one fill to +45 is over the 32768 cap)
      await heavy(`/fill ${x - 124} ${floor} ${z0} ${x + 124} ${floor} ${z1} grass_block`)
      await heavy(`/fill ${x - 124} ${floor - 3} ${z0} ${x + 124} ${floor - 1} ${z1} dirt`)
      // one biome everywhere (a crowd stood on a duller grass tint)
      await heavy(`/fillbiome ${x - 124} ${floor - 4} ${z0} ${x + 124} ${floor + 14} ${z1} minecraft:plains`)
    }
    await ctx.sleep(3000)
    await ctx.cmd(`/forceload remove ${x - 124} ${z - 72} ${x + 124} ${z + 150}`)
    // mineflayer ignores the biome update packet: go far away and come back to reload the chunks
    await ctx.cmd(`/tp @s ${x + 1000} 200 ${z}`); await bot.waitForTicks(60)
    await ctx.cmd(`/tp @s ${x} ${floor + 1} ${z + 8}`); await this.settle(ctx); await bot.waitForChunksToLoad()
    this.profs = profs; this.types = types; this.k = 0
    await this.spawnCrowd(ctx, 0)                            // the rest are spawned just before their beat
    await this.settle(ctx)                                   // the big field stalls the server for a while
    ctx.log('villagers', Object.values(bot.entities).filter(e => e.name === 'villager').length)
    await ctx.hotbar(['diamond_sword', ['emerald', 32], ['bread', 16], ['oak_log', 64]])
    await ctx.tpCheck(x + 0.5, floor + 1, z + 4.5, 180, -4)   // the middle: all crowds' chunks loaded for the recording
    await ctx.cmd('/gamemode survival')
    ctx.select(1)
    await bot.waitForTicks(30)
    return { x, y: floor, z }
  },

  // Spawn crowd i (and, for the last, the crowd behind it). Crowds are spawned one at a time just before
  // their beat and the previous one removed: ~420 villagers at once bogged mineflayer down so far that its
  // tick waits timed out. The spawning time is cut from the video (cutNa..cutNb).
  async spawnCrowd (ctx, i) {
    const { bot } = ctx
    const { x, z, floor } = this
    const summon = async (vx, vz, tag, rot = 180) => {
      const p = this.profs[(this.k * 5 + 3) % this.profs.length], t = this.types[(this.k * 3 + 1) % this.types.length]
      bot.chat(`/summon villager ${vx.toFixed(2)} ${floor + 1} ${vz.toFixed(2)} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Rotation:[${rot}f,0f],Tags:["${tag}"],VillagerData:{profession:"minecraft:${p}",type:"minecraft:${t}",level:2},Xp:1}`)
      if (++this.k % 10 === 0) await ctx.sleep(200)
    }
    const c = CROWDS[i], sx = crowdX(x, i), big = c.n >= 50
    for (let r = 0; r < c.rows; r++) {
      for (let q = 0; q < c.cols; q++) {
        const jx = ((q * 7 + r * 3) % 5) * 0.08, jz = ((q * 5 + r * 7) % 3) * 0.2
        await summon(sx + 0.5 + (q - (c.cols - 1) / 2) * (big ? 1.25 : 1.6) + (r % 2) * 0.4 + jx, z - 3.5 - r * (big ? 1.3 : 1.8) - jz, `crowd${i}`)
      }
    }
    if (i === CROWDS.length - 1) {   // the finale crowd: behind where the last walk starts, already facing it
      for (let r = 0; r < BEHIND.rows; r++) {
        // right behind where the back-off ends, backs turned: they snap round on the reveal
        for (let q = 0; q < BEHIND.cols; q++) await summon(sx + 0.5 + (q - (BEHIND.cols - 1) / 2) * 1.25 + (r % 2) * 0.4, z + 5.5 + r * 1.3, 'behind', 0)
      }
    }
    await ctx.sleep(1500)
  },

  // wait (up to 90 s) until the server ticks at a normal rate again: tick waits time out (5 s) while it relights
  async settle (ctx) {
    const { bot } = ctx
    for (let i = 0; i < 18; i++) {
      const t0 = Date.now()
      try { await bot.waitForTicks(20) } catch (e) { ctx.log('server busy, waiting'); continue }
      const ms = Date.now() - t0
      ctx.log('20 ticks in', ms, 'ms')
      if (ms < 1400) return
    }
    throw new Error('server never settled')
  },

  // teleport to the next crowd without the 1 s settle of tpCheck: wait just until it took
  async cut (ctx, x, y, z) {
    const { bot } = ctx
    for (let i = 0; i < 4; i++) {
      bot.chat(`/tp @s ${x} ${y} ${z} 180 -4`)
      for (let t = 0; t < 10; t++) {
        await bot.waitForTicks(1)
        if (Math.abs(bot.entity.position.x - x) < 0.1 && Math.abs(bot.entity.position.z - z) < 0.1) { await bot.waitForTicks(2); if (Math.abs(bot.entity.position.x - x) < 0.1) return }
      }
      ctx.log('cut teleport did not stick, retrying')
    }
    throw new Error('teleport did not stick')
  },

  async perform (ctx) {
    const { bot } = ctx
    const { x, z, floor } = this
    const track = () => bot.chat(`/execute as @e[type=villager,tag=on] at @s run tp @s ~ ~ ~ facing entity ${bot.username} eyes`)
    bot.on('physicsTick', track)
    // while strafing, keep the camera on the crowd (eye level of their heads)
    let aim = null
    const aimTick = () => {
      if (!aim) return
      const e = bot.entity.position, dx = aim.x - e.x, dy = aim.y - (e.y + 1.62), dz = aim.z - e.z
      const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz))
      let d = yaw - bot.entity.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI
      bot.look(bot.entity.yaw + d * 0.35, bot.entity.pitch + (pitch - bot.entity.pitch) * 0.35, true)
    }
    bot.on('physicsTick', aimTick)
    for (let i = 0; i < CROWDS.length; i++) {
      const c = CROWDS[i], sx = crowdX(x, i), last = i === CROWDS.length - 1
      aim = null
      if (i > 0) {
        // off camera (cut from the video): spawn this crowd, drop the last one, let things settle
        ctx.mark(`cut${i}a`)
        await this.spawnCrowd(ctx, i)
        bot.chat(`/kill @e[type=villager,tag=crowd${i - 1}]`)
        await this.settle(ctx)
      }
      // the 1 starts close (a 1.5 s walk-up to one villager's back was the hook); z + 6.5 for the big crowds failed to stick (5 runs)
      await this.cut(ctx, sx + 0.5, floor + 1, i === 0 ? z + 1.3 : z + 4.5)
      if (i > 0) ctx.mark(`cut${i}b`)                    // after the tp: the 200 crowd's teleport took 1.65 s (a 1 s STILL)
      ctx.mark('beat', { n: c.n })                       // walk on the cut (a 3-tick wait read as a freeze)
      // walk up behind them
      bot.setControlState('forward', true)
      const stopZ = c.n >= 50 ? z + 1.8 : z - 0.2           // big crowds: stop further back so their size shows
      while (bot.entity.position.z > stopZ) await bot.waitForTicks(1)
      bot.setControlState('forward', false)
      await bot.waitForTicks(6)
      // they all turn round at once (the last face_on also covers the crowd behind, which turns with it)
      // server-side tracking (tp facing every tick) for the small crowds; the 500 + 100 would stall the server,
      // and the renderer turns every villager in the face_on window toward the camera anyway
      if (!last) bot.chat(`/tag @e[type=villager,tag=crowd${i}] add on`)
      const depth = (c.rows - 1) * (c.n >= 50 ? 1.3 : 1.8)
      // this crowd only: the radius stops short of the crowd behind (z + 5.5 on); 8 + depth (19.7 for the 200)
      // reached it, so it was already staring when the camera turned round
      const cz = z - 3.5 - depth / 2
      ctx.mark('turn', { n: c.n }); ctx.mark('face_on', { near: [sx + 0.5, cz, Math.min(8 + depth, z + 5.0 - cz)] })
      const voices = Math.min(c.n, 6)
      for (let v = 0; v < voices; v++) ctx.sound('entity.villager.ambient', 0.5 + 0.1 * voices, 0.75 + v * 0.1)
      aim = new ctx.Vec3(sx + 0.5, floor + 2.3, z - 3.5 - Math.min(depth, 6) / 2)
      await bot.waitForTicks(6)
      // sidestep: every head follows (bigger crowds: both ways)
      bot.setControlState('left', true); await bot.waitForTicks(c.n >= 20 ? 14 : 10); bot.setControlState('left', false)   // (long sweeps on the big crowds were 3.2 s gaps)
      if (c.n >= 20) { await bot.waitForTicks(3); bot.setControlState('right', true); await bot.waitForTicks(22); bot.setControlState('right', false) }
      await bot.waitForTicks(3)
      if (c.n === 20) {
        // a beat of its own: toss an emerald at their feet... every head drops to follow it, then snaps back
        // to you as you walk up and take it back (server-side: the heads face the item, the renderer's
        // face-the-camera window is off for it)
        aim = new ctx.Vec3(sx + 0.5, floor + 0.6, z - 3.5)   // the gem on the grass and the front row's heads both in frame (lower cut the heads off)
        await bot.waitForTicks(5)
        ctx.mark('face_off')
        bot.removeListener('physicsTick', track)
        const gemTrack = () => bot.chat(`/execute as @e[type=villager,tag=on] at @s run tp @s ~ ~ ~ facing entity @e[type=item,limit=1,sort=nearest] feet`)
        bot.on('physicsTick', gemTrack)
        ctx.mark('gem'); ctx.sound('entity.item.pickup', 0.4, 0.6)
        // one emerald, the vanilla Q drop from the held stack (bot.toss emptied the whole slot, 32 -> 0, review)
        bot._client.write('block_dig', { status: 4, location: { x: 0, y: 0, z: 0 }, face: 0, sequence: 0 }); bot.swingArm()
        // a slow drift along the heads while they turn down to it (a fixed aim here was a 0.6 s PAUSE)
        for (let k = 0; k < 22; k++) { aim = new ctx.Vec3(sx + 0.5 + (k - 11) * 0.15, floor + 0.6, z - 3.5); await bot.waitForTicks(1) }
        for (let v = 0; v < 4; v++) ctx.sound('entity.villager.ambient', 0.7, 0.9 + v * 0.1)
        bot.setControlState('forward', true); await bot.waitForTicks(6); bot.setControlState('forward', false)
        bot.removeListener('physicsTick', gemTrack); bot.on('physicsTick', track)
        ctx.mark('face_on', { near: [sx + 0.5, cz, 8 + depth] }); ctx.sound('entity.villager.no', 0.8)
        aim = new ctx.Vec3(sx + 0.5, floor + 2.3, z - 3.5 - Math.min(depth, 6) / 2)
        await bot.waitForTicks(10)
      }
      if (!last) { ctx.mark('face_off'); bot.chat('/tag @e[type=villager,tag=on] remove on'); continue }
      // the 200: pillar up as they stare, every head tracking you up, and the overhead view finally shows the
      // size of it (from eye level 50 to 200 all looked the same); then "behind me too" from the pillar top
      ctx.select(3)
      // eyes down on the block under you to place on it (pillaring while looking at the crowd isn't possible)
      aim = null
      await ctx.easeLook(bot.entity.yaw, -1.45, 250)
      ctx.mark('pillar')
      const fx = Math.floor(bot.entity.position.x), fz = Math.floor(bot.entity.position.z)
      for (let k = 0; k < 6; k++) {   // 6 up: the whole 200 below (4 tested; the Short ran 27.4 s)
        const y0 = Math.round(bot.entity.position.y)
        bot.setControlState('jump', true)
        for (let t = 0; t < 14 && bot.entity.position.y < y0 + 1.05; t++) await bot.waitForTicks(1)
        bot._client.write('block_place', { hand: 0, location: { x: fx, y: y0 - 1, z: fz }, direction: 1, cursorX: 0.5, cursorY: 1, cursorZ: 0.5, insideBlock: false, worldBorderHit: false, sequence: 0 })
        bot.swingArm(); ctx.sound('block.wood.place', 1)
        bot.setControlState('jump', false)
        for (let t = 0; t < 14 && !bot.entity.onGround; t++) await bot.waitForTicks(1)
      }
      ctx.log('pillar top at', bot.entity.position.y.toFixed(2), 'floor', floor)
      // the overhead reveal: a slow pan from the near rows out over the whole crowd, every face turned up at you
      ctx.mark('overhead')
      for (let k = 0; k < 50; k++) {   // a pan over every upturned face (90 ticks was a 4.5 s gap with no new beat)
        const f = k / 49
        aim = new ctx.Vec3(sx + 0.5 + Math.sin(f * Math.PI * 2) * 6, floor + 1, z - 3.5 - f * depth * 0.8)
        await bot.waitForTicks(1)
      }
      // finale: nope... turn round on the pillar... they were behind you too
      ctx.mark('back'); ctx.sound('entity.villager.no', 1)
      await bot.waitForTicks(8)
      aim = null
      // something behind you: a villager's "hmm" from the south motivates the turn
      ctx.sound('entity.villager.ambient', 1.2, 0.8)
      ctx.mark('turnaround')
      await ctx.easeLook(Math.PI * 0.999, -0.7, 1100)   // -0.7: the horizon (and any far hillside) stays out of the top   // mineflayer yaw 0 = north; the crowd behind is south, below
      // their backs (seen through the turn)... then they all snap round too, at once
      ctx.mark('face_off'); ctx.mark('face_on', { near: [sx + 0.5, z + 7.5, 10] })
      ctx.mark('behind')
      for (let v = 0; v < 6; v++) ctx.sound('entity.villager.ambient', 1.1, 0.7 + v * 0.1)
      // a slow look along them as every head turns up (no still hold on the reveal)
      await ctx.easeLook(Math.PI * 0.999 + 0.35, -0.7, 1000)
      ctx.mark('face_off')
    }
    bot.removeListener('physicsTick', track); bot.removeListener('physicsTick', aimTick)
    return true
  }
}
