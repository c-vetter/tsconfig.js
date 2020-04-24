const path = require('path')

const fs = require('fs-extra')

module.exports = make

function make(filepath, options = {}) {
	const tsconfig = require(filepath)

	if (tsconfig.extends) {
		switch (options.extends) {
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

	try {
		const { dir, name } = path.parse(filepath)

		return fs.writeJson(
			`${dir}/${name}.json`,
			tsconfig
		)
	} catch (e) {
		e.stack = `Error: ${e.message}\n    at make(${filepath}, ${JSON.stringify(options)})`

		throw e
	}
}
