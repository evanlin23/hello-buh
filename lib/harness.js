// Shared bot harness: connects to the local server, finds a spot in a biome, and records
// everything the renderer, the HUD and the audio need while a stunt module performs:
//   chunk snapshot, POV pose per tick, block changes, hotbar contents, sound events.
// A stunt module exports { biome, setup(ctx) -> {x, y, z}, perform(ctx) -> ok:boolean }.
// usage: STUNT=water_clutch RECORD=work/x.rec.json node bot.js
const fs = require('fs')
const path = require('path')
const mineflayer = require('mineflayer')
const { Vec3 } = require('vec3')
const { potionColor, TINTED } = require('./potion_color')
const SETTLE = require('./settle')
const RIDING = require('./riding')
const SL = require('./sound_level')
const { tooltipLines } = require('./tooltip')

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
  const NAME = process.env.BOT_NAME || stunt.botName || '56e'   // the owner's real username (2026-11-11, r:re5019b; was 'HelloBuh'). botName: 'Buh' (the hero, owner 2026-11-10; 'Milo' in older stories; ops: make_ops.py)
  const RADIUS = Number(process.env.RECORD_RADIUS || 160)
  const bot = mineflayer.createBot({ host: '127.0.0.1', port: Number(process.env.MC_PORT || 25565), username: NAME, auth: 'offline', viewDistance: 12, respawn: false, version: process.env.MC_VERSION || '1.21.11' })
  // the data-driven trim registries (registry_data in the configuration phase): holder id -> name, for armour trims
  const TRIM_REG = { trim_pattern: [], trim_material: [] }
  bot._client.on('registry_data', (p) => { const c = p.codec || p, k = String(c.id || '').replace('minecraft:', ''); if (TRIM_REG[k] && Array.isArray(c.entries)) TRIM_REG[k] = c.entries.map(e => String(e.key).replace('minecraft:', '')) })
  bot._trimReg = TRIM_REG
  // damage type names in registry order (sent during configuration), for the damage_event packet
  const damageTypes = []
  bot._client.on('registry_data', p => { if (/damage_type$/.test(p.id || '')) for (const e of p.entries || []) damageTypes.push(String(e.key).replace('minecraft:', '')) })
  bot.on('kicked', r => { log('kicked', r); process.exit(2) })
  bot.on('error', e => { log('error', e); process.exit(2) })
  // the connection can end without a kick or an error (a second login after a crash, an overloaded
  // server): with nothing left on the event loop node then exited 0 silently, and run.sh rendered the
  // stale recording from an earlier run as if it were new (worker 3). Any end before the script's own quit fails.
  let quitting = false
  // run.sh kills a bot that runs past BOT_TIMEOUT / stunt.botTimeout with SIGTERM: say so (the pipeline test's
  // "silent bot timeout" was this, a story whose set-up + perform ran past the default 180 s)
  let phase = 'connecting'
  process.on('SIGTERM', () => { log(`KILLED (SIGTERM, run.sh's timeout: BOT_TIMEOUT or the stunt's botTimeout) during ${phase}${recording ? ` (recording tick ${tick}, ${(tick / 20).toFixed(1)} s)` : ''}`); process.exit(143) })
  bot.on('end', r => { if (!quitting) { log('connection ended', r); process.exit(4) } })
  process.on('beforeExit', () => { if (!quitting) { log('event loop emptied before the stunt finished'); process.exit(5) } })
  // a retry can log in as the dead player the last attempt left behind: respawn it, or 'spawn' never comes
  bot._client.once('update_health', p => { if (p.health <= 0) bot._client.write('client_command', bot.supportFeature('respawnIsPayload') ? { payload: 0 } : { actionId: 0 }) })
  await new Promise(r => bot.once('spawn', r))
  log('spawned at', bot.entity.position)
  const joinPos = bot.entity.position.clone()   // the world spawn's chunks were generated when we joined: a cheap far spot
  // mineflayer's waitForTicks counts physics ticks and gives up after ticks * 50 ms + 5 s. Physics doesn't tick
  // while the chunk under the bot isn't loaded, which is every far /tp until the server has generated it: 1 in
  // 2-3 attempts died in set-up with "Timeout waiting for 2 ticks" right after the biome search's teleport
  // (story_nitwit pipeline test). Here the 5 s only runs while that chunk is loaded; an unloaded one gets up to
  // 60 s, then a clear error (run.sh retries).
  bot.waitForTicks = (ticks) => {
    if (!(ticks > 0)) return Promise.resolve()
    return new Promise((resolve, reject) => {
      let left = ticks, last = Date.now(), waitedChunk = 0
      const loaded = () => !!(bot.entity && bot.entity.position && bot.blockAt(bot.entity.position) != null)
      const done = () => { clearInterval(iv); bot.removeListener('physicsTick', onTick) }
      const onTick = () => { last = Date.now(); if (--left <= 0) { done(); resolve() } }
      const iv = setInterval(() => {
        const idle = Date.now() - last
        if (!loaded()) {
          if (!waitedChunk) { waitedChunk = Date.now(); log(`waiting for the chunk under the bot (${bot.entity && bot.entity.position ? bot.entity.position.floored() : '?'})`) }
          if (Date.now() - waitedChunk < 60000) { last = Date.now(); return }
          done(); reject(new Error(`the chunk under the bot (${bot.entity.position.floored()}) did not load within 60 s (after a teleport?)`)); return
        }
        if (waitedChunk) { log(`chunk loaded after ${((Date.now() - waitedChunk) / 1000).toFixed(1)} s`); waitedChunk = 0 }
        if (idle > ticks * 50 + 5000) { done(); reject(new Error(`Timeout waiting for ${ticks} ticks: no physics tick for ${(idle / 1000).toFixed(1)} s with the chunk loaded`)) }
      }, 100)
      bot.on('physicsTick', onTick)
    })
  }

  let rec = null, tick = 0, recording = false, died = false, deaths = 0
  let lastBoom = -1e9, lastDeath = -1e9   // ticks of the last explosion / mob death (lib/settle.js)
  const timeline = []
  // max health on every mark (the HUD draws ceil(max / 2) heart containers)
  const maxHealth = () => { try { const a = bot.entity && bot.entity.attributes; const k = a && Object.keys(a).find(n => /max_health$/.test(n)); return k ? a[k].value : 20 } catch (e) { return 20 } }
  const mark = (event, extra = {}) => { if (recording) { const mh = maxHealth(); timeline.push({ t: tick * 50, event, slot: bot.quickBarSlot, health: bot.health, max_health: mh, ...extra }) } }
  // riders and leads, from before the set-up (a boat summoned with its rider in set-up: docs/engine_features.md
  // "Boats, leads and passengers"). mineflayer reads attach_entity as a mount, but since 1.9 it is the LEAD packet
  // (ClientboundSetEntityLinkPacket: leashed id, holder id or 0), so its entity.vehicle can't be trusted: keep our own.
  const RIDE = new Map()    // vehicle id -> passenger ids (set_passengers, in order)
  const LEASH = new Map()   // leashed id -> holder id
  bot._client.on('set_passengers', ({ entityId, passengers }) => { if (passengers && passengers.length) RIDE.set(entityId, passengers.slice()); else RIDE.delete(entityId) })
  bot._client.on('attach_entity', ({ entityId, vehicleId }) => {
    const h = vehicleId > 0 ? vehicleId : null
    if (h) LEASH.set(entityId, h); else LEASH.delete(entityId)
    if (recording) mark('leash', { id: entityId, holder: h === (bot.entity && bot.entity.id) ? 'self' : h })
  })
  bot._client.on('entity_destroy', ({ entityIds }) => { for (const id of entityIds || []) { RIDE.delete(id); if (LEASH.has(id) && recording) mark('leash', { id, holder: null }); LEASH.delete(id) } })
  bot._ride = RIDE; bot._leash = LEASH
  // hotbar as [name, count] (null for empty slots)
  // [name, count] per hotbar slot, plus a third element 1 for an enchanted stack (the renderer draws the glint)
  const enchanted = (it) => { try { return !!(it && ((it.enchants && it.enchants.length) || JSON.stringify(it.components || it.nbt || '').includes('enchant'))) } catch (e) { return false } }
  // ... and, for a damaged tool, [name, count, glint 0|1, damage, maxDamage] (the HUD's durability bar)
  const damageOf = (it) => { try { const max = bot.registry.items[it.type]?.maxDurability; const d = it.durabilityUsed; return max && d > 0 ? [d, max] : null } catch (e) { return null } }
  // ... and, for a potion, splash/lingering potion or tipped arrow, [name, count, glint, damage, maxDamage, 0xRRGGBB]: the
  // potion_contents colour (lib/potion_color.js) edit.py tints the potion overlay with. Older recordings have no 6th
  // element and draw as before.
  const potionTint = (it) => { try { if (!it || !TINTED.test(it.name)) return null; const c = (it.components || []).find(x => x && /potion_contents$/.test(String(x.type))); return potionColor(c ? c.data : null) } catch (e) { return null } }
  const hotbarNames = () => {
    const out = []
    for (let i = 36; i < 45; i++) {
      const it = bot.inventory.slots[i]
      if (!it) { out.push(null); continue }
      const g = enchanted(it) ? 1 : 0, dm = damageOf(it), pt = potionTint(it)
      out.push(pt !== null ? [it.name, it.count, g, dm ? dm[0] : 0, dm ? dm[1] : 0, pt] : dm ? [it.name, it.count, g, dm[0], dm[1]] : g ? [it.name, it.count, 1] : [it.name, it.count])
    }
    return out
  }
  // Respawn like the vanilla client: at once with doImmediateRespawn (the server says so with a
  // game_state_change), otherwise the death screen stays up until the stunt "clicks" Respawn
  // (ctx.respawn). mineflayer's own auto-respawn would end every death on the same tick.
  let immediateRespawn = false
  bot._client.on('game_state_change', p => { if (p.reason === 'immediate_respawn' || p.reason === 11) { immediateRespawn = p.gameMode === 1; log('immediate respawn', immediateRespawn) } })
  // experience (set_experience): the HUD's XP bar and level number (fortune: the bar never filled)
  bot.on('experience', () => { const x = bot.experience || {}; mark('xp', { level: x.level || 0, progress: x.progress || 0, points: x.points || 0 }) })
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
      } else if (st === 1 || st === 2) mark('dig_end', { ok: st === 2 })   // ok: finished (the block broke), not cancelled
    }
    return cwrite0(name, data)
  }
  const dig0 = bot.dig.bind(bot)
  bot.dig = (...a) => { fixEnchants(bot.heldItem); return dig0(...a) }
  const digTime0 = bot.digTime.bind(bot)
  bot.digTime = (...a) => { fixEnchants(bot.heldItem); return digTime0(...a) }
  // commands fail silently in a bot's view (unknown game rule, /fill over 32768 blocks...): log
  // every error the server sends back so the logs show it
  // During set-up (before the recording starts) an error fails the attempt: a /fill that hit unloaded chunks
  // ("That position is not loaded") left a hill standing in story_nitwit's set and the recording carried on.
  // Benign ones only warn: /kill with nothing to kill, /setblock to the block already there, a /fill that
  // changed nothing. Opt out per command with ctx.cmd(c, { mayFail: true }), for a whole stunt with
  // `allowSetupErrors: true`, or ALLOW_SETUP_ERRORS=1.
  const BENIGN = /No entity was found|Could not set the block|No blocks were filled|Nothing changed|could not find a/i
  // (a reply can come a few ticks after ctx.cmd's 4-tick wait: a mayFail command waits 10 and excuses errors up to
  // 1 s after it returns; the 'last ctx.cmd' in the log is only the latest command sent, not proof of the culprit)
  let lastCmd = null, mayFailUntil = 0
  const setupErrors = []
  bot.on('messagestr', (m) => {
    if (!/Unknown|Incorrect|incomplete|<--\[HERE\]|Too many blocks|cannot|Could not|No entity|Invalid|not loaded/i.test(m)) return
    log('COMMAND ERROR:', m, lastCmd ? `(last ctx.cmd: ${lastCmd})` : '')
    if (recording || Date.now() < mayFailUntil || BENIGN.test(m) || stunt.allowSetupErrors || process.env.ALLOW_SETUP_ERRORS === '1') return
    setupErrors.push(`${m}${lastCmd ? ` (last ctx.cmd: ${lastCmd})` : ''}`)
  })
  const checkSetup = () => {
    if (!setupErrors.length) return
    const e = new Error(`set-up command failed: ${setupErrors[0]}${setupErrors.length > 1 ? ` (+${setupErrors.length - 1} more)` : ''}. ` +
      'The set would be broken: stopping this attempt. (ctx.cmd(c, { mayFail: true }) for a command that is expected to fail)')
    e.setupFailed = true
    throw e
  }
  // real hits on the player: damage type (drives the hurt sound) and hit direction (hurt tilt)
  bot._client.on('damage_event', p => {
    if (bot.entity && p.entityId === bot.entity.id) mark('hurt', { type: damageTypes[p.sourceTypeId] || 'generic' })
    else mark('mob_hurt', { id: p.entityId })   // another entity hit: its red flash (hurtTime 10)
  })
  // the death message component ("HelloBuh tried to swim in lava") shown on the death screen
  bot._client.on('death_combat_event', p => {
    let msg = p.message
    try { msg = require('prismarine-nbt').simplify(p.message) } catch (e) {}
    mark('death_message', { message: msg })
  })
  // explosions (TNT, creepers...): the server sends one packet per blast; the client spawns the
  // explosion_emitter particles and plays entity.generic.explode (pitch (1 + (r - r) * 0.2) * 0.7)
  bot._client.on('explosion', p => {
    lastBoom = tick   // lib/settle.js: the harness waits for the payoff to settle after perform
    const c = p.center || {}
    mark('particles', { type: 'explosion', x: +(+c.x).toFixed(3), y: +(+c.y).toFixed(3), z: +(+c.z).toFixed(3), radius: p.radius, blocks: p.blockCount, particle: p.explosionParticle && p.explosionParticle.type, ...(p.playerKnockback ? { kb: [p.playerKnockback.x, p.playerKnockback.y, p.playerKnockback.z].map(v => +(+v).toFixed(4)) } : {}) })
    mark('sound', { sound: 'entity.generic.explode', volume: 4, pitch: (1 + (Math.random() - Math.random()) * 0.2) * 0.7 })
  })
  // the bot's own status effects (renderer: darkness pulses the lightmap and pulls the fog in)
  const effName = (id) => String((bot.registry.effects[id] || {}).name || id).replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
  bot._client.on('entity_effect', p => { if (bot.entity && p.entityId === bot.entity.id) mark('effect', { effect: effName(p.effectId), amp: p.amplifier, dur: p.duration }) })
  bot._client.on('remove_entity_effect', p => { if (bot.entity && p.entityId === bot.entity.id) mark('effect_end', { effect: effName(p.effectId) }) })
  bot._client.on('hurt_animation', p => { if (bot.entity && p.entityId === bot.entity.id) mark('hurt_dir', { yaw: p.yaw }) })

  const ctx = {
    bot, log, sleep, Vec3,
    stunt,   // the stunt module itself (lib/movie.js reads stunt.shots)
    get died () { return died },
    get deaths () { return deaths },
    revive () { died = false },
    respawn () { bot.respawn() },   // the Respawn button on the death screen
    set immediateRespawn (v) { immediateRespawn = v },   // stunts that set doImmediateRespawn say so too   // for multi-attempt stunts: count a death, then carry on
    get tick () { return tick },
    mark,
    // a sound for the mix (audio.py): its level is volume x the event's sounds.json file volume (lib/sound_level.js).
    // o.key: the sound the moment hangs on (raised to at least the game's own volume; scripts/sound_levels.py checks it)
    sound: (sound, volume = 1, pitch = 1, o = {}) => {
      if (o.key) volume = SL.keyVolume(sound, volume)
      const w = SL.warning(sound, volume, !!o.key)
      if (w) log(`WARN ${w}`)
      mark('sound', { sound, volume, pitch, ...(o.key ? { key: true } : {}) })
    },
    // a vanilla sound at the volume the game itself plays it (the raid horn at 64: its file volume is 0.01)
    vanillaSound: (sound, pitch = 1, o = {}) => ctx.sound(sound, o.volume === undefined ? SL.vanillaVolume(sound) : o.volume, pitch, o),
    // particles for the renderer (renderer/particles.js): splash | block | portal | happy | angry | smoke | poof | explosion
    particles: (type, pos, extra = {}) => mark('particles', { type, x: +pos.x.toFixed(3), y: +pos.y.toFixed(3), z: +pos.z.toFixed(3), ...extra }),
    soundGroup,
    // a teleport during the recording is a camera cut: the 'cut' mark makes the renderer snap to the
    // new spot at any distance (short cuts of 2-3 blocks glided through in-between views: worker 8)
    async cmd (c, { mayFail = false } = {}) {
      if (/^\/(tp|teleport) @s\b/.test(c)) mark('cut')
      // keep_inventory decides whether the HUD hotbar empties on death (edit.py): remember it
      const ki = /^\/gamerule keep_inventory (true|false)/.exec(c)
      if (ki) { ctx.keepInventory = ki[1] === 'true'; mark('keep_inventory', { on: ctx.keepInventory }) }
      if (!recording) checkSetup()   // an error from an earlier command (bot.chat'd ones too) stops here
      lastCmd = c.length > 80 ? c.slice(0, 77) + '...' : c
      if (mayFail) mayFailUntil = Infinity
      bot.chat(c); await bot.waitForTicks(mayFail ? 10 : 4)
      if (mayFail) mayFailUntil = Date.now() + 1000
      else if (!recording) checkSetup()
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
    // Look at a point (eased), mineflayer yaw/pitch convention. From the eye the renderer draws: 1.27 while sneaking
    // (from 1.62 the look landed 0.35 blocks low)
    async easeLookAt (p, ms) {
      const eye = bot.entity.position.offset(0, bot.controlState.sneak ? 1.27 : 1.62, 0)
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
      await ctx.waitChunks()
      return loc
    },
    // Wait until every chunk of an area is in (the bot has it, so the server has it loaded): after a far /tp the
    // server generates them first. mineflayer's waitForChunksToLoad looks at 5x5 chunks around the bot and gives up
    // after 10 s; a set's /fills reach 64-80 blocks out, and right after the biome teleport the far edge wasn't
    // loaded ("That position is not loaded", story_nitwit). area: { x0, z0, x1, z1 } in blocks (default: 2 chunks
    // around the bot). Up to `ms`, then a clear error (the attempt fails, run.sh retries).
    async waitChunks (area = null, ms = 60000) {
      const p = bot.entity.position
      const a = area || { x0: p.x - 32, z0: p.z - 32, x1: p.x + 32, z1: p.z + 32 }
      const missing = () => {
        const out = []
        for (let cx = Math.floor(Math.min(a.x0, a.x1) / 16); cx <= Math.floor(Math.max(a.x0, a.x1) / 16); cx++) {
          for (let cz = Math.floor(Math.min(a.z0, a.z1) / 16); cz <= Math.floor(Math.max(a.z0, a.z1) / 16); cz++) if (!bot.world.getColumnAt(new Vec3(cx * 16, 0, cz * 16))) out.push(`${cx},${cz}`)
        }
        return out
      }
      const t0 = Date.now()
      let told = false
      for (;;) {
        const m = missing()
        if (!m.length) { if (told) log(`chunks loaded after ${((Date.now() - t0) / 1000).toFixed(1)} s`); return }
        if (Date.now() - t0 > ms) throw new Error(`${m.length} chunks of the set (first ${m[0]}) still not loaded after ${ms / 1000} s (server overloaded? the set too far from the bot?)`)
        if (!told) { told = true; log(`waiting for ${m.length} chunks of the set to load`) }
        await sleep(250)
      }
    },
    // Keep an area's chunks loaded (and generated) on the server for the whole attempt: /forceload add, in boxes of at
    // most 256 chunks. Cast parked in an unloaded chunk vanish (dog_hill: the park 300 blocks out had no cast at all),
    // and a far set's /fills fail. Then waits for the bot to have them. area: { x0, z0, x1, z1 } in blocks.
    async forceload (area, ms = 120000) {
      const cx0 = Math.floor(Math.min(area.x0, area.x1) / 16), cx1 = Math.floor(Math.max(area.x0, area.x1) / 16)
      const cz0 = Math.floor(Math.min(area.z0, area.z1) / 16), cz1 = Math.floor(Math.max(area.z0, area.z1) / 16)
      for (let a = cx0; a <= cx1; a += 16) for (let b = cz0; b <= cz1; b += 16) {
        await ctx.cmd(`/forceload add ${a * 16} ${b * 16} ${Math.min(cx1, a + 15) * 16} ${Math.min(cz1, b + 15) * 16}`, { mayFail: true })
      }
      log(`forceloaded ${(cx1 - cx0 + 1) * (cz1 - cz0 + 1)} chunks`)
      await ctx.waitChunks(area, ms)
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
    // out of range and back. Out to fresh terrain 3000 blocks away, the server had to generate ~600 chunks there and
    // fell behind: the bot's tick wait timed out on most first attempts (docs/runs/2026-11-10_dog_hill.md). Where we
    // joined (already generated) is used when it's far enough (2 view distances + a margin); else the old far spot,
    // waited for on the wall clock (the chunk under the bot, then the set's chunks), never on ticks.
    const vd = 12 * 16 * 2 + 64, far = Math.hypot(joinPos.x - set.x, joinPos.z - set.z) >= vd
    const away = far ? joinPos : pos.offset(3000, 0, 0)
    await ctx.cmd(`/tp @s ${away.x.toFixed(2)} 250 ${away.z.toFixed(2)}`)
    await ctx.waitChunks({ x0: away.x - 8, z0: away.z - 8, x1: away.x + 8, z1: away.z + 8 }, 120000)
    await sleep(far ? 1000 : 3000)
    await ctx.cmd(`/tp @s ${set.x + 0.5} ${Math.max(pos.y, set.y + 60).toFixed(2)} ${set.z + 0.5}`)
    await ctx.waitChunks({ x0: set.x - 48, z0: set.z - 48, x1: set.x + 48, z1: set.z + 48 }, 120000).catch(e => log('refresh:', e.message))
    try { await bot.waitForChunksToLoad() } catch (e) {}
    await bot.waitForTicks(30)
    // snapshot the world around the set's centre now: back at the start the bot may be too far from
    // the far end of a multi-set stunt, and the server unloads those chunks (clutch_harder's last set
    // rendered over the void). startRecording merges these with what's loaded then.
    hubColumns = new Map()
    for (const { chunkX, chunkZ, column } of bot.world.getColumns()) hubColumns.set(`${chunkX},${chunkZ}`, { x: Number(chunkX) * 16, z: Number(chunkZ) * 16, chunk: column.toJson() })
    // a stunt spread wider than the view distance (clutch_harder's 7 sets over 240 blocks) names extra
    // stops: each one's chunks are loaded and merged in too (the last set was still over the void)
    for (const st of (stunt.chunkStops ? stunt.chunkStops(set) : [])) {
      await ctx.cmd(`/tp @s ${st.x + 0.5} ${Math.max(pos.y, set.y + 60).toFixed(2)} ${st.z + 0.5}`)
      try { await bot.waitForChunksToLoad() } catch (e) {}
      await bot.waitForTicks(30)
      for (const { chunkX, chunkZ, column } of bot.world.getColumns()) { const k = `${chunkX},${chunkZ}`; if (!hubColumns.has(k)) hubColumns.set(k, { x: Number(chunkX) * 16, z: Number(chunkZ) * 16, chunk: column.toJson() }) }
    }
    await bot.waitForTicks(30)
    await ctx.cmd(`/tp @s ${pos.x.toFixed(3)} ${pos.y.toFixed(3)} ${pos.z.toFixed(3)} ${yawDeg.toFixed(2)} ${pitchDeg.toFixed(2)}`)
    await bot.waitForTicks(10)
    await ctx.cmd(`/gamemode ${gm}`)
    await bot.waitForTicks(10)
    const d = bot.entity.position.distanceTo(pos)
    log('chunks refreshed; back at start within', d.toFixed(2), 'blocks')
    if (d > 0.6) throw new Error('chunk refresh: could not return to the start position')
  }

  // stunt.lerpMobs (opt-in, lib/cells.js): a mob's position as the vanilla client draws it. The server's tracker sends
  // a mob's move only every 3rd tick, and the client eases toward each one over 3 ticks (InterpolationHandler); the raw
  // positions are 6.7 Hz steps (a slime-launched golem flew in jumps of 2.4 blocks). A teleport over 8 blocks snaps.
  const lerps = new Map(), LIVING = new Set(['mob', 'animal', 'hostile', 'passive', 'water_creature', 'ambient'])   // minecraft-data's living types
  function lerpMob (e) { const l = require('./motion').lerpStep(lerps.get(e.id), e.position); lerps.set(e.id, l); return l.pos }

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
    // engine 3 (2026-11-10): the renderer's motion fixes (render.js MOTION_FIXES: a still view under a container
    // window, the cast moved with a cut landing on it, standing dropped items, the near cut through leaves, projectile
    // hits): docs/engine_features.md "Motion by construction". Older recordings stay as published (rule zero)
    rec = { version: bot.version, user: bot.username, engine: 3, act: 1, smoothDig: true, wideHand: true, stunt: stunt.name, set, time: ctx.dayTime ?? 6000, keepInventory: !!ctx.keepInventory, weather: ctx.weather || 'clear', dimension: String((bot.game && bot.game.dimension) || 'overworld').replace(/^minecraft:/, ''), columns, poses: [], blocks: [], entities: [] }
    if (ctx.cleared && ctx.cleared.length) rec.cleared = ctx.cleared   // boxes clearSet emptied (rec_check: terrain left in the set)
    tick = 0; recording = true
    for (const [id, h] of LEASH) mark('leash', { id, holder: h === bot.entity.id ? 'self' : h })   // leads tied in set-up
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
      rec.poses.push([tick++, +e.position.x.toFixed(4), +e.position.y.toFixed(4), +e.position.z.toFixed(4), +e.yaw.toFixed(5), +e.pitch.toFixed(5), bot.quickBarSlot, (bot.controlState.sneak ? 1 : 0) | (bot.controlState.sprint ? 2 : 0) | (bot.entity.metadata && typeof bot.entity.metadata[0] === 'number' && (bot.entity.metadata[0] & 1) ? 4 : 0), (bot.controlState.forward ? 1 : 0) | (bot.controlState.back ? 2 : 0) | (bot.controlState.left ? 4 : 0) | (bot.controlState.right ? 8 : 0)])   // 7: flags, 1 sneak, 2 sprint, 4 on fire (shared flags bit 0x01: the narrator's flames in camera shots); 8: walk keys held, 1 forward, 2 back, 4 left, 8 right (lib/hb/owner.js: stuck = a key held with no speed)
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
    // items and XP orbs are client-simulated in vanilla: the server sends their velocity on spawn and
    // on changes (entity_velocity) and their position only every ~20 ticks, and a pickup is a collect
    // packet (ItemPickupParticle). The renderer re-runs their physics from these marks.
    const DROPS = new Set(['item', 'experience_orb', 'ender_pearl', 'snowball', 'egg', 'splash_potion', 'lingering_potion', 'experience_bottle', 'potion'])   // + thrown projectiles
    const dropId = new Set()
    const velMark = (id, v) => { if (v) mark('vel', { id, vx: +(v.x || 0).toFixed(4), vy: +(v.y || 0).toFixed(4), vz: +(v.z || 0).toFixed(4) }) }
    const onSpawn = (d) => {
      objData[d.entityId] = d.objectData
      const nm = bot.registry.entities[d.type] && bot.registry.entities[d.type].name
      if (DROPS.has(nm)) { dropId.add(d.entityId); velMark(d.entityId, d.velocity) }
    }
    bot._client.on('entity_velocity', (d) => { if (dropId.has(d.entityId)) velMark(d.entityId, d.velocity) })
    bot._client.on('collect', (d) => { if (dropId.has(d.collectedEntityId)) mark('collect', { id: d.collectedEntityId, by: bot.entity && d.collectorEntityId === bot.entity.id ? 'self' : d.collectorEntityId }) })
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
      // a mob dying (status 3: the red tip-over) and removed 20 ticks later (status 60: the poof)
      if (d.entityStatus === 3 && e && e !== bot.entity) { mark('mob_death', { id: d.entityId }); lastDeath = tick }
      if (d.entityStatus === 60 && e && e !== bot.entity) mark('particles', { type: 'poof', x: +e.position.x.toFixed(3), y: +e.position.y.toFixed(3), z: +e.position.z.toFixed(3), w: e.width || 0.6, h: e.height || 1.8 })
      // a TNT minecart primed (MinecartTNT.handleEntityEvent 10: fuse 80): it flashes, swells and smokes
      if (d.entityStatus === 10 && e && e.name === 'tnt_minecart') mark('cart_primed', { id: d.entityId })
      // the player's own held tool breaking (LivingEntity.onEquippedItemBroken -> entity event 47,
      // breakItem: entity.item.break at 0.8, pitch 0.8-1.2, and the item's crumbs; render.js draws them
      // on this sound). Only a stunt's ctx.sound had made them (a sword broken on a golem had neither)
      if (d.entityStatus === 47 && e === bot.entity && !timeline.some(m => m.event === 'sound' && m.sound === 'entity.item.break' && tick * 50 - m.t <= 100)) mark('sound', { sound: 'entity.item.break', volume: 0.8, pitch: +(0.8 + Math.random() * 0.4).toFixed(3) })
      if (d.entityStatus === 17 && e && e.name === 'firework_rocket') mark('particles', { type: 'firework', x: +e.position.x.toFixed(3), y: +e.position.y.toFixed(3), z: +e.position.z.toFixed(3), explosions: fwData[e.id] || [] })
    }
    bot._client.on('world_event', onWE); bot._client.on('entity_status', onES)
    // the bot's own item use (LivingEntity DATA_LIVING_ENTITY_FLAGS, metadata 8, bit 1 = using an
    // item): eating and drinking for the first-person hand (ItemInHandRenderer.applyEatTransform)
    let using = false
    const onMeta = (p) => {
      if (!bot.entity || p.entityId !== bot.entity.id) return
      const m = (p.metadata || []).find(x => x && x.key === 8)
      if (!m || typeof m.value !== 'number') return
      const u = !!(m.value & 1)
      if (u !== using) { using = u; mark(u ? 'use_start' : 'use_stop', u ? { item: bot.heldItem ? bot.heldItem.name : null } : {}) }
    }
    bot._client.on('entity_metadata', onMeta)
    // another entity's arm swing (the animation packet): actors gesture and hand things over with it
    const onSwing = (e) => { if (e && e !== bot.entity) mark('ent_swing', { id: e.id }) }
    bot.on('entitySwingArm', onSwing)
    // horizontal distance only, as vanilla's entity tracking (ChunkMap.TrackedEntity.updatePlayer
    // compares x and z). A stunt can widen it with `entityRadius` (default 64).
    const ER = stunt.entityRadius || 64
    const AGEABLE = new Set(['cow', 'mooshroom', 'pig', 'chicken', 'horse', 'donkey', 'mule', 'skeleton_horse', 'zombie_horse', 'llama', 'trader_llama', 'camel', 'panda', 'fox', 'wolf', 'cat', 'ocelot', 'rabbit', 'bee', 'turtle', 'goat', 'axolotl', 'sniffer', 'armadillo', 'polar_bear', 'strider', 'hoglin', 'zoglin', 'villager', 'zombie', 'husk', 'drowned', 'zombie_villager', 'zombified_piglin', 'squid', 'glow_squid', 'dolphin'])
    // an item's armour trim as 'pattern/material' (1.21 trim component: holders, a registry id or an inline value)
    const trimOf = (it) => {
      const c = it && it.componentMap && it.componentMap.get('trim'); if (!c) return null
      const d = c.data || c, nm = (h, reg) => {
        if (h == null) return null
        if (typeof h === 'string') return h.replace('minecraft:', '')
        if (typeof h === 'number') return (bot._trimReg[reg] || [])[h] || null
        if (typeof h === 'object') {
          // minecraft-protocol's registryEntryHolder: { materialId | patternId: registry index } or the inline value
          const n = h.materialId ?? h.patternId ?? h.id
          if (typeof n === 'number') return (bot._trimReg[reg] || [])[n] || null
          const d = h.data || h
          const a = d.assetId || d.assetBase || d.asset_id || d.asset_name || d.key
          if (a) return String(a).replace('minecraft:', '').replace(/^.*\//, '')
        }
        return null
      }
      const pat = nm(d.pattern, 'trim_pattern'), mat = nm(d.material, 'trim_material')
      return pat && mat ? `${pat}/${mat}` : null
    }
    const onEntities = () => {
      const bp = bot.entity.position
      // a rider (set_passengers) where the vanilla client puts it (Entity.positionRider, lib/riding.js): the server sends
      // no moves for passengers, so mineflayer left them where they mounted (stories/runaway: "mineflayer doesn't move
      // passengers"). From the vehicle's raw position: render.js eases both the same way (vanilla's 3-step lerp)
      const riderAt = new Map()
      for (const [vid, ps] of RIDE) {
        const v = bot.entities[vid]; if (!v || !v.position || !RIDING.isBoat(v.name)) continue   // boats and rafts (the numbers checked); other vehicles record as before
        const vs = { name: v.name, x: v.position.x, y: v.position.y, z: v.position.z, yaw: v.yaw }
        ps.forEach((pid, i) => { const p = bot.entities[pid]; if (p && p !== bot.entity) riderAt.set(pid, { pos: RIDING.riderPos(vs, { name: p.name }, i, ps.length), vid }) })
      }
      for (const e of Object.values(bot.entities)) {
        if (e === bot.entity || !e.position) continue
        const dx = e.position.x - bp.x, dz = e.position.z - bp.z
        if (dx * dx + dz * dz > ER * ER) continue
        let extra = null
        if (e.name === 'villager' || e.name === 'zombie_villager') { const vd = (e.metadata || []).find(m => m && typeof m === 'object' && 'villagerProfession' in m); if (vd) extra = { type: vd.villagerType, profession: vd.villagerProfession } }
        if (e.name === 'falling_block') extra = { state: objData[e.id] }
        if (e.name === 'enderman' && e.metadata && typeof e.metadata[16] === 'number' && e.metadata[16] > 0) extra = { carried: e.metadata[16] }   // EnderMan.DATA_CARRY_STATE (block state id)
        if (e.name === 'enderman' && e.metadata && e.metadata[17] === true) extra = Object.assign(extra || {}, { creepy: true })   // EnderMan.DATA_CREEPY: screaming, jaw open
        // a mob's main-hand item (entity_equipment; a skeleton's bow): drawn in its arm. On 1.21 mineflayer
        // types mobs by category ('hostile', 'passive'...), not 'mob': the bow never got recorded (worker 13)
        if (e.type !== 'player' && e.type !== 'object' && e.equipment && e.equipment[0] && e.equipment[0].name) extra = Object.assign(extra || {}, { held: e.equipment[0].name })
        // other players (movie actors, lib/actors.js): who they are (the renderer picks the skin from
        // stunt.cast by username), the main-hand item and crouching (Entity shared flags bit 0x02)
        if (e.type === 'player') extra = Object.assign(extra || {}, { user: e.username || null, held: (e.equipment && e.equipment[0] && e.equipment[0].name) || null, sneak: !!(e.metadata && typeof e.metadata[0] === 'number' && (e.metadata[0] & 2)) })
        // ...the off-hand item (equipment slot 1) and using an item (LivingEntity.DATA_LIVING_ENTITY_FLAGS, 8: bit 1 using,
        // bit 2 the off hand), only when set, so older recordings and actors without them stay byte-identical
        if (e.type === 'player' && e.equipment && e.equipment[1] && e.equipment[1].name) extra.offhand = e.equipment[1].name
        // a mob's off-hand item (a zombie villager still holding what the villager held in both hands)
        if (e.type !== 'player' && e.type !== 'object' && e.equipment && e.equipment[1] && e.equipment[1].name) extra = Object.assign(extra || {}, { offhand: e.equipment[1].name })
        if (e.type === 'player' && e.equipment && [2, 3, 4, 5].some(i => e.equipment[i] && e.equipment[i].name)) extra.armor = [2, 3, 4, 5].map(i => (e.equipment[i] && e.equipment[i].name) || null)   // feet, legs, chest, head
        // armour on mobs (a piglin in a gold helmet), only when worn, so older recordings stay byte-identical
        if (e.type !== 'player' && e.type !== 'object' && e.equipment && [2, 3, 4, 5].some(i => e.equipment[i] && e.equipment[i].name)) extra = Object.assign(extra || {}, { armor: [2, 3, 4, 5].map(i => (e.equipment[i] && e.equipment[i].name) || null) })
        // armour trims (the trim component: pattern/material), per slot like armor, only when one is trimmed
        if (extra && extra.armor) { const tr = [2, 3, 4, 5].map(i => trimOf(e.equipment[i])); if (tr.some(Boolean)) extra.trims = tr }
        if (e.type === 'player' && e.metadata && typeof e.metadata[8] === 'number' && (e.metadata[8] & 1)) { extra.using = true; if (e.metadata[8] & 2) extra.usingOff = true }
        if (/^(llama|trader_llama|donkey|mule)$/.test(e.name) && e.metadata && e.metadata[18] === true) extra = Object.assign(extra || {}, { chest: true })   // AbstractChestedHorse.DATA_ID_CHEST
        if (e.name === 'parrot' && e.metadata && typeof e.metadata[19] === 'number') extra = Object.assign(extra || {}, { variant: e.metadata[19] })   // Parrot.DATA_VARIANT_ID
        if (e.name === 'polar_bear' && e.metadata && e.metadata[17] === true) extra = Object.assign(extra || {}, { standing: true })   // PolarBear.DATA_STANDING_ID
        if (e.name === 'warden' && e.metadata && e.metadata[6] === 11) extra = Object.assign(extra || {}, { roar: true })   // Entity.DATA_POSE = Pose.ROARING
        if (e.name === 'warden' && e.metadata && (e.metadata[6] === 13 || e.metadata[6] === 14)) extra = Object.assign(extra || {}, e.metadata[6] === 13 ? { emerge: true } : { dig: true })   // Pose.EMERGING / DIGGING
        if (e.name === 'item_frame' || e.name === 'glow_item_frame') {   // 1.21.11 metadata: 8 = direction (3D id), 9 = item, 10 = rotation (0-7)
          const it = (e.metadata || []).find(m => m && typeof m === 'object' && 'itemId' in m)
          const md = e.metadata || []
          extra = { dir: typeof md[8] === 'number' ? md[8] : (e.objectData ?? objData[e.id]), item: it ? bot.registry.items[it.itemId]?.name : null, rot: typeof md[10] === 'number' ? md[10] : 0 }
        }
        if (e.name === 'firework_rocket' && !fwData[e.id]) { const it = (e.metadata || []).find(m => m && typeof m === 'object' && 'itemId' in m); if (it) fwData[e.id] = explosionsOf(it) }
        if ((e.name === 'slime' || e.name === 'magma_cube') && e.metadata && typeof e.metadata[16] === 'number') extra = { size: e.metadata[16] }   // Slime.ID_SIZE
        if (/_boat$/.test(e.name) && e.metadata && (e.metadata[11] || e.metadata[12])) extra = { paddle: [!!e.metadata[11], !!e.metadata[12]] }   // AbstractBoat DATA_ID_PADDLE_LEFT / RIGHT
        if (e.name === 'tnt' && e.metadata && e.metadata[8] !== undefined) extra = { fuse: e.metadata[8] }
        if (e.name === 'experience_orb' && e.metadata && typeof e.metadata[8] === 'number') extra = { value: e.metadata[8] }   // ExperienceOrb DATA_VALUE (icon size)
        // Creeper DATA_SWELL_DIR (16: -1 idle / 1 swelling) and DATA_IS_IGNITED (18: flint and steel)
        if (e.name === 'creeper' && e.metadata && (e.metadata[16] === 1 || e.metadata[18])) extra = { swellDir: e.metadata[16], ignited: !!e.metadata[18] }
        // AgeableMob.DATA_BABY_ID (16; Zombie's own DATA_BABY_ID is 16 too, Piglin's 17): babies draw at half size
        const babyIdx = e.name === 'piglin' ? 17 : AGEABLE.has(e.name) ? 16 : -1
        if (babyIdx >= 0 && e.metadata && e.metadata[babyIdx] === true && e.name !== 'sheep') extra = Object.assign(extra || {}, { baby: true })
        if (e.name === 'sheep' && e.metadata) {   // Sheep DATA_WOOL_ID (17): colour in the low 4 bits, 0x10 = sheared; a sheep named jeb_ cycles colours
          const w = e.metadata[17] || 0
          extra = { color: w & 15, sheared: !!(w & 16), baby: !!e.metadata[16], jeb: JSON.stringify(e.metadata[2] || '').includes('jeb_') }
        }   // PrimedTnt fuse (ticks left)
        // TamableAnimal DATA_FLAGS_ID (17: 0x01 sitting, 0x04 tame); Wolf DATA_COLLAR_COLOR (20, a dye id)
        if (e.name === 'wolf' && e.metadata) {
          const f = e.metadata[17] || 0
          extra = { ...(extra || {}), sitting: !!(f & 1), tame: !!(f & 4), collar: typeof e.metadata[20] === 'number' ? e.metadata[20] : 14 }
        }
        // health (LivingEntity DATA_HEALTH_ID, metadata 9) where vanilla draws it: a tamed wolf's tail drops with it
        // (Wolf.getTailAngle), an iron golem cracks (IronGolemCrackinessLayer); only when hurt, so a full-health mob's
        // recording stays as before (lib/underdog.js heals them)
        if ((e.name === 'wolf' || e.name === 'iron_golem') && e.metadata && typeof e.metadata[9] === 'number' && e.metadata[9] > 0 && e.metadata[9] < (e.name === 'iron_golem' ? 100 : (extra && extra.tame) ? 40 : 8)) extra = { ...(extra || {}), hp: Math.round(e.metadata[9] * 2) / 2 }
        {   // a custom name (name tag, /summon CustomName): the renderer draws it when the crosshair is on
          // the mob, or always with CustomNameVisible (Mob.shouldShowName); metadata 2 = name, 3 = visible
          const nm = plainName(e.metadata && e.metadata[2])
          if (nm && e.name !== 'item') extra = { ...(extra || {}), name: nm, nameVisible: !!(e.metadata && e.metadata[3]) }
        }
        // on fire: Entity shared flags (metadata 0) bit 0x01
        if (e.metadata && typeof e.metadata[0] === 'number' && (e.metadata[0] & 1)) extra = { ...(extra || {}), fire: true }
        if (e.name === 'item') { const it = (e.metadata || []).find(m => m && typeof m === 'object' && 'itemId' in m); if (it) { extra = { item: bot.registry.items[it.itemId]?.name }; if (JSON.stringify(it.components || '').includes('enchant')) extra.glint = true; if (it.itemCount > 1) extra.count = it.itemCount } }   // count: the renderer draws 1-5 copies (ItemEntityRenderer)
        let ep = stunt.lerpMobs && LIVING.has(e.type) ? lerpMob(e) : e.position
        const ra = riderAt.get(e.id)
        if (ra) { ep = { x: ra.pos[0], y: ra.pos[1], z: ra.pos[2] }; extra = { ...(extra || {}), ride: ra.vid } }
        rec.entities.push([tick, e.id, e.name, +ep.x.toFixed(3), +ep.y.toFixed(3), +ep.z.toFixed(3), +e.yaw.toFixed(4), +e.pitch.toFixed(4), headYaw[e.id] !== undefined ? +headYaw[e.id].toFixed(4) : null, extra])
      }
    }
    // hotbar contents for the HUD, whenever an inventory slot in the hotbar changes
    let lastBar = ''
    const onSlot = (slot) => { if (slot >= 36 && slot < 45) { const h = hotbarNames(); if (JSON.stringify(h) !== lastBar) { lastBar = JSON.stringify(h); mark('hotbar', { items: h }) } } }
    bot.on('physicsTick', onTick); bot.on('blockUpdate', onBlock); bot.inventory.on('updateSlot', onSlot)
    // an opened container (a chest, barrel, shulker box, ender chest: bot.openContainer / activateBlock): what the
    // player sees is the container screen, so record its contents and the player's inventory under it (edit.py
    // draws ContainerScreen), again on every slot change while it's open, and when it closes
    // a window title (a text component: a JSON string, or NBT as prismarine-nbt gives it: { type, value } wrappers
    // round strings, compounds and lists) -> its plain text; a translate key stays a key (edit.py names it)
    const flat = (x) => {
      if (x === null || x === undefined) return ''
      if (typeof x === 'string') return x
      if (Array.isArray(x)) return x.map(flat).join('')
      if (typeof x === 'object' && 'type' in x && 'value' in x && Object.keys(x).length <= 2) return flat(x.value)
      if (typeof x === 'object') return (x.translate !== undefined ? flat(x.translate) : flat(x.text) || flat(x['']) || '') + (x.extra ? flat(x.extra) : '')
      return String(x)
    }
    const contTitle = (t) => { try { const j = typeof t === 'string' && /^[[{"]/.test(t.trim()) ? JSON.parse(t) : t; return flat(j) || String(t || '') } catch (e) { return String(t || '') } }
    const slotOf = (it) => { if (!it) return null; const pt = potionTint(it); return pt !== null ? [it.name, it.count, enchanted(it) ? 1 : 0, 0, 0, pt] : enchanted(it) ? [it.name, it.count, 1] : [it.name, it.count] }
    let openWin = null
    const contMark = (w) => mark('container', { type: w.type, title: contTitle(w.title), rows: Math.ceil(w.inventoryStart / 9), slots: w.slots.map(slotOf) })
    const onWinSlot = () => { if (openWin) contMark(openWin) }
    const onWinOpen = (w) => {
      if (!/generic_9x|shulker_box/.test(String(w.type))) return
      openWin = w; contMark(w); w.on('updateSlot', onWinSlot)
    }
    const onWinClose = (w) => { if (openWin && w === openWin) { w.removeListener('updateSlot', onWinSlot); openWin = null; mark('container_close') } }
    bot.on('windowOpen', onWinOpen); bot.on('windowClose', onWinClose)
    // a villager's or wandering trader's trade screen (bot.openVillager / K.trade): the offers (trade_list packet),
    // the payment and result slots, the player's inventory and each item's tooltip lines (lib/tooltip.js), so
    // edit.py draws MerchantScreen; again on every slot change, and `merchant_close`. A new mark: older recordings
    // have none. Hover a slot for its tooltip with a staged `gui_hover` mark ({ slot: 'result' }; edit.py).
    let merchWin = null, merchTrades = null, merchInfo = {}
    const rawItem = (x) => { try { if (!x) return null; const id = x.itemId ?? x.blockId; if (id === undefined || id < 0 || !(x.itemCount ?? 1)) return null; const it = bot.registry.items[id]; return it ? { name: it.name, count: x.itemCount ?? 1, components: x.components || [] } : null } catch (e) { return null } }
    const outItem = (x) => { try { const Item = require('prismarine-item')(bot.registry); const it = Item.fromNotch(x); return it && it.name ? it : rawItem(x) } catch (e) { return rawItem(x) } }
    const tipOf = (it) => { try { return it ? tooltipLines(it, bot.registry) : null } catch (e) { return null } }
    const merchMark = () => {
      if (!merchWin) return
      const offers = (merchTrades || []).map(t => {
        const a = t.a, b = t.b, out = t.out
        // MerchantOffer.getCostA: the base price + demand + special price, 1..max stack (shown with the base struck through when they differ)
        const cost = a ? Math.min(Math.max(a.count + Math.max(0, Math.floor(a.count * (t.demand || 0) * (t.priceMultiplier || 0))) + (t.specialPrice || 0), 1), bot.registry.itemsByName[a.name]?.stackSize || 64) : 0
        return { a: a ? [a.name, cost] : null, aBase: a && cost !== a.count ? a.count : undefined, b: b ? slotOf(b) : null, out: slotOf(out), xp: t.xp || 0, outOfStock: !!t.tradeDisabled || (t.max > 0 && t.uses >= t.max), tip: tipOf(out) }
      })
      const slots = merchWin.slots.map(slotOf)
      const tips = merchWin.slots.slice(0, 3).map(tipOf)
      // the selected offer: the one whose result sits in the result slot (else whose costs fill the payment slots)
      const s2 = slots[2], s0 = slots[0]
      let selected = s2 ? offers.findIndex(o => o.out && o.out[0] === s2[0] && JSON.stringify(o.tip) === JSON.stringify(tips[2])) : -1
      if (selected < 0 && s0) selected = offers.findIndex(o => o.a && o.a[0] === s0[0])
      mark('merchant', { type: merchWin.type, title: contTitle(merchWin.title), level: merchInfo.level || 0, xp: merchInfo.xp || 0, regular: merchInfo.regular !== false, offers, selected: selected >= 0 ? selected : null, slots, tips })
    }
    const onMerchSlot = () => merchMark()
    const onTrades = (p) => {
      if (!merchWin || (p.windowId !== undefined && p.windowId !== merchWin.id)) return
      merchTrades = (p.trades || []).map(t => ({ a: rawItem(t.inputItem1), b: t.inputItem2 ? rawItem(t.inputItem2) : null, out: outItem(t.outputItem), xp: t.xp, demand: t.demand, specialPrice: t.specialPrice, priceMultiplier: t.priceMultiplier, tradeDisabled: t.tradeDisabled, uses: t.nbTradeUses, max: t.maximumNbTradeUses }))
      merchInfo = { level: p.villagerLevel, xp: p.experience, regular: p.isRegularVillager }
      merchMark()
    }
    const onMerchOpen = (w) => { if (!/merchant|villager/.test(String(w.type))) return; merchWin = w; merchTrades = null; w.on('updateSlot', onMerchSlot) }
    const onMerchClose = (w) => { if (merchWin && w === merchWin) { w.removeListener('updateSlot', onMerchSlot); merchWin = null; mark('merchant_close') } }
    bot.on('windowOpen', onMerchOpen); bot.on('windowClose', onMerchClose); bot._client.on('trade_list', onTrades)
    lastBar = JSON.stringify(hotbarNames())
    mark('hotbar', { items: hotbarNames() })
    return () => { bot.removeListener('physicsTick', onTick); bot.removeListener('blockUpdate', onBlock); bot.inventory.removeListener('updateSlot', onSlot); bot._client.removeListener('entity_head_rotation', onHead); bot._client.removeListener('spawn_entity', onSpawn); bot._client.removeListener('tile_entity_data', onBE); bot._client.removeListener('block_action', onBA); bot._client.removeListener('world_event', onWE); bot._client.removeListener('entity_status', onES); bot._client.removeListener('entity_metadata', onMeta); bot.removeListener('entitySwingArm', onSwing); bot.removeListener('windowOpen', onWinOpen); bot.removeListener('windowClose', onWinClose); bot.removeListener('windowOpen', onMerchOpen); bot.removeListener('windowClose', onMerchClose); bot._client.removeListener('trade_list', onTrades); recording = false }
  }

  try {
    await ctx.cmd('/gamemode creative')
    phase = 'set-up'
    // `near: [x, z]`: /locate from there (the seed is fixed, so the nearest plains to spawn is always the same one:
    // a quarter snow and ice around it, which the Below's POV saw from 30 blocks up)
    if (stunt.near) { await ctx.cmd(`/tp @s ${stunt.near[0]} 200 ${stunt.near[1]}`); await bot.waitForTicks(20) }
    if (stunt.biome) await ctx.locateBiome(stunt.biome)
    const set = await stunt.setup(ctx)
    await bot.waitForTicks(4); checkSetup()   // errors from the set-up's last commands
    // no stray drops from the set-up (the bot picked them up mid-stunt: mystery hotbar stacks)
    bot.chat('/kill @e[type=item]'); await bot.waitForTicks(4)
    // the story's hotbar (story.json "hotbar", STANDARDS 3.6): on before the recording starts, so its first frame has
    // it; a stunt's own ctx.hotbar later wins from that moment. Stories without one are untouched.
    const storyDir = stunt.edit && typeof stunt.edit.story === 'string' ? path.resolve(__dirname, '..', stunt.edit.story) : null
    if (storyDir) await require('./story').applyStoryHotbar(ctx, storyDir)
    log('set at', set)
    phase = 'the chunk refresh'
    if (!stunt.noChunkRefresh) await refreshChunks(set)
    const stop = startRecording(set)
    // pre-roll: snapshotting the world blocks the event loop, so the first ticks arrived in bursts and
    // every recording's first ~0.5 s stuttered (move 1 tick, hold 3: worker 4). Let it settle, then
    // mark 'start' (edit_args trims to it when a stunt sets no start of its own).
    await bot.waitForTicks(15)
    mark('start')
    phase = 'the stunt'
    const ok = (await stunt.perform(ctx)) && (stunt.expectDeath ? died : !died)
    // the payoff settles inside the recording (owner r:r24d99a: never end while TNT, debris or falling sand still
    // move): keep recording until nothing moves (up to stunt.settleWait ticks, 120), then the settle marks
    // (lib/settle.js) let the edit end on it: endAfter 'settle' / edit.payoff 'blast' | 'fall'
    if (stunt.settle !== false) {
      const W = stunt.settleWait ?? 120
      let k = 0
      for (; k < W && SETTLE.liveBusy(Object.values(bot.entities), tick, lastBoom, lastDeath); k++) await bot.waitForTicks(1)
      if (k) log(`settle: waited ${k} ticks for the payoff to stop moving${k >= W ? ' (still moving: the recording ends mid-motion)' : ''}`)
      // the tail after the settle mark (lib/settle.js SETTLE_TAIL_TICKS): endAfter 'settle:0.6' needs 0.6 s of recording
      // past it (which_door stopped 0.15 s after it). Only after a payoff that moved (a blast, a death, a fall).
      if (k || tick - lastBoom < 200 || tick - lastDeath < 200) await bot.waitForTicks(SETTLE.SETTLE_TAIL_TICKS)
    }
    mark('end')
    stop()
    await bot.waitForTicks(10)
    log(ok ? 'STUNT OK' : 'STUNT FAILED')
    if (storyDir) rec.voice = require('./story').voiceStamp(storyDir)   // ./hb check: re-record if the voice changes
    try {
      const endT = (timeline.find(m => m.event === 'end') || {}).t
      SETTLE.insertMarks(timeline, SETTLE.settleMarks(SETTLE.motionWindows(rec, timeline), endT !== undefined ? endT / 50 : Infinity))
    } catch (e) { log('settle marks:', e.message) }
    if (process.env.RECORD) fs.writeFileSync(process.env.RECORD, JSON.stringify({ ...rec, timeline }))
    quitting = true; bot.quit(); await sleep(500); process.exit(ok ? 0 : 1)
  } catch (e) {
    if (e && e.setupFailed) { log('SETUP FAILED:', e.message); process.exit(6) }
    log('script error', e); process.exit(3)
  }
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
