// Prints the edit.py arguments a stunt module asks for (stunts/<name>.js `edit`), one per line.
// Skips the song if the file isn't there (songs/ is owner-supplied and gitignored).
const fs = require('fs')
// EDIT_EXTRA='{"punch":["boom"]}' merges keys over the stunt's edit block (try a retention tool
// without touching the stunt: scripts/reedit.sh)
const stuntMod = require(`../stunts/${process.argv[2]}`)
const e = { ...(stuntMod.edit || {}), ...JSON.parse(process.env.EDIT_EXTRA || '{}') }
const out = []
if (e.caption) out.push('--caption', process.env.CAPTION || e.caption)
// the old 'HelloBuh' bot's name in the recording's texts (death screen, chat, feedback) drawn as 56e on a HelloBuh
// stunt (lib/legacy_player.js; edit.py applies it only when the recording has no user or user 'HelloBuh')
{ const L = require('../lib/legacy_player'); if (process.env.HB_LEGACY_NAME !== '0' && !L.isStory(process.argv[2], stuntMod)) out.push('--self_name', L.SELF) }
if (e.red) out.push('--red', e.red)
// the key word's colour: a Buh Stories Short is Buh gold #FFD640 (docs/brand.md "Buh Stories channel"), keyed on the
// stunt's (or its edit block's) channel: 'buhstories' only, never on edit.story, since HelloBuh has story_* Shorts too
// (story_nitwit, story_sheep_stares...) that stay red. edit.redColor ('RRGGBB') overrides.
const channel = e.channel || stuntMod.channel
const redColor = e.redColor || (channel === 'buhstories' ? 'FFD640' : null)
if (e.red && redColor) out.push('--red_rgb', String(redColor).replace(/^#/, ''))
if (e.bands) out.push('--bands', e.bands)   // 'blur' | 'black'
if (e.colors) out.push('--colors', e.colors)
if (e.countdown) out.push('--countdown', e.countdown)
if (e.captions) out.push('--captions', JSON.stringify(e.captions))   // the band caption switching on marks ([[EVENT, TEXT]]: a numbered list)
if (e.subs) out.push('--subs', JSON.stringify(e.subs))
if (e.subsY !== undefined) out.push('--subs_y', String(e.subsY))   // subtitle height: fraction of the game view (0.15 = top, default 0.42)
if (e.timer) out.push('--timer', e.timer)
if (e.splits) out.push('--splits', JSON.stringify(e.splits))   // a speedrun timer reset at every attempt (edit.py split_timer; r:r32b983)
if (e.speed) out.push('--speed', JSON.stringify(e.speed))    // time-lapse spans / cuts (scripts/timewarp.py)
if (e.clock) out.push('--clock', JSON.stringify(e.clock))    // clocks counting to a target time
if (e.slowmo) out.push('--slowmo', JSON.stringify(e.slowmo))  // retention toolkit (scripts/retention.py)
if (e.punch) out.push('--punch', JSON.stringify(e.punch))
// punchStress (owner 2026-11-10, "very bright, exagerated movements"; 2026-11-11, on a punch every sentence: "only the
// big ones i think"): a short zoom punch on the spoken stress (the last CAPS word, the r-cast rule), from the story's
// aligned words: [[line id, s into the line, peak]]. Only the big moments get one: the lines story.json marks
// `"punch": true` (the hook, the turn, the reveal; at most PUNCH_MAX), one punch each on the line's last stressed word.
// No line marked: the first and the last spoken line. `punchStress: 'all'` keeps the old one-per-sentence behaviour.
const PUNCH_MAX = 4
if (e.punchStress && e.story) {
  const path = require('path')
  const wf = path.join(__dirname, '..', e.story, 'voice', 'words.json')
  if (fs.existsSync(wf)) {
    const words = JSON.parse(fs.readFileSync(wf, 'utf8')), peak = typeof e.punchStress === 'number' ? e.punchStress : 0.07, ps = []
    const isCaps = w => { const core = String(w).replace(/[^A-Za-z']/g, ''); return core.length > 1 && core === core.toUpperCase() && /[A-Z]/.test(core) }
    if (e.punchStress === 'all') {
      for (const [lid, ws] of Object.entries(words)) {
        let last = null
        for (const [w, a] of ws) {
          if (isCaps(w)) last = a
          if (/[.!?]["')]*$/.test(w) && last !== null) { ps.push([lid, +last.toFixed(3), peak]); last = null }
        }
        if (last !== null) ps.push([lid, +last.toFixed(3), peak])
      }
    } else {
      const sf = path.join(__dirname, '..', e.story, 'story.json')
      const lines = fs.existsSync(sf) ? (JSON.parse(fs.readFileSync(sf, 'utf8')).lines || []) : []
      let big = lines.filter(l => l.punch === true).map(l => l.id).filter(id => words[id])
      if (!big.length) { const spoken = Object.keys(words).filter(id => words[id].length); big = [...new Set([spoken[0], spoken[spoken.length - 1]].filter(Boolean))] }
      if (big.length > PUNCH_MAX) { process.stderr.write(`punchStress: ${big.length} lines marked "punch", only the first ${PUNCH_MAX} get one (owner: only the big ones)\n`); big = big.slice(0, PUNCH_MAX) }
      for (const lid of big) {
        const caps = words[lid].filter(([w]) => isCaps(w))
        if (caps.length) ps.push([lid, +caps[caps.length - 1][1].toFixed(3), peak])
      }
    }
    out.push('--punch_stress', JSON.stringify(ps))
  }
}
if (e.counter) out.push('--counter', JSON.stringify(e.counter))
if (e.cards) out.push('--cards', JSON.stringify(e.cards))
if (e.hook) out.push('--hook', JSON.stringify(e.hook))
if (e.zoom) out.push('--zoom', JSON.stringify(e.zoom))   // held push-ins (scripts/retention.py)
if (e.countdowns) out.push('--countdowns', JSON.stringify(e.countdowns))   // live per-round countdowns
if (e.ring) out.push('--ring', JSON.stringify(e.ring))
if (e.tags) out.push('--tags', JSON.stringify(e.tags))
if (e.chat) out.push('--chat', JSON.stringify(e.chat))
if (e.still) out.push('--still', JSON.stringify(e.still))   // the view goes dark, then a meme picture (format cooked: lib/cooked.js, lib/memes.json)
if (e.score) out.push('--score', JSON.stringify(e.score))   // a live two-sided score bar (format race: lib/race.js)
if (e.shake) out.push('--shake', JSON.stringify(e.shake))
if (e.flash) out.push('--flash', JSON.stringify(e.flash))
if (e.freeze) out.push('--freeze', JSON.stringify(e.freeze))
if (e.fallen) out.push('--fallen', JSON.stringify(e.fallen))
if (e.tally) out.push('--tally', JSON.stringify(e.tally))   // a live "blocks used" total (format mega: lib/mega_lapse.js)
if (e.replay) out.push('--replay', JSON.stringify(e.replay))   // needs scripts/render_replay.py first
if (e.loop) out.push('--loop', JSON.stringify(e.loop))
if (e.sfx) out.push('--sfx', JSON.stringify(e.sfx))       // sound effects (scripts/sfx.py)
if (e.onFire) out.push('--on_fire', e.onFire)
if (e.deathScreen) out.push('--death_screen', 'death')
if (e.hardcore) out.push('--hardcore')                      // hardcore hearts (the dilemma format)
if (e.armor) out.push('--armor', String(e.armor))           // armor points over the hearts (worn armour's total)
if (e.itemNames) out.push('--item_names', JSON.stringify(e.itemNames))   // the selected item's name over the hotbar
if (e.guiScale) out.push('--gui_scale', String(e.guiScale))   // container screens at another GUI scale (phone-readable; default 3)
if (e.chatScale) out.push('--chat_scale', String(e.chatScale))   // chat lines at another GUI scale (default guiScale, else 3)
// chat lines centred (owner, 2026-11-11: "Buh left the game" centred, off the dog): on by default for story Shorts,
// chatAlign: 'left' keeps vanilla's corner; chatY = the line's height as a fraction of the game area (0.70: captions)
const chatAlign = e.chatAlign || (e.story ? 'center' : null)
if (chatAlign && chatAlign !== 'left') out.push('--chat_align', chatAlign)
if (e.chatY !== undefined) out.push('--chat_y', String(e.chatY))
if (e.story) out.push('--story', e.story)            // narrated story Short (docs/stories.md)
if (e.start !== undefined) out.push('--start', String(e.start))
else if (!e.startAt) out.push('--start_at', 'start:0')   // skip the harness pre-roll before 'start'
if (e.startAt) out.push('--start_at', e.startAt)       // 'event:offset'
if (e.endAfter) out.push('--end_after', e.endAfter)    // 'event:seconds'
const song = process.env.SONG || e.song
if (song && fs.existsSync(song)) { out.push('--song', song); if (e.dropAt !== undefined) out.push('--song_drop_at', String(e.dropAt)) }
console.log(out.join('\n'))
