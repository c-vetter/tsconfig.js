#!/usr/bin/env node
'use strict'

// drop `node` and `cli.js`, the actual parameters come after those
const ignore = process.argv.slice(2)

const builder = require('.')
let root = '.'

const rootParam = '--root'
const noWatchFlag = '--no-watch'

if (ignore.includes(rootParam)) {
	const data = ignore.splice(ignore.indexOf(rootParam), 2)

	if (data[1]) {
		root = data[1]
	}
}

const watch = !ignore.includes(noWatchFlag)
if (watch) {
	builder.watch(root, ignore)
	.on('error', e => console.error(e))
	.once('error', () => process.exitCode = 1)
} else {
	ignore.splice(ignore.indexOf(noWatchFlag), 1)

	builder(root, ignore)
	.catch(e => setImmediate(() => { throw e }))
}