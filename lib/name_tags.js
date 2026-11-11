// Hidden name tags (The Honey Thief's Jonah, owner 2026-11-11: "giant can be jonah. no name tag"): the names whose
// nameplate render.js never draws. stunt.hideNameTags: ['Jonah'] (player usernames, kit tags or mob names), and every
// cast entry with "name_tag": false in the stunt's story.json (edit.story), matched by its cast id, `user`, `tag`
// and the first word of its `name`. Vanilla's own way: a team with nametagVisibility never.
const fs = require('fs')
const path = require('path')

function hiddenNames (stunt, root) {
  const out = new Set(((stunt && stunt.hideNameTags) || []).map(String))
  const dir = stunt && stunt.edit && stunt.edit.story
  const sj = dir && path.join(root, dir, 'story.json')
  if (sj && fs.existsSync(sj)) {
    for (const [id, c] of Object.entries(JSON.parse(fs.readFileSync(sj, 'utf8')).cast || {})) {
      if (!c || c.name_tag !== false) continue
      for (const n of [id, c.user, c.tag, c.name && String(c.name).split(/\s+/)[0]]) if (n) out.add(String(n))
    }
  }
  return out
}

// is any of an entity's names (username, custom name, actor user, kit tag) hidden?
const isHidden = (set, names) => set.size > 0 && names.some(n => n && set.has(String(n)))

module.exports = { hiddenNames, isHidden }
