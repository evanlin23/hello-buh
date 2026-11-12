// The original skins' line-up (scripts/make_story_skins.py, docs/engine_proofs/skins/): no server needed,
// `node scripts/pose_fixture.js --skins --stunt _test_skins --out work/_test_skins.rec.json` writes the recording and
// `./hb still _test_skins tick:5 tick:25 ...` renders it. Each actor's username is its skin's name.
const OLD = ['steve', 'alex', 'ari', 'efe', 'kai', 'makena', 'noor', 'sunny', 'zuri', 'hellobuh']   // ticks 140-159: the skins already taken
const NAMES = ['grandpa_gullwick', 'grandma_island', 'walk_kid', 'pulled_man', 'hall_player', 'miner_girl', 'neighbour', 'barter_player', 'spare_boy', 'spare_girl', 'sorry_aunt', 'statue_dad', 'statue_mom', 'statue_mom_1', 'statue_mom_2']
module.exports = {
  name: '_test_skins',
  cast: Object.fromEntries(NAMES.concat(OLD).map(n => [n, n])),
  hideHand: true,
  edit: {}
}
