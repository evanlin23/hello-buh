#!/usr/bin/env node
// The HelloBuh pipeline for agents: ./hb help (docs/agent_guide.md)
process.exitCode = require('./lib/hb/cli').main(process.argv.slice(2))
