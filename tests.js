const path = require('path')

const fs = require('fs-extra')
const readdirp = require('readdirp')
const test = require('ava')

const tsconfig = require('.')

const baseFor = p => path.join(path.dirname(p), path.basename(p))
const mapToBasePaths = entry => entry.map(({path}) => baseFor(path))
const target = (...segments) => path.join('__tmp__', ...segments)


const src = 'src';
const ctrl = 'ctrl';

test.serial('returns a Promise', async t => {
	const promise = tsconfig(target())
	t.assert(promise instanceof Promise)
	await promise
})
test.serial('requires a base path', async t => {
	await t.throwsAsync(() => tsconfig())
})

check('builds json files properly', 'base')
check('overwrites pre-existing json file if js file present', 'overwrite')
check('leaves out invalid files', 'guard')
check('leaves out undesired files', 'guard-custom', ['**/sub/**'])

function sample(namespace) {
	const source = (...paths) => path.join('__samples__', namespace, ...paths)

	fs.emptyDirSync(target())
	fs.copySync(source(src), target())

	const run = (ignore) => tsconfig(target(), ignore)

	return {
		run,
		source,
	}
}

function check(label, namespace, ignore) {
	test.serial(label, async t => {
		const {
			run,
			source,
		} = sample(namespace)

		await run(ignore)

		const ctrlPaths = readdirp.promise(source(ctrl), {
			fileFilter: ['tsconfig.json'],
		})
		.then(mapToBasePaths)

		const resultPaths = readdirp.promise(target(), {
			fileFilter: ['tsconfig.json'],
		})
		.then(mapToBasePaths)


		return (
			Promise.all([ resultPaths, ctrlPaths ]).then(([ result, ctrl ]) => {
				// all expected files are there
				ctrl.forEach(p => t.true(result.includes(p), `missing file ${p}`))

				// no unexpected files
				result.forEach(p => t.true(ctrl.includes(p), `unexpected file ${p}`))

				return result
			})
			.then(paths => paths.forEach(p => t.deepEqual(
				fs.readJsonSync(source(ctrl, p)),
				fs.readJsonSync(target(p)),
			)))
		)
	})
}
