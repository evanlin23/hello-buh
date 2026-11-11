// love #1, "send this to your favourite person 💗" (family love, lib/love.js; owner r:rf91fef: "its like a heart and
// its cute and lovey"). Golden hour in a cherry grove: a heart of redstone lamps on a cherry-plank board, its bottom
// missing. The player walks up and puts the last nine lamps in (the tip last), steps back, and night falls over the
// grove in a few seconds. The lever: the heart lights up row by row from the tip with a rising chime, and as the top
// lights a ring of pink fireworks bursts round it. Wholesome, made to be sent to someone.
const love = require('../lib/love')

const CAPTION = 'send this to your favourite person 💗'

module.exports = love.makeStunt({
  name: 'love_cherry_heart',
  caption: CAPTION,
  red: 'favourite person',
  subs: [
    ['lamp', 'just a few more...', 1.6, 0],
    ['complete', 'done!', 0.9, 0],
    ['night', 'now we wait for night', 2.0, 0],
    ['dark', 'ready?', 0.8, 0],
    ['payoff', 'for you', 1.0, 0]
  ]
})
