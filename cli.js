#!/usr/bin/env node
'use strict'

// drop `node` and `cli.js`, the actual parameters come after those
const ignore = process.argv.slice(2)

let builder = require('.')
let root = '.'

const rootParam = '--root'
const noWatchFlag = '--no-watch'

if (ignore.includes(rootParam)) {
	const data = ignore.splice(ignore.indexOf(rootParam), 2)

	if (data[1]) {
		root = data[1]
	}
}

if (ignore.includes(noWatchFlag)) {
	ignore.splice(ignore.indexOf(noWatchFlag), 1)
} else {
	builder = builder.watch
}

builder(root, ignore)
