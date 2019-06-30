const path = require('path')

const chokidar = require('chokidar')
const fs = require('fs-extra')

module.exports = tsconfig

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

function build(file) {
	const filepath = path.resolve(file)

	delete require.cache[require.resolve(filepath)];
	const config = require(filepath)

	return fs.writeJson(
		`${filepath}on`,
		config
	)
}

