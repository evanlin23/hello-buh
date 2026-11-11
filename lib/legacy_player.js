// The old bot name on re-renders (owner 2026-11-11, r:r52f94c: "all of these still say hellobuh instead of 56e").
// Recordings made before the bot became 56e (main 2a50ede8, r:re5019b) have no rec.user and the player was the
// 'HelloBuh' bot: the death screen, chat and command feedback say "HelloBuh" and the player wears the default skin.
// A HelloBuh stunt re-rendered from such a recording is drawn as 56e: every text the edit draws from the recording
// has the name rewritten (edit.py --self_name, the same rule in Python: legacy_rename) and the player wears 56e's own
// skin (render.js -> lib/skins.js). Nothing else in the picture changes. Stories keep their names (Buh, Milo...).
// HB_LEGACY_NAME=0 turns it off (a re-render that must match the old cut).
const LEGACY = 'HelloBuh'
const SELF = '56e'   // the owner's real username: lib/harness.js's default bot name, lib/real_skins.json

// a story (Buh Stories, a story_* Short, a narrated edit, a named hero): keeps the recorded names
function isStory (name, stunt = {}) {
  const e = (stunt && stunt.edit) || {}
  return /^story_/.test(String(name || '')) || !!(stunt && (stunt.botName || stunt.selfName || stunt.channel === 'buhstories')) ||
    !!(e.story || e.channel === 'buhstories')
}

// the name to draw instead of 'HelloBuh', or null: a HelloBuh stunt whose recording was the old bot (no rec.user, or
// user 'HelloBuh'); never a story, never a recording with another user
function legacySelf ({ rec = {}, name = null, stunt = {}, env = process.env } = {}) {
  if (env && env.HB_LEGACY_NAME === '0') return null
  if (isStory(name || (rec && rec.stunt), stunt)) return null
  const u = rec && rec.user
  return !u || u === LEGACY ? SELF : null
}

// every string in v with the old name replaced (a deep copy of arrays/objects; keys unchanged)
function rename (v, to, from = LEGACY) {
  if (typeof v === 'string') return v.split(from).join(to)
  if (Array.isArray(v)) return v.map(x => rename(x, to, from))
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = rename(x, to, from); return o }
  return v
}

// rewrite a loaded recording in place for the render: the timeline's texts (death messages, chat, feedback), the
// entities' names, and rec.user (so the skin is 56e's). Returns the name used, or null when nothing applies.
function applyToRec (rec, { name = null, stunt = {}, env = process.env } = {}) {
  const to = legacySelf({ rec, name, stunt, env })
  if (!to) return null
  if (Array.isArray(rec.timeline)) rec.timeline = rename(rec.timeline, to)
  if (Array.isArray(rec.entities) && JSON.stringify(rec.entities).includes(LEGACY)) rec.entities = rename(rec.entities, to)
  rec.user = to
  return to
}

module.exports = { LEGACY, SELF, isStory, legacySelf, rename, applyToRec }
