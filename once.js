const extractDependencies = require('./src/extract-dependencies')
const make = require('./src/make')
const watch = require('./src/watcher')
const withLogger = require('./src/with-logger')

const {
	ERROR,
	READY,

	CREATE_TARGET: FIND,
} = require('./src/events')

module.exports = withLogger(tsconfig)

function tsconfig (options) {
	const { log } = options

	return new Promise((resolve, reject) => {
		const errors = []

		const handleError = (file) => error => {
			file
			? log.error(`Error while processing ${file}`)
			: log.error(`Error from file crawler`)

			log.errorError(error)

			errors.push(error)
		}

		const watcher = watch(options)
		watcher.on(ERROR, handleError())

		const all = []

		watcher.on(FIND, file => all.push(build(file, options).catch(handleError(file))))
		watcher.on(READY, () => {
			log.silly('All files collected, finishing processing')

			watcher.close()
			Promise.all(all).then(() => {
				if (errors.length > 0) {
					log.info(`Processing complete, with ${errors.length} errors, see above for details`)
					reject(errors)
				} else {
					log.info('Processing complete, without errors')
					resolve()
				}
			})
		})
	})
}

async function build (filepath, options) {
	clearCache(filepath)
	return make(filepath, options)
}

function clearCache (filepath) {
	const dependencies = extractDependencies(filepath)

	if (dependencies) {
		dependencies.forEach(clearCache)
	}

	delete require.cache[filepath]
}
