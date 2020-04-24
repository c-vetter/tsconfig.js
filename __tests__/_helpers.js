const path = require('path')

const fs = require('fs-extra')
const readdirp = require('readdirp')

const tsconfigOnce = require('../once')
const tsconfigWatch = require('../watch')

const targetDirectory = '__tmp__'
const target = (...segments) => path.join(targetDirectory, ...segments)

const baseFor = p => path.join(path.dirname(p), path.basename(p))
const mapToBasePaths = entry => entry.map(({path}) => baseFor(path))

const src = 'src'
const ctrl = 'ctrl'
const jsFile = 'tsconfig.js'
const jsonFile = 'tsconfig.json'
const tsFile = 'tsconfig.ts'

module.exports = {
	prepare,
	checkFiles,
	jsFile,
	jsonFile,
	tsFile,
	tsconfigOnce,
	tsconfigWatch,
}

function prepare (namespace, keep=false) {
	keep || clean()

	const once = (options) => tsconfigOnce({ root: target(), ...options })
	const watch = (options) => tsconfigWatch({ root: target(), ...options })

	if(!namespace) {
		return {
			once,
			watch,
			target,
		}
	}

	const source = (...paths) => path.join('__samples__', namespace, src, ...paths)
	const control = (...paths) => path.join('__samples__', namespace, ctrl, ...paths)

	fs.copySync(source(), target())

	return {
		once,
		watch,
		source,
		target,
		control,
	}
}

function clean() {
	fs.emptyDirSync(target())
}



function checkFiles (t, control) {
	return collectPaths(control)
	.then(([ result, ctrl ]) => {
		// all expected files are there
		ctrl.forEach(p => t.true(result.includes(p), `missing file ${p}`))

		// no unexpected files
		result.forEach(p => t.true(ctrl.includes(p), `unexpected file ${p}`))

		return result
	})
	.then(paths => paths.forEach(p => t.deepEqual(
		fs.readJsonSync(control(p)),
		fs.readJsonSync(target(p)),
		`aberration in ${p}`
	)))
}

function collectPaths (control) {
	const collect = what => readdirp.promise(what, {
		fileFilter: [jsonFile],
	})
	.then(mapToBasePaths)

	const ctrlPaths = collect(control())
	const resultPaths = collect(target())

	return Promise.all([ resultPaths, ctrlPaths ])
}
