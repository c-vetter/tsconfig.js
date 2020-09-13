#!/usr/bin/env node
'use strict'

const withLogger = require('./src/with-logger')

// drop `node` and `cli.js`, the actual parameters come after those
const cliOptions = require('minimist')(process.argv.slice(2), {
	default: {
		'log-to-console': true,
		'extensions': 'js',
	},
	boolean: [
		'log-to-console',
		'once',
	],
	string: [
		'add-comments',
		'extends-strategy',
		'extensions',
		'log-file',
		'log-level',
		'root',
	],
})

const {
	_: ignore,
	once,

	root,
	extensions,

	['add-comments']: addComments,
	['extends-strategy']: extendsStrategy,

	['log-file']: logFile,
	['log-level']: logLevel,
	['log-to-console']: logToConsole,
} = cliOptions

const options = {
	root: root,
	ignore: ignore,

	addComments,
	extendsStrategy,
	extensions: extensions.split(',').map(x=>'.'+x),

	logFile,
	logLevel,
	logToConsole,
}

withLogger(run)(options)

function run(options) {
	const { log } = options

	log.silly('CLI options')
	log.silly(cliOptions)

	if (once) {
		log.debug('CLI deferring to `tsconfig.js/once`')
		require('./once')(options)
		.catch(() => {
			log.silly('Exiting with non-zero status due to errors')
			process.exitCode = 1
		})
	} else {
		log.debug('CLI deferring to `tsconfig.js/watch`')
		require('./watch')(options)
	}
}
