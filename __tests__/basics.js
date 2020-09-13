const EventEmitter = require('events')

const chokidar = require('chokidar')
const fs = require('fs-extra')
const test = require('ava').serial

const {
	prepare,
	jsFile,
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


test('rejects on errors', async t => {
	const {
		once,
		target,
	} = prepare('error')

	let errors

	await once()
	.then(() => t.fail('did not reject'))
	.catch(e => { errors = e })

	t.is(errors.length, 3)

	const errorMessages = errors.map(({ message }) => message).sort()

	const escapedFilename = (...p) => target(...p, jsFile).replace(/\\/g, '\\\\')

	t.regex(errorMessages[0], new RegExp(`Cannot find module '../../tsconfig'`))
	t.regex(errorMessages[0], new RegExp(escapedFilename('sub')))

	t.regex(errorMessages[1], new RegExp(`Cannot find module '../tsconfig'`))
	t.regex(errorMessages[1], new RegExp(escapedFilename()))

	t.regex(errorMessages[2], new RegExp(`Cannot find module 'tsconfigs/unknown'`))
	t.regex(errorMessages[2], new RegExp(escapedFilename('package')))
})


test('watcher emits errors', async t => {
	const {
		target,
		watch,
	} = prepare('error')

	const watcher = watch()

	const errors = []

	t.is(
		3,
		await new Promise((resolve) => {
			watcher.on(ERROR, e => {
				errors.push(e)
			})

			watcher.on(READY, () => resolve(errors.length))
		})
		.finally(() => watcher.close())
	)

	const errorMessages = errors.map(({ message }) => message).sort()

	const escapedFilename = (...p) => target(...p, jsFile).replace(/\\/g, '\\\\')

	t.regex(errorMessages[0], new RegExp(`Cannot find module '../../tsconfig'`))
	t.regex(errorMessages[0], new RegExp(escapedFilename('sub')))

	t.regex(errorMessages[1], new RegExp(`Cannot find module '../tsconfig'`))
	t.regex(errorMessages[1], new RegExp(escapedFilename()))

	t.regex(errorMessages[2], new RegExp(`Cannot find module 'tsconfigs/unknown'`))
	t.regex(errorMessages[2], new RegExp(escapedFilename('package')))
})
