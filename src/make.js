const fs = require('fs-extra')

module.exports = make

function make(filepath, options = {}) {
	const tsconfig = require(filepath)

	switch (options.extends) {
		case 'drop-any':
			delete tsconfig.extends
		break;

		case 'drop-relative':
			if (tsconfig.extends.startsWith('.')) {
				delete tsconfig.extends
			}
		break;

		// no default
	}

	try {
		return fs.writeJson(
			`${filepath}on`,
			tsconfig
		)
	} catch (e) {
		e.stack = `Error: ${e.message}\n    at ${filepath}`

		throw e
	}
}
