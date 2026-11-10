// Not a stunt: render options for scripts/set_preview.js recordings (no first-person hand).
module.exports = { name: '_set_preview', hideHand: true, setup () { throw new Error('preview only') }, perform () { return false } }
