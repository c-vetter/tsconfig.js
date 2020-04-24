#!/usr/bin/env node
'use strict'

// drop `node` and `cli.js`, the actual parameters come after those
const {
	_: ignore,
	once,

	root,
	extensions,

	['add-comments']: addComments,
	['extends-strategy']: extendsStrategy,
} = require('minimist')(process.argv.slice(2), {
	boolean: ['once'],
	string: ['add-comments', 'extends-strategy', 'extensions', 'root'],
})

const options = {
	root: root,
	ignore: ignore,
	addComments,
	extendsStrategy,
	extensions: (extensions || 'js').split(','),
}

if (once) {
	require('./once')(options)
	.catch(e => {
		process.exitCode = 1
		printError(e)
	})
} else {
	require('./watch')(options)
	.on('error', printError)
}


function printError(error) {
	console.error(
		error.stack ||
		error.message ||
		error
	)
}
