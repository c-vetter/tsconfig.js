const path = require('path')

const chokidar = require('chokidar')
const fs = require('fs-extra')

module.exports = tsconfig
tsconfig.watch = watch

async function tsconfig(root, ignore=[]) {
	if (!root) {
		throw new Error('you need to provide the base path for tsconfig.js to work')
	}

	if (!Array.isArray(ignore)) {
		ignore = [ignore]
	}

	return new Promise((resolve, reject) => {
		const watcher = chokidar.watch(`${root}/**/tsconfig.js`, {
			ignoreInitial: false,
			ignored: [
				'**/.git/**',
				'**/node_modules/**',

				...ignore,
			],
		})

		const all = []

		watcher.on('add', file => all.push(build(file)))
		watcher.on('ready', () => watcher.close())
		watcher.on('ready', () => resolve(Promise.all(all)))

		watcher.on('error', reject)
	})
}

function watch(root, ignore=[]) {
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

	const watcher = chokidar.watch(`${root}/**/tsconfig.js`, {
		awaitWriteFinish: true,
		ignoreInitial: false,
		ignored: [
			'**/.git/**',
			'**/node_modules/**',

			...ignore,
		],
	})

	watcher.on('add', file => build(file))
	watcher.on('change', file => build(file))

	watcher.on('unlink', file => unlink(file))

	return watcher
}

function build(file) {
	const filepath = path.resolve(file)

	delete require.cache[require.resolve(filepath)];
	const config = require(filepath)

	return fs.writeJson(
		`${filepath}on`,
		config
	)
}

function unlink(file) {
	const filepath = path.resolve(`${file}on`)
	return fs.remove(filepath)
}
