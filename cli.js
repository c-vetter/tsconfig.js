#!/usr/bin/env node
'use strict'

// drop `node` and `cli.js`, the actual parameters come after those
const ignore = process.argv.slice(2)

const builder = require('.')
const options = { ignore }

const rootParam = '--root'
const extendsParam = '--extends'
const noWatchFlag = '--no-watch'

if (ignore.includes(rootParam)) {
	const data = ignore.splice(ignore.indexOf(rootParam), 2)

	if (data[1]) {
		options.root = data[1]
	}
}

if (ignore.includes(extendsParam)) {
	const data = ignore.splice(ignore.indexOf(extendsParam), 2)

	if (data[1]) {
		options.extends = data[1]
	}
}

const watch = !ignore.includes(noWatchFlag)

if (watch) {
	builder.watch(options)
	.on('error', printError)
} else {
	ignore.splice(ignore.indexOf(noWatchFlag), 1)

	builder(options)
	.catch(e => {
		process.exitCode = 1
		printError(e)
	})
}


function printError(error) {
	console.error(
		error.stack ||
		error.message ||
		error
	)
}
