#!/usr/bin/env node
'use strict'

// drop `node` and `cli.js`, the actual parameters come after those
const parameters = process.argv.slice(2)

let builder = require('.')

const noWatchFlag = '--no-watch'
if (parameters.includes(noWatchFlag)) {
	parameters.splice(parameters.indexOf(noWatchFlag), 1)
} else {
	builder = builder.watch
}

const root = parameters[0]
const ignore = parameters.slice(1)

builder(root, ignore)
