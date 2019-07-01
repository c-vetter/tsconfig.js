const chokidar = require('chokidar')
const fs = require('fs-extra')

const { DepGraph } = new require('dependency-graph')

const extractDependencies = require('./extract-dependencies')
const resolvePath = require('./resolve-path')

module.exports = watch

function watch (root, ignore=[]) {
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
		ignoreInitial: false,
		ignored: [
			'**/.git/**',
			'**/node_modules/**',

			...ignore,
		],
	})

	let _queue = Promise.resolve()
	const queue = (action) => { _queue = _queue.then(action) }
	const dependenciesMap = new DepGraph()
	const emitError = e => watcher.emit('error', e)

	watcher.on('add', file => queue(() => add(file).catch(emitError)))
	watcher.on('change', file => queue(() => update(file).catch(emitError)))
	watcher.on('unlink', file => queue(() => remove(file).catch(emitError)))

	return watcher


	// Event Handlers

	async function add (file) {
		const filepath = await resolvePath(file)
		const data = { clear: removeDependency.bind(null, filepath) }

		if (dependenciesMap.hasNode(filepath)) {
			dependenciesMap.setNodeData(filepath, data)
		} else {
			dependenciesMap.addNode(filepath, data)
		}

		await updateDependencies(filepath)
		return build(filepath)
	}

	async function update(file) {
		const filepath = await resolvePath(file)
		await updateDependencies(filepath)
		return build(filepath)
	}

	async function remove(file) {
		const filepath = await resolvePath(file)

		dependenciesMap.getNodeData(filepath).clear()

		return fs.remove(`${filepath}on`)
	}


	// Helpers

	function removeDependency (filepath) {
		const dependencies = dependenciesMap.dependenciesOf(filepath)
		dependenciesMap.removeNode(filepath)

		dependencies.forEach(dependency => {
			if (!dependenciesMap.hasNode(dependency)) {
				return
			}

			if (dependenciesMap.dependantsOf(dependency).length === 0) {
				dependenciesMap.getNodeData(dependency).clear()
			}
		})
	}

	async function updateDependencies (filepath) {
		delete require.cache[filepath]

		const directDependencies = (await extractDependencies(filepath)) || []
		const transitiveDependencies = dependenciesMap.dependenciesOf(filepath)

		const extraDependencies = transitiveDependencies.filter(d => !directDependencies.includes(d))
		extraDependencies.forEach(dependency => {
			dependenciesMap.removeDependency(filepath, dependency)

			if (dependenciesMap.dependantsOf(dependency).length === 0) {
				dependenciesMap.getNodeData(dependency).clear()
			}
		})

		const newDependecies = directDependencies.filter(d => !transitiveDependencies.includes(d))

		return Promise.all(newDependecies.map(async dependency => {
			if (!dependenciesMap.hasNode(dependency)) {
				const data = { clear: unwatchDependency.bind(null, filepath) }

				dependenciesMap.addNode(dependency, data)

				await updateDependencies(dependency)
				watcher.add(dependency)
			}

			dependenciesMap.addDependency(filepath, dependency)

		}))
	}

	async function unwatchDependency (filepath) {
		removeDependency(filepath)

		if (dependenciesMap.dependantsOf(filepath).length === 0) {
			watcher.unwatch(filepath)
		}
	}

	async function build (filepath) {
		const make = fp => fs.writeJson(
			`${fp}on`,
			require(fp)
		)

		return Promise.all(
			[filepath]
			.concat(dependenciesMap.dependantsOf(filepath))
			.map(fp => delete require.cache[fp] && fp)
			.map(fp => make(fp))
		)
	}
}
