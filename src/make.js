const path = require('path')

const fs = require('fs-extra')

module.exports = make

function make(filepath, { extendsStrategy, addComments }) {
	try {
		const tsconfig = require(filepath)

		if (tsconfig.extends) {
			switch (extendsStrategy) {
				case 'ignore': break

				case 'drop-any':
					delete tsconfig.extends
				break

				case 'drop-relative':
				default:
					if (tsconfig.extends.startsWith('.')) {
						delete tsconfig.extends
					}
				break
			}
		}

		const output = [JSON.stringify(tsconfig)]

		switch (addComments) {
			case 'none': break

			case 'minimal':
				output.unshift(`// ${filepath}`)
			break

			case 'info':
			default:
				output.unshift(`// source file: ${filepath}`)
				output.unshift('// built using `tsconfig.js` (https://www.npmjs.com/package/tsconfig.js)')
				output.unshift('// DO NOT EDIT!!!!')
			break
		}

		const { dir, name } = path.parse(filepath)

		return fs.writeFile(
			`${dir}/${name}.json`,
			output.join('\n')
		)
	} catch (e) {
		e.stack = `Error: ${e.message}\n    at make(${filepath}, ${JSON.stringify(options)})`

		throw e
	}
}
