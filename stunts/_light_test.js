// The renderer's light/sky test (scripts/pose_fixture.js --stunt _light_test writes its recording; no server needed):
// the pose fixture's street with a drifting fog sea and a moon phase. MOON_PHASE= overrides the phase.
module.exports = {
  name: '_light_test',
  cast: { Grandpa: 'efe', Boy: 'kai', Girl: 'alex', Kid: 'noor', Mum: 'sunny' },
  hideHand: true,
  moonPhase: 'waxing_crescent',
  fogSea: { y0: 71.5, y1: 76, layers: 8, density: 0.9, drift: [0.15, 0.05], wisps: 0.7, wispSize: 24 },
  edit: {}
}
