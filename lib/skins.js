// Real player skins (the owner's own account, 56e: owner 2026-11-11, r:re5019b) for render.js.
// The PNG is work/skins/<name>.png: restored from the PRIVATE assets repo (scripts/assets_restore.sh), else fetched
// from Mojang by scripts/fetch_skin.py (Actions, or no private-repo access), else missing: the jar's default skin.
// Never committed here (public repo). Only names in lib/real_skins.json are real skins.
//
// The page loads skin `real/<name>` from /assets/env/entity/player/wide/real/<name>.png (render.js serves work/skins
// there) and builds the slim arms when the skin's JSON says model "slim".
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const CONF = JSON.parse(fs.readFileSync(path.join(__dirname, 'real_skins.json'), 'utf8'))
const REAL = CONF.names
const MODEL = CONF.model || {}   // name -> 'wide' | 'slim': the arm model chosen for that skin (else auto)

// name -> { slim (the profile says slim), model (lib/real_skins.json's choice, or null: auto) } when
// work/skins/<name>.png is there (and the name is one of the owner's), else null
function haveSkin (name, dir = path.join(ROOT, 'work', 'skins')) {
  if (!name || !REAL.includes(name) || !fs.existsSync(path.join(dir, `${name}.png`))) return null
  let meta = {}
  try { meta = JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8')) } catch {}
  return { slim: meta.model === 'slim', model: MODEL[name] || null }
}

const real = (name, have) => { const h = have(name); return h ? { skin: `real/${name}`, slim: !!h.slim, model: h.model || null, real: name } : null }
const STEVE = { skin: 'steve', slim: false, model: null, real: null }

// The recording bot's skin. Order: SKIN (env) > stunt.cast.self (a jar/our skin, or '@<name>' for a real one) >
// the bot's username (rec.user) when it has a real skin > steve. Recordings made before rec.user existed were the
// 'HelloBuh' bot and stay steve, so a re-render of a published Short draws what it drew.
function selfSkin ({ env = {}, cast = null, user = null, have = haveSkin } = {}) {
  if (env.SKIN) return { ...STEVE, skin: env.SKIN }
  const c = cast && cast.self
  if (c) return (c.startsWith('@') && real(c.slice(1), have)) || (c.startsWith('@') ? STEVE : { ...STEVE, skin: c })
  return (user && real(user, have)) || STEVE
}

// Another player in the recording (an actor bot): stunt.cast[username] first (a skin, or '@<name>'), then the
// username's own real skin, else steve.
function actorSkin ({ cast = null, user = null, have = haveSkin } = {}) {
  const c = cast && user && cast[user]
  if (c) return (c.startsWith('@') && real(c.slice(1), have)) || (c.startsWith('@') ? STEVE : { ...STEVE, skin: c })
  return (user && real(user, have)) || STEVE
}

// The real-skin names a render may draw: the bot, '@' cast entries and actor usernames on the list
function wantedSkins ({ user = null, cast = null, actors = [] } = {}) {
  const out = new Set()
  if (user && REAL.includes(user)) out.add(user)
  for (const v of Object.values(cast || {})) if (typeof v === 'string' && v.startsWith('@') && REAL.includes(v.slice(1))) out.add(v.slice(1))
  for (const a of actors) if (a && REAL.includes(a)) out.add(a)
  return [...out]
}

// Make sure the wanted skins are in work/skins (fetching the missing ones; never throws, never fails the render)
function ensureSkins (names) {
  const missing = names.filter(n => !haveSkin(n))
  if (missing.length) spawnSync('python3', [path.join(ROOT, 'scripts', 'fetch_skin.py'), ...missing], { stdio: 'inherit' })
  for (const n of names) if (!haveSkin(n)) console.warn(`WARNING: no skin for ${n} (work/skins/${n}.png): drawing the default skin`)
}

module.exports = { REAL, MODEL, haveSkin, selfSkin, actorSkin, wantedSkins, ensureSkins }
