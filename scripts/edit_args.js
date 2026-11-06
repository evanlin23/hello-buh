// Prints the edit.py arguments a stunt module asks for (stunts/<name>.js `edit`), one per line.
// Skips the song if the file isn't there (songs/ is owner-supplied and gitignored).
const fs = require('fs')
// EDIT_EXTRA='{"punch":["boom"]}' merges keys over the stunt's edit block (try a retention tool
// without touching the stunt: scripts/reedit.sh)
const e = { ...(require(`../stunts/${process.argv[2]}`).edit || {}), ...JSON.parse(process.env.EDIT_EXTRA || '{}') }
const out = []
if (e.caption) out.push('--caption', process.env.CAPTION || e.caption)
if (e.red) out.push('--red', e.red)
if (e.colors) out.push('--colors', e.colors)
if (e.countdown) out.push('--countdown', e.countdown)
if (e.subs) out.push('--subs', JSON.stringify(e.subs))
if (e.timer) out.push('--timer', e.timer)
if (e.speed) out.push('--speed', JSON.stringify(e.speed))    // time-lapse spans / cuts (scripts/timewarp.py)
if (e.clock) out.push('--clock', JSON.stringify(e.clock))    // clocks counting to a target time
if (e.slowmo) out.push('--slowmo', JSON.stringify(e.slowmo))  // retention toolkit (scripts/retention.py)
if (e.punch) out.push('--punch', JSON.stringify(e.punch))
if (e.counter) out.push('--counter', JSON.stringify(e.counter))
if (e.cards) out.push('--cards', JSON.stringify(e.cards))
if (e.hook) out.push('--hook', JSON.stringify(e.hook))
if (e.shake) out.push('--shake', JSON.stringify(e.shake))
if (e.flash) out.push('--flash', JSON.stringify(e.flash))
if (e.freeze) out.push('--freeze', JSON.stringify(e.freeze))
if (e.fallen) out.push('--fallen', JSON.stringify(e.fallen))
if (e.replay) out.push('--replay', JSON.stringify(e.replay))   // needs scripts/render_replay.py first
if (e.sfx) out.push('--sfx', JSON.stringify(e.sfx))       // sound effects (scripts/sfx.py)
if (e.onFire) out.push('--on_fire', e.onFire)
if (e.deathScreen) out.push('--death_screen', 'death')
if (e.story) out.push('--story', e.story)            // narrated story Short (docs/stories.md)
if (e.start !== undefined) out.push('--start', String(e.start))
if (e.startAt) out.push('--start_at', e.startAt)       // 'event:offset'
if (e.endAfter) out.push('--end_after', e.endAfter)    // 'event:seconds'
const song = process.env.SONG || e.song
if (song && fs.existsSync(song)) { out.push('--song', song); if (e.dropAt !== undefined) out.push('--song_drop_at', String(e.dropAt)) }
console.log(out.join('\n'))
