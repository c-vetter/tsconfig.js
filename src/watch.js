const { DepGraph } = require('dependency-graph')
const fs = require('fs-extra')

const extractDependencies = require('./extract-dependencies')
const make = require('./make')
const watch = require('./watcher')

const {
	ERROR,

	CREATE_TARGET, CREATE_DEPENDENCY,
	UPDATE_TARGET, UPDATE_DEPENDENCY,
	DELETE_TARGET, DELETE_DEPENDENCY,
} = require('./events')


module.exports = tsconfigWatch

function tsconfigWatch (root, ignore=[]) {
	const watcher = watch({root, ignore, dependencies: true})

	const dependenciesMap = new DepGraph()

	let _queue = Promise.resolve()
	const queue = (action) => { _queue = _queue.then(action) }

	const emitError = e => watcher.emit(ERROR, e)

	watcher.on(CREATE_TARGET, file => queue(() => (
		add(file, true)
		.then(() => build(file))
		.catch(emitError)
	)))
	watcher.on(UPDATE_TARGET, file => queue(() => (
		build(file)
		.catch(emitError)
	)))
	watcher.on(DELETE_TARGET, file => queue(() => (
		build(file)
		.then(() => remove(file, true))
		.catch(emitError)
	)))

	watcher.on(CREATE_DEPENDENCY, file => queue(() => (
		add(file)
		.then(() => build(file))
		.catch(emitError)
	)))
	watcher.on(UPDATE_DEPENDENCY, file => queue(() => (
		build(file)
		.catch(emitError)
	)))
	watcher.on(DELETE_DEPENDENCY, file => queue(() => (
		build(file)
		.then(() => remove(file))
		.catch(emitError)
	)))

	return watcher


	// Event Handlers

	async function add(filepath, buildable) {
		const data = {
			buildable,
		}

		dependenciesMap.addNode(filepath, data)

		// in case the node has already been added as a dependency
		if (buildable) {
			// override data
			dependenciesMap.setNodeData(filepath, data)
			// don't watch redundantly
			watcher.clearDependency(filepath)
		}
	}

	async function remove(filepath, buildable) {
		if (buildable) {
			await fs.remove(`${filepath}on`)
		}

		const dependencies = dependenciesMap.dependenciesOf(filepath)
		dependenciesMap.removeNode(filepath)

		return Promise.all(
			dependencies
			.filter(dependency => dependenciesMap.dependantsOf(dependency).length === 0)
			.filter(dependency => !dependenciesMap.getNodeData(dependency).buildable)
			.map(dependency => remove(dependency))
		)
	}

	// Helpers

	async function build (filepath) {
		return updateDependencies(filepath)
		.then(() => Promise.all(
			[filepath]
			.concat(dependenciesMap.dependantsOf(filepath))
			.map(fp => delete require.cache[fp] && fp)
			.filter(fp => dependenciesMap.getNodeData(fp).buildable)
			.filter(fp => fs.existsSync(fp))
			.map(fp => make(fp))
		))
	}

	async function updateDependencies (filepath) {
		const directDependencies = extractDependencies(filepath) || []
		const transitiveDependencies = dependenciesMap.dependenciesOf(filepath)
		const extraDependencies = transitiveDependencies.filter(d => !directDependencies.includes(d))

		extraDependencies.forEach(dependency => {
			// does not touch deep dependencies, therefore clears obsolete direct dependencies
			dependenciesMap.removeDependency(filepath, dependency)

			if (dependenciesMap.dependantsOf(dependency).length === 0) {
				watcher.clearDependency(dependency)

				if (!dependenciesMap.getNodeData(dependency).buildable) {
					dependenciesMap.removeNode(dependency)
				}
			}
		})

		const newDependecies = directDependencies.filter(d => !transitiveDependencies.includes(d))

		return Promise.all(newDependecies.map(async dependency => {
			if (dependenciesMap.hasNode(dependency)) {
				dependenciesMap.addDependency(filepath, dependency)
				return
			}

			add(dependency)
			dependenciesMap.addDependency(filepath, dependency)
			watcher.addDependency(dependency)

			return updateDependencies(dependency)
		}))
	}
}
