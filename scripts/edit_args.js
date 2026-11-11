// Prints the edit.py arguments a stunt module asks for (stunts/<name>.js `edit`), one per line.
// Skips the song if the file isn't there (songs/ is owner-supplied and gitignored).
const fs = require('fs')
// EDIT_EXTRA='{"punch":["boom"]}' merges keys over the stunt's edit block (try a retention tool
// without touching the stunt: scripts/reedit.sh)
const e = { ...(require(`../stunts/${process.argv[2]}`).edit || {}), ...JSON.parse(process.env.EDIT_EXTRA || '{}') }
const out = []
if (e.caption) out.push('--caption', process.env.CAPTION || e.caption)
if (e.red) out.push('--red', e.red)
if (e.bands) out.push('--bands', e.bands)   // 'blur' | 'black'
if (e.colors) out.push('--colors', e.colors)
if (e.countdown) out.push('--countdown', e.countdown)
if (e.subs) out.push('--subs', JSON.stringify(e.subs))
if (e.subsY !== undefined) out.push('--subs_y', String(e.subsY))   // subtitle height: fraction of the game view (0.15 = top, default 0.42)
if (e.timer) out.push('--timer', e.timer)
if (e.speed) out.push('--speed', JSON.stringify(e.speed))    // time-lapse spans / cuts (scripts/timewarp.py)
if (e.clock) out.push('--clock', JSON.stringify(e.clock))    // clocks counting to a target time
if (e.slowmo) out.push('--slowmo', JSON.stringify(e.slowmo))  // retention toolkit (scripts/retention.py)
if (e.punch) out.push('--punch', JSON.stringify(e.punch))
// punchStress (opt-in; owner 2026-11-10, "very bright, exagerated movements"): a short zoom punch on each sentence's
// spoken stress (its last CAPS word, the r-cast rule), from the story's aligned words: [[line id, s into the line, peak]]
if (e.punchStress && e.story) {
  const path = require('path')
  const wf = path.join(__dirname, '..', e.story, 'voice', 'words.json')
  if (fs.existsSync(wf)) {
    const words = JSON.parse(fs.readFileSync(wf, 'utf8')), peak = typeof e.punchStress === 'number' ? e.punchStress : 0.07, ps = []
    for (const [lid, ws] of Object.entries(words)) {
      let last = null
      for (const [w, a] of ws) {
        const core = String(w).replace(/[^A-Za-z']/g, '')
        if (core.length > 1 && core === core.toUpperCase() && /[A-Z]/.test(core)) last = a
        if (/[.!?]["')]*$/.test(w) && last !== null) { ps.push([lid, +last.toFixed(3), peak]); last = null }
      }
      if (last !== null) ps.push([lid, +last.toFixed(3), peak])
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
if (e.shake) out.push('--shake', JSON.stringify(e.shake))
if (e.flash) out.push('--flash', JSON.stringify(e.flash))
if (e.freeze) out.push('--freeze', JSON.stringify(e.freeze))
if (e.fallen) out.push('--fallen', JSON.stringify(e.fallen))
if (e.replay) out.push('--replay', JSON.stringify(e.replay))   // needs scripts/render_replay.py first
if (e.loop) out.push('--loop', JSON.stringify(e.loop))
if (e.sfx) out.push('--sfx', JSON.stringify(e.sfx))       // sound effects (scripts/sfx.py)
if (e.onFire) out.push('--on_fire', e.onFire)
if (e.deathScreen) out.push('--death_screen', 'death')
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
