// The story's hotbar before recording (docs/STANDARDS.md 3.6; owner, 2026-11-10: "Can we also fill our hotbar with like
// ridiculous items? like buckets of milk for example"): `./hb check` and `./hb record` read story.json "hotbar" of a
// story_* stunt. BLOCK: an item id that isn't in minecraft-data for versions.env's version, a bad count or shape (the
// server would refuse the /item replace and the set-up would fail). WARN: no "hotbar", or fewer than 7 filled slots.
// rec_check (scripts/rec_check.py "hotbar") checks the recording itself.
const fs = require('fs')
const path = require('path')
const ROOT = path.join(__dirname, '..', '..')

// the story dir of a stunt: its edit.story, else stories/<name without story_>
function storyDirOf (name, mod, root = ROOT) {
  const s = mod && mod.edit && typeof mod.edit.story === 'string' ? mod.edit.story : `stories/${name.replace(/^story_/, '')}`
  return path.resolve(root, s)
}

// -> { applies, story, findings: [{ level, msg }] }. Only story_* stunts (and stunts with an edit.story) are checked.
function storyHotbarFindings (name, mod, root = ROOT) {
  if (!/^story_/.test(name) && !(mod && mod.edit && mod.edit.story)) return { applies: false, story: null, findings: [] }
  const dir = storyDirOf(name, mod, root)
  const f = path.join(dir, 'story.json')
  if (!fs.existsSync(f)) return { applies: true, story: path.relative(root, f), findings: [{ level: 'WARN', msg: `no ${path.relative(root, f)}: the hotbar can't be checked` }] }
  let story
  try { story = JSON.parse(fs.readFileSync(f, 'utf8')) } catch (e) { return { applies: true, story: path.relative(root, f), findings: [{ level: 'BLOCK', msg: `${path.relative(root, f)} is not JSON: ${e.message}` }] } }
  const { checkHotbar } = require('../story')
  return { applies: true, story: path.relative(root, f), findings: checkHotbar(story.hotbar) }
}

module.exports = { storyHotbarFindings, storyDirOf }
