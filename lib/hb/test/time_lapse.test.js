// lib/time_lapse.js inView: the 1-hour round's place sounds play only for blocks the camera shows (big.soundInView,
// owner 2026-11-12 on lapse_rocket: "we cant hear blocks being placed but no blocks being placed on screen").
const test = require('node:test')
const assert = require('node:assert')
const { inView } = require('../../time_lapse')

test('inView: a block in front of the lens is in view, one below the frame or behind it is not', () => {
  const cam = { pos: [0, 50, 20], look: [0, 50, 0] }              // looking north, level
  assert.ok(inView(cam, { x: 0, y: 50, z: 0 }))                    // dead ahead
  assert.ok(inView(cam, { x: 5, y: 55, z: 0 }))                    // ~20 deg off: still in frame
  assert.ok(!inView(cam, { x: 0, y: 10, z: 0 }))                   // the tower's foot, far below the shot
  assert.ok(!inView(cam, { x: 0, y: 50, z: 40 }))                  // behind the camera
  assert.ok(!inView(cam, { x: 30, y: 50, z: 10 }))                 // off to the side
})
