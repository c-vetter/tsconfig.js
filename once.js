const extractDependencies = require('./src/extract-dependencies')
const make = require('./src/make')
const watch = require('./src/watcher')

const {
	ERROR,
	READY,
	CREATE_TARGET: FIND,
} = require('./src/events')

module.exports = tsconfig

function tsconfig (options = {}) {
	return new Promise((resolve, reject) => {
		const watcher = watch(options)
		watcher.on(ERROR, reject)

		const all = []

		watcher.on(FIND, file => all.push(build(file, options).catch(reject)))
		watcher.on(READY, () => watcher.close())

		watcher.on(READY, () =>
			Promise.all(all).then(resolve)
		)
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
