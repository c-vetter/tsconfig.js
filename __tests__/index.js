const path = require('path')
const EventEmitter = require('events')

const chokidar = require('chokidar')
const fs = require('fs-extra')
const readdirp = require('readdirp')
const test = require('ava')

const tsconfig = require('..')

const {
	ERROR,
	READY,
	CREATE,
	UPDATE,
	DELETE,
} = require('../src/events')

const targetDirectory = '__tmp__'
const baseFor = p => path.join(path.dirname(p), path.basename(p))
const mapToBasePaths = entry => entry.map(({path}) => baseFor(path))
const target = (...segments) => path.join(targetDirectory, ...segments)


const src = 'src'
const ctrl = 'ctrl'
const jsFile = 'tsconfig.js'
const jsonFile = 'tsconfig.json'


// Interface


test.serial('simple call returns a Promise', t => {
	clean()

	const promise = tsconfig(target())
	t.assert(promise instanceof Promise)

	return promise
})

test.serial('watch call returns a closable EventEmitter', t => {
	clean()

	const eventEmitter = tsconfig.watch(target())

	t.assert(eventEmitter instanceof EventEmitter)

	try {
		t.assert(eventEmitter.close, 'missing `close` method')

		eventEmitter.close()
	} catch(error) {
		eventEmitter.removeAllListeners()

		throw error
	}
})

test.serial('simple call defaults to current working directory', async t => {
	prepare('simple')

	const cwd = process.cwd()

	const checker = chokidar.watch(jsonFile, { cwd: __dirname })
	await new Promise((resolve, reject) => {
		checker.on(ERROR, reject)
		checker.on(READY, resolve)
	})

	await new Promise((resolve, reject) => {
		checker.on(ERROR, reject)
		checker.on(CREATE, (fp) => {
			if (!fp.includes(targetDirectory)) reject('file outside current working directory was built')
		})

		process.chdir(targetDirectory)

		return tsconfig()
		.then(resolve)
		.catch(reject)
	})
	.finally(() => {
		process.chdir(cwd)
		checker.close()
	})

	t.assert(fs.existsSync(target(jsonFile)))
})

test.serial('watch call defaults to current working directory', async t => {
	prepare('simple')

	const cwd = process.cwd()

	const checker = chokidar.watch(jsonFile, { cwd: __dirname })
	await new Promise((resolve, reject) => {
		checker.on(ERROR, reject)
		checker.on(READY, resolve)
	})

	await new Promise((resolve, reject) => {
		checker.on(ERROR, reject)
		checker.on(CREATE, (fp) => {
			if (!fp.includes(targetDirectory)) reject(`file outside current working directory was built: ${fp}`)
		})

		process.chdir(targetDirectory)

		const watcher = tsconfig.watch()
		watcher.on(ERROR, error => {
			watcher.close()
			reject(error)
		})
		watcher.on(READY, () => {
			watcher.close()
			setTimeout(resolve, 500)
		})
	})
	.finally(() => {
		process.chdir(cwd)
		checker.close()
	})

	t.assert(fs.existsSync(target(jsonFile)))
})


// Complex scenarios


sample('builds json files properly', 'base')
sample('overwrites pre-existing json file if js file present', 'overwrite')
sample('leaves out invalid files', 'guard')
sample('leaves out undesired files', 'guard-custom', ['**/sub'])
sample('ignores directories and files', 'ignore', [
	target('ignore-directory'),
	target('ignore-file', jsFile),
])
sample('does not build dependencies', 'dependencies', target(jsFile))


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

	const checker = chokidar.watch(target('**', jsonFile).replace(/\\/g, '/'))
	await new Promise((resolve, reject) => {
		checker.on(ERROR, reject)
		checker.on(READY, resolve)
	})

	await new Promise((resolve, reject) => {
		watcher.on(ERROR, reject)
		checker.on(ERROR, reject)

		checker.once(DELETE, () => {
			checker.once(DELETE, resolve)

			fs.removeSync(target(jsFile))

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
		source(src, 'sub', jsFile),
		target('sub', jsFile)
	)


	const watcher = tsconfig.watch(target('sub'))
	await new Promise((resolve, reject) => {
		watcher.on(ERROR, reject)
		watcher.on(READY, resolve)
	})

	const checker = chokidar.watch(target('sub', jsonFile))
	await new Promise((resolve, reject) => {
		checker.on(ERROR, reject)
		checker.on(READY, resolve)
	})

	await new Promise((resolve, reject) => {
		watcher.on(ERROR, reject)
		checker.on(ERROR, reject)

		checker.once(UPDATE, resolve)

		fs.copySync(source(src, jsFile), target(jsFile))
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
		source(src, 'sub', jsFile),
		target('sub', jsFile)
	)

	const watcher = tsconfig.watch(target('sub'))
	await new Promise((resolve, reject) => {
		watcher.on(ERROR, reject)
		watcher.on(READY, resolve)
	})

	const checker = chokidar.watch(target(jsonFile))
	await new Promise((resolve, reject) => {
		checker.on(ERROR, reject)
		checker.on(READY, resolve)
	})

	await new Promise((resolve, reject) => {
		watcher.on(ERROR, reject)
		checker.on(ERROR, reject)

		checker.once(CREATE, () => reject('file was wrongfully built'))

		fs.copySync(source(src, jsFile), target(jsFile))
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
		fileFilter: [jsonFile],
	})
	.then(mapToBasePaths)

	const ctrlPaths = collect(source(ctrl))
	const resultPaths = collect(target())

	return Promise.all([ resultPaths, ctrlPaths ])
}
