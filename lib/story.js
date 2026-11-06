// Narrated story Shorts (docs/stories.md): the narration's timing for a story stunt.
// stories/<name>/voice/voice.json comes from scripts/voice.py: each line's spoken length and its
// caption chunks' start/end (seconds from the start of the line's wav).
//   const S = storyLines('stories/<name>')
//   S.line('L03').dur        seconds of the line's wav
//   S.line('L03').at(4)      tick (from the line's mark) where caption chunk 4 starts
//   S.gap                    seconds of air after each line
const fs = require('fs')
const path = require('path')

function storyLines (dir) {
  const vf = path.join(dir, 'voice', 'voice.json')
  if (!fs.existsSync(vf)) throw new Error(`no ${vf}: run scripts/voice.py ${dir} first`)
  const v = JSON.parse(fs.readFileSync(vf, 'utf8'))
  const story = JSON.parse(fs.readFileSync(path.join(dir, 'story.json'), 'utf8'))
  return {
    gap: story.gap ?? v.gap ?? 0.12,
    ids: story.lines.map(l => l.id),
    line (id) {
      const l = v.lines[id]
      if (!l) throw new Error(`line ${id} has no voice: run scripts/voice.py ${dir}`)
      return { ...l, at: (k) => Math.round(l.chunks[Math.min(k, l.chunks.length - 1)][0] * 20) }
    }
  }
}

module.exports = { storyLines }
