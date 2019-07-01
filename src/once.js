const extractDependencies = require('./extract-dependencies')
const make = require('./make')
const resolvePath = require('./resolve-path')
const watch = require('./watcher')

module.exports = tsconfig

function tsconfig (root, ignore=[]) {
	return new Promise((resolve, reject) => {
		const watcher = watch(root, ignore)
		watcher.on('error', reject)

		const all = []

		watcher.on('add', file => all.push(build(file).catch(reject)))
		watcher.on('ready', () => watcher.close())

		watcher.on('ready', () =>
			Promise.all(all).then(resolve)
		)
	})
}

async function build (file) {
	const filepath = await resolvePath(file)

	clearCache(filepath)
	make(filepath)
}

async function clearCache (filepath) {
	delete require.cache[filepath]

	const dependencies = await extractDependencies(filepath)
	if (!dependencies) return

	dependencies.forEach(clearCache)
}
