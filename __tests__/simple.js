const test = require('ava').serial

const {
	prepare,
	checkFiles,
	jsFile,
} = require('./_helpers')

const {
	ERROR,
	READY,
} = require('../src/events')


sample('builds json files properly', 'base')
sample('overwrites pre-existing json file if js file present', 'overwrite')
sample('leaves out invalid files', 'guard')
sample('leaves out undesired files', 'guard-custom', () => ['**/sub'])
sample('ignores directories and files', 'ignore', target => [
	target('ignore-directory'),
	target('ignore-file', jsFile),
])
sample('does not build dependencies', 'dependencies', target => target(jsFile))


function sample (label, namespace, ignore) {
	test(label, async t => {
		const {
			run,
			control,
			target,
		} = prepare(namespace)

		if (ignore) {
			ignore = ignore(target)
		}

		await checkFiles(t, control)

		const {
			watch,
		} = prepare(namespace)

		const watcher = watch({ignore})
		await new Promise((resolve, reject) => {
			watcher.on(ERROR, reject)
			watcher.on(READY, ()=>watcher.close())
			watcher.on(READY, resolve)
		})

		await new Promise(r => setTimeout(r, 500))

		return checkFiles(t, control)
	})
}
