const test = require('ava').serial
const winston = require('winston')

const { prepare, logFile } = require('./_helpers')

const withLogger = require('../src/with-logger')

test('yields a winston logger', t => {
	t.is(yieldLogger().prototype, winston.createLogger().prototype)
})

test('consumes all log-related options', t => {
	const { target } = prepare()

	const relatedOptions = {
		logFile: target(logFile),
		logLevel: 'level',
		logToConsole: true,
	}

	t.deepEqual(
		yieldOptions(relatedOptions),
		{},
	)
})

test('passes through all non-log-related options', t => {
	const unrelatedOptions = {
		unrelated: 'options',
		should: 'remain',
	}

	t.deepEqual(
		yieldOptions(unrelatedOptions),
		unrelatedOptions,
	)
})

test('sets options on new logger', t => {
	const { target } = prepare()
	const logDir = 'logs'

	const config = {
		logFile: target(logDir, logFile),
		logLevel: 'level',
		logToConsole: false,
	}

	const defaultLogger = yieldLogger()
	const configuredLogger = yieldLogger(config)

	t.not(defaultLogger.level, config.logLevel)
	t.is(defaultLogger.transports[0].silent, false)
	t.is(defaultLogger.transports.length, 1)

	t.is(configuredLogger.level, config.logLevel)
	t.is(configuredLogger.transports[0].silent, true)
	t.is(configuredLogger.transports[1].dirname, target(logDir))
	t.is(configuredLogger.transports[1].filename, logFile)
})

test('forwards given logger', t => {
	const logger = winston.createLogger({ silent: true })

	t.is(
		logger,
		yieldLogger({ logger })
	)
})

test('drops options with given logger', t => {
	const { target } = prepare()

	const config = {
		logger: winston.createLogger({ silent: true }),
		logFile: target(logFile),
		logLevel: 'level',
		logToConsole: false,
	}

	const logger = yieldLogger(config)

	t.not(logger.level, config.logLevel)
	t.is(logger.transports.length, 0)

	t.deepEqual(
		yieldOptions(config),
		{},
	)
})

test('forwards logger when nested', t => {
	const outer = yieldAll()
	const inner = yieldAll(outer)
	t.is(inner, outer)
})


//


function yieldAll(options) {
	return withLogger((o) => (o))(options)
}

function yieldLogger(options) {
	const { log } = yieldAll(options)
	return log
}

function yieldOptions(allOptions) {
	const { log:_, ...options } = yieldAll(allOptions)

	return JSON.parse(JSON.stringify(options)) // clear $hasRun marker
}
