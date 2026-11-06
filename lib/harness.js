// Shared bot harness: connects to the local server, finds a spot in a biome, and records
// everything the renderer, the HUD and the audio need while a stunt module performs:
//   chunk snapshot, POV pose per tick, block changes, hotbar contents, sound events.
// A stunt module exports { biome, setup(ctx) -> {x, y, z}, perform(ctx) -> ok:boolean }.
// usage: STUNT=water_clutch RECORD=work/x.rec.json node bot.js
const fs = require('fs')
const mineflayer = require('mineflayer')
const { Vec3 } = require('vec3')

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a)

// Footstep/place sound group by block name (vanilla SoundType, simplified).
function soundGroup (name) {
  if (/grass_block|dirt|podzol|mycelium|farmland|gravel|clay/.test(name)) return name === 'gravel' ? 'gravel' : 'grass'
  if (/sand/.test(name)) return 'sand'
  if (/snow/.test(name)) return 'snow'
  if (/wool|carpet/.test(name)) return 'wool'
  if (/planks|_log|_wood|fence|door|chest|crafting_table|bookshelf/.test(name)) return 'wood'
  if (/glass/.test(name)) return 'glass'
  return 'stone'
}

async function run (stunt) {
  const NAME = process.env.BOT_NAME || 'HelloBuh'
  const RADIUS = Number(process.env.RECORD_RADIUS || 160)
  const bot = mineflayer.createBot({ host: '127.0.0.1', port: Number(process.env.MC_PORT || 25565), username: NAME, auth: 'offline', viewDistance: 12, version: process.env.MC_VERSION || '1.21.11' })
  bot.on('kicked', r => { log('kicked', r); process.exit(2) })
  bot.on('error', e => { log('error', e); process.exit(2) })
  await new Promise(r => bot.once('spawn', r))
  log('spawned at', bot.entity.position)

  let rec = null, tick = 0, recording = false, died = false
  const timeline = []
  const mark = (event, extra = {}) => { if (recording) timeline.push({ t: tick * 50, event, slot: bot.quickBarSlot, health: bot.health, ...extra }) }
  const hotbarNames = () => { const out = []; for (let i = 36; i < 45; i++) { const it = bot.inventory.slots[i]; out.push(it ? it.name : null) } return out }
  bot.on('death', () => { died = true; mark('death'); log('died') })
  bot.on('health', () => mark('health'))

  const ctx = {
    bot, log, sleep, Vec3,
    get died () { return died },
    get tick () { return tick },
    mark,
    sound: (sound, volume = 1, pitch = 1) => mark('sound', { sound, volume, pitch }),
    soundGroup,
    async cmd (c) { bot.chat(c); await bot.waitForTicks(4) },
    async easeLook (yaw, pitch, ms) {
      const y0 = bot.entity.yaw, p0 = bot.entity.pitch, steps = Math.max(1, Math.round(ms / 50))
      let dy = yaw - y0; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        await bot.look(y0 + dy * e, p0 + (pitch - p0) * e, true)
        await bot.waitForTicks(1)
      }
    },
    // Look at a point (eased), mineflayer yaw/pitch convention.
    async easeLookAt (p, ms) {
      const eye = bot.entity.position.offset(0, 1.62, 0)
      const d = p.minus(eye)
      const yaw = Math.atan2(-d.x, -d.z), pitch = Math.atan2(d.y, Math.hypot(d.x, d.z))
      await ctx.easeLook(yaw, pitch, ms)
    },
    // Put items in the hotbar (names or [name, count]); recorded for the HUD.
    async hotbar (items) {
      await ctx.cmd('/clear @s')
      for (let i = 0; i < items.length; i++) {
        if (!items[i]) continue
        const [n, c] = Array.isArray(items[i]) ? items[i] : [items[i], 1]
        await ctx.cmd(`/item replace entity @s hotbar.${i} with ${n} ${c}`)
      }
      await bot.waitForTicks(4)
      mark('hotbar', { items: hotbarNames() })
    },
    select (slot) { bot.setQuickBarSlot(slot); mark('slot') },
    async locateBiome (biome) {
      const located = new Promise((resolve) => {
        const on = (m) => { const r = /nearest .* is at \[(-?\d+), [^,]+, (-?\d+)\]/.exec(m); if (r) { bot.removeListener('messagestr', on); resolve([+r[1], +r[2]]) } }
        bot.on('messagestr', on); setTimeout(() => resolve(null), 20000)
      })
      bot.chat(`/locate biome ${biome}`)
      const loc = await located
      if (loc) { log('nearest', biome, 'at', loc); await ctx.cmd(`/tp @s ${loc[0]} 200 ${loc[1]}`); await bot.waitForTicks(40) }
      await bot.waitForChunksToLoad()
      return loc
    },
    // Highest solid ground at (x, z), ignoring plants and trees.
    surface (x, z) {
      const skip = /^(air|cave_air|short_grass|tall_grass|fern|large_fern|snow|dandelion|poppy|bush|vine)$|_leaves$|_log$|flower|tulip|orchid|allium|azure|oxeye|cornflower|lily_of/
      for (let y = 250; y > -60; y--) {
        const b = bot.blockAt(new Vec3(x, y, z))
        if (!b) return null
        if (skip.test(b.name)) continue
        return b
      }
      return null
    },
    // Dry, grassy ground near (x, z): spiral out until found.
    findLand (x, z) {
      for (let r = 0; r <= 48; r += 8) {
        for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) {
          const b = ctx.surface(x + dx, z + dz)
          if (b && ['grass_block', 'dirt', 'podzol', 'coarse_dirt'].includes(b.name) && b.position.y >= 62) return b.position
        }
      }
      return null
    },
    async defaultRules () {
      for (const c of ['/time set 6000', '/weather clear', '/gamerule doDaylightCycle false', '/gamerule doWeatherCycle false',
        '/gamerule sendCommandFeedback false', '/gamerule doMobSpawning false', '/effect clear @s']) await ctx.cmd(c)
    },
    // Teleport and make sure it stuck (the server can reject a stale move right after a tp).
    async tpCheck (x, y, z, yawDeg = 0, pitchDeg = 0) {
      for (let i = 0; ; i++) {
        await ctx.cmd(`/tp @s ${x} ${y} ${z} ${yawDeg} ${pitchDeg}`)
        await bot.waitForTicks(20)
        if (Math.abs(bot.entity.position.y - y) < 0.1 && Math.abs(bot.entity.position.x - x) < 0.1) return
        if (i === 4) throw new Error('teleport did not stick')
        log('teleport did not stick, retrying')
      }
    }
  }

  function startRecording (set) {
    const columns = []
    for (const { chunkX, chunkZ, column } of bot.world.getColumns()) {
      const x = Number(chunkX), z = Number(chunkZ)
      if (Math.abs(x * 16 + 8 - set.x) <= RADIUS && Math.abs(z * 16 + 8 - set.z) <= RADIUS) columns.push({ x: x * 16, z: z * 16, chunk: column.toJson() })
    }
    rec = { version: bot.version, stunt: stunt.name, set, columns, poses: [], blocks: [] }
    tick = 0; recording = true
    let walked = 0
    const onTick = () => {
      const e = bot.entity
      const prev = rec.poses[rec.poses.length - 1]
      rec.poses.push([tick++, +e.position.x.toFixed(4), +e.position.y.toFixed(4), +e.position.z.toFixed(4), +e.yaw.toFixed(5), +e.pitch.toFixed(5), bot.quickBarSlot])
      // vanilla footsteps: one step sound per ~1.67 blocks walked on the ground
      if (prev && e.onGround) {
        walked += 0.6 * Math.hypot(e.position.x - prev[1], e.position.z - prev[3])
        if (walked > 1) {
          walked = 0
          const under = bot.blockAt(e.position.offset(0, -0.2, 0))
          if (under && under.name !== 'air') ctx.sound(`block.${soundGroup(under.name)}.step`, 0.15)
        }
      }
    }
    const onBlock = (o, n) => { if (n) rec.blocks.push([tick, n.position.x, n.position.y, n.position.z, n.stateId]) }
    // hotbar contents for the HUD, whenever an inventory slot in the hotbar changes
    let lastBar = ''
    const onSlot = (slot) => { if (slot >= 36 && slot < 45) { const h = hotbarNames(); if (h.join() !== lastBar) { lastBar = h.join(); mark('hotbar', { items: h }) } } }
    bot.on('physicsTick', onTick); bot.on('blockUpdate', onBlock); bot.inventory.on('updateSlot', onSlot)
    lastBar = hotbarNames().join()
    mark('hotbar', { items: hotbarNames() })
    mark('start')
    return () => { bot.removeListener('physicsTick', onTick); bot.removeListener('blockUpdate', onBlock); bot.inventory.removeListener('updateSlot', onSlot); recording = false }
  }

  try {
    await ctx.cmd('/gamemode creative')
    if (stunt.biome) await ctx.locateBiome(stunt.biome)
    const set = await stunt.setup(ctx)
    log('set at', set)
    const stop = startRecording(set)
    const ok = (await stunt.perform(ctx)) && !died
    mark('end')
    stop()
    await bot.waitForTicks(10)
    log(ok ? 'STUNT OK' : 'STUNT FAILED')
    if (process.env.RECORD) fs.writeFileSync(process.env.RECORD, JSON.stringify({ ...rec, timeline }))
    bot.quit(); await sleep(500); process.exit(ok ? 0 : 1)
  } catch (e) { log('script error', e); process.exit(3) }
}

module.exports = { run }
