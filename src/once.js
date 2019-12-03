const extractDependencies = require('./extract-dependencies')
const make = require('./make')
const watch = require('./watcher')

const {
	ERROR,
	READY,
	CREATE_TARGET: FIND,
} = require('./events')

module.exports = tsconfig

function tsconfig (options) {
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
	delete require.cache[filepath]

	const dependencies = extractDependencies(filepath)
	if (!dependencies) return

	dependencies.forEach(clearCache)
}
