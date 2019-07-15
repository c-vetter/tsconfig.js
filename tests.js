const path = require('path')
const EventEmitter = require('events')

const chokidar = require('chokidar')
const fs = require('fs-extra')
const readdirp = require('readdirp')
const test = require('ava')

const tsconfig = require('.')

const {
	ERROR,
	READY,
	CREATE,
	UPDATE,
	DELETE,
} = require('./src/events')

const baseFor = p => path.join(path.dirname(p), path.basename(p))
const mapToBasePaths = entry => entry.map(({path}) => baseFor(path))
const target = (...segments) => path.join('__tmp__', ...segments)


const src = 'src'
const ctrl = 'ctrl'


// Interface


test.serial('simple call returns a Promise', t => {
	clean()

	const promise = tsconfig(target())
	t.assert(promise instanceof Promise)

	return promise
})

test.serial('simple call requires a base path', t => {
	clean()

	return t.throwsAsync(() => tsconfig())
})

test.serial('watch call returns a closable EventEmitter', t => {
	clean()

	;[
		tsconfig.watch(),
		tsconfig.watch(target()),
	].forEach(eventEmitter => {
		t.assert(eventEmitter instanceof EventEmitter)

		eventEmitter.on(ERROR, ()=>{})

		try {
			t.assert(eventEmitter.close, 'missing `close` method')

			eventEmitter.close()
		} catch(error) {
			eventEmitter.removeAllListeners()

			throw error
		}
	})
})

test.serial('watch call requires a base path', async t => {
	clean()

	const error = await new Promise((resolve, reject) => {
		const watcher = tsconfig.watch()
		watcher.on(ERROR, resolve)

		setTimeout(() => {
			watcher.close()
			reject('no error event emitted within 500ms')
		}, 500)
	})

	t.assert(error)

	return new Promise((resolve, reject) => {
		const watcher = tsconfig.watch(target())
		watcher.on(ERROR, reject)

		setTimeout(() => {
			watcher.close()
			resolve()
		}, 1000)
	})
})


// Complex scenarios


sample('builds json files properly', 'base')
sample('overwrites pre-existing json file if js file present', 'overwrite')
sample('leaves out invalid files', 'guard')
sample('leaves out undesired files', 'guard-custom', ['**/sub'])
sample('does not build dependencies', 'dependencies', path.resolve(target('tsconfig.js')))


test.serial('watcher updates json files when respective js files are changed', async t => {
	const {
		source,
		watch,
	} = prepare('watch')

	const watcher = watch()

	try {
		await new Promise((resolve, reject) => {
			watcher.on(ERROR, reject)
			watcher.on(READY, resolve)
		})

		await checkFiles(source, t)

		const update = prepare('base', true)

		await new Promise(r => setTimeout(r, 500))

		await checkFiles(update.source, t)
	} finally {
		watcher.close()
	}
})


test.serial('watcher removes json files when respective js files are deleted', async t => {
	const {
		watch,
	} = prepare('watch')

	const watcher = watch()
	await new Promise((resolve, reject) => {
		watcher.on(ERROR, reject)
		watcher.on(READY, resolve)
	})

	const checker = chokidar.watch(target('**', 'tsconfig.json').replace(/\\/g, '/'))
	await new Promise((resolve, reject) => {
		checker.on(ERROR, reject)
		checker.on(READY, resolve)
	})

	await new Promise((resolve, reject) => {
		watcher.on(ERROR, reject)
		checker.on(ERROR, reject)

		checker.once(DELETE, () => {
			checker.once(DELETE, resolve)

			fs.removeSync(target('tsconfig.js'))

			setTimeout(() => {
				reject('json file was not removed within 500ms')
			}, 500)
		})

		fs.removeSync(target('sub/tsconfig.js'))
		setTimeout(() => {
			reject('no json file was removed within 1000ms')
		}, 1000)
	})
	.finally(() => {
		watcher.close()
		checker.close()
	})

	t.pass()
})


test.serial('watcher triggers rebuild from dependency', async t => {
	const {
		source,
	} = prepare('base')

	prepare('watch')

	fs.copySync(
		source(src, 'sub', 'tsconfig.js'),
		target('sub', 'tsconfig.js')
	)


	const watcher = tsconfig.watch(target('sub'))
	await new Promise((resolve, reject) => {
		watcher.on(ERROR, reject)
		watcher.on(READY, resolve)
	})

	const checker = chokidar.watch(target('sub', 'tsconfig.json'))
	await new Promise((resolve, reject) => {
		checker.on(ERROR, reject)
		checker.on(READY, resolve)
	})

	await new Promise((resolve, reject) => {
		watcher.on(ERROR, reject)
		checker.on(ERROR, reject)

		checker.once(UPDATE, resolve)

		fs.copySync(source(src, 'tsconfig.js'), target('tsconfig.js'))
		setTimeout(() => reject('file was not rebuilt within 500ms') , 500)
	})
	.finally(() => {
		watcher.close()
		checker.close()
	})

	return new Promise(r => setTimeout(r, 500)).then(() => t.pass())
})

test.serial('watcher does not build dependency', async t => {
	const {
		source,
	} = prepare('base')

	prepare('watch')

	fs.copySync(
		source(src, 'sub', 'tsconfig.js'),
		target('sub', 'tsconfig.js')
	)

	const watcher = tsconfig.watch(target('sub'))
	await new Promise((resolve, reject) => {
		watcher.on(ERROR, reject)
		watcher.on(READY, resolve)
	})

	const checker = chokidar.watch(target('tsconfig.json'))
	await new Promise((resolve, reject) => {
		checker.on(ERROR, reject)
		checker.on(READY, resolve)
	})

	await new Promise((resolve, reject) => {
		watcher.on(ERROR, reject)
		checker.on(ERROR, reject)

		checker.once(CREATE, () => reject('file was wrongfully built'))

		fs.copySync(source(src, 'tsconfig.js'), target('tsconfig.js'))
		setTimeout(resolve , 500)
	})
	.finally(() => {
		watcher.close()
		checker.close()
	})

	t.pass()
})


// Error Handling


test.serial('rejects on error', t => {
	const {
		run,
	} = prepare('error')

	return t.throwsAsync(() => run())
})


test.serial('watcher emits errors', async t => {
	const {
		watch,
	} = prepare('error')

	const watcher = watch()

	t.assert(
		await new Promise((resolve, reject) => {
			watcher.on(ERROR, resolve)

			watcher.on(READY, () =>
				setTimeout(() => {
					reject('no error event emitted within 500ms')
				}, 500)
			)
		})
		.finally(() => watcher.close())
	)
})


// Helpers


function sample (label, namespace, ignore) {
	test.serial(label, async t => {
		const {
			run,
			source,
		} = prepare(namespace)

		await run(ignore)
		await checkFiles(source, t)

		const {
			watch,
		} = prepare(namespace)

		const watcher = watch(ignore)
		await new Promise((resolve, reject) => {
			watcher.on(ERROR, reject)
			watcher.on(READY, ()=>watcher.close())
			watcher.on(READY, resolve)
		})

		await new Promise(r => setTimeout(r, 500))

		return checkFiles(source, t)
	})
}

function prepare (namespace, keep=false) {
	const source = (...paths) => path.join('__samples__', namespace, ...paths)

	keep || clean()
	fs.copySync(source(src), target())

	const run = (ignore) => tsconfig(target(), ignore)
	const watch = (ignore) => tsconfig.watch(target(), ignore)

	return {
		run,
		source,
		watch,
	}
}

function clean() {
	fs.emptyDirSync(target())
}

function checkFiles (source, t) {
	return collectPaths(source)
	.then(([ result, ctrl ]) => {
		// all expected files are there
		ctrl.forEach(p => t.true(result.includes(p), `missing file ${p}`))

		// no unexpected files
		result.forEach(p => t.true(ctrl.includes(p), `unexpected file ${p}`))

		return result
	})
	.then(paths => paths.forEach(p => t.deepEqual(
		fs.readJsonSync(source(ctrl, p)),
		fs.readJsonSync(target(p)),
		`aberration in ${p}`
	)))
}

function collectPaths (source) {
	const collect = what => readdirp.promise(what, {
		fileFilter: ['tsconfig.json'],
	})
	.then(mapToBasePaths)

	const ctrlPaths = collect(source(ctrl))
	const resultPaths = collect(target())

	return Promise.all([ resultPaths, ctrlPaths ])
}
