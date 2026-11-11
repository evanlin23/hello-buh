// Which YouTube channel a Short goes to (owner, 2026-11-10: the story Shorts go to a second channel, "Buh Stories";
// @HelloBuh keeps the shitposts and "spot what's wrong"). publish.js writes it into the package's metadata.json
// `channel`; scripts/youtube_upload.py uploads a Short only to that channel (YT_CHANNEL). A package that already names
// a channel keeps it; a stunt may set `channel` itself; otherwise story_* Shorts are buhstories, the rest hellobuh.
const CHANNELS = { hellobuh: 'HelloBuh', buhstories: 'Buh Stories' }

function channelFor (name, stunt = {}, prev = {}) {
  const c = (prev && prev.channel) || (stunt && stunt.channel) || (/^story_/.test(name) ? 'buhstories' : 'hellobuh')
  if (!CHANNELS[c]) throw new Error(`${name}: channel '${c}' is not one of ${Object.keys(CHANNELS).join(', ')}`)
  return c
}

module.exports = { channelFor, CHANNELS }
