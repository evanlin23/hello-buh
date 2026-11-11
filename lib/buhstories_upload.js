// Buh Stories upload text, built from one source of truth (owner: "Stuff should be front loaded": nobody hand-writes
// a title, description, tags or pinned comment). docs/brand.md "Buh Stories channel" (Titles, Pinned comment,
// Description/tags/playlists); docs/research/buhstories_growth_2026-11-11.md 5a (altered content: No).
//
// The source: each story's stories/<dir>/story.json `upload` block
//   { title, hook?, pinned, tags? }   title = the brand table's title (lowercase hook + emoji + #minecraft #shorts),
//                                     hook = the band line (default: the package's caption), pinned = the question
//                                     (no 👇: it is added to the comment), tags = story-specific tags (the brand
//                                     keywords are always added)
// or a stunt's `edit.youtube` with the same fields (it wins, field by field).
//
// build() -> metadata.youtube for channel buhstories:
//   title, description (hook / pinned question / music credit / the four hashtags, blank lines between), hashtags,
//   tags, pinned_comment (question + " 👇"), playlist "All Buh Stories", made_for_kids false, altered_content false
// check() -> the BLOCKs: HelloBuh hashtags (#minecraftmemes, #funny), a missing music credit, a missing title /
// pinned comment / #buhstories, a title over 100 characters, tags over YouTube's 500 characters.
// Used by scripts/publish.js (writes it into the package), scripts/youtube_upload.py (rebuilds it from main at upload
// time, so a corrected title needs no re-packaging) and ./hb paste (the paste-ready block for a manual upload).
// HelloBuh packages are never touched: apply() returns them as they are.
//
// CLI: node lib/buhstories_upload.js <metadata.json> [--json]   (--json: {youtube, blocks}; exit 1 on a BLOCK)
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const HASHTAGS = ['#minecraft', '#shorts', '#minecraftstory', '#buhstories']
const HELLOBUH_ONLY = ['#minecraftmemes', '#funny']
const KEYWORDS = ['minecraft story', 'minecraft stories', 'minecraft shorts', 'minecraft mystery', 'minecraft village',
  'minecraft dog', 'minecraft warden', 'minecraft raid', 'buh stories']
const PLAYLIST = 'All Buh Stories'

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch (e) { return null } }

// the story.json of a package: metadata edit.story, the stunt's edit.story, stories/<name minus story_>, or the
// story whose `stunt` is this name
function storyOf (name, meta = {}, stunt = {}, root = ROOT) {
  const dirs = [(meta.edit || {}).story, ((stunt || {}).edit || {}).story, `stories/${name.replace(/^story_/, '')}`].filter(Boolean)
  for (const d of dirs) {
    const s = readJson(path.join(root, d, 'story.json'))
    if (s) return { dir: d, story: s }
  }
  const sd = path.join(root, 'stories')
  for (const d of fs.existsSync(sd) ? fs.readdirSync(sd).sort() : []) {
    const s = readJson(path.join(sd, d, 'story.json'))
    if (s && s.stunt === name) return { dir: `stories/${d}`, story: s }
  }
  return { dir: null, story: null }
}

function stuntOf (name, root = ROOT) {
  try { return require(path.join(root, 'stunts', `${name}.js`)) } catch (e) { return {} }
}

// the upload block: story.json `upload`, then the stunt's edit.youtube over it
function uploadOf (name, meta = {}, stunt = null, root = ROOT) {
  const st = stunt || stuntOf(name, root)
  const { dir, story } = storyOf(name, meta, st, root)
  const u = { ...((story && story.upload) || {}), ...(((st || {}).edit || {}).youtube || {}) }
  return { ...u, _story: dir }
}

// the music credit exactly as the licence wants it: the score's tracks (music/score.json), an NCS track
// (music/ncs.json), else "Song: title · artist"
function creditOf (meta = {}, root = ROOT) {
  const song = meta.song
  if (!song) return ''
  if (Array.isArray(song.tracks) && song.tracks.length) {
    const score = readJson(path.join(root, 'music', 'score.json')) || []
    const c = song.tracks.map(id => (score.find(t => t.id === id) || {}).credit).filter(Boolean)
    if (c.length === song.tracks.length) return c.join('\n\n')
  }
  const ncs = (readJson(path.join(root, 'music', 'ncs.json')) || []).find(t => t.file === path.basename(song.file || ''))
  if (ncs && ncs.credit) return ncs.credit
  return song.title ? `Song: ${song.title}${song.artist ? ' · ' + song.artist : ''}` : ''
}

const question = (q) => String(q || '').replace(/\s*👇\s*$/u, '').trim()

function build (meta = {}, upload = {}, root = ROOT) {
  const hook = (upload.hook || meta.caption || '').trim()
  const q = question(upload.pinned)
  const credit = creditOf(meta, root)
  const tags = []
  for (const t of [...KEYWORDS, ...(upload.tags || [])]) if (!tags.includes(t.toLowerCase())) tags.push(t.toLowerCase())
  return {
    title: (upload.title || '').trim(),
    description: [hook, q, credit, HASHTAGS.join(' ')].filter(Boolean).join('\n\n'),
    hashtags: HASHTAGS,
    tags,
    pinned_comment: q ? `${q} 👇` : '',
    playlist: PLAYLIST,
    made_for_kids: false,
    altered_content: false,
    source: upload._story ? `${upload._story}/story.json upload` : 'stunt edit.youtube'
  }
}

// a package's metadata with its youtube block built (buhstories only; any other channel comes back unchanged)
function apply (meta, upload, root = ROOT) {
  if (!meta || meta.channel !== 'buhstories') return meta
  return { ...meta, youtube: build(meta, upload || uploadOf(meta.name, meta, null, root), root) }
}

function check (meta = {}, root = ROOT) {
  if (meta.channel !== 'buhstories') return []
  const y = meta.youtube || {}
  const title = y.title || '', desc = y.description || ''
  const B = []
  for (const h of HELLOBUH_ONLY) {
    const re = new RegExp(`${h}(?![\\w])`, 'i')
    if (re.test(title)) B.push(`title uses the HelloBuh hashtag ${h}`)
    if (re.test(desc)) B.push(`description uses the HelloBuh hashtag ${h}`)
  }
  const credit = creditOf(meta, root)
  if (meta.song && !credit) B.push(`no music credit for the song ${meta.song.title || meta.song.file} (music/score.json or music/ncs.json)`)
  else if (credit && !desc.includes(credit)) B.push(`description lacks the music credit (${credit.split('\n')[0]})`)
  if (!title) B.push('no title: add an `upload` block (title, pinned, tags) to the story.json (docs/brand.md "Titles")')
  if (title.length > 100) B.push(`title is ${title.length} characters (YouTube's limit is 100)`)
  if (title && !/#shorts\b/i.test(title)) B.push('title lacks #shorts (docs/brand.md: "<hook> <emoji> #minecraft #shorts")')
  if (!/#buhstories\b/i.test(desc)) B.push('description lacks #buhstories')
  if (!y.pinned_comment) B.push('no pinned comment: add `pinned` (the question) to the story.json upload block')
  if ((y.tags || []).join(',').length > 500) B.push('tags are over 500 characters')
  return B
}

function pasteText (meta) {
  const y = meta.youtube || {}
  return [
    `== ${meta.name} (${meta.channel}, status ${meta.status || '-'}) ==`,
    'TITLE', y.title || '', '',
    'DESCRIPTION', y.description || '', '',
    'TAGS', (y.tags || []).join(', '), '',
    'PINNED COMMENT (post it, then pin it)', y.pinned_comment || '', '',
    'SETTINGS',
    `playlist: ${y.playlist || PLAYLIST}`,
    `audience: No, it's not made for kids${y.made_for_kids ? ' (WARNING: metadata says made for kids)' : ''}`,
    'altered content: No (docs/research/buhstories_growth_2026-11-11.md 5a)',
    'category: Gaming'
  ].join('\n')
}

module.exports = { build, apply, check, uploadOf, storyOf, stuntOf, creditOf, pasteText, HASHTAGS, HELLOBUH_ONLY, KEYWORDS, PLAYLIST }

if (require.main === module) {
  const a = process.argv.slice(2)
  const f = a.find(x => !x.startsWith('--'))
  if (!f) { console.error('usage: node lib/buhstories_upload.js <metadata.json> [--json]'); process.exit(2) }
  const meta = apply(JSON.parse(fs.readFileSync(f, 'utf8')))
  const blocks = check(meta)
  if (a.includes('--json')) console.log(JSON.stringify({ youtube: meta.youtube, blocks }))
  else console.log(pasteText(meta) + (blocks.length ? '\n\n' + blocks.map(b => 'BLOCK ' + b).join('\n') : ''))
  process.exit(blocks.length ? 1 : 0)
}
