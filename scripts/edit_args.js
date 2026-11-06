// Prints the edit.py arguments a stunt module asks for (stunts/<name>.js `edit`), one per line.
// Skips the song if the file isn't there (songs/ is owner-supplied and gitignored).
const fs = require('fs')
const e = require(`../stunts/${process.argv[2]}`).edit || {}
const out = []
if (e.caption) out.push('--caption', process.env.CAPTION || e.caption)
if (e.red) out.push('--red', e.red)
if (e.colors) out.push('--colors', e.colors)
if (e.countdown) out.push('--countdown', e.countdown)
if (e.subs) out.push('--subs', JSON.stringify(e.subs))
if (e.timer) out.push('--timer', e.timer)
if (e.onFire) out.push('--on_fire', e.onFire)
if (e.deathScreen) out.push('--death_screen', 'death')
if (e.story) out.push('--story', e.story)            // narrated story Short (docs/stories.md)
if (e.start !== undefined) out.push('--start', String(e.start))
if (e.startAt) out.push('--start_at', e.startAt)       // 'event:offset'
if (e.endAfter) out.push('--end_after', e.endAfter)    // 'event:seconds'
const song = process.env.SONG || e.song
if (song && fs.existsSync(song)) { out.push('--song', song); if (e.dropAt !== undefined) out.push('--song_drop_at', String(e.dropAt)) }
console.log(out.join('\n'))
