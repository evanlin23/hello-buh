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
  const bot = mineflayer.createBot({ host: '127.0.0.1', port: Number(process.env.MC_PORT || 25565), username: NAME, auth: 'offline', viewDistance: 12, respawn: false, version: process.env.MC_VERSION || '1.21.11' })
  // damage type names in registry order (sent during configuration), for the damage_event packet
  const damageTypes = []
  bot._client.on('registry_data', p => { if (/damage_type$/.test(p.id || '')) for (const e of p.entries || []) damageTypes.push(String(e.key).replace('minecraft:', '')) })
  bot.on('kicked', r => { log('kicked', r); process.exit(2) })
  bot.on('error', e => { log('error', e); process.exit(2) })
  // a retry can log in as the dead player the last attempt left behind: respawn it, or 'spawn' never comes
  bot._client.once('update_health', p => { if (p.health <= 0) bot._client.write('client_command', bot.supportFeature('respawnIsPayload') ? { payload: 0 } : { actionId: 0 }) })
  await new Promise(r => bot.once('spawn', r))
  log('spawned at', bot.entity.position)

  let rec = null, tick = 0, recording = false, died = false, deaths = 0
  const timeline = []
  // max health on every mark (the HUD draws ceil(max / 2) heart containers)
  const maxHealth = () => { try { const a = bot.entity && bot.entity.attributes; const k = a && Object.keys(a).find(n => /max_health$/.test(n)); return k ? a[k].value : 20 } catch (e) { return 20 } }
  const mark = (event, extra = {}) => { if (recording) { const mh = maxHealth(); timeline.push({ t: tick * 50, event, slot: bot.quickBarSlot, health: bot.health, max_health: mh, ...extra }) } }
  // hotbar as [name, count] (null for empty slots)
  // [name, count] per hotbar slot, plus a third element 1 for an enchanted stack (the renderer draws the glint)
  const enchanted = (it) => { try { return !!(it && ((it.enchants && it.enchants.length) || JSON.stringify(it.components || it.nbt || '').includes('enchant'))) } catch (e) { return false } }
  // ... and, for a damaged tool, [name, count, glint 0|1, damage, maxDamage] (the HUD's durability bar)
  const damageOf = (it) => { try { const max = bot.registry.items[it.type]?.maxDurability; const d = it.durabilityUsed; return max && d > 0 ? [d, max] : null } catch (e) { return null } }
  const hotbarNames = () => {
    const out = []
    for (let i = 36; i < 45; i++) {
      const it = bot.inventory.slots[i]
      if (!it) { out.push(null); continue }
      const g = enchanted(it) ? 1 : 0, dm = damageOf(it)
      out.push(dm ? [it.name, it.count, g, dm[0], dm[1]] : g ? [it.name, it.count, 1] : [it.name, it.count])
    }
    return out
  }
  // Respawn like the vanilla client: at once with doImmediateRespawn (the server says so with a
  // game_state_change), otherwise the death screen stays up until the stunt "clicks" Respawn
  // (ctx.respawn). mineflayer's own auto-respawn would end every death on the same tick.
  let immediateRespawn = false
  bot._client.on('game_state_change', p => { if (p.reason === 'immediate_respawn' || p.reason === 11) { immediateRespawn = p.gameMode === 1; log('immediate respawn', immediateRespawn) } })
  bot.on('death', () => { died = true; awaitingRespawn = true; deaths++; mark('death'); log('died'); if (immediateRespawn) bot.respawn() })
  // mineflayer stops its physics loop (and physicsTick) while dead; keep ticking so the recording
  // and waitForTicks carry on through the death screen
  const deadClock = setInterval(() => { if (!bot.isAlive) bot.emit('physicsTick') }, 50)
  bot.on('end', () => clearInterval(deadClock))
  // its own flag: a stunt may revive() (clear died) before mineflayer's spawn event arrives
  let awaitingRespawn = false
  bot.on('spawn', () => { if (awaitingRespawn) { awaitingRespawn = false; mark('respawn') } })
  bot.on('health', () => mark('health'))
  // arm swings (place, break, use) for the first-person held-item animation
  const swing0 = bot.swingArm.bind(bot)
  bot.swingArm = (...a) => { mark('swing'); return swing0(...a) }
  // mineflayer + prismarine-item on 1.21.11: an item's 'enchantments' component is not a plain
  // list, so bot.dig / digTime threw "enchantments is not iterable" with an enchanted tool. Make
  // Item#enchants always return [{ name, lvl }] (patched once, on the shared Item prototype).
  const fixEnchants = (item) => {
    const proto = item && Object.getPrototypeOf(item)
    if (!proto || proto.__enchFix) return
    const d = Object.getOwnPropertyDescriptor(proto, 'enchants'); if (!d || !d.get) return
    const orig = d.get
    Object.defineProperty(proto, 'enchants', { configurable: true, get () {
      let v
      try { v = orig.call(this) } catch (e) { v = [] }
      if (Array.isArray(v)) return v
      const list = (v && (v.enchantments || v.levels || v.value)) || []
      const arr = Array.isArray(list) ? list : Object.entries(list).map(([id, lvl]) => ({ id, lvl }))
      return arr.map(e => ({ name: e.name || bot.registry.enchantments?.[e.id]?.name || String(e.id).replace('minecraft:', ''), lvl: e.lvl ?? e.level ?? 1 }))
    } })
    proto.__enchFix = true
  }
  // digging, for the renderer's crack overlay (destroy_stage_0..9): every block_dig packet the bot
  // sends, from bot.dig or written by a stunt. status 0 = start, 1 = cancel, 2 = finish.
  const cwrite0 = bot._client.write.bind(bot._client)
  bot._client.write = (name, data) => {
    if (name === 'block_dig' && data && data.location) {
      const st = typeof data.status === 'number' ? data.status : ({ started: 0, cancelled: 1, finished: 2 })[data.status]
      if (st === 0) {
        let ms = 0
        try { const b = bot.blockAt(new Vec3(data.location.x, data.location.y, data.location.z)); fixEnchants(bot.heldItem); ms = b ? bot.digTime(b) : 0 } catch (e) {}
        if (ms > 50) mark('dig', { x: data.location.x, y: data.location.y, z: data.location.z, ms })
      } else if (st === 1 || st === 2) mark('dig_end')
    }
    return cwrite0(name, data)
  }
  const dig0 = bot.dig.bind(bot)
  bot.dig = (...a) => { fixEnchants(bot.heldItem); return dig0(...a) }
  const digTime0 = bot.digTime.bind(bot)
  bot.digTime = (...a) => { fixEnchants(bot.heldItem); return digTime0(...a) }
  // commands fail silently in a bot's view (unknown game rule, /fill over 32768 blocks...): log
  // every error the server sends back so the logs show it
  bot.on('messagestr', (m) => { if (/Unknown|Incorrect|incomplete|<--\[HERE\]|Too many blocks|cannot|Could not|No entity|Invalid|not loaded/i.test(m)) log('COMMAND ERROR:', m) })
  // real hits on the player: damage type (drives the hurt sound) and hit direction (hurt tilt)
  bot._client.on('damage_event', p => { if (bot.entity && p.entityId === bot.entity.id) mark('hurt', { type: damageTypes[p.sourceTypeId] || 'generic' }) })
  // the death message component ("HelloBuh tried to swim in lava") shown on the death screen
  bot._client.on('death_combat_event', p => {
    let msg = p.message
    try { msg = require('prismarine-nbt').simplify(p.message) } catch (e) {}
    mark('death_message', { message: msg })
  })
  // explosions (TNT, creepers...): the server sends one packet per blast; the client spawns the
  // explosion_emitter particles and plays entity.generic.explode (pitch (1 + (r - r) * 0.2) * 0.7)
  bot._client.on('explosion', p => {
    const c = p.center || {}
    mark('particles', { type: 'explosion', x: +(+c.x).toFixed(3), y: +(+c.y).toFixed(3), z: +(+c.z).toFixed(3), radius: p.radius, blocks: p.blockCount })
    mark('sound', { sound: 'entity.generic.explode', volume: 4, pitch: (1 + (Math.random() - Math.random()) * 0.2) * 0.7 })
  })
  bot._client.on('hurt_animation', p => { if (bot.entity && p.entityId === bot.entity.id) mark('hurt_dir', { yaw: p.yaw }) })

  const ctx = {
    bot, log, sleep, Vec3,
    get died () { return died },
    get deaths () { return deaths },
    revive () { died = false },
    respawn () { bot.respawn() },   // the Respawn button on the death screen
    set immediateRespawn (v) { immediateRespawn = v },   // stunts that set doImmediateRespawn say so too   // for multi-attempt stunts: count a death, then carry on
    get tick () { return tick },
    mark,
    sound: (sound, volume = 1, pitch = 1) => mark('sound', { sound, volume, pitch }),
    // particles for the renderer (renderer/particles.js): splash | block | portal | happy | angry | smoke | explosion
    particles: (type, pos, extra = {}) => mark('particles', { type, x: +pos.x.toFixed(3), y: +pos.y.toFixed(3), z: +pos.z.toFixed(3), ...extra }),
    soundGroup,
    // a teleport during the recording is a camera cut: the 'cut' mark makes the renderer snap to the
    // new spot at any distance (short cuts of 2-3 blocks glided through in-between views: worker 8)
    async cmd (c) {
      if (/^\/(tp|teleport) @s\b/.test(c)) mark('cut')
      // keep_inventory decides whether the HUD hotbar empties on death (edit.py): remember it
      const ki = /^\/gamerule keep_inventory (true|false)/.exec(c)
      if (ki) { ctx.keepInventory = ki[1] === 'true'; mark('keep_inventory', { on: ctx.keepInventory }) }
      bot.chat(c); await bot.waitForTicks(4)
    },
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
      ctx.dayTime = stunt.time ?? 6000   // a stunt can set `time: 18000` (midnight) for night scenes
      ctx.weather = stunt.weather || 'clear'   // `weather: 'rain'` or 'thunder': the renderer draws rain, splashes and the darker sky
      for (const c of [`/time set ${ctx.dayTime}`, `/weather ${ctx.weather}`, '/gamerule advance_time false', '/gamerule advance_weather false',
        '/gamerule send_command_feedback false', '/gamerule spawn_mobs false', '/effect clear @s']) await ctx.cmd(c)
    },
    // Change the weather mid-stunt ('clear' | 'rain' | 'thunder'): the client fades the rain level
    // 0.01 a tick (5 s from clear to full rain), and the renderer follows this mark the same way
    async setWeather (w) { ctx.weather = w; await ctx.cmd(`/weather ${w}`); mark('weather', { weather: w }) },
    // Change the time of day mid-stunt (a story cutting to night): the renderer re-lights from this mark.
    async setTime (n) { ctx.dayTime = n; await ctx.cmd(`/time set ${n}`); mark('time', { time: n }) },
    // Teleport and make sure it stuck (the server can reject a stale move right after a tp).
    async tpCheck (x, y, z, yawDeg = 0, pitchDeg = 0) {
      for (let i = 0; ; i++) {
        await ctx.cmd(`/tp @s ${x} ${y} ${z} ${yawDeg} ${pitchDeg}`)
        await bot.waitForTicks(20)
        // vanilla /tp centres whole-number x/z on the block (+0.5)
        const ex = Number.isInteger(x) ? x + 0.5 : x, ez = Number.isInteger(z) ? z + 0.5 : z
        if (Math.abs(bot.entity.position.y - y) < 0.1 && Math.abs(bot.entity.position.x - ex) < 0.1 && Math.abs(bot.entity.position.z - ez) < 0.1) return
        if (i === 4) throw new Error('teleport did not stick')
        log('teleport did not stick, retrying')
      }
    }
  }

  // mineflayer can miss the block updates of big /fills: the server says "Successfully filled 12794
  // blocks" but bot.world still has the old hills. The bot then collides with ghost terrain, and
  // the recording's chunk snapshot (taken from bot.world) renders it (worker 4, ladder_clutch).
  // Going far away and back makes the server resend every chunk. The bot returns to its exact
  // start (position, look and game mode); the chunks are reloaded around the set's centre.
  let hubColumns = new Map()
  async function refreshChunks (set) {
    const pos = bot.entity.position.clone()
    const yawDeg = 180 - bot.entity.yaw * 180 / Math.PI, pitchDeg = -bot.entity.pitch * 180 / Math.PI
    const gm = bot.game.gameMode || 'survival'
    await ctx.cmd('/gamemode creative')
    await ctx.cmd(`/tp @s ${(pos.x + 3000).toFixed(2)} 250 ${pos.z.toFixed(2)}`)
    await bot.waitForTicks(40)
    await ctx.cmd(`/tp @s ${set.x + 0.5} ${Math.max(pos.y, set.y + 60).toFixed(2)} ${set.z + 0.5}`)
    try { await bot.waitForChunksToLoad() } catch (e) {}
    await bot.waitForTicks(30)
    // snapshot the world around the set's centre now: back at the start the bot may be too far from
    // the far end of a multi-set stunt, and the server unloads those chunks (clutch_harder's last set
    // rendered over the void). startRecording merges these with what's loaded then.
    hubColumns = new Map()
    for (const { chunkX, chunkZ, column } of bot.world.getColumns()) hubColumns.set(`${chunkX},${chunkZ}`, { x: Number(chunkX) * 16, z: Number(chunkZ) * 16, chunk: column.toJson() })
    await bot.waitForTicks(30)
    await ctx.cmd(`/tp @s ${pos.x.toFixed(3)} ${pos.y.toFixed(3)} ${pos.z.toFixed(3)} ${yawDeg.toFixed(2)} ${pitchDeg.toFixed(2)}`)
    await bot.waitForTicks(10)
    await ctx.cmd(`/gamemode ${gm}`)
    await bot.waitForTicks(10)
    const d = bot.entity.position.distanceTo(pos)
    log('chunks refreshed; back at start within', d.toFixed(2), 'blocks')
    if (d > 0.6) throw new Error('chunk refresh: could not return to the start position')
  }

  function startRecording (set) {
    const columns = []
    const R = stunt.recordRadius || RADIUS   // big builds: a stunt can widen it (with renderDistance to match)
    const have = new Set()
    for (const { chunkX, chunkZ, column } of bot.world.getColumns()) {
      const x = Number(chunkX), z = Number(chunkZ)
      if (Math.abs(x * 16 + 8 - set.x) <= R && Math.abs(z * 16 + 8 - set.z) <= R) { columns.push({ x: x * 16, z: z * 16, chunk: column.toJson() }); have.add(`${chunkX},${chunkZ}`) }
    }
    // + the refresh's snapshot around the set's centre, for chunks unloaded since (see refreshChunks)
    for (const [k, c] of hubColumns) if (!have.has(k) && Math.abs(c.x + 8 - set.x) <= R && Math.abs(c.z + 8 - set.z) <= R) columns.push(c)
    rec = { version: bot.version, stunt: stunt.name, set, time: ctx.dayTime ?? 6000, keepInventory: !!ctx.keepInventory, weather: ctx.weather || 'clear', dimension: String((bot.game && bot.game.dimension) || 'overworld').replace(/^minecraft:/, ''), columns, poses: [], blocks: [], entities: [] }
    tick = 0; recording = true
    let walked = 0, rainLevel = ctx.weather && ctx.weather !== 'clear' ? 1 : 0, rainSoundTime = 0
    const onTick = () => {
      const e = bot.entity
      const prev = rec.poses[rec.poses.length - 1]
      onEntities()
      // rain sound (LevelRenderer.tickRain): a chance each tick, random.nextInt(3) < rainSoundTime++,
      // plays weather.rain (0.2, pitch 1) where the splashes land, or weather.rain.above (0.1, pitch 0.5)
      // under a roof. The level fades 0.01 a tick like ClientLevel.
      rainLevel = Math.max(0, Math.min(1, rainLevel + ((ctx.weather && ctx.weather !== 'clear') ? 0.01 : -0.01)))
      if (rainLevel > 0 && Math.floor(Math.random() * 3) < rainSoundTime++) {
        rainSoundTime = 0
        let roof = false
        for (let y = Math.floor(e.position.y) + 2; y < Math.floor(e.position.y) + 40 && !roof; y++) { const b = bot.blockAt(e.position.offset(0, y - e.position.y, 0)); if (b && b.boundingBox === 'block') roof = true }
        if (roof) ctx.sound('weather.rain.above', 0.1 * rainLevel, 0.5)
        else ctx.sound('weather.rain', 0.2 * rainLevel, 1)
      }
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
    // Entities near the set, every tick: [tick, id, name, x, y, z, yaw, pitch, headYaw, extra]
    const headYaw = {}, objData = {}
    const onHead = (d) => { headYaw[d.entityId] = -(d.headYaw / 256) * Math.PI * 2 + Math.PI }   // to mineflayer yaw convention
    const onSpawn = (d) => { objData[d.entityId] = d.objectData }
    bot._client.on('entity_head_rotation', onHead); bot._client.on('spawn_entity', onSpawn)
    // block entities for the renderer: data updates (sign text set during the stunt) and block
    // actions (a chest lid opening: action 1, b = players looking in)
    const onBE = (d) => { if (d.location) mark('block_entity', { x: d.location.x, y: d.location.y, z: d.location.z, nbt: d.nbtData || null }) }
    const onBA = (d) => { if (d.location) mark('block_action', { x: d.location.x, y: d.location.y, z: d.location.z, a: d.byte1, b: d.byte2 }) }
    bot._client.on('tile_entity_data', onBE); bot._client.on('block_action', onBA)
    // client-side effects the server only signals: a splash potion breaking (LevelEvent 2002/2007,
    // data = colour) and a firework exploding (entity status 17); the renderer spawns their particles
    const SHAPES = ['small_ball', 'large_ball', 'star', 'creeper', 'burst']
    const explosionsOf = (it) => {
      const out = []
      const walk = (o) => {
        if (!o || typeof o !== 'object') return
        if (Array.isArray(o.colors) && o.colors.every(c => typeof c === 'number')) { out.push({ shape: typeof o.shape === 'number' ? SHAPES[o.shape] : String(o.shape || 'small_ball'), colors: o.colors }); return }
        for (const v of Object.values(o)) walk(v)
      }
      walk(it)
      return out
    }
    const fwData = {}
    const onWE = (d) => { if ((d.effectId === 2002 || d.effectId === 2007) && d.location) mark('particles', { type: 'potion', x: d.location.x + 0.5, y: d.location.y, z: d.location.z + 0.5, color: d.data, instant: d.effectId === 2007 }) }
    const onES = (d) => {
      const e = bot.entities[d.entityId]
      if (d.entityStatus === 17 && e && e.name === 'firework_rocket') mark('particles', { type: 'firework', x: +e.position.x.toFixed(3), y: +e.position.y.toFixed(3), z: +e.position.z.toFixed(3), explosions: fwData[e.id] || [] })
    }
    bot._client.on('world_event', onWE); bot._client.on('entity_status', onES)
    const onEntities = () => {
      for (const e of Object.values(bot.entities)) {
        if (e === bot.entity || !e.position || e.position.distanceTo(bot.entity.position) > 64) continue
        let extra = null
        if (e.name === 'villager' || e.name === 'zombie_villager') { const vd = (e.metadata || []).find(m => m && typeof m === 'object' && 'villagerProfession' in m); if (vd) extra = { type: vd.villagerType, profession: vd.villagerProfession } }
        if (e.name === 'falling_block') extra = { state: objData[e.id] }
        if (e.name === 'enderman' && e.metadata && typeof e.metadata[16] === 'number' && e.metadata[16] > 0) extra = { carried: e.metadata[16] }   // EnderMan.DATA_CARRY_STATE (block state id)
        if (e.name === 'item_frame' || e.name === 'glow_item_frame') {   // 1.21.11 metadata: 8 = direction (3D id), 9 = item, 10 = rotation (0-7)
          const it = (e.metadata || []).find(m => m && typeof m === 'object' && 'itemId' in m)
          const md = e.metadata || []
          extra = { dir: typeof md[8] === 'number' ? md[8] : (e.objectData ?? objData[e.id]), item: it ? bot.registry.items[it.itemId]?.name : null, rot: typeof md[10] === 'number' ? md[10] : 0 }
        }
        if (e.name === 'firework_rocket' && !fwData[e.id]) { const it = (e.metadata || []).find(m => m && typeof m === 'object' && 'itemId' in m); if (it) fwData[e.id] = explosionsOf(it) }
        if ((e.name === 'slime' || e.name === 'magma_cube') && e.metadata && typeof e.metadata[16] === 'number') extra = { size: e.metadata[16] }   // Slime.ID_SIZE
        if (/_boat$/.test(e.name) && e.metadata && (e.metadata[11] || e.metadata[12])) extra = { paddle: [!!e.metadata[11], !!e.metadata[12]] }   // AbstractBoat DATA_ID_PADDLE_LEFT / RIGHT
        if (e.name === 'tnt' && e.metadata && e.metadata[8] !== undefined) extra = { fuse: e.metadata[8] }
        if (e.name === 'sheep' && e.metadata) {   // Sheep DATA_WOOL_ID (17): colour in the low 4 bits, 0x10 = sheared; a sheep named jeb_ cycles colours
          const w = e.metadata[17] || 0
          extra = { color: w & 15, sheared: !!(w & 16), baby: !!e.metadata[16], jeb: JSON.stringify(e.metadata[2] || '').includes('jeb_') }
        }   // PrimedTnt fuse (ticks left)
        {   // a custom name (name tag, /summon CustomName): the renderer draws it when the crosshair is on
          // the mob, or always with CustomNameVisible (Mob.shouldShowName); metadata 2 = name, 3 = visible
          const nm = plainName(e.metadata && e.metadata[2])
          if (nm && e.name !== 'item') extra = { ...(extra || {}), name: nm, nameVisible: !!(e.metadata && e.metadata[3]) }
        }
        if (e.name === 'item') { const it = (e.metadata || []).find(m => m && typeof m === 'object' && 'itemId' in m); if (it) { extra = { item: bot.registry.items[it.itemId]?.name }; if (JSON.stringify(it.components || '').includes('enchant')) extra.glint = true } }
        rec.entities.push([tick, e.id, e.name, +e.position.x.toFixed(3), +e.position.y.toFixed(3), +e.position.z.toFixed(3), +e.yaw.toFixed(4), +e.pitch.toFixed(4), headYaw[e.id] !== undefined ? +headYaw[e.id].toFixed(4) : null, extra])
      }
    }
    // hotbar contents for the HUD, whenever an inventory slot in the hotbar changes
    let lastBar = ''
    const onSlot = (slot) => { if (slot >= 36 && slot < 45) { const h = hotbarNames(); if (JSON.stringify(h) !== lastBar) { lastBar = JSON.stringify(h); mark('hotbar', { items: h }) } } }
    bot.on('physicsTick', onTick); bot.on('blockUpdate', onBlock); bot.inventory.on('updateSlot', onSlot)
    lastBar = JSON.stringify(hotbarNames())
    mark('hotbar', { items: hotbarNames() })
    return () => { bot.removeListener('physicsTick', onTick); bot.removeListener('blockUpdate', onBlock); bot.inventory.removeListener('updateSlot', onSlot); bot._client.removeListener('entity_head_rotation', onHead); bot._client.removeListener('spawn_entity', onSpawn); bot._client.removeListener('tile_entity_data', onBE); bot._client.removeListener('block_action', onBA); bot._client.removeListener('world_event', onWE); bot._client.removeListener('entity_status', onES); recording = false }
  }

  try {
    await ctx.cmd('/gamemode creative')
    if (stunt.biome) await ctx.locateBiome(stunt.biome)
    const set = await stunt.setup(ctx)
    // no stray drops from the set-up (the bot picked them up mid-stunt: mystery hotbar stacks)
    bot.chat('/kill @e[type=item]'); await bot.waitForTicks(4)
    log('set at', set)
    if (!stunt.noChunkRefresh) await refreshChunks(set)
    const stop = startRecording(set)
    // pre-roll: snapshotting the world blocks the event loop, so the first ticks arrived in bursts and
    // every recording's first ~0.5 s stuttered (move 1 tick, hold 3: worker 4). Let it settle, then
    // mark 'start' (edit_args trims to it when a stunt sets no start of its own).
    await bot.waitForTicks(15)
    mark('start')
    const ok = (await stunt.perform(ctx)) && (stunt.expectDeath ? died : !died)
    mark('end')
    stop()
    await bot.waitForTicks(10)
    log(ok ? 'STUNT OK' : 'STUNT FAILED')
    if (process.env.RECORD) fs.writeFileSync(process.env.RECORD, JSON.stringify({ ...rec, timeline }))
    bot.quit(); await sleep(500); process.exit(ok ? 0 : 1)
  } catch (e) { log('script error', e); process.exit(3) }
}

// a text component (JSON string, plain object or NBT) as plain text
function plainName (v) {
  if (v === null || v === undefined || v === false) return null
  if (typeof v === 'string') { try { return plainName(JSON.parse(v)) } catch { return v || null } }
  if (typeof v !== 'object') return null
  if (v.type === 'string' && typeof v.value === 'string') return v.value || null
  if (v.type === 'compound' && v.value) return plainName(v.value)
  let out = ''
  if (v.text !== undefined) out += plainName(v.text) || ''
  if (v[''] !== undefined) out += plainName(v['']) || ''
  for (const x of (Array.isArray(v.extra) ? v.extra : v.extra && v.extra.value && v.extra.value.value) || []) out += plainName(x) || ''
  return out || null
}

module.exports = { run }
