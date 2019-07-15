const path = require('path')

const EventEmitter = require('events')
const chokidar = require('chokidar')

const resolvePath = require('./resolve-path')

const {
	ERROR,
	READY,

	CREATE, CREATE_TARGET, CREATE_DEPENDENCY,
	UPDATE, UPDATE_TARGET, UPDATE_DEPENDENCY,
	DELETE, DELETE_TARGET, DELETE_DEPENDENCY,
} = require('./events')


module.exports = function watch({root, ignore, dependencies}) {
	if (!root) {
		const deadEnd = new EventEmitter()
		deadEnd.close = ()=>{}

		setImmediate(() => deadEnd.emit(
			ERROR,
			new Error('you need to provide the base path for tsconfig.js to work')
		))

		return deadEnd
	}

	if (!Array.isArray(ignore)) {
		ignore = [ignore]
	}

	const external = new EventEmitter()

	const buildWatcher = chokidar.watch(`${resolvePath(root).replace(/\\/g, '/')}/**/tsconfig.js`, {
		ignoreInitial: false,
		ignored: [
			'**/.git',
			'**/node_modules',

			...ignore.map(fp => resolvePath(fp))
		],
	})

	buildWatcher.on(READY, () => external.emit(READY))
	buildWatcher.on(ERROR, error => external.emit(ERROR, error))

	buildWatcher.on(CREATE, file => external.emit(CREATE_TARGET, resolvePath(file)))
	buildWatcher.on(UPDATE, file => external.emit(UPDATE_TARGET, resolvePath(file)))
	buildWatcher.on(DELETE, file => external.emit(DELETE_TARGET, resolvePath(file)))

	if (dependencies) {
		const dependencyWatcher = chokidar.watch()

		dependencyWatcher.on(ERROR, error => external.emit(ERROR, error))
		dependencyWatcher.on(CREATE, file => external.emit(CREATE_DEPENDENCY, resolvePath(file)))
		dependencyWatcher.on(UPDATE, file => external.emit(UPDATE_DEPENDENCY, resolvePath(file)))
		dependencyWatcher.on(DELETE, file => external.emit(DELETE_DEPENDENCY, resolvePath(file)))

		external.close = () => {
			buildWatcher.close()
			dependencyWatcher.close()
		}

		external.addDependency = filepath => dependencyWatcher.add(filepath)
		external.clearDependency = filepath => dependencyWatcher.unwatch(filepath)
	} else {
		external.close = () => {
			buildWatcher.close()
		}
	}

	return external
}
