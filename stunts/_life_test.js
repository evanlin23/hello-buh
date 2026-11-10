// The renderer's life test (scripts/pose_fixture.js --life --stunt _life_test writes its recording; no server needed):
// the pose fixture's street with villagers asleep and shaking their heads, everyone turning to whoever speaks, and
// name tags over the actors.
module.exports = {
  name: '_life_test',
  cast: { Grandpa: 'efe', Boy: 'kai', Girl: 'alex', Kid: 'noor', Mum: 'sunny' },
  hideHand: true,
  lookAtSpeaker: true,
  nameTags: true,
  edit: {}
}
