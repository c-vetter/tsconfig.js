const extractDependencies = require('./extract-dependencies')
const make = require('./make')
const watch = require('./watcher')

const {
	ERROR,
	READY,
	CREATE_TARGET: FIND,
} = require('./events')

module.exports = tsconfig

function tsconfig (root = '.', ignore=[]) {
	return new Promise((resolve, reject) => {
		const watcher = watch({root, ignore})
		watcher.on(ERROR, reject)

		const all = []

		watcher.on(FIND, file => all.push(build(file).catch(reject)))
		watcher.on(READY, () => watcher.close())

		watcher.on(READY, () =>
			Promise.all(all).then(resolve)
		)
	})
}

async function build (filepath) {
	clearCache(filepath)
	return make(filepath)
}

function clearCache (filepath) {
	delete require.cache[filepath]

	const dependencies = extractDependencies(filepath)
	if (!dependencies) return

	dependencies.forEach(clearCache)
}
