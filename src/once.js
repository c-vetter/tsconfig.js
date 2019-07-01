const chokidar = require('chokidar')
const fs = require('fs-extra')

const resolvePath = require('./resolve-path')

module.exports = tsconfig

async function tsconfig (root, ignore=[]) {
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
				'**/.git',
				'**/node_modules',

				...ignore,
			],
		})

		const all = []

		watcher.on('add', file => all.push(build(file).catch(reject)))
		watcher.on('ready', () => watcher.close())

		watcher.on('ready', () =>
			Promise.all(all).then(resolve)
		)

		watcher.on('error', reject)
	})
}

async function build (file) {
	const filepath = await resolvePath(file)

	clearCache(filepath)

	try {
		return fs.writeJson(
			`${filepath}on`,
			require(filepath)
		)
	} catch (e) {
		e.stack = `Error: ${e.message}\n    at ${filepath}`

		throw e
	}
}

async function clearCache (filepath) {
	delete require.cache[filepath]
	const content = readScript(filepath)

	const matcher = /\brequire\s*\(\s*(["'])(.+?[^\\])\1\)/mg

	let match
	while(match = matcher.exec(content)) {
		clearCache(await resolvePath(filepath, '..', match[2]))
	}

	return filepath
}

function readScript (filepath) {
	if (!filepath.endsWith('.js')) {
		return ''
	}

	try {
		return fs.readFileSync(filepath).toString()
	} catch (e) {
		return ''
	}
}
