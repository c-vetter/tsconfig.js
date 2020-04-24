const EventEmitter = require('events')

const chokidar = require('chokidar')
const fs = require('fs-extra')
const test = require('ava').serial

const {
	prepare,
	jsonFile,
	tsconfigOnce,
	tsconfigWatch,
} = require('./_helpers')

const {
	ERROR,
	READY,
	CREATE,
} = require('../src/events')


// Interface


test('simple call returns a Promise', t => {
	const { target } = prepare()

	const promise = tsconfigOnce({ root: target() })
	t.assert(promise instanceof Promise)

	return promise
})

test('watch call returns a closable EventEmitter', t => {
	const { target } = prepare()

	const eventEmitter = tsconfigWatch({ root: target() })

	t.assert(eventEmitter instanceof EventEmitter)

	try {
		t.assert(eventEmitter.close, 'missing `close` method')

		eventEmitter.close()
	} catch(error) {
		eventEmitter.removeAllListeners()

		throw error
	}
})

test('simple call defaults to current working directory', async t => {
	const { target } = prepare('simple')

	const cwd = process.cwd()

	const checker = chokidar.watch(jsonFile, { cwd })

	await new Promise((resolve, reject) => {
		checker.on(ERROR, reject)
		checker.on(READY, resolve)
	})

	await new Promise((resolve, reject) => {
		checker.on(ERROR, reject)
		checker.on(CREATE, (fp) => {
			if (!fp.includes(target())) reject('file outside current working directory was built')
		})

		process.chdir(target())

		return tsconfigOnce()
		.then(resolve)
		.catch(reject)
	})
	.finally(() => {
		process.chdir(cwd)
		checker.close()
	})

	t.assert(fs.existsSync(target(jsonFile)))
})

test('watch call defaults to current working directory', async t => {
	const { target } = prepare('simple')

	const cwd = process.cwd()

	const checker = chokidar.watch(jsonFile, { cwd: __dirname })
	await new Promise((resolve, reject) => {
		checker.on(ERROR, reject)
		checker.on(READY, resolve)
	})

	await new Promise((resolve, reject) => {
		checker.on(ERROR, reject)
		checker.on(CREATE, (fp) => {
			if (!fp.includes(target())) reject(`file outside current working directory was built: ${fp}`)
		})

		process.chdir(target())

		const watcher = tsconfigWatch()
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



// Error Handling


test('rejects on error', t => {
	const {
		once,
	} = prepare('error')

	return t.throwsAsync(() => once())
})


test('watcher emits errors', async t => {
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
