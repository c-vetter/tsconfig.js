const chokidar = require('chokidar')
const fs = require('fs-extra')
const test = require('ava').serial

const {
	prepare,
	checkFiles,
	jsFile,
	jsonFile,
	tsconfigWatch,
} = require('./_helpers')

const {
	ERROR,
	READY,
	CREATE,
	UPDATE,
	DELETE,
} = require('../src/events')


test('handles `extends` as per given option', async t => {
	const {
		run,
		target,
		control,
	} = prepare('extends')

	await run({extends: 'drop-relative', root: target('drop-relative')})
	await run({extends: 'drop-any', root: target('drop-any')})
	await run({extends: 'ignore', root: target('ignore')})

	return checkFiles(t, control)
})


test('watcher updates json files when respective js files are changed', async t => {
	const {
		watch,
		target,
		control,
	} = prepare('watch')

	const watcher = watch()

	try {
		await new Promise((resolve, reject) => {
			watcher.on(ERROR, reject)
			watcher.on(READY, resolve)
		})

		await checkFiles(t, control)

		const update = prepare('base', true)

		await new Promise(r => setTimeout(r, 500))

		await checkFiles(t, target, update.control)
	} finally {
		watcher.close()
	}
})


test('watcher removes json files when respective js files are deleted', async t => {
	const {
		watch,
		target,
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


test('watcher triggers rebuild from dependency', async t => {
	const {
		source,
		target,
	} = prepare('base')

	prepare('watch')

	fs.copySync(
		source('sub', jsFile),
		target('sub', jsFile)
	)


	const watcher = tsconfigWatch({ root: target('sub') })
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

		fs.copySync(source(jsFile), target(jsFile))
		setTimeout(() => reject('file was not rebuilt within 500ms') , 500)
	})
	.finally(() => {
		watcher.close()
		checker.close()
	})

	return new Promise(r => setTimeout(r, 500)).then(() => t.pass())
})

test('watcher does not build dependency', async t => {
	const {
		source,
		target,
	} = prepare('base')

	prepare('watch')

	fs.copySync(
		source('sub', jsFile),
		target('sub', jsFile)
	)

	const watcher = tsconfigWatch({ root: target('sub') })
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

		fs.copySync(source(jsFile), target(jsFile))
		setTimeout(resolve , 500)
	})
	.finally(() => {
		watcher.close()
		checker.close()
	})

	t.pass()
})
