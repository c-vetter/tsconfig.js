const chokidar = require('chokidar')

module.exports = function watch(root, ignore) {
	if (!root) {
		const watcher = new chokidar.FSWatcher()
		watcher.close()
		setImmediate(() => watcher.emit(
			'error',
			new Error('you need to provide the base path for tsconfig.js to work')
		))

		return watcher
	}

	if (!Array.isArray(ignore)) {
		ignore = [ignore]
	}

	return chokidar.watch(`${root}/**/tsconfig.js`, {
		ignoreInitial: false,
		ignored: [
			'**/.git',
			'**/node_modules',

			...ignore,
		],
	})
}
