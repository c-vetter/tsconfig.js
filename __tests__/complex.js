const path = require('path')

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


test('handles `extends` as per the selected strategy', async t => {
	const {
		once,
		target,
		control,
	} = prepare('extends')

	await once({extendsStrategy: 'drop-relative', root: target('drop-relative')})
	await once({extendsStrategy: 'drop-any', root: target('drop-any')})
	await once({extendsStrategy: 'ignore', root: target('ignore')})

	return checkFiles(t, control)
})


test('adds comments as per the selected strategy', async t => {
	const {
		once,
		target,
		control,
	} = prepare('comments')

	await once({addComments: 'info', root: target('info')})
	await once({addComments: 'minimal', root: target('minimal')})
	await once({addComments: 'none', root: target('none')})

	return checkFiles(t, control, true)
	.then(paths => paths.forEach(p => t.is(
		fs.readFileSync(control(p)).toString().trim()
		.replace(
			'[FILEPATH]',
			path.resolve(target(p).replace('.json', '.js'))
		),
		fs.readFileSync(target(p)).toString().trim(),
		`wrong comment in ${p}`
	)))
})


test('throws if given extensions cannot be enabled', async t => {
	const { once } = prepare()

	await t.throwsAsync(() => once({ extensions: ['.ini'] }), {
		instanceOf: Error,
		message: /.ini/,
	})
})

test('does not throw if given extension unknown', async t => {
	const { once } = prepare()

	await t.notThrowsAsync(() => once({ extensions: ['.js-compatible'] }))
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
