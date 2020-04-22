#!/usr/bin/env node
'use strict'

// drop `node` and `cli.js`, the actual parameters come after those
const {
	_: ignoreParam,
	comment: commentParam,
	root: rootParam,
	extends: extendsParam,
	extensions: extensionsParam,
} = require('minimist')(process.argv.slice(2), {
	boolean: ['comment'],
	string: ['extends', 'extensions', 'root'],
})

const options = {
	ignore: ignoreParam,
	comment: commentParam,
	root: rootParam,
	extends: extendsParam,
	extensions: (extensionsParam || 'js').split(','),
}

if (process.argv.slice(2).includes('--no-watch')) {
	require('./src/once')(options)
	.catch(e => {
		process.exitCode = 1
		printError(e)
	})
} else {
	require('./src/watch')(options)
	.on('error', printError)
}


function printError(error) {
	console.error(
		error.stack ||
		error.message ||
		error
	)
}
