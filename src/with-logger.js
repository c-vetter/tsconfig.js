const winston = require('winston')
const pretty = require('pretty-format')

module.exports = withLogger

const $hasRun = Symbol()

function withLogger(base) {
	enhancedWithLogger.displayName = base.name + '(withLogger)'

	return enhancedWithLogger

	function enhancedWithLogger(allOptions = {}) {
		if (allOptions[$hasRun]) return base(allOptions)

		const { logger, logLevel, logFile, logToConsole = true, ...options } = allOptions
		options[$hasRun] = true

		if (logger) {
			logger.debug('Launching with given logger')

			logger.debug('Options (except logger):')
			logger.debug(options)

			enhanceLogger(logger)
			return base({ ...options, log: logger })
		}

		const {
			cli,
			combine,
			logstash,
			timestamp,
		} = winston.format

		const stringify = winston.format(({ message, ...info }) => ({
			...info,
			message: (
				typeof message === 'string'
				? message
				: pretty(message)
			)
		}))

		const transports = [
			new winston.transports.Console({
				silent: !logToConsole,
				format: combine(
					stringify(),
					cli(),
				),
			})
		]

		if (logFile) {
			transports.push(new winston.transports.File({
				filename: logFile,
				format: combine(
					timestamp(),
					stringify(),
					logstash(),
				)
			}))
		}

		const log = winston.createLogger({
			level: logLevel,
			transports,
		})

		log.debug('Launching without given logger')

		logToConsole && log.debug('Will log to Console')
		logFile && log.debug(`Will log to File “${logFile}”`)

		log.debug('Options:')
		log.debug(allOptions)

		enhanceLogger(log)
		return base({ ...options, log })
	}
}

function enhanceLogger(logger) {
	logger.debug('Adding handler for Error to logger')

	logger.errorError = (logger.levels[logger.level] < logger.levels.verbose)
	? ({ message }) => logger.error(message)
	: ({ stack }) => logger.error(stack)
}
