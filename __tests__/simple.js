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
sample('leaves out undesired files', 'guard-custom', () => ({ ignore: ['**/sub'] }))
sample('ignores directories and files', 'ignore', target => ({ ignore: [
	target('ignore-directory'),
	target('ignore-file', jsFile),
]}))
sample('does not build dependencies', 'dependencies', target => ({ ignore: target(jsFile) }))
sample('handles registerable sources', 'toml', () => ({ extensions: ['.toml'] }))
sample('handles self-registering sources', 'typescript', target => ({
	extensions: ['.ts'],
	ignore: target('tsconfig.ts'), // prevent `sub/tsconfig.ts` loading `tsconfig.json`, this catches lack of moble resolution
}))


function sample (label, namespace, options) {
	test(label, async t => {
		const {
			once,
			control,
			target,
		} = prepare(namespace)

		if (options) {
			options = options(target)
		}

		await once(options)
		await checkFiles(t, control)

		const {
			watch,
		} = prepare(namespace)

		const watcher = watch(options)
		await new Promise((resolve, reject) => {
			watcher.on(ERROR, reject)
			watcher.on(READY, ()=>watcher.close())
			watcher.on(READY, resolve)
		})

		await new Promise(r => setTimeout(r, 500))

		return checkFiles(t, control)
	})
}
