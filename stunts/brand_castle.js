// Channel art (brand/): the avatar and banner, re-shot from THE KEEP's recording with scripts/cinematic.py.
// Like cinematic_keep, plus a cast for the avatar's mannequin (brand/make_avatar_rec.py puts it and a creeper
// beside the castle). No server, no new recording.
const keep = require('./cinematic_keep')
module.exports = { ...keep, name: 'brand_castle', cast: { Buh: 'steve' }, idleLife: false }
